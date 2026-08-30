---
name: devops
description: "Use when a DevOps request is broad, crosses delivery, GitOps, or incident-response specialties, or needs a clean handoff to infrastructure or software engineering while preserving completed discovery and existing safety boundaries."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and common CI/CD, GitOps, and observability environments; remote access is optional and separately authorized.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: devops
  tags: devops, orchestration, routing, delivery, gitops, incidents
---

# DevOps

## Overview

Route a DevOps outcome to the smallest specialist that owns the decisive work. This skill is a lightweight domain entry point, not a replacement for specialists and not a required delivery lifecycle.

Use a specialist directly when intent is clear. Combine specialists only for a genuinely cross-cutting requested outcome. Do not impose mandatory phases, plans, manifests, artifacts, option counts, validators, or a second approval.

## When to use

- The request says “DevOps,” “operations,” or “delivery” without enough detail to select a specialist.
- One requested outcome materially spans delivery pipelines, GitOps reconciliation, or incident investigation.
- DevOps work needs an infrastructure or product-code handoff without discarding completed discovery.

Do not use this orchestrator as ceremony around an already focused pipeline, GitOps, or incident request.

## Routing

| User outcome | Smallest route |
|---|---|
| Answer, author, review, validate, harden, or troubleshoot CI/CD, supply-chain, artifacts, environments, release readiness, deployment, or rollback | [delivery-pipeline-engineering](../delivery-pipeline-engineering/SKILL.md) |
| Answer, author, review, validate, or diagnose Flux/Argo CD desired state, reconciliation, drift, sources, dependencies, Helm, or Kustomize behavior | [gitops-operations](../gitops-operations/SKILL.md) |
| Triage, investigate, mitigate, communicate, or review a production incident | [sre-incident-investigation](../sre-incident-investigation/SKILL.md) |
| Terraform/OpenTofu, Kubernetes resource authoring outside GitOps ownership, or cloud architecture | Hand off to [Infrastructure](../../infrastructure/infrastructure/SKILL.md) |
| Product or application code | Hand off to [Software Engineering](../../software-development/software-engineering/SKILL.md) |

When intent names a row, invoke that specialist directly. Combine, for example, incident investigation with delivery analysis only when the same requested outcome needs both; do not automatically turn every incident into a pipeline audit.

## Workflow

These are routing decisions, not mandatory phases:

1. Retain the user's outcome, target environment, exclusions, urgency, and granted authority. Inspect only enough evidence to choose ownership safely.
2. Choose one specialist by default. Add a second only when a distinct cross-cutting part of the requested outcome belongs to it.
3. Preserve specialist methods, operational gates, and proof requirements rather than replacing them with orchestrator shortcuts.
4. Only when work actually crosses a domain boundary, use the [optional cross-domain handoff semantics](../../agent-workflows/agent-workflows/references/domain-handoffs.md) to distinguish consultation from ownership transfer. Carry the affected target, timestamped evidence, current hypothesis, completed checks, last mutation, open question, rollback/live-action authority, and return condition; route directly to the concrete destination specialist once known, and do not replay current investigation.
5. Stop at the bounded outcome or expose the exact blocker; do not escalate from local analysis or authoring into a remote operation implicitly.

## Safety boundaries

<HARD-GATE>
A bounded user request authorizes the bounded local work it names; do not seek a duplicate approval. Pause when the next action expands beyond that request into secrets or private data, dependency installation, authentication or permission changes, destructive/live/remote mutation, deployment, release, publication, or a public machine-contract change. Explicit authorization must cover the effect and target; then the selected specialist's stricter conditions still apply.
</HARD-GATE>

This orchestrator never weakens a specialist's safety, incident, rollback, or evidence boundary. Reading or editing local configuration is not permission to trigger, reconcile, approve, promote, roll back, deploy, or mutate a remote system. A helper `PASS` establishes only its narrow check, not operational quality or live success.

## Output contract

Preserve these semantics in a user-appropriate order:

- route and concise ownership reason;
- requested scope, target, exclusions, urgency, and authority boundary;
- completed investigation or local work with evidence locators;
- handoff state, live hypothesis, and unresolved decisions when relevant;
- effects not performed and checks unavailable or still required;
- outcome and proof level, with live state claimed only from direct current evidence.

The contract is semantic, not a fixed report. Focus-friendly delivery may reorder it without hiding safety, blockers, failed checks, or proof limits.

## Common pitfalls

- Invoking all three DevOps specialists for every operational request.
- Confusing Kubernetes authoring with GitOps reconciliation ownership.
- Editing product code under a pipeline or incident label instead of handing it to Software Engineering.
- Replaying logs and repository discovery after a current handoff already supplies them.
- Treating successful syntax, lint, plan, or helper output as deployment or recovery proof.
- Expanding a local fix into a trigger, reconcile, rollback, deployment, or release without exact authority.

## Verification checklist

- [ ] The smallest owning specialist was selected, and direct use remained available.
- [ ] Any combined route is necessary for the same cross-cutting outcome.
- [ ] IaC, Kubernetes/cloud authoring, and product-code work was handed to the owning domain.
- [ ] Current discovery and evidence accompanied the handoff without unnecessary replay.
- [ ] Expanded remote or privileged effects had exact authority and retained specialist gates.
- [ ] The completion statement does not generalize beyond directly verified checks or live state.
