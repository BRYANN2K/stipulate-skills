---
name: kubernetes-production-engineering
description: "Use when answering, generating, reviewing, hardening, validating, or troubleshooting Kubernetes manifests, Helm charts, Kustomize overlays, workloads, RBAC, networking, storage, rollouts, or cluster behavior. Routes focused work narrowly and reserves live remediation controls for actual effects."
license: Apache-2.0
compatibility: Works statically from repository files. kubectl, Helm, Kustomize, schema/policy tools, and cluster access are optional and used only when the requested claim needs them.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: infrastructure
  tags: kubernetes, helm, kustomize, security, reliability, troubleshooting
---

# Kubernetes Production Engineering

## Overview

Take the shortest safe path from the Kubernetes outcome. A selector question, one manifest edit, or a bounded symptom does not trigger a universal production-readiness review. Inspect and validate only the objects, generated targets, runtime signals, and risks needed to support the requested claim.

A direct request to author bounded repository files authorizes those local edits. Static source work, read-only live diagnosis, and live remediation are separate effect boundaries.

<HARD-GATE>
Never reveal Secret values, credentials, private workload data, or unnecessary personal data. Installing tools or plugins; changing authentication, RBAC, admission, or privileges; and applying, patching, deleting, scaling, restarting, rolling out/back, draining, cordoning, executing in workloads, exposing services, reconciling GitOps, deploying, or publishing require explicit authorization for the exact action, cluster/context, namespace, resource, and environment. `kubectl debug` is not a read-only diagnostic: adding an ephemeral container, creating a copied Pod, or creating a node-debug Pod is a live mutation. Local manifest authoring does not authorize those effects.
</HARD-GATE>

## When to use

- Answer a focused Kubernetes API, controller, workload, policy, networking, or storage question.
- Create or review raw manifests, Helm charts, Kustomize overlays, operators, or policies.
- Diagnose Pending, CrashLoopBackOff, OOMKilled, probe, rollout, Service/DNS/network, storage, admission, or RBAC failures.
- Assess a relevant security, reliability, API-compatibility, or hardening concern.
- Prepare or, after exact authorization, perform a live remediation.

Do not use for infrastructure outside Kubernetes or vendor-only telemetry work with no Kubernetes contract.

## Task modes

Choose the narrowest mode; the modes are routing labels, not phases every request must complete.

| Mode | Outcome | Default boundary |
|---|---|---|
| **Focused guidance** | Explain or decide one Kubernetes question | Relevant source/docs only |
| **Author** | Create or change bounded repository artifacts | Local writes; no cluster mutation |
| **Static review** | Review source, rendered objects, or a diff | Read-only repository evidence |
| **Targeted hardening** | Assess a named threat/policy/failure concern | Only applicable security/reliability branches |
| **Validate/render** | Support a syntax, render, schema, or policy claim | Existing project tooling and exact target inputs |
| **Live diagnose** | Test a runtime hypothesis | Confirmed target; read-only queries |
| **Remediate** | Prepare or execute a fix | Proposed source/patch first; live execution gated |

Infer the mode from the request. Do not query a cluster merely because kubeconfig or a context exists. If live diagnosis is requested, confirm any ambiguous cluster/namespace before reading it; do not silently expand a static task into live access.

## Workflow

Use only applicable branches. Headings are navigation, not admission or completion gates.

### Bound target and source of truth

Establish only what the task needs: Kubernetes/API/CRD version, distribution if relevant, environment, cluster/context, namespace, controller/workload type, and whether raw YAML, Helm, Kustomize, an operator, Argo CD, Flux, or another source is authoritative.

For a focused source question, stop when the relevant file/object evidence supports the answer. For live or rollout claims, preserve the exact target, observed generation/revision, and observation time.

Load provider-, distribution-, controller-, or version-specific guidance only after discovering that branch. Do not universalize one platform's golden defaults.

### Trace the relevant object contracts

Build only the portion of the rendered-object graph needed for the claim. Possible edges include owner/controller, namespace, labels/selectors, named and target ports, ServiceAccount/RBAC, ConfigMap/Secret references, PVC/storage, ingress/gateway, policy selectors, CRD/API compatibility, and GitOps ownership.

Diagnose the first broken contract rather than checking every possible dimension. When authoring, fix the authoritative source rather than generated output.

Classify findings so contextual advice is not mistaken for a universal blocker:

- **Safety invariant** — an objectively invalid, leaking, or dangerous contract for the stated target;
- **Project/policy requirement** — established by repository or organizational evidence;
- **Contextual recommendation** — beneficial only under named workload and risk assumptions;
- **Informational** — an option or unknown that does not block the requested outcome.

Do not invent requests/limits, probe endpoints, replica counts, storage classes, domains, issuers, identities, annotations, or tag/digest policies.

### Author or review the smallest change

Preserve local composition, values ownership, generated-file rules, and controller conventions. A focused edit does not require unrelated RBAC, NetworkPolicy, PDB, probe, limit, backup, or multi-tenancy additions.

Load [security and multi-tenancy](references/security-and-multitenancy.md) only when the request or observed exposure involves those concerns. Treat its topics as conditional review prompts, not a mandatory baseline for every workload. Evaluate Pod Security Admission `enforce`, `audit`, and `warn` labels only when the selected target actually uses that admission path, and bind any level/version recommendation to the target Kubernetes version and workload compatibility.

### Validate in proportion to the claim

Classify a proposed “render” command from its actual inputs, flags, configuration, and extensions before running it:

