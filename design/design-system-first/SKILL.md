---
name: design-system-first
description: "Use when a bounded request extends an established design system, a consequential shared-system change must remain coherent across reused surfaces, or the user requests a standalone design-system deliverable or audit. Do not use as a universal pre-build gate; inherit the repository's canonical system and keep one-off UI local."
license: Apache-2.0
compatibility: Works with any frontend stack and Agent Skills-compatible client. Rendered validation requires an available browser; artifact-only work must report that limitation.
metadata:
  version: "2.1.0"
  author: BRYANN2K
  category: design
  tags: design-system, system-extraction, tokens, components, states, design-to-code
---

# Design System First

## Overview

Keep the stable install name, but do not treat “first” as a universal ordering rule. Use this skill to extend an affected existing contract, make a consequential shared-system change coherent, or produce a standalone design-system deliverable or audit. The goal is the smallest useful source of truth, not a speculative kit.

For a one-off page or application slice, inherit the repository system and build locally. Extract afterward only when a real shared contract has emerged; otherwise return `NO_EXTRACTION_NEEDED` rather than manufacturing foundations, tokens, components, or states.

Calibrate structure to consequence. Local organization, artifact shape, and output format may use judgment. Shared semantic roles and state truth need enough precision for their consumers. Exact schemas are justified only by an actual project/tooling boundary. A persistent design contract, token file, component catalog, state matrix, or project-local instruction is optional unless the requested deliverable, project convention/consumer, or re-entry across runs or agents needs it.

<HARD-GATE>
In an existing repository, inherit the active design system, native token source, primitives, semantic roles, and conventions unless migration is requested. A direct bounded edit request supplies local write authority for the named existing-system scope: proceed without creating or waiting for a human approval ticket. Human selection is required only when a consequential new-system choice remains unresolved and design judgment was not delegated. Separate authority is still required for scope expansion, migration outside the request, dependencies, destructive or live effects, deployment, and publication. Never create a parallel source of truth, promote a one-off coincidence into a system rule, weaken accessibility or state semantics, or describe a proposal as implemented, approved, live, or published.
</HARD-GATE>

## When to use

Choose one explicit mode:

1. **Bounded extension (`BOUNDED_EXTENSION`)** — a requested local edit extends, reconciles, or extracts an affected token, primitive, component, or state contract inside an established system.
2. **Consequential shared-system change (`CONSEQUENTIAL_SHARED_SYSTEM_CHANGE`)** — a requested change alters semantic roles, public component/state behavior, compatibility, or other shared contracts consumed across multiple surfaces, products, platforms, or teams.
3. **Standalone system deliverable or audit (`STANDALONE_SYSTEM_DELIVERABLE_OR_AUDIT`)** — the user asks for a design-system specification, token/component handoff, project-local contract, or system audit as the deliverable, whether or not product UI implementation is in scope.

Post-prototype extraction uses `BOUNDED_EXTENSION` when it consolidates genuinely repeated existing uses. If a bounded page, experiment, or one-off slice yields no reusable rule, return `NO_EXTRACTION_NEEDED`. Do not invoke this skill merely because frontend code will be written.

Do not use this skill to choose art direction, write the product story, review overall visual quality, or add motion that has no established state purpose.

## Workflow

### 1. Select the mode and decision boundary

State `BOUNDED_EXTENSION`, `CONSEQUENTIAL_SHARED_SYSTEM_CHANGE`, or `STANDALONE_SYSTEM_DELIVERABLE_OR_AUDIT` in working notes or the result. Do not create a mode artifact merely to record the label.

For existing-system work, treat a rule as shared when the repository already establishes it as a consumed contract or when independent real uses demonstrate the same semantic job, behavior, and visual relationship. Repeated markup from one list, copied placeholders, or several occurrences of the same arbitrary literal do not establish a token or component by themselves. A standalone new-system deliverable may define unimplemented decisions, but must label them `PROPOSED` rather than inherited, observed, adopted, or verified.

