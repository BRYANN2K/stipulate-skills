#!/usr/bin/env python3
"""Black-box tests for design_flow.py."""

from __future__ import annotations

import json
import os
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

    def test_approve_rejects_artifact_changed_after_ready(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        self.assertEqual(self.run_flow("ready").returncode, 0)
        design = self.root / ".design-flow" / "artifacts" / "DESIGN.md"
        design.write_text(design.read_text() + "\nUnreviewed mutation.\n", encoding="utf-8")
        result = self.run_flow(
            "approve",
            "--approver",
            "human",
            "--approval-ref",
            "chat:explicit-design-approval",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("changed after ready", result.stderr)

    def test_manifest_scope_change_invalidates_approval(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        path = self.root / ".design-flow" / "workflow.json"
        manifest = json.loads(path.read_text())
        manifest["ui_roots"] = ["not-ui"]
        path.write_text(json.dumps(manifest), encoding="utf-8")
        result = self.run_flow("check-build")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("reviewed workflow scope changed", result.stderr)

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

    def test_compile_rejects_hard_linked_managed_skill(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        destination = self.root / ".agents" / "skills" / "example-product-ui" / "SKILL.md"
        external = self.root.parent / f"{self.root.name}-external-skill.md"
        external.write_bytes(destination.read_bytes())
        self.addCleanup(lambda: external.unlink(missing_ok=True))
        destination.unlink()
        os.link(external, destination)
        source = self.root / ".design-flow" / "artifacts" / "PROJECT-UI.md"
        source.write_text(source.read_text() + "\nA reviewed contract change.\n", encoding="utf-8")
        self.assertEqual(self.run_flow("ready").returncode, 0)
        approved = self.run_flow(
            "approve",
            "--approver",
            "human",
            "--approval-ref",
            "chat:approved-updated-contract",
        )
        self.assertEqual(approved.returncode, 0, approved.stderr)
        before = external.read_bytes()
        result = self.run_flow("compile")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("hard link", result.stderr)
        self.assertEqual(external.read_bytes(), before)

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
        manifest_write = self.run_flow(
            "guard-write", "--path", ".design-flow/workflow.json"
        )
        self.assertNotEqual(manifest_write.returncode, 0)
        self.assertIn("managed workflow manifest", manifest_write.stderr)

    def test_init_rejects_symlinked_workflow_directory(self) -> None:
        external = tempfile.TemporaryDirectory()
        self.addCleanup(external.cleanup)
        (self.root / ".design-flow").symlink_to(Path(external.name), target_is_directory=True)
        result = self.init()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)
        self.assertFalse((Path(external.name) / "workflow.json").exists())

    def test_init_rejects_symlinked_ui_root(self) -> None:
        external = tempfile.TemporaryDirectory()
        self.addCleanup(external.cleanup)
        (self.root / "src").symlink_to(Path(external.name), target_is_directory=True)
        result = self.run_flow(
            "init",
            "--name",
            "Example",
            "--surface",
            "website",
            "--ui-root",
            "src",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)

    def test_init_rejects_project_root_beneath_symlink(self) -> None:
        external = tempfile.TemporaryDirectory()
        self.addCleanup(external.cleanup)
        nested = Path(external.name) / "nested"
        nested.mkdir()
        link = self.root.parent / f"{self.root.name}-root-link"
        link.symlink_to(Path(external.name), target_is_directory=True)
        self.addCleanup(lambda: link.unlink(missing_ok=True))
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "init", "--root", str(link / "nested"), "--name", "Example", "--surface", "website", "--ui-root", "src"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)

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
            "## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser, keyboard, and build | browser evidence | project checks | PASS | yes |\n\n"
            "## Findings\n\nNo blocking divergence remains; skipped checks are named.\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        verified = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertEqual(verified.returncode, 0, verified.stderr)
        status = self.run_flow("status", "--json")
        self.assertEqual(status.returncode, 0, status.stderr)
        self.assertEqual(json.loads(status.stdout)["phase"], "verified")

    def test_verify_rejects_failed_evidence_and_open_blocker(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        report = self.root / ".design-flow" / "QUALITY-REPORT.md"
        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal UI.\n\n## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser | screenshot | browser | FAIL | yes |\n\n"
            "## Findings\n\n### F1 — Broken gate\n\n"
            "- Severity: BLOCKER\n- Disposition: open\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        result = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("failed evidence", result.stderr)
        report.write_text(
            report.read_text(encoding="utf-8").replace("| FAIL |", "| PASS |"),
            encoding="utf-8",
        )
        blocker = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(blocker.returncode, 0)
        self.assertIn("open BLOCKER", blocker.stderr)

        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal UI.\n\n## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser | screenshot | browser | PASS | yes |\n\n"
            "## Findings\n\n### F1 — Fixed gate\n\n"
            "- Severity: BLOCKER\n- Disposition: fixed\n\n"
            "## Dimension verdicts\n\n| Dimension | Verdict |\n|---|---|\n"
            "| Accessibility | FAIL |\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        dimension = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(dimension.returncode, 0)
        self.assertIn("non-passing dimension", dimension.stderr)

        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal UI.\n\n## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser | screenshot | browser | PASS | yes |\n"
            " | E2 | Keyboard | trace | browser | FAIL | yes |\n\n"
            "## Findings\n\nNo findings.\n\n## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        indented = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(indented.returncode, 0)
        self.assertIn("indented evidence", indented.stderr)

        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal UI.\n\n## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser | screenshot | browser | PASS | yes |\n\n"
            "## Findings\n\n### F1 — Contradictory finding\n\n"
            "- Severity: MINOR\n- Disposition: fixed\n"
            "- Severity: BLOCKER\n- Disposition: open\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        duplicate_fields = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertNotEqual(duplicate_fields.returncode, 0)
        self.assertIn("exactly one severity", duplicate_fields.stderr)

    def test_verified_report_drift_invalidates_gate_and_status(self) -> None:
        self.ready_and_approve()
        self.assertEqual(self.run_flow("compile").returncode, 0)
        report = self.root / ".design-flow" / "QUALITY-REPORT.md"
        report.write_text(
            "# Quality Report\n\n## Scope\n\nFinal UI.\n\n## Evidence\n\n"
            "| ID | Dimension | Evidence | Command | Result | Fresh after final mutation? |\n"
            "|---|---|---|---|---|---|\n"
            "| E1 | Browser | screenshot | browser | PASS | yes |\n\n"
            "## Findings\n\nNo findings.\n\n"
            "## Final verdict\n\n- Verdict: PASS\n",
            encoding="utf-8",
        )
        verified = self.run_flow("verify", "--report", ".design-flow/QUALITY-REPORT.md")
        self.assertEqual(verified.returncode, 0, verified.stderr)
        report.write_text(report.read_text() + "\nStale mutation.\n", encoding="utf-8")
        checked = self.run_flow("check-build")
        self.assertNotEqual(checked.returncode, 0)
        self.assertIn("quality report changed", checked.stderr)
        status = self.run_flow("status", "--json")
        payload = json.loads(status.stdout)
        self.assertFalse(payload["quality_report_current"])
        self.assertEqual(payload["phase"], "build-allowed")

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

    def test_malformed_nested_project_skill_frontmatter_is_rejected(self) -> None:
        self.assertEqual(self.init().returncode, 0)
        self.write_artifacts()
        project_ui = self.root / ".design-flow" / "artifacts" / "PROJECT-UI.md"
        project_ui.write_text(
            project_ui.read_text(encoding="utf-8").replace("metadata:\n", "metadata: [\n", 1),
            encoding="utf-8",
        )
        result = self.run_flow("ready")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("metadata mapping", result.stderr)


if __name__ == "__main__":
    unittest.main()
