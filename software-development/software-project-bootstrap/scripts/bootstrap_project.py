#!/usr/bin/env python3
"""Plan, apply, and inspect a non-destructive software project bootstrap."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import sys
import tempfile
import unicodedata
from pathlib import Path, PurePosixPath
from typing import Any

SCHEMA_VERSION = "1.0"
PROFILES = {"minimal", "spec-driven"}
PROJECT_KINDS = {
    "website", "web-application", "dashboard", "terminal-ui",
    "command-line-tool", "desktop", "api", "backend", "library", "package", "other",
}
SPEC_WORKFLOWS = {"none", "generic", "openspec"}
DOCUMENTATION_TYPES = {"architecture", "adr", "api", "handover"}
TOP_LEVEL_FIELDS = {
    "schema_version", "project", "profile", "languages", "package_managers",
    "source_roots", "test_roots", "documentation", "spec_workflow",
    "validation", "constraints", "open_decisions",
}
PROJECT_FIELDS = {"name", "summary", "kind"}
VALIDATION_FIELDS = {"id", "command"}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
WINDOWS_DRIVE_RE = re.compile(r"^[A-Za-z]:")
WINDOWS_INVALID_CHARS = frozenset('<>:"|?*')
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$",
    *(f"COM{index}" for index in range(1, 10)),
    *(f"LPT{index}" for index in range(1, 10)),
    *(f"COM{index}" for index in "¹²³"),
    *(f"LPT{index}" for index in "¹²³"),
}
CAMEL_RE = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
UNICODE_ESCAPE_RE = re.compile(r"\\+[uU]([0-9a-fA-F]{4})")
HEX_ESCAPE_RE = re.compile(r"\\+[xX]([0-9a-fA-F]{2})")
PERCENT_ESCAPE_RE = re.compile(r"%([0-9a-fA-F]{2})")
ESCAPED_DELIMITER_RE = re.compile(r"\\+([\"'/])")
SECRET_ASSIGNMENT_RE = re.compile(
    r"(?i)\b(?:[a-z0-9]+[_.\s-])*(?:api[_.\s-]?key|access[_.\s-]?key(?:[_.\s-]?id)?|"
    r"secret(?:[_.\s-]?(?:access[_.\s-]?key|key))?|token|password|passphrase|"
    r"private[_.\s-]?key|credential)s?\d*(?:[_.\s-][a-z0-9]+)*"
    r"\s*[\"']*\s*[:=]\s*[\"']*\s*\S+"
)
COMPACT_UPPER_SECRET_ASSIGNMENT_RE = re.compile(
    r"\b[A-Z0-9_-]*(?:APIKEY|ACCESSKEY(?:ID)?|SECRET(?:ACCESSKEY|KEY)?|TOKEN|"
    r"PASSWORD|PASSPHRASE|PRIVATEKEY|CREDENTIALS?)"
    r"(?:(?:PROD(?:UCTION)?|DEV(?:ELOPMENT)?|STAG(?:E|ING)?|TEST|QA|UAT|SANDBOX|LOCAL)|"
    r"\d+|V\d+|[_-][A-Z0-9]+)*"
    r"\s*[\"']*\s*[:=]\s*[\"']*\s*\S+"
)
CREDENTIAL_URI_RE = re.compile(
    r"(?i)\b(?:[a-z][a-z0-9+.-]*://[^\s/@]+:[^\s/@]+@[^\s]+|"
    r"(?!(?:ssh)://)[a-z][a-z0-9+.-]*://[^\s/@]+@[^\s]+)"
)
AUTHORIZATION_RE = re.compile(
    r"(?i)[:=]\s*(?:[rubf]{1,4})?[^a-z0-9\s]{0,16}\s*"
    r"(?:basic|bearer)\s+\S+"
)
GITIGNORE_BEGIN = "# software-project-bootstrap:begin"
GITIGNORE_END = "# software-project-bootstrap:end"
GITIGNORE_BLOCK = """# software-project-bootstrap:begin
# Local credentials and machine-specific state; review this managed block before changing it.
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
.DS_Store
# software-project-bootstrap:end
"""


class BootstrapError(RuntimeError):
    """The bootstrap request is invalid or unsafe."""


class DuplicateKeyError(BootstrapError):
    """A JSON object contains a duplicate key."""


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError("manifest contains a duplicate JSON key")
        result[key] = value
    return result


def reject_non_finite(_: str) -> Any:
    raise BootstrapError("manifest contains a non-finite JSON number")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest_text(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


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
        if normalized == current:
            return normalized
        current = normalized


def require_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise BootstrapError(f"{label} must be an object")
    return value


def require_exact_fields(value: dict[str, Any], allowed: set[str], label: str) -> None:
    extra = set(value) - allowed
    missing = allowed - set(value)
    if extra:
        raise BootstrapError(f"{label} contains unsupported fields (count: {len(extra)})")
    if missing:
        raise BootstrapError(f"{label} is missing fields: {', '.join(sorted(missing))}")


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise BootstrapError(f"{label} must be a non-empty string")
    cleaned = value.strip()
    if any(ord(character) < 32 or ord(character) == 127 for character in cleaned):
        raise BootstrapError(f"{label} must not contain control characters")
    scan = canonicalize_scan(cleaned)
    segmented = CAMEL_RE.sub("_", scan)
    if (
        SECRET_ASSIGNMENT_RE.search(segmented)
        or COMPACT_UPPER_SECRET_ASSIGNMENT_RE.search(scan.upper())
        or CREDENTIAL_URI_RE.search(scan)
        or AUTHORIZATION_RE.search(segmented)
    ):
        raise BootstrapError("manifest contains a possible credential")
    return cleaned


def require_slug(value: Any, label: str) -> str:
    cleaned = require_string(value, label)
    if not SLUG_RE.fullmatch(cleaned):
        raise BootstrapError(f"{label} must be lowercase kebab-case")
    return cleaned


def require_strings(value: Any, label: str, *, slugs: bool = False) -> list[str]:
    if not isinstance(value, list):
        raise BootstrapError(f"{label} must be an array")
    result: list[str] = []
    for index, item in enumerate(value):
        cleaned = require_slug(item, f"{label}[{index}]") if slugs else require_string(item, f"{label}[{index}]")
        if cleaned in result:
            raise BootstrapError(f"{label} contains a duplicate value")
        result.append(cleaned)
    return result


def require_relative_path(value: Any, label: str) -> str:
    if not isinstance(value, str) or value != value.strip():
        raise BootstrapError(f"{label} must be a portable repository-relative path")
    cleaned = require_string(value, label)
    path = PurePosixPath(cleaned)
    if (
        path.is_absolute()
        or WINDOWS_DRIVE_RE.match(cleaned)
        or "\\" in cleaned
        or cleaned != path.as_posix()
        or cleaned in {"", "."}
        or any(part in {"", ".", ".."} for part in path.parts)
        or any(part.casefold() == ".git" for part in path.parts)
        or any(
            part.endswith((" ", "."))
            or any(character in WINDOWS_INVALID_CHARS for character in part)
            or part.split(".", 1)[0].upper() in WINDOWS_RESERVED_NAMES
            for part in path.parts
        )
    ):
        raise BootstrapError(f"{label} must be a portable repository-relative path")
    return path.as_posix()


def require_relative_paths(value: Any, label: str) -> list[str]:
    if not isinstance(value, list):
        raise BootstrapError(f"{label} must be an array")
    result = [
        require_relative_path(item, f"{label}[{index}]")
        for index, item in enumerate(value)
    ]
    if len(result) != len(set(result)):
        raise BootstrapError(f"{label} contains a duplicate path")
    return result


def validate_manifest(raw: Any) -> dict[str, Any]:
    manifest = require_object(raw, "manifest")
    require_exact_fields(manifest, TOP_LEVEL_FIELDS, "manifest")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise BootstrapError(f"schema_version must be {SCHEMA_VERSION!r}")

    raw_project = require_object(manifest.get("project"), "project")
    require_exact_fields(raw_project, PROJECT_FIELDS, "project")
    kind = require_string(raw_project.get("kind"), "project.kind")
    if kind not in PROJECT_KINDS:
        raise BootstrapError(f"project.kind must be one of {', '.join(sorted(PROJECT_KINDS))}")
    project = {
        "name": require_slug(raw_project.get("name"), "project.name"),
        "summary": require_string(raw_project.get("summary"), "project.summary"),
        "kind": kind,
    }

    profile = require_string(manifest.get("profile"), "profile")
    if profile not in PROFILES:
        raise BootstrapError(f"profile must be one of {', '.join(sorted(PROFILES))}")

    languages = require_strings(manifest.get("languages"), "languages", slugs=True)
    if not languages:
        raise BootstrapError("languages must contain at least one language")
    package_managers = require_strings(manifest.get("package_managers"), "package_managers", slugs=True)
    source_roots = require_relative_paths(manifest.get("source_roots"), "source_roots")
    test_roots = require_relative_paths(manifest.get("test_roots"), "test_roots")
    all_roots = source_roots + test_roots
    if not source_roots or not test_roots:
        raise BootstrapError("source_roots and test_roots must each contain at least one path")
    if len(all_roots) != len(set(all_roots)):
        raise BootstrapError("source_roots and test_roots must not overlap exactly")

    documentation = require_strings(manifest.get("documentation"), "documentation", slugs=True)
    unsupported_docs = sorted(set(documentation) - DOCUMENTATION_TYPES)
    if unsupported_docs:
        raise BootstrapError(f"unsupported documentation types (count: {len(unsupported_docs)})")

    spec_workflow = require_string(manifest.get("spec_workflow"), "spec_workflow")
    if spec_workflow not in SPEC_WORKFLOWS:
        raise BootstrapError(f"spec_workflow must be one of {', '.join(sorted(SPEC_WORKFLOWS))}")
    if profile == "spec-driven" and spec_workflow == "none":
        raise BootstrapError("spec-driven profile requires a spec_workflow")

    raw_validation = manifest.get("validation")
    if not isinstance(raw_validation, list):
        raise BootstrapError("validation must be an array")
    validation: list[dict[str, str]] = []
    validation_ids: set[str] = set()
    for index, raw_item in enumerate(raw_validation):
        item = require_object(raw_item, f"validation[{index}]")
        require_exact_fields(item, VALIDATION_FIELDS, f"validation[{index}]")
        identifier = require_slug(item.get("id"), f"validation[{index}].id")
        if identifier in validation_ids:
            raise BootstrapError("validation contains a duplicate id")
        validation_ids.add(identifier)
        validation.append({"id": identifier, "command": require_string(item.get("command"), f"validation[{index}].command")})

    return {
        "schema_version": SCHEMA_VERSION,
        "project": project,
        "profile": profile,
        "languages": languages,
        "package_managers": package_managers,
        "source_roots": source_roots,
        "test_roots": test_roots,
        "documentation": documentation,
        "spec_workflow": spec_workflow,
        "validation": validation,
        "constraints": require_strings(manifest.get("constraints"), "constraints"),
        "open_decisions": require_strings(manifest.get("open_decisions"), "open_decisions"),
    }


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise BootstrapError("could not read the manifest") from exc
    try:
        raw = json.loads(
            text,
            object_pairs_hook=unique_object,
            parse_constant=reject_non_finite,
        )
    except (json.JSONDecodeError, ValueError) as exc:
        raise BootstrapError("manifest is not valid JSON") from exc
    return validate_manifest(raw)


def markdown_list(values: list[str], empty: str = "None declared.") -> str:
    return "\n".join(f"- {value}" for value in values) if values else empty


def markdown_commands(validation: list[dict[str, str]]) -> str:
    if not validation:
        return "No validation commands are declared."
    return "\n".join(f"- `{item['id']}`\n\n      {item['command']}" for item in validation)


def render_project(manifest: dict[str, Any]) -> str:
    project = manifest["project"]
    package_managers = ", ".join(f"`{item}`" for item in manifest["package_managers"]) or "None declared"
    return f"""# {project['name']}

