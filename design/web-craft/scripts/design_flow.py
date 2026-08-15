#!/usr/bin/env python3
"""Gate design-system approval before product frontend writes.

This helper is intentionally dependency-free so it can travel with an Agent Skill.
It records evidence of human approval; it cannot authenticate who ran the command.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

FLOW_DIR = ".design-flow"
MANIFEST_REL = f"{FLOW_DIR}/workflow.json"
SCHEMA_VERSION = "1.0"
SURFACES = {"website", "web-application", "dashboard"}
PHASES = {"draft", "system-ready", "system-approved", "build-allowed", "verified"}
ARTIFACTS = {
    "product_story": f"{FLOW_DIR}/artifacts/PRODUCT-STORY.md",
    "page_copy": f"{FLOW_DIR}/artifacts/PAGE-COPY.md",
    "claims": f"{FLOW_DIR}/artifacts/CLAIMS.md",
    "reference_ledger": f"{FLOW_DIR}/artifacts/REFERENCE-LEDGER.md",
    "design_system": f"{FLOW_DIR}/artifacts/DESIGN.md",
    "tokens": f"{FLOW_DIR}/artifacts/tokens.json",
    "components": f"{FLOW_DIR}/artifacts/COMPONENTS.md",
    "project_ui_skill": f"{FLOW_DIR}/artifacts/PROJECT-UI.md",
}
PLACEHOLDER_RE = re.compile(r"\{\{[^{}]+\}\}|\[(?:TODO|TBD)\]|\bTBD\b", re.IGNORECASE)
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class FlowError(RuntimeError):
    """Controlled workflow failure."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug or not NAME_RE.fullmatch(slug) or len(slug) > 61:
        raise FlowError("project slug must be lowercase-hyphenated and at most 61 characters")
    return slug


def root_path(value: str) -> Path:
    root = Path(value).expanduser().resolve()
    if not root.is_dir():
        raise FlowError(f"project root is not a directory: {root}")
    return root


def normalize_relative(value: str, *, label: str) -> str:
    candidate = Path(value)
    if candidate.is_absolute() or not value.strip():
        raise FlowError(f"{label} must be a non-empty project-relative path")
    if any(part == ".." for part in candidate.parts):
        raise FlowError(f"{label} cannot escape the project root")
    normalized = candidate.as_posix()
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if not normalized or normalized == ".":
        raise FlowError(f"{label} cannot be the whole project root")
    return normalized.rstrip("/")


