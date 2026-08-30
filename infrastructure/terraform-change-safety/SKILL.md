---
name: terraform-change-safety
description: "Use when answering, authoring, reviewing, validating, planning, or preparing Terraform and OpenTofu work involving modules, plans, state, backends, migrations, CI, or live changes. Routes focused tasks narrowly and scales target, rollback, and readback evidence to the claimed effect."
license: Apache-2.0
compatibility: Requires repository access. Terraform or OpenTofu is optional for static work and required only for claims that depend on executable behavior.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: infrastructure
  tags: terraform, opentofu, iac, plan-review, production-safety
---

# Terraform Change Safety

## Overview

Take the shortest safe route from the requested Terraform/OpenTofu outcome. A focused HCL question or bounded module edit does not require a production-readiness audit, saved plan, execution packet, or verdict. Increase evidence and ceremony only when the claim moves from source shape to evaluated plan behavior or a live/state effect.

A direct request to author bounded repository files authorizes those local edits. Advice, file authoring, plan review, and execution authorization remain separate.

<HARD-GATE>
Never expose credentials, private variable values, backend secrets, or state contents. Installing tools/providers/modules, changing authentication or privileges, triggering remote jobs, and running `apply`, `destroy`, `import`, `taint`, `untaint`, `state mv`, `state rm`, `state push`, backend migration, workspace deletion, release, or deployment require explicit authorization for the exact action, target account/project/subscription, region, workspace/environment, and reviewed scope. Local authoring or a plan request does not authorize those effects.
</HARD-GATE>

## When to use

- Answer a Terraform/OpenTofu syntax, design, provider, module, or workflow question.
- Create or refactor modules and compositions.
- Review HCL, evaluated plans, drift, imports, moves, replacements, destroys, or unknown values.
- Design or assess state, backend, locking, CI, tests, provider authentication, or migrations.
- Prepare or, after exact authorization, execute a live change.

Do not use for cloud-console operations unrelated to IaC. Use `cloud-architecture-review` for system-wide architecture decisions.

## Task modes

Choose the narrowest applicable mode; these names are routing labels, not sequential gates.

| Mode | Typical outcome | Default boundary |
|---|---|---|
| **Focused guidance** | Explain or decide one IaC question | Inspect only the relevant source/docs |
| **Author** | Create or edit bounded HCL/tests/docs | Local repository writes; no plan/apply by default |
| **Static review** | Review source, module interface, or diff | Read-only source evidence |
| **Validate** | Format, parse, validate, or run project tests | Existing local tooling only unless installation is authorized |
| **Plan review** | Explain evaluated changes or readiness | Read-only plan artifacts; exact target evidence |
| **Migration design** | Design import, move, backend, or state procedure | Plan and recovery evidence; no mutation |
| **Execute** | Perform an explicitly requested live/state operation | Only the authorized target, artifact, and procedure |

Infer the mode from the requested outcome. If a target-sensitive action is ambiguous, remain read-only and ask for the missing target rather than expanding into a full audit.

## Workflow

Use only the branch needed. Named sections are navigation, not completion gates.

### Establish enough context

Inspect the relevant root module, child modules, provider/tool constraints, lock file, variable sources, tests, changed files, and repository instructions. Discover backend/workspace/environment mapping without initializing or reading state contents.

For focused source work, stop when the question is supported. For a plan or live-effect claim, also establish the tool/version, root, account/project/subscription, region, workspace/environment, backend posture, commit/input identity, and evidence freshness.

Branch on the actual tool, provider, version, and repository convention. Provider-specific recommendations are adapters, not universal defaults; confirm volatile capabilities from current authoritative documentation when they matter.

### Author or review source

Make the smallest coherent change. Preserve existing module boundaries, naming, provider strategy, and test style unless the request changes them. Prefer typed intent-focused interfaces, minimal outputs, and safe defaults only when the project or provider contract supports them.

For address refactors, inspect the current configuration and available state metadata without printing values. Prefer declarative `moved` blocks when supported. A refactor success claim needs evidence that intended identities are preserved and unintended recreation is absent; it does not automatically need live execution.

Load [module engineering](references/module-engineering.md) only for reusable-module or substantial refactor questions.

### Validate only the claim made

Use repository-native commands first and choose the lowest useful rung:

- source/diff inspection for declarations and interface changes;
- format/parse/`validate` for structural and configuration checks;
- configured lint, policy, security, or native tests for the risks they actually cover;
- saved plan plus machine-readable plan output for evaluated resource-effect claims;
- isolated integration tests for provider behavior when the task justifies them;
- post-effect readback for live-change claims.

Report passed, failed, skipped, and unavailable checks. A formatter, validator, policy tool, or zero-error plan proves only its tested contract. Do not download providers/modules or initialize a backend merely to satisfy a checklist; installation or a migration-capable init crosses a separate gate.

### Review an evaluated plan

When the requested claim concerns plan behavior, prefer machine-readable output from the exact saved plan and target. Do not inventory effects from `change.actions` alone. Check the format/tool version, then consume the applicable top-level resource-change, resource-drift, output-change, check-result, and deferred/deferral records. For each material resource record, combine:

