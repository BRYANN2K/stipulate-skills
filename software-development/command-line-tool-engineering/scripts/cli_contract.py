#!/usr/bin/env python3
"""Validate and probe a command-line tool contract."""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import signal

# This helper intentionally probes a user-selected executable as an argv array.
import subprocess  # nosec B404
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
TOP_FIELDS = {"schema_version", "kind", "application", "commands", "output", "exit_codes", "configuration", "signals", "distribution", "probes"}
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
COMMAND_STDIN_RULES = {"none", "data", "secret"}
COMMAND_STDOUT_RULES = {"data", "data-or-human"}
COMMAND_STDERR_RULES = {"diagnostics", "diagnostics-and-progress"}

def reject_non_finite(_: str) -> Any:
    raise ContractError("manifest contains a non-finite JSON number")

def parse_finite_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ContractError("manifest contains a non-finite JSON number")
    return number

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

def slug(value: Any, label: str) -> str:
    cleaned = string(value, label)
    if not SLUG_RE.fullmatch(cleaned): raise ContractError(f"{label} must be lowercase kebab-case")
    return cleaned

def boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool): raise ContractError(f"{label} must be a boolean")
    return value

def strings(value: Any, label: str, *, nonempty: bool = True) -> list[str]:
    result = [string(item, label) for item in array(value, label, nonempty=nonempty)]
    if len(result) != len(set(result)): raise ContractError(f"{label} contains duplicates")
    return result

def scan_tree(value: Any) -> None:
    if isinstance(value, str): string(value, "manifest text")
    elif isinstance(value, list):
        for item in value: scan_tree(item)
    elif isinstance(value, dict):
        for item in value.values(): scan_tree(item)

def validate_stream_rule(rule: str, label: str) -> str:
    cleaned = string(rule, label)
    if cleaned in {"empty", "nonempty", "json", "ndjson"}:
        return cleaned
    if cleaned.startswith("contains:") and cleaned.split(":", 1)[1]:
        return cleaned
    if cleaned.startswith("equals:"):
        return cleaned
    raise ContractError(f"{label} contains an unsupported stream assertion")

def deferred_placeholder(value: str) -> bool:
    normalized = canonicalize_scan(value).casefold().rstrip(".")
    return (
        normalized in PLACEHOLDER_VALUES
        or DEFERRED_DIRECTIVE_RE.search(normalized) is not None
        or FUTURE_WORK_RE.search(normalized) is not None
    )

