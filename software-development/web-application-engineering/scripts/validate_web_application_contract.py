#!/usr/bin/env python3
"""Validate a web application behavior contract without modifying it."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
TOP_FIELDS = {"schema_version", "kind", "project", "routes", "state_domains", "journeys", "mutations", "quality", "verification"}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CAMEL_RE = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
UNICODE_ESCAPE_RE = re.compile(r"\\+[uU]([0-9a-fA-F]{4})")
HEX_ESCAPE_RE = re.compile(r"\\+[xX]([0-9a-fA-F]{2})")
PERCENT_ESCAPE_RE = re.compile(r"%([0-9a-fA-F]{2})")
ESCAPED_DELIMITER_RE = re.compile(r"\\+([\"'/])")
SECRET_RE = re.compile(
    r"(?i)\b(?:[a-z0-9]+[_.\s-])*(?:api[_.\s-]?key|access[_.\s-]?key(?:[_.\s-]?id)?|"
    r"secret(?:[_.\s-]?(?:access[_.\s-]?key|key))?|token|password|passphrase|"
    r"private[_.\s-]?key|credential)s?\d*(?:[_.\s-][a-z0-9]+)*"
    r"\s*[\"']*\s*[:=]\s*[\"']*\s*\S+"
)
COMPACT_UPPER_SECRET_RE = re.compile(
    r"\b[A-Z0-9_-]*(?:APIKEY|ACCESSKEY(?:ID)?|SECRET(?:ACCESSKEY|KEY)?|TOKEN|"
    r"PASSWORD|PASSPHRASE|PRIVATEKEY|CREDENTIALS?)"
    r"(?:(?:PROD(?:UCTION)?|DEV(?:ELOPMENT)?|STAG(?:E|ING)?|TEST|QA|UAT|SANDBOX|LOCAL)|"
    r"\d+|V\d+|[_-][A-Z0-9]+)*"
    r"\s*[\"']*\s*[:=]\s*[\"']*\s*\S+"
)
AUTH_RE = re.compile(
    r"(?i)[:=]\s*(?:[rubf]{1,4})?[^a-z0-9\s]{0,16}\s*"
    r"(?:basic|bearer)\s+\S+"
)
CREDENTIAL_URI_RE = re.compile(r"(?i)\b(?:[a-z][a-z0-9+.-]*://[^\s/@]+:[^\s/@]+@[^\s]+|(?!(?:ssh)://)[a-z][a-z0-9+.-]*://[^\s/@]+@[^\s]+)")


class ContractError(RuntimeError): pass
class DuplicateKeyError(ContractError): pass

PLACEHOLDER_VALUES = {
    "n/a", "na", "none", "not applicable", "not-applicable",
    "eventually", "unspecified", "tbd", "later", "todo", "pending",
    "defer", "deferred", "unknown", "placeholder", "to be determined",
}
DEFERRED_DIRECTIVE_RE = re.compile(
    r"(?:\b(?:todo|tbd|placeholder)(?:_[a-z0-9][a-z0-9_-]*|\d+)?\b"
    r"|(?:^|[:\-—]\s*)defer(?:red)?\b)"
)
FUTURE_WORK_RE = re.compile(
    r"(?:\bwill be (?:implemented|defined|added|provided|specified|collected) later\b"
    r"|\bnot yet (?:implemented|defined|added|provided|specified|collected|available)\b"
    r"|\bfuture work\b"
    r"|\bdefine\b.{0,80}\bafter implementation\b"
    r"|\bplans?(?:(?::|\s+to)\s*(?:define|specify|implement|provide)"
    r"|\s+on\s+(?:defining|specifying|implementing|providing)"
    r"|\s+is\s+to\s+(?:define|specify|implement|provide)"
    r"|\s*,\s*[^,\r\n]{1,80}\s*,\s*to\s+(?:define|specify|implement|provide))\b.{0,80}\bin a later phase\b"
    r"|\bdefinition is postponed until implementation is complete\b"
    r"|\bintends?(?:\s+|\s*,\s*[^,\r\n]{1,80}\s*,\s*)to (?:define|specify|implement|provide)\b.{0,80}\beventually\b"
    r"|\bremains?(?:\s+|\s*,\s*[^,\r\n]{1,80}\s*,\s*)to be (?:decided|defined|implemented|provided|specified|collected)\b)"
)

def reject_non_finite(_: str) -> Any:
    raise ContractError("manifest contains a non-finite JSON number")

def canonicalize_scan(value: str) -> str:
    def decode_ascii(match: re.Match[str]) -> str:
        codepoint = int(match.group(1), 16)
        return chr(codepoint) if codepoint <= 0x7F else match.group(0)
    current = value
    while True:
        normalized = UNICODE_ESCAPE_RE.sub(decode_ascii, current)
        normalized = HEX_ESCAPE_RE.sub(decode_ascii, normalized)
        normalized = PERCENT_ESCAPE_RE.sub(decode_ascii, normalized)
        normalized = ESCAPED_DELIMITER_RE.sub(r"\1", normalized)
        if normalized == current: return normalized
        current = normalized


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result: raise DuplicateKeyError("manifest contains a duplicate JSON key")
        result[key] = value
    return result


def obj(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict): raise ContractError(f"{label} must be an object")
    return value


def exact(value: dict[str, Any], fields: set[str], label: str) -> None:
    if set(value) - fields: raise ContractError(f"{label} contains unsupported fields")
    if fields - set(value): raise ContractError(f"{label} is missing required fields")


def array(value: Any, label: str, *, nonempty: bool = True) -> list[Any]:
    if not isinstance(value, list) or (nonempty and not value): raise ContractError(f"{label} must be a non-empty array")
    return value


def string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip(): raise ContractError(f"{label} must be a non-empty string")
    cleaned = value.strip()
    if any(ord(c) < 32 or ord(c) == 127 for c in cleaned): raise ContractError(f"{label} contains control characters")
    scan = canonicalize_scan(cleaned); segmented = CAMEL_RE.sub("_", scan)
    if SECRET_RE.search(segmented) or COMPACT_UPPER_SECRET_RE.search(scan.upper()) or AUTH_RE.search(segmented) or CREDENTIAL_URI_RE.search(scan): raise ContractError("manifest contains a possible credential")
    return cleaned


def slug(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if not SLUG_RE.fullmatch(cleaned): raise ContractError(f"{label} must be lowercase kebab-case")
    return cleaned


def boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool): raise ContractError(f"{label} must be a boolean")
    return value


def deferred_placeholder(value: str) -> bool:
    normalized = canonicalize_scan(value).casefold().rstrip(".")
    return (
        normalized in PLACEHOLDER_VALUES
        or DEFERRED_DIRECTIVE_RE.search(normalized) is not None
        or FUTURE_WORK_RE.search(normalized) is not None
    )


def strings(value: Any, label: str, *, nonempty: bool = True, slugs: bool = False) -> list[str]:
    result = [slug(item, label) if slugs else string(item, label) for item in array(value, label, nonempty=nonempty)]
    if len(result) != len(set(result)): raise ContractError(f"{label} contains duplicates")
    return result


def internal_path(value: Any, label: str) -> str:
    path = string(value, label)
    decoded = canonicalize_scan(path)
    segments = decoded.split("/")
    if (
        decoded != path
        or not decoded.startswith("/")
        or decoded.startswith("//")
        or "%" in path
        or "\\" in decoded
        or "?" in decoded
        or "#" in decoded
        or any(segment in {".", ".."} for segment in segments)
        or any(not segment for segment in segments[1:-1])
        or (decoded != "/" and decoded.endswith("/"))
    ):
        raise ContractError(f"{label} must be a canonical internal path")
    return path


def scan_tree(value: Any) -> None:
    if isinstance(value, str): string(value, "manifest text")
    elif isinstance(value, list):
        for item in value: scan_tree(item)
    elif isinstance(value, dict):
        for item in value.values(): scan_tree(item)


def validate(raw: Any) -> dict[str, Any]:
    root = obj(raw, "manifest"); exact(root, TOP_FIELDS, "manifest")
    if root["schema_version"] != SCHEMA_VERSION or root["kind"] != "web-application": raise ContractError("manifest schema or kind is unsupported")
    scan_tree(root)
    project = obj(root["project"], "project"); exact(project, {"name", "primary_user", "core_outcome"}, "project")
    slug(project["name"], "project.name"); string(project["primary_user"], "project.primary_user"); string(project["core_outcome"], "project.core_outcome")

    route_ids: list[str] = []; route_paths: list[str] = []; route_roles: dict[str, set[str]] = {}
    for index, item in enumerate(array(root["routes"], "routes")):
        route = obj(item, f"routes[{index}]"); exact(route, {"id", "path", "purpose", "access", "roles"}, f"routes[{index}]")
        route_id = slug(route["id"], "route.id"); route_ids.append(route_id); path = internal_path(route["path"], "route.path")
        route_paths.append(path); string(route["purpose"], "route.purpose")
        access = string(route["access"], "route.access")
        if access not in {"public", "authenticated", "role-gated"}: raise ContractError("route access is unsupported")
        roles = strings(route["roles"], "route.roles", nonempty=False, slugs=True)
        if access == "role-gated" and not roles: raise ContractError("role-gated routes require roles")
        if access != "role-gated" and roles: raise ContractError("public and authenticated routes must not declare roles")
        route_roles[route_id] = set(roles)
    if len(route_ids) != len(set(route_ids)) or len(route_paths) != len(set(route_paths)): raise ContractError("route ids and paths must be unique")
    known_routes = set(route_ids)

    state_ids: list[str] = []
    for item in array(root["state_domains"], "state_domains"):
        state = obj(item, "state domain"); exact(state, {"id", "owner", "source_of_truth", "stale_policy"}, "state domain")
        state_ids.append(slug(state["id"], "state_domain.id")); owner = string(state["owner"], "state_domain.owner")
        if owner not in {"local", "url", "server", "external"}: raise ContractError("state owner is unsupported")
        string(state["source_of_truth"], "state_domain.source_of_truth"); string(state["stale_policy"], "state_domain.stale_policy")
    if len(state_ids) != len(set(state_ids)): raise ContractError("state domain ids must be unique")

    journey_ids: list[str] = []
    for item in array(root["journeys"], "journeys"):
        journey = obj(item, "journey"); exact(journey, {"id", "actor", "steps", "success", "failure_states"}, "journey")
        journey_ids.append(slug(journey["id"], "journey.id")); actor = slug(journey["actor"], "journey.actor")
        for raw_step in array(journey["steps"], "journey.steps"):
            step = obj(raw_step, "journey step"); exact(step, {"route", "action", "expected"}, "journey step")
            step_route = slug(step["route"], "step.route")
            if step_route not in known_routes: raise ContractError("journey references an unknown route")
            if route_roles[step_route] and actor not in route_roles[step_route]:
                raise ContractError("journey actor must be allowed on every role-gated route")
            string(step["action"], "step.action"); string(step["expected"], "step.expected")
        string(journey["success"], "journey.success"); strings(journey["failure_states"], "journey.failure_states")
    if len(journey_ids) != len(set(journey_ids)): raise ContractError("journey ids must be unique")

    mutation_ids: list[str] = []
    for item in array(root["mutations"], "mutations", nonempty=False):
        mutation = obj(item, "mutation"); exact(mutation, {"id", "route", "permission", "optimistic", "rollback", "success_feedback", "error_feedback"}, "mutation")
        mutation_ids.append(slug(mutation["id"], "mutation.id"))
        route_id = slug(mutation["route"], "mutation.route")
        if route_id not in known_routes: raise ContractError("mutation references an unknown route")
        permission = slug(mutation["permission"], "mutation.permission")
        if route_roles[route_id] and permission not in route_roles[route_id]:
            raise ContractError("mutation permission must match a role allowed on its route")
        optimistic = boolean(mutation["optimistic"], "mutation.optimistic")
        rollback = string(mutation["rollback"], "mutation.rollback")
        if optimistic and deferred_placeholder(rollback):
            raise ContractError("optimistic mutations require a substantive rollback contract")
        string(mutation["success_feedback"], "mutation.success_feedback"); string(mutation["error_feedback"], "mutation.error_feedback")
    if len(mutation_ids) != len(set(mutation_ids)): raise ContractError("mutation ids must be unique")

    quality = obj(root["quality"], "quality"); exact(quality, {"accessibility_target", "browsers", "viewports"}, "quality")
    string(quality["accessibility_target"], "quality.accessibility_target"); strings(quality["browsers"], "quality.browsers")
    strings(quality["viewports"], "quality.viewports")

    verification_ids: list[str] = []
    for item in array(root["verification"], "verification"):
        check = obj(item, "verification item"); exact(check, {"id", "claim", "evidence"}, "verification item")
        verification_ids.append(slug(check["id"], "verification.id")); string(check["claim"], "verification.claim"); string(check["evidence"], "verification.evidence")
    if len(verification_ids) != len(set(verification_ids)): raise ContractError("verification ids must be unique")
    return {"schema_version": SCHEMA_VERSION, "status": "PASS", "kind": "web-application", "counts": {"routes": len(route_ids), "states": len(state_ids), "journeys": len(journey_ids), "mutations": len(mutation_ids), "verification": len(verification_ids)}}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__); sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check"); check.add_argument("--manifest", required=True, type=Path); check.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        payload = validate(json.loads(
            args.manifest.read_text(encoding="utf-8"),
            object_pairs_hook=unique_object,
            parse_constant=reject_non_finite,
        ))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, ContractError) as exc:
        message = str(exc) if isinstance(exc, ContractError) else "manifest could not be read as valid JSON"
        print(f"ERROR: {message}", file=sys.stderr); return 2
    print(json.dumps(payload, indent=2, sort_keys=True) if args.json else "Status: PASS"); return 0


if __name__ == "__main__": sys.exit(main())
