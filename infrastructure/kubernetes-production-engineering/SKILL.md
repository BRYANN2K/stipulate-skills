---
name: kubernetes-production-engineering
description: Use when generating, reviewing, hardening, validating, or troubleshooting Kubernetes manifests, Helm charts, Kustomize overlays, workloads, RBAC, networking, storage, rollouts, and cluster behavior. Uses failure-mode analysis and read-only diagnosis before proposing changes.
license: Apache-2.0
compatibility: Works statically from repository files. kubectl, Helm, Kustomize, and schema/policy tools are optional for deeper validation.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: infrastructure
  tags: kubernetes, helm, kustomize, security, reliability, troubleshooting
---

# Kubernetes Production Engineering

## Overview

Generate and operate Kubernetes artifacts by diagnosing likely failure modes first. Validate both individual resources and cross-resource contracts: selectors, ports, identities, policies, storage, rollout behavior, and controller ownership.

<HARD-GATE>
Default to repository inspection and read-only cluster commands. Do not apply, patch, delete, scale, restart, roll out, roll back, drain, cordon, exec into a workload, expose a service, reconcile GitOps, or reveal Secret values without explicit authorization for that action and target.
</HARD-GATE>

## When to use

- Create or review manifests, Helm charts, Kustomize overlays, operators, and policies.
- Diagnose Pending, CrashLoopBackOff, OOMKilled, probe failures, failed rollouts, networking, DNS, or storage.
- Harden workloads, RBAC, Pod Security, NetworkPolicy, admission, and multi-tenancy.
- Validate Kubernetes API compatibility and production readiness.

Do not use for infrastructure outside Kubernetes or for vendor-only observability queries with no Kubernetes context.

## Modes

| Mode | Boundary |
|---|---|
| **Generate/review** | Repository files only; no cluster mutation |
| **Live diagnose** | Read-only cluster observation |
| **Remediate** | Proposed patch first; execute only after explicit approval |

If mode is unclear, use **Generate/review**.

## Workflow

### 1. Capture context

Determine from files or read-only discovery:

- Kubernetes version/distribution and environment;
- namespace, cluster context, and workload/controller type;
- deployment method: raw YAML, Helm, Kustomize, operator, Argo CD, or Flux;
- policy engines, Pod Security posture, CNI/ingress, CSI/storage, and autoscaling;
- ownership and whether the repository or a controller is authoritative.

Never query a live cluster merely because a kubeconfig exists; confirm the requested target and use read-only access.

**Complete when:** version, target, source of truth, controller, and key unknowns are recorded.

### 2. Diagnose failure modes before editing

Evaluate these six classes:

1. **Insecure defaults** — privileged execution, root, writable root FS, capability sprawl, unsafe host access.
2. **Resource starvation** — missing/incorrect requests and limits, QoS, quotas, scheduling, eviction, OOM.
3. **Network exposure** — Service/Ingress/Gateway, selectors, ports, TLS, DNS, NetworkPolicy.
4. **Privilege sprawl** — ServiceAccounts, tokens, RBAC wildcards, cluster scope, secret access.
5. **Fragile lifecycle** — probes, startup, graceful shutdown, PDB, rollout strategy, jobs, disruption.
6. **API/config drift** — removed APIs, CRD schema mismatch, Helm values drift, immutable fields, GitOps ownership.

For runtime symptom mapping, load `references/runtime-troubleshooting.md`. For security depth, load `references/security-and-multitenancy.md`.

### 3. Render the actual artifact

Review generated output, not only templates:

- Helm: render with the exact values/environment when available.
- Kustomize: build the target overlay.
- Operators/GitOps: identify generated/owned fields and reconciliation order.
- Raw YAML: include every document and namespace interaction.

Never edit generated output when the source template or values are authoritative.

### 4. Validate in layers

Use repository commands first, then available tools:

1. YAML parse and duplicate-key detection;
2. API schema validation for the target version and installed CRDs;
3. client/server dry-run when target access is authorized;
4. Helm/Kustomize lint/render checks;
5. policy and security scanners configured by the project;
6. cross-resource consistency checks;
7. rollout and rollback reasoning.

Cross-resource checks must include labels/selectors, named ports, Service target ports, ingress backends, ServiceAccounts/RBAC, PVC names, ConfigMap/Secret references, namespace boundaries, and policy selectors.

**Complete when:** every applicable layer is passed, failed, skipped, or unavailable with evidence.

### 5. Generate or propose the smallest safe change

Production defaults should normally include:

- non-root/restricted security context unless the workload proves a need;
- immutable image reference or controlled tag policy;
- meaningful requests and limits based on observed/declared workload needs;
- startup/readiness/liveness behavior matched to failure semantics;
- graceful termination and rollout settings;
- least-privilege identity and scoped RBAC;
- explicit network exposure and policy;
- observability labels/signals and owner metadata;
- backup/restore for stateful data.

Do not invent resource values, probe endpoints, storage classes, domains, issuers, or cloud annotations. Mark unresolved inputs.

### 6. Live diagnosis: observation ladder

In read-only mode:

1. confirm context and namespace;
2. inspect desired vs current workload state;
3. inspect events ordered by time;
4. inspect pod/container status, previous termination, conditions, and scheduling;
5. inspect controller ownership and rollout history metadata;
6. inspect logs, including previous container logs when relevant;
7. inspect Service endpoints, policies, DNS, storage, and nodes only as the hypothesis requires;
8. correlate with deployment/config changes.

Every query must test a stated hypothesis. Stop broad collection once evidence discriminates the likely cause.

### 7. Deliver and gate remediation

Return findings with evidence, confidence, proposed patch, impact, validation, and rollback. For live incidents, distinguish immediate mitigation from durable Git-tracked correction. Never patch a GitOps-managed object as the durable fix.

## Output contract

- **Context and source of truth**
- **Observed symptoms or requested behavior**
- **Failure modes assessed**
- **Findings**: confirmed / likely / possible / unknown
- **Artifact or patch**
- **Validation results**
- **Rollout and rollback plan**
- **Unresolved inputs**

## Common pitfalls

- Generating an API version without checking the target cluster.
- Adding liveness probes that restart slow or dependency-bound workloads.
- Setting CPU limits by habit and causing throttling.
- Writing a NetworkPolicy whose selector matches nothing.
- Granting wildcard RBAC to make an error disappear.
- Reading Kubernetes Secret values during ordinary diagnosis.
- Patching a live GitOps-managed object without fixing its source.
- Calling a manifest “production-ready” when render/schema/policy validation was unavailable.

## Verification checklist

- [ ] Target version, namespace, environment, and source of truth are known.
- [ ] Rendered resources—not just templates—were reviewed.
- [ ] Six failure-mode classes were considered.
- [ ] Cross-resource identities and references match.
- [ ] Validation status is honest and reproducible.
- [ ] Runtime evidence supports the diagnosis.
- [ ] Rollout, health signals, and rollback are explicit.
- [ ] No live mutation or secret exposure occurred without authorization.