Proceed with requested bounded edits and inherited choices without another approval turn. For a consequential shared-system change, use the request, repository constraints, and delegated judgment to select the coherent path. Ask for human selection only if a consequential **new** system choice is still materially unresolved and the user did not delegate that choice; present only the decision-relevant trade-off.

**Complete when:** the mode, affected existing contract and consumers or standalone deliverable scope, proposal/observation status, and any genuinely unresolved consequential new-system choice are clear.

### 2. Inspect the affected source of truth

For existing-system work, find which design documentation, CSS custom properties, theme objects, framework configuration, primitives, shared layouts, native resources, and tests actually own the requested contract. Trace only the affected reused consumers and states first. Expand to a system-wide inventory only when the consequential change or explicit audit scope requires it. Also identify, only when implicated, a real external token importer/exporter or existing token build pipeline, and whether an affected composite/overlay intentionally matches a named ARIA Authoring Practices pattern; neither interoperability branch is assumed from file shape or visual resemblance.

Prefer the repository's names, paths, formats, and extension rules. If documentation and rendered implementation disagree in the affected scope, report the conflict; do not silently crown a new source. Treat migration beyond the request as a separate compatibility and rollback decision.

For extraction from a working slice, inspect the rendered instances before abstracting them. When their provenance would otherwise be hard to retain, a temporary ledger can help:

| Candidate | Semantic job | Independent occurrences | Source/render locators | Decision |
|---|---|---:|---|---|
| | | | | inherited / extract / proposed / local |

Keep the ledger in working notes unless the deliverable, project, or re-entry need makes it durable. Do not inventory unaffected rules merely to fill it.

**Complete when:** the affected canonical source, consumers, reused contracts/states, intentional exceptions, and any in-scope migration boundary are known; standalone scope and evidence limits are explicit.

### 3. Consolidate only affected semantic foundations

Extend or define only role-bearing decisions the requested consumers must reuse: typography roles, semantic color roles, spacing or density relationships, layout constraints, surface hierarchy, responsive behavior, focus treatment, motion posture, and data-visualization semantics where applicable.

- Preserve intentional irregularity when it carries hierarchy or brand character.
- Name purpose, not appearance: `text-muted` is stronger than `gray-500` in product code.
- Do not create a full scale because two values exist.
- Do not replace a repository-native source with a generic token taxonomy.
- Keep route-specific art direction or isolated values local, and document an exception only when a consumer or later re-entry could otherwise mistake it for drift.

**Complete when:** every affected inherited or observed shared rule has a semantic purpose, canonical location, defined scope, and claim-matched evidence; standalone unimplemented rules remain visibly `PROPOSED`.

### 4. Extend only qualifying components and states

A reusable existing component needs repeated anatomy plus repeated semantics and behavior; shared styling alone is insufficient. Keep a pattern local until independent uses demonstrate a shared contract, or an explicit standalone or multi-surface brief confirms intended reuse.

For each affected qualifying component, record only implementation-relevant decisions:

- purpose, non-purpose, canonical source, and anatomy;
- content limits and semantic variants;
- changed or reused interaction, async, empty, error, and permission states;
- applicable semantic role, keyboard, focus, announcement, and narrow-layout behavior;
- composition constraints and allowed extension points.

For an affected composite or overlay that intentionally implements the semantics of a matching ARIA Authoring Practices pattern—such as a dialog, menu button/menu, combobox/listbox, tabs, tree, or grid—use that exact pattern's keyboard, focus, state, and dismissal behavior as a behavior oracle alongside the repository contract. Do not choose a pattern because controls merely look alike, apply composite rules to a native/simple control, or treat an APG example as proof that the implementation conforms. If no pattern matches, use platform semantics and the actual product contract instead.

Do not inventory untouched variants or states. Use [the component state matrix](references/component-state-matrix.md) only when it is a requested deliverable, project convention, or useful durable handoff for the affected reused state contract; otherwise an inline contract and focused tests may be enough. Mark state behavior `OBSERVED`, `REQUIRED_BY_EXISTING_CONTRACT`, `PROPOSED`, or `UNVERIFIED`. A screenshot cannot establish function, semantic roles, or accessibility.