- address/module/provider, previous address or import/move metadata, and `actions`;
- `before`/`after`, with `before_sensitive` and `after_sensitive` applied before any display or logging;
- `after_unknown`, so an omitted or null-looking value is not mistaken for a known final value;
- replacement paths/order and `action_reason`, treating unknown reason values as forward-compatible context rather than harmlessness;
- dependency/failure-domain effects;
- target tuple, commit/input identity, creation time, and saved-plan digest.

Inspect material output changes and failing, error, or unknown checks even when resource actions look routine. Preserve deferred changes as work not represented by the current action totals; absence of a field can be version/mode dependent and is not automatically an empty result. Summarize routine unchanged/no-op items; enumerate all destructive, replacement, identity, network, data, backend, and other material effects. Treat normalization or order-only differences as review-noise candidates only when provider schema and context support that conclusion.

Assess applicable risk qualitatively: resource effect, privilege/network/data effect, availability, state/backend, external dependency, cost uncertainty, reversibility/restore evidence, and observability. Do not sum ordinal scores or let a synthetic threshold decide readiness. Load [plan and risk review](references/plan-and-risk-review.md) for this branch.

A plan is a preview, not authorization. A no-change plan is evidence only for the evaluated inputs and refresh conditions.

### Design a state or backend operation

Load [state and migration safety](references/state-and-migration-safety.md) for import, direct state manipulation, or backend migration. Separate design from execution. The plan must identify authoritative backend/workspace, affected addresses and remote IDs, concurrency/locking, a protected recovery copy, forward and reverse procedure, and the no-unintended-change/readback test appropriate to the operation. Assess state and saved-plan encryption conditionally: OpenTofu supports an opt-in encryption branch, while other tools/backends can have different capabilities and custody models.

Prefer a declarative, reviewable migration. Do not use imperative state commands merely because they are shorter. An actual cross-state split, merge, or move should first rehearse against isolated copies of both the source and destination states; never use the authoritative states as rehearsal inputs.

### Prepare or execute an effect

Before any authorized mutation, bind the operation to:

1. actor identity and exact account/project/subscription, region, workspace/environment, root, and backend;
2. current commit/input set and the reviewed saved-plan/procedure identity;
3. explicit create/update/replace/destroy/state/privilege/data effects;
4. prerequisites, lock posture, backups or restore evidence;
5. expected health/readback signals and observation window;
6. abort conditions and an executable rollback/recovery path.

Immediately re-read target identity and plan/diff before execution. Run only the authorized operation. Stop on target mismatch, changed plan/diff, unexpected prompt, stale lock, unplanned effect, or health regression. Capture real output and verify the target afterward; command success alone is not infrastructure success.

Never substitute `-auto-approve` or equivalent for exact authorization. Do not regenerate and apply an unreviewed plan under the identity of an approved one.

## Output contract

Return only the semantics needed by the mode:

- **Focused guidance/static review:** answer or findings, source evidence, assumptions, and any material unknown.
- **Author/validate:** changed files and intent, relevant diff, checks actually run with statuses, and effects not performed.
- **Plan review:** exact target/plan identity, material change inventory, qualitative risks, conditions or blockers, and evidence gaps.
- **Migration/execute:** exact action and environment, reviewed diff/plan, backup/rollback, authorization boundary, execution result if performed, and post-change readback.

A GO/CAUTION/BLOCKED or repository-native verdict is optional when the user asks for a readiness decision; it is advice, never authorization. `templates/change-review.md` is optional scaffolding for complex reviews, not a required report or quality proof.

## Common pitfalls

- Forcing every source edit through init, validate, plan JSON, and an execution packet.
- Reviewing only HCL when claiming evaluated behavior.
- Treating `-/+` replacement, unknown values, or deferred changes as ordinary updates.
- Converting qualitative risk into arbitrary score arithmetic.
- Assuming `sensitive = true` keeps values out of state.
- Downloading dependencies or migrating a backend as an implicit validation step.
- Mixing backend/state migration and unrelated resource changes.
- Applying a regenerated, stale, or wrong-target plan.
- Claiming rollback without a known-good artifact, state recovery, and data strategy where applicable.

## Verification checklist

Apply only the items relevant to the selected mode:

- [ ] The requested outcome was answered without an unrelated full audit.
- [ ] Source, tool/provider version, and target evidence match the claim being made.
- [ ] Local authoring proceeded within the requested file scope without a redundant approval.
- [ ] Checks are proportional and labeled passed, failed, skipped, or unavailable.
- [ ] Templates, tools, and plan parsers were not treated as semantic safety proof.
- [ ] A plan-effect claim uses sensitive/unknown masks plus applicable drift, output, check, reason, and deferred records—not `actions` alone—and accounts for every material replacement, destroy, privilege, network, data, backend, and unknown/deferred effect.
- [ ] Risk judgment is evidence-based and not an ordinal total.
- [ ] Any live/state effect names the exact target, reviewed plan/diff, rollback/recovery, and post-change readback.
- [ ] Credentials and state/private values remained redacted.
- [ ] No install, privileged/live mutation, remote run, release, or deployment occurred without explicit authorization.
