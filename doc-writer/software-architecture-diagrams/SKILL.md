---
name: software-architecture-diagrams
description: "Use when designing, generating, reviewing, or fixing Mermaid software architecture diagrams, including context, deployable-unit, component, sequence, flow, deployment, state, and ER views. Separates the architecture model from Mermaid source and rendered presentation, and validates only the claims each check can establish."
license: Apache-2.0
compatibility: Produces Mermaid embedded in Markdown or .mmd files. A Mermaid renderer is optional unless a rendered/readability claim or repository protocol requires it.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: doc-writer
  tags: mermaid, c4, architecture, sequence-diagram, deployment-diagram
---

# Software Architecture Diagrams

## Overview

Create the smallest architecture view that answers the reader's question. Keep three layers distinct:

1. **Model:** real elements, boundaries, relationships, state, and uncertainty.
2. **Source:** Mermaid notation that projects the selected view.
3. **Presentation:** the rendered diagram plus enough adjacent prose to interpret it.

A syntax check evaluates source syntax. It does not prove model truth, useful scope, readability, accessibility, or renderer compatibility. The named steps below are guidance and may be combined for a bounded repair.

<HARD-GATE>
Do not invent a service, data flow, protocol, ownership boundary, deployment, runtime state, or trust relationship to make a diagram look complete. Do not expose secrets, customer identifiers, private endpoints, account IDs, sensitive topology, or exploitable security detail in an artifact whose audience is not authorized to see it.
</HARD-GATE>

## When to use

- Context, deployable-unit, component, deployment, data-flow, dependency, topology, sequence, state, flowchart, ER, or operational/change views.
- Mermaid generation, repair, simplification, portability, or rendered-readability review.
- C4-style views when that vocabulary is already useful to the repository or audience.

Use a table, list, or prose instead when it communicates the answer more accurately. Do not force C4-style labels onto a question that needs another view.

## Workflow

### 1. Name the question and inspect the sources

Identify the audience, the question or decision, current/target/migration/failure state, scope, and authoritative sources. For a small Mermaid repair, the existing diagram and affected source may be enough.

Inspect only the code, configuration, IaC, schemas, runtime evidence, ADRs, or user-provided facts needed to establish the model. Label assumptions and omitted detail rather than drawing them as fact.

### 2. Build the model before notation

List the elements and relationships needed to answer the question. Include actors, external systems, deployable units, components, stores, queues, control planes, or boundaries only when relevant. Give relationships a direction and meaningful purpose; add protocol, event, or data labels only when they affect interpretation.

Keep a shared vocabulary across views, but do not require a separate model file unless the repository or tooling uses one. Load [diagram selection and modeling](references/diagram-selection-and-modeling.md) when the view type or abstraction is uncertain.

### 3. Project the smallest useful Mermaid view

Choose the diagram type that best exposes the requested fact:

| Reader question | Likely view |
|---|---|
| What surrounds and uses the focal system? | Context |
| What runs independently or stores data? | Deployable-unit or deployment |
| How does one scenario unfold? | Sequence |
| How do lifecycle transitions work? | State |
| How are entities or transformations related? | ER or data flow |
| Where does a process or dependency branch? | Flowchart |

Use meaningful boundaries and stable node IDs, concise human labels, explicit direction, and a legend only when notation is not self-explanatory. Split or change orientation when the rendered result becomes hard to scan; there is no required node count, bullet count, or universal layout direction.

Mermaid C4 syntax varies across renderers. A portable flowchart can express context/deployable/component semantics when the target does not support the specialized syntax. Use Mermaid `accTitle` and `accDescr` only when the target Mermaid version and diagram type support them; otherwise keep an equivalent title and description in adjacent prose or repository-native host metadata. Load [Mermaid safety and portability](references/mermaid-safety.md) for untrusted labels, directives, links, renderer differences, and accessibility.

### 4. Add only enough prose

Surround the diagram with enough title, scope/state, explanation, assumptions, omissions, and source/decision links for the reader to answer the stated question. Some diagrams need one sentence; a migration or security view may need more. Do not narrate every arrow or fill a fixed number of bullets.

[The architecture diagram template](templates/architecture-diagram.md) is optional for a new standalone artifact. Inherit the repository's existing documentation structure when present.

### 5. Validate the claims that matter

Use the smallest applicable checks:

- compare nodes, boundaries, and relationships with their sources to assess architecture fidelity;
- parse Mermaid when syntax validity is claimed;
- when a repository already has a structured architecture model or compatible validator, optionally check identifier resolution, boundary membership, and relationship endpoints after parsing and report this semantic-model result separately;
- render in the repository's actual or compatible renderer when readability, layout, visual hierarchy, or target compatibility is claimed;
- inspect the render for clipping, overlap, contrast, intended-width readability, ambiguous crossings, and aggregate edges that hide materially different underlying directions, protocols, or trust paths;
- when rendered SVG accessibility metadata is claimed, inspect the delivered SVG or host wrapper for an exposed accessible name and description; report this separately from visual readability;
- provide meaningful adjacent text or a text/table equivalent when accessibility or a critical procedure requires it.

If no renderer is available, report rendering as unavailable or unverified. A parser success can support only a syntax claim; semantic-model validation is stronger than parsing but still does not prove the real architecture, and neither can be relabeled as a rendered-quality pass. Re-run only checks affected by the final diagram change.

## Output contract

Preserve this information in the artifact or response:

- path and view type;
- audience, question, scope, and state where needed for interpretation;
- Mermaid source;
- enough explanation, assumptions, omissions, and source locators to answer the question;
- syntax, optional semantic-model, render/readability, and rendered-accessibility-metadata status as separate claims;
- any fidelity, aggregate-edge ambiguity, compatibility, accessibility, or sensitivity gap.

No fixed section order is required. A repository template or presentation adapter may reorder, chunk, or progressively disclose the information as long as it does not hide the model/source/render distinction, evidence, or gaps.

## Common pitfalls

- Starting with Mermaid syntax before establishing the architecture fact.
- Mixing unrelated abstraction levels or stories into one unreadable view.
- Using generic labels when real boundaries are known.
- Duplicating one relationship as both an arrow and a pseudo-component.
- Treating color or styling as a substitute for a clear model.
- Treating valid syntax—or an optional semantic-model pass—as proof of a truthful or readable diagram.
- Letting one aggregate edge imply a single relationship when it hides materially different flows.
- Treating `accTitle`/`accDescr` in source as proof that the delivered SVG exposes accessibility metadata.
- Publishing sensitive topology to an audience that should not receive it.

## Verification checklist

- Does the view answer its stated question without invented elements?
- Are direction, boundaries, and relationship semantics traceable to sources or labeled assumptions?
- Are syntax, optional semantic-model, render/readability, rendered accessibility metadata, and architecture-fidelity results reported without collapsing their claims?
- Were aggregate edges checked for misleading compression?
- Is adjacent prose sufficient for this audience rather than a quota?
- Are unavailable checks and sensitive omissions explicit?