**Complete when:** inherited or observed reusable component claims have affected-use evidence, standalone proposals are labeled, state distinctions remain truthful, and one-off candidates stay local.

### 5. Persist only what the deliverable or handoff needs

Artifacts are not workflow receipts. Update an existing durable contract when the affected decision already belongs there. Otherwise keep findings inline unless the user requested a standalone artifact, repository policy or a real consumer requires one, or re-entry across runs, agents, or teams would lose material decisions.

Choose the smallest useful form:

- **No new document** for a bounded implementation when canonical code and focused tests already carry the affected contract.
- **One compact design/UI contract** for a requested standalone deliverable or durable shared foundations, components, states, paths, and decisions. [The compact template](templates/DESIGN.md) is an optional starting point; rename it and remove irrelevant sections.
- **Native implementation source** for runtime tokens. Link to it rather than copying values into prose or another runtime-like file.
- **Portable `tokens.json`** only for a requested token deliverable, named cross-platform/design-tool/code-generation consumer, repository tooling contract, or re-entry need. Use DTCG interchange only when that real consumer declares DTCG support or the requested deliverable requires it; a JSON filename or use of `$value` is not enough. [The token template](templates/tokens.json) is optional; declare whether the file is canonical or generated.
- **Separate component catalog or state matrix** only when requested, established by the project, or needed for durable handoff/re-entry. [The component template](templates/components.md) is optional and must not duplicate canonical code.
- **Project-local UI/Agent contract** only when explicitly requested, required by repository convention, or needed to guide later agents. It must point to canonical sources rather than becoming another source of token or component truth.

When a named external consumer activates DTCG interoperability, record its supported format/version and validate the affected exchange boundary rather than converting the whole repository by preference: effective token type (including group `$type` inheritance), token/alias target and type compatibility, group inheritance/override semantics only when `$extends` is actually used, unresolved references, and alias or inheritance cycles. Establish one canonical source and one direction for generated output; generated files identify their owner/source and are not hand-edited. Preserve the repository-native runtime source unless migration was requested.

If an existing Style Dictionary configuration and build pipeline is the actual consumer, follow its pinned project configuration, sources/includes, transforms, platforms, and output ownership, and run only its repository-native focused build/check. Do not install Style Dictionary, create a pipeline, or make its merge/transform conventions universal merely because a portable token file was requested.

Do not create the whole bundle because one item is useful. Split a contract only when repository convention, distinct consumers, or demonstrated usability requires it.

**Complete when:** each persisted artifact has a named deliverable, project/consumer, or re-entry purpose and every decision has one clear canonical owner; otherwise the honest result may be `NO_EXTRACTION_NEEDED`.

### 6. Implement or map the minimum coherent change

Within the requested scope, update the canonical token/component sources and any existing durable contract that already claims the affected decision. Do not create a new contract solely to mirror the implementation. In `CONSEQUENTIAL_SHARED_SYSTEM_CHANGE`, trace affected consumers, compatibility aliases, rollout boundaries, and old-value removal conditions only where the change needs them. In bounded extraction, refactor only the qualifying repeated instances and leave intentional exceptions local.

A bounded existing-system edit proceeds under the user's request without an approval ticket. Do not broaden it into a full redesign, install dependencies, rewrite unrelated primitives, or convert styling architecture merely to match a preferred format.

**Complete when:** affected implementation and durable documentation agree, reused consumers resolve through the canonical rule, state and accessibility behavior remain truthful, and local exceptions remain legible.

### 7. Validate only affected reused contracts and states

Use repository-native checks and rendered evidence proportionate to the change and completion claim. Inspect affected representative consumers, widths, content lengths, and component states only. Add computed/native token resolution, keyboard/focus, accessible name-role-state/value, contrast, target size, zoom/reflow, reduced motion, console, network, or migration probes when the changed contract makes them material. Do not rebuild a universal state, viewport, device, or accessibility matrix for untouched behavior, and do not recapture evidence that the change did not invalidate.