def validate(raw: Any) -> dict[str, Any]:
    root = obj(raw, "manifest"); exact(root, TOP_FIELDS, "manifest")
    if root["schema_version"] != SCHEMA_VERSION or root["kind"] != "command-line-tool": raise ContractError("manifest schema or kind is unsupported")
    scan_tree(root)
    application = obj(root["application"], "application"); exact(application, {"name", "summary", "version_flag", "help_flag"}, "application")
    slug(application["name"], "application.name"); string(application["summary"], "application.summary")
    for field in ("version_flag", "help_flag"):
        flag = string(application[field], f"application.{field}")
        if not flag.startswith("-"): raise ContractError(f"application.{field} must be a flag")

    command_paths: list[str] = []
    for item in array(root["commands"], "commands"):
        command = obj(item, "command"); exact(command, {"path", "summary", "interactive", "non_interactive", "mutating", "idempotent", "dry_run", "confirmation", "stdin", "stdout", "stderr"}, "command")
        command_paths.append(string(command["path"], "command.path")); string(command["summary"], "command.summary")
        interactive = boolean(command["interactive"], "command.interactive"); non_interactive = boolean(command["non_interactive"], "command.non_interactive")
        mutating = boolean(command["mutating"], "command.mutating"); boolean(command["idempotent"], "command.idempotent")
        dry_run = string(command["dry_run"], "command.dry_run"); confirmation = string(command["confirmation"], "command.confirmation")
        stdin = string(command["stdin"], "command.stdin")
        stdout = string(command["stdout"], "command.stdout")
        stderr = string(command["stderr"], "command.stderr")
        if stdin not in COMMAND_STDIN_RULES: raise ContractError("command.stdin contains an unsupported ownership rule")
        if stdout not in COMMAND_STDOUT_RULES: raise ContractError("command.stdout contains an unsupported ownership rule")
        if stderr not in COMMAND_STDERR_RULES: raise ContractError("command.stderr contains an unsupported ownership rule")
        if interactive and not non_interactive: raise ContractError("interactive commands require a non-interactive path")
        if mutating and deferred_placeholder(dry_run) and deferred_placeholder(confirmation): raise ContractError("mutating commands require dry-run or confirmation")
    if len(command_paths) != len(set(command_paths)): raise ContractError("command paths must be unique")

    output = obj(root["output"], "output"); exact(output, {"formats", "stdout_data_only", "stderr_diagnostics", "json_schema_stable", "no_color"}, "output")
    formats = set(strings(output["formats"], "output.formats"))
    if "human" not in formats or not ({"json", "ndjson"} & formats): raise ContractError("output requires human and machine-readable formats")
    for field in ("stdout_data_only", "stderr_diagnostics", "json_schema_stable"):
        if not boolean(output[field], f"output.{field}"): raise ContractError(f"output.{field} must be true")
    string(output["no_color"], "output.no_color")

    exit_codes: list[int] = []
    for item in array(root["exit_codes"], "exit_codes"):
        exit_code = obj(item, "exit code"); exact(exit_code, {"code", "meaning", "retryable"}, "exit code")
        code = exit_code["code"]
        if isinstance(code, bool) or not isinstance(code, int) or not 0 <= code <= 255: raise ContractError("exit code must be an integer from 0 to 255")
        meaning = string(exit_code["meaning"], "exit_code.meaning")
        retryable = boolean(exit_code["retryable"], "exit_code.retryable")
        if code == 0 and (meaning != "success" or retryable): raise ContractError("exit code 0 must mean success and must not be retryable")
        if code == 2 and (meaning != "usage-error" or retryable): raise ContractError("exit code 2 must mean usage-error and must not be retryable")
        exit_codes.append(code)
    if len(exit_codes) != len(set(exit_codes)): raise ContractError("exit codes must be unique")
    if 0 not in exit_codes or 2 not in exit_codes: raise ContractError("exit codes must define success 0 and usage error 2")

    config = obj(root["configuration"], "configuration"); exact(config, {"precedence", "locations", "unknown_keys"}, "configuration")
    precedence = strings(config["precedence"], "configuration.precedence")
    if precedence[0] != "flags" or precedence[-1] != "defaults": raise ContractError("configuration precedence must start with flags and end with defaults")
    strings(config["locations"], "configuration.locations"); string(config["unknown_keys"], "configuration.unknown_keys")

    signals = obj(root["signals"], "signals"); exact(signals, {"sigint", "sigterm", "broken_pipe"}, "signals")
    for field in ("sigint", "sigterm", "broken_pipe"): string(signals[field], f"signals.{field}")

    distribution = obj(root["distribution"], "distribution"); exact(distribution, {"targets", "completions", "reproducible_build"}, "distribution")
    strings(distribution["targets"], "distribution.targets"); strings(distribution["completions"], "distribution.completions", nonempty=False); string(distribution["reproducible_build"], "distribution.reproducible_build")

    probe_ids: list[str] = []
    for item in array(root["probes"], "probes"):
        probe = obj(item, "probe"); exact(probe, {"id", "args", "expected_exit", "stdout", "stderr"}, "probe")
        probe_ids.append(slug(probe["id"], "probe.id")); strings(probe["args"], "probe.args", nonempty=False)
        expected_exit = probe["expected_exit"]
        if isinstance(expected_exit, bool) or not isinstance(expected_exit, int): raise ContractError("probe.expected_exit must be an integer")
        if expected_exit not in exit_codes: raise ContractError("probe.expected_exit must reference a declared exit code")
        for field in ("stdout", "stderr"): validate_stream_rule(probe[field], f"probe.{field}")
    if len(probe_ids) != len(set(probe_ids)): raise ContractError("probe ids must be unique")
    return root


