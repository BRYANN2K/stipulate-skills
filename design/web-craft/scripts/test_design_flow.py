#!/usr/bin/env python3
"""Black-box tests for design_flow.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("design_flow.py")


class DesignFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)

    def run_flow(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args, "--root", str(self.root)],
            text=True,
            capture_output=True,
            check=False,
        )

    def init(self) -> subprocess.CompletedProcess[str]:
        return self.run_flow(
            "init",
            "--name",
            "Example Product",
            "--surface",
            "web-application",
            "--ui-root",
            "src",
            "--ui-root",
            "app",
        )

    def write_artifacts(self) -> None:
        artifacts = self.root / ".design-flow" / "artifacts"
        markdown = {
            "PRODUCT-STORY.md": "# Product Story\n\nAudience, job, constraints, evidence, and positioning are explicit.\n",
            "PAGE-COPY.md": "# Page Copy\n\nThe message hierarchy and state microcopy use verified product language.\n",
            "CLAIMS.md": "# Claims\n\nC1 | fact | repository evidence | approved for use in the interface.\n",
            "REFERENCE-LEDGER.md": "# Reference Ledger\n\nOne observed principle is adapted without copying source identity or assets.\n",
            "DESIGN.md": "# Design System\n\nSemantic tokens, typography, layout, responsive rules, and accessibility are defined.\n",
            "COMPONENTS.md": "# Components\n\nButton and field states include focus-visible, disabled, loading, success, and error.\n",
        }
        for name, text in markdown.items():
            (artifacts / name).write_text(text, encoding="utf-8")
        (artifacts / "tokens.json").write_text(
            json.dumps({"color": {"surface": {"default": "#ffffff"}}, "space": {"2": "0.5rem"}}),
            encoding="utf-8",
        )
        (artifacts / "PROJECT-UI.md").write_text(
            """---
name: example-product-ui
description: Use when implementing product UI in Example Product after the approved design-system gate.
license: Apache-2.0
metadata:
  version: \"1.0.0\"
  author: Example Product
  category: project
  tags: ui, design-system
---

# Example Product UI

## Project contract

`DESIGN.md`, `tokens.json`, and `COMPONENTS.md` are the approved sources of truth.

## Implementation rules

Use semantic tokens and documented components. Implement all applicable states.

## Verification

