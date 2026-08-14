#!/usr/bin/env python3
"""Black-box tests for the infrastructure project bootstrap helper."""

from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).with_name("bootstrap_project.py")


class BootstrapProjectTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.workspace = Path(self.temporary.name)
        self.manifest = self.workspace / "manifest.json"
        self.root = self.workspace / "project"
        self.write_manifest()

    def manifest_data(self, **overrides: Any) -> dict[str, Any]:
        data: dict[str, Any] = {
            "schema_version": "1.0",
            "project": {
                "name": "edge-platform",
                "summary": "Infrastructure for the edge platform.",
            },
            "profile": "minimal",
            "stacks": ["opentofu", "kubernetes"],
            "environments": ["dev", "prod"],
            "deployment_targets": ["cloud", "edge"],
            "documentation": ["architecture"],
            "spec_workflow": "none",
            "validation": [
                {"id": "format", "command": "tofu fmt -check -recursive"},
                {"id": "validate", "command": "tofu validate"},
            ],
            "constraints": ["No public control-plane endpoints."],
            "open_decisions": [],
        }
        data.update(overrides)
        return data

    def write_manifest(self, **overrides: Any) -> dict[str, Any]:
        data = self.manifest_data(**overrides)
        self.manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        return data

    def run_cli(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *arguments],
            cwd=self.workspace,
            text=True,
            capture_output=True,
            check=False,
        )

    def plan(self, mode: str = "init") -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        result = self.run_cli(
            "plan",
            "--manifest",
            str(self.manifest),
            "--root",
            str(self.root),
            "--mode",
            mode,
            "--json",
        )
        payload = json.loads(result.stdout) if result.stdout else {}
        return result, payload

    def apply(self, digest: str, mode: str = "init") -> subprocess.CompletedProcess[str]:
        return self.run_cli(
            "apply",
            "--manifest",
            str(self.manifest),
            "--root",
            str(self.root),
            "--mode",
            mode,
            "--plan-digest",
            digest,
            "--json",
        )

    def bootstrap(self, mode: str = "init") -> dict[str, Any]:
        plan_result, plan = self.plan(mode)
        self.assertEqual(plan_result.returncode, 0, plan_result.stderr)
        apply_result = self.apply(plan["plan_digest"], mode)
        self.assertEqual(apply_result.returncode, 0, apply_result.stderr)
        return json.loads(apply_result.stdout)

    def test_plan_for_new_project_is_read_only_and_has_digest(self) -> None:
        result, payload = self.plan()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertRegex(payload["plan_digest"], r"^sha256:[0-9a-f]{64}$")
        self.assertFalse(self.root.exists())
        paths = {action["path"] for action in payload["actions"]}
        self.assertIn("infrastructure-project.json", paths)
        self.assertIn("PROJECT.md", paths)
        self.assertIn("AGENTS.md", paths)
        self.assertIn("infra/opentofu/.gitkeep", paths)
        self.assertIn("infra/kubernetes/.gitkeep", paths)

    def test_apply_requires_the_exact_reviewed_digest(self) -> None:
        result = self.apply("sha256:" + "0" * 64)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plan digest does not match", result.stderr)
        self.assertFalse(self.root.exists())

    def test_apply_creates_portable_project_without_running_git_or_tools(self) -> None:
        payload = self.bootstrap()

        self.assertEqual(payload["status"], "APPLIED")
        self.assertTrue((self.root / "PROJECT.md").is_file())
        self.assertTrue((self.root / "AGENTS.md").is_file())
        self.assertTrue((self.root / "docs" / "architecture" / "README.md").is_file())
        self.assertTrue((self.root / "infra" / "opentofu" / ".gitkeep").is_file())
        self.assertFalse((self.root / ".git").exists())
        self.assertFalse((self.root / "openspec").exists())
        agents = (self.root / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("tofu fmt -check -recursive", agents)
        self.assertIn("explicit authorization", agents)

    @unittest.skipIf(os.name == "nt", "POSIX file modes are unavailable")
    def test_apply_creates_regular_project_files_with_portable_permissions(self) -> None:
        self.bootstrap()

        mode = stat.S_IMODE((self.root / "PROJECT.md").stat().st_mode)
        self.assertEqual(mode, 0o644)

    def test_adopt_is_idempotent_after_apply(self) -> None:
        self.bootstrap()

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertTrue(payload["actions"])
        self.assertEqual({action["action"] for action in payload["actions"]}, {"unchanged"})
        apply_result = self.apply(payload["plan_digest"], "adopt")
        self.assertEqual(apply_result.returncode, 0, apply_result.stderr)
        applied = json.loads(apply_result.stdout)
        self.assertEqual(applied["created"], [])
        self.assertEqual(applied["updated"], [])

    def test_adopt_treats_generated_crlf_files_as_unchanged(self) -> None:
        self.bootstrap()
        project = self.root / "PROJECT.md"
        project.write_bytes(project.read_bytes().replace(b"\n", b"\r\n"))

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 0, result.stderr)
        project_action = next(
            action for action in payload["actions"] if action["path"] == "PROJECT.md"
        )
        self.assertEqual(project_action["action"], "unchanged")

    def test_init_rejects_a_nonempty_directory(self) -> None:
        self.root.mkdir()
        sentinel = self.root / "keep.txt"
        sentinel.write_text("preserve me\n", encoding="utf-8")

        result, payload = self.plan("init")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("root", payload["collisions"])
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve me\n")

    def test_init_blocks_a_root_beneath_a_regular_file_without_traceback(self) -> None:
        regular_file = self.workspace / "not-a-directory"
        regular_file.write_text("preserve me\n", encoding="utf-8")
        self.root = regular_file / "project"

        result, payload = self.plan("init")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("root", payload["collisions"])
        self.assertNotIn("Traceback", result.stderr)
        apply_result = self.apply(payload["plan_digest"], "init")
        self.assertNotEqual(apply_result.returncode, 0)
        self.assertIn("reviewed plan is blocked", apply_result.stderr)
        self.assertNotIn("Traceback", apply_result.stderr)
        self.assertEqual(regular_file.read_text(encoding="utf-8"), "preserve me\n")

    def test_adopt_rejects_an_absent_root(self) -> None:
        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("root", payload["collisions"])
        self.assertFalse(self.root.exists())

    def test_adopt_rejects_an_empty_root(self) -> None:
        self.root.mkdir()

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("root", payload["collisions"])

    def test_adopt_refuses_to_overwrite_a_conflicting_file(self) -> None:
        self.root.mkdir()
        project_file = self.root / "PROJECT.md"
        project_file.write_text("existing project context\n", encoding="utf-8")

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("PROJECT.md", payload["collisions"])
        self.assertEqual(project_file.read_text(encoding="utf-8"), "existing project context\n")

    def test_adopt_blocks_a_target_beneath_a_regular_file(self) -> None:
        self.root.mkdir()
        infra = self.root / "infra"
        infra.write_text("not a directory\n", encoding="utf-8")

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("infra/opentofu/.gitkeep", payload["collisions"])
        self.assertIn("infra/kubernetes/.gitkeep", payload["collisions"])
        self.assertEqual(infra.read_text(encoding="utf-8"), "not a directory\n")

    def test_adopt_appends_only_a_managed_gitignore_block(self) -> None:
        self.root.mkdir()
        gitignore = self.root / ".gitignore"
        gitignore.write_bytes(b"node_modules/\r\n")
        if os.name != "nt":
            gitignore.chmod(0o640)

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 0, result.stderr)
        action = next(item for item in payload["actions"] if item["path"] == ".gitignore")
        self.assertEqual(action["action"], "update")
        apply_result = self.apply(payload["plan_digest"], "adopt")
        self.assertEqual(apply_result.returncode, 0, apply_result.stderr)
        content = gitignore.read_bytes()
        self.assertTrue(content.startswith(b"node_modules/\r\n"))
        self.assertNotIn(b"node_modules/\n", content)
        decoded = content.decode("utf-8")
        self.assertEqual(decoded.count("infrastructure-project-bootstrap:begin"), 1)
        self.assertIn("*.tfstate", decoded)
        if os.name != "nt":
            self.assertEqual(stat.S_IMODE(gitignore.stat().st_mode), 0o640)

    def test_adopt_blocks_reversed_gitignore_markers_without_traceback(self) -> None:
        self.root.mkdir()
        gitignore = self.root / ".gitignore"
        gitignore.write_text(
            "# infrastructure-project-bootstrap:end\n"
            "user content\n"
            "# infrastructure-project-bootstrap:begin\n",
            encoding="utf-8",
        )

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn(".gitignore", payload["collisions"])
        self.assertNotIn("Traceback", result.stderr)
        observation = next(
            item for item in payload["observations"] if item["path"] == ".gitignore"
        )
        self.assertEqual(observation["state"], "collision")
        self.assertRegex(observation["current_digest"], r"^sha256:[0-9a-f]{64}$")
        self.assertEqual(
            observation["desired_digest"], "unavailable:ambiguous-managed-block"
        )

    def test_adopt_blocks_inline_gitignore_marker_text(self) -> None:
        self.root.mkdir()
        gitignore = self.root / ".gitignore"
        original = (
            "keep this # infrastructure-project-bootstrap:begin\n"
            "and this # infrastructure-project-bootstrap:end\n"
        )
        gitignore.write_text(original, encoding="utf-8")

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn(".gitignore", payload["collisions"])
        self.assertEqual(gitignore.read_text(encoding="utf-8"), original)

    def test_doctor_rejects_inline_gitignore_marker_text(self) -> None:
        self.bootstrap()
        gitignore = self.root / ".gitignore"
        gitignore.write_text(
            gitignore.read_text(encoding="utf-8").replace(
                "# infrastructure-project-bootstrap:begin",
                "prefix # infrastructure-project-bootstrap:begin",
                1,
            ),
            encoding="utf-8",
        )

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["gitignore-safety"]["status"], "FAIL")

    def test_doctor_rejects_later_gitignore_negations_of_managed_rules(self) -> None:
        self.bootstrap()
        gitignore = self.root / ".gitignore"
        with gitignore.open("a", encoding="utf-8") as stream:
            stream.write("!*.tfstate\n!.env\n!production.pem\n")

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["gitignore-safety"]["status"], "FAIL")

    def test_doctor_rejects_negations_in_nested_gitignore_files(self) -> None:
        self.bootstrap()
        nested_gitignore = self.root / "infra" / "opentofu" / ".gitignore"
        nested_gitignore.write_text("!leak.tfstate\n", encoding="utf-8")

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["gitignore-safety"]["status"], "FAIL")

    @unittest.skipUnless(shutil.which("git"), "git is unavailable")
    def test_doctor_rejects_bom_prefixed_nested_gitignore_negation(self) -> None:
        self.bootstrap()
        nested_directory = self.root / "infra" / "opentofu"
        nested_gitignore = nested_directory / ".gitignore"
        nested_gitignore.write_text("\ufeff!leak.tfstate\n", encoding="utf-8")
        leak = nested_directory / "leak.tfstate"
        leak.write_text("not real state\n", encoding="utf-8")
        subprocess.run(
            ["git", "-C", str(self.root), "init", "--quiet"],
            text=True,
            capture_output=True,
            check=True,
        )
        git_check = subprocess.run(
            ["git", "-C", str(self.root), "check-ignore", "--quiet", str(leak)],
            text=True,
            capture_output=True,
            check=False,
        )

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertEqual(git_check.returncode, 1)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["gitignore-safety"]["status"], "FAIL")

    def test_doctor_rejects_bom_prefixed_later_root_negation(self) -> None:
        self.bootstrap()
        gitignore = self.root / ".gitignore"
        with gitignore.open("a", encoding="utf-8") as stream:
            stream.write("\ufeff!*.tfstate\n")

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["gitignore-safety"]["status"], "FAIL")

    def test_filesystem_change_invalidates_a_reviewed_plan(self) -> None:
        self.root.mkdir()
        (self.root / "existing-repository-file.txt").write_text(
            "existing repository\n", encoding="utf-8"
        )
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.root / "PROJECT.md").write_text("appeared after review\n", encoding="utf-8")

        apply_result = self.apply(payload["plan_digest"], "adopt")

        self.assertNotEqual(apply_result.returncode, 0)
        self.assertIn("plan digest does not match", apply_result.stderr)
        self.assertEqual(
            (self.root / "PROJECT.md").read_text(encoding="utf-8"),
            "appeared after review\n",
        )

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_retargeted_root_ancestor_invalidates_a_reviewed_plan(self) -> None:
        first = self.workspace / "first"
        second = self.workspace / "second"
        first.mkdir()
        second.mkdir()
        link = self.workspace / "root-link"
        os.symlink(first, link, target_is_directory=True)
        self.root = link / "project"

        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)

        link.unlink()
        os.symlink(second, link, target_is_directory=True)
        apply_result = self.apply(payload["plan_digest"])

        self.assertNotEqual(apply_result.returncode, 0)
        self.assertIn("plan digest does not match", apply_result.stderr)
        self.assertFalse((first / "project").exists())
        self.assertFalse((second / "project").exists())

    def test_doctor_passes_without_executing_validation_commands(self) -> None:
        self.write_manifest(
            validation=[
                {
                    "id": "must-not-run",
                    "command": f"touch {self.workspace / 'executed-by-mistake'}",
                }
            ]
        )
        self.bootstrap()

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "PASS")
        self.assertFalse((self.workspace / "executed-by-mistake").exists())
        agents = (self.root / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("untrusted text", agents)
        self.assertIn("not authorization", agents)

    def test_validation_command_backticks_stay_in_an_indented_code_block(self) -> None:
        command = "printf '`not-an-agent-instruction`'"
        self.write_manifest(validation=[{"id": "render-safely", "command": command}])
        self.bootstrap()

        agents = (self.root / "AGENTS.md").read_text(encoding="utf-8")

        self.assertIn("- `render-safely`\n\n      " + command, agents)
        self.assertNotIn(f"`{command}`", agents)

    def test_doctor_warns_about_open_decisions(self) -> None:
        self.write_manifest(open_decisions=["Choose the remote state backend."])
        self.bootstrap()

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "WARN")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["open-decisions"]["status"], "WARN")

    def test_doctor_accepts_managed_gitignore_with_crlf_line_endings(self) -> None:
        self.bootstrap()
        gitignore = self.root / ".gitignore"
        gitignore.write_bytes(gitignore.read_bytes().replace(b"\n", b"\r\n"))

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "PASS")

        plan_result, plan = self.plan("adopt")
        self.assertEqual(plan_result.returncode, 0, plan_result.stderr)
        gitignore_action = next(
            action for action in plan["actions"] if action["path"] == ".gitignore"
        )
        self.assertEqual(gitignore_action["action"], "unchanged")

    def test_doctor_fails_when_a_required_artifact_is_missing(self) -> None:
        self.bootstrap()
        (self.root / "AGENTS.md").unlink()

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        self.assertNotIn("AGENTS.md", result.stderr)

    def test_doctor_fails_when_generated_content_drifts(self) -> None:
        self.bootstrap()
        (self.root / "AGENTS.md").write_text("changed\n", encoding="utf-8")

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["artifact-content"]["status"], "FAIL")

    def test_empty_validation_contract_is_allowed_and_warned(self) -> None:
        self.write_manifest(
            validation=[],
            open_decisions=["Define repository-native validation commands."],
        )
        self.bootstrap()

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "WARN")
        checks = {check["id"]: check for check in payload["checks"]}
        self.assertEqual(checks["validation-contract"]["status"], "WARN")
        agents = (self.root / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("No validation commands are declared.", agents)

    def test_spec_driven_profile_is_generic_and_openspec_is_not_a_dependency(self) -> None:
        self.write_manifest(
            profile="spec-driven",
            spec_workflow="generic",
            documentation=["architecture", "adr", "runbooks"],
        )
        self.bootstrap()

        self.assertTrue((self.root / "specs" / "README.md").is_file())
        self.assertTrue((self.root / "docs" / "adr" / "README.md").is_file())
        self.assertTrue((self.root / "docs" / "runbooks" / "README.md").is_file())
        self.assertFalse((self.root / "openspec").exists())

    def test_duplicate_json_keys_are_rejected(self) -> None:
        raw = json.dumps(self.manifest_data())
        raw = raw.replace('"profile": "minimal"', '"profile": "minimal", "profile": "spec-driven"')
        self.manifest.write_text(raw, encoding="utf-8")

        result, _ = self.plan()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate JSON key", result.stderr)

    def test_secret_like_manifest_value_is_rejected_without_echoing_it(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        self.write_manifest(constraints=[f"password={value}"])

        result, _ = self.plan()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("possible credential", result.stderr)
        self.assertNotIn(value, result.stderr)
        self.assertNotIn(value, result.stdout)

    def test_segmented_secret_assignments_are_rejected_without_echoing_them(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        assignments = (
            "client_secret",
            "aws_secret_access_key",
            "database_password_hash",
            "service_access_token",
            "credentials_file",
        )
        for key in assignments:
            with self.subTest(key=key):
                self.write_manifest(constraints=[f"{key}={value}"])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)

    def test_camel_case_secret_assignments_are_rejected_without_echoing_them(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        assignments = (
            "clientSecret",
            "awsSecretAccessKey",
            "databasePasswordHash",
            "serviceAccessToken",
            "privateKeyFile",
        )
        for key in assignments:
            with self.subTest(key=key):
                self.write_manifest(constraints=[f"{key}={value}"])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)

    def test_numbered_secret_assignments_are_rejected_without_echoing_them(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        for key in ("clientSecret2", "apiKey2"):
            with self.subTest(key=key):
                self.write_manifest(constraints=[f"{key}={value}"])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_username_only_ssh_uri_is_not_treated_as_a_credential(self) -> None:
        self.write_manifest(
            constraints=["Mirror modules from ssh://git@github.com/example/infrastructure.git."]
        )

        result, payload = self.plan()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertFalse(self.root.exists())

    def test_credential_bearing_urls_and_authorization_headers_are_rejected(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        credentials = (
            f"DATABASE_URL=postgres://user:{value}@db.example.test/database",
            f"registry=https://oauth2:{value}@registry.example.test/project",
            f"source=https://{value}@git.example.test/infrastructure.git",
            f"registry=oci://{value}@registry.example.test/project",
            f"Authorization: Bearer {value}",
            f"Proxy-Authorization: Basic {value}",
        )
        for credential in credentials:
            with self.subTest(credential=credential.split(":", 1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_authorization_headers_are_rejected_regardless_of_value_length(self) -> None:
        credentials = (
            ("Authorization: Bearer ABC1234", "ABC1234"),
            ("Proxy-Authorization: Basic dTpw", "dTpw"),
            ("HTTP_AUTHORIZATION=Bearer ABC1234", "ABC1234"),
            ("proxyAuthorization: Basic dTpw", "dTpw"),
            ("token=abc", "abc"),
        )
        for credential, value in credentials:
            with self.subTest(form=credential.split(maxsplit=1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_authorization_values_with_literal_prefixes_are_rejected(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        credentials = (
            f'Authorization: """Bearer {value}"""',
            f"Proxy-Authorization='''Basic {value}'''",
            f'HTTP_AUTHORIZATION=r"Bearer {value}"',
            f"proxyAuthorization=R'''Basic {value}'''",
            f'Authorization: r\\"Bearer {value}\\"',
            f"Proxy-Authorization=R\\'\\'\\'Basic {value}\\'\\'\\'",
        )
        for credential in credentials:
            with self.subTest(form=credential.split(":", 1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_quoted_credential_assignments_and_headers_are_rejected(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        credentials = (
            f'Authorization: "Bearer {value}"',
            f"Proxy-Authorization='Basic {value}'",
            'HTTP_AUTHORIZATION="Bearer ABC1234"',
            f'{{"Authorization": "Bearer {value}"}}',
            f'{{"clientSecret": "{value}"}}',
            f'{{\\"Authorization\\": \\"Bearer {value}\\"}}',
            f'{{\\"clientSecret\\": \\"{value}\\"}}',
        )
        for credential in credentials:
            with self.subTest(form=credential.split(":", 1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_credential_scan_canonicalization_does_not_rewrite_accepted_text(self) -> None:
        value = (
            r'Document parser examples: field\u003anot-secret, '
            r'path%2Fexample, quote=\\"literal\\", syntax=r"BasicAuth example".'
        )
        self.write_manifest(constraints=[value])

        plan_result, plan = self.plan()
        self.assertEqual(plan_result.returncode, 0, plan_result.stderr)
        apply_result = self.apply(plan["plan_digest"])
        self.assertEqual(apply_result.returncode, 0, apply_result.stderr)

        generated_manifest = json.loads(
            (self.root / "infrastructure-project.json").read_text(encoding="utf-8")
        )
        self.assertEqual(generated_manifest["constraints"], [value])
        self.assertIn(value, (self.root / "PROJECT.md").read_text(encoding="utf-8"))

    def test_serialized_and_unicode_escaped_credentials_are_rejected(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        credentials = (
            f'{{"clientSecr\\u0065t": "{value}"}}',
            f'{{"Authorization": "Be\\u0061rer {value}"}}',
            f'{{"clientSecr\\x65t": "{value}"}}',
            f'{{"clientSecr%65t": "{value}"}}',
            f'clientSecret\\u003d{value}',
            f'{{\\\\"clientSecret\\\\": \\\\"{value}\\\\"}}',
            f'{{\\\\"Authorization\\\\": \\\\"Bearer {value}\\\\"}}',
        )
        for credential in credentials:
            with self.subTest(form=credential.split(":", 1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_authorization_identifiers_with_suffixes_are_rejected(self) -> None:
        value = "EXAMPLEVALUEWITH24CHARACTERS"
        credentials = (
            f"AUTHORIZATION_HEADER=Bearer {value}",
            f'authorizationHeader="Bearer {value}"',
            f'Authorization2: "Bearer {value}"',
            f"proxyAuthorization2='Basic {value}'",
            f"HTTPAUTHORIZATION=Bearer {value}",
            f"PROXYAUTHORIZATION2=Basic {value}",
        )
        for credential in credentials:
            with self.subTest(form=credential.split(":", 1)[0]):
                self.write_manifest(constraints=[credential])

                result, _ = self.plan()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(value, result.stderr)
                self.assertNotIn(value, result.stdout)
                self.assertFalse(self.root.exists())

    def test_blocked_plan_digest_changes_with_conflicting_content(self) -> None:
        self.root.mkdir()
        conflict = self.root / "PROJECT.md"
        conflict.write_text("first conflict\n", encoding="utf-8")

        first_result, first = self.plan("adopt")
        conflict.write_text("second conflict\n", encoding="utf-8")
        second_result, second = self.plan("adopt")

        self.assertEqual(first_result.returncode, 2)
        self.assertEqual(second_result.returncode, 2)
        self.assertNotEqual(first["plan_digest"], second["plan_digest"])
        observation = next(
            item for item in second["observations"] if item["path"] == "PROJECT.md"
        )
        self.assertEqual(observation["state"], "collision")
        self.assertRegex(observation["current_digest"], r"^sha256:[0-9a-f]{64}$")

    def test_ambiguous_gitignore_does_not_hide_other_collision_digests(self) -> None:
        self.root.mkdir()
        (self.root / ".gitignore").write_text(
            "# infrastructure-project-bootstrap:begin\n", encoding="utf-8"
        )
        conflict = self.root / "PROJECT.md"
        conflict.write_text("first conflict\n", encoding="utf-8")

        first_result, first = self.plan("adopt")
        conflict.write_text("second conflict\n", encoding="utf-8")
        second_result, second = self.plan("adopt")

        self.assertEqual(first_result.returncode, 2)
        self.assertEqual(second_result.returncode, 2)
        self.assertNotEqual(first["plan_digest"], second["plan_digest"])
        observations = {item["path"]: item for item in second["observations"]}
        self.assertEqual(observations[".gitignore"]["state"], "collision")
        self.assertEqual(observations["PROJECT.md"]["state"], "collision")
        self.assertRegex(
            observations["PROJECT.md"]["current_digest"], r"^sha256:[0-9a-f]{64}$"
        )

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_adopt_rejects_symlinked_targets(self) -> None:
        self.root.mkdir()
        outside = self.workspace / "outside.md"
        outside.write_text("do not change\n", encoding="utf-8")
        os.symlink(outside, self.root / "PROJECT.md")

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("PROJECT.md", payload["collisions"])
        self.assertEqual(outside.read_text(encoding="utf-8"), "do not change\n")

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_doctor_rejects_required_artifact_behind_symlinked_parent(self) -> None:
        self.bootstrap()
        architecture = self.root / "docs" / "architecture"
        outside = self.workspace / "outside-architecture"
        outside.mkdir()
        (outside / "README.md").write_text("outside\n", encoding="utf-8")
        (architecture / "README.md").unlink()
        architecture.rmdir()
        os.symlink(outside, architecture, target_is_directory=True)

        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(payload["status"], "FAIL")


if __name__ == "__main__":
    unittest.main()
