---
name: terraform-change-safety
description: Use when authoring, reviewing, testing, or preparing Terraform and OpenTofu changes, especially plans, modules, state, backends, migrations, CI, and production applies. Produces evidence-based GO, CAUTION, or BLOCKED verdicts without applying by default.
license: Apache-2.0
compatibility: Requires repository access. Terraform or OpenTofu is optional for static review and required for executable validation.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: infrastructure
  tags: terraform, opentofu, iac, plan-review, production-safety
---

# Terraform Change Safety

## Overview

Engineer Terraform/OpenTofu and review changes through one safety model: understand the real execution context, inspect the rendered plan, quantify blast radius, prove rollback, then separate recommendation from authorization.

<HARD-GATE>
Never run `apply`, `destroy`, `import`, `taint`, `untaint`, `state mv`, `state rm`, `state push`, backend migration, or workspace deletion unless the user explicitly authorizes that exact mutation after seeing scope, risk, and rollback. A request to write, review, validate, or plan infrastructure is not authorization to change infrastructure.
</HARD-GATE>

## When to use

- Create or refactor Terraform/OpenTofu modules and compositions.
- Review HCL, a saved plan, plan JSON, drift, state changes, or a production rollout.
- Design remote state, locking, CI, tests, provider authentication, or migrations.
- Investigate replacements, destroys, unknown values, IAM/network changes, or cost impact.

Do not use for raw cloud-console operations unrelated to IaC. Use `cloud-architecture-review` for system-wide architecture assessments.

## Operating modes

| Mode | Trigger | Default boundary |
|---|---|---|
| **Author** | Create or edit IaC | Write repository files; do not apply |
| **Review** | Inspect code, plan, drift, or PR | Read-only |
| **Execute** | User explicitly requests an approved apply/migration | Only the authorized saved plan or procedure |

State the selected mode before acting. If intent is ambiguous, choose **Review**.

## Workflow

### 1. Establish execution context

Inspect before recommending:

- tool and version (`terraform version` or `tofu version`);
- root modules, child modules, provider constraints, lock file, and test files;
- backend type, workspace/environment mapping, account/subscription/project, and region;
- CI workflow, policy checks, cost checks, and ownership boundaries;
- changed files and relevant Git history.

Do not initialize a backend merely to discover it. Never print backend credentials, state values, environment variables, or provider tokens.

**Complete when:** the report names the tool/version, root under review, target environment, backend/workspace posture, and any unknowns.

### 2. Classify the task and load depth

Load only the relevant reference:

- Plan, drift, or production change → `references/plan-and-risk-review.md`
- State, backend, import, move, or migration → `references/state-and-migration-safety.md`
- New module or substantial refactor → `references/module-engineering.md`

Trace resource addresses through modules. Never infer the meaning of a resource from its display name alone.

### 3. Validate in increasing-cost order

Use the repository's own commands first. Otherwise, when the tool is available:

1. format check: `terraform fmt -check -recursive` or `tofu fmt -check -recursive`;
2. initialize safely for validation, avoiding backend configuration where appropriate;
3. `validate`;
4. static/security/policy tests already configured by the project;
5. native tests or repository test harness;
6. create a saved plan for the confirmed target;
7. inspect machine-readable plan JSON, not only the colorized summary.

Report each check as **passed**, **failed**, **skipped**, or **unavailable**. Never convert “tool missing” into “passed.”

**Complete when:** every applicable check has a status and command/evidence.

### 4. Review the rendered change

Inventory all creates, updates, replacements, destroys, reads, imports, moves, and deferred/unknown values. Pay special attention to:

- identity and access boundaries;
- public exposure, routing, DNS, firewall, and load balancers;
- databases, storage, encryption, backups, retention, and deletion protection;
- state/backend/locking changes;
- immutable attributes causing replacement;
- provider or module upgrades;
- autoscaling, quotas, regional/AZ placement, and estimated recurring cost;
- dependencies not represented in Terraform.

A zero-error plan can still be unsafe. A zero-change plan proves only that the evaluated inputs currently render no difference.

### 5. Assign a verdict

Use the risk model in `references/plan-and-risk-review.md`.

- **GO** — evidence is complete, no blocking risk, verification and rollback are executable.
- **CAUTION** — change may proceed only after listed conditions or approvals.
- **BLOCKED** — destructive/irreversible ambiguity, wrong target, stale plan, missing backup/rollback, failed validation, or unresolved security exposure.

The verdict is advice, not execution authorization.

### 6. Prepare execution without performing it

Produce:

- exact target and saved-plan identity;
- ordered change summary and blast radius;
- prerequisites and approval owners;
- pre-change backup/snapshot or restore proof;
- apply procedure using the reviewed artifact;
- health checks and observation window;
- rollback triggers and commands/procedure;
- communications and maintenance-window needs.

Use `templates/change-review.md` for the output.

### 7. Execute only after explicit authorization

Immediately before an authorized mutation:

1. confirm identity, account/project/subscription, region, workspace, and current branch/commit;
2. confirm the reviewed saved plan is current and has not been regenerated silently;
3. confirm locking and backups;
4. restate destructive/replacement actions;
5. execute only the approved step;
6. capture real output and run post-change verification;
7. stop on an unplanned prompt, target mismatch, plan drift, or health regression.

Never use automatic approval flags unless the user explicitly requested unattended execution and the plan is already reviewed.

## Output contract

Every review returns:

1. **Scope and evidence**
2. **Change inventory**
3. **Risk findings**, ordered by severity
4. **Verdict** — GO / CAUTION / BLOCKED
5. **Conditions before execution**
6. **Verification and rollback**
7. **Validation log** — passed / failed / skipped / unavailable

Label assumptions. Cite file paths, resource addresses, and plan fields rather than relying on generic best practices.

## Common pitfalls

- Reviewing only HCL while ignoring evaluated variables and plan JSON.
- Treating `-/+` replacement as an ordinary update.
- Assuming `sensitive = true` keeps a value out of state.
- Reusing one state across unrelated environments or teams.
- Changing backend configuration and infrastructure in the same unbounded operation.
- Regenerating a plan after approval and applying the new, unreviewed artifact.
- Claiming rollback without proving the previous artifact, state recovery, or data restore path exists.

## Verification checklist

- [ ] Tool, version, root, target, backend, and workspace are known.
- [ ] The reviewed plan corresponds to current code and inputs.
- [ ] All creates, updates, replacements, and destroys are accounted for.
- [ ] IAM, network, data, state, cost, and availability impacts were checked.
- [ ] Validation results are real and status-labeled.
- [ ] Rollback and post-change checks are executable.
- [ ] No mutation occurred without explicit authorization.
