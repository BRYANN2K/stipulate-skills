#!/usr/bin/env python3
"""Black-box tests for the Hermes Web Craft hook adapter."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).with_name("hermes_pre_tool_guard.py")
FLOW = Path(__file__).with_name("design_flow.py")


class HermesPreToolGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)

    def hook(self, tool_name: str, tool_input: dict[str, object]) -> dict[str, str]:
        result = subprocess.run(
            [sys.executable, str(HOOK)],
            input=json.dumps(
                {
                    "hook_event_name": "pre_tool_call",
                    "tool_name": tool_name,
                    "tool_input": tool_input,
                    "session_id": "test",
                    "cwd": str(self.root),
                    "extra": {},
                }
            ),
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def init(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(FLOW),
                "init",
                "--root",
                str(self.root),
                "--name",
                "Example",
                "--surface",
                "website",
                "--ui-root",
                "src",
            ],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_no_manifest_is_noop(self) -> None:
        self.assertEqual(self.hook("write_file", {"path": "src/App.tsx"}), {})

    def test_blocks_direct_ui_write_before_approval(self) -> None:
        self.init()
        result = self.hook("write_file", {"path": "src/App.tsx", "content": "x"})
        self.assertEqual(result.get("action"), "block")
        self.assertIn("frontend build is blocked", result.get("message", ""))

    def test_allows_design_artifact_write(self) -> None:
        self.init()
        result = self.hook(
            "write_file",
            {"path": ".design-flow/artifacts/DESIGN.md", "content": "# Design"},
        )
        self.assertEqual(result, {})

    def test_blocks_v4a_patch_touching_ui(self) -> None:
        self.init()
        result = self.hook(
            "patch",
            {
                "mode": "patch",
                "patch": "*** Begin Patch\n*** Update File: src/App.tsx\n-old\n+new\n*** End Patch",
            },
        )
        self.assertEqual(result.get("action"), "block")

    def test_blocks_direct_write_when_target_path_is_missing(self) -> None:
        self.init()
        result = self.hook("write_file", {"content": "missing target"})
        self.assertEqual(result.get("action"), "block")
        self.assertIn("could not determine paths", result.get("message", ""))

    def test_blocks_suspicious_terminal_mutation_but_allows_read_only(self) -> None:
        self.init()
        blocked = self.hook(
            "terminal", {"command": "printf 'x' > src/App.tsx", "workdir": str(self.root)}
        )
        self.assertEqual(blocked.get("action"), "block")
        self.assertEqual(
            self.hook("terminal", {"command": "git status --short", "workdir": str(self.root)}),
            {},
        )


if __name__ == "__main__":
    unittest.main()
