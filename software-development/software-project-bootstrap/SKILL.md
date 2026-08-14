---
name: software-project-bootstrap
description: "Use when starting a software repository or safely adopting an existing one before product implementation. Discovers project constraints, selects a minimal or spec-driven profile, produces a digest-bound non-destructive file plan, creates portable project and agent contracts without installing or running tooling, and diagnoses bootstrap drift read-only."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client and language or framework. The deterministic helper requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: software, bootstrap, project-init, project-adoption, scaffolding, agent-instructions
---

# Software Project Bootstrap

## Overview

Turn known software-project constraints into a small, portable repository foundation without choosing the product, architecture, framework, or package manager for the user. Support both a new directory and non-destructive adoption of an existing repository through separate discovery, planning, authorization, application, and diagnosis phases.

The deterministic helper creates only reviewed repository files. It never installs dependencies, initializes Git or a specification tool, runs validation commands, generates framework boilerplate, creates CI, commits, pushes, publishes, or deploys.

<HARD-GATE>
Never scaffold while project-defining decisions are unknown, overwrite a conflicting file, follow a symlinked target, write credentials, or treat an approved plan as authorization for unrelated actions. Review the exact file plan and require explicit authorization for those writes. Dependency installation, Git changes, external tool initialization, publication, deployment, deletion, migration, and production mutations always require separate scope and authorization.
</HARD-GATE>

## When to use

- Start a repository for a website, web application, dashboard, TUI, CLI, desktop application, API, backend, library, or package.
- Add a minimal project contract and agent instructions to an existing repository without replacing its conventions.
- Choose between a lightweight foundation and a spec-driven workflow.
- Diagnose whether a previous bootstrap still matches its manifest.
- Establish source roots, test roots, language, package-manager, validation, documentation, and decision boundaries before implementation.

Do not use this skill to invent an underspecified product, choose a framework without evidence, install tooling, generate a full application, design CI/CD, or implement behavior. After bootstrap, route work to the matching engineering skill. Use `infrastructure-project-bootstrap` instead when infrastructure-as-code is the repository's primary product.

### Routing precedence

Choose this skill when the requested outcome is a portable software-repository foundation or diagnosis. Do not run another bootstrapper on the same root unless both tools' exact file ownership has been reviewed. Prefer an existing repository's instructions and ownership over generated defaults.

## Operating modes

| Mode | Use when | Write boundary |
|---|---|---|
| `init` | Target is absent or empty | Create only reviewed files |
| `adopt` | Repository already contains work | Preserve unowned files; create missing managed files; update only the managed `.gitignore` block |
| `doctor` | Check bootstrap health | Read-only; never runs declared commands |

Profiles are independent of modes:

| Profile | Select when | Adds |
|---|---|---|
| `minimal` | Work is small, reversible, and owned by one team | Project contract, agent instructions, safe ignores, selected roots and docs |
| `spec-driven` | Work crosses systems or teams, changes public contracts, migrates data, carries security/compliance risk, or is hard to reverse | Minimal profile plus a generic `specs/` contract |

OpenSpec is an optional recorded choice, not a dependency. The bootstrap never installs or initializes it.

## Workflow

### 1. Inspect before asking

Inspect the target, applicable repository instructions, manifests, lockfiles, source and test layout, package-manager declarations, documentation, CI definitions, and Git status. Do not read credential values or private runtime data.

Classify candidate inputs as:

- **Known** — supported by repository evidence or the user;
- **Decision required** — changes product kind, ownership, public contracts, source/test boundaries, tooling, or validation;
- **Optional** — can be omitted without constraining implementation;
- **Later implementation** — framework files, dependencies, features, CI jobs, or release configuration.

Use [discovery and profile guidance](references/discovery-and-profiles.md) only when a decision remains unresolved.

**Complete when:** every manifest field is known, explicitly open, or removed; no installed executable or familiar stack was treated as project intent.

### 2. Create a temporary manifest

Copy the appropriate template outside the target repository:

