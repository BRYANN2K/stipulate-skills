#!/usr/bin/env python3
"""Discover and run deterministic tests shipped with repository skills."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_directories() -> list[Path]:
    directories: set[Path] = set()
    for path in ROOT.rglob("test_*.py"):
        relative = path.relative_to(ROOT)
        if any(part in {".git", "__pycache__", ".build-in-public"} for part in relative.parts):
            continue
        if path.parent.name == "scripts":
            directories.add(path.parent)
    return sorted(directories)


def main() -> int:
    directories = test_directories()
    if not directories:
        print("OK: no deterministic skill tests discovered.")
        return 0

    failed: list[str] = []
    for directory in directories:
        relative = directory.relative_to(ROOT).as_posix()
        print(f"\n==> {relative}", flush=True)
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-v",
                "-s",
                str(directory),
                "-p",
                "test_*.py",
            ],
            cwd=ROOT,
            check=False,
        )
        if result.returncode != 0:
            failed.append(relative)

    if failed:
        print(f"FAILED: deterministic tests failed in {', '.join(failed)}", file=sys.stderr)
        return 1
    print(f"\nOK: deterministic tests passed in {len(directories)} directorie(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
