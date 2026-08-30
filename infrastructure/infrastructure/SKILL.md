---
name: infrastructure
description: "Use when an infrastructure request is broad, crosses infrastructure specialties, or needs routing among project bootstrap, Terraform/OpenTofu, Kubernetes, and cloud architecture review without turning the domain entry point into a mandatory process."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and infrastructure repositories; live provider or cluster access is optional and remains separately authorized.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: infrastructure
  tags: infrastructure, orchestration, routing, terraform, kubernetes, cloud
---

# Infrastructure

## Overview

Route an infrastructure outcome to the smallest specialist that owns the decisive work. This skill is a lightweight entry point, not a replacement for its specialists and not a monolithic infrastructure lifecycle.

Use a specialist directly when the intent is already clear. Combine specialists only when the requested outcome genuinely crosses their boundaries. Do not impose mandatory phases, plans, manifests, artifacts, option counts, validators, or a second approval.

## When to use

- The request says “infrastructure” but does not yet distinguish repository foundation, IaC, Kubernetes, or cloud architecture.
- One requested outcome materially spans two or more infrastructure specialties.
- Work discovered in another domain needs a concise infrastructure handoff.

Do not use this orchestrator merely to wrap a focused specialist request. Do not route GitOps reconciliation, delivery pipelines, or incidents through an infrastructure specialist.

## Routing

| User outcome | Smallest route |
|---|---|
| Start or safely adopt an infrastructure repository; add only a bounded foundation | [infrastructure-project-bootstrap](../infrastructure-project-bootstrap/SKILL.md) |
| Answer, author, review, validate, plan, or prepare Terraform/OpenTofu modules, plans, state, backends, or migrations | [terraform-change-safety](../terraform-change-safety/SKILL.md) |
| Answer, author, review, harden, validate, or troubleshoot Kubernetes, Helm, or Kustomize resources and cluster behavior | [kubernetes-production-engineering](../kubernetes-production-engineering/SKILL.md) |
| Answer a cloud architecture question, compare options, assess a system, or plan a cloud change | [cloud-architecture-review](../cloud-architecture-review/SKILL.md) |
| GitOps desired state or reconciliation, CI/CD or release delivery, or production incident work | Hand off to [DevOps](../../devops/devops/SKILL.md) |

When the request explicitly names one row, invoke that specialist directly. A cloud decision plus its Terraform expression may justify two specialists; a Terraform-only edit does not.

## Workflow

These are routing decisions, not mandatory phases:

1. Preserve the user's bounded outcome, target, exclusions, and already granted authority. Inspect only enough evidence to resolve ownership.
2. Select one specialist by default. Add another only when it owns a distinct part of the same requested outcome.
3. Let each selected specialist govern its own method, safety gates, and completion evidence.
4. Only when work actually crosses a domain boundary, use the [optional cross-domain handoff semantics](../../agent-workflows/agent-workflows/references/domain-handoffs.md) to distinguish consultation from ownership transfer. Preserve the target, exclusions, evidence freshness, completed work, last mutation, open question, and apply/read/plan authority; route directly to the concrete destination specialist once known rather than bouncing through its umbrella, and do not replay current work.
5. Stop when the bounded outcome is satisfied or a real safety, authority, evidence, or decision blocker remains.

## Safety boundaries

<HARD-GATE>
A bounded user request is authority for the bounded local work it names; do not ask for a second approval. Pause only when the next action expands beyond that request into secrets or private data, dependency installation, authentication or permission changes, destructive/live/remote mutation, deployment, release, publication, or a public machine-contract change. If the request already explicitly authorizes the exact effect and target, follow the selected specialist's conditions; otherwise obtain that authority before the expanded action.
</HARD-GATE>

This orchestrator cannot weaken a specialist's safety or proof boundary. Local authoring is not an apply, reconcile, deployment, or live-state claim. A helper `PASS` proves only the helper's check; it is not quality proof or evidence of an unexercised infrastructure effect.

## Output contract

Preserve these semantics in whatever order best serves the user:

- selected specialist or cross-domain destination and the routing reason;
- requested scope, exclusions, assumptions, and authority boundary;
- completed local work and direct evidence locators;
- handoff context and unresolved decisions, when applicable;
- unperformed live, remote, destructive, release, or publication effects;
- outcome and proof level without overstating live state.

This is not a fixed template. Focus-friendly delivery may reorder or progressively disclose it, but must not hide risks, gaps, authority, or evidence limits.

## Common pitfalls

- Running every infrastructure specialist for a focused request.
- Treating cloud review, IaC authoring, Kubernetes operations, GitOps, and deployment as one mandatory sequence.
- Repeating repository or environment discovery after a grounded handoff.
- Asking again for authority already supplied by a bounded local request.
- Treating a plan, lint result, render, or helper `PASS` as proof of safety, behavior, or live application.
- Claiming a deploy, apply, cluster change, or remote state that was not directly verified.

## Verification checklist

- [ ] The smallest owning specialist was selected, or direct specialist use was preserved.
- [ ] Every combined specialist owns a necessary part of the same requested outcome.
- [ ] GitOps, delivery, and incident work was handed to DevOps with completed discovery intact.
- [ ] Bounded local authority was honored; expanded effects were separately authorized when needed.
- [ ] Each specialist's safety and evidence requirements remained intact.
- [ ] Evidence supports only the stated outcome and proof level; no live state was inferred.
