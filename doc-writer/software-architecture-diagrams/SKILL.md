---
name: software-architecture-diagrams
description: Use when designing, generating, reviewing, or fixing Mermaid software diagrams, including C4-style context/container/component views, sequence, flow, deployment, state, and ER diagrams. Models boundaries and flows first, then validates syntax and readability.
license: Apache-2.0
compatibility: Produces Mermaid embedded in Markdown or .mmd files. Mermaid CLI is optional for rendering validation.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: doc-writer
  tags: mermaid, c4, architecture, sequence-diagram, deployment-diagram
---

# Software Architecture Diagrams

## Overview

Create diagrams that answer one architectural question for one audience. Build the system model before Mermaid syntax, choose the smallest useful diagram type, expose trust/deployment/data boundaries, and validate the rendered result.

## When to use

- System context, container, component, deployment, data flow, dependency, or topology diagrams.
- Sequence, state, flowchart, ER, and operational/change diagrams.
- Review or repair unreadable, misleading, or invalid Mermaid.

Do not use a diagram when a table or short list communicates the answer more accurately. Do not use C4 labels mechanically for non-software relationships.

## Workflow

### 1. State the diagram question

Define:

- audience;
- decision/question the diagram supports;
- scope and abstraction level;
- time/state: current, target, migration, failure, or request flow;
- authoritative sources and unknowns.

Examples: “How does a user request cross trust boundaries?” or “Which deployable units own transactional data?”

**Complete when:** one sentence defines what a reader should understand after viewing the diagram.

### 2. Build the model before syntax

Inventory:

- people/actors and external systems;
- software systems, deployable containers/services, components only if needed;
- data stores, queues, control planes, and operational tools;
- ownership, trust, network, deployment, region/AZ, and data boundaries;
- relationships with direction, protocol/data, and purpose;
- assumptions and omitted detail.

Names must reflect real repository/runtime concepts. Do not invent a service to improve visual symmetry.

### 3. Choose the diagram type

Load `references/diagram-selection-and-modeling.md`.

| Question | Diagram |
|---|---|
| Who uses the system and what surrounds it? | C4-style context |
| What deployable units and data stores exist? | Container/deployment flowchart |
| How does one scenario unfold over time? | Sequence |
| How do states and transitions behave? | State |
| How does data/entities relate? | ER or data flow |
| How does a decision/process branch? | Flowchart |

Use multiple focused diagrams rather than one diagram mixing every abstraction level.

### 4. Draft structure

For architecture flowcharts:

- choose `flowchart LR` for pipelines/interactions or `TB` for layers/hierarchy;
- group meaningful boundaries with subgraphs;
- keep node IDs stable and labels human-readable;
- label important edges with protocol/event/data/purpose;
- show direction explicitly; use two arrows when interaction is truly bidirectional;
- include a legend only when notation is not obvious.

For C4-style diagrams, keep context, container, and component views separate. Mermaid's C4 syntax may be experimental across renderers; a disciplined flowchart with C4 semantics is often more portable.

### 5. Apply readability constraints

- One abstraction level and primary story per diagram.
- Aim for 7±2 primary elements per visual group; split when scanning fails.
- Avoid crossing edges through declaration/order and orientation changes.
- Use short labels; move explanation to nearby prose.
- Use color redundantly with shape/border/text; preserve dark/light contrast.
- No emoji by default in professional diagrams.
- Do not encode status only by red/green.
- Avoid custom icons or remote assets unless the renderer is known to support them.

Load `references/mermaid-safety.md` for syntax and security.

### 6. Write explanatory prose

A diagram artifact includes:

- title and question;
- scope/state/date or version;
- Mermaid source;
- 3–8 bullets explaining critical boundaries/flows;
- assumptions and intentionally omitted detail;
- links to related ADRs, APIs, runbooks, or source files.

The prose should explain decisions and caveats, not narrate every arrow.

### 7. Validate

1. Parse/render with the project's Mermaid tool or Mermaid CLI when available.
2. Inspect the rendered image, not source alone.
3. Check clipped labels, overlap, unreadable contrast, edge crossings, and mobile/README width.
4. Verify every node/relationship against sources.
5. Verify GitHub/docs renderer compatibility and accessible surrounding text.

If no renderer is available, label rendering unverified and still perform syntax/static checks. Use `templates/architecture-diagram.md`.

### 8. Review for architectural truth

Ask:

- Does the diagram answer its stated question?
- Are actors, the actual product/system, and external dependencies distinct?
- Are trust, data, deployment, and ownership boundaries clear where relevant?
- Are arrows semantically accurate and directional?
- Is one node standing in for several materially different responsibilities?
- Does the diagram contradict code, IaC, ADRs, or runtime evidence?
- What important fact was omitted, and is that omission declared?

## Output contract

- File path and diagram type
- Audience/question/scope/state
- Mermaid source
- Explanation, assumptions, and omissions
- Source links/paths
- Render validation status

## Common pitfalls

- Starting with Mermaid syntax before understanding architecture.
- Mixing context, containers, components, deployment, and sequence in one diagram.
- Using “Frontend,” “Backend,” and “Database” when real boundaries are known.
- Treating a UI box as the entire product/system.
- Omitting external actors, identity linking, or reverse flows.
- Duplicating the same sync relationship as arrows and a “Sync” box.
- Overusing styling to hide an unclear model.
- Assuming valid syntax means a readable or truthful diagram.
- Putting sensitive hostnames, account IDs, or internal topology in public docs.

## Verification checklist

- [ ] Audience, question, scope, abstraction, and current/target state are explicit.
- [ ] Nodes and relationships trace to real sources or labeled assumptions.
- [ ] Diagram type fits the question.
- [ ] Boundaries and direction are accurate.
- [ ] Syntax was rendered or rendering is honestly marked unavailable.
- [ ] The rendered output is readable and accessible.
- [ ] Related ADRs/docs and omissions are linked.
- [ ] No sensitive infrastructure detail is exposed unintentionally.
