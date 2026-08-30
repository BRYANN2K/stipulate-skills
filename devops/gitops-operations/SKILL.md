---
name: gitops-operations
description: "Use when answering focused GitOps questions, authoring or reviewing desired-state changes, validating affected Flux or Argo CD targets, or diagnosing reconciliation, drift, source, dependency, Helm, Kustomize, security, and workload-health problems. Separates local, read-only live, and mutation routes."
license: Apache-2.0
compatibility: Static work uses Git repository artifacts. Requested live diagnosis requires a confirmed target and existing read-only controller/Kubernetes access; no reconcile or push occurs by default.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: devops
  tags: gitops, flux, argocd, kubernetes, reconciliation, audit
---

# GitOps Operations

## Overview

Take the shortest safe route from the GitOps outcome. A path, values, drift, or controller-status question does not require a full repository inventory, render of every target, complete dependency audit, and convergence report. Scale evidence from source inspection to affected rendering to read-only reconciliation state only as the claim requires.

Treat declarative, versioned desired state and continuous reconciliation as the controller-neutral contract. Load Flux, Argo CD, or other controller branches only after identifying the actual controller and version.

<HARD-GATE>
Never expose repository credentials, decryption material, Secret values, private workload data, or unnecessary personal data. Installing tools/plugins; changing authentication, RBAC, controller privileges, or secret material; and reconciling, syncing, mutating refresh, suspending/resuming, rolling back, deleting, patching, forcing, pruning, restarting, applying, pushing, deploying, releasing, or publishing require explicit authorization for the exact repository/revision, controller object, cluster/context, namespace, environment, and action. Local desired-state authoring or read-only diagnosis does not authorize those effects.
</HARD-GATE>

## When to use

- Answer a focused Flux, Argo CD, GitOps repository, desired-state, drift, or reconciliation question.
- Author or review a bounded desired-state change or migration.
- Validate an affected Helm/Kustomize/raw target and its source references.
- Diagnose failed/stalled source, render, apply, ownership, health, dependency, or runtime behavior.
- Prepare or, after exact authorization, perform a reconcile/sync/push or other live correction.

Use `kubernetes-production-engineering` for Kubernetes work with no GitOps controller/source-of-truth concern.

## Task modes

Select the narrowest mode; these are routes rather than a seven-stage mandatory process.

| Mode | Outcome | Default boundary |
|---|---|---|
| **Focused guidance** | Explain one path/controller/drift/design question | Relevant source/docs only |
| **Source authoring** | Change bounded desired-state files | Local writes; no push or reconcile |
| **Static review** | Review repository structure or a diff | Read-only source evidence |
| **Affected render** | Validate exact changed/relevant targets | Local render/schema/policy evidence |
| **Live debug** | Find first reconciliation divergence | Confirmed target; read-only status/events/logs |
| **Change plan** | Prepare source/controller correction | Diff, target, rollback/readback; no mutation |
| **Execute** | Perform an explicitly authorized sync/reconcile/push/effect | Only the approved target/action |

Never silently upgrade static work to live access. A direct source-authoring request authorizes bounded local files; it does not require a second approval before writing them.

## Workflow

Use only applicable branches. Headings aid navigation and do not define completion gates.

### Discover the relevant contract

For focused work, identify only what governs the question: controller/version if relevant, repository/revision, target environment/cluster/tenant, source root/path/chart/values, owning reconciliation object, generated-file rules, secret/decryption boundary, and current unknowns.

For a broader audit, map the needed portions of sources, environments, dependencies, promotion, policies, ownership, and controller topology. Do not require a complete repository graph for one target.

### Inspect or author desired state

Follow the source of truth. Preserve repository conventions, generated ownership, promotion model, namespace/tenant boundaries, and controller-specific semantics. A direct request can authorize a bounded local change and its local validation; it never authorizes a push, controller refresh, sync, or cluster mutation.

Classify a problem at the earliest relevant boundary:

```text
desired revision (+ separately approved revision when governance exists)
  → fetched source/artifact
  → last-attempted reconciliation
  → render/decrypt/admission/apply
  → last-applied revision and tracked live ownership
  → controller health
  → workload/user health
```

Do not collapse desired, approved, fetched, last-attempted, and last-applied revisions; unavailable fields remain unknown. A successful operation or synced comparison is not proof of workload health, and an out-of-sync classification is not automatically genuine manual drift.

### Render only when the claim needs it

Use repository-provided commands and exact values/overlays/releases when available. Render the affected targets required to substantiate a change, generated-output, API/CRD, duplicate-identity, policy, or cross-resource claim. A raw source-reference or focused design question may not need rendering.

Load [static repository audit](references/static-repository-audit.md) for a requested broad audit or affected-change validation. Checks are conditional on the target and claim. Do not decrypt/display secret values; encrypted form, references, provider/recipient metadata, and controller conditions are normally sufficient.

