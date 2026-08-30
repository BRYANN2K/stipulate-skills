---
name: software-project-bootstrap
description: "Use when starting a software repository or safely adopting an existing one before product implementation. Takes the shortest convention-preserving scaffolding path, treats manifests and the deterministic helper as optional hardened tooling, and separates local foundation work from dependency, Git, migration, and live effects."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client and language or framework. The optional deterministic helper requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: software, bootstrap, project-init, project-adoption, scaffolding, agent-instructions
---

# Software Project Bootstrap

## Overview

Create only the repository foundation needed for the requested next step. Inspect first, inherit existing ownership and conventions, and keep framework, package-manager, layout, and process choices open unless the user or repository already settled them.

A direct request to initialize, adopt, or scaffold a named local project authorizes the bounded local files necessary for that request. It does not require a second approval merely because an optional plan, manifest, or helper is used.

<HARD-GATE>
Never overwrite or delete conflicting user-owned content, follow a symlinked write target, write credentials, or guess a project-defining choice that materially changes tooling, ownership, public contracts, or layout. Dependency installation or changes, external generator or specification-tool initialization, Git initialization/commit/push, migration, destructive action, publication, deployment, and production effects require separate explicit scope and authorization.
</HARD-GATE>

## When to use

- Start the local foundation for a website, browser application, dashboard, TUI, CLI, service, library, package, or other software product.
- Add only the requested project contract, agent guidance, directories, ignores, or documentation anchors.
- Adopt an existing repository without replacing its conventions or owned files.
- Diagnose drift in a foundation previously created with the bundled helper.

Do not use this skill to invent an underspecified product, choose a framework without evidence, install tooling, generate a full application, design CI/CD, or implement product behavior. Use `infrastructure-project-bootstrap` when infrastructure-as-code is the repository's primary product.

## Task modes

| Mode | Use it for | Default path |
|---|---|---|
| Bounded edit | Add or adjust a few named foundation files | Inspect the affected paths, write directly, inspect the diff, run a narrow structural check |
| New behavior or surface | Establish a new repository that is ready for its first product slice | Decide only blocking roots/tooling, create the minimum useful structure, then hand off |
| Complex contract or migration | Adopt a populated repository, coordinate several roots/teams, or need repeatable collision/drift evidence | Consider the optional manifest plus plan/digest/apply/doctor profile |
| Release or live effect | Install, publish, deploy, migrate, or mutate external state | Stop at the local foundation and hand off; bootstrap authority does not cover the effect |

The `minimal` and `spec-driven` labels belong to the optional deterministic profile. They are not mandatory project phases. Use durable specification material only when coordination, compatibility, security, migration, or reversibility makes it useful. Organize any plan as independently deliverable slices; do not create an artifact train before useful implementation.

## Workflow

### 1. Inspect and resolve only blocking decisions

Read applicable instructions, manifests, lockfiles, source/test layout, documentation, CI declarations, and Git status. Do not read credential values or private runtime data.

Classify what you find as known, materially unresolved, optional, or later implementation. Ask only questions whose answers change the requested foundation. An installed executable or familiar stack is evidence, not intent. Load [discovery and profile guidance](references/discovery-and-profiles.md) only when evidence and the request do not settle a consequential choice.

### 2. Choose the shortest safe path

For a bounded or empty-root request, create the smallest conventional set of files directly. Prefer existing repository names and layouts. Do not generate `PROJECT.md`, `AGENTS.md`, a manifest, documentation trees, `.gitkeep` files, or specification directories unless the request, existing convention, or near-term work benefits from them.

Before each write, check the exact target and parent ownership. If the requested path conflicts, is symlinked, or would require replacing existing content, pause for that decision. Otherwise the original bounded request is sufficient write authority.

For complex adoption or repeatable scaffolding, the bundled templates and helper are an optional deterministic profile. [The helper contract](references/bootstrap-contract.md) describes its exact schema, managed paths, collision checks, digest, rollback boundary, and doctor semantics. The profile is useful memory and hardening; it is not proof that every project should adopt its taxonomy.

