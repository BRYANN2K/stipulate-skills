---
name: agent-workflows
description: "Use when an agent-workflow request is broad, ambiguous, or genuinely crosses repository instructions, completion-proof discipline, and explicitly requested focus-friendly presentation. Focused AGENTS.md, verification, or presentation requests go directly to the matching specialist."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients; focus-friendly delivery is an optional presentation adapter and repository mutation remains governed by the owning domain.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: agent-workflows
  tags: agent-workflows, orchestration, routing, agents-md, verification, presentation
---

# Agent Workflows

## Overview

Route an agent-workflow outcome to the smallest specialist that owns it. This skill is a lightweight entry point, not a replacement for domain work, a universal agent process, or an excuse to add workflow files.

Use a specialist directly when intent is clear. Combine only for a genuinely cross-cutting outcome. Do not impose mandatory phases, plans, manifests, artifacts, option counts, validators, or a second approval.

## When to use

- The request broadly concerns agent instructions, truthful completion claims, or response presentation and needs classification.
- A requested outcome genuinely combines repository agent guidance with evidence-based completion.
- The user explicitly asks for focus-friendly presentation alongside domain work.
- Another domain needs a workflow handoff that retains completed discovery and proof state.

Do not invoke this orchestrator for ordinary domain implementation when none of these concerns is in scope.

## Routing

| User outcome | Smallest route |
|---|---|
| Create, adapt, audit, or split repository `AGENTS.md` instructions | [agents-md-authoring](../agents-md-authoring/SKILL.md) |
| Calibrate a claim that work is done, fixed, tested, deployed, published, or ready to fresh evidence | [verified-completion](../verified-completion/SKILL.md) |
| Present work in an explicitly requested action-first, one-step-at-a-time, exact-command, scannable, or low-overload form | [focus-friendly-delivery](../focus-friendly-delivery/SKILL.md) |

`focus-friendly-delivery` is a presentation adapter. It may reorder or progressively disclose an owning domain's semantic output, but it cannot replace domain workflow, safety, authorization, required detail, or proof. `verified-completion` calibrates claims; it does not manufacture quality criteria or turn a helper `PASS` into proof.

## Workflow

These are routing decisions, not mandatory phases:

1. Identify whether the requested outcome is instruction authoring, completion verification, presentation adaptation, or a necessary combination.
2. Preserve the owning domain's scope, evidence, authority, and unresolved blockers. Inspect only enough additional context to route the workflow concern.
3. Select one specialist by default. Combine, for example, `agents-md-authoring` with `verified-completion` only when the user wants the file changed and the completion claim verified.
4. Apply focus-friendly presentation only from an explicit request or established user preference. Do not infer a diagnosis or preference from behavior.
5. Only when work actually crosses a domain boundary, use the [optional cross-domain handoff semantics](references/domain-handoffs.md) to distinguish consultation from ownership transfer. Carry current scope, evidence, last mutation, open question, authority, and return condition in chat or existing notes; once the concrete specialist is known, route there rather than through another umbrella, and do not replay current work.
6. Return control to the owning domain when substantive implementation, infrastructure, DevOps, documentation, design, or creator work is needed.

## Safety boundaries

A bounded user request authorizes bounded local workflow work such as the named `AGENTS.md` edit; do not request a duplicate approval. Pause when a next action expands into secrets or private data, dependency installation, authentication or permission changes, destructive/live/remote mutation, deployment, release, publication, or a public machine-contract change not already explicitly authorized.

An orchestrator or presentation adapter never weakens the owning specialist's safety or proof boundary. Do not hide failures, skipped checks, uncertainty, authority limits, or residual risk for brevity. Never claim deployment or publication from local evidence, and never infer or store a medical diagnosis.

A helper `PASS` proves only that helper's scoped check. Verification must remain fresh, relevant, direct, inspectable, and proportionate to the actual completion claim.

## Output contract

Preserve these semantics, reordered as needed for the user:

- selected workflow specialist(s) and owning domain;
- requested scope, presentation preference if explicit, and authority boundary;
- completed work, last relevant mutation, and evidence locators;
- outcome and achieved proof level;
- failed, skipped, unavailable, stale, or out-of-scope checks;
- handoff context and unresolved blockers.

The fields are semantic rather than a fixed template. Focus-friendly delivery may lead with the result or current action and defer detail, but it must preserve every material safety and proof fact.

## Common pitfalls

- Creating agent instructions, manifests, or plans when the user asked only for domain work.
- Requiring `AGENTS.md` authoring or a verification artifact for every task.
- Treating focus-friendly delivery as proof, diagnosis, or permission to omit essential detail.
- Treating verified completion as a substitute for domain acceptance criteria or fresh execution.
- Restarting discovery after a handoff instead of using current evidence.
- Asking again for bounded local authority or silently expanding into publication or remote mutation.

## Verification checklist

- [ ] The smallest applicable workflow specialist was selected, or no workflow specialist was added unnecessarily.
- [ ] Focus-friendly delivery was used only from an explicit request or established preference and remained a presentation adapter.
- [ ] The owning domain's safety, quality, and proof requirements remained intact.
- [ ] Completion claims use fresh evidence after the last relevant mutation and disclose gaps.
- [ ] Cross-domain handoffs preserve scope, decisions, evidence, and remaining authority without replay.
- [ ] No helper result, local artifact, or reordered response was overstated as quality, deployment, or publication proof.
