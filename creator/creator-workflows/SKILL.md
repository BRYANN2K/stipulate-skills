---
name: creator-workflows
description: "Use when a creator-workflow request is broad, ambiguous between private build-in-public capture and prose-pattern audit, genuinely crosses those activities, or needs explicit boundaries around later drafting or publication. Focused capture and audit requests go directly to their specialists."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients; private journal capture is local and external channel access is neither required nor implied.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: creator
  tags: creator-workflows, orchestration, routing, build-in-public, prose-audit, privacy
---

# Creator Workflows

## Overview

Route a creator outcome to the smallest specialist that owns it. This skill is a lightweight entry point, not a content factory, publication pipeline, or replacement for editorial judgment.

Private capture, editorial audit, drafting, and external publication are distinct outcomes. Use a specialist directly when intent is clear, and combine only for a genuinely cross-cutting request. Do not impose mandatory phases, plans, manifests, artifacts beyond the requested content, option counts, validators, or a second approval.

## When to use

- The request broadly concerns preserving a build-in-public event or auditing an existing draft and needs classification.
- The user asks for more than one of capture, audit, drafting, channel adaptation, or publication and the boundaries must remain explicit.
- Selected safe creator context must be handed to another domain without exposing the private journal or repeating completed discovery.

Do not use this orchestrator to create content merely because a development event seems interesting.

## Routing

| User outcome | Smallest route |
|---|---|
| Privately preserve a meaningful bug, failed approach, decision, experiment, surprise, pivot, or verified result; optionally mine selected safe events for ideas when requested | [build-in-public-journal](../build-in-public-journal/SKILL.md) |
| Detect assistant-like prose patterns in an existing draft, or rewrite/edit it when explicitly requested | [prose-pattern-audit](../prose-pattern-audit/SKILL.md) |
| Draft new publishable content, adapt it to a channel, or publish externally | Separate requested outcome and handoff to the appropriate writing/channel workflow; neither capture nor audit supplies that authority |

Capturing an idea never implies drafting it. Auditing a draft never implies rewriting it. Drafting never implies publication.

## Workflow

These are routing decisions, not mandatory phases:

1. Classify the requested outcome as private capture, editorial audit, rewrite, new drafting, channel adaptation, publication, or an explicitly requested combination.
2. Inspect only the selected material needed for that outcome. Preserve provenance and sanitize private, secret, customer, security, and identifying details before any broader handoff.
3. Select one specialist by default. Use both only when the user separately requests capture and an audit of an already existing draft.
4. Only when approved creator work actually crosses a domain boundary, use the [optional cross-domain handoff semantics](../../agent-workflows/agent-workflows/references/domain-handoffs.md) to distinguish consultation from ownership transfer. Pass only selected sanitized excerpts, provenance, freshness, completed work, open question, last mutation, drafting/publication authority, and return condition; route directly to the concrete writing or channel specialist once known, never the entire private journal, and do not replay current discovery.
5. Verify only what was requested and stop. Keep capture, editorial assessment, rewrite, draft readiness, channel readiness, and publication status distinct.

## Safety boundaries

A bounded request authorizes the bounded local capture or audit it names; do not ask for a duplicate approval. It does not authorize reading unrelated private notes, exposing private data, installing dependencies, changing authentication or permissions, destructive/live/remote mutation, moving private material into a tracked/public location, drafting, release, publication, or changing a public machine contract beyond the stated scope.

External drafting or publication requires a separate explicit request; publication also requires exact authorization for the content, destination, account/identity, and audience. Follow each selected specialist's stricter privacy, mutation, authorship, and proof boundaries. Never claim an audit identifies whether a human or model wrote the text.

A journal helper, prose scan, or other `PASS` proves only its scoped structural check. It is not editorial quality proof, privacy proof, channel fitness, or evidence that anything was published.

## Output contract

Preserve these semantics in any focus-appropriate order:

- route and requested outcome: capture, audit, rewrite, drafting handoff, or publication handoff;
- selected source scope, privacy/sanitization boundary, and authority boundary;
- local artifact or editorial findings, with provenance where relevant;
- safe handoff context and excluded private material;
- what was not drafted, rewritten, moved, shared, or published;
- outcome and proof level without collapsing the distinct states.

This contract is semantic, not a fixed report. Focus-friendly delivery may reorder it but cannot hide privacy decisions, unsupported claims, editorial limitations, or publication status.

## Common pitfalls

- Turning every bug, decision, or experiment into content without a capture request.
- Treating a private journal entry as a ready draft or permission to share it.
- Running a prose audit before a draft exists or presenting it as authorship detection.
- Rewriting after a detect-only request.
- Passing a whole private journal across domains when approved excerpts are sufficient.
- Treating helper success as editorial, privacy, channel, or publication proof.
- Drafting or publishing merely because an idea was captured.

## Verification checklist

- [ ] The smallest specialist was selected for the explicitly requested creator outcome.
- [ ] Capture, audit, rewrite, drafting, channel adaptation, and publication remained distinct.
- [ ] Only selected, sanitized material crossed a domain boundary; completed discovery was preserved.
- [ ] Detect-only work did not become a rewrite, and capture did not become a draft.
- [ ] External publication, if requested, retained exact destination authority and independent readback requirements.
- [ ] The reported proof level matches the actual local artifact, audit, handoff, or external evidence.
