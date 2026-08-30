#!/usr/bin/env python3
"""Create and check a Git-ignored journal without claiming confidentiality."""

from __future__ import annotations

import argparse
import os
import re
import stat
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

DEFAULT_JOURNAL = ".build-in-public/journal.md"
JOURNAL_HISTORY_PATHSPEC = ":(glob).build-in-public/**"
MAX_SCAN_BYTES = 10 * 1024 * 1024
MAX_SCAN_FINDINGS = 100
IGNORE_RULE = "/.build-in-public/"
IGNORE_COMMENT = "# Private build-in-public evidence journal"
IGNORE_POLICIES = ("repository", "local")
LIMIT_MESSAGE = (
    "LIMIT: path/Git/permission/pattern checks cannot certify confidentiality or publication safety"
)
SAFE_PATH_RE = re.compile(r"^[A-Za-z0-9._/-]+$")

SECRET_PATTERNS = (
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
    ("AWS access key", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("GitHub token", re.compile(r"\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}\b")),
    ("GitLab token", re.compile(r"\bglpat-[A-Za-z0-9_-]{20,}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Google API key", re.compile(r"\bAIza[A-Za-z0-9_-]{35}\b")),
    ("OpenAI-style key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("Stripe live key", re.compile(r"\b[rs]k_live_[A-Za-z0-9]{20,}\b")),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")),
    (
        "credential assignment",
        re.compile(
            r"(?i)\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|"
            r"private[_-]?key|secret|password|passwd)\b\s*[:=]\s*[\"']?"
            r"(?!false\b|none\b|null\b|redacted\b|example\b|your[-_])[^\s\"']{12,}"
        ),
    ),
    (
        "credential in URL",
        re.compile(r"\b[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@[^\s/]+", re.IGNORECASE),
    ),
)


class GuardError(RuntimeError):
    """A journal safety invariant failed."""


@dataclass(frozen=True)
class IgnoreMatch:
    source: str
    line: str
    pattern: str
    pathname: str

    def __str__(self) -> str:
        return f"{self.source}:{self.line}:{self.pattern}\t{self.pathname}"


def git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        text=True,
        capture_output=True,
        check=False,
    )
    if check and result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown Git error"
        raise GuardError(f"git {' '.join(args)} failed: {detail}")
    return result


