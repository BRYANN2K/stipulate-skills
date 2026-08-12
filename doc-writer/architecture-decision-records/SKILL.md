---
name: architecture-decision-records
description: Use when proposing, documenting, reviewing, accepting, deprecating, or superseding a consequential software or infrastructure decision. Creates concise MADR-style ADRs grounded in constraints, options, trade-offs, evidence, consequences, and validation.
license: Apache-2.0
compatibility: Writes Markdown ADRs and follows existing repository naming, indexing, and status conventions when present.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: doc-writer
  tags: adr, architecture, decisions, madr, governance
---

# Architecture Decision Records

## Overview

Capture why a consequential decision was made, not a retrospective justification for a predetermined choice. Preserve context, real options, trade-offs, consequences, and the conditions under which the decision should be revisited.

## When to use

Create an ADR when a decision is costly to reverse, affects multiple components/teams, changes a security/data/operational boundary, selects a platform/protocol/persistence model, or establishes a durable constraint.

Do not create an ADR for routine implementation detail, a temporary experiment with no durable consequence, meeting minutes, or a decision already captured canonically elsewhere.

## Workflow

### 1. Discover the ADR system

Inspect existing ADR directory, template, numbering, index, statuses, owners/deciders, and related architecture docs. Follow local convention unless it omits essential decision information.

Search for earlier decisions that this proposal depends on, contradicts, deprecates, or supersedes.

**Complete when:** path, next identifier, status vocabulary, related decisions, and decision owner are known.

### 2. Establish decision readiness

Capture:

- concrete problem and why a decision is needed now;
- scope and non-goals;
- decision drivers and hard constraints;
- stakeholders/deciders;
- evidence already available and unresolved uncertainty;
- decision deadline and cost of no decision.

If the option space or authority is genuinely unresolved, write **Proposed**, not **Accepted**.

### 3. Define viable options

Include the status quo when it is viable. Each option must be implementable enough to compare. Do not add a strawman to make the preferred choice appear inevitable.

Compare using the same decision drivers. Useful dimensions include security, reliability, operability, performance, cost, delivery speed, portability, team capability, migration, reversibility, lock-in, and compliance.

Load `references/decision-quality.md` for scoring and evidence discipline.

### 4. Write the decision

Use `templates/adr.md`. Keep the title an active decision phrase, such as “Use PostgreSQL for transactional state,” not “Database decision.”

The decision section states:

- what is chosen;
- scope/boundaries;
- why it wins against the stated drivers;
- conditions and exceptions;
- effective point or rollout approach.

Do not repeat the full option analysis.

### 5. Record consequences honestly

Include positive, negative, and neutral consequences. Negative consequences are accepted costs, not defects to hide. Add mitigation only when it is actually planned.

Record implementation/migration work, operational burden, security/data effects, new failure modes, observability needs, and future constraints.

### 6. Define validation and revisit triggers

State how the team will know the decision worked. Prefer measurable outcomes or review evidence. Add revisit triggers such as scale threshold, vendor/API change, reliability target miss, cost threshold, regulation, or failed operational assumption.

### 7. Link the decision graph

Update the ADR index and bidirectional relationships:

- supersedes / superseded by;
- amends / amended by;
- depends on;
- related to;
- implemented by issue/PR/spec.

Never edit an accepted ADR to pretend history changed. Add a new ADR that supersedes or amends it; correct only factual/formatting errors transparently.

### 8. Review

Check:

- problem and drivers precede the decision;
- options are credible and compared consistently;
- claims/evidence are sourced or labeled assumptions;
- consequences and migration are explicit;
- status matches actual governance state;
- links and identifier are valid;
- the ADR can be understood without reading the original meeting transcript.

## Status lifecycle

| Status | Meaning |
|---|---|
| Proposed | Under discussion; not binding |
| Accepted | Approved and currently governing |
| Rejected | Considered and not selected |
| Deprecated | Still historical but no longer recommended |
| Superseded | Replaced by a named newer ADR |

Use repository-specific equivalents when present.

## Output contract

- ADR path and identifier
- Status and deciders
- Context/problem
- Decision drivers and constraints
- Viable options and comparison
- Decision and rationale
- Consequences
- Implementation/migration
- Validation and revisit triggers
- Related ADRs/evidence
- Index/backlink updates

## Common pitfalls

- Writing the ADR after implementation as marketing for the chosen option.
- Confusing requirements (“must stay in EU”) with decisions (“use provider X”).
- Comparing options against different criteria.
- Inventing cost/performance/security claims.
- Omitting status quo, migration, or negative consequences.
- Using “Accepted” without an accountable decider.
- Mutating historical accepted ADRs instead of superseding them.
- Turning ADRs into large design specifications.

## Verification checklist

- [ ] Existing ADR convention and related decisions were inspected.
- [ ] Problem, scope, drivers, constraints, deciders, and evidence are explicit.
- [ ] Options are viable and compared consistently.
- [ ] Decision rationale follows from drivers and evidence.
- [ ] Negative consequences, migration, and operations are honest.
- [ ] Validation and revisit triggers are measurable.
- [ ] Lifecycle links and ADR index are updated.
