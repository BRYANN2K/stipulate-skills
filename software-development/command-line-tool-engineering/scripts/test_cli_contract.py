#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).with_name("cli_contract.py")


class CliContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.manifest = self.root / "contract.json"
        self.write()
        self.fake = self.root / "fake_cli.py"
        self.fake.write_text(
            textwrap.dedent(
                """\
                import json
                import sys
                if '--help' in sys.argv:
                    print('usage: orbit [--json]')
                    raise SystemExit(0)
                if '--version' in sys.argv:
                    print('orbit 1.0.0')
                    raise SystemExit(0)
                if '--json' in sys.argv:
                    print(json.dumps({'status': 'ok'}))
                    raise SystemExit(0)
                print('human output')
                """
            ),
            encoding="utf-8",
        )

    def data(self, **overrides: Any) -> dict[str, Any]:
        value = {
            "schema_version": "1.0",
            "kind": "command-line-tool",
            "application": {
                "name": "orbit",
                "summary": "Operate deployments",
                "version_flag": "--version",
                "help_flag": "--help",
            },
            "commands": [
                {
                    "path": "orbit list",
                    "summary": "List deployments",
                    "interactive": False,
                    "non_interactive": True,
                    "mutating": False,
                    "idempotent": True,
                    "dry_run": "not-applicable",
                    "confirmation": "none",
                    "stdin": "none",
                    "stdout": "data-or-human",
                    "stderr": "diagnostics",
                },
                {
                    "path": "orbit restart",
                    "summary": "Restart a deployment",
                    "interactive": True,
                    "non_interactive": True,
                    "mutating": True,
                    "idempotent": False,
                    "dry_run": "--dry-run",
                    "confirmation": "prompt-or---yes",
                    "stdin": "none",
                    "stdout": "data",
                    "stderr": "diagnostics-and-progress",
                },
            ],
            "output": {
                "formats": ["human", "plain", "json", "ndjson"],
                "stdout_data_only": True,
                "stderr_diagnostics": True,
                "json_schema_stable": True,
                "no_color": "NO_COLOR and --no-color",
            },
            "exit_codes": [
                {"code": 0, "meaning": "success", "retryable": False},
                {"code": 2, "meaning": "usage-error", "retryable": False},
                {"code": 10, "meaning": "temporary remote failure", "retryable": True},
            ],
            "configuration": {
                "precedence": ["flags", "environment", "project-config", "user-config", "defaults"],
                "locations": ["XDG_CONFIG_HOME", "project config"],
                "unknown_keys": "error",
            },
            "signals": {
                "sigint": "cancel promptly, clean up, and return non-zero",
                "sigterm": "clean up and terminate",
                "broken_pipe": "exit quietly",
            },
            "distribution": {
                "targets": ["linux", "macos", "windows"],
                "completions": ["bash", "zsh", "fish", "powershell"],
                "reproducible_build": "documented build command",
            },
            "probes": [
                {"id": "help", "args": ["--help"], "expected_exit": 0, "stdout": "contains:usage", "stderr": "empty"},
                {"id": "version", "args": ["--version"], "expected_exit": 0, "stdout": "contains:1.0.0", "stderr": "empty"},
                {"id": "json", "args": ["--json"], "expected_exit": 0, "stdout": "json", "stderr": "empty"},
            ],
        }
        value.update(overrides)
        return value

    def write(self, **overrides: Any) -> None:
        self.manifest.write_text(json.dumps(self.data(**overrides), indent=2) + "\n")

    def run_cli(self, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *extra],
            text=True,
            capture_output=True,
            check=False,
        )

    def check(self) -> subprocess.CompletedProcess[str]:
        return self.run_cli("check", "--manifest", str(self.manifest), "--json")

    def test_reference_contract_passes_read_only(self) -> None:
        before = self.manifest.read_bytes()
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "PASS")
        self.assertEqual(before, self.manifest.read_bytes())

    def test_command_paths_are_unique_and_stream_contract_is_enforced(self) -> None:
        commands = self.data()["commands"]
        self.write(commands=commands + [dict(commands[0])])
        self.assertNotEqual(self.check().returncode, 0)
        commands = self.data()["commands"]
        commands[0]["stderr"] = "data"
        self.write(commands=commands)
        self.assertNotEqual(self.check().returncode, 0)

    def test_command_stream_ownership_is_structured_and_excludes_diagnostics_from_stdout(self) -> None:
        for stdout in ("diagnostics and progress", "debug logs"):
            with self.subTest(stdout=stdout):
                commands = self.data()["commands"]
                commands[0]["stdout"] = stdout
                self.write(commands=commands)
                self.assertEqual(self.check().returncode, 2)

    def test_mutating_interactive_command_needs_noninteractive_and_safety_path(self) -> None:
        commands = self.data()["commands"]
        commands[1]["non_interactive"] = False
        self.write(commands=commands)
        self.assertNotEqual(self.check().returncode, 0)
        commands = self.data()["commands"]
        commands[1]["dry_run"] = ""
        commands[1]["confirmation"] = "none"
        self.write(commands=commands)
        self.assertNotEqual(self.check().returncode, 0)
        commands = self.data()["commands"]
        commands[1]["dry_run"] = "n/a"
        commands[1]["confirmation"] = "not applicable"
        self.write(commands=commands)
        self.assertNotEqual(self.check().returncode, 0)

    def test_mutating_command_rejects_deferred_safety_placeholders(self) -> None:
        for placeholder in (
            "eventually", "unspecified", "tbd", "later", "todo", "pending",
            "defer", "deferred", "unknown", "placeholder", "to be determined",
        ):
            with self.subTest(placeholder=placeholder):
                commands = self.data()["commands"]
                commands[1]["dry_run"] = placeholder
                commands[1]["confirmation"] = placeholder
                self.write(commands=commands)
                self.assertEqual(self.check().returncode, 2)

    def test_mutating_command_rejects_composite_deferrals_but_allows_substantive_safety(self) -> None:
        for dry_run, confirmation in (
            ("TODO: add preview later", "TBD after implementation"),
            ("TODO implement preview", "Deferred: add confirmation"),
            ("Note: TODO define preview", "%54ODO: define confirmation"),
            ("TODO_preview: define later", "TODO123: define later"),
            ("T%4FDO_preview: define later", "T%4FDO123: define later"),
            ("Placeholder implementation note", "later"),
            ("Preview will be implemented later", "Confirmation is not yet defined"),
            ("Future work: define preview", "Define confirmation after implementation"),
            ("Plan: define preview in a later phase", "Confirmation definition is postponed until implementation is complete"),
            ("We intend to specify preview eventually", "Confirmation behavior remains to be decided"),
        ):
            with self.subTest(dry_run=dry_run, confirmation=confirmation):
                commands = self.data()["commands"]
                commands[1]["dry_run"] = dry_run
                commands[1]["confirmation"] = confirmation
                self.write(commands=commands)
                self.assertEqual(self.check().returncode, 2)

        commands = self.data()["commands"]
        commands[1]["dry_run"] = "Pending resources are listed with exact effects and no mutation."
        commands[1]["confirmation"] = "later"
        self.write(commands=commands)
        self.assertEqual(self.check().returncode, 0)

    def test_mutating_command_rejects_subject_specific_future_promises(self) -> None:
        for dry_run, confirmation in (
            ("Preview remains to be decided.", "Confirmation remains to be decided."),
            ("The team intends to define preview eventually.", "The team intends to define confirmation eventually."),
            ("We plan to define preview in a later phase.", "We plan to define confirmation in a later phase."),
        ):
            with self.subTest(dry_run=dry_run, confirmation=confirmation):
                commands = self.data()["commands"]
                commands[1]["dry_run"] = dry_run
                commands[1]["confirmation"] = confirmation
                self.write(commands=commands)
                self.assertEqual(self.check().returncode, 2)

    def test_mutating_command_rejects_interposed_future_promises(self) -> None:
        negatives = (
            "We plan, after review, to define this behavior in a later phase.",
            "The team plans on defining this behavior in a later phase.",
            "Our plan is to define this behavior in a later phase.",
            "The team intends, after review, to specify this behavior eventually.",
            "This behavior remains, for now, to be decided.",
        )
        for value in negatives:
            with self.subTest(value=value):
                commands = self.data()["commands"]
                commands[1]["dry_run"] = value
                commands[1]["confirmation"] = value
                self.write(commands=commands)
                self.assertEqual(self.check().returncode, 2)

        commands = self.data()["commands"]
        commands[1]["dry_run"] = "List exact targets and effects without mutation."
        commands[1]["confirmation"] = "Require the operator to confirm the exact targets and effects."
        self.write(commands=commands)
        self.assertEqual(self.check().returncode, 0)

    def test_lowercase_and_separated_credential_assignments_fail_without_echo(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (
            f"clientsecretprod={marker}",
            f"config.api.key={marker}",
            f"api key={marker}",
        ):
            with self.subTest(identifier=value.split("=", 1)[0]):
                application = self.data()["application"]
                application["summary"] = value
                self.write(application=application)
                result = self.check()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn(marker, result.stdout + result.stderr)

        application = self.data()["application"]
        application["summary"] = "Document config.api.key and clientsecretprod rotation without assigning values."
        self.write(application=application)
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_machine_formats_and_standard_exit_codes_are_required(self) -> None:
        output = self.data()["output"]
        output["formats"] = ["human"]
        self.write(output=output)
        self.assertNotEqual(self.check().returncode, 0)
        self.write(exit_codes=[{"code": 0, "meaning": "success", "retryable": False}])
        self.assertNotEqual(self.check().returncode, 0)

    def test_exit_zero_requires_success_and_is_not_retryable(self) -> None:
        for field, value in (("meaning", "failure"), ("retryable", True)):
            with self.subTest(field=field):
                exit_codes = self.data()["exit_codes"]
                success = next(item for item in exit_codes if item["code"] == 0)
                success[field] = value
                self.write(exit_codes=exit_codes)
                self.assertEqual(self.check().returncode, 2)

    def test_exit_two_requires_usage_error_and_is_not_retryable(self) -> None:
        for field, value in (("meaning", "success"), ("retryable", True)):
            with self.subTest(field=field):
                exit_codes = self.data()["exit_codes"]
                usage = next(item for item in exit_codes if item["code"] == 2)
                usage[field] = value
                self.write(exit_codes=exit_codes)
                self.assertEqual(self.check().returncode, 2)

    def test_probe_rules_and_expected_exit_codes_are_validated_by_check(self) -> None:
        probes = self.data()["probes"]
        probes[0]["stdout"] = "regex:.*"
        self.write(probes=probes)
        self.assertNotEqual(self.check().returncode, 0)
        probes = self.data()["probes"]
        probes[0]["expected_exit"] = 7
        self.write(probes=probes)
        self.assertNotEqual(self.check().returncode, 0)

    def test_configuration_precedence_requires_flags_and_defaults(self) -> None:
        config = self.data()["configuration"]
        config["precedence"] = ["environment"]
        self.write(configuration=config)
        self.assertNotEqual(self.check().returncode, 0)

    def test_duplicate_keys_and_credentials_fail_without_echo(self) -> None:
        self.manifest.write_text('{"schema_version":"1.0","schema_version":"2.0"}')
        self.assertNotEqual(self.check().returncode, 0)
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        app = self.data()["application"]
        app["summary"] = f"token={marker}"
        self.write(application=app)
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_invalid_utf8_manifest_is_rejected_without_traceback(self) -> None:
        self.manifest.write_bytes(b'{"application":"\xff"}')
        result = self.check()
        self.assertEqual(result.returncode, 2)
        self.assertIn("manifest could not be read", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_huge_integer_manifest_is_rejected_without_traceback(self) -> None:
        self.manifest.write_text('{"schema_version":' + "9" * 5000 + '}', encoding="utf-8")
        result = self.check()
        self.assertEqual(result.returncode, 2)
        self.assertIn("not valid JSON", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_encoded_and_uri_credentials_fail_without_echo(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (f"clientSecr\\u0065t={marker}", f"accessKey={marker}", f"privateKey={marker}", f"passphrase={marker}", f"source=https://{marker}@example.test/path", f'Authorization: ***"Bearer {marker}"'):
            with self.subTest(value=value.split("=", 1)[0]):
                app = self.data()["application"]
                app["summary"] = value
                self.write(application=app)
                result = self.check()
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn(marker, result.stdout + result.stderr)

        app = self.data()["application"]
        app["summary"] = "Document Bearer authorization without assigning a credential value."
        self.write(application=app)
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_repeated_quote_serialized_credentials_fail_without_echo(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (
            f"config={{'''apiKey''': '''{marker}'''}}",
            f'config={{"""apiKey""": """{marker}"""}}',
        ):
            with self.subTest(delimiter=value[8:11]):
                app = self.data()["application"]
                app["summary"] = value
                self.write(application=app)
                result = self.check()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn(marker, result.stdout + result.stderr)

        app = self.data()["application"]
        app["summary"] = "Document the triple-quoted apiKey example without assigning a value."
        self.write(application=app)
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_compact_uppercase_credential_identifier_fails_without_echo(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        values = (
            f"PROD_CLIENTSECRET={marker}", f"CLIENTSECRET_PROD={marker}",
            f"CLIENTSECRETV3={marker}", f"INTERNALAPIKEY_PROD={marker}",
            f"PROD%5FCLIENTSECRET={marker}", f"CLIENTSECRET%5FPROD={marker}",
            f"CLIENTSECRETV%33={marker}", f"INTERNALAPIKEY%5FPROD={marker}",
            f"CLIENTSECRETPROD={marker}", f"INTERNALAPIKEYPROD={marker}",
            f"CLIENTSECRETSTAGING={marker}", f"ACCESSKEYIDUAT={marker}",
            f"PASSWORDDEV={marker}", f"PRIVATEKEYLOCAL={marker}",
            f"CLIENTSECRETPR%4FD={marker}", f"INTERNALAPIKEYSTAG%49NG={marker}",
        )
        for value in values:
            with self.subTest(identifier=value.split("=", 1)[0]):
                app = self.data()["application"]
                app["summary"] = value
                self.write(application=app)
                result = self.check()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn(marker, result.stdout + result.stderr)

        app = self.data()["application"]
        app["summary"] = "CLIENTSECRET rotation policy"
        self.write(application=app)
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_probe_executes_argv_without_shell_and_checks_contract(self) -> None:
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(self.fake),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "PASS")
        self.assertEqual(len(payload["probes"]), 3)

    def test_probe_does_not_reflect_fixed_prefix_arguments(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(self.fake), f"--opaque={marker}",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_probe_reports_contract_failure_without_claiming_pass(self) -> None:
        self.write(probes=[{"id": "wrong", "args": ["--help"], "expected_exit": 10, "stdout": "empty", "stderr": "empty"}])
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(self.fake),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["status"], "FAIL")

    def test_probe_json_assertion_rejects_non_finite_and_duplicate_keys(self) -> None:
        for index, invalid in enumerate(('{"value":NaN}', '{"value":1,"value":2}')):
            with self.subTest(invalid=invalid):
                emitter = self.root / f"invalid-json-{index}.py"
                emitter.write_text(f"print({invalid!r})\n", encoding="utf-8")
                self.write(probes=[{"id": "strict-json", "args": [], "expected_exit": 0, "stdout": "json", "stderr": "empty"}])
                result = self.run_cli(
                    "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
                    "--", sys.executable, str(emitter),
                )
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "FAIL")
                self.assertNotIn(invalid, result.stdout + result.stderr)

    def test_probe_ndjson_assertion_rejects_non_finite_and_duplicate_keys(self) -> None:
        for index, invalid in enumerate(('{"value":1}\n{"value":NaN}', '{"value":1}\n{"value":1,"value":2}')):
            with self.subTest(invalid=invalid):
                emitter = self.root / f"invalid-ndjson-{index}.py"
                emitter.write_text(f"print({invalid!r})\n", encoding="utf-8")
                self.write(probes=[{"id": "strict-ndjson", "args": [], "expected_exit": 0, "stdout": "ndjson", "stderr": "empty"}])
                result = self.run_cli(
                    "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
                    "--", sys.executable, str(emitter),
                )
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "FAIL")
                self.assertNotIn(invalid, result.stdout + result.stderr)

    def test_probe_strict_json_formats_reject_huge_integers_without_traceback(self) -> None:
        huge = "9" * 5000
        for index, (format_name, payload) in enumerate((
            ("json", '{"value":' + huge + '}'),
            ("ndjson", '{"value":1}\n{"value":' + huge + '}'),
        )):
            with self.subTest(format=format_name):
                emitter = self.root / f"huge-integer-{index}.py"
                emitter.write_text(f"print({payload!r})\n", encoding="utf-8")
                self.write(probes=[{"id": "bounded-integer", "args": [], "expected_exit": 0, "stdout": format_name, "stderr": "empty"}])
                result = self.run_cli(
                    "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
                    "--", sys.executable, str(emitter),
                )
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertTrue(result.stdout, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "FAIL")
                self.assertNotIn("Traceback", result.stdout + result.stderr)
                self.assertNotIn(huge, result.stdout + result.stderr)

    def test_probe_strict_json_formats_reject_overflowing_exponents(self) -> None:
        cases = (
            ("json", '{"value":1e3}', True),
            ("ndjson", '{"value":1}\n{"value":1e3}', True),
            ("json", '{"value":1e100000}', False),
            ("ndjson", '{"value":1}\n{"value":1e100000}', False),
        )
        for index, (format_name, payload, expected_pass) in enumerate(cases):
            with self.subTest(format=format_name, expected_pass=expected_pass):
                emitter = self.root / f"exponent-{index}.py"
                emitter.write_text(f"print({payload!r})\n", encoding="utf-8")
                self.write(probes=[{"id": "finite-number", "args": [], "expected_exit": 0, "stdout": format_name, "stderr": "empty"}])
                result = self.run_cli(
                    "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
                    "--", sys.executable, str(emitter),
                )
                self.assertTrue(result.stdout, result.stderr)
                report = json.loads(result.stdout)
                if expected_pass:
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(report["status"], "PASS")
                else:
                    self.assertEqual(result.returncode, 1, result.stderr)
                    self.assertEqual(report["status"], "FAIL")
                    self.assertNotIn(payload, result.stdout + result.stderr)
                self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_manifest_rejects_overflowing_exponent_without_traceback(self) -> None:
        encoded = json.dumps(self.data(), indent=2).replace(
            '"schema_version": "1.0"', '"schema_version": 1e100000', 1,
        )
        self.manifest.write_text(encoded + "\n", encoding="utf-8")

        result = self.run_cli("check", "--manifest", str(self.manifest), "--json")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertIn("non-finite JSON number", result.stderr)
        self.assertNotIn("1e100000", result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_probe_ndjson_assertion_rejects_interior_blank_records(self) -> None:
        emitter = self.root / "blank-ndjson.py"
        emitter.write_text("print('{\"first\":1}\\n\\n{\"second\":2}')\n", encoding="utf-8")
        self.write(probes=[{"id": "strict-ndjson", "args": [], "expected_exit": 0, "stdout": "ndjson", "stderr": "empty"}])

        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(emitter),
        )

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "FAIL")

    def test_probe_ndjson_assertion_rejects_trailing_blank_record(self) -> None:
        emitter = self.root / "trailing-blank-ndjson.py"
        emitter.write_text("import sys; sys.stdout.write('{\"value\":1}\\n\\n')\n", encoding="utf-8")
        self.write(probes=[{"id": "strict-ndjson", "args": [], "expected_exit": 0, "stdout": "ndjson", "stderr": "empty"}])

        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(emitter),
        )

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "FAIL")

    def test_probe_rejects_invalid_utf8_streams_without_traceback(self) -> None:
        for stream in ("stdout", "stderr"):
            with self.subTest(stream=stream):
                emitter = self.root / f"invalid-{stream}.py"
                emitter.write_text(
                    f"import sys; sys.{stream}.buffer.write(b'\\xff')\n",
                    encoding="utf-8",
                )
                self.write(probes=[{"id": "invalid-utf8", "args": [], "expected_exit": 0, "stdout": "empty", "stderr": "empty"}])
                result = self.run_cli(
                    "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
                    "--", sys.executable, str(emitter),
                )
                self.assertEqual(result.returncode, 1, result.stderr)
                payload = json.loads(result.stdout)
                self.assertEqual(payload["status"], "FAIL")
                self.assertIn(f"{stream}: expected valid UTF-8", payload["probes"][0]["failures"])
                self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_probe_failure_does_not_reflect_expected_stream_values(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        self.write(probes=[{"id": "redacted", "args": ["--help"], "expected_exit": 0, "stdout": f"contains:{marker}", "stderr": "empty"}])
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "2", "--json",
            "--", sys.executable, str(self.fake),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_probe_timeout_is_bounded(self) -> None:
        sleeper = self.root / "sleep.py"
        sleeper.write_text("import time; time.sleep(5)\n")
        self.write(probes=[{"id": "timeout", "args": [], "expected_exit": 0, "stdout": "empty", "stderr": "empty"}])
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "0.05", "--json",
            "--", sys.executable, str(sleeper),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["status"], "FAIL")

    @unittest.skipUnless(os.name == "posix", "POSIX process-group regression")
    def test_probe_timeout_terminates_descendant_processes(self) -> None:
        pid_file = self.root / "descendant.pid"
        descendant = self.root / "descendant.py"
        descendant.write_text(
            "import os, sys, time\n"
            "open(sys.argv[1], 'w', encoding='utf-8').write(str(os.getpid()))\n"
            "time.sleep(60)\n",
            encoding="utf-8",
        )
        launcher = self.root / "launcher.py"
        launcher.write_text(
            "import subprocess, sys, time\n"
            "subprocess.Popen([sys.executable, sys.argv[1], sys.argv[2]], "
            "stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)\n"
            "time.sleep(60)\n",
            encoding="utf-8",
        )
        self.write(probes=[{"id": "tree-timeout", "args": [], "expected_exit": 0, "stdout": "empty", "stderr": "empty"}])
        descendant_pid: int | None = None
        try:
            result = self.run_cli(
                "probe", "--manifest", str(self.manifest), "--timeout", "1", "--json",
                "--", sys.executable, str(launcher), str(descendant), str(pid_file),
            )
            for _ in range(50):
                if pid_file.exists():
                    descendant_pid = int(pid_file.read_text(encoding="utf-8"))
                    break
                time.sleep(0.02)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIsNotNone(descendant_pid)
            for _ in range(50):
                try:
                    os.kill(descendant_pid, 0)  # type: ignore[arg-type]
                except ProcessLookupError:
                    break
                time.sleep(0.02)
            else:
                self.fail("descendant process still existed after probe timeout")
        finally:
            if descendant_pid is not None:
                try:
                    os.kill(descendant_pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass

    def test_probe_timeout_rejects_non_finite_values_without_traceback(self) -> None:
        result = self.run_cli(
            "probe", "--manifest", str(self.manifest), "--timeout", "nan", "--json",
            "--", sys.executable, str(self.fake),
        )
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
