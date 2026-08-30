#!/usr/bin/env python3
"""Black-box tests for journal_guard.py."""

from __future__ import annotations

import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("journal_guard.py")


def run(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["python3", str(SCRIPT), *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )


def git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        capture_output=True,
        check=False,
    )


class JournalGuardTests(unittest.TestCase):
    def make_repo(self) -> Path:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        repo = Path(temp.name)
        result = git(repo, "init", "-q")
        self.assertEqual(result.returncode, 0, result.stderr)
        return repo

    def test_init_creates_ignored_untracked_private_journal(self) -> None:
        repo = self.make_repo()
        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(result.returncode, 0, result.stderr)

        journal = repo / ".build-in-public" / "journal.md"
        self.assertTrue(journal.is_file())
        self.assertIn("/.build-in-public/", (repo / ".gitignore").read_text())
        self.assertEqual(git(repo, "ls-files", "--cached", "--", ".build-in-public/journal.md").stdout, "")
        self.assertEqual(
            git(repo, "check-ignore", "-q", "--", ".build-in-public/journal.md").returncode,
            0,
        )
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE(journal.stat().st_mode), 0o600)

        check = run("check", "--repo", str(repo), cwd=repo)
        self.assertEqual(check.returncode, 0, check.stderr)
        if os.name == "posix":
            self.assertIn("OK: permissions=no-group-or-other-access", check.stdout)
        else:
            self.assertIn("UNAVAILABLE: permissions=POSIX-mode-check-not-supported", check.stdout)
            self.assertNotIn("OK: permissions=no-group-or-other-access", check.stdout)

    def test_success_output_disclaims_confidentiality(self) -> None:
        repo = self.make_repo()
        initialized = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(initialized.returncode, 0, initialized.stderr)
        self.assertIn("cannot certify confidentiality", initialized.stdout)

        for command in ("check", "scan"):
            with self.subTest(command=command):
                result = run(command, "--repo", str(repo), cwd=repo)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("cannot certify confidentiality", result.stdout)

    def test_init_is_idempotent_and_preserves_existing_journal(self) -> None:
        repo = self.make_repo()
        first = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(first.returncode, 0, first.stderr)
        journal = repo / ".build-in-public" / "journal.md"
        marker = "\n<!-- preserved marker -->\n"
        journal.write_text(journal.read_text() + marker)

        second = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn(marker, journal.read_text())
        self.assertEqual((repo / ".gitignore").read_text().count("/.build-in-public/"), 1)

    def test_existing_ignore_rule_is_reused(self) -> None:
        repo = self.make_repo()
        (repo / ".gitignore").write_text(".build-in-public/**\n")
        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((repo / ".gitignore").read_text(), ".build-in-public/**\n")
        self.assertIn("ignore_rule=already-covered", result.stdout)

    def test_repository_gitignore_is_added_when_only_info_exclude_matches(self) -> None:
        repo = self.make_repo()
        exclude = repo / ".git" / "info" / "exclude"
        with exclude.open("a") as stream:
            stream.write("\n.build-in-public/\n")

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("/.build-in-public/", (repo / ".gitignore").read_text())
        self.assertIn("ignored_by=.gitignore:", result.stdout)

    def test_explicit_local_policy_uses_info_exclude_without_gitignore_mutation(self) -> None:
        repo = self.make_repo()
        result = run(
            "init",
            "--repo",
            str(repo),
            "--ignore-policy",
            "local",
            cwd=repo,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((repo / ".gitignore").exists())
        self.assertIn("/.build-in-public/", (repo / ".git" / "info" / "exclude").read_text())
        self.assertIn("ignore_policy=local", result.stdout)
        self.assertIn("ignored_by=.git/info/exclude:", result.stdout)

        check = run(
            "check",
            "--repo",
            str(repo),
            "--ignore-policy",
            "local",
            cwd=repo,
        )
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertIn("ignored_by=.git/info/exclude:", check.stdout)

    def test_local_policy_requires_check_ignore_to_report_local_source(self) -> None:
        repo = self.make_repo()
        original = b"/.build-in-public/\n"
        (repo / ".gitignore").write_bytes(original)
        exclude = repo / ".git" / "info" / "exclude"
        original_exclude = exclude.read_bytes()

        result = run(
            "init",
            "--repo",
            str(repo),
            "--ignore-policy",
            "local",
            cwd=repo,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((repo / ".gitignore").read_bytes(), original)
        self.assertEqual(exclude.read_bytes(), original_exclude)
        self.assertIn("selected local ignore policy", result.stderr)
        self.assertIn(".gitignore:", result.stderr)

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks unavailable")
    def test_local_policy_rejects_symlinked_info_exclude(self) -> None:
        repo = self.make_repo()
        outside_temp = tempfile.TemporaryDirectory()
        self.addCleanup(outside_temp.cleanup)
        outside = Path(outside_temp.name) / "exclude"
        outside.write_text("outside remains unchanged\n")
        exclude = repo / ".git" / "info" / "exclude"
        exclude.unlink()
        os.symlink(outside, exclude)

        result = run(
            "init",
            "--repo",
            str(repo),
            "--ignore-policy",
            "local",
            cwd=repo,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlinked exclude", result.stderr)
        self.assertEqual(outside.read_text(), "outside remains unchanged\n")
        self.assertFalse((repo / ".gitignore").exists())

    def test_init_preserves_existing_gitignore_bytes_and_crlf(self) -> None:
        repo = self.make_repo()
        original = b"node_modules/\r\n.env\r\n"
        (repo / ".gitignore").write_bytes(original)

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(result.returncode, 0, result.stderr)
        updated = (repo / ".gitignore").read_bytes()
        self.assertTrue(updated.startswith(original))
        self.assertNotIn(b"\n", updated.replace(b"\r\n", b""))
        self.assertIn(b"\r\n/.build-in-public/\r\n", updated)

    def test_custom_filename_stays_in_dedicated_directory(self) -> None:
        repo = self.make_repo()
        result = run(
            "init",
            "--repo",
            str(repo),
            "--journal",
            ".build-in-public/build-log.md",
            cwd=repo,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("/.build-in-public/", (repo / ".gitignore").read_text())
        self.assertEqual(
            git(repo, "check-ignore", "-q", "--", ".build-in-public/build-log.md").returncode,
            0,
        )

    def test_custom_path_outside_dedicated_directory_is_rejected(self) -> None:
        repo = self.make_repo()
        result = run(
            "init",
            "--repo",
            str(repo),
            "--journal",
            "docs/private.md",
            cwd=repo,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("directly under .build-in-public", result.stderr)

    def test_tracked_journal_is_rejected(self) -> None:
        repo = self.make_repo()
        journal = repo / ".build-in-public" / "journal.md"
        journal.parent.mkdir()
        journal.write_text("tracked\n")
        added = git(repo, "add", "-f", ".build-in-public/journal.md")
        self.assertEqual(added.returncode, 0, added.stderr)

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("tracked or staged", result.stderr)
        self.assertFalse((repo / ".gitignore").exists())

    def test_journal_still_present_in_history_is_rejected(self) -> None:
        repo = self.make_repo()
        journal = repo / ".build-in-public" / "journal.md"
        journal.parent.mkdir()
        journal.write_text("previously committed\n")
        self.assertEqual(git(repo, "add", "-f", ".build-in-public/journal.md").returncode, 0)
        committed = git(
            repo,
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.invalid",
            "commit",
            "-qm",
            "add journal",
        )
        self.assertEqual(committed.returncode, 0, committed.stderr)
        self.assertEqual(git(repo, "rm", "--cached", "-q", ".build-in-public/journal.md").returncode, 0)

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("appears in Git history", result.stderr)
        self.assertFalse((repo / ".gitignore").exists())

    def test_history_guard_rejects_renamed_sibling_journal_path(self) -> None:
        repo = self.make_repo()
        journal_dir = repo / ".build-in-public"
        journal_dir.mkdir()
        old = journal_dir / "weekly-notes.md"
        old.write_text("historical journal\n")
        self.assertEqual(git(repo, "add", "-f", ".build-in-public/weekly-notes.md").returncode, 0)
        first = git(
            repo,
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.invalid",
            "commit",
            "-qm",
            "add sibling journal",
        )
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(
            git(
                repo,
                "mv",
                ".build-in-public/weekly-notes.md",
                ".build-in-public/renamed-notes.md",
            ).returncode,
            0,
        )
        second = git(
            repo,
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.invalid",
            "commit",
            "-qm",
            "rename sibling journal",
        )
        self.assertEqual(second.returncode, 0, second.stderr)

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("whole journal tree", result.stderr)
        self.assertFalse((repo / ".gitignore").exists())

    @unittest.skipUnless(hasattr(os, "link"), "hard links unavailable")
    def test_init_rejects_journal_hard_linked_to_staged_file(self) -> None:
        repo = self.make_repo()
        tracked_file = repo / "tracked.md"
        tracked_file.write_text("staged content\n")
        self.assertEqual(git(repo, "add", "tracked.md").returncode, 0)
        journal = repo / ".build-in-public" / "journal.md"
        journal.parent.mkdir()
        os.link(tracked_file, journal)

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("hard links", result.stderr)
        self.assertFalse((repo / ".gitignore").exists())

    @unittest.skipUnless(hasattr(os, "link"), "hard links unavailable")
    def test_check_and_scan_reject_hard_link_added_after_init(self) -> None:
        repo = self.make_repo()
        initialized = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(initialized.returncode, 0, initialized.stderr)
        journal = repo / ".build-in-public" / "journal.md"
        os.link(journal, repo / "alias.md")

        for command in ("check", "scan"):
            with self.subTest(command=command):
                result = run(command, "--repo", str(repo), cwd=repo)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("hard links", result.stderr)

    def test_check_rejects_missing_ignore_coverage(self) -> None:
        repo = self.make_repo()
        journal = repo / ".build-in-public" / "journal.md"
        journal.parent.mkdir()
        journal.write_text("private\n")
        if os.name == "posix":
            journal.parent.chmod(0o700)
            journal.chmod(0o600)

        result = run("check", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("selected repository ignore policy", result.stderr)
        self.assertIn("no matching source", result.stderr)

    @unittest.skipUnless(os.name == "posix", "POSIX permissions unavailable")
    def test_check_rejects_public_journal_directory(self) -> None:
        repo = self.make_repo()
        initialized = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(initialized.returncode, 0, initialized.stderr)
        (repo / ".build-in-public").chmod(0o755)

        result = run("check", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("directory permissions", result.stderr)

    def test_scan_reports_type_and_line_without_echoing_secret(self) -> None:
        repo = self.make_repo()
        initialized = run("init", "--repo", str(repo), cwd=repo)
        self.assertEqual(initialized.returncode, 0, initialized.stderr)
        journal = repo / ".build-in-public" / "journal.md"
        secret = "AKIA" + "ABCDEFGHIJKLMNOP"
        with journal.open("a") as stream:
            stream.write(f"\nunsafe: {secret}\n")

        result = run("scan", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("AWS access key", result.stderr)
        self.assertNotIn(secret, result.stderr)
        self.assertNotIn(secret, result.stdout)

    def test_custom_path_cannot_escape_repository(self) -> None:
        repo = self.make_repo()
        result = run(
            "init",
            "--repo",
            str(repo),
            "--journal",
            "../outside.md",
            cwd=repo,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stay inside", result.stderr)

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks unavailable")
    def test_symlinked_journal_directory_is_rejected(self) -> None:
        repo = self.make_repo()
        outside = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: outside.rmdir() if outside.exists() else None)
        os.symlink(outside, repo / ".build-in-public")

        result = run("init", "--repo", str(repo), cwd=repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)
        self.assertFalse((outside / "journal.md").exists())


if __name__ == "__main__":
    unittest.main()