```bash
cp <skill-directory>/templates/minimal-manifest.json /tmp/software-project.json
```

Use `spec-driven-manifest.json` only when the risk indicators justify it. Fill the temporary file with observed or approved facts. The field and mode guarantees are in [the bootstrap contract](references/bootstrap-contract.md).

Rules:

- keep credentials and private paths out of all fields;
- treat direct, repeated-quote serialized, dot- or space-separated, compact identifiers in any case with environment or version prefixes/suffixes, URI, bounded-punctuation authorization-wrapper, and bounded ASCII-encoded credential-like assignments as invalid; diagnostics must not repeat the rejected value, and the filter does not replace direct inspection;
- reject malformed JSON, including numeric literals beyond the runtime's bounded integer conversion, with a controlled generic diagnostic and no generated project root;
- declare validation commands without claiming they ran;
- record package managers only when the repository or user selected them;
- use literally canonical portable repository-relative source and test roots; do not rely on slash, dot-segment, or separator normalization;
- preserve unresolved structural decisions under `open_decisions`;
- do not add frameworks, deployment targets, databases, or services merely because they are common.

**Complete when:** the temporary manifest represents the approved repository contract and parses without hidden defaults.

### 3. Generate a read-only plan

```bash
python3 <skill-directory>/scripts/bootstrap_project.py plan \
  --manifest /tmp/software-project.json \
  --root <project-root> \
  --mode init \
  --json
```

Use `--mode adopt` for an existing non-empty repository. The plan reports:

- `create`, `update`, and `unchanged` actions;
- current and desired content digests;
- collisions and unsafe target states, including ancestor/descendant conflicts, Unicode-normalized case-folded aliases across the complete generated path graph and against entries already present in the target tree, and unsafe nested `.gitignore` negations in adopt mode;
- requested and resolved roots;
- a `plan_digest` binding the validated manifest and every managed-path observation.

`plan` must not create the root or modify a file. A `BLOCKED` plan is a stop condition. Do not delete, rename, overwrite, or move user-owned files to force a green plan without a separate decision. Before mutation, `apply` revalidates every planned action. In `init` mode it prepares the complete tree beside the target and installs it by one rename; in `adopt` mode it journals managed paths and restores them on failure, reporting explicitly if restoration itself cannot complete.

**Complete when:** the plan is `READY`, every path is understood, no collision remains, and the exact digest is retained.

### 4. Review and authorize the foundation

Confirm the plan contains only applicable artifacts:

- `software-project.json` — machine-readable bootstrap source of truth;
- `PROJECT.md` — product kind, roots, constraints, decisions, and validation contract;
- `AGENTS.md` — minimal agent-agnostic boundaries;
- a managed `.gitignore` block for local credentials and machine state;
- `.gitkeep` anchors only for selected source and test roots;
- selected documentation anchors;
- `specs/README.md` only for a selected spec workflow.

Reject framework boilerplate, fake features, package installation, CI, automatic commits, publication, or deployment. Obtain explicit authorization for the reviewed file writes.

**Complete when:** the user has authorized the exact plan scope and existing ownership remains intact.

### 5. Apply the reviewed plan

```bash
python3 <skill-directory>/scripts/bootstrap_project.py apply \
  --manifest /tmp/software-project.json \
  --root <project-root> \
  --mode init \
  --plan-digest 'sha256:<reviewed-digest>' \
  --json
```

Use the same mode as the plan. The helper recomputes the plan immediately before mutation and rechecks root resolution, target type, symlinks, and current content before each write. It uses atomic replacement per file but does not promise a cross-file transaction or protection from a hostile concurrent local process with write permission.

Do not run a package manager, generator, `git init`, spec-tool initialization, validation command, commit, push, or deploy as an implicit post-step.

**Complete when:** status is `APPLIED`, and created/updated/unchanged lists match the authorized plan.

### 6. Diagnose the result read-only

```bash
python3 <skill-directory>/scripts/bootstrap_project.py doctor \
  --root <project-root> \
  --json
```

