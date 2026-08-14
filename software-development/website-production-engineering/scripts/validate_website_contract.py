#!/usr/bin/env python3
"""Validate a website production contract without modifying it."""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
TOP_FIELDS = {"schema_version", "kind", "project", "pages", "forms", "redirects", "analytics", "quality", "verification"}
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


class ContractError(RuntimeError):
    pass


class DuplicateKeyError(ContractError):
    pass


PLACEHOLDER_VALUES = {
    "n/a", "na", "none", "not applicable", "not-applicable",
    "eventually", "unspecified", "tbd", "later", "todo", "pending",
    "defer", "deferred", "unknown", "placeholder", "to be determined",
}


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


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError("manifest contains a duplicate JSON key")
        result[key] = value
    return result


def reject_non_finite(_: str) -> Any:
    raise ContractError("manifest contains a non-finite JSON number")


def exact(value: dict[str, Any], fields: set[str], label: str) -> None:
    extra, missing = set(value) - fields, fields - set(value)
    if extra:
        raise ContractError(f"{label} contains unsupported fields")
    if missing:
        raise ContractError(f"{label} is missing required fields")


def obj(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError(f"{label} must be an object")
    return value


def array(value: Any, label: str, *, nonempty: bool = True) -> list[Any]:
    if not isinstance(value, list) or (nonempty and not value):
        raise ContractError(f"{label} must be a non-empty array")
    return value


def string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{label} must be a non-empty string")
    cleaned = value.strip()
    if any(ord(char) < 32 or ord(char) == 127 for char in cleaned):
        raise ContractError(f"{label} contains control characters")
    scan = canonicalize_scan(cleaned)
    segmented = CAMEL_RE.sub("_", scan)
    if SECRET_RE.search(segmented) or COMPACT_UPPER_SECRET_RE.search(scan.upper()) or AUTH_RE.search(segmented) or CREDENTIAL_URI_RE.search(scan):
        raise ContractError("manifest contains a possible credential")
    return cleaned


def non_placeholder_statement(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if canonicalize_scan(cleaned).casefold().rstrip(".") in PLACEHOLDER_VALUES:
        raise ContractError(f"{label} must not be a deferred placeholder")
    return cleaned


def slug(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if not SLUG_RE.fullmatch(cleaned):
        raise ContractError(f"{label} must be lowercase kebab-case")
    return cleaned


def boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool):
        raise ContractError(f"{label} must be a boolean")
    return value


def finite_number(value: Any, label: str, *, allow_zero: bool) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContractError(f"{label} must be a finite number")
    qualifier = "non-negative" if allow_zero else "positive"
    try:
        number = float(value)
    except OverflowError as exc:
        raise ContractError(f"{label} must be a finite {qualifier} number") from exc
    if not math.isfinite(number) or number < 0 or (not allow_zero and number == 0):
        raise ContractError(f"{label} must be a finite {qualifier} number")
    return number


def integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ContractError(f"{label} must be an integer")
    return value


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


def unique(items: list[str], label: str) -> None:
    if len(items) != len(set(items)):
        raise ContractError(f"{label} contains duplicates")


def scan_tree(value: Any) -> None:
    if isinstance(value, str):
        string(value, "manifest text")
    elif isinstance(value, list):
        for item in value:
            scan_tree(item)
    elif isinstance(value, dict):
        for item in value.values():
            scan_tree(item)


def validate(raw: Any) -> dict[str, Any]:
    root = obj(raw, "manifest")
    exact(root, TOP_FIELDS, "manifest")
    if root["schema_version"] != SCHEMA_VERSION or root["kind"] != "website":
        raise ContractError("manifest schema or kind is unsupported")
    scan_tree(root)

    project = obj(root["project"], "project")
    exact(project, {"name", "audience", "primary_conversion"}, "project")
    slug(project["name"], "project.name")
    string(project["audience"], "project.audience")
    non_placeholder_statement(project["primary_conversion"], "project.primary_conversion")

    page_ids: list[str] = []
    page_paths: list[str] = []
    for index, raw_page in enumerate(array(root["pages"], "pages")):
        page = obj(raw_page, f"pages[{index}]")
        exact(page, {"id", "path", "purpose", "audience_need", "primary_action", "indexable", "metadata"}, f"pages[{index}]")
        page_id = slug(page["id"], f"pages[{index}].id")
        path = internal_path(page["path"], f"pages[{index}].path")
        string(page["purpose"], "page purpose")
        string(page["audience_need"], "page audience_need")
        string(page["primary_action"], "page primary_action")
        boolean(page["indexable"], "page indexable")
        metadata = obj(page["metadata"], "page metadata")
        exact(metadata, {"title", "description"}, "page metadata")
        string(metadata["title"], "metadata.title")
        string(metadata["description"], "metadata.description")
        page_ids.append(page_id)
        page_paths.append(path)
    unique(page_ids, "page ids")
    unique(page_paths, "page paths")
    known_pages = set(page_ids)
    live_paths = set(page_paths)

    form_ids: list[str] = []
    for index, raw_form in enumerate(array(root["forms"], "forms", nonempty=False)):
        form = obj(raw_form, f"forms[{index}]")
        exact(form, {"id", "page", "success_state", "error_state", "spam_protection", "privacy_notice"}, f"forms[{index}]")
        form_ids.append(slug(form["id"], "form.id"))
        form_page = slug(form["page"], "form.page")
        privacy_notice = slug(form["privacy_notice"], "form.privacy_notice")
        if form_page not in known_pages or privacy_notice not in known_pages:
            raise ContractError("form references an unknown page")
        for field in ("success_state", "error_state", "spam_protection"):
            non_placeholder_statement(form[field], f"form.{field}")
    unique(form_ids, "form ids")

    redirect_sources: list[str] = []
    redirect_map: dict[str, str] = {}
    for index, raw_redirect in enumerate(array(root["redirects"], "redirects", nonempty=False)):
        redirect = obj(raw_redirect, f"redirects[{index}]")
        exact(redirect, {"from", "to", "status"}, f"redirects[{index}]")
        source = internal_path(redirect["from"], "redirect.from")
        target = internal_path(redirect["to"], "redirect.to")
        status = integer(redirect["status"], "redirect.status")
        if source == target or source in live_paths or status not in {301, 302, 307, 308}:
            raise ContractError("redirect conflicts with a live page, loops, or has an unsupported status")
        redirect_sources.append(source)
        redirect_map[source] = target
    unique(redirect_sources, "redirect sources")
    for source in redirect_sources:
        seen: set[str] = set()
        current = source
        while current in redirect_map:
            if current in seen:
                raise ContractError("redirect chain contains a loop")
            seen.add(current)
            current = redirect_map[current]
        if current not in live_paths:
            raise ContractError("redirect chain must terminate at a known live page")

    analytics = obj(root["analytics"], "analytics")
    exact(analytics, {"enabled", "consent_required", "privacy_page"}, "analytics")
    boolean(analytics["enabled"], "analytics.enabled")
    boolean(analytics["consent_required"], "analytics.consent_required")
    privacy_page = slug(analytics["privacy_page"], "analytics.privacy_page")
    if privacy_page not in known_pages:
        raise ContractError("analytics privacy_page must reference a known page")

    quality = obj(root["quality"], "quality")
    exact(quality, {"accessibility_target", "browsers", "viewports", "performance_budgets"}, "quality")
    string(quality["accessibility_target"], "quality.accessibility_target")
    browsers = [string(item, "browser") for item in array(quality["browsers"], "quality.browsers")]
    viewports = [string(item, "viewport") for item in array(quality["viewports"], "quality.viewports")]
    unique(browsers, "browsers")
    unique(viewports, "viewports")
    if len(viewports) < 2:
        raise ContractError("quality requires at least two viewport classes")
    budgets = obj(quality["performance_budgets"], "performance_budgets")
    exact(budgets, {"lcp_ms", "inp_ms", "cls"}, "performance_budgets")
    finite_number(budgets["lcp_ms"], "lcp_ms", allow_zero=False)
    finite_number(budgets["inp_ms"], "inp_ms", allow_zero=False)
    finite_number(budgets["cls"], "cls", allow_zero=True)

    verification_ids: list[str] = []
    for item in array(root["verification"], "verification"):
        check = obj(item, "verification item")
        exact(check, {"id", "claim", "evidence"}, "verification item")
        verification_ids.append(slug(check["id"], "verification.id"))
        non_placeholder_statement(check["claim"], "verification.claim")
        non_placeholder_statement(check["evidence"], "verification.evidence")
    unique(verification_ids, "verification ids")
    return {"schema_version": SCHEMA_VERSION, "status": "PASS", "kind": "website", "counts": {"pages": len(page_ids), "forms": len(form_ids), "redirects": len(redirect_sources), "verification": len(verification_ids)}}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check")
    check.add_argument("--manifest", required=True, type=Path)
    check.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        text = args.manifest.read_text(encoding="utf-8")
        payload = validate(json.loads(
            text,
            object_pairs_hook=unique_object,
            parse_constant=reject_non_finite,
        ))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, ContractError) as exc:
        message = str(exc) if isinstance(exc, ContractError) else "manifest could not be read as valid JSON"
        print(f"ERROR: {message}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Status: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