Report parse/render/schema/policy checks as passed, failed, skipped, or unavailable. A successful local render does not prove cluster admission, reconciliation, or runtime health; unavailable optional tools do not turn an unrelated focused answer into failure.

### Diagnose the first live divergence

For requested live debug, confirm repository revision, controller object, cluster/context, namespace, and time window. Load [live reconciliation debug](references/live-reconciliation-debug.md) and inspect the smallest read-only evidence that can distinguish the suspected boundary: the five-state revision ledger; current versus condition-observed generation/equivalent; source artifact; dependency state; bounded events/logs; admission/apply error; inventory/ownership; or workload health. Treat comparison result, sync classification, operation lifecycle, and health assessment as independent planes with their own revision and observation time.

Use a controller-specific adapter only after discovery:

- Flux: Source artifact to Kustomization/HelmRelease and dependent objects;
- Argo CD: repository/project/Application/ApplicationSet, tracking, sync and health semantics;
- other controllers: preserve their documented revision, ownership, and condition model.

Classify divergence as source/auth/artifact, render/decrypt, dependency/order, schema/admission/RBAC, ownership/tracking, normalization or mutating-controller behavior, genuine manual drift, controller health, or runtime health. Record where expected and observed behavior first differ.

An ignore-difference proposal needs the mutating owner, exact field/path, why it is non-authoritative, narrow scope, and a way to revisit/test it. Never silence unknown drift with broad ignores.

### Plan or execute correction

Correct the authoritative layer: source defect in repository files; controller configuration defect in its owned object; runtime defect in desired state; external dependency at its recovery boundary. A live patch can be an explicitly authorized temporary mitigation, not the durable fix for reconciled state.

Before a live or remote effect, preserve:

1. actor identity, repository/revision, controller object, cluster/context, namespace, and environment;
2. exact source diff, rendered diff, or controller operation;
3. prune/force/delete, ownership, privilege, data, and rollout impact where applicable;
4. expected desired/approved/fetched/attempted/applied revisions, fresh generation/conditions, independent comparison/sync/operation/health evidence, and workload/user signals;
5. abort condition and rollback/reversal, including repository recovery;
6. post-action readback of source artifact, reconciliation object, tracked resources, and health.

Reconfirm target and diff immediately before the explicitly authorized action. Run only that action; stop on mismatch or unexpected prune/ownership/health changes. Never make force, prune, broad ignore, deletion, or controller restart a routine first-line fix.

## Output contract

Adapt to the mode:

- **Focused guidance:** direct answer, controller/source evidence, assumptions, and smallest unknown.
- **Source authoring/static review:** changed files or findings, relevant diff/targets, validation actually run, and no push/reconcile claim.
- **Affected render:** exact target and inputs, output/contract findings, check statuses, and evidence limits.
- **Live debug:** exact target/time, revision ledger, fresh generation/condition basis, independent comparison/sync/operation/health states, first divergent boundary, confidence, and next safe step.
- **Change plan/execute:** authoritative correction, exact remote target/action, diff, authorization boundary, rollback/abort, and convergence/user-health readback if performed.

Use `templates/audit-report.md` only for durable multi-finding work. It is optional scaffolding, not a required audit schema or quality proof.

## Common pitfalls

- Expanding one target question into a full repository/controller audit.
- Requiring a full render when the requested claim does not concern generated output.
- Auditing only templates while claiming affected rendered behavior.
- Treating local render, sync, or controller Ready as user-health proof.
- Treating OutOfSync as genuine drift without checking normalization, mutation, and ownership.
- Patching live state that the controller will revert.
- Decrypting secrets to validate references.
- Using force, prune, restart, or broad ignores as first-line repair.
- Mixing evidence from another cluster context or revision.

## Verification checklist

Apply only relevant items:

- [ ] Mode, repository/revision, controller/target, and evidence boundary match the request.
- [ ] Local authoring proceeded without redundant approval and preserved source ownership.
- [ ] Only targets needed for the claim were rendered or validated.
- [ ] Static results distinguish source shape from admission, reconciliation, and runtime behavior.
- [ ] Live diagnosis preserved all available revision states and rejected stale generation/condition evidence.
- [ ] Comparison, sync, operation, and health were not inferred from one another; divergence was classified at the first supported boundary.
- [ ] Optional templates/tools were not treated as GitOps correctness proof.
- [ ] Correction targets the authoritative source unless a temporary live mitigation is explicit.
- [ ] Any remote effect includes exact target/revision/diff, rollback/abort, and convergence/user-health readback.
- [ ] No install, auth/privilege change, sync/reconcile/mutation, push, deploy, release, or publication occurred without explicit authorization.
