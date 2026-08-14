#!/usr/bin/env python3
"""Validate an operational or analytical dashboard contract without modifying it."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
TOP_FIELDS = {"schema_version", "kind", "dashboard", "data_sources", "metrics", "resources", "filters", "views", "actions", "permissions", "verification"}
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

PLACEHOLDER_VALUES = {"n/a", "na", "none", "not applicable", "not-applicable"}
SEMANTIC_PLACEHOLDER_VALUES = PLACEHOLDER_VALUES | {
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

def non_placeholder_statement(value: Any, label: str) -> str:
    cleaned = string(value, label)
    normalized = canonicalize_scan(cleaned).casefold().rstrip(".")
    if (
        normalized in SEMANTIC_PLACEHOLDER_VALUES
        or DEFERRED_DIRECTIVE_RE.search(normalized)
        or FUTURE_WORK_RE.search(normalized)
    ):
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
    if root["schema_version"] != SCHEMA_VERSION or root["kind"] != "dashboard": raise ContractError("manifest schema or kind is unsupported")
    scan_tree(root)
    dashboard = obj(root["dashboard"], "dashboard"); exact(dashboard, {"name", "mode", "primary_users", "decisions"}, "dashboard")
    slug(dashboard["name"], "dashboard.name"); mode = string(dashboard["mode"], "dashboard.mode")
    if mode not in {"analytics", "operational", "hybrid"}: raise ContractError("dashboard mode is unsupported")
    roles = set(strings(dashboard["primary_users"], "dashboard.primary_users", slugs=True)); strings(dashboard["decisions"], "dashboard.decisions")

    source_ids: list[str] = []
    for item in array(root["data_sources"], "data_sources"):
        source = obj(item, "data source"); exact(source, {"id", "owner", "grain", "freshness", "reconciliation"}, "data source")
        source_ids.append(slug(source["id"], "data_source.id"))
        string(source["owner"], "data_source.owner")
        for field in ("grain", "freshness", "reconciliation"): non_placeholder_statement(source[field], f"data_source.{field}")
    if len(source_ids) != len(set(source_ids)): raise ContractError("data source ids must be unique")
    known_sources = set(source_ids)

    metric_ids: list[str] = []
    for item in array(root["metrics"], "metrics", nonempty=mode == "analytics"):
        metric = obj(item, "metric"); exact(metric, {"id", "label", "source", "formula", "grain", "freshness"}, "metric")
        metric_ids.append(slug(metric["id"], "metric.id")); string(metric["label"], "metric.label")
        metric_source = slug(metric["source"], "metric.source")
        if metric_source not in known_sources: raise ContractError("metric references an unknown source")
        for field in ("formula", "grain"): non_placeholder_statement(metric[field], f"metric.{field}")
        non_placeholder_statement(metric["freshness"], "metric.freshness")
    if len(metric_ids) != len(set(metric_ids)): raise ContractError("metric ids must be unique")

    resource_ids: list[str] = []
    for item in array(root["resources"], "resources", nonempty=mode == "operational"):
        resource = obj(item, "resource"); exact(resource, {"id", "label", "source", "identity", "statuses"}, "resource")
        resource_ids.append(slug(resource["id"], "resource.id")); string(resource["label"], "resource.label")
        resource_source = slug(resource["source"], "resource.source")
        if resource_source not in known_sources: raise ContractError("resource references an unknown source")
        string(resource["identity"], "resource.identity"); strings(resource["statuses"], "resource.statuses")
    if len(resource_ids) != len(set(resource_ids)): raise ContractError("resource ids must be unique")
    if mode == "hybrid" and (not metric_ids or not resource_ids): raise ContractError("hybrid dashboards require metrics and resources")

    filter_ids: list[str] = []
    for item in array(root["filters"], "filters", nonempty=False):
        filter_item = obj(item, "filter"); exact(filter_item, {"id", "type", "scope", "default", "shareable"}, "filter")
        filter_ids.append(slug(filter_item["id"], "filter.id")); string(filter_item["type"], "filter.type"); string(filter_item["scope"], "filter.scope"); string(filter_item["default"], "filter.default"); boolean(filter_item["shareable"], "filter.shareable")
    if len(filter_ids) != len(set(filter_ids)): raise ContractError("filter ids must be unique")
    known_filters = set(filter_ids); known_subjects = set(metric_ids) | set(resource_ids)

    view_ids: list[str] = []; view_paths: list[str] = []
    view_resource_contracts: list[tuple[set[str], set[str]]] = []
    for item in array(root["views"], "views"):
        view = obj(item, "view"); exact(view, {"id", "path", "purpose", "widgets", "filters", "roles", "states"}, "view")
        view_ids.append(slug(view["id"], "view.id")); path = internal_path(view["path"], "view.path")
        view_paths.append(path); string(view["purpose"], "view.purpose")
        widget_ids: list[str] = []
        view_resources: set[str] = set()
        for raw_widget in array(view["widgets"], "view.widgets"):
            widget = obj(raw_widget, "widget"); exact(widget, {"id", "type", "subject"}, "widget")
            widget_ids.append(slug(widget["id"], "widget.id")); string(widget["type"], "widget.type")
            subject = slug(widget["subject"], "widget.subject")
            if subject not in known_subjects: raise ContractError("widget references an unknown subject")
            if subject in set(resource_ids): view_resources.add(subject)
        if len(widget_ids) != len(set(widget_ids)): raise ContractError("widget ids must be unique within a view")
        if not set(strings(view["filters"], "view.filters", nonempty=False, slugs=True)) <= known_filters: raise ContractError("view references an unknown filter")
        view_roles = set(strings(view["roles"], "view.roles", slugs=True))
        if not view_roles <= roles: raise ContractError("view references an unknown role")
        view_resource_contracts.append((view_roles, view_resources))
        states = set(strings(view["states"], "view.states", slugs=True))
        if not {"loading", "empty", "partial", "error", "ready"} <= states: raise ContractError("each view must define loading, empty, partial, error, and ready states")
    if len(view_ids) != len(set(view_ids)) or len(view_paths) != len(set(view_paths)): raise ContractError("view ids and paths must be unique")

    action_ids: list[str] = []
    action_contracts: dict[str, tuple[str, set[str]]] = {}
    for item in array(root["actions"], "actions", nonempty=False):
        action = obj(item, "action"); exact(action, {"id", "resource", "roles", "destructive", "confirmation", "audit_event", "success_state", "failure_state", "reconciliation"}, "action")
        action_id = slug(action["id"], "action.id")
        action_ids.append(action_id)
        action_resource = slug(action["resource"], "action.resource")
        if action_resource not in set(resource_ids): raise ContractError("action references an unknown resource")
        action_roles = set(strings(action["roles"], "action.roles", slugs=True))
        if not action_roles <= roles: raise ContractError("action references an unknown role")
        action_contracts[action_id] = (action_resource, action_roles)
        destructive = boolean(action["destructive"], "action.destructive")
        if destructive:
            non_placeholder_statement(action["confirmation"], "action.confirmation")
        else:
            string(action["confirmation"], "action.confirmation")
        for field in ("audit_event", "success_state", "failure_state"): string(action[field], f"action.{field}")
        non_placeholder_statement(action["reconciliation"], "action.reconciliation")
    if len(action_ids) != len(set(action_ids)): raise ContractError("action ids must be unique")

    permission_roles: list[str] = []
    permission_contracts: dict[str, tuple[set[str], set[str]]] = {}
    for item in array(root["permissions"], "permissions"):
        permission = obj(item, "permission"); exact(permission, {"role", "resources", "actions"}, "permission")
        role = slug(permission["role"], "permission.role"); permission_roles.append(role)
        if role not in roles: raise ContractError("permission references an unknown role")
        permission_resources = set(strings(permission["resources"], "permission.resources", nonempty=False, slugs=True))
        permission_actions = set(strings(permission["actions"], "permission.actions", nonempty=False, slugs=True))
        if not permission_resources <= set(resource_ids): raise ContractError("permission references an unknown resource")
        if not permission_actions <= set(action_ids): raise ContractError("permission references an unknown action")
        if any(role not in action_contracts[action_id][1] or action_contracts[action_id][0] not in permission_resources for action_id in permission_actions):
            raise ContractError("permission contradicts an action role or resource contract")
        permission_contracts[role] = (permission_resources, permission_actions)
    if len(permission_roles) != len(set(permission_roles)): raise ContractError("permission roles must be unique")
    if set(permission_roles) != roles: raise ContractError("permissions must cover every primary user role")
    for action_id, (resource_id, action_roles) in action_contracts.items():
        for role in action_roles:
            permission_resources, permission_actions = permission_contracts[role]
            if resource_id not in permission_resources or action_id not in permission_actions:
                raise ContractError("each action role permission must grant the action and its resource")
    for view_roles, view_resources in view_resource_contracts:
        for role in view_roles:
            permission_resources, _ = permission_contracts[role]
            if not view_resources <= permission_resources:
                raise ContractError("each view role permission must grant every resource widget subject")

    verification_ids: list[str] = []
    for item in array(root["verification"], "verification"):
        check = obj(item, "verification item"); exact(check, {"id", "claim", "evidence"}, "verification item")
        verification_ids.append(slug(check["id"], "verification.id")); non_placeholder_statement(check["claim"], "verification.claim"); non_placeholder_statement(check["evidence"], "verification.evidence")
    if len(verification_ids) != len(set(verification_ids)): raise ContractError("verification ids must be unique")
    return {"schema_version": SCHEMA_VERSION, "status": "PASS", "kind": "dashboard", "mode": mode, "counts": {"sources": len(source_ids), "metrics": len(metric_ids), "resources": len(resource_ids), "views": len(view_ids), "actions": len(action_ids), "verification": len(verification_ids)}}


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