{project['summary']}

## Project contract

- Kind: `{project['kind']}`
- Profile: `{manifest['profile']}`
- Languages: {', '.join(f'`{item}`' for item in manifest['languages'])}
- Package managers: {package_managers}
- Source roots: {', '.join(f'`{item}`' for item in manifest['source_roots'])}
- Test roots: {', '.join(f'`{item}`' for item in manifest['test_roots'])}
- Spec workflow: `{manifest['spec_workflow']}`

`software-project.json` is the machine-readable source for this bootstrap contract. It records repository facts, not installed or executed tooling.

## Constraints

{markdown_list(manifest['constraints'])}

## Open decisions

{markdown_list(manifest['open_decisions'])}

## Validation contract

{markdown_commands(manifest['validation'])}

These commands are declarations, not evidence that validation has run.
"""


def render_agents(manifest: dict[str, Any]) -> str:
    commands = markdown_commands(manifest["validation"])
    return f"""# Agent instructions

## Context

Read `PROJECT.md` and `software-project.json` before changing this repository. Inspect manifests, lockfiles, source, tests, and existing conventions instead of guessing the stack.

## Change boundary

- Keep changes inside the requested scope and preserve existing project conventions.
- Do not replace frameworks, package managers, architecture, or public contracts merely because another option is familiar.
- Treat plans, previews, dry-runs, and generated files as review artifacts, not authorization for unrelated mutations.
- Never read, print, generate, or commit credentials or private configuration.
- Never install dependencies, initialize Git or a spec tool, commit, push, publish, deploy, delete, or migrate data without explicit authorization for that exact action and target.

