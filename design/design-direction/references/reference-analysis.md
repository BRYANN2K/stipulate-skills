# Reference analysis and concept rules

Load this reference while researching inspiration, recording license boundaries, checking whether concepts are genuinely distinct, or deciding how much to render.

## Research stop rule

Start from the product decision and missing visual evidence, not from a gallery. Retain the smallest source set that enables credible choices. Stop when each proposed concept can explain its structure, content fit, subject-world signature, and feasibility without adding another fashionable fragment.

A source may serve more than one role, and a needed role may require no external source when the established system already answers it.

## Source quality and roles

Prefer origins over derivatives:

1. current live artifact plus official repository or documentation;
2. official design-system or component documentation with explicit terms;
3. creator-authored case study, portfolio, or process record;
4. inspectable community resource with clear license/usage terms;
5. discovery index or secondary screenshot gallery, used only to find the origin.

Useful roles include:

| Role | Observe | Do not assume |
|---|---|---|
| Structure/topology | area, order, grouping, transitions, responsive priority | that the same section order fits this product |
| Typography | roles, scale contrast, measure, labels/numbers, language fit | that the font is licensed or content-compatible |
| Task/system | navigation, focus, disclosure, actions, states | that a library's brand identity should be imported |
| Motion | trigger, causality, continuity, interruption, exit | that decorative movement improves the task |
| Data/product imagery | mapping of mechanism/data to a visual form | that sample values or customers are real |
| Real-time graphics | narrative beat, spatial/causal value, DOM/canvas/scroll ownership, fallback and lifecycle | that spectacle, a demo frame, or public source proves product fit, performance, accessibility, or asset rights |
| Subject world | tools, materials, diagrams, rituals, spaces, media grammar | that literal mimicry is respectful, usable, or licensed |

## Evidence for each retained source

For each retained source capture all of:

- **Exact URL:** original page/repository/file, not only a search result.
- **Artifact inspected:** page, viewport, screen, state, component, image, or interaction and date.
- **Exact observation:** visible/verifiable relation such as “the index remains fixed while detail panes replace in place.” Avoid “nice,” “clean,” or “premium.”
- **Interaction evidence boundary:** identify the live path, recording, trace, or source that exposed behavior; otherwise record `still-only — interaction unobserved`.
- **Adaptation principle:** what product problem the observed relation can solve here.
- **License/reuse status:** one of `principle-only/unclear`, `licensed code`, `licensed asset`, `owned`, `public-domain`, or `excluded`, including license name/terms locator when reused.
- **Originality/no-copy decision:** judge separately whether recognizable composition, sequencing, or combined source expression survives.

Creator/maintainer and screenshot provenance are useful when known. If interaction could not be inspected, say so; do not infer hover, scroll, timing, focus, transition, responsive behavior, or another interaction from a still.

## License and reuse posture

- Facts and high-level ideas may inspire; distinctive expression remains off limits.
- “Free,” “community,” “open,” downloadable, or publicly viewable does not identify a license.
- A code license does not automatically cover logos, trademarks, fonts, photography, datasets, demo copy, 3D models, HDRIs, textures, environment maps, decoders, or generated assets.
- Record attribution obligations and preserve notices when actual reuse is allowed.
- Run originality independently of permission. A compatible licence may allow code or asset reuse while the proposed direction still fails its “original” claim because the overall composition, sequence, or combination remains recognizably the source. Rework the arrangement or label direct reuse honestly.
- If status is missing, contradictory, or too costly to verify, use principle-only observation or exclude the material.
- Generated or synthetic assets still need truthful labeling and provider/license compliance.

## From observation to original adaptation

Use the chain:

```text
exact observation → inferred principle → product constraint → original adaptation → no-copy boundary
```

Example:

```text
Observation: a maintenance manual uses exploded numbering beside each part.
Principle: persistent identifiers let readers cross-reference dense detail.
Constraint: operators must compare an alert with the affected resource.
Adaptation: pair a stable resource index with the live incident detail pane.
No-copy boundary: do not reproduce the manual's illustration, numbering style, or page composition.
```

The adaptation fails if it can only be described as “make it look like the source.”

## Subject-world signature test

A useful signature:

