---
name: agents-md-authoring
description: "Use when creating, adapting, auditing, or splitting AGENTS.md for software, infrastructure, platform, data, or documentation repositories. Supports direct bounded inspection and edits, keeps root and nested scope distinct, preserves human rules, and never invents commands, live state, conventions, compatibility policy, or mutation authority."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client and repository. Optional inspection and validation helpers require Python 3.10 or newer and use only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: agent-workflows
  tags: agents-md, repository-instructions, coding-agents, project-context, infrastructure-as-code, instruction-audit
---

# AGENTS.md Authoring

## Overview

Create the smallest useful repository instruction file from project evidence. Inherit existing human guidance, keep broadly applicable rules at the root, add nested instructions only for material local differences, and prefer links to durable project documentation over a second handbook.

Choose the shortest safe path. A narrow correction may need only the applicable instructions, one or two source files, a direct edit, and a final readback. The named steps below are guidance for broader work, not admission gates.

<HARD-GATE>
Preserve applicable human-authored rules unless the user explicitly supersedes them. Never invent a command, path, convention, architecture, compatibility promise, generated-file policy, live-state claim, environment target, state/backend fact, or mutation authority. Checked-in configuration describes intended configuration, not necessarily current live state. A discovered command, plan, preview, or dry run is not authorization to execute a live mutation.
</HARD-GATE>

## When to use

- Create or update a repository-root or nested `AGENTS.md`.
- Replace generic guidance with project-specific instructions.
- Audit stale, contradictory, duplicated, or overlong instructions.
- Split instructions across a monorepo or materially different environments.
- Reconcile instructions with manifests, CI, contributor docs, generators, public contracts, or infrastructure boundaries.

Do not use this skill for custom personas under `.github/agents/`, a one-off task prompt, an architecture specification, or a substitute for README, CONTRIBUTING, ADRs, runbooks, and focused skills.

## Evidence and scope rules

Use the strongest available source for each instruction:

1. explicit current user decisions;
2. applicable repository instructions and documented ownership;
3. manifests, locks, build/IaC/CI/policy/generator configuration;
4. contributor and architecture documentation, ADRs, and runbooks;
5. current source, tests, and neighboring patterns;
6. maintained upstream documentation for dependencies already selected;
7. external examples as design input only, never as target-project fact.

A rule belongs at the root only when it applies broadly. Put a rule in the nearest nested `AGENTS.md` when commands, generated sources, architecture, language conventions, environment targeting, state ownership, or safety boundaries materially differ. Do not repeat inherited root rules.

Use [the evidence reference](references/agents-md-evidence.md) when authority, scope, infrastructure semantics, or client compatibility is uncertain. Diagnose the active client and its loaded sources only when loading, precedence, truncation, fallback, alias, override, or logical-root behavior is actually disputed. Stale or duplicated prose by itself stays a direct content edit. A client-specific discovery rule is evidence about that runtime, not part of the portable `AGENTS.md` contract.

## Workflow

### 1. Bound and inherit

Confirm the repository root and requested files. Read the applicable root, nested, and aliased instruction files before changing them, and inspect Git status so unrelated work remains untouched. If another generator or bootstrap contract owns an instruction file, update that source or disclose the ownership conflict rather than creating silent drift.

For a bounded request with clear evidence, proceed directly to the relevant source inspection and edit. Ask only when scope, authority, or a substantive change to a human rule is unresolved.

### 2. Inspect only enough source

Read the repository files that establish the proposed rules. For commands, inspect the actual manifest script, task, Make target, or CI step; a name alone does not establish behavior, safety, or success. For infrastructure, separate desired configuration from authorized live readback and do not inspect credentials, local state, kubeconfigs, or private configuration merely to fill the document.

The optional inspector is useful for a new, large, unfamiliar, multi-language, or infrastructure-heavy repository:

```bash
python3 <skill-directory>/scripts/inspect_project.py   --root <repository-root>   > /tmp/agents-md-inspection.json
```

