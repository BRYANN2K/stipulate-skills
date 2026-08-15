#!/usr/bin/env python3
"""Hermes pre_tool_call adapter for the Web Craft design-flow gate."""

from __future__ import annotations

import json
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

FLOW_SCRIPT = Path(__file__).with_name("design_flow.py")
PATCH_FILE_RE = re.compile(r"^\*\*\* (Add|Update|Delete) File:\s*(.+?)\s*$")
PATCH_MOVE_RE = re.compile(r"^\*\*\* Move to:\s*(.+?)\s*$")
SHELL_META_RE = re.compile(r"[;&|<>`\n\r]|\$\(|\$\{")
READ_ONLY_COMMANDS = {
    "pwd", "ls", "rg", "grep", "cat", "head", "tail", "wc", "stat", "file", "which"
}
READ_ONLY_GIT = {"status", "diff", "log", "show", "rev-parse"}


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


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def find_project_root(cwd: Path) -> Path | None:
    current = cwd.resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".design-flow" / "workflow.json").is_file():
            return candidate
    return None


def effective_cwd(raw_cwd: str, tool_name: str, tool_input: dict[str, Any]) -> Path:
    try:
        base = Path(raw_cwd).expanduser().resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise ValueError("hook cwd cannot be resolved") from exc
    if not base.is_dir():
        raise ValueError("hook cwd is not a directory")
    if tool_name != "terminal" or "workdir" not in tool_input:
        return base
    workdir = tool_input.get("workdir")
    if not isinstance(workdir, str) or not workdir.strip():
        raise ValueError("terminal workdir must be a non-empty string")
    candidate = Path(workdir).expanduser()
    if not candidate.is_absolute():
        candidate = base / candidate
    try:
        resolved = candidate.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise ValueError("terminal workdir cannot be resolved") from exc
    if not resolved.is_dir():
        raise ValueError("terminal workdir is not a directory")
    return resolved


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
    mode = tool_input.get("mode")
    direct = tool_input.get("path")
    patch = tool_input.get("patch")
    if mode == "replace":
        if patch is not None:
            return None
        return [direct] if isinstance(direct, str) and direct else None
    if mode == "patch":
        if direct is not None or not isinstance(patch, str) or not patch:
            return None
        return v4a_patch_paths(patch)
    return None


def v4a_patch_paths(patch: str) -> list[str] | None:
    if "\x00" in patch:
        return None
    lines = patch.splitlines()
    if len(lines) < 3 or lines[0] != "*** Begin Patch" or lines[-1] != "*** End Patch":
        return None
    if lines.count("*** Begin Patch") != 1 or lines.count("*** End Patch") != 1:
        return None
    paths: list[str] = []
    mode: str | None = None
    body_seen = False
    for line in lines[1:-1]:
        file_match = PATCH_FILE_RE.fullmatch(line)
        if file_match:
            if mode in {"Add", "Update"} and not body_seen:
                return None
            mode = file_match.group(1)
            path = file_match.group(2).strip()
            if not path:
                return None
            paths.append(path)
            body_seen = False
            continue
        move_match = PATCH_MOVE_RE.fullmatch(line)
        if move_match:
            if mode != "Update" or not move_match.group(1).strip():
                return None
            paths.append(move_match.group(1).strip())
            continue
        if line.startswith("*** ") or mode is None:
            return None
        if mode == "Delete":
            return None
        if mode == "Add" and not line.startswith("+"):
            return None
        if mode == "Update" and not (line.startswith(("@@", "+", "-", " "))):
            return None
        body_seen = True
    if mode in {"Add", "Update"} and not body_seen:
        return None
    return paths or None


def resolve_executable(token: str, cwd: Path) -> Path | None:
    candidate: Path | None
    if "/" in token:
        candidate = Path(token).expanduser()
        if not candidate.is_absolute():
            candidate = cwd / candidate
    else:
        found = shutil.which(token)
        candidate = Path(found) if found else None
    if candidate is None:
        return None
    try:
        return candidate.resolve(strict=True)
    except (OSError, RuntimeError):
        return None


def trusted_path_executable(token: str, cwd: Path) -> bool:
    basename = Path(token).name
    resolved = resolve_executable(token, cwd)
    trusted = shutil.which(basename)
    if resolved is None or trusted is None:
        return False
    try:
        return resolved == Path(trusted).resolve(strict=True)
    except (OSError, RuntimeError):
        return False


def exact_flow_command(command: str, cwd: Path) -> bool:
    if SHELL_META_RE.search(command) or "#" in command:
        return False
    try:
        tokens = shlex.split(command)
    except ValueError:
        return False
    if not tokens:
        return False
    script_index = 0
    if Path(tokens[0]).name in {"python", "python3"}:
        if not trusted_path_executable(tokens[0], cwd):
            return False
        script_index = 1
    if len(tokens) <= script_index + 1:
        return False
    try:
        script = Path(tokens[script_index]).expanduser().resolve(strict=True)
    except (OSError, RuntimeError):
        return False
    allowed_subcommands = {"init", "ready", "approve", "compile", "check-build", "guard-write", "verify", "status"}
    return script == FLOW_SCRIPT.resolve() and tokens[script_index + 1] in allowed_subcommands


def read_only_terminal_command(command: str, cwd: Path) -> bool:
    if SHELL_META_RE.search(command) or "#" in command:
        return False
    try:
        tokens = shlex.split(command)
    except ValueError:
        return False
    if not tokens:
        return False
    dangerous_options = ("--output", "--pre", "--ext-diff", "--textconv", "--exec", "-exec")
    if any(
        token == "-o" or any(token == option or token.startswith(option + "=") for option in dangerous_options)
        for token in tokens[1:]
    ):
        return False
    executable = Path(tokens[0]).name
    if executable in READ_ONLY_COMMANDS and trusted_path_executable(tokens[0], cwd):
        return True
    return (
        executable == "git"
        and trusted_path_executable(tokens[0], cwd)
        and len(tokens) > 1
        and tokens[1] in READ_ONLY_GIT
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin, object_pairs_hook=reject_duplicate_keys)
    except (json.JSONDecodeError, OSError, ValueError):
        return block("Web Craft guard received malformed hook input")
    if not isinstance(payload, dict):
        return block("Web Craft guard received a non-object hook payload")
    if payload.get("hook_event_name") != "pre_tool_call":
        return block("Web Craft guard received an unexpected hook event")
    tool_name = payload.get("tool_name")
    tool_input = payload.get("tool_input")
    cwd = payload.get("cwd")
    if not isinstance(tool_name, str) or not isinstance(tool_input, dict) or not isinstance(cwd, str):
        return block("Web Craft guard received incomplete tool metadata")
    try:
        operation_cwd = effective_cwd(cwd, tool_name, tool_input)
    except ValueError as exc:
        return block(f"Web Craft guard rejected invalid working-directory input: {exc}")
    root = find_project_root(operation_cwd)
    if root is None:
        response()
        return 0

    if tool_name in {"write_file", "patch"}:
        paths = tool_paths(tool_name, tool_input)
        if paths is None:
            return block(f"Web Craft guard received ambiguous input or could not determine paths for {tool_name}")
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
        if exact_flow_command(command, operation_cwd):
            response()
            return 0
        allowed, detail = build_is_allowed(root)
        if not allowed and not read_only_terminal_command(command, operation_cwd):
            return block(
                "Web Craft blocked a terminal command outside the pre-approval read-only allowlist: "
                + (detail or "build gate failed")
            )
        response()
        return 0

    return block("Web Craft guard received an unsupported tool name")


if __name__ == "__main__":
    sys.exit(main())