- **offline parse/local render** — reads only reviewed local files with network, kubeconfig, API discovery, auth helpers, plugins, hooks, and post-render executables disabled;
- **dependency/network resolution** — can fetch chart repositories, remote Kustomize bases/URLs, schemas, images, or other dependencies;
- **plugin/local execution** — can invoke a generator, renderer, authentication exec helper, shell hook, or other local program;
- **server dry-run** — sends a request to the selected API server and exercises applicable authorization, defaulting, validation, and admission without intending persistence; it is live target access, not offline rendering;
- **lookup/live read** — performs API discovery, chart/template lookup, schema/CRD lookup, or any other cluster query; it requires confirmed read scope even when output is only YAML.

A command can occupy multiple classes. A tool's name or `template`, `render`, `diff`, `dry-run`, or `kustomize` label is not proof of offline behavior. Resolve remote inputs and executable extensions explicitly; do not let a render check silently install a plugin, execute unreviewed local code, or contact the current kube context.

Use repository commands first and the lowest useful evidence rung:

- source/diff inspection for declared behavior;
- YAML parse/duplicate-key checks for syntax claims;
- exact Helm/Kustomize/operator rendering when the claim depends on generated output and its command class is acceptable;
- target-version API/CRD schema checks for compatibility claims;
- project-configured policy/security checks for the policies they encode;
- client/server dry-run when the requested claim and authorized target need API-side evidence;
- read-only runtime observation for live behavior;
- post-remediation readback and user/workload health for executed changes.

Render only affected targets needed to substantiate the claim. Record the command class plus passed, failed, skipped, and unavailable checks. Missing optional tools lower the supported proof; they do not automatically make a focused artifact wrong. Conversely, render/schema/linter PASS is not production-readiness proof.

### Diagnose a live symptom

Use [runtime troubleshooting](references/runtime-troubleshooting.md) for the relevant symptom branch. Confirm context and namespace, then choose the smallest read-only query that can distinguish the current hypotheses. Useful evidence may include conditions/observed generation, events, pod/container status and previous termination, bounded logs, Service/EndpointSlice/policy paths, PVC/storage events, admission/RBAC errors, or a recent revision.

Do not follow a fixed query ladder or collect all logs. Inspect only the branch predicted by the symptom, preserve time/revision correlation, and stop when evidence supports an actionable diagnosis or access limits make it inconclusive. Never read Secret values during ordinary diagnosis.

### Prepare or execute remediation

Prefer the durable source-of-truth change. A direct request can authorize the bounded local patch/diff, but not its live application. Distinguish a temporary incident mitigation from the Git-tracked correction, especially for reconciled objects.

Before any authorized live effect, bind the action to:

1. actor identity, context/cluster, environment, namespace, and exact resources;
2. the proposed manifest/patch/diff and ownership/controller behavior;
3. expected rollout or user-health signals and observation window;
4. blast radius, prerequisites, and abort condition;
5. rollback/reversal path, including data/state constraints;
6. post-action readback of generation/revision, conditions, ownership, and workload/user health.

Reconfirm the target and diff immediately before execution. Run only the authorized action; stop on mismatch, unexpected affected objects, admission differences, or health regression. A successful command is not convergence or recovery.

## Output contract

Adapt to the requested mode:

- **Focused guidance:** direct answer, governing object/API evidence, assumptions, and smallest unresolved input.
- **Author/static review:** changed artifact or findings, affected object contracts, relevant diff, and checks actually run.
- **Live diagnose:** exact target/time/revision, symptom, discriminating evidence, confidence, and next safe query or proposed fix.
- **Remediation:** source/patch diff, exact live target, impact, authorization boundary, rollout/abort/rollback, and readback if executed.

Use `templates/review-report.md` only when a durable multi-finding report helps. A template or validator is optional scaffolding and never quality proof. Make a broad “production-ready” claim only when evidence covers the material risks and target behavior implied by that claim; otherwise state the narrower verified result.

## Common pitfalls

- Turning one manifest question into a universal six-dimension or full-cluster audit.
- Reviewing templates while claiming rendered behavior.
- Rendering every repository target for an unrelated focused question.
- Calling a render offline when it fetches a remote base/chart, runs a plugin or auth helper, uses a lookup, or contacts the API server.
- Treating `kubectl debug`, ephemeral-container injection, or a copied debug Pod as read-only observation.
- Treating linter defaults, two replicas, CPU limits, liveness probes, read-only filesystems, or one Pod Security level/version as universal blockers.
- Generating an API version without checking the target compatibility when it matters.
- Granting wildcard RBAC or broad Secret access to make an error disappear.
- Querying broad logs or Secret values during ordinary diagnosis.
- Patching a GitOps-managed object as the durable fix.
- Treating parse/schema/policy PASS as proof of production quality.

## Verification checklist

Apply only relevant items:

- [ ] The mode and scope are no broader than the requested outcome.
- [ ] Target version/environment/source of truth are known to the level required by the claim.
- [ ] Only relevant object relationships and risks were inspected.
- [ ] Local authoring proceeded without a redundant approval and preserved generated ownership.
- [ ] Render/schema/policy/runtime evidence is proportional and status-labeled.
- [ ] Findings distinguish safety invariants, project policy, contextual advice, and information.
- [ ] Live diagnosis used confirmed scope, bounded read-only evidence, and no Secret disclosure.
- [ ] Any live effect names exact target, diff, abort/rollback, and post-action readback.
- [ ] Optional tools/templates were not represented as production-readiness proof.
- [ ] No install, auth/privilege change, live mutation, deployment, or publication occurred without explicit authorization.