def inside(root: Path, path: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def resolve_project_path(root: Path, relative: str, *, label: str) -> Path:
    normalized = normalize_relative(relative, label=label)
    resolved = (root / normalized).resolve()
    if not inside(root, resolved):
        raise FlowError(f"{label} resolves outside the project root")
    return resolved


def manifest_path(root: Path) -> Path:
    return root / MANIFEST_REL


def atomic_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def reject_non_finite(value: str) -> None:
    raise FlowError(f"non-finite JSON value is not allowed: {value}")


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise FlowError("duplicate JSON key is not allowed")
        result[key] = value
    return result


def read_json_object(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=reject_duplicate_keys,
            parse_constant=reject_non_finite,
        )
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise FlowError(f"{label} is unreadable or invalid JSON") from exc
    if not isinstance(value, dict):
        raise FlowError(f"{label} must contain a JSON object")
    return value


def read_manifest(root: Path) -> dict[str, Any]:
    path = manifest_path(root)
    if not path.is_file():
        raise FlowError(f"workflow manifest is missing: {MANIFEST_REL}; run init first")
    data = read_json_object(path, "workflow manifest")
    if data.get("schema_version") != SCHEMA_VERSION:
        raise FlowError(f"workflow manifest must use schema_version {SCHEMA_VERSION}")
    if data.get("surface") not in SURFACES or data.get("phase") not in PHASES:
        raise FlowError("workflow manifest has an invalid surface or phase")
    if not isinstance(data.get("ui_roots"), list) or not data["ui_roots"]:
        raise FlowError("workflow manifest must declare at least one ui_root")
    if data.get("artifacts") != ARTIFACTS:
        raise FlowError("workflow artifact map does not match this script version")
    return data


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        raise FlowError("PROJECT-UI.md frontmatter must start at byte zero")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise FlowError("PROJECT-UI.md frontmatter closing delimiter is missing")
    values: dict[str, str] = {}
    for raw in text[4:end].splitlines():
        if raw and not raw[0].isspace() and ":" in raw:
            key, value = raw.split(":", 1)
            normalized_key = key.strip()
            if normalized_key in values:
                raise FlowError("PROJECT-UI.md has a duplicate frontmatter key")
            values[normalized_key] = value.strip().strip("\"'")
    return values, text[end + 5 :]


def validate_project_ui(path: Path, slug: str) -> None:
    text = path.read_text(encoding="utf-8")
    metadata, body = parse_frontmatter(text)
    expected = f"{slug}-ui"
    if metadata.get("name") != expected:
        raise FlowError(f"PROJECT-UI.md name must be {expected!r}")
    if not metadata.get("description", "").startswith("Use when"):
        raise FlowError("PROJECT-UI.md description must begin with 'Use when'")
    for section in ("## Project contract", "## Implementation rules", "## Verification"):
        if section not in body:
            raise FlowError(f"PROJECT-UI.md is missing required section {section!r}")
    for required_reference in ("DESIGN.md", "tokens.json", "COMPONENTS.md"):
        if required_reference not in body:
            raise FlowError(f"PROJECT-UI.md must name {required_reference} as a source of truth")


def validate_required_artifacts(root: Path, manifest: dict[str, Any]) -> dict[str, str]:
    digests: dict[str, str] = {}
    for key, relative in manifest["artifacts"].items():
        path = resolve_project_path(root, relative, label=f"artifact {key}")
        if not path.is_file():
            raise FlowError(f"required artifact is missing: {relative}")
        if path.stat().st_size < 32:
            raise FlowError(f"required artifact is empty or too small: {relative}")
        if key == "tokens":
            raw_tokens = path.read_text(encoding="utf-8")
            if PLACEHOLDER_RE.search(raw_tokens):
                raise FlowError(f"required artifact contains an unresolved placeholder: {relative}")
            tokens = read_json_object(path, "tokens.json")
            if not tokens:
                raise FlowError("tokens.json must contain a non-empty object")
        else:
            text = path.read_text(encoding="utf-8")
            if key != "project_ui_skill" and not text.startswith("# "):
                raise FlowError(f"Markdown artifact must start with an H1: {relative}")
            if PLACEHOLDER_RE.search(text):
                raise FlowError(f"required artifact contains an unresolved placeholder: {relative}")
        if key == "project_ui_skill":
            validate_project_ui(path, manifest["project_slug"])
        digests[key] = sha256_file(path)
    return digests


def approval_is_current(root: Path, manifest: dict[str, Any]) -> tuple[bool, str]:
    approval = manifest.get("approval")
    if not isinstance(approval, dict):
        return False, "no design-system approval is recorded"
    recorded = approval.get("artifact_sha256")
    if not isinstance(recorded, dict):
        return False, "approval digest map is missing"
    try:
        current = validate_required_artifacts(root, manifest)
    except FlowError as exc:
        return False, str(exc)
    if recorded != current:
        return False, "an approved artifact changed; run ready and obtain a new human approval"
    return True, "approval digests match"


def compiled_skill_path(root: Path, manifest: dict[str, Any]) -> Path:
    relative = f".agents/skills/{manifest['project_slug']}-ui/SKILL.md"
    return resolve_project_path(root, relative, label="compiled skill")


def check_build(root: Path, manifest: dict[str, Any]) -> None:
    if manifest["phase"] not in {"build-allowed", "verified"}:
        raise FlowError(f"frontend build is blocked in phase {manifest['phase']!r}")
    current, reason = approval_is_current(root, manifest)
    if not current:
        raise FlowError(reason)
    compiled = manifest.get("compiled_skill")
    if not isinstance(compiled, dict):
        raise FlowError("project-local UI skill has not been compiled")
    destination = compiled_skill_path(root, manifest)
    if not destination.is_file():
        raise FlowError("compiled project-local UI skill is missing")
    source = resolve_project_path(root, manifest["artifacts"]["project_ui_skill"], label="project UI source")
    destination_hash = sha256_file(destination)
    source_hash = sha256_file(source)
    if compiled.get("path") != destination.relative_to(root).as_posix():
        raise FlowError("compiled project-local UI skill path does not match the manifest")
    if compiled.get("sha256") != destination_hash or compiled.get("source_sha256") != source_hash:
        raise FlowError("compiled project-local UI skill is stale or was edited directly")
    if destination_hash != source_hash:
        raise FlowError("compiled project-local UI skill does not match PROJECT-UI.md")


def cmd_init(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    path = manifest_path(root)
    if path.exists():
        raise FlowError(f"workflow already initialized: {MANIFEST_REL}")
    slug = slugify(args.slug or args.name)
    roots = [normalize_relative(value, label="ui_root") for value in args.ui_root]
    if len(set(roots)) != len(roots):
        raise FlowError("ui_roots must be unique")
    for value in roots:
        if value == FLOW_DIR or value.startswith(FLOW_DIR + "/") or value == ".agents" or value.startswith(".agents/"):
            raise FlowError("ui_roots cannot include workflow or agent-instruction directories")
    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "project_name": args.name,
        "project_slug": slug,
        "surface": args.surface,
        "phase": "draft",
        "ui_roots": roots,
        "artifacts": ARTIFACTS,
        "approval": None,
        "compiled_skill": None,
        "quality_report": None,
        "updated_at": utc_now(),
    }
    (root / FLOW_DIR / "artifacts").mkdir(parents=True, exist_ok=False)
    atomic_json_write(path, payload)
    print(f"INITIALIZED: {MANIFEST_REL} phase=draft slug={slug}")


def cmd_ready(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    digests = validate_required_artifacts(root, manifest)
    manifest["phase"] = "system-ready"
    manifest["approval"] = None
    manifest["quality_report"] = None
    manifest["review_artifact_sha256"] = digests
    manifest["updated_at"] = utc_now()
    atomic_json_write(manifest_path(root), manifest)
    print(f"SYSTEM_READY_FOR_REVIEW: {len(digests)} artifacts; FRONTEND_BUILD=BLOCKED")


def cmd_approve(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    if manifest["phase"] != "system-ready":
        raise FlowError("approval is accepted only after ready validates the review set")
    reference = args.approval_ref.strip()
    if len(reference) < 8 or reference.lower() in {"approved", "yes", "ok", "user approved"}:
        raise FlowError("approval_ref must identify the explicit human approval, not a generic word")
    digests = validate_required_artifacts(root, manifest)
    manifest["approval"] = {
        "approver": "human",
        "approval_ref": reference,
        "approved_at": utc_now(),
        "artifact_sha256": digests,
    }
    manifest["phase"] = "system-approved"
    manifest["updated_at"] = utc_now()
    atomic_json_write(manifest_path(root), manifest)
    print("SYSTEM_APPROVED: approval recorded; compile the project-local UI skill before build")


def cmd_compile(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    if manifest["phase"] not in {"system-approved", "build-allowed", "verified"}:
        raise FlowError("compile requires an approved design system")
    current, reason = approval_is_current(root, manifest)
    if not current:
        raise FlowError(reason)
    source = resolve_project_path(root, manifest["artifacts"]["project_ui_skill"], label="project UI source")
    validate_project_ui(source, manifest["project_slug"])
    destination = compiled_skill_path(root, manifest)
    previous = manifest.get("compiled_skill")
    if destination.exists() and sha256_file(destination) != sha256_file(source):
        safe_previous = (
            isinstance(previous, dict)
            and previous.get("path") == destination.relative_to(root).as_posix()
            and previous.get("sha256") == sha256_file(destination)
        )
        if not safe_previous and not args.replace:
            raise FlowError("compiled skill has independent edits; reconcile them or rerun compile with explicit --replace")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    digest = sha256_file(destination)
    manifest["compiled_skill"] = {
        "path": destination.relative_to(root).as_posix(),
        "sha256": digest,
        "source_sha256": sha256_file(source),
        "compiled_at": utc_now(),
    }
    manifest["phase"] = "build-allowed"
    manifest["quality_report"] = None
    manifest["updated_at"] = utc_now()
    atomic_json_write(manifest_path(root), manifest)
    print(f"BUILD_ALLOWED: compiled {destination.relative_to(root).as_posix()}")


def cmd_check_build(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    check_build(root, manifest)
    print("BUILD_GATE: PASS")


def cmd_guard_write(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    if not manifest_path(root).is_file():
        print("WRITE_ALLOWED: no design-flow manifest")
        return
    manifest = read_manifest(root)
    raw = Path(args.path).expanduser()
    candidate = raw.resolve() if raw.is_absolute() else (root / raw).resolve()
    if not inside(root, candidate):
        print("WRITE_ALLOWED: path is outside this project")
        return
    relative = candidate.relative_to(root).as_posix()
    generated = compiled_skill_path(root, manifest).relative_to(root).as_posix()
    if relative == generated:
        raise FlowError("write to generated project-local UI skill is blocked; edit PROJECT-UI.md and run compile")
    if relative == FLOW_DIR or relative.startswith(FLOW_DIR + "/"):
        print(f"WRITE_ALLOWED: workflow artifact {relative}")
        return
    protected = any(relative == ui_root or relative.startswith(ui_root + "/") for ui_root in manifest["ui_roots"])
    if not protected:
        print(f"WRITE_ALLOWED: non-UI path {relative}")
        return
    check_build(root, manifest)
    print(f"WRITE_ALLOWED: build gate passed for {relative}")


def cmd_verify(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    check_build(root, manifest)
    relative = normalize_relative(args.report, label="quality report")
    report = resolve_project_path(root, relative, label="quality report")
    if not report.is_file() or report.stat().st_size < 64:
        raise FlowError("quality report is missing or too small")
    text = report.read_text(encoding="utf-8")
    required_headings = ("## Scope", "## Evidence", "## Findings", "## Final verdict")
    for heading in required_headings:
        if heading not in text:
            raise FlowError(f"quality report is missing required heading: {heading}")
    if PLACEHOLDER_RE.search(text):
        raise FlowError("quality report contains an unresolved placeholder")
    if re.search(
        r"(?i)(?:PASS\s*/\s*FAIL|yes\s*/\s*no|PASS\s*/\s*PASS_WITH_NOTES|BLOCKER\s*/\s*MAJOR)",
        text,
    ):
        raise FlowError("quality report contains an unresolved template choice")
    if not re.search(r"(?m)^\|\s*E[A-Za-z0-9_-]+\s*\|", text):
        raise FlowError("quality report must contain at least one evidence row")
    if not re.search(r"(?mi)^-\s*Verdict:\s*(?:PASS|PASS_WITH_NOTES)\s*$", text):
        raise FlowError("quality report must select PASS or PASS_WITH_NOTES exactly")
    manifest["quality_report"] = {
        "path": relative,
        "sha256": sha256_file(report),
        "verified_at": utc_now(),
    }
    manifest["phase"] = "verified"
    manifest["updated_at"] = utc_now()
    atomic_json_write(manifest_path(root), manifest)
    print(f"WORKFLOW_VERIFIED: {relative}")


def cmd_status(args: argparse.Namespace) -> None:
    root = root_path(args.root)
    manifest = read_manifest(root)
    current, reason = approval_is_current(root, manifest)
    payload = {
        "phase": manifest["phase"],
        "surface": manifest["surface"],
        "project_slug": manifest["project_slug"],
        "approval_current": current,
        "approval_status": reason,
        "compiled_skill": manifest.get("compiled_skill", {}).get("path") if isinstance(manifest.get("compiled_skill"), dict) else None,
        "quality_report": manifest.get("quality_report", {}).get("path") if isinstance(manifest.get("quality_report"), dict) else None,
    }
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(" ".join(f"{key}={value}" for key, value in payload.items()))


def parser() -> argparse.ArgumentParser:
    cli = argparse.ArgumentParser(description=__doc__)
    sub = cli.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="initialize a project workflow")
    init.add_argument("--root", default=".")
    init.add_argument("--name", required=True)
    init.add_argument("--slug")
    init.add_argument("--surface", required=True, choices=sorted(SURFACES))
    init.add_argument("--ui-root", action="append", required=True)
    init.set_defaults(func=cmd_init)

    ready = sub.add_parser("ready", help="validate artifacts and prepare human review")
    ready.add_argument("--root", default=".")
    ready.set_defaults(func=cmd_ready)

    approve = sub.add_parser("approve", help="record explicit human approval")
    approve.add_argument("--root", default=".")
    approve.add_argument("--approver", required=True, choices=["human"])
    approve.add_argument("--approval-ref", required=True)
    approve.set_defaults(func=cmd_approve)

    compile_cmd = sub.add_parser("compile", help="compile PROJECT-UI.md into a project-local skill")
    compile_cmd.add_argument("--root", default=".")
    compile_cmd.add_argument("--replace", action="store_true")
    compile_cmd.set_defaults(func=cmd_compile)

    check = sub.add_parser("check-build", help="verify that product frontend writes are allowed")
    check.add_argument("--root", default=".")
    check.set_defaults(func=cmd_check_build)

    guard = sub.add_parser("guard-write", help="check whether one path may be written")
    guard.add_argument("--root", default=".")
    guard.add_argument("--path", required=True)
    guard.set_defaults(func=cmd_guard_write)

    verify = sub.add_parser("verify", help="record a completed quality report")
    verify.add_argument("--root", default=".")
    verify.add_argument("--report", required=True)
    verify.set_defaults(func=cmd_verify)

    status = sub.add_parser("status", help="show workflow state")
    status.add_argument("--root", default=".")
    status.add_argument("--json", action="store_true")
    status.set_defaults(func=cmd_status)
    return cli


def main() -> int:
    try:
        args = parser().parse_args()
        args.func(args)
        return 0
    except FlowError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    except (OSError, UnicodeError) as exc:
        print(f"BLOCKED: filesystem operation failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
