#!/usr/bin/env python3
"""Validate the structure and safety contract of this skill collection."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "skill-registry.json"
OPERATIONAL_CATEGORIES = {"infrastructure", "devops"}
REQUIRED_FIELDS = {"name", "description", "license"}
REQUIRED_METADATA_FIELDS = {"version", "author", "category", "tags"}
ALLOWED_FIELDS = {
    "name",
    "description",
    "license",
    "allowed-tools",
    "metadata",
    "compatibility",
}
REQUIRED_SECTIONS = {
    "## When to use",
    "## Workflow",
    "## Output contract",
    "## Common pitfalls",
    "## Verification checklist",
}
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LINK_RE = re.compile(r"!?(?<!\\)\[[^\]]*\]\(([^)]+)\)")
SECRET_RE = re.compile(
    r"(?i)(?:api[_-]?key|secret|token|password)\s*[:=]\s*[\"']?"
    r"(?!<|\$|\*{3}|x{3}|your-|example|redacted)[A-Za-z0-9_./+=-]{12,}"
)
MUTATION_TERMS = (
    "apply", "destroy", "delete", "patch", "rollback", "deploy", "reconcile"
)


def fail(errors: list[str], path: Path | str, message: str) -> None:
    try:
        label = Path(path).relative_to(ROOT).as_posix()
    except (TypeError, ValueError):
        label = str(path)
    errors.append(f"{label}: {message}")


def parse_frontmatter(
    path: Path, text: str, errors: list[str]
) -> tuple[dict[str, str], dict[str, str], str]:
    if not text.startswith("---\n"):
        fail(errors, path, "frontmatter must start at byte zero")
        return {}, {}, text
    end = text.find("\n---\n", 4)
    if end < 0:
        fail(errors, path, "frontmatter closing delimiter not found")
        return {}, {}, text

    metadata: dict[str, str] = {}
    nested_metadata: dict[str, str] = {}
    section = ""
    for raw in text[4:end].splitlines():
        if not raw or raw.lstrip().startswith("#"):
            continue
        if raw[0].isspace():
            if section == "metadata" and ":" in raw:
                key, value = raw.strip().split(":", 1)
                nested_metadata[key.strip()] = value.strip().strip('"\'')
            continue
        if ":" not in raw:
            fail(errors, path, f"invalid top-level frontmatter line: {raw!r}")
            continue
        key, value = raw.split(":", 1)
        key = key.strip()
        metadata[key] = value.strip().strip('"\'')
        section = key if key == "metadata" else ""
    return metadata, nested_metadata, text[end + 5 :]


def validate_local_links(path: Path, text: str, errors: list[str]) -> None:
    for raw_target in LINK_RE.findall(text):
        target = raw_target.strip().split()[0].strip("<>\"")
        if not target or target.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        target = unquote(target.split("#", 1)[0].split("?", 1)[0])
        if not target:
            continue
        resolved = (path.parent / target).resolve()
        try:
            resolved.relative_to(ROOT.resolve())
        except ValueError:
            fail(errors, path, f"local link escapes repository: {raw_target}")
            continue
        if not resolved.exists():
            fail(errors, path, f"broken local link: {raw_target}")


def validate_markdown(path: Path, text: str, errors: list[str]) -> None:
    if text.count("```") % 2:
        fail(errors, path, "unbalanced triple-backtick fences")
    validate_local_links(path, text, errors)
    if SECRET_RE.search(text):
        fail(errors, path, "possible hard-coded secret pattern matched")


def markdown_files_to_validate(errors: list[str]) -> list[Path]:
    candidates: list[Path] = []
    for path in ROOT.rglob("*.md"):
        relative = path.relative_to(ROOT)
        if any(part in {".git", ".build-in-public"} for part in relative.parts):
            continue
        candidates.append(path)

    probe = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "--is-inside-work-tree"],
        text=True,
        capture_output=True,
        check=False,
    )
    if probe.returncode != 0 or not candidates:
        return candidates

    relative_paths = [path.relative_to(ROOT).as_posix() for path in candidates]
    result = subprocess.run(
        ["git", "-C", str(ROOT), "check-ignore", "-z", "--stdin"],
        input="\0".join(relative_paths) + "\0",
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode not in {0, 1}:
        detail = result.stderr.strip() or "unknown Git error"
        fail(errors, ROOT, f"could not determine ignored Markdown files: {detail}")
        return candidates
    ignored = {item for item in result.stdout.split("\0") if item}
    return [
        path
        for path, relative in zip(candidates, relative_paths, strict=True)
        if relative not in ignored
    ]


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not REGISTRY.exists():
        fail(errors, REGISTRY, "missing registry")
        registry_skills = []
    else:
        try:
            data = json.loads(REGISTRY.read_text(encoding="utf-8"))
            registry_skills = data.get("skills", [])
        except (json.JSONDecodeError, OSError) as exc:
            fail(errors, REGISTRY, f"invalid JSON: {exc}")
            registry_skills = []

    registered: dict[str, dict[str, str]] = {}
    for item in registry_skills:
        name = item.get("name", "")
        if not name or name in registered:
            fail(errors, REGISTRY, f"missing or duplicate skill name: {name!r}")
        registered[name] = item
        category = item.get("category", "")
        if not NAME_RE.fullmatch(category):
            fail(errors, REGISTRY, f"invalid category for {name}: {category!r}")
        elif not (ROOT / category).is_dir():
            fail(errors, REGISTRY, f"category directory for {name} is missing: {category!r}")
        expected = f"{category}/{name}"
        if item.get("path") != expected:
            fail(errors, REGISTRY, f"path for {name} must be {expected!r}")

    skill_files = sorted(ROOT.glob("*/*/SKILL.md"))
    if not skill_files:
        fail(errors, ROOT, "no skills discovered")

    discovered: dict[str, Path] = {}
    for path in skill_files:
        text = path.read_text(encoding="utf-8")
        metadata, nested_metadata, body = parse_frontmatter(path, text, errors)
        missing = REQUIRED_FIELDS - metadata.keys()
        if missing:
            fail(errors, path, f"missing frontmatter fields: {', '.join(sorted(missing))}")
        extra = metadata.keys() - ALLOWED_FIELDS
        if extra:
            fail(
                errors,
                path,
                "frontmatter fields not allowed by Agent Skills: "
                + ", ".join(sorted(extra)),
            )
        missing_metadata = REQUIRED_METADATA_FIELDS - nested_metadata.keys()
        if missing_metadata:
            fail(
                errors,
                path,
                "missing metadata fields: " + ", ".join(sorted(missing_metadata)),
            )

        name = metadata.get("name", "")
        if name in discovered:
            first = discovered[name].relative_to(ROOT).as_posix()
            fail(errors, path, f"duplicate skill name {name!r}; first found at {first}")
        else:
            discovered[name] = path
        if name != path.parent.name:
            fail(errors, path, f"name {name!r} must match directory {path.parent.name!r}")
        if len(name) > 64 or not NAME_RE.fullmatch(name):
            fail(errors, path, "name must be <=64 chars and lowercase-hyphenated")

        description = metadata.get("description", "")
        if not description.startswith("Use when"):
            fail(errors, path, "description must begin with 'Use when'")
        if len(description) > 1024:
            fail(errors, path, "description exceeds 1024 characters")
        if len(description) < 80:
            warnings.append(f"{path.relative_to(ROOT)}: description may be too vague")

        if not body.strip():
            fail(errors, path, "body is empty")
        if len(text) > 100_000:
            fail(errors, path, "SKILL.md exceeds 100,000 characters")
        if len(text.splitlines()) > 500:
            fail(errors, path, "SKILL.md exceeds 500 lines; move depth to references")
        for section in REQUIRED_SECTIONS:
            if section not in body:
                fail(errors, path, f"missing required section {section!r}")

        category = path.parents[1].name
        if nested_metadata.get("category") != category:
            fail(errors, path, "metadata.category must match the top-level directory")
        if category in OPERATIONAL_CATEGORIES and "<HARD-GATE>" not in body:
            fail(errors, path, "operational skill requires a <HARD-GATE>")
        if category in OPERATIONAL_CATEGORIES:
            lowered = body.lower()
            if not any(term in lowered for term in MUTATION_TERMS):
                warnings.append(f"{path.relative_to(ROOT)}: no mutation vocabulary found")
            if "explicit" not in lowered or "authoriz" not in lowered:
                fail(errors, path, "operational skill must require explicit authorization")

        validate_markdown(path, text, errors)

    discovered_names = set(discovered)
    if discovered_names != set(registered):
        missing_registry = sorted(discovered_names - set(registered))
        missing_disk = sorted(set(registered) - discovered_names)
        if missing_registry:
            fail(errors, REGISTRY, f"unregistered skills: {', '.join(missing_registry)}")
        if missing_disk:
            fail(errors, REGISTRY, f"registered skills missing on disk: {', '.join(missing_disk)}")

    for required in ("README.md", "LICENSE", "NOTICE.md", "CONTRIBUTING.md", "SECURITY.md"):
        if not (ROOT / required).exists():
            fail(errors, ROOT / required, "required repository file missing")

    readme = ROOT / "README.md"
    if readme.exists():
        readme_text = readme.read_text(encoding="utf-8")
        validate_markdown(readme, readme_text, errors)
        for name in sorted(discovered_names):
            if name not in readme_text:
                fail(errors, readme, f"catalog does not mention {name}")

    for path in markdown_files_to_validate(errors):
        if path.name == "SKILL.md" or path == readme:
            continue
        validate_markdown(path, path.read_text(encoding="utf-8"), errors)

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        for error in errors:
            print(f"  - {error}")
        return 1

    reference_count = sum(1 for _ in ROOT.glob("*/*/references/*.md"))
    template_count = sum(1 for _ in ROOT.glob("*/*/templates/*.md"))
    print(
        f"OK: {len(skill_files)} skills, {reference_count} references, "
        f"{template_count} templates; frontmatter, safety contracts, registry, "
        "Markdown fences, and local links validated."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
