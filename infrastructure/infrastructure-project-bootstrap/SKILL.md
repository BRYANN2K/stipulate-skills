---
name: infrastructure-project-bootstrap
description: "Use when starting a new infrastructure repository or safely adopting an existing one. Discovers constraints before scaffolding, selects a minimal or spec-driven profile, produces a reviewable non-destructive file plan, creates portable project and agent contracts without running infrastructure, and diagnoses bootstrap drift."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client and any cloud provider. The optional deterministic helper requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: infrastructure
  tags: infrastructure, bootstrap, scaffolding, project-init, iac, agent-instructions
---

# Infrastructure Project Bootstrap

## Overview

Turn known infrastructure constraints into a small, portable repository foundation without choosing an architecture for the user or mutating infrastructure. The workflow supports a new empty directory and non-destructive adoption of an existing repository. It separates discovery, review, file creation, and diagnosis so an agent cannot silently turn assumptions into project structure.

The deterministic helper creates only repository files. It does not install tools, initialize Git, invoke OpenSpec, execute validation commands, contact a provider, create CI workflows, or run an infrastructure plan/apply.

<HARD-GATE>
Never scaffold while architecture-defining decisions are unknown, overwrite a conflicting file, follow a symlinked target, write credentials, or treat file creation as authorization to initialize Git, install tools, run OpenSpec, generate provider resources, apply, deploy, destroy, reconcile, push, or mutate a live environment. Review the exact bootstrap plan and require explicit authorization for its file writes. Any later operational mutation requires separate explicit authorization for the exact action and target.
</HARD-GATE>

## When to use

- Start a repository for Terraform, OpenTofu, Pulumi, CloudFormation, Bicep, AWS CDK, Ansible, Packer, Docker, Kubernetes, Helm, or Kustomize infrastructure.
- Add a coherent project contract and minimal agent instructions to an existing infrastructure repository.
- Choose between a lightweight bootstrap and a spec-driven workflow.
- Diagnose whether an earlier bootstrap still has its required artifacts and safety exclusions.
- Convert an architecture decision that is already understood into a reviewable repository skeleton.

Do not use this skill to select a cloud architecture from an underspecified idea, review a production Terraform plan, design a delivery pipeline, deploy infrastructure, or generate generic documentation. Use architecture, IaC, delivery, and documentation skills after this bootstrap establishes their context.

### Routing precedence

Prefer this skill when the requested outcome is a portable, provider-neutral, non-destructive repository bootstrap or diagnosis. If another installed bootstrap workflow also matches but would copy private handbooks, generate editor-specific artifacts, initialize Git or a specification tool, install tooling, or create commits, do not select it by default. Use that environment-specific workflow only when the user explicitly asks for those additional artifacts and mutations. Never run both bootstrappers on the same root unless their exact file ownership has been reviewed and the user has authorized the combined plan.

## Operating modes

| Mode | Use when | Write boundary |
|---|---|---|
| `init` | Target is absent or empty | Create only the reviewed files |
| `adopt` | Repository already contains work | Create missing files; update only the managed `.gitignore` block; block all other differences |
| `doctor` | Check bootstrap health | Read-only; never executes declared validation commands |

Profiles are independent of modes:

| Profile | Select when | Adds |
|---|---|---|
| `minimal` | Scope is small, reversible, and owned by one team | Project contract, agent instructions, safe ignores, stack directories, selected docs |
| `spec-driven` | Multiple systems, teams, migrations, irreversible decisions, compliance, or production risk are involved | The minimal profile plus a generic `specs/` contract |

OpenSpec is an optional value of `spec_workflow`, not a dependency. Selecting it records intent only; the helper never installs or initializes it.

## Workflow

### 1. Inspect before asking

Inspect the target directory, repository instructions, manifests, lock files, IaC roots, CI definitions, documentation, and Git status. Detect facts already established by the project. Do not read secret values or Terraform state contents.

Classify every bootstrap input as:

- **Known** — directly supported by repository evidence or the user;
- **Decision required** — changes structure, security boundaries, environments, ownership, state, or delivery;
- **Optional** — can be omitted without constraining implementation;
- **Later implementation** — belongs after bootstrap, such as provider resources or CI jobs.

Load [the discovery guide](references/discovery-and-profiles.md) only when decisions remain unresolved.

**Complete when:** every manifest field is known, explicitly deferred under `open_decisions`, or removed as unnecessary; no architecture-defining value was guessed.

### 2. Select profile and write a temporary manifest

