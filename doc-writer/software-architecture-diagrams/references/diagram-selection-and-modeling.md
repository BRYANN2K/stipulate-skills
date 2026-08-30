# Diagram selection and architecture modeling

## Model, view, and render

Keep the architecture facts independent of one Mermaid file. The model names real elements, relationships, and boundaries. A view selects the subset needed for one audience/question. Mermaid source encodes that view, and a renderer turns the source into a presentation.

This separation lets several views share names without forcing one master diagram. It also prevents a successful render from being treated as proof that the underlying architecture is true.

The model/view/render distinction was informed by [structurizr/structurizr at `9ff1663`](https://github.com/structurizr/structurizr/tree/9ff16634c3b8574584262ae8545510bbb1d1b4bd) (Apache-2.0). The terminology and workflow here are independently written and do not reproduce the unlicensed C4 model site.

## Common views

### Context

Show the focal software system, people or roles that use it, and material external systems. Internal details belong only when they are necessary to answer the context question.

### Deployable-unit

Show independently runnable/deployable units and relevant stores inside the system boundary, plus external actors/systems. When a repository uses C4-style terminology it may call these containers; do not assume that means Docker.

### Component

Show meaningful modules inside one unit when an implementation, ownership, or dependency question needs them. Do not diagram every class.

### Deployment

Map software instances or units to runtime/infrastructure nodes, environments, regions/zones, networks, or orchestrators when those facts matter. Separate logical and deployment views when combining them obscures either question.

### Other focused views

- **Sequence:** ordered messages for one scenario, including relevant failure or asynchronous behavior.
- **State:** lifecycle states and guarded, terminal, or error transitions.
- **ER:** entities, keys, ownership, and cardinality rather than runtime calls.
- **Data flow:** transformations, stores, trust boundaries, and data classes.
- **Flowchart:** decisions, pipelines, dependencies, or a simplified topology.

## Relationship semantics

Name the purpose rather than writing only “uses.” Distinguish synchronous calls, asynchronous events, data replication, human action, and control-plane management when the distinction helps answer the question. Include protocol or transport only when sourced and material.

## Optional semantic-model validation

When the repository already has a structured architecture model or a compatible validator, a focused semantic check can sit between Mermaid parsing and render inspection. Check only useful invariants such as resolvable identifiers, valid relationship endpoints and direction, boundary membership, and view filters that select the intended elements. Do not introduce a modeling tool solely to satisfy this step.

Report this as a separate middle-layer result: it establishes more than notation syntax, but less than architecture truth. A self-consistent model can still be stale or wrong about the running system, and a renderer can still present it poorly.

## Aggregate-edge ambiguity

A summary view may collapse several underlying relationships into one edge between parent or grouped nodes. For each aggregate edge, ask whether the hidden relationships differ materially in direction, purpose, protocol, data sensitivity, or trust boundary. If a reader could infer one call or one path where several distinct flows exist, expand the edge, split the view, label the aggregation, or provide a small relationship table. Do not preserve a cleaner picture at the cost of false singularity.

## Compact evals

- **Positive:** A local model validator resolves all endpoints, then review finds a group-to-group edge hiding both commands and events; the view splits those flows and reports semantic validity separately from source fidelity and readability.
- **Negative:** A diagram parses and its aggregated edge looks tidy, so it is declared architecturally correct even though the edge compresses opposite directions and two trust paths.

## Audience-specific projection

Security, onboarding, incident response, and deployment readers often need different subsets of the same model. Create only the views requested or needed to answer the current question; a shared model file is optional unless local tooling requires one.

## Semantic-model source note

The optional middle-layer and aggregate-edge checks are independently worded from LikeC4's modeled-relationship guidance in [`apps/docs/src/content/docs/dsl/relationships.mdx` at `84ff665d`](https://github.com/likec4/likec4/blob/84ff665d18e3d7eb8f5b9ffcd8c2a7a059e936f1/apps/docs/src/content/docs/dsl/relationships.mdx) and its multiple-relationship view cases in [`packages/core/src/compute-view/element-view/multiple-relationships.spec.ts` at `84ff665d`](https://github.com/likec4/likec4/blob/84ff665d18e3d7eb8f5b9ffcd8c2a7a059e936f1/packages/core/src/compute-view/element-view/multiple-relationships.spec.ts) (MIT). LikeC4 is an example source, not a required dependency or architecture authority.
