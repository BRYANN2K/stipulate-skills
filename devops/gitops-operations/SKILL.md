---
name: gitops-operations
description: Use when auditing GitOps repositories or troubleshooting Flux, Argo CD, and Kubernetes reconciliation, drift, source, dependency, Helm, Kustomize, security, and rollout problems. Separates static repository analysis from read-only live-cluster diagnosis and never reconciles by default.
license: Apache-2.0
compatibility: Static mode works from Git repositories. Live mode requires confirmed read-only access and the relevant GitOps/Kubernetes tooling.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: devops
  tags: gitops, flux, argocd, kubernetes, reconciliation, audit
---

# GitOps Operations

## Overview

Treat Git as desired state and controllers as evidence of reconciliation. Join static repository audit with live dependency-chain diagnosis without blurring their security boundaries.

<HARD-GATE>
Do not reconcile, sync, refresh with mutation, suspend, resume, rollback, delete, patch, force, prune, rotate secrets, or push repository changes unless the user explicitly authorizes the exact target and action. Live diagnosis is read-only; secret values remain masked.
</HARD-GATE>

## When to use

- Audit a Flux or Argo CD repository for structure, security, validity, and operational readiness.
- Diagnose failed/stalled reconciliation, source fetch, Helm, Kustomize, health, drift, or dependency problems.
- Review a GitOps change or migration between repository/controller patterns.

Use `kubernetes-production-engineering` for general Kubernetes resources with no GitOps controller context.

## Modes

| Mode | Inputs | Boundary |
|---|---|---|
| **Static audit** | Git files and rendered manifests | No cluster access required |
| **Live debug** | Read-only controller/cluster state | No reconciliation or patch |
| **Change review** | Diff + static/live evidence | Proposal only |

Never silently upgrade from static audit to live access.

## Workflow

### 1. Discover the GitOps contract

Identify:

- controller and versions if known;
- repository roots, tenants/clusters/environments, and promotion model;
- Kustomization/Application/Helm dependency graph;
- sources and authentication mode;
- secret management and decryption boundary;
- policies, schemas, image automation, notifications, and ownership;
- source of truth for generated artifacts.

**Complete when:** controller, repository topology, target, ownership, and unknowns are explicit.

### 2. Choose static or live route

For static audit load `references/static-repository-audit.md`.
For live investigation load `references/live-reconciliation-debug.md`.
For a PR/change, run static first; use live evidence only if requested and authorized.

### 3. Render and validate desired state

Use repository-provided scripts first. Render exact overlays/releases where inputs are available. Validate:

- YAML/schema/CRD versions;
- deprecated APIs;
- Kustomize and Helm output;
- duplicate or conflicting objects;
- source references, paths, namespaces, and dependency ordering;
- policy/security and secret-management patterns;
- cross-resource consistency.

Do not decrypt or display secret values. It is usually sufficient to validate encrypted form, references, recipients/providers, and controller status.

### 4. Build the dependency chain

Trace:

```text
Git/OCI/Helm source
  → source artifact/revision
  → render/decryption
  → reconciliation object
  → applied resources
  → workload health
```

For Argo CD include Application/ApplicationSet/project/repository boundaries. For Flux include Source → Kustomization/HelmRelease → dependent objects. State where the chain first diverges from expected behavior.

### 5. Diagnose with hypotheses

Examples:

- source artifact is stale or authentication failed;
- path/ref/chart/value input does not resolve;
- render succeeds locally but cluster CRD/schema differs;
- dependency is not Ready or ordering is cyclic;
- admission/RBAC prevents apply;
- health expression waits on the wrong condition;
- manual drift is reverted by the controller;
- rollout is unhealthy after successful reconciliation.

Use read-only status, conditions, events, controller logs, resource ownership, and revisions to test them. Distinguish **desired-state error**, **reconciliation error**, and **runtime error**.

### 6. Propose correction at the right layer

- Repository defect → change source files, render, validate, review diff, then push through normal workflow.
- Controller configuration defect → propose controller/object change with impact and rollback.
- Runtime defect → fix desired state; a live patch may be an explicitly approved temporary mitigation only.
- External dependency defect → document the dependency and safe retry/recovery condition.

Never present `force`, `prune`, deletion, or controller restart as routine first-line repair.

### 7. Verify convergence

After an authorized change, verify:

- repository revision is the intended commit/artifact;
- source and reconciliation conditions are Ready/Healthy for the right reason;
- dependency chain converged in order;
- expected objects exist and ownership is correct;
- workload/user health recovered;
- no unexpected prune/drift/duplicate resource appeared.

Use `templates/audit-report.md`.

## Output contract

- Mode, target, controller, and evidence boundary
- Repository/dependency topology
- Findings by severity and confidence
- First failing boundary in the reconciliation chain
- Proposed source-of-truth correction
- Validation and convergence checks
- Gated live actions, if any
- Unknowns and unavailable tools

## Common pitfalls

- Auditing only raw YAML without rendering overlays/charts.
- Assuming a reconciled object means the workload is healthy.
- Patching live state that the controller will revert.
- Decrypting secrets to “validate” them.
- Using controller-wide force/restart for one object.
- Ignoring CRDs, admission, RBAC, or dependency ordering.
- Mixing results from a different cluster context or repository revision.

## Verification checklist

- [ ] Static/live mode and target are explicit.
- [ ] Desired state was rendered from the correct inputs.
- [ ] Source → controller → resource → workload chain was traced.
- [ ] Findings separate desired-state, reconciliation, and runtime failures.
- [ ] Secret values were not exposed.
- [ ] Correction targets the source of truth.
- [ ] Convergence and user health have measurable checks.
- [ ] No sync/reconcile/mutation occurred without authorization.