Artifact-only authoring or audit can be valid. Mark unimplemented new-system decisions `PROPOSED`, source-only behavior `UNVERIFIED` where appropriate, and unavailable rendered/state evidence as a gap. When DTCG interchange is active, exercise the named consumer or its project-native validator against affected type inheritance, aliases/references, optional group extension/override, cycle/error handling, and canonical-to-generated direction; syntax alone is insufficient. When an APG pattern is a declared oracle, exercise its matching keyboard, focus, state, and overlay behavior in the affected implementation rather than assuming conformance from role names or screenshots.

A parser or validator proves only the syntax or schema it actually checks; it does not prove semantic role mapping, state truth, accessibility, consumer integration, visual quality, authorization, persistence, deployment, or publication. A screenshot proves presentation at its captured state and viewport only.

**Complete when:** every affected inherited, observed, or reused-contract claim traces to the source and representative behavior needed by that claim, applicable state/accessibility distinctions are preserved, and unexecuted claims remain bounded.

## Output contract

Preserve the following applicable information. A requested or host presentation adapter may reorder, relabel, chunk, summarize, or progressively disclose it, but must not hide canonical ownership, unresolved consequential choices, affected evidence, or claim gaps. Omit inapplicable artifact fields rather than manufacturing them.

```text
Design-system result: INHERITED | UPDATED | EXTRACTED | DELIVERED | AUDITED | PROPOSED | NO_EXTRACTION_NEEDED | BLOCKED
Mode: BOUNDED_EXTENSION | CONSEQUENTIAL_SHARED_SYSTEM_CHANGE | STANDALONE_SYSTEM_DELIVERABLE_OR_AUDIT
Scope: <affected surfaces/contracts and exclusions>
Decision owner, when material: HUMAN | DELEGATED | INHERITED_OR_NOT_APPLICABLE

Canonical ownership
- Runtime/shared system: <path(s), package, or none>
- Durable design/UI or project-local contract: <updated / created for named need / inherited / not needed>
- Portable tokens or component/state artifact: <named deliverable/consumer and canonical/generated direction, or not needed>
- Conditional DTCG / existing Style Dictionary boundary: <named consumer, format/pipeline, type/alias/inheritance/cycle checks, ownership; or not active>
- Conditional APG oracle: <matching composite/overlay pattern and exercised behavior; or no matching pattern>

Affected evidence
- Reused/inherited contracts: <contract -> source and affected consumer locators>
- Observed repetitions or audit findings: <claim -> locators>
- Changed/reused component states and accessibility semantics: <summary>
- Kept local, proposed, or unverified: <summary and reason>

Validation
- Focused source/native checks: <commands/results>
- Affected rendered uses and states: <viewports/states/results or unavailable>
- Accessibility/runtime probes: <results or bounded gap>
- Parser/validator boundary: <syntax/schema checked; semantics not implied>

Claim boundary
- <what was not implemented, selected, approved, deployed, live, or published>
```

## Source basis for conditional interoperability

The conditional exchange and behavior-oracle rules paraphrase these pinned primary sources; no source schema, example, or code is vendored:

