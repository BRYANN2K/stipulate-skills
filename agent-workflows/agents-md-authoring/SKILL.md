---
name: agents-md-authoring
description: "Use when creating, adapting, auditing, or splitting AGENTS.md for software, infrastructure, platform, data, or documentation repositories. Inspects project evidence read-only, separates root and nested scope, preserves human rules, and never invents commands, live state, conventions, compatibility policy, or mutation authority."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client and repository. The deterministic inspection and validation helpers require Python 3.10 or newer and use only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: agent-workflows
  tags: agents-md, repository-instructions, coding-agents, project-context, infrastructure-as-code, instruction-audit
---

# AGENTS.md Authoring

## Overview

Create or adapt repository instructions from evidence instead of filling a generic manifesto. The same workflow applies to software, infrastructure, platform, data, and documentation repositories. Keep globally applicable facts in the root `AGENTS.md`, move genuinely divergent subproject or environment rules into the nearest nested `AGENTS.md`, and omit anything the repository or user has not established.

The helper scripts are deliberately narrow:

- `inspect_project.py` inventories bounded repository facts without executing project code, reading private configuration, following symlinks, or writing to the target;
- `validate_agents_md.py` checks objective file integrity and safety properties, but does not claim that a command is semantically correct or that prose rules can never conflict.

Use [the evidence and pattern reference](references/agents-md-evidence.md) when deciding whether a rule is global, local, conditional, or unsupported.

## When to use

- Create the first `AGENTS.md` for an existing or new software, infrastructure, platform, data, or documentation repository.
- Replace a generic agent prompt with project-specific commands, boundaries, and conventions.
- Audit an `AGENTS.md` that is stale, overly long, contradictory, vendor-specific, or detached from the source tree.
- Split a multi-project or multi-environment repository into a small root file and scoped nested files.
- Reconcile `AGENTS.md` with manifests, dependency and provider locks, CI, contributor docs, generated-file policy, public contracts, state/backend ownership, environment boundaries, plan/apply workflows, and repository-native checks.
- Adapt the minimal `AGENTS.md` produced by `software-project-bootstrap` or `infrastructure-project-bootstrap` after real project evidence exists.

Do not use this skill to create a custom agent persona under `.github/agents/`, to invent product or infrastructure architecture, to infer live state from configuration, to run every command discovered in the repository, or to overwrite human instructions without reviewing their intent. A root `AGENTS.md` is durable repository guidance, not a task prompt or a substitute for README, CONTRIBUTING, ADRs, runbooks, or skills.

## Evidence hierarchy

Use the highest available authority for each claim:

1. explicit current user decisions;
2. existing applicable repository instructions and documented ownership;
3. manifests, dependency/provider locks, build and IaC configuration, CI workflows, policy configuration, and generator configuration;
4. CONTRIBUTING, README, architecture docs, ADRs, and runbooks;
5. current source, tests, and neighboring implementation patterns;
6. maintained upstream documentation for dependencies already selected by the project;
7. external repository examples, only as design evidence rather than project fact.

Every command, path, generated-file rule, compatibility promise, state/backend statement, environment target, and mutation boundary in the result needs a repository source or explicit user decision. Unknown facts become an open question or are omitted. Do not turn an installed executable, a familiar framework/provider, a configuration file, or an external example into project intent or evidence of live state.

## Engineering principles

Include these principles only when they do not conflict with a stronger repository contract:

- choose the simplest implementation that fully meets the current requirement;
- grow the system through working, reviewable end-to-end slices rather than unfinished horizontal layers;
- keep components modular and concerns separated at boundaries the current design actually needs;
- inspect dependencies already present — including packages, modules, providers, charts, collections, documentation, schemas, and types — before adding or reimplementing behavior;
- prefer a mature, maintained library, module, provider, chart, or collection when it demonstrably lowers total complexity or improves reliability;
- preserve released or explicitly supported public contracts and durable state, including resource addresses, schemas, module inputs/outputs, APIs, and persisted data; allow a breaking change only when the project or user explicitly authorizes it and the migration is understood;
- permit a temporary workaround only when its scope, removal condition, and risk are visible;
- treat plan, preview, diff, and dry-run output as review evidence rather than authorization to apply, deploy, reconcile, destroy, or migrate;
- study internal patterns first, then inspect established external implementations when a decision is unfamiliar, consequential, or difficult to reverse; adapt proven ideas instead of copying them blindly.

Never add a universal rule that says to discard backward compatibility, reject every temporary solution, research competitors before every edit, or optimize architecture for an imagined future. Those decisions are contextual.

## Workflow

### 1. Establish the target and current instruction scope

