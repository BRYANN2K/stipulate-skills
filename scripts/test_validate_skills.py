#!/usr/bin/env python3
"""Regression tests for validate_skills.py."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE_ROOT = Path(__file__).resolve().parents[1]


class ValidatorRegressionTests(unittest.TestCase):
    def make_repo(self) -> Path:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        destination = Path(temp.name) / "repo"
        shutil.copytree(
            SOURCE_ROOT,
            destination,
            ignore=shutil.ignore_patterns(".git", "__pycache__", "*.pyc"),
        )
        result = subprocess.run(
            ["git", "-C", str(destination), "init", "-q"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return destination

    def validate(self, repo: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(repo / "scripts" / "validate_skills.py")],
            cwd=repo,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_private_journal_is_never_validated(self) -> None:
        repo = self.make_repo()
        journal = repo / ".build-in-public" / "journal.md"
        journal.parent.mkdir()
        journal.write_text("password=" + "A" * 24 + "\n```\n", encoding="utf-8")

        result = self.validate(repo)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn("password", result.stdout + result.stderr)

    def test_gitignored_markdown_is_not_validated(self) -> None:
        repo = self.make_repo()
        private = repo / "private-notes.md"
        private.write_text("password=" + "B" * 24 + "\n```\n", encoding="utf-8")
        with (repo / ".gitignore").open("a", encoding="utf-8") as stream:
            stream.write("\n/private-notes.md\n")

        result = self.validate(repo)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn("private-notes", result.stdout + result.stderr)

    def test_secret_diagnostic_never_echoes_matched_value(self) -> None:
        repo = self.make_repo()
        secret = "C" * 24
        (repo / "unsafe.md").write_text(f"password={secret}\n", encoding="utf-8")

        result = self.validate(repo)
        output = result.stdout + result.stderr
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("possible hard-coded secret pattern matched", output)
        self.assertNotIn(secret, output)

    def test_duplicate_skill_name_on_disk_is_rejected(self) -> None:
        repo = self.make_repo()
        source = repo / "infrastructure" / "terraform-change-safety"
        duplicate = repo / "creator" / "terraform-change-safety"
        shutil.copytree(source, duplicate)

        result = self.validate(repo)
        output = result.stdout + result.stderr
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate skill name 'terraform-change-safety'", output)


if __name__ == "__main__":
    unittest.main()
