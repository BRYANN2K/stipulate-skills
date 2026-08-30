---
name: documentation
description: "Use when a documentation request is broad, crosses developer docs, architectural decisions, or software diagrams, or needs the smallest combination of those specialists without turning documentation work into a mandatory governance process."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and repository-native Markdown, docs-as-code, ADR, and Mermaid conventions.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: doc-writer
  tags: documentation, orchestration, routing, adr, diagrams, developer-docs
---

# Documentation

## Overview

Route a documentation outcome to the smallest specialist that owns the deliverable. This skill is a lightweight entry point, not a replacement for its specialists, a documentation program, or an architecture-governance gate.

Use a specialist directly when the deliverable is clear. Combine specialists only when the requested deliverable genuinely needs more than one. Do not require phases, plans, manifests, auxiliary artifacts, option counts, validators, or a second approval.

## When to use

- The request says “document this” but does not distinguish developer documentation, a decision record, or an architecture diagram.
- A single requested deliverable materially combines prose, a consequential decision, and/or a diagram.
- Another domain hands off grounded implementation or architecture evidence that should not be rediscovered.

Do not use this orchestrator to add an ADR or diagram to every documentation change.

## Routing

| User outcome | Smallest route |
|---|---|
| Create, restructure, audit, or maintain READMEs, quickstarts, tutorials, how-to guides, concepts, reference, runbooks, troubleshooting, migrations, changelogs, or docs-as-code | [developer-documentation](../developer-documentation/SKILL.md) |
| Propose, document, review, accept, deprecate, or supersede a consequential decision | [architecture-decision-records](../architecture-decision-records/SKILL.md) |
| Design, generate, review, or fix a Mermaid architecture, sequence, flow, deployment, state, or ER diagram | [software-architecture-diagrams](../software-architecture-diagrams/SKILL.md) |

Combine only when the deliverable itself requires it—for example, an ADR whose decision is materially clarified by a diagram. A how-to does not automatically need an ADR; an ADR does not automatically need a diagram; a diagram does not automatically need a documentation restructure.

If documentation exposes an unresolved implementation, infrastructure, delivery, or design question, hand off only that question to the owning domain. Carry the source locators, established facts, terminology, decisions, and exact documentation gap so completed discovery is not replayed.

## Workflow

These are routing decisions, not mandatory phases:

1. Identify the audience, task, document type, requested destination, and whether a real decision or model must be captured.
2. Inspect only the authoritative sources needed for changed claims and repository conventions.
3. Select one specialist by default; combine specialists only where their outputs are inseparable in the requested deliverable.
4. Only when an unresolved dependency actually crosses a domain boundary, use the [optional cross-domain handoff semantics](../../agent-workflows/agent-workflows/references/domain-handoffs.md). Keep Documentation as the synthesizing owner for a consultation, send one bounded question directly to the concrete specialist, and carry facts, locators, freshness, completed work, decision status, authority, and the condition for returning to the document; do not replay source discovery or require a handoff file.
5. Apply the selected specialist's own example, diagram, status, link, and proof checks proportionately to the claim.
6. Stop at the requested document outcome; drafting an ADR or diagram does not enact a decision or system change.

## Safety boundaries

A bounded request authorizes the bounded local documentation work it names; no second approval is required for the same scope. Pause only if the next action expands into secrets or private data, dependency installation, authentication or permission changes, destructive/live/remote mutation, deployment, release, publication, or defining/changing a public machine contract beyond the request.

Do not expose private source material in examples or diagrams. Do not silently convert a proposal into an accepted decision, documentation into implementation truth, or a local draft into published content. The selected specialist's truth, safety, and proof boundaries remain in force.

A formatter, parser, link checker, Mermaid helper, or other `PASS` proves only its narrow check. It does not establish technical accuracy, rendered readability, example behavior, acceptance, or publication.

## Output contract

Preserve these semantics in a user-appropriate order:

- selected specialist(s) and deliverable ownership;
- audience, requested scope/destination, established facts, unknowns, and decision status;
- changed or returned content with source/evidence locators;
- any cross-domain handoff and the unresolved documentation dependency;
- checks performed, gaps, and publication or implementation explicitly not performed;
- outcome and proof level bounded to the evidence.

This is a semantic contract, not a fixed template. Focus-friendly delivery may reorder it while keeping unknowns, status, safety, and evidence limits visible.

## Common pitfalls

- Running all three specialists for a simple documentation edit.
- Adding an ADR or diagram because a workflow says to, not because the deliverable needs one.
- Re-researching source behavior already grounded in a handoff.
- Inventing commands, APIs, compatibility, architecture, live state, or decision status.
- Treating parse success as technical accuracy or readable rendering.
- Publishing a local draft or enacting a documented decision without separate authority.

## Verification checklist

- [ ] The route matches the actual deliverable and uses the smallest specialist set.
- [ ] Combined specialists are necessary to the same requested deliverable.
- [ ] Claims, examples, models, and decision status are grounded in current authoritative sources.
- [ ] Cross-domain handoffs preserve facts, terminology, decisions, and source locators.
- [ ] Local drafting was not overstated as implementation, acceptance, or publication.
- [ ] Each reported check proves only its stated documentation property.