1. comes from the product mechanism, user practice, material, data, or domain grammar;
2. improves recognition, explanation, navigation, or memory;
3. can recur without becoming decoration everywhere;
4. remains original after the source's distinctive expression is removed;
5. has a restrained fallback for accessibility and small viewports.

A gradient, floating panel, orbit, terminal treatment, oversized serif, or cursor effect is not a signature merely because it is noticeable. It may qualify only when the product-specific link and function are explicit.

## Fair comparison contract

Hold these constant wherever comparison requires them:

- product facts, caveats, and available proof;
- primary action/task and success consequence;
- representative content length, data grain, states, and viewport/device;
- accessibility and technical constraints;
- asset truthfulness and license status.

Open-marketing routes intentionally frame/order the truth differently, so do not force identical copy. Instead give each route equal access to the same evidence inventory. Task concepts should use the same actual task/data/state.

## Concept distinctness test

Use this only when a real trade-off warrants alternatives. One direction is valid when the product, request, or inherited system already selects it. For each compared candidate, confirm coherent difference in the axes relevant to the decision:

| Axis | Evidence of a real difference |
|---|---|
| Layout/topology | Different attention path, grouping, sequence, or spatial model—not a flipped hero |
| Type | Different role relationships, scale contrast, measure, or reading rhythm—not only a font swap |
| Density | Different compression/breathing logic tied to the content strategy |
| Palette | Different semantic/contrast posture tied to content—not random brand alternatives |
| Assets/data | Different product-truth visualization or subject-world grammar with valid provenance |
| Motion | Different continuity/feedback posture with a reduced-motion equivalent—not extra decoration |
| Conditional real-time | A product-specific spatial/narrative model with semantic static fallback—not the same generic effect under another shader |

Not every axis must differ if the actual decision is narrower; enough must change coherently for a reasonable reviewer to choose one and reject another for substantive reasons. Merge or remove cosmetic variants. Stop adding candidates once the unresolved trade-off is covered.

## Proportional rendered evidence

A concept must be concrete enough to test its decisive claim, but rendering depth follows the decision. Alternatives for an open visual decision must each be viewable; an annotated locator or implementation brief alone is reserved for a selected targeted/inherited direction with no remaining comparison.

- one readable frame for a bounded visual decision;
- disposable HTML/CSS or project-native preview when hierarchy, wrapping, or interaction placement matters;
- image comp with legible real copy when only visual composition is being selected;
- live prototype, recording, trace, or inspectable source when hover, scroll, focus, timing, transition, gesture, sequence, or responsive behavior is part of the decision;
- core task state plus a consequential alternative only when state changes the pattern;
- additional viewport only when content/order/behavior or the responsive claim changes;
- optional real-time keyframe, transition, fallback/reduced/failure/lifecycle evidence only to the extent required by the renderer decision or claim.

Record viewport/tool/path and untested boundaries. Do not turn concept exploration into a full page, state matrix, device matrix, or design-system build. A still frame proves only the pictured composition and state; it cannot establish interaction that was not observed.

## Claim-boundary evaluation fixtures

Use these only to evaluate the corresponding risk; they do not require a fixed concept count or artifact.

| Situation | Required judgment |
|---|---|
| A permissively licensed template is rearranged only superficially while preserving its recognizable hero split, navigation placement, section sequence, signature motif combination, and attention path | Record that reuse may be permitted, but the candidate does not satisfy an original-direction claim. Recompose around the product's own content/task logic or label the authorized direct adaptation instead of calling it original. |
| A screenshot shows a fixed index beside a detail panel, and the analysis claims the index pins on scroll, rows expand on hover, or panels transition in place | Keep only the visible spatial observation. Mark the claimed behavior `UNOBSERVED` until a live path, recording, trace, source, or prototype exposes it. Do not let the interaction claim influence selection before then. |

## Anti-collage check

For every adapted principle ask:

1. Does it solve a named product/content constraint?
2. Does it support the concept thesis rather than merely add novelty?
3. Can it be implemented without recognizable source composition or combined expression, even if some source material is licensed?
4. Is any reused code/asset covered by identified compatible terms?
5. Are interaction claims based on observed behavior rather than a still?
6. Does it remain coherent with the concept's other choices?

Exclude or rework any “no.”
