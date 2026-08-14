#!/usr/bin/env python3
"""Validate objective safety and integrity properties of AGENTS.md files."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote

SCHEMA_VERSION = "1.0"
MAX_AGENTS_FILE_BYTES = 128_000
IGNORED_DIRECTORIES = {
    ".git",
    ".hg",
    ".svn",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor",
}
LINK_RE = re.compile(r"!?(?<!\\)\[[^\]]*\]\(([^)]+)\)")
PLACEHOLDER_RE = re.compile(
    r"\{\{[^{}\n]{1,120}\}\}|<[A-Z][A-Z0-9_ -]{1,80}>|"
    r"\[(?:TODO|TBD|CHANGEME)\]|\bCHANGEME\b"
)
SECRET_RE = re.compile(
    r"(?i)(?:api[_-]?key|secret|token|password)\s*[:=]\s*[\"']?"
    r"(?!<|\$|\*{3}|x{3}|your-|example|redacted)[A-Za-z0-9_./+=-]{12,}"
)
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")


def finding(path: str, code: str, line: int | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"path": path, "code": code}
    if line is not None:
        item["line"] = line
    return item


def blocked() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "BLOCKED",
        "errors": [
            {
                "code": "invalid-root",
                "message": "root must be an existing, non-symlinked directory",
            }
        ],
        "commands_executed": [],
    }


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def has_unbalanced_fence(text: str) -> bool:
    active_character = ""
    active_length = 0
    for line in text.splitlines():
        match = FENCE_RE.match(line)
        if not match:
            continue
        marker = match.group(1)
        if not active_character:
            active_character = marker[0]
            active_length = len(marker)
        elif marker[0] == active_character and len(marker) >= active_length:
            active_character = ""
            active_length = 0
    return bool(active_character)


def mask_fenced_blocks(text: str) -> str:
    output: list[str] = []
    active_character = ""
    active_length = 0
    for line in text.splitlines(keepends=True):
        match = FENCE_RE.match(line)
        if match:
            marker = match.group(1)
            if not active_character:
                active_character = marker[0]
                active_length = len(marker)
            elif marker[0] == active_character and len(marker) >= active_length:
                active_character = ""
                active_length = 0
            output.append("\n" if line.endswith("\n") else "")
            continue
        if active_character:
            output.append("\n" if line.endswith("\n") else "")
        else:
            output.append(line)
    return "".join(output)


def path_contains_symlink(path: Path, root: Path) -> bool:
    current = path
    while current != root:
        if current.is_symlink():
            return True
        current = current.parent
    return False


def validate_links(path: Path, root: Path, text: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    visible_text = mask_fenced_blocks(text)
    for match in LINK_RE.finditer(visible_text):
        raw_target = match.group(1).strip()
        target = raw_target.split()[0].strip("<>\"") if raw_target else ""
        if not target or target.startswith(
            ("http://", "https://", "mailto:", "#", "data:")
        ):
            continue
        target = unquote(target.split("#", 1)[0].split("?", 1)[0])
        if not target:
            continue
        candidate = path.parent / target
        try:
            resolved = candidate.resolve(strict=False)
            resolved.relative_to(root)
        except (OSError, RuntimeError, ValueError):
            findings.append(
                finding(
                    path.relative_to(root).as_posix(),
                    "link-escapes-root",
                    line_number(visible_text, match.start()),
                )
            )
            continue
        if path_contains_symlink(candidate, root):
            findings.append(
                finding(
                    path.relative_to(root).as_posix(),
                    "link-through-symlink",
                    line_number(visible_text, match.start()),
                )
            )
        elif not candidate.exists():
            findings.append(
                finding(
                    path.relative_to(root).as_posix(),
                    "broken-local-link",
                    line_number(visible_text, match.start()),
                )
            )
    return findings


def discover_agents_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for current_raw, directories, names in os.walk(root, topdown=True, followlinks=False):
        current = Path(current_raw)
        directories[:] = sorted(
            name
            for name in directories
            if name not in IGNORED_DIRECTORIES and not (current / name).is_symlink()
        )
        if "AGENTS.md" in names:
            files.append(current / "AGENTS.md")
    return sorted(files, key=lambda item: item.relative_to(root).as_posix())


def validate_file(path: Path, root: Path) -> list[dict[str, Any]]:
    label = path.relative_to(root).as_posix()
    if path.is_symlink():
        return [finding(label, "symlink-not-allowed")]
    try:
        if not path.is_file():
            return [finding(label, "not-a-regular-file")]
        if path.stat().st_size > MAX_AGENTS_FILE_BYTES:
            return [finding(label, "file-too-large")]
        data = path.read_bytes()
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [finding(label, "invalid-utf8")]
    except OSError:
        return [finding(label, "file-unreadable")]

    findings: list[dict[str, Any]] = []
    if not text.strip():
        findings.append(finding(label, "empty-file"))
    if has_unbalanced_fence(text):
        findings.append(finding(label, "unbalanced-fence"))
    placeholder = PLACEHOLDER_RE.search(text)
    if placeholder:
        findings.append(
            finding(label, "unresolved-placeholder", line_number(text, placeholder.start()))
        )
    possible_secret = SECRET_RE.search(text)
    if possible_secret:
        findings.append(
            finding(label, "possible-secret", line_number(text, possible_secret.start()))
        )
    findings.extend(validate_links(path, root, text))
    return findings


def validate(root: Path) -> dict[str, Any]:
    files = discover_agents_files(root)
    findings: list[dict[str, Any]] = []
    root_agents = root / "AGENTS.md"
    if not root_agents.exists() and not root_agents.is_symlink():
        findings.append(finding("AGENTS.md", "missing-root-agents"))
    elif root_agents not in files:
        files.insert(0, root_agents)

    for path in files:
        findings.extend(validate_file(path, root))

    findings = sorted(
        {json.dumps(item, sort_keys=True): item for item in findings}.values(),
        key=lambda item: (item["path"], item.get("line", 0), item["code"]),
    )
    labels = sorted(
        {
            path.relative_to(root).as_posix()
            for path in files
            if path.exists() or path.is_symlink()
        }
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "FAIL" if findings else "PASS",
        "files": labels,
        "findings": findings,
        "commands_executed": [],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate objective integrity properties of AGENTS.md files."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    check = subparsers.add_parser("check")
    check.add_argument("--root", required=True)
    check.add_argument("--json", action="store_true")
    return parser


def render_text(payload: dict[str, Any]) -> str:
    lines = [f"AGENTS.md validation: {payload['status']}"]
    for item in payload.get("findings", []):
        suffix = f":{item['line']}" if "line" in item else ""
        lines.append(f"- {item['path']}{suffix}: {item['code']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    raw_root = Path(args.root).expanduser()
    try:
        if raw_root.is_symlink() or not raw_root.is_dir():
            payload = blocked()
            print(json.dumps(payload, indent=2, sort_keys=True) if args.json else render_text(payload))
            return 2
        root = raw_root.resolve(strict=True)
        payload = validate(root)
    except (OSError, RuntimeError, ValueError):
        payload = blocked()
        print(json.dumps(payload, indent=2, sort_keys=True) if args.json else render_text(payload))
        return 2

    print(json.dumps(payload, indent=2, sort_keys=True) if args.json else render_text(payload))
    return 0 if payload["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
