---
name: architecture-decision-records
description: "Use when proposing, documenting, reviewing, accepting, deprecating, or superseding a consequential software or infrastructure decision. Produces a concise repository-native ADR with context, decision, rationale and trade-offs, truthful status, and germane consequences; adds governance or analysis detail only when the decision needs it."
license: Apache-2.0
compatibility: Writes Markdown ADRs and follows existing repository naming, location, template, indexing, and status conventions when present.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: doc-writer
  tags: adr, architecture, decisions, madr, governance
---

# Architecture Decision Records

## Overview

Preserve why a consequential decision was made and what it changes. Use the repository's existing ADR convention and the shortest record that keeps the decision intelligible later.

The repository minimum is:

- context: the problem and material constraints;
- decision: what is chosen and its scope;
- rationale and trade-offs: why this choice is reasonable and what it gives up;
- truthful status;
- consequences germane to adopting the decision.

Named steps below are guidance, not acceptance gates. Add options matrices, owners, deadlines, migration plans, validation measures, revisit triggers, indexes, or backlinks only when repository policy or the decision actually needs them.

<HARD-GATE>
Do not invent measurements, cost or performance claims, constraints, approval, deciders, implementation state, or acceptance. `Accepted` means the repository's actual decision authority accepted it; an agent draft is normally `Proposed` unless the user or governing process establishes otherwise. Do not rewrite an accepted historical ADR to make the past appear different; supersede or amend it according to repository convention.
</HARD-GATE>

## When to use

Use an ADR for a durable choice that is consequential, difficult to reverse, cross-cutting, or changes an important security, data, operational, platform, protocol, persistence, or compatibility boundary.

Do not create one for routine implementation detail, meeting minutes, a disposable experiment without lasting consequence, or a decision already captured canonically elsewhere.

## Workflow

### 1. Inherit the local ADR system

Inspect applicable repository instructions and enough existing ADRs to learn the path, naming, format, and status vocabulary. Check related decisions when the new record depends on, contradicts, amends, deprecates, or supersedes one. For a supersession, inspect both records and learn whether local convention changes the old status, keeps reciprocal relationship fields, or records lifecycle only in an index.

Do not require an index, numeric identifier, frontmatter, owner, decider list, or backlink when the repository does not use it. For a new ADR system, [the minimal template](templates/adr.md) is optional; a direct Markdown record containing the repository minimum is sufficient.

### 2. Establish the decision facts

Gather the problem, current constraints, selected decision, scope, evidence, trade-offs, and likely consequences. Ask only for an unresolved fact that changes the decision or its truthful status.

Consider alternatives to the extent needed to explain the trade-off. Record the status quo or rejected options only when they were genuinely viable or materially clarify the choice. Do not create strawmen or an options matrix merely to make a decision look rigorous. Load [decision quality](references/decision-quality.md) for evidence labels, comparison, and revisit guidance when uncertainty or option analysis is material.

### 3. Write the concise record

Use an active title when local style permits. Make context understandable without the original meeting, state the choice directly, connect rationale to actual constraints/evidence, and name both benefits and accepted costs. Include neutral consequences only when they add meaning.

Add conditional detail when germane:

- scope/non-goals for an easy-to-misapply decision;
- implementation or migration for a choice that changes existing systems or data;
- security, reliability, operational, or compatibility effects;
- validation evidence or revisit triggers for important uncertain assumptions;
- owner, deadline, deciders, or consultation metadata when governance requires it;
- related ADRs, index entry, backlinks, issue/PR/spec links when the repository maintains them; for a supersession, name the old record from the new one and add the reciprocal old-to-new link only when local convention supports it.

### 4. Verify the claim and integration

Re-read the final ADR against its sources and repository convention. Confirm that the status is authorized, rationale does not overstate evidence, negative trade-offs are visible, and consequences match the chosen scope. Check only links, indexes, templates, or docs builds affected by the change.

For a supersession, verify the new-to-old relation and, where local convention supports it, the reciprocal old-to-new relation. Ensure lifecycle statuses do not imply that contradictory decisions both govern the same scope. A proposed replacement must not prematurely make the old decision `Superseded`; after authorized acceptance, update only the lifecycle status, relationship, or index fields allowed by convention and preserve the old record's date, context, decision, and rationale as history.

A Markdown parser or link checker proves structure or link resolution, not decision quality, approval, implementation, or operational success. Report any unverified assumption and any conditional integration not performed.

## Status guidance

Use repository-specific terms when present. Common meanings are:

| Status | Meaning |
|---|---|
| Proposed | Under consideration; not yet governing |
| Accepted | Approved through the applicable decision process |
| Rejected | Considered and not selected |
| Deprecated | Retained as history but no longer recommended |
| Superseded | Replaced by a named later decision |

Do not add lifecycle states the repository does not need.

## Output contract

Preserve this information in the ADR or accompanying response:

- ADR path or intended location;
- status;
- context, decision, rationale/trade-offs, and germane consequences;
- evidence or assumptions that materially support the rationale;
- conditional migration, governance, related-record, or validation work performed or left open.

The repository's ADR format controls the artifact order. A user-requested or host presentation adapter may reorder or chunk the accompanying response as long as it does not hide status, decision, material trade-offs, evidence limits, or open consequences.

## Common pitfalls

- Treating a preferred implementation as an already accepted decision.
- Adding fake alternatives, numeric matrices, or governance metadata for appearance.
- Inventing cost, performance, security, or approval claims.
- Hiding negative consequences or mixing requirements with the decision itself.
- Turning a concise decision record into a full design specification.
- Rewriting accepted history instead of recording a transparent supersession or amendment.

## Verification checklist

- Can a future reader understand the problem, choice, rationale, trade-offs, and consequences?
- Does status reflect real authority rather than document existence?
- Are optional sections present because they matter or because local convention requires them?
- Are evidence and assumptions distinguishable?
- For a supersession, are supported reciprocal links and lifecycle statuses consistent without rewriting history?
- Were only applicable indexes, backlinks, or validation checks updated?