## Validation

The declared validation commands are:

{commands}

Treat every declared command as untrusted text until its executable, arguments, scope, network access, and side effects have been inspected. Run only applicable safe checks. Report passed, failed, skipped, and unavailable evidence separately.

## Completion

Account for every requested artifact, inspect the final diff, exercise the real user interface when behavior changed, and distinguish implemented, executed, verified, published, and deployed work.
"""


def render_doc(document: str) -> str:
    bodies = {
        "architecture": "Record system context, boundaries, data flows, failure modes, and deployment topology. Tie claims to current source.\n",
        "adr": "Record consequential decisions with status, context, options, outcome, consequences, and supersession links.\n",
        "api": "Document stable public interfaces, inputs, outputs, errors, compatibility, and executable examples.\n",
        "handover": "Record ownership, prerequisites, known risks, open decisions, and evidence-backed next actions.\n",
    }
    return f"# {document.replace('-', ' ').title()}\n\n{bodies[document]}"


def render_specs(manifest: dict[str, Any]) -> str:
    extra = ""
    if manifest["spec_workflow"] == "openspec":
        extra = "\nOpenSpec was selected as intent only. This bootstrap does not install or initialize it.\n"
    return f"""# Specifications

Workflow: `{manifest['spec_workflow']}`

For consequential changes, record the problem, requirements, constraints, non-goals, design, implementation slices, and acceptance evidence before implementation.{extra}
"""


def normalize_newlines(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def text_equivalent(current: str, desired: str) -> bool:
    return normalize_newlines(current) == normalize_newlines(desired)


def has_negation(value: str) -> bool:
    return any(line.lstrip("\ufeff").startswith("!") for line in normalize_newlines(value).splitlines())


def merge_gitignore(existing: str) -> str:
    begin_count = existing.count(GITIGNORE_BEGIN)
    end_count = existing.count(GITIGNORE_END)
    lines = [line.rstrip("\r") for line in existing.split("\n")]
    marker_lines = set(lines)
    if begin_count != end_count or begin_count > 1:
        raise BootstrapError(".gitignore contains ambiguous managed block markers")
    if begin_count == 1 and not {GITIGNORE_BEGIN, GITIGNORE_END}.issubset(marker_lines):
        raise BootstrapError(".gitignore contains ambiguous managed block markers")
    if begin_count == 1 and lines.index(GITIGNORE_BEGIN) >= lines.index(GITIGNORE_END):
        raise BootstrapError(".gitignore contains ambiguous managed block markers")
    crlf = existing.count("\r\n") > existing.count("\n") - existing.count("\r\n")
    newline = "\r\n" if crlf else "\n"
    block = GITIGNORE_BLOCK.replace("\n", newline)
    if begin_count == 1:
        start = existing.index(GITIGNORE_BEGIN)
        end = existing.index(GITIGNORE_END, start) + len(GITIGNORE_END)
        suffix_start = end
        if existing.startswith("\r\n", suffix_start):
            suffix_start += 2
        elif suffix_start < len(existing) and existing[suffix_start] in "\r\n":
            suffix_start += 1
        if has_negation(existing[suffix_start:]):
            raise BootstrapError(".gitignore contains negation rules after the managed block")
        return existing[:start] + block + existing[suffix_start:]
    separator = "" if not existing else newline if existing.endswith(("\n", "\r")) else newline * 2
    return existing + separator + block


def managed_gitignore_safe(value: str) -> bool:
    normalized = normalize_newlines(value)
    lines = set(normalized.splitlines())
    if normalized.count(GITIGNORE_BEGIN) != 1 or normalized.count(GITIGNORE_END) != 1:
        return False
    if not {GITIGNORE_BEGIN, GITIGNORE_END}.issubset(lines):
        return False
    if GITIGNORE_BLOCK.rstrip("\n") not in normalized:
        return False
    return not has_negation(normalized.split(GITIGNORE_END, 1)[1])


def nested_gitignores_safe(root: Path) -> bool:
    failed = False
    def onerror(_: OSError) -> None:
        nonlocal failed
        failed = True
    for directory, directory_names, file_names in os.walk(root, topdown=True, onerror=onerror, followlinks=False):
        current = Path(directory)
        directory_names[:] = [name for name in directory_names if name != ".git" and not (current / name).is_symlink()]
        if current == root or ".gitignore" not in file_names:
            continue
        content, error = read_file(current / ".gitignore")
        if error or content is None or has_negation(content):
            return False
    return not failed


def desired_files(manifest: dict[str, Any], current_gitignore: str | None, *, include_gitignore: bool = True) -> dict[str, str]:
    files = {
        "software-project.json": json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        "PROJECT.md": render_project(manifest),
        "AGENTS.md": render_agents(manifest),
    }
    if include_gitignore:
        files[".gitignore"] = GITIGNORE_BLOCK if current_gitignore is None else merge_gitignore(current_gitignore)
    for relative in manifest["source_roots"] + manifest["test_roots"]:
        files[f"{relative}/.gitkeep"] = ""
    for document in manifest["documentation"]:
        files[f"docs/{document}/README.md"] = render_doc(document)
    if manifest["profile"] == "spec-driven" or manifest["spec_workflow"] != "none":
        files["specs/README.md"] = render_specs(manifest)
    return dict(sorted(files.items()))


def generated_path_collisions(paths: list[str]) -> list[str]:
    entries = [
        (
            relative,
            tuple(unicodedata.normalize("NFC", part).casefold() for part in PurePosixPath(relative).parts),
        )
        for relative in paths
    ]
    collisions: set[str] = set()
    for index, (relative, portable_parts) in enumerate(entries):
        for other_relative, other_parts in entries[index + 1:]:
            shared = min(len(portable_parts), len(other_parts))
            if portable_parts[:shared] != other_parts[:shared]:
                continue
            if len(portable_parts) == len(other_parts):
                collisions.update((relative, other_relative))
            else:
                collisions.add(relative if len(portable_parts) < len(other_parts) else other_relative)
    return sorted(collisions)


def existing_path_alias_collisions(root: Path, generated_paths: list[str]) -> tuple[list[str], bool]:
    existing: list[tuple[tuple[str, ...], tuple[str, ...]]] = []
    failed = False

    def onerror(_: OSError) -> None:
        nonlocal failed
        failed = True

    for directory, directory_names, file_names in os.walk(root, topdown=True, onerror=onerror, followlinks=False):
        current = Path(directory)
        for name in [*directory_names, *file_names]:
            relative_parts = (current / name).relative_to(root).parts
            portable_parts = tuple(unicodedata.normalize("NFC", part).casefold() for part in relative_parts)
            existing.append((relative_parts, portable_parts))
        directory_names[:] = [
            name for name in directory_names
            if name != ".git" and not (current / name).is_symlink()
        ]

    collisions: set[str] = set()
    for relative in generated_paths:
        generated_parts = PurePosixPath(relative).parts
        generated_portable = tuple(unicodedata.normalize("NFC", part).casefold() for part in generated_parts)
        for existing_parts, existing_portable in existing:
            shared = min(len(generated_parts), len(existing_parts))
            if (
                generated_portable[:shared] == existing_portable[:shared]
                and generated_parts[:shared] != existing_parts[:shared]
            ):
                collisions.add(relative)
                break
    return sorted(collisions), failed


def read_file(path: Path) -> tuple[str | None, str | None]:
    if path.is_symlink():
        return None, "symlink"
    if not path.exists():
        return None, None
    if not path.is_file():
        return None, "not-file"
    try:
        with path.open("r", encoding="utf-8", newline="") as stream:
            return stream.read(), None
    except (OSError, UnicodeDecodeError):
        return None, "unreadable"


def resolved_root(root: Path) -> tuple[Path, Path]:
    requested = root.absolute()
    try:
        resolved = requested.resolve(strict=False)
    except (OSError, RuntimeError) as exc:
        raise BootstrapError("could not resolve the project root safely") from exc
    return requested, resolved


def target_unsafe(root: Path, relative: str) -> bool:
    target = root / relative
    if target.is_symlink():
        return True
    current = target.parent
    while current != root:
        if current.is_symlink() or (current.exists() and not current.is_dir()):
            return True
        current = current.parent
    return False


def root_unsafe(root: Path) -> bool:
    if root.is_symlink() or (root.exists() and not root.is_dir()):
        return True
    current = root.parent
    while current != current.parent:
        if current.is_symlink() or (current.exists() and not current.is_dir()):
            return True
        current = current.parent
    return False


def build_plan(manifest: dict[str, Any], root: Path, mode: str) -> tuple[dict[str, Any], dict[str, str]]:
    requested, resolved = resolved_root(root)
    collisions: list[str] = []
    if root_unsafe(requested) or (resolved.exists() and not resolved.is_dir()):
        collisions.append("root")
    elif mode == "init" and resolved.exists():
        try:
            if any(resolved.iterdir()):
                collisions.append("root")
        except OSError:
            collisions.append("root")
    elif mode == "adopt":
        try:
            if not resolved.exists() or not any(resolved.iterdir()):
                collisions.append("root")
        except OSError:
            collisions.append("root")

    gitignore: str | None = None
    observations: list[dict[str, str]] = []
    if not collisions and resolved.exists():
        gitignore, error = read_file(resolved / ".gitignore")
        if error:
            collisions.append(".gitignore")
        if not nested_gitignores_safe(resolved):
            collisions.append("nested .gitignore")
    try:
        files = desired_files(manifest, gitignore)
    except BootstrapError:
        files = desired_files(manifest, None, include_gitignore=False)
        collisions.append(".gitignore")
        if gitignore is not None:
            observations.append({"path": ".gitignore", "state": "collision", "current_digest": digest_text(gitignore), "desired_digest": "unavailable:ambiguous-managed-block"})
    collisions.extend(generated_path_collisions(list(files)))
    if "root" not in collisions and resolved.exists():
        existing_aliases, inventory_failed = existing_path_alias_collisions(resolved, list(files))
        collisions.extend(existing_aliases)
        if inventory_failed:
            collisions.append("existing path inventory")

    actions: list[dict[str, str]] = []
    if "root" not in collisions:
        for relative, content in files.items():
            desired_digest = digest_text(content)
            if target_unsafe(resolved, relative):
                collisions.append(relative)
                observations.append({"path": relative, "state": "collision", "current_digest": "unavailable:unsafe-target", "desired_digest": desired_digest})
                continue
            current, error = read_file(resolved / relative)
            if error:
                collisions.append(relative)
                observations.append({"path": relative, "state": "collision", "current_digest": f"unavailable:{error}", "desired_digest": desired_digest})
                continue
            if current is None:
                action, current_digest = "create", "absent"
            elif text_equivalent(current, content):
                action, current_digest = "unchanged", digest_text(current)
            elif relative == ".gitignore":
                action, current_digest = "update", digest_text(current)
            else:
                collisions.append(relative)
                observations.append({"path": relative, "state": "collision", "current_digest": digest_text(current), "desired_digest": desired_digest})
                continue
            observation = {"path": relative, "state": action, "current_digest": current_digest, "desired_digest": desired_digest}
            observations.append(observation)
            actions.append({"action": action, "path": relative, "current_digest": current_digest, "desired_digest": desired_digest})

    collisions = sorted(set(collisions))
    core = {
        "schema_version": SCHEMA_VERSION,
        "mode": mode,
        "root": str(requested),
        "resolved_root": str(resolved),
        "manifest_digest": digest_text(canonical_json(manifest)),
        "status": "BLOCKED" if collisions else "READY",
        "collisions": collisions,
        "observations": observations,
        "actions": actions,
    }
    return {**core, "plan_digest": digest_text(canonical_json(core))}, files


def write_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def write_bytes_atomic(path: Path, content: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def verify_plan_actions(plan: dict[str, Any], root: Path, resolved: Path) -> None:
    for action in plan["actions"]:
        relative = action["path"]
        _, current_resolved = resolved_root(root)
        if current_resolved != resolved or target_unsafe(resolved, relative):
            raise BootstrapError("filesystem changed after plan validation")
        current, error = read_file(resolved / relative)
        current_digest = "absent" if current is None else digest_text(current)
        if error or current_digest != action["current_digest"]:
            raise BootstrapError("filesystem changed after plan validation")


def apply_init(
    plan: dict[str, Any], files: dict[str, str], root: Path, resolved: Path,
) -> tuple[list[str], list[str], list[str]]:
    missing_parents: list[Path] = []
    current = resolved.parent
    while not current.exists():
        missing_parents.append(current)
        current = current.parent
    resolved.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".hermes-verify-bootstrap-", dir=resolved.parent))
    installed = False
    root_was_empty = resolved.exists()
    try:
        for action in plan["actions"]:
            if action["action"] != "unchanged":
                write_atomic(staging / action["path"], files[action["path"]])
        refreshed, _ = build_plan(json.loads(files["software-project.json"]), root, "init")
        if refreshed["plan_digest"] != plan["plan_digest"] or refreshed["status"] != "READY":
            raise BootstrapError("filesystem changed after plan validation")
        if root_was_empty:
            resolved.rmdir()
        try:
            os.replace(staging, resolved)
            installed = True
        except OSError:
            if root_was_empty and not resolved.exists():
                resolved.mkdir()
            raise
    except BootstrapError:
        raise
    except OSError as exc:
        raise BootstrapError("apply failed before the project root could be installed") from exc
    finally:
        if not installed and staging.exists():
            shutil.rmtree(staging)
        if not installed:
            for directory in missing_parents:
                try:
                    directory.rmdir()
                except OSError:
                    break
    created = [action["path"] for action in plan["actions"] if action["action"] == "create"]
    updated = [action["path"] for action in plan["actions"] if action["action"] == "update"]
    unchanged = [action["path"] for action in plan["actions"] if action["action"] == "unchanged"]
    return created, updated, unchanged


def apply_adopt(
    plan: dict[str, Any], files: dict[str, str], root: Path, resolved: Path,
) -> tuple[list[str], list[str], list[str]]:
    snapshots: dict[str, tuple[bytes, int] | None] = {}
    removable_directories: set[Path] = set()
    for action in plan["actions"]:
        relative = action["path"]
        target = resolved / relative
        if action["action"] == "update":
            snapshots[relative] = (target.read_bytes(), stat.S_IMODE(target.stat().st_mode))
        elif action["action"] == "create":
            snapshots[relative] = None
        current = target.parent
        while current != resolved:
            if not current.exists():
                removable_directories.add(current)
            current = current.parent

    created: list[str] = []
    updated: list[str] = []
    unchanged: list[str] = []
    mutated: list[str] = []
    try:
        for action in plan["actions"]:
            relative = action["path"]
            _, current_resolved = resolved_root(root)
            if current_resolved != resolved or target_unsafe(resolved, relative):
                raise BootstrapError("filesystem changed after plan validation")
            target = resolved / relative
            current, error = read_file(target)
            current_digest = "absent" if current is None else digest_text(current)
            if error or current_digest != action["current_digest"]:
                raise BootstrapError("filesystem changed after plan validation")
            if action["action"] == "unchanged":
                unchanged.append(relative)
                continue
            mutated.append(relative)
            write_atomic(target, files[relative])
            (created if action["action"] == "create" else updated).append(relative)
    except Exception as exc:
        rollback_failed = False
        for relative in reversed(mutated):
            target = resolved / relative
            snapshot = snapshots[relative]
            try:
                if snapshot is None:
                    target.unlink(missing_ok=True)
                else:
                    write_bytes_atomic(target, snapshot[0], snapshot[1])
            except OSError:
                rollback_failed = True
        for directory in sorted(removable_directories, key=lambda path: len(path.parts), reverse=True):
            try:
                directory.rmdir()
            except FileNotFoundError:
                pass
            except OSError:
                rollback_failed = True
        if rollback_failed:
            raise BootstrapError("apply failed and rollback could not fully restore managed paths") from exc
        raise BootstrapError("apply failed; managed changes were rolled back") from exc
    return created, updated, unchanged


def apply_plan(manifest: dict[str, Any], root: Path, mode: str, reviewed_digest: str) -> dict[str, Any]:
    plan, files = build_plan(manifest, root, mode)
    if plan["plan_digest"] != reviewed_digest:
        raise BootstrapError("plan digest does not match the current manifest and filesystem")
    if plan["status"] != "READY":
        raise BootstrapError("reviewed plan is blocked by existing files")
    requested, resolved = resolved_root(root)
    if root_unsafe(requested) or str(resolved) != plan["resolved_root"]:
        raise BootstrapError("filesystem changed after plan validation")
    verify_plan_actions(plan, root, resolved)
    if mode == "init":
        created, updated, unchanged = apply_init(plan, files, root, resolved)
    else:
        created, updated, unchanged = apply_adopt(plan, files, root, resolved)
    return {"schema_version": SCHEMA_VERSION, "status": "APPLIED", "root": str(requested), "resolved_root": str(resolved), "plan_digest": reviewed_digest, "created": created, "updated": updated, "unchanged": unchanged}


def doctor_result(root: Path, checks: list[dict[str, str]]) -> dict[str, Any]:
    statuses = {item["status"] for item in checks}
    status = "FAIL" if "FAIL" in statuses else "WARN" if "WARN" in statuses else "PASS"
    return {"schema_version": SCHEMA_VERSION, "status": status, "root": str(root.absolute()), "checks": checks, "commands_executed": []}


def doctor(root: Path) -> tuple[dict[str, Any], int]:
    checks: list[dict[str, str]] = []
    if root_unsafe(root.absolute()) or not root.is_dir():
        checks.append({"id": "project-root", "status": "FAIL", "summary": "Project root is unavailable or unsafe."})
        return doctor_result(root, checks), 1
    manifest_path = root / "software-project.json"
    if manifest_path.is_symlink() or not manifest_path.is_file():
        checks.append({"id": "manifest", "status": "FAIL", "summary": "Bootstrap manifest is missing or unsafe."})
        return doctor_result(root, checks), 1
    try:
        manifest = load_manifest(manifest_path)
    except BootstrapError:
        checks.append({"id": "manifest", "status": "FAIL", "summary": "Bootstrap manifest is invalid."})
        return doctor_result(root, checks), 1
    checks.append({"id": "manifest", "status": "PASS", "summary": "Bootstrap manifest is valid."})
    expected = desired_files(manifest, GITIGNORE_BLOCK)
    required = [path for path in expected if path != ".gitignore"]
    missing = [path for path in required if target_unsafe(root, path) or not (root / path).is_file()]
    checks.append({"id": "required-artifacts", "status": "FAIL" if missing else "PASS", "summary": f"{len(missing)} required artifact(s) are missing or unsafe." if missing else f"All {len(required)} required artifacts are present."})
    drifted: list[str] = []
    for relative, desired in ((path, content) for path, content in expected.items() if path != ".gitignore"):
        current, error = read_file(root / relative)
        if error or current is None or target_unsafe(root, relative) or not text_equivalent(current, desired):
            drifted.append(relative)
    checks.append({"id": "artifact-content", "status": "FAIL" if drifted else "PASS", "summary": f"{len(drifted)} managed artifact(s) differ from the manifest." if drifted else "All managed artifact contents match the manifest."})
    gitignore, error = read_file(root / ".gitignore")
    ignore_ok = error is None and gitignore is not None and managed_gitignore_safe(gitignore) and nested_gitignores_safe(root)
    checks.append({"id": "gitignore-safety", "status": "PASS" if ignore_ok else "FAIL", "summary": "Managed exclusions are current and not overridden." if ignore_ok else "Managed exclusions are missing, ambiguous, or overridden."})
    checks.append({"id": "open-decisions", "status": "WARN" if manifest["open_decisions"] else "PASS", "summary": f"{len(manifest['open_decisions'])} open decision(s) remain." if manifest["open_decisions"] else "No open decisions are declared."})
    checks.append({"id": "validation-contract", "status": "PASS" if manifest["validation"] else "WARN", "summary": f"{len(manifest['validation'])} validation command(s) are declared but were not executed." if manifest["validation"] else "No validation commands are declared or executed."})
    result = doctor_result(root, checks)
    return result, 1 if result["status"] == "FAIL" else 0


def emit(payload: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(f"Status: {payload['status']}")
        if "plan_digest" in payload:
            print(f"Plan digest: {payload['plan_digest']}")
        for check in payload.get("checks", []):
            print(f"- {check['id']}: {check['status']} — {check['summary']}")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    subparsers = root.add_subparsers(dest="command", required=True)
    for name in ("plan", "apply"):
        sub = subparsers.add_parser(name)
        sub.add_argument("--manifest", required=True, type=Path)
        sub.add_argument("--root", required=True, type=Path)
        sub.add_argument("--mode", choices=("init", "adopt"), required=True)
        sub.add_argument("--json", action="store_true")
        if name == "apply":
            sub.add_argument("--plan-digest", required=True)
    sub = subparsers.add_parser("doctor")
    sub.add_argument("--root", required=True, type=Path)
    sub.add_argument("--json", action="store_true")
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "doctor":
            payload, result = doctor(args.root)
            emit(payload, args.json)
            return result
        manifest = load_manifest(args.manifest)
        if args.command == "plan":
            payload, _ = build_plan(manifest, args.root, args.mode)
            emit(payload, args.json)
            return 2 if payload["status"] == "BLOCKED" else 0
        payload = apply_plan(manifest, args.root, args.mode, args.plan_digest)
        emit(payload, args.json)
        return 0
    except BootstrapError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