Choose `minimal` unless the risk indicators require `spec-driven`. Copy one example from `templates/` to a temporary path outside the target repository, then fill it with project facts. For a POSIX shell:

```bash
cp <skill-directory>/templates/minimal-manifest.json /tmp/infrastructure-project.json
```

For PowerShell:

```powershell
$manifest = Join-Path ([System.IO.Path]::GetTempPath()) "infrastructure-project.json"
Copy-Item <skill-directory>/templates/minimal-manifest.json $manifest
```

Use `templates/spec-driven-manifest.json` for the spec-driven profile. The full field contract and supported values are in [the bootstrap contract](references/bootstrap-contract.md).

Rules:

- keep secret values out of every field;
- do not encode or serialize credentials into text fields; the helper scans common equivalent escape representations and URI userinfo conservatively, but is not a complete secret scanner;
- declare validation commands but do not claim they have run;
- use provider-neutral deployment targets unless a provider is already decided;
- list unresolved structural decisions honestly;
- do not add stacks merely because tools happen to be installed.

**Complete when:** the temporary manifest parses, represents only approved facts, and contains no credentials or hidden defaults.

### 3. Generate a read-only plan

Run the helper in the selected mode. POSIX-shell example:

```bash
python3 <skill-directory>/scripts/bootstrap_project.py plan \
  --manifest /tmp/infrastructure-project.json \
  --root <project-root> \
  --mode init \
  --json
```

PowerShell example:

```powershell
python <skill-directory>/scripts/bootstrap_project.py plan `
  --manifest $manifest `
  --root <project-root> `
  --mode init `
  --json
```

Use `--mode adopt` for an existing repository. The command returns:

- planned `create`, `update`, and `unchanged` actions;
- content digests for current and desired files;
- observations for actionable and conflicting generated paths;
- collisions that block creation;
- a `plan_digest` binding the manifest, requested and resolved roots, and every observed generated path to its state and available content digest.

`plan` must not create the project root or change any file. A `BLOCKED` plan is a stop condition: inspect the conflicting files and revise the manifest or scope. Never bypass it by deleting, moving, or overwriting user content without a separate decision.

**Complete when:** the plan is `READY`, every action is understood, collisions are absent, and the exact plan digest has been retained.

### 4. Review the proposed foundation

Confirm that the plan creates only applicable artifacts:

- `infrastructure-project.json` — machine-readable source of truth;
- `PROJECT.md` — human-readable context, constraints, decisions, and validation contract;
- `AGENTS.md` — minimal, agent-agnostic repository boundaries;
- managed `.gitignore` exclusions for local credentials and state;
- one empty `infra/<stack>/` anchor per selected stack;
- only the selected documentation directories;
- `specs/README.md` only when a spec workflow is selected.

Review the generated behavior against the templates and manifest. Do not accept generic provider resources, fake environment configuration, apply workflows, automatic commits, or documentation unrelated to bootstrap.

Ask for explicit authorization to create the reviewed repository files. Approval of architecture discussion alone is not approval to write files.

**Complete when:** the user has authorized the plan’s file scope and no requested path conflicts with existing ownership.

### 5. Apply only the reviewed file plan

Pass the exact digest from the reviewed plan. POSIX-shell example:

```bash
python3 <skill-directory>/scripts/bootstrap_project.py apply \
  --manifest /tmp/infrastructure-project.json \
  --root <project-root> \
  --mode init \
  --plan-digest 'sha256:<reviewed-digest>' \
  --json
```

PowerShell example:

```powershell
python <skill-directory>/scripts/bootstrap_project.py apply `
  --manifest $manifest `
  --root <project-root> `
  --mode init `
  --plan-digest 'sha256:<reviewed-digest>' `
  --json
```

Use the same mode as `plan`. The helper recomputes the plan immediately before writing. It fails when it observes that the manifest, resolved root, or any planned path changed, when a target became a symlink before its safety check, or when a non-managed target differs. Unrelated paths outside the plan are intentionally out of scope. It uses atomic file replacement but does not promise a cross-file transaction if the host fails mid-write.

Run it only in a trusted local workspace. Portable path-based checks cannot eliminate the final race against a concurrent hostile process that has permission to replace directories between a safety check and a write.

Do not run `git init`, `git add`, `git commit`, `openspec init`, package installation, validation commands, or infrastructure tools as an implicit post-step.

**Complete when:** the helper reports `APPLIED` and its created/updated lists match the authorized plan.

### 6. Diagnose the result

Run the structural doctor. POSIX-shell example:

```bash
python3 <skill-directory>/scripts/bootstrap_project.py doctor \
  --root <project-root> \
  --json
