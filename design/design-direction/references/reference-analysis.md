# Reference analysis rules

## Source roles

A reference set should cover needs, not maximize volume:

| Role | Useful evidence | Common misuse |
|---|---|---|
| Structure | Hierarchy, navigation, grouping, responsive reflow | Copying section order unchanged |
| Typography | Role contrast, line length, density, multilingual fit | Selecting a fashionable font without content tests |
| System | Tokens, component variants, states, documentation | Importing a library's visual identity wholesale |
| Motion | Trigger, causality, interruption, exit, reduced motion | Adding every available transition |
| Data/product imagery | Mapping data or mechanism to visuals | Decorative charts or fabricated product evidence |

## Source quality

Prefer exact primary artifacts in this order:

1. current live product plus official repository or documentation;
2. official design-system documentation or licensed source;
3. creator-authored case study or portfolio;
4. Figma/community resource with inspectable terms;
5. curated discovery index;
6. secondary screenshot gallery.

A catalog entry is a lead, not evidence of quality, maintenance, accessibility, or licensing. Verify each original.

## Analysis lenses

### Composition

- What receives area, contrast, and placement priority?
- Is the grid regular because content is equal, or irregular because decisions differ?
- How does the narrow layout preserve meaning rather than merely stack blocks?

### Typography

- Which roles create hierarchy?
- How do line length, wrapping, numbers, labels, and dense content behave?
- Does type remain readable at actual product sizes and languages?

### Surfaces and depth

- What does a border, shadow, blur, or background change communicate?
- Can the hierarchy survive without decorative effects?
- Are nested surfaces semantically different or only visually busy?

### Product/data language

- Does the visual show a real mechanism, state, decision, or dataset?
- Are example values realistic and clearly synthetic when necessary?
- Would a table communicate the task better than a chart?

### Interaction

- What action triggers change?
- What information does motion add?
- How are focus, keyboard, touch, interruption, error, and reduced motion handled?

## Anti-collage test

For each proposed borrowed principle, ask:

1. Can it be explained without naming the source?
2. Does it solve a product-specific constraint?
3. Does it fit the selected thesis and other principles?
4. Can it be implemented without copying distinctive source expression?
5. Is code/asset reuse allowed by an identified license?

If any answer is no, exclude or re-research it.

## Reference-specific posture

- Motion galleries such as Amicro and Transitions.dev: use for intent and state taxonomy, not brand tokens or universal animation.
- Emil Kowalski's public skills: use the isolate-observe-adjust method and motion discipline, then replace subjective completion with evidence.
- Shadcn Dashboard: use as a project-local implementation-contract example and dashboard architecture reference, not as default art direction.
- Design-system kits: compare token depth, variants, documentation, state coverage, themes, and handoff; do not clone their assets.
- Numa1/Design-Ressources: use only to discover primary sources, then verify each original URL and license.