Interpret precisely:

- `PASS` — required managed artifacts and safety exclusions match the manifest;
- `WARN` — structure is valid, but open decisions or validation gaps remain;
- `FAIL` — required structure, generated contracts, or safety exclusions are missing, drifted, or unsafe.

`commands_executed` must remain an empty array. The doctor validates declarations but does not execute them. Inspect generated files directly. Run repository-native checks separately only after inspecting their scope and side effects.

**Complete when:** doctor output is recorded and structural success is not represented as implemented or tested product behavior.

### 7. Hand off to the specialized workflow

Route the next slice by product interface:

| Product | Next skill |
|---|---|
| Public/content/marketing site | `website-production-engineering` |
| Stateful browser application | `web-application-engineering` |
| Analytical or operational console with dashboard-specific semantics | `dashboard-application-engineering` |
| Full-screen interactive terminal application | `terminal-ui-engineering` |
| Line-oriented scriptable command | `command-line-tool-engineering` |
| Native or packaged graphical desktop application | No desktop specialist is included in this pack; use the repository's desktop workflow and apply architecture, delivery, and completion skills only for their own contracts. |
| Public network API | No API specialist is included in this pack; hand off to the repository's API workflow and preserve its request/response compatibility contract. |
| Backend service without a primary public UI | No backend specialist is included in this pack; hand off to the repository's service workflow and preserve its operational boundaries. |
| Imported library or package | No library/package specialist is included in this pack; hand off to the repository's package workflow and preserve its public programming interface. |
| `other` or an interface not yet classified | Record the missing interface/workflow as an open decision; do not infer a specialist or begin product implementation. |

Use documentation, architecture, delivery, and completion skills only for their own contracts. Bootstrap completion does not imply feature completion. Stop bootstrap after the repository is structurally inspectable and the authorized minimal wiring is applied and diagnosed; product implementation begins in the selected surface skill.

## Output contract

```text
Bootstrap: READY | APPLIED | WARN | BLOCKED
Mode: init | adopt | doctor
Profile: minimal | spec-driven
Kind: <software product kind>

Decisions
- Known: <approved facts>
- Open: <unresolved decisions>

Files
- Created: <paths or none>
- Updated: <paths or none>
- Unchanged: <paths or none>
- Collisions: <paths or none>

Verification
- Plan: <digest and status>
- Doctor: PASS | WARN | FAIL
- Executed checks: <separate commands and results, or none>

Not performed
- <installation, Git, spec tooling, CI, publication, deployment, or other actions not run>
```

Never call `READY` an applied result, or `APPLIED` an implemented or verified product.

## Common pitfalls

- Scaffolding before inspecting the repository.
- Assuming Node, a monorepo, one framework, or one package manager for every product.
- Treating installed tooling as an architectural decision.
- Using `init` against a non-empty repository instead of `adopt`.
- Overwriting `PROJECT.md` or `AGENTS.md` because generated text looks better.
- Executing validation strings merely because the manifest lists them.
- Making Cursor, OpenSpec, GitHub, one operating system, or one agent client mandatory.
- Reusing a digest after the manifest, resolved root, or managed path changes.
- Saying the project works because structural doctor checks pass.

## Verification checklist

- [ ] Repository evidence was inspected before questions or generation.
- [ ] Product kind, language, package manager, roots, and validation are known or explicitly open.
- [ ] The selected profile reflects risk rather than preference.
- [ ] The manifest contains no credentials or private machine assumptions.
- [ ] `plan` completed without changing the target.
- [ ] Every managed path and collision was reviewed.
- [ ] File writes received explicit authorization.
- [ ] `apply` used the exact reviewed digest and mode.
- [ ] Existing non-managed files were preserved; symlinked or conflicting targets were blocked.
- [ ] No dependency, Git, spec-tool, CI, publication, or deployment action ran implicitly.
- [ ] `doctor` ran after the final bootstrap mutation and executed no declared command.
- [ ] The handoff names the specialized next workflow without overstating bootstrap completion.