Confirm the repository root and the files the user wants created or updated. Read any existing root and nested `AGENTS.md`, plus instruction aliases such as `CLAUDE.md` or `.cursorrules`, before drafting. Inspect Git status so unrelated changes remain outside the task.

Treat existing human-authored rules as owned content. Patch them conservatively; do not replace them with the template merely because the template is newer or more complete.

If `software-project-bootstrap` or `infrastructure-project-bootstrap` still manages the root `AGENTS.md`, identify that ownership before editing. The new skill may audit and propose changes immediately, but writing a richer root file requires either updating the owning generator/contract or an explicit ownership transfer. A direct edit otherwise creates intentional bootstrap doctor drift; surface that consequence instead of hiding it.

**Complete when:** the target root, applicable existing instructions, ownership, requested write scope, and unrelated worktree changes are accounted for.

### 2. Produce a read-only inventory

Run the inspector and keep its output outside the repository unless the user requests a durable report:

```bash
python3 <skill-directory>/scripts/inspect_project.py \
  --root <repository-root> \
  > /tmp/agents-md-inspection.json
```

Interpret its output narrowly:

- `manifests`, `lockfiles`, languages, roots, CI files, and instruction files are observed paths;
- `infrastructure` records path-based evidence for IaC tools, configuration, backend declarations, locks, and environment roots without parsing live state;
- `declared_commands` contains invocations derived from package-script names and Make targets, not proof that their underlying recipes are safe, offline, authorized, or working; an optional `risk` is a warning, never a complete safety classification;
- `WARN` means evidence was partial or ambiguous;
- `commands_executed` must remain empty.

The inspector ignores private filenames, Terraform/OpenTofu state, kubeconfigs, common dependency/build/IaC cache directories, and symlinks. It never imports repository modules, invokes package managers or infrastructure tools, parses shell recipes, reads `.env` values, queries a backend/cluster/provider, or evaluates configuration.

**Complete when:** the inventory is captured, all warnings are understood, and no inventory field has been mistaken for authorization or successful execution.

### 3. Verify candidate facts at their source

Read only the relevant source files identified by the inventory. For each instruction candidate, record:

```text
Candidate: <proposed instruction>
Scope: root | <subtree>
Source: <repository path and field/section, or explicit user decision>
Status: verified | conditional | unknown | conflicting
```

For commands, inspect the actual manifest script, Make target, task definition, or CI step before including the invocation. Prefer the smallest focused static check. A plan or preview can still require credentials, contact live systems, refresh state, acquire locks, download providers, reveal sensitive diffs, or run hooks; inspect and authorize it separately. Never derive apply authorization from a successful plan.

For infrastructure, distinguish desired configuration in the repository from observed live state. Determine state/backend ownership, environment/workspace/cluster targeting, generated sources, provider/module locks, and policy gates only from explicit repository evidence. Do not read local state or credentials to fill the document.

For compatibility, determine whether the project is an application, unreleased internal tool, published package/module, public API, CLI, file format, protocol, database schema, resource address, state schema, CRD, or other durable boundary. Do not infer a breaking-change policy from project age or personal preference.

**Complete when:** every proposed instruction has provenance and every unknown or conflict is omitted, resolved from evidence, or presented to the user.

### 4. Partition root and nested scope

Put a rule in the root only when it applies to nearly every task in the repository. Typical root content is:

- one-paragraph project context;
- authoritative files to read first;
- exact setup, focused static validation, and separately classified plan/preview commands;
- a short repository map;
- global generated-file, dependency/provider, state/backend, environment, security, Git, release, and live-mutation boundaries;
- completion criteria;
- pointers to nested instruction scopes.

Create a nested `AGENTS.md` only when a subtree has materially different commands, language/IaC conventions, architecture, generated files, environment/cluster targeting, state ownership, or safety boundaries. Do not duplicate root rules in nested files. State the subtree scope and only add or override what differs.

Prefer references to durable project docs over copying long architecture, API, release, or runbook content into agent instructions.

**Complete when:** every rule has one narrowest correct scope and no nested file exists merely to reorganize prose.

### 5. Draft from the minimal templates

Use [the root template](templates/AGENTS.md) for global instructions and [the nested template](templates/nested-AGENTS.md) only for divergent subprojects. Remove all comments, unresolved markers, empty headings, and inapplicable defaults before writing to the repository.

Use the boundary vocabulary consistently:

- **Always** — safe behavior expected without further approval;
- **Ask first** — an action or decision requiring explicit scope or authorization;
- **Never** — prohibited behavior that is valid for this repository, not a generic preference.

Do not add a persona, motivational prose, style rules already enforced automatically, commands copied from another project, or broad architectural doctrine. Shorter is better when every remaining line changes agent behavior.

