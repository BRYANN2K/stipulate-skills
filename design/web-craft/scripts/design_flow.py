#!/usr/bin/env python3
"""Gate design-system approval before product frontend writes.

This helper is intentionally dependency-free so it can travel with an Agent Skill.
It records evidence of human approval; it cannot authenticate who ran the command.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import sys
import tempfile
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
    requested = Path(value).expanduser().absolute()
    current = Path(requested.anchor)
    for part in requested.parts[1:]:
        current = current / part
        if current.is_symlink():
            raise FlowError("project root must not use a symlink path")
    try:
        root = requested.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise FlowError("project root cannot be resolved safely") from exc
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


def resolve_project_path(root: Path, relative: str, *, label: str) -> Path:
    normalized = normalize_relative(relative, label=label)
    candidate = root / normalized
    current = root
    for part in Path(normalized).parts:
        current = current / part
        if current.is_symlink():
            raise FlowError(f"{label} must not use a symlink path")
        if current != candidate and current.exists() and not current.is_dir():
            raise FlowError(f"{label} has a non-directory ancestor")
    try:
        candidate.absolute().relative_to(root)
    except ValueError as exc:
        raise FlowError(f"{label} resolves outside the project root") from exc
    return candidate


def manifest_path(root: Path) -> Path:
    return resolve_project_path(root, MANIFEST_REL, label="workflow manifest")


def atomic_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def write_bytes_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


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
    if path.stat().st_nlink != 1:
        raise FlowError("workflow manifest must not be a hard link")
    data = read_json_object(path, "workflow manifest")
    if data.get("schema_version") != SCHEMA_VERSION:
        raise FlowError(f"workflow manifest must use schema_version {SCHEMA_VERSION}")
    if data.get("surface") not in SURFACES or data.get("phase") not in PHASES:
        raise FlowError("workflow manifest has an invalid surface or phase")
    if not isinstance(data.get("ui_roots"), list) or not data["ui_roots"]:
        raise FlowError("workflow manifest must declare at least one ui_root")
    if not isinstance(data.get("project_name"), str) or not data["project_name"].strip():
        raise FlowError("workflow manifest must declare a project_name")
    project_slug = data.get("project_slug")
    if not isinstance(project_slug, str) or not NAME_RE.fullmatch(project_slug) or len(project_slug) > 61:
        raise FlowError("workflow manifest has an invalid project_slug")
    normalized_roots: list[str] = []
    for value in data["ui_roots"]:
        if not isinstance(value, str):
            raise FlowError("workflow ui_roots must contain only strings")
        normalized = normalize_relative(value, label="ui_root")
        if normalized != value:
            raise FlowError("workflow ui_roots must use canonical project-relative paths")
        if normalized == FLOW_DIR or normalized.startswith(FLOW_DIR + "/"):
            raise FlowError("ui_roots cannot include the workflow directory")
        if normalized == ".agents" or normalized.startswith(".agents/"):
            raise FlowError("ui_roots cannot include agent-instruction directories")
        resolve_project_path(root, normalized, label="ui_root")
        normalized_roots.append(normalized)
    if len(set(normalized_roots)) != len(normalized_roots):
        raise FlowError("workflow ui_roots must be unique")
    if data.get("artifacts") != ARTIFACTS:
        raise FlowError("workflow artifact map does not match this script version")
    return data


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_frontmatter(text: str) -> tuple[dict[str, str], dict[str, str], str]:
    if not text.startswith("---\n"):
        raise FlowError("PROJECT-UI.md frontmatter must start at byte zero")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise FlowError("PROJECT-UI.md frontmatter closing delimiter is missing")
    values: dict[str, str] = {}
    nested: dict[str, str] = {}
    allowed = {"name", "description", "license", "allowed-tools", "metadata", "compatibility"}
    section = ""
    for raw in text[4:end].splitlines():
        if not raw or raw.lstrip().startswith("#"):
            continue
        if "\t" in raw:
            raise FlowError("PROJECT-UI.md frontmatter must not contain tabs")
        if raw.startswith("  "):
            if section != "metadata" or raw.startswith("   ") or ":" not in raw:
                raise FlowError("PROJECT-UI.md metadata must be a two-space-indented scalar mapping")
            key, value = raw.strip().split(":", 1)
            key = key.strip()
            if not re.fullmatch(r"[a-z][a-z0-9_-]*", key) or key in nested:
                raise FlowError("PROJECT-UI.md has an invalid or duplicate metadata key")
            nested[key] = parse_yaml_scalar(value, label="metadata value")
            continue
        if raw[0].isspace() or ":" not in raw:
            raise FlowError("PROJECT-UI.md has an invalid top-level frontmatter line")
        key, value = raw.split(":", 1)
        key = key.strip()
        if key not in allowed:
            raise FlowError("PROJECT-UI.md has an unsupported frontmatter key")
        if key in values:
            raise FlowError("PROJECT-UI.md has a duplicate frontmatter key")
        if key == "metadata":
            if value.strip():
                raise FlowError("PROJECT-UI.md metadata mapping must not use an inline value")
            values[key] = ""
            section = "metadata"
        else:
            values[key] = parse_yaml_scalar(value, label="frontmatter value")
            section = ""
    required_nested = {"version", "author", "category", "tags"}
    if not {"name", "description", "license", "metadata"}.issubset(values):
        raise FlowError("PROJECT-UI.md frontmatter is missing required fields")
    if not required_nested.issubset(nested):
        raise FlowError("PROJECT-UI.md metadata mapping is missing required scalar fields")
    return values, nested, text[end + 5 :]


def parse_yaml_scalar(raw: str, *, label: str) -> str:
    value = raw.strip()
    if not value:
        raise FlowError(f"PROJECT-UI.md {label} must not be empty")
    if value[0] in "[{|>&*!?%:@`" or value.startswith("- "):
        raise FlowError(f"PROJECT-UI.md {label} must use the portable scalar subset")
    if value[0] == '"':
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError as exc:
            raise FlowError(f"PROJECT-UI.md {label} has invalid double-quoted syntax") from exc
        if not isinstance(decoded, str):
            raise FlowError(f"PROJECT-UI.md {label} must decode to a string")
        return decoded
    if value[0] == "'":
        if len(value) < 2 or value[-1] != "'":
            raise FlowError(f"PROJECT-UI.md {label} has an unmatched quote")
        inner = value[1:-1]
        if re.search(r"(?<!')'(?!')", inner):
            raise FlowError(f"PROJECT-UI.md {label} has invalid single-quoted syntax")
        return inner.replace("''", "'")
    if ": " in value or " #" in value:
        raise FlowError(f"PROJECT-UI.md {label} must quote YAML-significant text")
    if value.lower() in {"null", "true", "false", "yes", "no", "on", "off", "~"} or re.fullmatch(
        r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", value
    ):
        raise FlowError(f"PROJECT-UI.md {label} must be an unambiguous string")
    return value


def validate_project_ui(path: Path, slug: str) -> None:
    text = path.read_text(encoding="utf-8")
    metadata, _, body = parse_frontmatter(text)
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
        details = path.stat()
        if not stat.S_ISREG(details.st_mode) or details.st_nlink != 1:
            raise FlowError(f"required artifact must be a regular single-link file: {relative}")
        if details.st_size < 32:
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


def canonical_digest(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def review_snapshot(manifest: dict[str, Any], digests: dict[str, str]) -> dict[str, Any]:
    return {
        "schema_version": manifest["schema_version"],
        "project_name": manifest["project_name"],
        "project_slug": manifest["project_slug"],
        "surface": manifest["surface"],
        "ui_roots": manifest["ui_roots"],
        "artifacts": manifest["artifacts"],
        "compiled_skill_path": f".agents/skills/{manifest['project_slug']}-ui/SKILL.md",
        "artifact_sha256": digests,
    }


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
    recorded_review = approval.get("review_snapshot_sha256")
    current_review = canonical_digest(review_snapshot(manifest, current))
    if not isinstance(recorded_review, str) or recorded_review != current_review:
        return False, "the reviewed workflow scope changed; run ready and obtain a new human approval"
    return True, "approval digests match"


def compiled_skill_path(root: Path, manifest: dict[str, Any]) -> Path:
    relative = f".agents/skills/{manifest['project_slug']}-ui/SKILL.md"
    return resolve_project_path(root, relative, label="compiled skill")


def validate_quality_report(report: Path) -> None:
    if not report.is_file() or report.stat().st_size < 64:
        raise FlowError("quality report is missing or too small")
    if report.stat().st_nlink != 1:
        raise FlowError("quality report must be a regular single-link file")
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

    evidence: dict[str, tuple[str, str]] = {}
    evidence_section = text.split("## Evidence", 1)[1].split("## Findings", 1)[0]
    for line in evidence_section.splitlines():
        if line.lstrip().startswith("|") and not line.startswith("|"):
            raise FlowError("quality report contains an indented evidence row")
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if not cells or not re.fullmatch(r"E[A-Za-z0-9_-]+", cells[0]):
            continue
        if cells[0] in evidence:
            raise FlowError("quality report contains a duplicate evidence identifier")
        if len(cells) < 6:
            raise FlowError("quality report evidence rows must use the six-column contract")
        result = cells[4].upper()
        fresh = cells[5].lower()
        if result not in {"PASS", "FAIL", "SKIPPED", "UNAVAILABLE", "NOT_APPLICABLE"}:
            raise FlowError("quality report contains an invalid evidence result")
        evidence[cells[0]] = (result, fresh)
    if not evidence:
        raise FlowError("quality report must contain at least one evidence row")
    if any(result == "FAIL" for result, _ in evidence.values()):
        raise FlowError("quality report contains failed evidence and cannot pass")
    if any(result in {"SKIPPED", "UNAVAILABLE"} for result, _ in evidence.values()):
        raise FlowError("quality report contains incomplete evidence and cannot pass")
    if any(result == "PASS" and fresh != "yes" for result, fresh in evidence.values()):
        raise FlowError("quality report PASS evidence must be fresh after the final mutation")

    findings: set[str] = set()
    blocks = re.findall(
        r"(?ms)^###\s+(F[A-Za-z0-9_-]+)\b.*?(?=^###\s+F|^## Final verdict|\Z)",
        text,
    )
    for finding_id in blocks:
        if finding_id in findings:
            raise FlowError("quality report contains a duplicate finding identifier")
        findings.add(finding_id)
    for block in re.finditer(
        r"(?ms)^###\s+(F[A-Za-z0-9_-]+)\b(?P<body>.*?)(?=^###\s+F|^## Final verdict|\Z)",
        text,
    ):
        body = block.group("body")
        severities = re.findall(r"(?mi)^-\s*Severity:\s*(BLOCKER|MAJOR|MINOR|NOTE)\s*$", body)
        dispositions = re.findall(
            r"(?mi)^-\s*Disposition:\s*(open|fixed|accepted risk|blocked)\s*$", body
        )
        if len(severities) != 1:
            raise FlowError("quality report finding must contain exactly one severity")
        if len(dispositions) != 1:
            raise FlowError("quality report finding must contain exactly one disposition")
        if severities[0].upper() in {"BLOCKER", "MAJOR"} and dispositions[0].lower() != "fixed":
            raise FlowError("quality report contains an open BLOCKER or MAJOR finding")

    findings_section = text.split("## Findings", 1)[1].split("## Final verdict", 1)[0]
    for heading in re.findall(r"(?m)^###\s+(.+)$", findings_section):
        if not re.match(r"F[A-Za-z0-9_-]+\b", heading):
            raise FlowError("quality report findings must use unique F-prefixed identifiers")
    if "## Dimension verdicts" in text:
        dimension_section = text.split("## Dimension verdicts", 1)[1].split("## Final verdict", 1)[0]
        for line in dimension_section.splitlines():
            if not line.startswith("|"):
                continue
            cells = [cell.strip().upper() for cell in line.strip().strip("|").split("|")]
            if any(cell in {"FAIL", "SKIPPED", "UNAVAILABLE", "BLOCKED"} for cell in cells):
                raise FlowError("quality report contains a non-passing dimension verdict")

    verdicts = re.findall(r"(?mi)^-\s*Verdict:\s*(PASS|PASS_WITH_NOTES)\s*$", text)
    if len(verdicts) != 1:
        raise FlowError("quality report must select PASS or PASS_WITH_NOTES exactly once")


def quality_report_is_current(root: Path, manifest: dict[str, Any]) -> tuple[bool, str]:
    recorded = manifest.get("quality_report")
    if not isinstance(recorded, dict):
        return False, "no quality report is recorded"
    relative = recorded.get("path")
    digest = recorded.get("sha256")
    if not isinstance(relative, str) or not isinstance(digest, str):
        return False, "quality report record is incomplete"
    try:
        report = resolve_project_path(root, relative, label="quality report")
        validate_quality_report(report)
    except FlowError as exc:
        return False, str(exc)
    if sha256_file(report) != digest:
        return False, "quality report changed after verification; run verify again"
    return True, "quality report digest matches"


def check_build(root: Path, manifest: dict[str, Any], *, require_quality: bool = True) -> None:
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
    if require_quality and manifest["phase"] == "verified":
        quality_current, quality_reason = quality_report_is_current(root, manifest)
        if not quality_current:
            raise FlowError(quality_reason)


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
        resolve_project_path(root, value, label="ui_root")
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
    artifacts_directory = resolve_project_path(
        root, f"{FLOW_DIR}/artifacts", label="workflow artifacts directory"
    )
    artifacts_directory.mkdir(parents=True, exist_ok=False)
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
    manifest["review_snapshot_sha256"] = canonical_digest(review_snapshot(manifest, digests))
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
    presented = manifest.get("review_snapshot_sha256")
    current_review = canonical_digest(review_snapshot(manifest, digests))
    if not isinstance(presented, str) or presented != current_review:
        raise FlowError("the review set changed after ready; run ready and present it again")
    manifest["approval"] = {
        "approver": "human",
        "approval_ref": reference,
        "approved_at": utc_now(),
        "artifact_sha256": digests,
        "review_snapshot_sha256": current_review,
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
    if destination.exists():
        details = destination.stat()
        if not stat.S_ISREG(details.st_mode):
            raise FlowError("compiled skill destination must be a regular file")
        if details.st_nlink != 1:
            raise FlowError("compiled skill destination must not be a hard link")
    if destination.exists() and sha256_file(destination) != sha256_file(source):
        safe_previous = (
            isinstance(previous, dict)
            and previous.get("path") == destination.relative_to(root).as_posix()
            and previous.get("sha256") == sha256_file(destination)
        )
        if not safe_previous and not args.replace:
            raise FlowError("compiled skill has independent edits; reconcile them or rerun compile with explicit --replace")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination = compiled_skill_path(root, manifest)
    if destination.exists() and destination.stat().st_nlink != 1:
        raise FlowError("compiled skill destination must not be a hard link")
    write_bytes_atomic(destination, source.read_bytes())
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
    if raw.is_absolute():
        try:
            relative = raw.absolute().relative_to(root).as_posix()
        except ValueError:
            print("WRITE_ALLOWED: path is outside this project")
            return
    else:
        relative = normalize_relative(args.path, label="write path")
    candidate = resolve_project_path(root, relative, label="write path")
    try:
        candidate.absolute().relative_to(root)
    except ValueError:
        print("WRITE_ALLOWED: path is outside this project")
        return
    generated = compiled_skill_path(root, manifest).relative_to(root).as_posix()
    if relative == generated:
        raise FlowError("write to generated project-local UI skill is blocked; edit PROJECT-UI.md and run compile")
    if relative == MANIFEST_REL:
        raise FlowError("write to the managed workflow manifest is blocked; use design_flow.py commands")
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
    check_build(root, manifest, require_quality=False)
    relative = normalize_relative(args.report, label="quality report")
    report = resolve_project_path(root, relative, label="quality report")
    validate_quality_report(report)
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
    quality_current, quality_reason = quality_report_is_current(root, manifest)
    effective_phase = manifest["phase"]
    if effective_phase == "verified" and not quality_current:
        effective_phase = "build-allowed"
    payload = {
        "phase": effective_phase,
        "surface": manifest["surface"],
        "project_slug": manifest["project_slug"],
        "approval_current": current,
        "approval_status": reason,
        "compiled_skill": manifest.get("compiled_skill", {}).get("path") if isinstance(manifest.get("compiled_skill"), dict) else None,
        "quality_report": manifest.get("quality_report", {}).get("path") if isinstance(manifest.get("quality_report"), dict) else None,
        "quality_report_current": quality_current,
        "quality_report_status": quality_reason,
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