- Design Tokens Community Group format at [`16c902d9327c18290e956a21130c445f1b88c40f`, `technical-reports/format/types.md`](https://github.com/design-tokens/community-group/blob/16c902d9327c18290e956a21130c445f1b88c40f/technical-reports/format/types.md), [`aliases.md`](https://github.com/design-tokens/community-group/blob/16c902d9327c18290e956a21130c445f1b88c40f/technical-reports/format/aliases.md), and [`groups.md`](https://github.com/design-tokens/community-group/blob/16c902d9327c18290e956a21130c445f1b88c40f/technical-reports/format/groups.md) (W3C Software and Document License): explicit or inherited types, token references, optional group extension/override, and reference/inheritance cycle errors. The local skill activates this only for a real external consumer.
- Style Dictionary at [`29f1b25f3d05d8f264de7814b52919b3dd5dca96`, `docs/src/content/docs/info/architecture.md`](https://github.com/amzn/style-dictionary/blob/29f1b25f3d05d8f264de7814b52919b3dd5dca96/docs/src/content/docs/info/architecture.md) and [`docs/src/content/docs/reference/config.md`](https://github.com/amzn/style-dictionary/blob/29f1b25f3d05d8f264de7814b52919b3dd5dca96/docs/src/content/docs/reference/config.md) (Apache-2.0): configured source/include parsing, transforms, reference resolution, platforms, and generated files. These rules apply only when that pipeline already exists in the project.
- WAI-ARIA Authoring Practices at [`7e4034b262bc0d25332e330d8a582aaf34113829`, `content/patterns/patterns.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/patterns.html), [`content/patterns/dialog-modal/dialog-modal-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/dialog-modal/dialog-modal-pattern.html), and [`content/patterns/combobox/combobox-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/combobox/combobox-pattern.html) (W3C Software and Document License): pattern-specific keyboard, focus, role/state, and overlay behavior. The local skill uses a pattern only when component semantics match it and does not treat examples as implementation proof.

## Common pitfalls

- Invoking the skill before every frontend build because its install name contains “first.”
- Turning a bounded existing-system edit into an approval ticket, full-system audit, or artifact bundle.
- Replacing an inherited repository system with a generic preferred taxonomy.
- Extracting a component from one attractive instance or one mapped list.
- Turning every literal into a token or generating unused scales and variants.
- Maintaining CSS variables, theme values, prose, and `tokens.json` as competing sources.
- Converting to DTCG or adding Style Dictionary without a real named consumer/pipeline, or failing to test effective types, aliases, inheritance, cycles, and canonical/generated ownership when interchange is active.
- Applying an APG composite/overlay pattern because a control looks similar, or claiming conformance without exercising the matching keyboard/focus/state behavior.
- Creating a state matrix, component catalog, or project-local skill without a deliverable, project, consumer, or re-entry need.
- Demanding human selection for an inherited, already selected, or delegated decision.
- Calling proposed values observed, a delegated selection human-approved, or local output live/published.
- Treating a validator or screenshot as proof of semantic roles, state behavior, accessibility, integration, authorization, or persistence.
- Refactoring local character out of the interface in pursuit of uniformity.

## Verification checklist

- [ ] The mode is `BOUNDED_EXTENSION`, `CONSEQUENTIAL_SHARED_SYSTEM_CHANGE`, or `STANDALONE_SYSTEM_DELIVERABLE_OR_AUDIT`—not frontend work in general.
- [ ] Existing-system work inherited the canonical implementation, semantic roles, component/state contracts, and repository conventions.
- [ ] The requested bounded existing-system edit proceeded without a human approval ticket; human selection was requested only for an unresolved consequential new-system choice when judgment was not delegated.
- [ ] Evidence covers affected reused contracts, consumers, and states only; untouched system inventory or captures were not required.
- [ ] One-off and coincidental values remain local; unimplemented standalone decisions are labeled `PROPOSED`.
- [ ] Reusable components have repeated existing use or confirmed intended reuse, and affected state distinctions remain truthful.
- [ ] Applicable semantic roles, keyboard/focus/announcement behavior, contrast/non-color cues, target size, zoom/reflow, responsive behavior, and reduced motion were preserved or bounded as unverified.
- [ ] Persistent design artifacts, portable tokens, component/state matrices, and project-local contracts exist only for a named deliverable, project/consumer, or re-entry need.
- [ ] DTCG interoperability is active only for a real external consumer; affected effective types, aliases, optional inheritance, cycles/errors, and canonical/generated ownership were checked, and Style Dictionary rules were used only for an existing pipeline.
- [ ] APG behavior served as an oracle only for a semantically matching composite/overlay, with affected keyboard/focus/state behavior exercised rather than inferred.
- [ ] Every persisted decision has one canonical owner; generated or descriptive artifacts point to it rather than creating a parallel source of truth.
- [ ] Focused implementation/render checks are fresh where the claim needs them, and parser/validator success is reported as syntax/schema evidence only.
- [ ] No selection, approval, deployment, live-data, or publication claim exceeds the evidence.