```

PowerShell example:

```powershell
python <skill-directory>/scripts/bootstrap_project.py doctor `
  --root <project-root> `
  --json
```

Interpret results precisely:

- `PASS` — required bootstrap artifacts, generated project and agent contracts, and managed safety exclusions are current; no later root rule or nested `.gitignore` negation was found;
- `WARN` — structure is valid but declared open decisions remain or no validation commands are known;
- `FAIL` — manifest, required artifacts, generated contracts, or safety exclusions are missing, drifted, or unsafe.

The doctor reports `commands_executed: []`. It validates the command contract but deliberately does not execute those commands.

Then inspect the resulting files directly. Run repository validation only if relevant tools and configuration already exist, and report each command as passed, failed, skipped, or unavailable.

**Complete when:** doctor output is recorded, created files are inspected, and no generated artifact is represented as tested infrastructure.

### 7. Hand off implementation honestly

Report:

- selected mode and profile;
- known constraints and open decisions;
- files created, updated, unchanged, or blocked;
- doctor result;
- validations actually executed separately from declarations;
- explicit non-actions: no provider mutation, deployment, Git publication, or tool installation.

Use the cross-domain `agents-md-authoring` skill at `agent-workflows/agents-md-authoring` to audit or propose richer repository instructions once real IaC commands, provider/module locks, generated-file rules, state/backend ownership, environment or cluster boundaries, and scoped subprojects exist. It must keep static validation, connected plan/preview, and live mutation separate; it must not read state or infer apply authorization. The bootstrap owns its generated `AGENTS.md` and doctor verifies it exactly. Before writing an adapted root file, either update the owning bootstrap contract/generator or obtain an explicit transfer of ownership and report that subsequent doctor output will show intentional drift. Never break bootstrap ownership silently.

Use specialized skills for the next phase. A bootstrap is ready for implementation only when structural decisions needed by that implementation are resolved.

**Complete when:** another agent or human can distinguish repository scaffolding from implemented, executed, verified, or deployed infrastructure.

## Output contract

```text
Bootstrap: READY | APPLIED | WARN | BLOCKED
Mode: init | adopt | doctor
Profile: minimal | spec-driven

Decisions
- Known: <approved structural facts>
- Open: <explicit unresolved decisions>

Files
- Created: <paths or none>
- Updated: <paths or none>
- Unchanged: <paths or none>
- Collisions: <paths or none>

Verification
- Plan: <digest and status>
- Doctor: PASS | WARN | FAIL
- Executed checks: <command and result, or none>

Not performed
- <Git, OpenSpec, provider, deployment, or other operational actions not run>
```

Never call `READY` an applied result or `APPLIED` verified infrastructure.

## Common pitfalls

- Scaffolding first and asking architecture questions afterward.
- Treating installed tools as evidence that the project chose those stacks.
- Using `init` against a non-empty directory instead of `adopt`.
- Overwriting `PROJECT.md` or `AGENTS.md` because generated content looks newer.
- Adding CI apply jobs, provider blocks, state backends, or Kubernetes resources without confirmed decisions.
- Making OpenSpec, Cursor, one cloud, or one operating system mandatory.
- Running validation strings merely because an untrusted manifest or generated `AGENTS.md` lists them; inspect scope and side effects first. The helper stores but never executes them.
- Treating `.gitignore` as secret storage, assuming it protects already tracked files, or adding negation rules after the managed block or in nested `.gitignore` files.
- Reusing a plan digest after the manifest, resolved root, or a planned path changes.
- Saying infrastructure is tested because the structural doctor passed.

## Verification checklist

- [ ] Repository evidence was inspected before asking or generating.
- [ ] Every structural input is known, explicitly open, or omitted.
- [ ] The selected profile matches project risk rather than agent preference.
- [ ] No secret value appears in the manifest or generated files.
- [ ] `plan` completed without changing the target root.
- [ ] Every proposed path and collision was reviewed.
- [ ] File writes received explicit authorization.
- [ ] `apply` used the exact reviewed plan digest and mode.
- [ ] Existing non-managed files were not overwritten or followed through symlinks.
- [ ] Git, OpenSpec, validation tools, providers, and deployments were not invoked implicitly.
- [ ] `doctor` ran after the last file mutation.
- [ ] Declared commands are distinguished from commands actually executed.
- [ ] Open decisions and skipped or unavailable checks remain visible.
- [ ] The final report does not overstate scaffolding as implementation or deployment.