def load(path: Path) -> dict[str, Any]:
    try: return validate(json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=reject_non_finite,
        parse_float=parse_finite_float,
    ))
    except (OSError, UnicodeDecodeError) as exc: raise ContractError("manifest could not be read") from exc
    except (json.JSONDecodeError, ValueError) as exc: raise ContractError("manifest is not valid JSON") from exc


def assert_stream(rule: str, value: str) -> tuple[bool, str]:
    if rule == "empty": return (value == "", "expected empty stream")
    if rule == "nonempty": return (bool(value), "expected non-empty stream")
    if rule == "json":
        try:
            json.loads(
                value,
                object_pairs_hook=unique_object,
                parse_constant=reject_non_finite,
                parse_float=parse_finite_float,
            )
        except (json.JSONDecodeError, ValueError, ContractError):
            return False, "expected strict JSON"
        return True, "strict JSON"
    if rule == "ndjson":
        try:
            body = value[:-2] if value.endswith("\r\n") else value.removesuffix("\n")
            lines = body.split("\n")
            if not lines or any(not line for line in lines):
                return False, "expected contiguous NDJSON records"
            for line in lines:
                json.loads(
                    line,
                    object_pairs_hook=unique_object,
                    parse_constant=reject_non_finite,
                    parse_float=parse_finite_float,
                )
        except (json.JSONDecodeError, ValueError, ContractError):
            return False, "expected strict NDJSON"
        return True, "strict NDJSON"
    if rule.startswith("contains:"):
        needle = rule.split(":", 1)[1]
        return (needle in value, "expected stream to contain required text")
    if rule.startswith("equals:"):
        expected = rule.split(":", 1)[1]
        return (value.rstrip("\n") == expected, "expected exact stream text")
    return False, "unsupported stream assertion"


def windows_job_for(process: subprocess.Popen[bytes]) -> int | None:
    if os.name != "nt":
        return None
    import ctypes
    from ctypes import wintypes

    class IoCounters(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_ulonglong),
            ("WriteOperationCount", ctypes.c_ulonglong),
            ("OtherOperationCount", ctypes.c_ulonglong),
            ("ReadTransferCount", ctypes.c_ulonglong),
            ("WriteTransferCount", ctypes.c_ulonglong),
            ("OtherTransferCount", ctypes.c_ulonglong),
        ]

    class BasicLimitInformation(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_longlong),
            ("PerJobUserTimeLimit", ctypes.c_longlong),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class ExtendedLimitInformation(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", BasicLimitInformation),
            ("IoInfo", IoCounters),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined]
    kernel32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel32.SetInformationJobObject.restype = wintypes.BOOL
    kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel32.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        raise OSError(ctypes.get_last_error(), "could not create probe job")
    information = ExtendedLimitInformation()
    information.BasicLimitInformation.LimitFlags = 0x00002000
    if not kernel32.SetInformationJobObject(job, 9, ctypes.byref(information), ctypes.sizeof(information)):
        kernel32.CloseHandle(job)
        raise OSError(ctypes.get_last_error(), "could not configure probe job")
    if not kernel32.AssignProcessToJobObject(job, process._handle):  # type: ignore[attr-defined]
        kernel32.CloseHandle(job)
        raise OSError(ctypes.get_last_error(), "could not contain probe process")
    return int(job)


def close_windows_job(job: int | None, *, terminate: bool) -> None:
    if job is None:
        return
    import ctypes

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined]
    kernel32.TerminateJobObject.argtypes = [ctypes.c_void_p, ctypes.c_uint]
    kernel32.TerminateJobObject.restype = ctypes.c_int
    kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
    kernel32.CloseHandle.restype = ctypes.c_int
    if terminate:
        kernel32.TerminateJobObject(job, 1)
    kernel32.CloseHandle(job)


