#!/usr/bin/env python3
"""Validate a completion-evidence manifest without executing its claims."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

LEVELS = ("CLAIMED", "IMPLEMENTED", "EXECUTED", "VERIFIED", "PUBLISHED")
LEVEL_RANK = {level: rank for rank, level in enumerate(LEVELS)}
OUTCOMES = {"COMPLETE", "PARTIAL", "BLOCKED"}
REQUIREMENT_STATUSES = {"SATISFIED", "UNSATISFIED", "BLOCKED"}
EVIDENCE_STATUSES = {"PASSED", "FAILED", "SKIPPED", "UNAVAILABLE", "NOT_APPLICABLE"}
EVIDENCE_KINDS = {
    "artifact",
    "diff",
    "inspection",
    "command",
    "test",
    "build",
    "smoke",
    "parser",
    "render",
    "lint",
    "acceptance",
    "git",
    "remote",
}
IMPLEMENTATION_KINDS = {"artifact", "diff", "inspection"}
EXECUTION_KINDS = {"command", "test", "build", "smoke", "parser", "render", "lint", "acceptance", "git"}
VERIFICATION_KINDS = {"test", "build", "smoke", "parser", "render", "lint", "acceptance", "git"}


class ManifestError(RuntimeError):
    """The completion manifest violates a proof invariant."""


def require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ManifestError(f"{label} must be an object")
    return value


def require_nonempty_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ManifestError(f"{label} must be a non-empty string")
    cleaned = value.strip()
    if any(ord(character) < 32 or ord(character) == 127 for character in cleaned):
        raise ManifestError(f"{label} must not contain control characters")
    return cleaned


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ManifestError("manifest contains a duplicate JSON key")
        result[key] = value
    return result


def require_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise ManifestError(f"{label} must be an array")
    return value


def parse_timestamp(value: Any, label: str) -> datetime:
    raw = require_nonempty_string(value, label)
    normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ManifestError(f"{label} must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise ManifestError(f"{label} must include a timezone")
    return parsed.astimezone(timezone.utc)


def validate_level(value: Any, label: str) -> str:
    level = require_nonempty_string(value, label)
    if level not in LEVEL_RANK:
        raise ManifestError(f"{label} must be one of {', '.join(LEVELS)}")
    return level


def evidence_level(evidence: list[dict[str, Any]]) -> str:
    passed_kinds = {item["kind"] for item in evidence if item["status"] == "PASSED"}
    implemented = bool(passed_kinds & IMPLEMENTATION_KINDS)
    executed = implemented and bool(passed_kinds & EXECUTION_KINDS)
    verified = implemented and bool(passed_kinds & VERIFICATION_KINDS)
    published = verified and any(
        item["kind"] == "remote"
        and item["status"] == "PASSED"
        and item.get("immutable_reference") is True
        and item.get("read_back") is True
        for item in evidence
    )
    if published:
        return "PUBLISHED"
    if verified:
        return "VERIFIED"
    if executed:
        return "EXECUTED"
    if implemented:
        return "IMPLEMENTED"
    return "CLAIMED"


def validate_evidence(
    raw: Any,
    label: str,
    changed_at: datetime,
    oldest_allowed: datetime,
) -> dict[str, Any]:
    item = require_mapping(raw, label)
    kind = require_nonempty_string(item.get("kind"), f"{label}.kind")
    if kind not in EVIDENCE_KINDS:
        raise ManifestError(f"{label}.kind is unsupported: {kind}")
    status = require_nonempty_string(item.get("status"), f"{label}.status")
    if status not in EVIDENCE_STATUSES:
        raise ManifestError(f"{label}.status is unsupported: {status}")
    observed_at = parse_timestamp(item.get("observed_at"), f"{label}.observed_at")
    if observed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ManifestError(f"{label} is unreasonably far in the future")
    if observed_at < changed_at:
        raise ManifestError(f"{label} is stale: observed before changed_at")
    if observed_at < oldest_allowed:
        raise ManifestError(f"{label} is stale: exceeds maximum evidence age")
    require_nonempty_string(item.get("locator"), f"{label}.locator")
    require_nonempty_string(item.get("summary"), f"{label}.summary")
    if kind == "remote" and status == "PASSED":
        if not isinstance(item.get("immutable_reference"), bool):
            raise ManifestError(f"{label}.immutable_reference must be boolean")
        if not isinstance(item.get("read_back"), bool):
            raise ManifestError(f"{label}.read_back must be boolean")
    return item


def validate_manifest(data: Any, repo: Path, max_age_hours: float) -> list[str]:
    if not math.isfinite(max_age_hours) or max_age_hours <= 0:
        raise ManifestError("max-age-hours must be a finite number greater than zero")
    manifest = require_mapping(data, "manifest")
    if manifest.get("schema_version") != "1.0":
        raise ManifestError("schema_version must be '1.0'")
    require_nonempty_string(manifest.get("task"), "task")
    outcome = require_nonempty_string(manifest.get("outcome"), "outcome")
    if outcome not in OUTCOMES:
        raise ManifestError(f"outcome must be one of {', '.join(sorted(OUTCOMES))}")
    target_level = validate_level(manifest.get("target_level"), "target_level")
    claimed_level = validate_level(manifest.get("claimed_level"), "claimed_level")
    if target_level == "CLAIMED":
        raise ManifestError("target_level must require evidence; CLAIMED is not completion")
    changed_at = parse_timestamp(manifest.get("changed_at"), "changed_at")
    oldest_allowed = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    if changed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ManifestError("changed_at is unreasonably far in the future")

    blockers = require_list(manifest.get("blockers"), "blockers")
    for index, blocker in enumerate(blockers):
        require_nonempty_string(blocker, f"blockers[{index}]")

    raw_requirements = require_list(manifest.get("requirements"), "requirements")
    if not raw_requirements:
        raise ManifestError("requirements must contain at least one requirement")

    seen_ids: set[str] = set()
    satisfied_levels: list[str] = []
    statuses: list[str] = []
    required_levels: list[str] = []
    summaries: list[str] = []

    for req_index, raw_requirement in enumerate(raw_requirements):
        label = f"requirements[{req_index}]"
        requirement = require_mapping(raw_requirement, label)
        req_id = require_nonempty_string(requirement.get("id"), f"{label}.id")
        if req_id in seen_ids:
            raise ManifestError(f"duplicate requirement id: {req_id}")
        seen_ids.add(req_id)
        require_nonempty_string(requirement.get("statement"), f"{label}.statement")
        status = require_nonempty_string(requirement.get("status"), f"{label}.status")
        if status not in REQUIREMENT_STATUSES:
            raise ManifestError(f"{label}.status is unsupported: {status}")
        required_level = validate_level(requirement.get("required_level"), f"{label}.required_level")
        if required_level == "CLAIMED":
            raise ManifestError(f"{req_id} must require evidence; CLAIMED is not completion")
        if LEVEL_RANK[required_level] > LEVEL_RANK[target_level]:
            raise ManifestError(f"{req_id} requires {required_level}, above target_level {target_level}")

        raw_evidence = require_list(requirement.get("evidence"), f"{label}.evidence")
        evidence = [
            validate_evidence(item, f"{label}.evidence[{index}]", changed_at, oldest_allowed)
            for index, item in enumerate(raw_evidence)
        ]
        current_level = evidence_level(evidence)
        statuses.append(status)
        required_levels.append(required_level)

        nonpassing = [
            item["status"]
            for item in evidence
            if item["status"] not in {"PASSED", "NOT_APPLICABLE"}
        ]
        if status == "SATISFIED":
            if nonpassing:
                raise ManifestError(
                    f"{req_id} is SATISFIED but contains non-passing evidence: {', '.join(sorted(set(nonpassing)))}"
                )
            if LEVEL_RANK[current_level] < LEVEL_RANK[required_level]:
                raise ManifestError(
                    f"{req_id} requires {required_level} but evidence reaches only {current_level}"
                )
            satisfied_levels.append(current_level)
        elif status == "BLOCKED" and not blockers:
            raise ManifestError(f"{req_id} is BLOCKED but blockers is empty")

        summaries.append(f"{req_id}={status}/{current_level}")

    expected_target = max(required_levels, key=LEVEL_RANK.__getitem__)
    if target_level != expected_target:
        raise ManifestError(
            f"target_level must equal the highest requirement level: {expected_target}"
        )

    if outcome == "COMPLETE":
        if blockers:
            raise ManifestError("COMPLETE outcome cannot contain blockers")
        if any(status != "SATISFIED" for status in statuses):
            raise ManifestError("COMPLETE outcome requires every requirement to be SATISFIED")
    elif outcome == "PARTIAL":
        if blockers or "BLOCKED" in statuses:
            raise ManifestError("PARTIAL outcome cannot contain blockers or BLOCKED requirements")
        if all(status == "SATISFIED" for status in statuses):
            raise ManifestError("PARTIAL outcome requires at least one unsatisfied or blocked requirement")
    elif outcome == "BLOCKED":
        if not blockers or "BLOCKED" not in statuses:
            raise ManifestError("BLOCKED outcome requires blockers and at least one BLOCKED requirement")

    if satisfied_levels:
        achieved_level = min(satisfied_levels, key=LEVEL_RANK.__getitem__)
    else:
        achieved_level = "CLAIMED"
    if claimed_level != achieved_level:
        raise ManifestError(
            f"claimed_level must equal weakest satisfied requirement level: {achieved_level}"
        )

    if not repo.exists() or not repo.is_dir():
        raise ManifestError(f"repo is not a directory: {repo}")
    return summaries


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    subparsers = root.add_subparsers(dest="command", required=True)
    check = subparsers.add_parser("check")
    check.add_argument("--manifest", required=True, help="path to completion evidence JSON")
    check.add_argument("--repo", default=".", help="project directory used for this report")
    check.add_argument(
        "--max-age-hours",
        type=float,
        default=24.0,
        help="maximum age of supporting observations (default: 24)",
    )
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        manifest_path = Path(args.manifest).expanduser()
        data = json.loads(
            manifest_path.read_text(encoding="utf-8"),
            object_pairs_hook=unique_object,
        )
        summaries = validate_manifest(data, Path(args.repo).expanduser(), args.max_age_hours)
    except (ManifestError, OSError, json.JSONDecodeError) as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1

    print("OK: completion manifest is internally consistent")
    for summary in summaries:
        print(f"OK: {summary}")
    print("NOTE: semantic relevance and evidence authenticity still require inspection")
    return 0


if __name__ == "__main__":
    sys.exit(main())
