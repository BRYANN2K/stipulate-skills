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

    def raw_hook(self, payload: str) -> dict[str, str]:
        result = subprocess.run(
            [sys.executable, str(HOOK)],
            input=payload,
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

    def test_blocks_mixed_patch_payload_instead_of_trusting_benign_path(self) -> None:
        self.init()
        result = self.hook(
            "patch",
            {
                "mode": "patch",
                "path": "README.md",
                "patch": "*** Begin Patch\n*** Update File: src/App.tsx\n-old\n+new\n*** End Patch",
            },
        )
        self.assertEqual(result.get("action"), "block")
        self.assertIn("ambiguous", result.get("message", ""))
        malformed = self.hook(
            "patch",
            {
                "mode": "patch",
                "patch": "garbage\n*** Update File: .design-flow/artifacts/DESIGN.md\n-old\n+new",
            },
        )
        self.assertEqual(malformed.get("action"), "block")

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

    def test_blocks_terminal_allowlist_substring_and_interpreter_bypasses(self) -> None:
        self.init()
        marker = self.hook(
            "terminal", {"command": "printf x > src/App.tsx # design_flow.py"}
        )
        self.assertEqual(marker.get("action"), "block")
        interpreter = self.hook(
            "terminal",
            {"command": "python3 -c \"from pathlib import Path; Path('src/App.tsx').write_text('x')\""},
        )
        self.assertEqual(interpreter.get("action"), "block")
        preprocessor = self.hook("terminal", {"command": "rg --pre=python3 needle src"})
        self.assertEqual(preprocessor.get("action"), "block")
        output = self.hook("terminal", {"command": "git diff --output=src/App.tsx"})
        self.assertEqual(output.get("action"), "block")
        attacker = self.root / "attacker"
        attacker.mkdir()
        fake_python = attacker / "python3"
        fake_python.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        fake_python.chmod(0o755)
        fake_cat = attacker / "cat"
        fake_cat.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        fake_cat.chmod(0o755)
        fake_flow = self.hook(
            "terminal",
            {"command": f"{fake_python} {FLOW} status --root {self.root}"},
        )
        self.assertEqual(fake_flow.get("action"), "block")
        fake_read = self.hook("terminal", {"command": f"{fake_cat} README.md"})
        self.assertEqual(fake_read.get("action"), "block")

    def test_terminal_uses_explicit_workdir_to_find_the_gate(self) -> None:
        self.init()
        payload = json.dumps(
            {
                "hook_event_name": "pre_tool_call",
                "tool_name": "terminal",
                "tool_input": {
                    "command": "python3 /tmp/arbitrary-writer.py",
                    "workdir": str(self.root),
                },
                "cwd": str(self.root.parent),
                "session_id": "test",
                "extra": {},
            }
        )
        result = self.raw_hook(payload)
        self.assertEqual(result.get("action"), "block")

    def test_malformed_and_duplicate_hook_payloads_fail_closed(self) -> None:
        self.assertEqual(self.raw_hook("[]").get("action"), "block")
        duplicate = (
            '{"hook_event_name":"pre_tool_call","tool_name":"write_file",'
            '"tool_input":{"path":"src/App.tsx"},"cwd":"'
            + str(self.root)
            + '","cwd":"'
            + str(self.root)
            + '"}'
        )
        self.assertEqual(self.raw_hook(duplicate).get("action"), "block")


if __name__ == "__main__":
    unittest.main()