**Complete when:** the draft contains only verified, scoped instructions and no template marker or speculative rule remains.

### 6. Review changes before writing or replacing

If the user already authorized creation or adaptation of the named files, write only those files. If a substantive existing instruction would be removed, weakened, or moved to another scope, show that semantic change and obtain confirmation before applying it.

Preserve line endings and unrelated content. Do not create aliases or symlinks for other agent clients unless requested and supported by that client.

**Complete when:** the written files match the authorized scope and existing human intent was preserved or explicitly superseded.

### 7. Validate objective integrity

Run the validator after the last edit:

```bash
python3 <skill-directory>/scripts/validate_agents_md.py check \
  --root <repository-root> \
  --json
```

It checks:

- root and nested `AGENTS.md` files are regular UTF-8 files, not symlinks;
- Markdown fences are balanced;
- local Markdown links remain inside the repository and resolve;
- no template marker remains;
- no obvious hard-coded credential assignment is present.

It does not execute commands, judge architecture, prove natural-language consistency, or certify that a command is safe. Review the final diff and the provenance table separately.

**Complete when:** validator status is `PASS`, every changed file is accounted for, and semantic review found no unsupported instruction.

### 8. Exercise only applicable repository checks

Inspect each proposed validation command before executing it. Run only safe, relevant checks authorized by the current task. A docs-only `AGENTS.md` change normally needs the instruction validator, repository Markdown/catalog checks, and `git diff --check`; it does not justify an expensive full product suite unless the repository requires one.

Report passed, failed, skipped, unavailable, and not-applicable checks separately. Never claim that commands listed in `AGENTS.md` ran merely because the file validates.

**Complete when:** fresh evidence covers the files changed and unexecuted checks are explicit.

## Output contract

```text
AGENTS.md authoring: READY | UPDATED | BLOCKED
Repository: <root>

Evidence
- Verified: <facts with repository sources>
- Conditional: <rules requiring context>
- Unknown or conflicting: <items omitted or awaiting a decision>

Scope
- Root: <global instructions>
- Nested: <subtree → local differences, or none>

Files
- Created: <paths or none>
- Updated: <paths or none>
- Preserved: <existing instruction files or none>

Validation
- AGENTS.md validator: PASS | FAIL | NOT RUN
- Repository checks: <command → result>
- Commands discovered but not executed: <commands or none>

Not performed
- <commits, pushes, installs, broad tests, publication, deployment, or other actions not run>
```

`READY` means an evidence-backed proposal exists but has not been written. `UPDATED` means authorized files were written and verified. Neither status implies commit, push, publication, deployment, or successful execution of commands merely documented in the instructions.

## Common pitfalls

- Copying a popular `AGENTS.md` instead of extracting repository facts.
- Treating GitHub custom agents under `.github/agents/` as the same artifact as root repository instructions.
- Putting task-specific research or one-off implementation details into durable global instructions.
- Adding every best practice until the root file becomes a second handbook.
- Duplicating root rules in every package instead of relying on scoped precedence.
- Inventing setup or test commands from the detected language or framework.
- Running package scripts, Make recipes, plans, previews, applies, deploys, or reconciliations simply because the inspector named them.
- Treating checked-in desired configuration as proof of current live resources, drift, health, or rollout status.
- Reading Terraform/OpenTofu state, kubeconfigs, generated secrets, or backend credentials to make the instructions look complete.
- Replacing a compatibility policy with a universal “never preserve” or “never break” rule.
- Moving long workflows into `AGENTS.md` when a skill, runbook, ADR, or contributor guide owns them better.
- Editing generated instructions without updating their actual source of truth.
- Adapting a bootstrap-managed root file without declaring the ownership transfer and expected doctor drift.
- Calling structural validation proof that the project builds or tests pass.

## Verification checklist

- [ ] Existing root, nested, and aliased instruction files were read before drafting.
- [ ] Inventory completed without writes, command execution, private-file reads, or symlink traversal.
- [ ] Every command, path, convention, generated-file rule, and boundary has repository provenance.
- [ ] Compatibility, dependency/provider, state/backend, environment, and mutation policy reflect the real project contract.
- [ ] Root instructions are global; nested files contain only material local differences.
- [ ] Human-authored rules were preserved unless explicitly superseded.
- [ ] All template markers and inapplicable sections were removed.
- [ ] `validate_agents_md.py check` returned `PASS` after the final edit.
- [ ] The final diff contains no secret, broken link, unrelated edit, or duplicated instruction.
- [ ] Executed and merely documented commands are reported separately.
- [ ] Commit, push, publication, deployment, installation, and broad tests were not implied by file-write authorization.
