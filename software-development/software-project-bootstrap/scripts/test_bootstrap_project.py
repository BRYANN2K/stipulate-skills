#!/usr/bin/env python3
"""Black-box tests for the software project bootstrap helper."""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest import mock

SCRIPT = Path(__file__).with_name("bootstrap_project.py")


def load_bootstrap_module() -> Any:
    spec = importlib.util.spec_from_file_location("bootstrap_project_under_test", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load bootstrap helper")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SoftwareBootstrapTests(unittest.TestCase):
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
                "name": "orbit-console",
                "summary": "A portable software project used for contract tests.",
                "kind": "web-application",
            },
            "profile": "minimal",
            "languages": ["typescript"],
            "package_managers": ["pnpm"],
            "source_roots": ["src"],
            "test_roots": ["tests"],
            "documentation": ["architecture"],
            "spec_workflow": "none",
            "validation": [
                {"id": "test", "command": "pnpm test"},
                {"id": "typecheck", "command": "pnpm typecheck"},
            ],
            "constraints": ["Preserve the existing public API."],
            "open_decisions": [],
        }
        data.update(overrides)
        return data

    def write_manifest(self, **overrides: Any) -> None:
        self.manifest.write_text(
            json.dumps(self.manifest_data(**overrides), indent=2) + "\n",
            encoding="utf-8",
        )

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
            "plan", "--manifest", str(self.manifest), "--root", str(self.root),
            "--mode", mode, "--json",
        )
        return result, json.loads(result.stdout) if result.stdout else {}

    def apply(self, digest: str, mode: str = "init") -> subprocess.CompletedProcess[str]:
        return self.run_cli(
            "apply", "--manifest", str(self.manifest), "--root", str(self.root),
            "--mode", mode, "--plan-digest", digest, "--json",
        )

    def bootstrap(self, mode: str = "init") -> dict[str, Any]:
        planned, payload = self.plan(mode)
        self.assertEqual(planned.returncode, 0, planned.stderr)
        applied = self.apply(payload["plan_digest"], mode)
        self.assertEqual(applied.returncode, 0, applied.stderr)
        return json.loads(applied.stdout)

    def test_plan_is_read_only_and_bound_to_current_state(self) -> None:
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertRegex(payload["plan_digest"], r"^sha256:[0-9a-f]{64}$")
        self.assertFalse(self.root.exists())
        self.assertIn("software-project.json", {a["path"] for a in payload["actions"]})

    def test_apply_requires_exact_reviewed_digest(self) -> None:
        result = self.apply("sha256:" + "0" * 64)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plan digest does not match", result.stderr)
        self.assertFalse(self.root.exists())

    def test_apply_creates_only_portable_repository_files(self) -> None:
        payload = self.bootstrap()
        self.assertEqual(payload["status"], "APPLIED")
        for relative in (
            "software-project.json", "PROJECT.md", "AGENTS.md", ".gitignore",
            "src/.gitkeep", "tests/.gitkeep", "docs/architecture/README.md",
        ):
            self.assertTrue((self.root / relative).is_file(), relative)
        self.assertFalse((self.root / ".git").exists())
        self.assertFalse((self.root / "node_modules").exists())
        self.assertFalse((self.root / "openspec").exists())

    def test_plan_blocks_generated_path_hierarchy_collision_without_writes(self) -> None:
        self.write_manifest(source_roots=["PROJECT.md"])

        result, payload = self.plan()

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("PROJECT.md", payload["collisions"])
        self.assertFalse(self.root.exists())

    def test_adopt_blocks_case_and_unicode_aliases_against_existing_paths_without_writes(self) -> None:
        scenarios = (
            ("SRC", "src"),
            ("cafe\u0301", "caf\u00e9"),
        )
        for index, (existing, requested) in enumerate(scenarios):
            with self.subTest(existing=existing, requested=requested):
                self.root = self.workspace / f"project-alias-{index}"
                self.root.mkdir()
                existing_root = self.root / existing
                existing_root.mkdir()
                owned = existing_root / "owned.txt"
                owned.write_text("preserve\n", encoding="utf-8")
                before = {
                    path.relative_to(self.root).as_posix(): path.read_bytes()
                    for path in self.root.rglob("*") if path.is_file()
                }
                self.write_manifest(source_roots=[requested])

                result, payload = self.plan("adopt")

                after = {
                    path.relative_to(self.root).as_posix(): path.read_bytes()
                    for path in self.root.rglob("*") if path.is_file()
                }
                self.assertEqual(result.returncode, 2)
                self.assertEqual(payload["status"], "BLOCKED")
                self.assertIn(f"{requested}/.gitkeep", payload["collisions"])
                self.assertEqual(after, before)
                self.assertFalse((self.root / requested / ".gitkeep").exists())

    def test_plan_blocks_portable_path_aliases_without_writes(self) -> None:
        for source_root, test_root in (
            ("src", "SRC"),
            ("caf\N{LATIN SMALL LETTER E WITH ACUTE}", "cafe\N{COMBINING ACUTE ACCENT}"),
        ):
            with self.subTest(source_root=source_root, test_root=test_root):
                self.write_manifest(source_roots=[source_root], test_roots=[test_root])

                result, payload = self.plan()

                self.assertEqual(result.returncode, 2)
                self.assertEqual(payload["status"], "BLOCKED")
                self.assertTrue(payload["collisions"])
                self.assertFalse(self.root.exists())

    def test_init_apply_write_failure_leaves_target_absent(self) -> None:
        helper = load_bootstrap_module()
        manifest = helper.load_manifest(self.manifest)
        plan, _ = helper.build_plan(manifest, self.root, "init")
        real_write = helper.write_atomic
        writes = 0

        def fail_after_several_writes(path: Path, content: str) -> None:
            nonlocal writes
            writes += 1
            if writes == 4:
                raise OSError("injected write failure")
            real_write(path, content)

        with (
            mock.patch.object(helper, "write_atomic", side_effect=fail_after_several_writes),
            self.assertRaises(helper.BootstrapError),
        ):
            helper.apply_plan(manifest, self.root, "init", plan["plan_digest"])

        self.assertGreaterEqual(writes, 4)
        self.assertFalse(self.root.exists())

    def test_adopt_apply_write_failure_restores_original_tree(self) -> None:
        helper = load_bootstrap_module()
        self.root.mkdir()
        existing = self.root / "existing.txt"
        existing.write_text("user-owned\n", encoding="utf-8")
        (self.root / ".gitignore").write_text("vendor/\n", encoding="utf-8")
        before = {path.relative_to(self.root).as_posix(): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        manifest = helper.load_manifest(self.manifest)
        plan, _ = helper.build_plan(manifest, self.root, "adopt")
        real_write = helper.write_atomic
        writes = 0

        def fail_after_several_writes(path: Path, content: str) -> None:
            nonlocal writes
            writes += 1
            real_write(path, content)
            if writes == 4:
                raise OSError("injected write failure")

        with (
            mock.patch.object(helper, "write_atomic", side_effect=fail_after_several_writes),
            self.assertRaises(helper.BootstrapError),
        ):
            helper.apply_plan(manifest, self.root, "adopt", plan["plan_digest"])

        after = {path.relative_to(self.root).as_posix(): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        self.assertGreaterEqual(writes, 4)
        self.assertEqual(after, before)

    def test_init_blocks_nonempty_root_without_mutation(self) -> None:
        self.root.mkdir()
        sentinel = self.root / "keep.txt"
        sentinel.write_text("preserve\n", encoding="utf-8")
        result, payload = self.plan("init")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve\n")

    def test_adopt_requires_existing_nonempty_root(self) -> None:
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 2)
        self.assertIn("root", payload["collisions"])
        self.root.mkdir()
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 2)
        self.assertIn("root", payload["collisions"])

    def test_adopt_preserves_unowned_files_and_is_idempotent(self) -> None:
        self.root.mkdir()
        sentinel = self.root / "existing.txt"
        sentinel.write_text("keep\n", encoding="utf-8")
        payload = self.bootstrap("adopt")
        self.assertEqual(payload["status"], "APPLIED")
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep\n")
        result, second = self.plan("adopt")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual({a["action"] for a in second["actions"]}, {"unchanged"})

    def test_adopt_refuses_conflicting_owned_file(self) -> None:
        self.root.mkdir()
        project = self.root / "PROJECT.md"
        project.write_text("owned by user\n", encoding="utf-8")
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 2)
        self.assertIn("PROJECT.md", payload["collisions"])
        self.assertEqual(project.read_text(encoding="utf-8"), "owned by user\n")

    def test_adopt_only_appends_managed_gitignore_block(self) -> None:
        self.root.mkdir()
        ignore = self.root / ".gitignore"
        ignore.write_text("vendor/\n", encoding="utf-8")
        payload = self.bootstrap("adopt")
        self.assertIn(".gitignore", payload["updated"])
        content = ignore.read_text(encoding="utf-8")
        self.assertTrue(content.startswith("vendor/\n"))
        self.assertEqual(content.count("software-project-bootstrap:begin"), 1)

    def test_adopt_blocks_reversed_gitignore_markers_without_traceback(self) -> None:
        self.root.mkdir()
        ignore = self.root / ".gitignore"
        original = "# software-project-bootstrap:end\nvendor/\n# software-project-bootstrap:begin\n"
        ignore.write_text(original, encoding="utf-8")

        result, payload = self.plan("adopt")

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn(".gitignore", payload["collisions"])
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual(ignore.read_text(encoding="utf-8"), original)

    def test_adopt_blocks_nested_gitignore_negation_before_apply(self) -> None:
        self.root.mkdir()
        (self.root / "existing.txt").write_text("keep\n", encoding="utf-8")
        nested = self.root / "src" / ".gitignore"
        nested.parent.mkdir()
        nested.write_text("!secret.env\n", encoding="utf-8")
        before = {path.relative_to(self.root).as_posix(): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}

        result, payload = self.plan("adopt")

        after = {path.relative_to(self.root).as_posix(): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("nested .gitignore", payload["collisions"])
        self.assertEqual(after, before)

    def test_manifest_change_invalidates_reviewed_plan(self) -> None:
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.write_manifest(constraints=["Changed after review."])
        applied = self.apply(payload["plan_digest"])
        self.assertNotEqual(applied.returncode, 0)
        self.assertFalse(self.root.exists())

    def test_filesystem_change_invalidates_reviewed_plan(self) -> None:
        self.root.mkdir()
        (self.root / "existing.txt").write_text("keep\n", encoding="utf-8")
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.root / "AGENTS.md").write_text("appeared\n", encoding="utf-8")
        applied = self.apply(payload["plan_digest"], "adopt")
        self.assertNotEqual(applied.returncode, 0)
        self.assertEqual((self.root / "AGENTS.md").read_text(), "appeared\n")

    def test_doctor_is_read_only_and_never_executes_declared_commands(self) -> None:
        marker = self.workspace / "must-not-exist"
        self.write_manifest(validation=[{"id": "must-not-run", "command": f"touch {marker}"}])
        self.bootstrap()
        before = {p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        payload = json.loads(result.stdout)
        after = {p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "PASS")
        self.assertEqual(payload["commands_executed"], [])
        self.assertFalse(marker.exists())
        self.assertEqual(before, after)

    def test_doctor_fails_on_generated_contract_drift(self) -> None:
        self.bootstrap()
        (self.root / "AGENTS.md").write_text("drift\n", encoding="utf-8")
        result = self.run_cli("doctor", "--root", str(self.root), "--json")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["status"], "FAIL")

    def test_doctor_fails_on_any_managed_documentation_drift(self) -> None:
        self.write_manifest(
            profile="spec-driven",
            spec_workflow="generic",
            documentation=["architecture"],
        )
        self.bootstrap()
        for relative in ("docs/architecture/README.md", "specs/README.md"):
            with self.subTest(relative=relative):
                target = self.root / relative
                original = target.read_text(encoding="utf-8")
                target.write_text("drift\n", encoding="utf-8")
                result = self.run_cli("doctor", "--root", str(self.root), "--json")
                self.assertEqual(result.returncode, 1)
                self.assertEqual(json.loads(result.stdout)["status"], "FAIL")
                target.write_text(original, encoding="utf-8")

    def test_spec_driven_profile_is_optional_and_tool_agnostic(self) -> None:
        self.write_manifest(profile="spec-driven", spec_workflow="generic", documentation=["architecture", "adr"])
        self.bootstrap()
        self.assertTrue((self.root / "specs" / "README.md").is_file())
        self.assertFalse((self.root / "openspec").exists())

    def test_duplicate_json_keys_and_unknown_fields_are_rejected(self) -> None:
        raw = json.dumps(self.manifest_data()).replace(
            '"profile": "minimal"', '"profile": "minimal", "profile": "spec-driven"'
        )
        self.manifest.write_text(raw, encoding="utf-8")
        duplicate, _ = self.plan()
        self.assertNotEqual(duplicate.returncode, 0)
        self.assertIn("duplicate JSON key", duplicate.stderr)
        self.write_manifest(unexpected=True)
        unknown, _ = self.plan()
        self.assertNotEqual(unknown.returncode, 0)
        self.assertIn("unsupported fields", unknown.stderr)

    def test_unknown_credential_shaped_field_is_not_reflected(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        self.write_manifest(**{f"password={marker}": "x"})

        result, _ = self.plan()

        self.assertEqual(result.returncode, 2)
        self.assertIn("unsupported fields", result.stderr)
        self.assertNotIn(marker, result.stdout + result.stderr)
        self.assertFalse(self.root.exists())

    def test_unknown_documentation_value_is_not_reflected(self) -> None:
        marker = "fictional-unknown-doc-9x7q"
        self.write_manifest(documentation=[marker])

        result, _ = self.plan()

        self.assertEqual(result.returncode, 2)
        self.assertIn("unsupported documentation", result.stderr)
        self.assertNotIn(marker, result.stdout + result.stderr)
        self.assertFalse(self.root.exists())

    def test_invalid_utf8_manifest_is_rejected_without_traceback(self) -> None:
        self.manifest.write_bytes(b'{"project":"\xff"}')
        result, _ = self.plan()
        self.assertEqual(result.returncode, 2)
        self.assertIn("could not read the manifest", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_huge_integer_manifest_is_rejected_without_traceback_or_writes(self) -> None:
        self.manifest.write_text('{"schema_version":' + "9" * 5000 + '}', encoding="utf-8")
        result, _ = self.plan()
        self.assertEqual(result.returncode, 2)
        self.assertIn("not valid JSON", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertFalse(self.root.exists())

    def test_unsafe_relative_paths_are_rejected(self) -> None:
        for path in ("../outside", "/absolute", ".git/hooks", "src/../../outside"):
            with self.subTest(path=path):
                self.write_manifest(source_roots=[path])
                result, _ = self.plan()
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.root.exists())

    def test_noncanonical_relative_path_aliases_are_rejected(self) -> None:
        for path in ("./src", "src/", "src//nested", "src/./nested", r"src\nested"):
            with self.subTest(path=path):
                self.write_manifest(source_roots=[path])
                result, _ = self.plan()
                self.assertEqual(result.returncode, 2)
                self.assertIn("portable repository-relative path", result.stderr)
                self.assertFalse(self.root.exists())

    def test_nonportable_windows_paths_are_rejected(self) -> None:
        for path in (
            "C:/outside",
            r"C:\outside",
            "C:outside",
            "CON",
            "nul/data",
            "src:file",
            "src.",
            "src ",
            ".GIT/hooks",
        ):
            with self.subTest(path=path):
                self.write_manifest(source_roots=[path])
                result, _ = self.plan()
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.root.exists())

    def test_extended_windows_device_names_are_rejected_without_false_positives(self) -> None:
        for path in ("COM¹", "COM².txt", "COM³", "LPT¹", "LPT².log", "LPT³", "CONIN$", "CONOUT$"):
            with self.subTest(path=path):
                self.write_manifest(source_roots=[path])
                result, _ = self.plan()
                self.assertEqual(result.returncode, 2)
                self.assertFalse(self.root.exists())
        for path in ("COM10", "CONSOLE"):
            with self.subTest(path=path):
                self.write_manifest(source_roots=[path])
                result, payload = self.plan()
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(payload["status"], "READY")
                self.assertFalse(self.root.exists())

    def test_non_finite_json_numbers_are_rejected(self) -> None:
        raw = json.dumps(self.manifest_data()).replace(
            '"schema_version": "1.0"', '"schema_version": NaN'
        )
        self.manifest.write_text(raw, encoding="utf-8")
        result, _ = self.plan()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("non-finite", result.stderr)

    def test_credentials_are_rejected_without_disclosure_or_writes(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (
            f"clientSecret={marker}",
            f'Authorization: "Bearer {marker}"',
            f'Authorization: ***"Bearer {marker}"',
            f"registry=https://{marker}@example.test/project",
            f'{{"apiKey": "{marker}"}}',
        ):
            with self.subTest(form=value.split(":", 1)[0]):
                self.write_manifest(constraints=[value])
                result, _ = self.plan()
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn(marker, result.stdout + result.stderr)
                self.assertFalse(self.root.exists())

        self.write_manifest(constraints=["Document Bearer authorization without assigning a credential value."])
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertFalse(self.root.exists())

    def test_repeated_quote_serialized_credentials_are_rejected_without_writes(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (
            f"config={{'''apiKey''': '''{marker}'''}}",
            f'config={{"""apiKey""": """{marker}"""}}',
        ):
            with self.subTest(delimiter=value[8:11]):
                self.write_manifest(constraints=[value])
                result, _ = self.plan()
                self.assertEqual(result.returncode, 2)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(marker, result.stdout + result.stderr)
                self.assertFalse(self.root.exists())

        self.write_manifest(constraints=["Document the triple-quoted apiKey example without assigning a value."])
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertFalse(self.root.exists())

    def test_compact_uppercase_credential_identifier_is_rejected_without_writes(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        values = (
            f"PROD_CLIENTSECRET={marker}",
            f"CLIENTSECRET_PROD={marker}",
            f"CLIENTSECRETV3={marker}",
            f"INTERNALAPIKEY_PROD={marker}",
            f"PROD%5FCLIENTSECRET={marker}",
            f"CLIENTSECRET%5FPROD={marker}",
            f"CLIENTSECRETV%33={marker}",
            f"INTERNALAPIKEY%5FPROD={marker}",
            f"CLIENTSECRETPROD={marker}",
            f"INTERNALAPIKEYPROD={marker}",
            f"CLIENTSECRETSTAGING={marker}",
            f"ACCESSKEYIDUAT={marker}",
            f"PASSWORDDEV={marker}",
            f"PRIVATEKEYLOCAL={marker}",
            f"CLIENTSECRETPR%4FD={marker}",
            f"INTERNALAPIKEYSTAG%49NG={marker}",
        )
        for value in values:
            with self.subTest(identifier=value.split("=", 1)[0]):
                self.write_manifest(constraints=[value])
                result, _ = self.plan()
                self.assertEqual(result.returncode, 2)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(marker, result.stdout + result.stderr)
                self.assertFalse(self.root.exists())

        self.write_manifest(constraints=["CLIENTSECRET rotation policy"])
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertFalse(self.root.exists())

    def test_lowercase_and_separated_credential_assignments_are_rejected_without_writes(self) -> None:
        marker = "EXAMPLEVALUEWITH24CHARACTERS"
        for value in (
            f"clientsecretprod={marker}",
            f"config.api.key={marker}",
            f"api key={marker}",
        ):
            with self.subTest(identifier=value.split("=", 1)[0]):
                self.write_manifest(constraints=[value])
                result, _ = self.plan()
                self.assertEqual(result.returncode, 2)
                self.assertIn("possible credential", result.stderr)
                self.assertNotIn(marker, result.stdout + result.stderr)
                self.assertFalse(self.root.exists())

        self.write_manifest(constraints=["Document config.api.key and clientsecretprod rotation without assigning values."])
        result, payload = self.plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(payload["status"], "READY")
        self.assertFalse(self.root.exists())

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks unavailable")
    def test_symlinked_target_is_blocked(self) -> None:
        self.root.mkdir()
        outside = self.workspace / "outside.md"
        outside.write_text("keep\n", encoding="utf-8")
        os.symlink(outside, self.root / "PROJECT.md")
        result, payload = self.plan("adopt")
        self.assertEqual(result.returncode, 2)
        self.assertIn("PROJECT.md", payload["collisions"])
        self.assertEqual(outside.read_text(), "keep\n")

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks unavailable")
    def test_symlinked_root_ancestor_is_blocked_without_writes(self) -> None:
        real_parent = self.workspace / "real-parent"
        real_parent.mkdir()
        linked_parent = self.workspace / "linked-parent"
        os.symlink(real_parent, linked_parent, target_is_directory=True)
        self.root = linked_parent / "project"

        result, payload = self.plan()

        self.assertEqual(result.returncode, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("root", payload["collisions"])
        self.assertFalse((real_parent / "project").exists())


if __name__ == "__main__":
    unittest.main()
