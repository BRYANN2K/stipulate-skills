#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).with_name("inspect_project.py")


class InspectProjectTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "project"
        self.root.mkdir()
        (self.root / "src").mkdir()
        (self.root / "tests").mkdir()
        (self.root / ".github" / "workflows").mkdir(parents=True)
        (self.root / "packages" / "api").mkdir(parents=True)
        (self.root / "README.md").write_text("# Orbit\n", encoding="utf-8")
        (self.root / "package.json").write_text(
            json.dumps(
                {
                    "name": "orbit",
                    "scripts": {"test": "vitest run", "lint": "eslint ."},
                    "dependencies": {"next": "15.0.0", "react": "19.0.0"},
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        (self.root / "pnpm-lock.yaml").write_text("lockfileVersion: '9.0'\n", encoding="utf-8")
        (self.root / "src" / "main.ts").write_text("export const value = 1;\n", encoding="utf-8")
        (self.root / "tests" / "main.test.ts").write_text("// test\n", encoding="utf-8")
        (self.root / ".github" / "workflows" / "ci.yml").write_text("name: ci\n", encoding="utf-8")
        (self.root / "Makefile").write_text("lint:\n\t@true\n\ntest:\n\t@true\n", encoding="utf-8")
        (self.root / "packages" / "api" / "pyproject.toml").write_text(
            "[project]\nname = 'orbit-api'\n", encoding="utf-8"
        )
        (self.root / ".env").write_text("TOKEN=do-not-disclose-this-value\n", encoding="utf-8")

    def run_inspector(self, root: Path | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(root or self.root)],
            text=True,
            capture_output=True,
            check=False,
        )

    def inspect(self) -> dict[str, Any]:
        result = self.run_inspector()
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_reports_observed_project_evidence_without_executing_commands(self) -> None:
        marker = self.root / "executed-by-mistake"
        (self.root / "package.json").write_text(
            json.dumps(
                {
                    "name": "orbit",
                    "scripts": {
                        "test": f"touch {marker}",
                        "lint": "eslint .",
                    },
                    "dependencies": {"next": "15.0.0", "react": "19.0.0"},
                }
            ),
            encoding="utf-8",
        )

        payload = self.inspect()

        self.assertEqual(payload["status"], "PASS")
        self.assertEqual(payload["package_managers"], ["pnpm"])
        self.assertEqual(payload["frameworks"], ["next", "react"])
        self.assertIn("package.json", payload["manifests"])
        self.assertIn("packages/api/pyproject.toml", payload["manifests"])
        self.assertIn("packages/api", payload["nested_project_roots"])
        self.assertIn("src", payload["source_roots"])
        self.assertIn("tests", payload["test_roots"])
        self.assertIn(".github/workflows/ci.yml", payload["ci_files"])
        self.assertIn(
            {"command": "pnpm run test", "source": "package.json:scripts.test"},
            payload["declared_commands"],
        )
        self.assertIn(
            {"command": "make lint", "source": "Makefile:lint"},
            payload["declared_commands"],
        )
        self.assertFalse(marker.exists())
        self.assertNotIn("touch", result_text(payload))

    def test_output_is_deterministic_and_does_not_expose_private_files(self) -> None:
        first = self.run_inspector()
        second = self.run_inspector()

        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(first.stdout, second.stdout)
        self.assertNotIn("do-not-disclose-this-value", first.stdout)
        self.assertNotIn(".env", first.stdout)

    @unittest.skipIf(os.name == "nt", "symlink semantics differ on Windows")
    def test_symlinks_are_not_followed_and_are_reported_generically(self) -> None:
        outside = Path(self.temporary.name) / "outside.json"
        outside.write_text('{"secret":"outside-secret-value"}\n', encoding="utf-8")
        (self.root / "linked-package.json").symlink_to(outside)
        (self.root / "linked-dir").symlink_to(outside.parent, target_is_directory=True)

        result = self.run_inspector()

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "WARN")
        self.assertTrue(any(item["code"] == "symlink-skipped" for item in payload["warnings"]))
        self.assertNotIn("outside-secret-value", result.stdout)
        self.assertNotIn(str(outside), result.stdout)

    def test_multiple_lockfile_families_produce_an_ambiguity_warning(self) -> None:
        (self.root / "package-lock.json").write_text("{}\n", encoding="utf-8")

        payload = self.inspect()

        self.assertEqual(payload["status"], "WARN")
        self.assertEqual(payload["package_managers"], ["npm", "pnpm"])
        self.assertTrue(any(item["code"] == "multiple-package-managers" for item in payload["warnings"]))
        self.assertFalse(any(command["command"].startswith(("npm ", "pnpm ")) for command in payload["declared_commands"]))

    def test_invalid_package_json_is_a_controlled_warning_without_reflection(self) -> None:
        bad_value = "private-invalid-json-value"
        (self.root / "package.json").write_text("{" + bad_value, encoding="utf-8")

        result = self.run_inspector()

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "WARN")
        self.assertTrue(any(item["code"] == "manifest-invalid" for item in payload["warnings"]))
        self.assertNotIn(bad_value, result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_reports_infrastructure_evidence_without_reading_state_or_running_apply(self) -> None:
        marker = self.root / "apply-ran-by-mistake"
        (self.root / "environments" / "prod").mkdir(parents=True)
        (self.root / "clusters" / "prod").mkdir(parents=True)
        (self.root / "charts" / "api").mkdir(parents=True)
        (self.root / "playbooks").mkdir()
        (self.root / "policy").mkdir()
        (self.root / "main.tf").write_text("terraform {}\n", encoding="utf-8")
        (self.root / "backend.tf").write_text('terraform { backend "s3" {} }\n', encoding="utf-8")
        (self.root / ".terraform.lock.hcl").write_text("# dependency lock\n", encoding="utf-8")
        (self.root / "terraform.tfstate").write_text(
            '{"private":"state-value-must-not-appear"}\n', encoding="utf-8"
        )
        (self.root / "environments" / "prod" / "terragrunt.hcl").write_text(
            "terraform {}\n", encoding="utf-8"
        )
        (self.root / "clusters" / "prod" / "kustomization.yaml").write_text(
            "resources: []\n", encoding="utf-8"
        )
        (self.root / "charts" / "api" / "Chart.yaml").write_text(
            "apiVersion: v2\nname: api\n", encoding="utf-8"
        )
        (self.root / "ansible.cfg").write_text("[defaults]\n", encoding="utf-8")
        (self.root / "playbooks" / "site.yml").write_text("---\n- hosts: all\n", encoding="utf-8")
        (self.root / "policy" / "deny.rego").write_text("package policy\n", encoding="utf-8")
        (self.root / "Makefile").write_text(
            f"plan:\n\t@true\n\napply:\n\ttouch {marker}\n", encoding="utf-8"
        )

        result = self.run_inspector()

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        infrastructure = payload["infrastructure"]
        self.assertEqual(
            infrastructure["tools"],
            [
                "ansible",
                "helm",
                "kubernetes",
                "kustomize",
                "opa",
                "terraform-opentofu",
                "terragrunt",
            ],
        )
        self.assertIn(".terraform.lock.hcl", infrastructure["lockfiles"])
        self.assertIn("backend.tf", infrastructure["backend_configuration_files"])
        self.assertEqual(infrastructure["environment_roots"], ["clusters/prod", "environments/prod"])
        self.assertIn(
            {
                "command": "make apply",
                "source": "Makefile:apply",
                "risk": "potential-live-mutation",
            },
            payload["declared_commands"],
        )
        self.assertFalse(marker.exists())
        self.assertNotIn("state-value-must-not-appear", result.stdout)
        self.assertNotIn("terraform.tfstate", result.stdout)

    def test_missing_or_symlinked_root_is_blocked_without_traceback(self) -> None:
        missing = Path(self.temporary.name) / "missing"
        result = self.run_inspector(missing)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["status"], "BLOCKED")
        self.assertNotIn("Traceback", result.stdout + result.stderr)

        if os.name != "nt":
            linked = Path(self.temporary.name) / "linked-root"
            linked.symlink_to(self.root, target_is_directory=True)
            result = self.run_inspector(linked)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)["status"], "BLOCKED")
            self.assertNotIn(str(self.root), result.stdout + result.stderr)


def result_text(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True)


if __name__ == "__main__":
    unittest.main()
