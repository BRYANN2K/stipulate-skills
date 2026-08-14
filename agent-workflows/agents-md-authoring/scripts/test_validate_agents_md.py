#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("validate_agents_md.py")
SKILL_ROOT = Path(__file__).parent.parent

VALID_ROOT = """# Agent instructions

## Project

Orbit is a small application.

## Commands

- Test: `python3 -m unittest`

## Repository map

- [`src/`](src/) — application source.
- [`tests/`](tests/) — automated tests.

## Engineering rules

- Choose the simplest implementation that fully meets the current requirement.

## Boundaries

- Never commit credentials.

## Validation

Run the focused checks relevant to the changed files.
"""


class ValidateAgentsMdTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "project"
        self.root.mkdir()
        (self.root / "src").mkdir()
        (self.root / "tests").mkdir()
        (self.root / "AGENTS.md").write_text(VALID_ROOT, encoding="utf-8")

    def run_validator(self, root: Path | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "check",
                "--root",
                str(root or self.root),
                "--json",
            ],
            text=True,
            capture_output=True,
            check=False,
        )

    def validate(self) -> dict[str, object]:
        result = self.run_validator()
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_valid_root_and_nested_instructions_pass_read_only(self) -> None:
        nested = self.root / "packages" / "api"
        nested.mkdir(parents=True)
        (nested / "AGENTS.md").write_text(
            "# API agent instructions\n\n## Scope\n\nApplies to this API package.\n",
            encoding="utf-8",
        )
        before = {
            path.relative_to(self.root).as_posix(): path.read_bytes()
            for path in self.root.rglob("*")
            if path.is_file()
        }

        payload = self.validate()

        self.assertEqual(payload["status"], "PASS")
        self.assertEqual(payload["files"], ["AGENTS.md", "packages/api/AGENTS.md"])
        after = {
            path.relative_to(self.root).as_posix(): path.read_bytes()
            for path in self.root.rglob("*")
            if path.is_file()
        }
        self.assertEqual(before, after)

    def test_unresolved_template_markers_fail(self) -> None:
        (self.root / "AGENTS.md").write_text(
            VALID_ROOT + "\nProject: {{PROJECT_SUMMARY}}\nOwner: <PROJECT_OWNER>\n",
            encoding="utf-8",
        )

        result = self.run_validator()

        self.assertEqual(result.returncode, 1)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "FAIL")
        self.assertEqual({item["code"] for item in payload["findings"]}, {"unresolved-placeholder"})

    def test_broken_or_escaping_local_links_fail_without_reflecting_target(self) -> None:
        private_target = "private-missing-target.md"
        (self.root / "AGENTS.md").write_text(
            VALID_ROOT + f"\n[Missing]({private_target})\n[Outside](../outside.md)\n",
            encoding="utf-8",
        )

        result = self.run_validator()

        self.assertEqual(result.returncode, 1)
        payload = json.loads(result.stdout)
        self.assertEqual(
            {item["code"] for item in payload["findings"]},
            {"broken-local-link", "link-escapes-root"},
        )
        self.assertNotIn(private_target, result.stdout + result.stderr)

    def test_possible_secret_fails_without_disclosing_value(self) -> None:
        secret = "sk_test_1234567890abcdef"
        (self.root / "AGENTS.md").write_text(
            VALID_ROOT + f'\napi_key = "{secret}"\n', encoding="utf-8"
        )

        result = self.run_validator()

        self.assertEqual(result.returncode, 1)
        payload = json.loads(result.stdout)
        self.assertIn("possible-secret", {item["code"] for item in payload["findings"]})
        self.assertNotIn(secret, result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_unbalanced_fence_and_invalid_utf8_fail_cleanly(self) -> None:
        (self.root / "AGENTS.md").write_text(VALID_ROOT + "\n```bash\ntrue\n", encoding="utf-8")
        result = self.run_validator()
        self.assertEqual(result.returncode, 1)
        self.assertIn("unbalanced-fence", {item["code"] for item in json.loads(result.stdout)["findings"]})

        (self.root / "AGENTS.md").write_bytes(b"# Agent instructions\n\xff\n")
        result = self.run_validator()
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid-utf8", {item["code"] for item in json.loads(result.stdout)["findings"]})
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    @unittest.skipIf(os.name == "nt", "symlink semantics differ on Windows")
    def test_symlinked_agents_file_is_rejected_without_following_it(self) -> None:
        outside = Path(self.temporary.name) / "outside.md"
        secret = "outside-secret-value"
        outside.write_text(f"# Instructions\n\n{secret}\n", encoding="utf-8")
        (self.root / "AGENTS.md").unlink()
        (self.root / "AGENTS.md").symlink_to(outside)

        result = self.run_validator()

        self.assertEqual(result.returncode, 1)
        payload = json.loads(result.stdout)
        self.assertIn("symlink-not-allowed", {item["code"] for item in payload["findings"]})
        self.assertNotIn(secret, result.stdout + result.stderr)
        self.assertNotIn(str(outside), result.stdout + result.stderr)

    def test_missing_or_symlinked_root_is_blocked_without_traceback(self) -> None:
        missing = Path(self.temporary.name) / "missing"
        result = self.run_validator(missing)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["status"], "BLOCKED")
        self.assertNotIn("Traceback", result.stdout + result.stderr)

        if os.name != "nt":
            linked = Path(self.temporary.name) / "linked-root"
            linked.symlink_to(self.root, target_is_directory=True)
            result = self.run_validator(linked)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)["status"], "BLOCKED")
            self.assertNotIn(str(self.root), result.stdout + result.stderr)

    def test_public_contract_explicitly_covers_software_and_infrastructure(self) -> None:
        skill = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        template = (SKILL_ROOT / "templates" / "AGENTS.md").read_text(encoding="utf-8")

        self.assertIn("software, infrastructure", skill)
        self.assertIn("{{PLAN_OR_PREVIEW_COMMAND}}", template)
        self.assertIn("Plan or preview", template)
        self.assertIn("state, backend, environment", template)


if __name__ == "__main__":
    unittest.main()