Run repository tests and exercise keyboard, responsive, error, and reduced-motion behavior.
""",
            encoding="utf-8",
        )

    def ready_and_approve(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        ready = self.run_flow("ready")
        self.assertEqual(ready.returncode, 0, ready.stderr)
        approved = self.run_flow(
            "approve",
            "--approver",
            "human",
            "--approval-ref",
            "chat:explicit-design-approval",
        )
        self.assertEqual(approved.returncode, 0, approved.stderr)

    def test_initializes_draft_manifest(self) -> None:
        result = self.init()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.root / ".design-flow" / "workflow.json").read_text())
        self.assertEqual(manifest["phase"], "draft")
        self.assertEqual(manifest["project_slug"], "example-product")
        self.assertEqual(manifest["ui_roots"], ["src", "app"])

    def test_rejects_project_root_as_ui_root(self) -> None:
        result = self.run_flow(
            "init",
            "--name",
            "Example",
            "--surface",
            "website",
            "--ui-root",
            ".",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("cannot be the whole project root", result.stderr)

    def test_ready_rejects_missing_artifacts(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        result = self.run_flow("ready")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("required artifact is missing", result.stderr)

    def test_ready_rejects_unresolved_token_template_markers(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        tokens = self.root / ".design-flow" / "artifacts" / "tokens.json"
        tokens.write_text(
            json.dumps(
                {
                    "accent": "{{ACCENT}}",
                    "surface": "{{SURFACE}}",
                    "spacing": "{{SPACING}}",
                }
            ),
            encoding="utf-8",
        )
        result = self.run_flow("ready")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unresolved placeholder", result.stderr)

    def test_approve_requires_ready_and_specific_reference(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        early = self.run_flow(
            "approve", "--approver", "human", "--approval-ref", "chat:approval"
        )
        self.assertNotEqual(early.returncode, 0)
        self.assertIn("only after ready", early.stderr)
        self.assertEqual(self.run_flow("ready").returncode, 0)
        vague = self.run_flow(
            "approve", "--approver", "human", "--approval-ref", "approved"
        )
        self.assertNotEqual(vague.returncode, 0)
        self.assertIn("not a generic word", vague.stderr)

    def test_full_lifecycle_compiles_skill_and_opens_gate(self) -> None:
        self.ready_and_approve()
        blocked = self.run_flow("check-build")
        self.assertNotEqual(blocked.returncode, 0)
        self.assertIn("system-approved", blocked.stderr)
        compiled = self.run_flow("compile")
        self.assertEqual(compiled.returncode, 0, compiled.stderr)
        destination = self.root / ".agents" / "skills" / "example-product-ui" / "SKILL.md"
        self.assertTrue(destination.is_file())
        self.assertEqual(
            destination.read_bytes(),
            (self.root / ".design-flow" / "artifacts" / "PROJECT-UI.md").read_bytes(),
        )
        checked = self.run_flow("check-build")
        self.assertEqual(checked.returncode, 0, checked.stderr)
        self.assertIn("PASS", checked.stdout)

    def test_artifact_change_invalidates_approval(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        design = self.root / ".design-flow" / "artifacts" / "DESIGN.md"
        design.write_text(design.read_text() + "\nA changed rule.\n", encoding="utf-8")
        result = self.run_flow("check-build")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("approved artifact changed", result.stderr)

    def test_compile_refuses_untracked_existing_skill(self) -> None:
        self.ready_and_approve()
        destination = self.root / ".agents" / "skills" / "example-product-ui" / "SKILL.md"
        destination.parent.mkdir(parents=True)
        destination.write_text("independent project skill\n", encoding="utf-8")
        result = self.run_flow("compile")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("independent edits", result.stderr)
        replaced = self.run_flow("compile", "--replace")
        self.assertEqual(replaced.returncode, 0, replaced.stderr)

    def test_guard_blocks_ui_before_gate_and_allows_workflow_artifacts(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        blocked = self.run_flow("guard-write", "--path", "src/App.tsx")
        self.assertNotEqual(blocked.returncode, 0)
        self.assertIn("frontend build is blocked", blocked.stderr)
        allowed = self.run_flow(
            "guard-write", "--path", ".design-flow/artifacts/DESIGN.md"
        )
        self.assertEqual(allowed.returncode, 0, allowed.stderr)
        self.assertIn("WRITE_ALLOWED", allowed.stdout)

    def test_guard_allows_ui_after_compile_but_blocks_generated_skill_edit(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        allowed = self.run_flow("guard-write", "--path", "src/App.tsx")
        self.assertEqual(allowed.returncode, 0, allowed.stderr)
        generated = self.run_flow(
            "guard-write",
            "--path",
            ".agents/skills/example-product-ui/SKILL.md",
        )
        self.assertNotEqual(generated.returncode, 0)
        self.assertIn("edit PROJECT-UI.md", generated.stderr)

    def test_verify_requires_structured_quality_report(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        report = self.root / ".design-flow" / "QUALITY-REPORT.md"
        report.write_text("# Quality Report\n\nToo short.\n", encoding="utf-8")
        rejected = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(rejected.returncode, 0)
        report.write_text(
            "# Quality Report\n\n## Scope\n\nSurface.\n\n## Evidence\n\n"
            "| E1 | Browser | PASS / FAIL / SKIPPED | yes / no |\n\n"
            "## Findings\n\nNone.\n\n## Final verdict\n\n"
            "- Verdict: PASS / PASS_WITH_NOTES / FAIL / BLOCKED\n",
            encoding="utf-8",
        )
        unresolved = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(unresolved.returncode, 0)
        self.assertIn("unresolved template choice", unresolved.stderr)
        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal product surface.\n\n"
            "## Evidence\n\n| ID | Dimension | Result |\n|---|---|---|\n"
            "| E1 | Browser, keyboard, and build | PASS |\n\n"
            "## Findings\n\nNo blocking divergence remains; skipped checks are named.\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        verified = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertEqual(verified.returncode, 0, verified.stderr)
        status = self.run_flow("status", "--json")
        self.assertEqual(status.returncode, 0, status.stderr)
        self.assertEqual(json.loads(status.stdout)["phase"], "verified")

    def test_duplicate_manifest_keys_are_rejected(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        manifest = self.root / ".design-flow" / "workflow.json"
        manifest.write_text('{"schema_version":"1.0","schema_version":"1.0"}\n')
        result = self.run_flow("status")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate JSON key", result.stderr)

    def test_duplicate_project_skill_frontmatter_keys_are_rejected(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        project_ui = self.root / ".design-flow" / "artifacts" / "PROJECT-UI.md"
        project_ui.write_text(
            project_ui.read_text(encoding="utf-8").replace(
                "name: example-product-ui\n",
                "name: example-product-ui\nname: example-product-ui\n",
                1,
            ),
            encoding="utf-8",
        )
        result = self.run_flow("ready")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate frontmatter key", result.stderr)


if __name__ == "__main__":
    unittest.main()