Optional profile commands:

```bash
python3 <skill-directory>/scripts/bootstrap_project.py plan --manifest /tmp/software-project.json --root <project-root> --mode adopt --json
python3 <skill-directory>/scripts/bootstrap_project.py apply --manifest /tmp/software-project.json --root <project-root> --mode adopt --plan-digest 'sha256:<digest>' --json
python3 <skill-directory>/scripts/bootstrap_project.py doctor --root <project-root> --json
```

Use `init` for an absent or empty target and `adopt` for a populated target. A `READY` plan within the already requested file boundary may be applied without asking again. Ask before applying only if the plan adds unrequested artifacts, exposes a collision, changes an earlier material decision, or crosses the original boundary. Never edit the manifest merely to silence a legitimate conflict.

### 3. Create one useful foundation

Keep scaffolding proportional:

- declare a package manager only when selected or observed;
- use repository-relative roots that match the local ecosystem;
- record commands without claiming they ran;
- preserve nearest-scope agent instructions;
- keep credentials and private machine paths out of generated files;
- avoid fake features, speculative providers, unused docs, framework boilerplate, and CI/release configuration.

A new foundation is complete when the next independently useful product slice has a clear home and the requested local files are coherent. Product implementation belongs to the matching surface workflow.

### 4. Verify only what the bootstrap claims

For direct scaffolding, inspect the final files, parse formats that were created, verify links/paths, and run any cheap repository-native structural check that can falsify the claim. Do not run install, build, or test commands merely because a generated file names them.

For the deterministic profile, `doctor` is optional read-only structural evidence. `PASS` means only that its managed artifacts match its manifest; `WARN` exposes open decisions or gaps; `FAIL` exposes drift or unsafe structure. It executes no declared validation command. A helper plan, digest, apply, or doctor result is never feature, test, package, or release proof.

### 5. Hand off without overclaiming

Route the first product slice to the repository's own workflow or the matching specialist: website, web application, dashboard, full-screen TUI, or line-oriented CLI. Desktop, API, backend, library, and package work should follow their established project workflow when no specialist exists here.

Separate local structure from installation, Git history, external tooling, CI, migration, packaging, publication, deployment, and production state. Perform none of those as an implicit post-step.

## Output contract

Report these semantics, in any presentation order or adapter-specific format:

- outcome: what foundation is ready, changed, partial, or blocked;
- scope: root, task mode, and relevant project decisions;
- files: created, changed, preserved, and collisions;
- evidence: direct inspection/checks and optional helper plan/doctor results;
- open decisions and effects not performed.

Do not call a plan an applied result, structural scaffolding implemented product behavior, or a local foundation a release.

## Common pitfalls

- Asking for a second approval after a clear scaffolding request and an unchanged bounded plan.
- Generating contracts, agents files, specs, or docs because a template contains them.
- Assuming Node, a monorepo, one framework, or one package manager.
- Treating installed tooling as a selected architecture.
- Using the hardened helper for a two-file edit that direct inspection can make safely.
- Overwriting existing ownership or forcing a green plan through a collision.
- Executing declared commands, installing dependencies, initializing Git, or publishing as bootstrap cleanup.
- Saying the product works because structural checks pass.

## Verification checklist

- [ ] The request and repository evidence establish the local write boundary and only material ambiguities were asked.
- [ ] Existing ownership, instructions, names, roots, tooling, and Git state were inspected proportionately.
- [ ] The shortest safe path was used; optional artifacts were created only when useful.
- [ ] Requested local writes did not trigger redundant approval.
- [ ] Existing non-owned files and symlink/conflict boundaries were preserved.
- [ ] The optional helper, if used, was described and interpreted only within its managed schema and paths.
- [ ] Checks are fresh and proportional to the structural claims made.
- [ ] Dependency, Git, external tooling, migration, destructive, publication, deployment, and production effects remained separately authorized.
- [ ] The next independently useful product slice has a clear workflow without overstating bootstrap completion.
