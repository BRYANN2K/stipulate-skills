#!/usr/bin/env python3
"""Validate a terminal UI engineering contract without modifying it."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
TOP_FIELDS = {"schema_version", "kind", "application", "screens", "keybindings", "operations", "terminal", "compatibility", "verification"}
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

def non_placeholder_statement(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if canonicalize_scan(cleaned).casefold().rstrip(".") in PLACEHOLDER_VALUES:
        raise ContractError(f"{label} must not be a deferred placeholder")
    return cleaned

def slug(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if not SLUG_RE.fullmatch(cleaned): raise ContractError(f"{label} must be lowercase kebab-case")
    return cleaned

def boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool): raise ContractError(f"{label} must be a boolean")
    return value

def strings(value: Any, label: str, *, nonempty: bool = True, slugs: bool = False) -> list[str]:
    result = [slug(item, label) if slugs else string(item, label) for item in array(value, label, nonempty=nonempty)]
    if len(result) != len(set(result)): raise ContractError(f"{label} contains duplicates")
    return result

def scan_tree(value: Any) -> None:
    if isinstance(value, str): string(value, "manifest text")
    elif isinstance(value, list):
        for item in value: scan_tree(item)
    elif isinstance(value, dict):
        for item in value.values(): scan_tree(item)

def positive_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0: raise ContractError(f"{label} must be a positive integer")
    return value

def validate(raw: Any) -> dict[str, Any]:
    root = obj(raw, "manifest"); exact(root, TOP_FIELDS, "manifest")
    if root["schema_version"] != SCHEMA_VERSION or root["kind"] != "terminal-ui": raise ContractError("manifest schema or kind is unsupported")
    scan_tree(root)
    application = obj(root["application"], "application"); exact(application, {"name", "primary_user", "core_task"}, "application")
    slug(application["name"], "application.name"); string(application["primary_user"], "application.primary_user"); string(application["core_task"], "application.core_task")

    screen_ids: list[str] = []
    screen_contracts: dict[str, tuple[str, list[str]]] = {}
    for item in array(root["screens"], "screens"):
        screen = obj(item, "screen"); exact(screen, {"id", "purpose", "minimum_size", "focus_order", "states"}, "screen")
        screen_id = slug(screen["id"], "screen.id"); screen_ids.append(screen_id); purpose = string(screen["purpose"], "screen.purpose")
        minimum = obj(screen["minimum_size"], "screen.minimum_size"); exact(minimum, {"columns", "rows"}, "screen.minimum_size")
        positive_integer(minimum["columns"], "screen.minimum_size.columns"); positive_integer(minimum["rows"], "screen.minimum_size.rows")
        focus_order = strings(screen["focus_order"], "screen.focus_order", nonempty=False, slugs=True)
        screen_contracts[screen_id] = (purpose, focus_order)
        states = set(strings(screen["states"], "screen.states", slugs=True))
        if "ready" not in states or "error" not in states: raise ContractError("each screen requires ready and error states")
    if len(screen_ids) != len(set(screen_ids)): raise ContractError("screen ids must be unique")
    known_screens = set(screen_ids)

    binding_keys: list[tuple[str, str]] = []
    global_actions: set[str] = set()
    for item in array(root["keybindings"], "keybindings"):
        binding = obj(item, "keybinding"); exact(binding, {"key", "action", "scope", "discoverable"}, "keybinding")
        key = string(binding["key"], "keybinding.key"); action = string(binding["action"], "keybinding.action"); scope = slug(binding["scope"], "keybinding.scope")
        if scope != "global" and scope not in known_screens: raise ContractError("keybinding scope is unknown")
        binding_keys.append((scope, key.casefold())); boolean(binding["discoverable"], "keybinding.discoverable")
        if scope == "global": global_actions.add(action.casefold())
    if len(binding_keys) != len(set(binding_keys)): raise ContractError("keybindings must be unique within each scope")
    if "quit" not in global_actions: raise ContractError("an explicit global quit action is required")
    if not any("cancel" in re.split(r"[^a-z0-9]+", action) for action in global_actions): raise ContractError("a global cancel path is required")

    operation_ids: list[str] = []
    for item in array(root["operations"], "operations", nonempty=False):
        operation = obj(item, "operation"); exact(operation, {"id", "screen", "async", "cancellable", "destructive", "confirmation_screen", "success_state", "failure_state"}, "operation")
        operation_id = slug(operation["id"], "operation.id"); operation_ids.append(operation_id)
        operation_screen = slug(operation["screen"], "operation.screen")
        if operation_screen not in known_screens: raise ContractError("operation references an unknown screen")
        asynchronous = boolean(operation["async"], "operation.async"); cancellable = boolean(operation["cancellable"], "operation.cancellable"); destructive = boolean(operation["destructive"], "operation.destructive")
        raw_confirmation = operation["confirmation_screen"]
        confirmation = "" if raw_confirmation == "" else slug(raw_confirmation, "operation.confirmation_screen")
        if destructive:
            if confirmation not in known_screens: raise ContractError("destructive operations require a known confirmation screen")
            if confirmation == operation_screen: raise ContractError("destructive operations require a distinct confirmation screen")
            confirmation_purpose, confirmation_focus = screen_contracts[confirmation]
            operation_terms = set(operation_id.split("-"))
            purpose_terms = set(re.split(r"[^a-z0-9]+", confirmation_purpose.casefold()))
            if not operation_terms <= purpose_terms:
                raise ContractError("confirmation screen purpose must identify the operation")
            if not {"cancel", "confirm"} <= set(confirmation_focus):
                raise ContractError("confirmation screen focus order must expose cancel and confirm")
            if confirmation_focus.index("cancel") > confirmation_focus.index("confirm"):
                raise ContractError("confirmation screen focus order must expose cancel before confirm")
        elif confirmation and confirmation not in known_screens:
            raise ContractError("confirmation screen is unknown")
        non_placeholder_statement(operation["success_state"], "operation.success_state"); non_placeholder_statement(operation["failure_state"], "operation.failure_state")
        if asynchronous and not cancellable: raise ContractError("asynchronous operations require a cancellation contract")
    if len(operation_ids) != len(set(operation_ids)): raise ContractError("operation ids must be unique")

    terminal = obj(root["terminal"], "terminal"); exact(terminal, {"alternate_screen", "restore_on_exit", "resize_behavior", "color_mode", "unicode_fallback", "non_tty_behavior"}, "terminal")
    boolean(terminal["alternate_screen"], "terminal.alternate_screen")
    if not boolean(terminal["restore_on_exit"], "terminal.restore_on_exit"): raise ContractError("terminal modes must be restored on exit")
    for field in ("resize_behavior", "color_mode", "unicode_fallback", "non_tty_behavior"): non_placeholder_statement(terminal[field], f"terminal.{field}")

    compatibility = obj(root["compatibility"], "compatibility"); exact(compatibility, {"platforms", "terminals", "minimum_sizes"}, "compatibility")
    strings(compatibility["platforms"], "compatibility.platforms"); strings(compatibility["terminals"], "compatibility.terminals"); strings(compatibility["minimum_sizes"], "compatibility.minimum_sizes")

    verification = obj(root["verification"], "verification"); exact(verification, {"state_tests", "snapshot_tests", "virtual_terminal_tests", "pty_tests", "cleanup_test"}, "verification")
    for field in ("state_tests", "snapshot_tests", "virtual_terminal_tests", "pty_tests"):
        if not boolean(verification[field], f"verification.{field}"): raise ContractError(f"verification.{field} is required")
    non_placeholder_statement(verification["cleanup_test"], "verification.cleanup_test")
    return {"schema_version": SCHEMA_VERSION, "status": "PASS", "kind": "terminal-ui", "counts": {"screens": len(screen_ids), "keybindings": len(binding_keys), "operations": len(operation_ids)}, "verification_layers": ["state", "snapshot", "virtual-terminal", "pty", "cleanup"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__); sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check"); check.add_argument("--manifest", required=True, type=Path); check.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try: payload = validate(json.loads(
        args.manifest.read_text(encoding="utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=reject_non_finite,
    ))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, ContractError) as exc:
        print(f"ERROR: {str(exc) if isinstance(exc, ContractError) else 'manifest could not be read as valid JSON'}", file=sys.stderr); return 2
    print(json.dumps(payload, indent=2, sort_keys=True) if args.json else "Status: PASS"); return 0

if __name__ == "__main__": sys.exit(main())