def repository_root(candidate: str) -> Path:
    requested = Path(candidate).expanduser()
    if not requested.exists() or not requested.is_dir():
        raise GuardError(f"repository path is not a directory: {requested}")
    result = subprocess.run(
        ["git", "-C", str(requested), "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise GuardError(f"not inside a Git repository: {requested}")
    return Path(result.stdout.strip()).resolve()


def journal_relative_path(raw: str) -> str:
    if not raw or "\\" in raw or not SAFE_PATH_RE.fullmatch(raw):
        raise GuardError("journal path must be a non-empty POSIX-style relative path")
    pure = PurePosixPath(raw)
    if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
        raise GuardError("journal path must stay inside the repository")
    if len(pure.parts) != 2 or pure.parts[0] != ".build-in-public" or pure.suffix.lower() != ".md":
        raise GuardError("journal must be a Markdown file directly under .build-in-public/")
    return pure.as_posix()


def ensure_path_is_safe(root: Path, relative: str) -> Path:
    target = root.joinpath(*PurePosixPath(relative).parts)
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        if os.path.lexists(current) and current.is_symlink():
            raise GuardError(f"refusing symlink in journal path: {current.relative_to(root)}")
    try:
        target.resolve(strict=False).relative_to(root)
    except ValueError as exc:
        raise GuardError("journal path escapes repository") from exc
    return target


def ensure_single_link_file(target: Path) -> None:
    try:
        file_stat = os.lstat(target)
    except FileNotFoundError:
        raise GuardError(f"journal does not exist: {target.name}; run init first") from None
    if not stat.S_ISREG(file_stat.st_mode):
        raise GuardError(f"journal path is not a regular file: {target.name}")
    if file_stat.st_nlink != 1:
        raise GuardError(
            f"journal has {file_stat.st_nlink} hard links; "
            "refusing a file that may alias tracked or shared data"
        )


def tracked(root: Path, relative: str) -> bool:
    result = git(root, "ls-files", "--cached", "--", relative)
    return bool(result.stdout.strip())


def journal_tree_present_in_history(root: Path) -> bool:
    """Return whether any ref records any path below .build-in-public/."""
    result = git(
        root,
        "log",
        "--all",
        "--format=%H",
        "--",
        JOURNAL_HISTORY_PATHSPEC,
    )
    return bool(result.stdout.strip())


def ignore_source(root: Path, relative: str) -> IgnoreMatch | None:
    result = subprocess.run(
        ["git", "-C", str(root), "check-ignore", "-v", "-z", "--stdin"],
        input=f"{relative}\0",
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode == 0 and result.stdout:
        parts = result.stdout.rstrip("\0").split("\0")
        if len(parts) != 4:
            raise GuardError("git check-ignore returned an unexpected response")
        return IgnoreMatch(*parts)
    if result.returncode == 1:
        return None
    detail = result.stderr.strip() or result.stdout.strip() or "unknown Git error"
    raise GuardError(f"git check-ignore failed: {detail}")


def ignore_match_path(root: Path, match: IgnoreMatch | None) -> Path | None:
    if match is None:
        return None
    source = Path(match.source).expanduser()
    if not source.is_absolute():
        source = root / source
    return source.resolve(strict=False)


def git_local_exclude(root: Path) -> Path:
    """Resolve Git's repository-local exclude file, including linked worktrees."""
    result = git(root, "rev-parse", "--git-path", "info/exclude")
    raw = result.stdout.strip()
    if not raw:
        raise GuardError("git rev-parse returned no path for info/exclude")
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = root / path
    return path


def ignore_file_for_policy(root: Path, policy: str) -> Path:
    if policy == "repository":
        return root / ".gitignore"
    if policy == "local":
        return git_local_exclude(root)
    raise GuardError(f"unsupported ignore policy: {policy}")


def ignored_by_policy(root: Path, match: IgnoreMatch | None, policy: str) -> bool:
    expected = ignore_file_for_policy(root, policy).resolve(strict=False)
    return ignore_match_path(root, match) == expected


def append_ignore_rule(path: Path, *, policy: str) -> bool:
    if os.path.lexists(path) and path.is_symlink():
        raise GuardError(f"refusing to mutate a symlinked {path.name}")
    if path.exists() and not path.is_file():
        raise GuardError(f"ignore source is not a regular file: {path}")
    existing = path.read_bytes() if path.exists() else b""
    rule = IGNORE_RULE.encode("ascii")
    if any(line.strip() == rule for line in existing.splitlines()):
        return False

    newline = b"\r\n" if b"\r\n" in existing else b"\n"
    prefix = existing
    if prefix and not prefix.endswith((b"\n", b"\r")):
        prefix += newline
    if prefix and not prefix.endswith(newline * 2):
        prefix += newline
    path.parent.mkdir(parents=True, exist_ok=True)
    comment = f"{IGNORE_COMMENT} ({policy})".encode("ascii")
    path.write_bytes(prefix + comment + newline + rule + newline)
    return True


def configure_ignore_policy(
    root: Path,
    relative: str,
    policy: str,
) -> tuple[bool, IgnoreMatch]:
    source = ignore_source(root, relative)
    if source is not None and ignored_by_policy(root, source, policy):
        return False, source
    if policy == "local" and source is not None and Path(source.source).name == ".gitignore":
        raise GuardError(
            "selected local ignore policy was not reported by git check-ignore -v; "
            f"a higher-precedence worktree rule was reported: {source}"
        )

    changed = append_ignore_rule(ignore_file_for_policy(root, policy), policy=policy)
    source = ignore_source(root, relative)
    if source is None or not ignored_by_policy(root, source, policy):
        actual = str(source) if source is not None else "no matching source"
        raise GuardError(
            f"selected {policy} ignore policy was not reported by git check-ignore -v; "
            f"reported source: {actual}"
        )
    return changed, source


def template_text(root: Path) -> str:
    template = Path(__file__).resolve().parents[1] / "templates" / "private-journal.md"
    if not template.is_file():
        raise GuardError(f"journal template is missing: {template}")
    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        template.read_text(encoding="utf-8")
        .replace("{{PROJECT}}", root.name)
        .replace("{{CREATED_AT}}", created_at)
    )


def secure_permissions(target: Path) -> None:
    ensure_single_link_file(target)
    if os.name != "posix":
        return
    target.parent.chmod(0o700)
    target.chmod(0o600)
    ensure_single_link_file(target)


def permission_problem(target: Path) -> str | None:
    ensure_single_link_file(target)
    if os.name != "posix":
        return None
    mode = stat.S_IMODE(target.stat().st_mode)
    if mode & 0o077:
        return f"journal permissions are {mode:04o}; expected no group/other access"
    parent_mode = stat.S_IMODE(target.parent.stat().st_mode)
    if parent_mode & 0o077:
        return f"journal directory permissions are {parent_mode:04o}; expected no group/other access"
    return None


def scan_file(target: Path) -> list[tuple[int, str]]:
    ensure_single_link_file(target)
    if target.stat().st_size > MAX_SCAN_BYTES:
        raise GuardError(f"journal exceeds scan limit of {MAX_SCAN_BYTES} bytes")
    try:
        text = target.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise GuardError("journal is not valid UTF-8 text") from exc

    ensure_single_link_file(target)
    findings: list[tuple[int, str]] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append((line_number, label))
                if len(findings) >= MAX_SCAN_FINDINGS:
                    return sorted(set(findings))
    return sorted(set(findings))


def checked_target(repo: str, journal: str, *, require_exists: bool = True) -> tuple[Path, str, Path]:
    root = repository_root(repo)
    relative = journal_relative_path(journal)
    target = ensure_path_is_safe(root, relative)

    if tracked(root, relative):
        raise GuardError(
            f"journal is tracked or staged: {relative}; ignore rules cannot protect tracked files. "
            "Review its history and remove it from the index before continuing."
        )
    if journal_tree_present_in_history(root):
        raise GuardError(
            "a path under .build-in-public/ appears in Git history; the guard checks the whole "
            "journal tree so deleted or renamed sibling journals are not missed. Ignoring or "
            "untracking does not remove earlier content. Review history and rotate any exposed "
            "secret before continuing."
        )
    if require_exists and not os.path.lexists(target):
        raise GuardError(f"journal does not exist: {relative}; run init first")
    if os.path.lexists(target):
        ensure_single_link_file(target)
    return root, relative, target


def command_init(args: argparse.Namespace) -> int:
    root, relative, target = checked_target(args.repo, args.journal, require_exists=False)
    changed_ignore, source = configure_ignore_policy(root, relative, args.ignore_policy)

    created = False
    if not target.exists():
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        descriptor = os.open(target, flags, 0o600)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                stream.write(template_text(root))
        except Exception:
            target.unlink(missing_ok=True)
            raise
        created = True
    secure_permissions(target)

    findings = scan_file(target)
    if findings:
        locations = ", ".join(f"line {line} ({label})" for line, label in findings)
        raise GuardError(f"journal contains possible sensitive data: {locations}")

    print(f"OK: repository={root}")
    print(f"OK: journal={relative} ({'created' if created else 'preserved'})")
    print(f"OK: ignore_policy={args.ignore_policy}")
    print(f"OK: ignore_rule={'updated' if changed_ignore else 'already-covered'}")
    print(f"OK: ignored_by={source}")
    print("OK: secret_scan=0 findings")
    print(LIMIT_MESSAGE)
    return 0


def command_check(args: argparse.Namespace) -> int:
    root, relative, target = checked_target(args.repo, args.journal)
    source = ignore_source(root, relative)
    if not ignored_by_policy(root, source, args.ignore_policy):
        actual = str(source) if source is not None else "no matching source"
        raise GuardError(
            f"selected {args.ignore_policy} ignore policy was not reported by "
            f"git check-ignore -v; reported source: {actual}"
        )
    issue = permission_problem(target)
    if issue:
        raise GuardError(issue)

    print(f"OK: repository={root}")
    print(f"OK: journal={relative}")
    print("OK: tracked=false")
    print(f"OK: ignore_policy={args.ignore_policy}")
    print(f"OK: ignored_by={source}")
    if os.name == "posix":
        print("OK: permissions=no-group-or-other-access")
    else:
        print("UNAVAILABLE: permissions=POSIX-mode-check-not-supported")
    print(LIMIT_MESSAGE)
    return 0


def command_scan(args: argparse.Namespace) -> int:
    _, relative, target = checked_target(args.repo, args.journal)
    findings = scan_file(target)
    if findings:
        print(f"FAILED: {len(findings)} possible sensitive-data finding(s) in {relative}", file=sys.stderr)
        for line, label in findings:
            print(f"  - line {line}: {label}", file=sys.stderr)
        return 1
    print(f"OK: secret_scan=0 findings in {relative}")
    print(LIMIT_MESSAGE)
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    subparsers = root.add_subparsers(dest="command", required=True)
    for command, handler in (
        ("init", command_init),
        ("check", command_check),
        ("scan", command_scan),
    ):
        child = subparsers.add_parser(command)
        child.add_argument("--repo", default=".", help="path inside the target Git repository")
        child.add_argument(
            "--journal",
            default=DEFAULT_JOURNAL,
            help=f"project-relative Markdown path (default: {DEFAULT_JOURNAL})",
        )
        if command in {"init", "check"}:
            child.add_argument(
                "--ignore-policy",
                choices=IGNORE_POLICIES,
                default="repository",
                help=(
                    "repository writes the root .gitignore; local writes Git's resolved "
                    "$GIT_DIR/info/exclude without touching .gitignore"
                ),
            )
        child.set_defaults(handler=handler)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        return args.handler(args)
    except GuardError as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"FAILED: filesystem error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