It performs a bounded read-only inventory and does not execute discovered commands, follow symlinks, read common private/state files, or prove command safety or live state. Direct bounded source inspection is sufficient when the relevant files are already known.

For a client-compatibility diagnosis, record the client/version, working directory, logical project root, and observable loaded instruction paths. Probe only the behavior in dispute: root-to-working-directory composition, deeper-scope precedence, primary versus override/fallback names, shared byte-budget truncation, invalid/non-file candidates, or symlink/logical-root behavior. Codex currently supplies observable implementation cases for these behaviors, including `AGENTS.override.md`, configured fallbacks, and a shared default byte budget; never copy those settings into a cross-client promise or an authoring limit. Prefer the client's own instruction-source diagnostics or a minimal fixture over guessing from filenames.

### 3. Draft or patch at the narrowest scope

Keep only instructions that change agent behavior in this repository. State exact commands with their scope and prerequisites; distinguish safe routine actions, actions requiring authorization, and prohibited actions only when the repository supports those distinctions.

Patch existing prose conservatively. Do not replace a human file with a generic scaffold, add a persona, copy another project's rules, or import broad engineering doctrine. [The root template](templates/AGENTS.md) and [nested template](templates/nested-AGENTS.md) are optional starting points for a new file; repository conventions and a smaller direct edit take precedence.

A direct request to create or adapt named instruction files authorizes those bounded file edits. It does not authorize aliases, dependency installation, command execution, commits, pushes, deployment, or live infrastructure changes.

### 4. Verify in proportion to the change

Re-read the final files and diff after the last edit. Confirm that every changed instruction has a repository source or explicit user decision, local links resolve, template markers are gone, and unrelated human rules remain intact.

For a new file, several nested files, risky link/path changes, or machine-consumed workflows, the optional validator can add structural evidence:

```bash
python3 <skill-directory>/scripts/validate_agents_md.py check   --root <repository-root>   --json
```

It checks regular UTF-8 files, balanced fences, repository-local link resolution, unresolved template markers, and obvious credential assignments. It does not prove prose consistency, command correctness, architecture, safety, build success, or live state. Run repository-native checks only when they govern the changed documentation; do not run broad product or infrastructure commands just because `AGENTS.md` mentions them.

Report checks as passed, failed, skipped, unavailable, or not applicable. An unavailable or skipped required check is a gap, not a pass.

## Output contract

Preserve this information in the response:

- files created, updated, and intentionally preserved;
- the evidence supporting material new or changed rules;
- root versus nested scope decisions and unresolved conflicts;
- for compatibility diagnosis, the exact client context and observed loaded-source provenance, including unresolved client-specific cases;
- validation performed, results, and important checks not run;
- actions not implied by the edit, especially execution, commit, push, publication, deployment, and live mutation.

No fixed prose order is required. A user-requested or host presentation adapter may reorder, chunk, summarize, or progressively disclose the response as long as it does not omit evidence, gaps, scope, authorization boundaries, or changed files.

## Common pitfalls

- Copying a popular `AGENTS.md` instead of extracting repository facts.
- Treating a detected tool or installed executable as the project's command contract.
- Treating desired configuration as observed live state.
- Treating Codex override, fallback, byte-budget, symlink, or root behavior as an `AGENTS.md` standard without observing the target client.
- Duplicating root rules into every subtree.
- Adding all plausible best practices until the file becomes a handbook.
- Weakening human rules or editing generated instructions without their source of truth.
- Calling structural validation proof that commands work or the project passes tests.

## Verification checklist

- Did the edit preserve applicable human intent and stay inside the requested scope?
- Does each material command, boundary, or convention trace to project evidence?
- Are root rules broad and nested rules genuinely local?
- If client loading was diagnosed, were the exact loaded sources observed rather than inferred from files on disk?
- Are documented commands clearly separated from commands actually executed?
- Is every validation claim limited to what the check established?
