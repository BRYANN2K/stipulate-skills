#!/usr/bin/env python3
"""Hermes pre_tool_call adapter for the Web Craft design-flow gate."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

FLOW_SCRIPT = Path(__file__).with_name("design_flow.py")
PATCH_PATH_RE = re.compile(r"^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$", re.MULTILINE)
SUSPICIOUS_TERMINAL_RE = re.compile(
    r"(?:^|[;&|]\s*)(?:rm|mv|cp|install|touch|truncate)\b|"
    r"\bsed\s+[^;&|]*\s-i(?:\s|$)|"
    r"(?:^|[^<])>{1,2}(?!=)|"
    r"\btee\b|"
    r"\bgit\s+(?:apply|checkout|clean|reset|restore)\b|"
    r"\b(?:npm|pnpm|yarn|bun)\s+(?:add|install|remove|uninstall)\b",
    re.IGNORECASE,
)


def response(action: str | None = None, message: str | None = None) -> None:
    payload: dict[str, str] = {}
    if action:
        payload["action"] = action
    if message:
        payload["message"] = message
    print(json.dumps(payload))


def block(message: str) -> int:
    response("block", message)
    return 0


def find_project_root(cwd: Path) -> Path | None:
    current = cwd.resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".design-flow" / "workflow.json").is_file():
            return candidate
    return None


def run_gate(root: Path, path: str) -> tuple[bool, str]:
    result = subprocess.run(
        [
            sys.executable,
            str(FLOW_SCRIPT),
            "guard-write",
            "--root",
            str(root),
            "--path",
            path,
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    detail = (result.stderr or result.stdout).strip()
    return result.returncode == 0, detail


def build_is_allowed(root: Path) -> tuple[bool, str]:
    result = subprocess.run(
        [sys.executable, str(FLOW_SCRIPT), "check-build", "--root", str(root)],
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0, (result.stderr or result.stdout).strip()


def tool_paths(tool_name: str, tool_input: dict[str, Any]) -> list[str] | None:
    if tool_name == "write_file":
        value = tool_input.get("path")
        return [value] if isinstance(value, str) and value else None
    if tool_name != "patch":
        return []
    direct = tool_input.get("path")
    if isinstance(direct, str) and direct:
        return [direct]
    patch = tool_input.get("patch")
    if isinstance(patch, str) and patch:
        paths = [match.strip() for match in PATCH_PATH_RE.findall(patch) if match.strip()]
        return paths or None
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        return block("Web Craft guard received malformed hook input")
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "pre_tool_call":
        response()
        return 0
    tool_name = payload.get("tool_name")
    tool_input = payload.get("tool_input")
    cwd = payload.get("cwd")
    if not isinstance(tool_name, str) or not isinstance(tool_input, dict) or not isinstance(cwd, str):
        return block("Web Craft guard received incomplete tool metadata")
    root = find_project_root(Path(cwd))
    if root is None:
        response()
        return 0

    if tool_name in {"write_file", "patch"}:
        paths = tool_paths(tool_name, tool_input)
        if paths is None:
            return block(f"Web Craft guard could not determine paths for {tool_name}")
        for path in paths:
            allowed, detail = run_gate(root, path)
            if not allowed:
                return block(detail or f"Web Craft blocked a write to {path}")
        response()
        return 0

    if tool_name == "terminal":
        command = tool_input.get("command")
        if not isinstance(command, str) or not command.strip():
            return block("Web Craft guard received terminal input without a command")
        if "design_flow.py" in command:
            response()
            return 0
        allowed, detail = build_is_allowed(root)
        if not allowed and SUSPICIOUS_TERMINAL_RE.search(command):
            return block(
                "Web Craft blocked a potentially mutating terminal command before SYSTEM_APPROVED: "
                + (detail or "build gate failed")
            )
        response()
        return 0

    response()
    return 0


if __name__ == "__main__":
    sys.exit(main())
