#!/usr/bin/env python3
"""Inspect repository facts for AGENTS.md authoring without executing project code."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
MAX_FILES = 50_000
MAX_INSPECTED_FILE_BYTES = 1_000_000
IGNORED_DIRECTORIES = {
    ".git",
    ".hg",
    ".pulumi",
    ".svn",
    ".terraform",
    ".terragrunt-cache",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "vendor",
}
PRIVATE_FILE_NAMES = {
    ".env",
    ".npmrc",
    ".pypirc",
    "credentials",
    "credentials.json",
}
MANIFEST_NAMES = {
    "Chart.yaml",
    "Cargo.toml",
    "Gemfile",
    "Pulumi.yaml",
    "ansible.cfg",
    "cdk.json",
    "go.mod",
    "helmfile.yaml",
    "helmfile.yml",
    "kustomization.yaml",
    "kustomization.yml",
    "package.json",
    "pom.xml",
    "pyproject.toml",
    "requirements.txt",
    "serverless.yaml",
    "serverless.yml",
    "terragrunt.hcl",
}
LOCKFILE_MANAGERS = {
    "bun.lock": "bun",
    "bun.lockb": "bun",
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
}
INFRASTRUCTURE_LOCKFILES = {".terraform.lock.hcl": "terraform-opentofu"}
INFRASTRUCTURE_EXACT_FILES = {
    "Chart.yaml": "helm",
    "Pulumi.yaml": "pulumi",
    "Pulumi.yml": "pulumi",
    "Vagrantfile": "vagrant",
    "ansible.cfg": "ansible",
    "cdk.json": "aws-cdk",
    "helmfile.yaml": "helm",
    "helmfile.yml": "helm",
    "kustomization.yaml": "kustomize",
    "kustomization.yml": "kustomize",
    "serverless.yaml": "serverless",
    "serverless.yml": "serverless",
    "terragrunt.hcl": "terragrunt",
}
INFRASTRUCTURE_DIRECTORY_TOOLS = {
    "charts": "helm",
    "clusters": "kubernetes",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "manifests": "kubernetes",
    "playbooks": "ansible",
    "policies": "opa",
    "policy": "opa",
    "roles": "ansible",
}
ENVIRONMENT_CONTAINER_NAMES = {"clusters", "environments", "envs", "overlays"}
LIVE_MUTATION_COMMAND_NAMES = {
    "apply",
    "delete",
    "deploy",
    "destroy",
    "migrate",
    "promote",
    "publish",
    "purge",
    "reconcile",
    "release",
    "rollback",
    "rotate",
}
LIVE_READ_COMMAND_NAMES = {"diff", "drift", "plan", "preview", "refresh"}
ROOT_SOURCE_NAMES = {"app", "cmd", "infra", "infrastructure", "lib", "pkg", "src"}
ROOT_TEST_NAMES = {"e2e", "spec", "specs", "test", "tests"}
INSTRUCTION_NAMES = {".cursorrules", "AGENTS.md", "CLAUDE.md"}
LANGUAGE_SUFFIXES = {
    ".c": "C",
    ".cc": "C++",
    ".cpp": "C++",
    ".cs": "C#",
    ".go": "Go",
    ".java": "Java",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".kt": "Kotlin",
    ".php": "PHP",
    ".py": "Python",
    ".rb": "Ruby",
    ".rs": "Rust",
    ".swift": "Swift",
    ".tf": "HCL",
    ".hcl": "HCL",
    ".rego": "Rego",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".vue": "Vue",
    ".yaml": "YAML",
    ".yml": "YAML",
}
FRAMEWORK_PACKAGES = {
    "@angular/core": "angular",
    "astro": "astro",
    "next": "next",
    "nuxt": "nuxt",
    "react": "react",
    "remix": "remix",
    "svelte": "svelte",
    "vue": "vue",
}
SAFE_SCRIPT_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9:_.-]*$")
MAKE_TARGET = re.compile(r"^([A-Za-z0-9][A-Za-z0-9_.-]*):(?:\s|$)")


def is_private_name(name: str) -> bool:
    return (
        name in PRIVATE_FILE_NAMES
        or name.startswith(".env.")
        or name == "kubeconfig"
        or name.endswith((".kubeconfig", ".tfstate"))
        or ".tfstate." in name
    )


def relative_label(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def warning(code: str, path: str | None = None) -> dict[str, str]:
    item = {"code": code}
    if path:
        item["path"] = path
    return item


def blocked() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "BLOCKED",
        "errors": [
            {
                "code": "invalid-root",
                "message": "root must be an existing, non-symlinked directory",
            }
        ],
    }


def walk_repository(root: Path) -> tuple[list[Path], list[dict[str, str]]]:
    files: list[Path] = []
    warnings: list[dict[str, str]] = []
    for current_raw, directories, names in os.walk(root, topdown=True, followlinks=False):
        current = Path(current_raw)
        safe_directories: list[str] = []
        for name in sorted(directories):
            candidate = current / name
            if name in IGNORED_DIRECTORIES or is_private_name(name):
                continue
            if candidate.is_symlink():
                warnings.append(warning("symlink-skipped", relative_label(candidate, root)))
                continue
            safe_directories.append(name)
        directories[:] = safe_directories

        for name in sorted(names):
            if is_private_name(name):
                continue
            candidate = current / name
            if candidate.is_symlink():
                warnings.append(warning("symlink-skipped", relative_label(candidate, root)))
                continue
            try:
                if candidate.is_file():
                    files.append(candidate)
            except OSError:
                warnings.append(warning("entry-unreadable", relative_label(candidate, root)))
            if len(files) >= MAX_FILES:
                warnings.append(warning("file-limit-reached"))
                return files, warnings
    return files, warnings


def read_small_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_INSPECTED_FILE_BYTES:
            return None
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return None


def inspect_package_json(
    path: Path,
    root: Path,
    package_manager: str | None,
    warnings: list[dict[str, str]],
) -> tuple[list[str], list[dict[str, str]]]:
    label = relative_label(path, root)
    text = read_small_text(path)
    if text is None:
        warnings.append(warning("manifest-unreadable", label))
        return [], []
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        warnings.append(warning("manifest-invalid", label))
        return [], []
    if not isinstance(data, dict):
        warnings.append(warning("manifest-invalid", label))
        return [], []

    dependencies: dict[str, Any] = {}
    for field in ("dependencies", "devDependencies", "peerDependencies"):
        value = data.get(field)
        if isinstance(value, dict):
            dependencies.update(value)
    frameworks = sorted(
        {FRAMEWORK_PACKAGES[name] for name in dependencies if name in FRAMEWORK_PACKAGES}
    )

    commands: list[dict[str, str]] = []
    scripts = data.get("scripts")
    if package_manager and isinstance(scripts, dict):
        for name in sorted(scripts):
            if not isinstance(name, str) or not SAFE_SCRIPT_NAME.fullmatch(name):
                warnings.append(warning("script-name-unsupported", label))
                continue
            commands.append(
                command_evidence(
                    f"{package_manager} run {name}",
                    f"{label}:scripts.{name}",
                    name,
                )
            )
    return frameworks, commands


def inspect_makefile(path: Path, root: Path) -> list[dict[str, str]]:
    text = read_small_text(path)
    if text is None:
        return []
    label = relative_label(path, root)
    targets: set[str] = set()
    for line in text.splitlines():
        match = MAKE_TARGET.match(line)
        if not match:
            continue
        target = match.group(1)
        if target.startswith("."):
            continue
        targets.add(target)
    return [
        command_evidence(f"make {target}", f"{label}:{target}", target)
        for target in sorted(targets)
    ]


def command_evidence(command: str, source: str, name: str) -> dict[str, str]:
    item = {"command": command, "source": source}
    words = {part for part in re.split(r"[^a-z0-9]+", name.lower()) if part}
    if words & LIVE_MUTATION_COMMAND_NAMES:
        item["risk"] = "potential-live-mutation"
    elif words & LIVE_READ_COMMAND_NAMES:
        item["risk"] = "potential-live-read"
    return item


def infrastructure_evidence(files: list[Path], root: Path) -> dict[str, list[str]]:
    tools: set[str] = set()
    configuration_files: set[str] = set()
    lockfiles: set[str] = set()
    backend_files: set[str] = set()
    environment_roots: set[str] = set()

    for path in files:
        label = relative_label(path, root)
        parts = Path(label).parts
        file_tools: set[str] = set()
        exact_tool = INFRASTRUCTURE_EXACT_FILES.get(path.name)
        if exact_tool:
            file_tools.add(exact_tool)
        if path.suffix == ".tf":
            file_tools.add("terraform-opentofu")
        if path.suffix == ".rego":
            file_tools.add("opa")
        for part in parts[:-1]:
            directory_tool = INFRASTRUCTURE_DIRECTORY_TOOLS.get(part.lower())
            if directory_tool:
                file_tools.add(directory_tool)

        if path.name in INFRASTRUCTURE_LOCKFILES:
            tool = INFRASTRUCTURE_LOCKFILES[path.name]
            tools.add(tool)
            lockfiles.add(label)
        if file_tools:
            tools.update(file_tools)
            configuration_files.add(label)
        if path.name in {"backend.tf", "remote-state.tf"} or path.name.endswith(".backend.tf"):
            backend_files.add(label)
        if len(parts) >= 3 and parts[0].lower() in ENVIRONMENT_CONTAINER_NAMES and file_tools:
            environment_roots.add(Path(*parts[:2]).as_posix())

    return {
        "tools": sorted(tools),
        "configuration_files": sorted(configuration_files),
        "lockfiles": sorted(lockfiles),
        "backend_configuration_files": sorted(backend_files),
        "environment_roots": sorted(environment_roots),
    }


def is_ci_file(label: str) -> bool:
    return (
        (label.startswith(".github/workflows/") and label.endswith((".yml", ".yaml")))
        or label in {".gitlab-ci.yml", "Jenkinsfile", "azure-pipelines.yml"}
        or label == ".circleci/config.yml"
    )


def is_documentation_file(path: Path, label: str) -> bool:
    upper = path.name.upper()
    return (
        upper.startswith(("README", "CONTRIBUTING", "SECURITY"))
        or path.name == "PROJECT.md"
        or label.startswith("docs/")
    )


def inspect(root: Path) -> dict[str, Any]:
    files, warnings = walk_repository(root)
    labels = {path: relative_label(path, root) for path in files}

    manifests = sorted(label for path, label in labels.items() if path.name in MANIFEST_NAMES)
    lockfiles = sorted(label for path, label in labels.items() if path.name in LOCKFILE_MANAGERS)
    package_managers = sorted({LOCKFILE_MANAGERS[Path(label).name] for label in lockfiles})
    if len(package_managers) > 1:
        warnings.append(warning("multiple-package-managers"))
    package_manager = package_managers[0] if len(package_managers) == 1 else None

    frameworks: set[str] = set()
    declared_commands: list[dict[str, str]] = []
    root_package = root / "package.json"
    if root_package in labels:
        found_frameworks, commands = inspect_package_json(
            root_package, root, package_manager, warnings
        )
        frameworks.update(found_frameworks)
        declared_commands.extend(commands)

    makefile = root / "Makefile"
    if makefile in labels:
        declared_commands.extend(inspect_makefile(makefile, root))

    language_counts: Counter[str] = Counter()
    for path in files:
        language = LANGUAGE_SUFFIXES.get(path.suffix.lower())
        if language:
            language_counts[language] += 1

    source_roots = sorted(
        label
        for path, label in labels.items()
        if path.is_dir() and path.name in ROOT_SOURCE_NAMES
    )
    test_roots = sorted(
        label
        for path, label in labels.items()
        if path.is_dir() and path.name in ROOT_TEST_NAMES
    )
    # os.walk reports files, so discover known directory roots from file parents too.
    discovered_directories = {
        parent
        for path in files
        for parent in path.parents
        if parent != root and root in parent.parents
    }
    source_roots = sorted(
        {relative_label(path, root) for path in discovered_directories if path.name in ROOT_SOURCE_NAMES}
    )
    test_roots = sorted(
        {relative_label(path, root) for path in discovered_directories if path.name in ROOT_TEST_NAMES}
    )

    nested_project_roots = sorted(
        {
            Path(label).parent.as_posix()
            for label in manifests
            if Path(label).parent.as_posix() != "."
        }
    )
    instruction_files = sorted(
        label for path, label in labels.items() if path.name in INSTRUCTION_NAMES
    )
    documentation_files = sorted(
        label for path, label in labels.items() if is_documentation_file(path, label)
    )
    ci_files = sorted(label for label in labels.values() if is_ci_file(label))
    infrastructure = infrastructure_evidence(files, root)

    deduplicated_warnings = sorted(
        {json.dumps(item, sort_keys=True): item for item in warnings}.values(),
        key=lambda item: (item["code"], item.get("path", "")),
    )
    declared_commands = sorted(
        {json.dumps(item, sort_keys=True): item for item in declared_commands}.values(),
        key=lambda item: (item["command"], item["source"]),
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "status": "WARN" if deduplicated_warnings else "PASS",
        "root": str(root),
        "manifests": manifests,
        "lockfiles": lockfiles,
        "package_managers": package_managers,
        "frameworks": sorted(frameworks),
        "languages": [
            {"name": name, "files": count}
            for name, count in sorted(language_counts.items())
        ],
        "source_roots": source_roots,
        "test_roots": test_roots,
        "nested_project_roots": nested_project_roots,
        "instruction_files": instruction_files,
        "documentation_files": documentation_files,
        "ci_files": ci_files,
        "infrastructure": infrastructure,
        "declared_commands": declared_commands,
        "warnings": deduplicated_warnings,
        "commands_executed": [],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inspect repository facts for evidence-backed AGENTS.md authoring."
    )
    parser.add_argument("--root", required=True, help="repository root to inspect")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    raw_root = Path(args.root).expanduser()
    try:
        if raw_root.is_symlink() or not raw_root.is_dir():
            print(json.dumps(blocked(), indent=2, sort_keys=True))
            return 2
        root = raw_root.resolve(strict=True)
        payload = inspect(root)
    except (OSError, RuntimeError, ValueError):
        print(json.dumps(blocked(), indent=2, sort_keys=True))
        return 2
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