def run_probe(argv: list[str], timeout: float) -> subprocess.CompletedProcess[bytes]:
    process = subprocess.Popen(  # nosec B603
        argv,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        start_new_session=os.name == "posix",
    )
    job: int | None = None
    try:
        job = windows_job_for(process)
        stdout, stderr = process.communicate(timeout=timeout)
        return subprocess.CompletedProcess(argv, process.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        if os.name == "posix":
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        elif job is not None:
            close_windows_job(job, terminate=True)
            job = None
        else:
            process.kill()
        process.communicate()
        raise
    except OSError:
        if process.poll() is None:
            process.kill()
            process.communicate()
        raise
    finally:
        close_windows_job(job, terminate=False)


def probe(manifest: dict[str, Any], command: list[str], timeout: float) -> tuple[dict[str, Any], int]:
    if not command: raise ContractError("probe requires a command after --")
    if not math.isfinite(timeout) or timeout <= 0 or timeout > 300: raise ContractError("timeout must be finite, greater than 0, and at most 300 seconds")
    results: list[dict[str, Any]] = []
    overall = "PASS"
    for item in manifest["probes"]:
        argv = [*command, *item["args"]]
        failures: list[str] = []
        try:
            # The command is explicit tool input and never passes through a shell.
            completed = run_probe(argv, timeout)
            if completed.returncode != item["expected_exit"]:
                failures.append(f"expected exit {item['expected_exit']}, got {completed.returncode}")
            for stream, rule, raw in (
                ("stdout", item["stdout"], completed.stdout),
                ("stderr", item["stderr"], completed.stderr),
            ):
                try:
                    value = raw.decode("utf-8", errors="strict")
                except UnicodeDecodeError:
                    failures.append(f"{stream}: expected valid UTF-8")
                    continue
                stream_ok, stream_summary = assert_stream(rule, value)
                if not stream_ok:
                    failures.append(f"{stream}: {stream_summary}")
            observed_exit: int | str = completed.returncode
        except subprocess.TimeoutExpired:
            failures.append("command exceeded timeout")
            observed_exit = "timeout"
        except OSError:
            failures.append("command could not be executed")
            observed_exit = "unavailable"
        status = "FAIL" if failures else "PASS"
        if failures: overall = "FAIL"
        results.append({"id": item["id"], "status": status, "expected_exit": item["expected_exit"], "observed_exit": observed_exit, "failures": failures})
    payload = {"schema_version": SCHEMA_VERSION, "status": overall, "kind": "command-line-tool", "probes": results}
    return payload, 0 if overall == "PASS" else 1


def emit(payload: dict[str, Any], as_json: bool) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True) if as_json else f"Status: {payload['status']}")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__); sub = root.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check"); check.add_argument("--manifest", required=True, type=Path); check.add_argument("--json", action="store_true")
    run = sub.add_parser("probe"); run.add_argument("--manifest", required=True, type=Path); run.add_argument("--timeout", type=float, default=10.0); run.add_argument("--json", action="store_true"); run.add_argument("executable", nargs=argparse.REMAINDER)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        manifest = load(args.manifest)
        if args.command == "check":
            payload = {"schema_version": SCHEMA_VERSION, "status": "PASS", "kind": "command-line-tool", "counts": {"commands": len(manifest["commands"]), "exit_codes": len(manifest["exit_codes"]), "probes": len(manifest["probes"])}}
            emit(payload, args.json); return 0
        executable = list(args.executable)
        if executable and executable[0] == "--": executable = executable[1:]
        payload, status = probe(manifest, executable, args.timeout); emit(payload, args.json); return status
    except ContractError as exc:
        print(f"ERROR: {exc}", file=sys.stderr); return 2

if __name__ == "__main__": sys.exit(main())
