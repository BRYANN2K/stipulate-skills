---
name: design-direction
description: "Use when translating product strategy, copy, screenshots, websites, design systems, component libraries, or inspiration collections into an original art direction before UI implementation. Builds a cited reference ledger, separates observation from inference, proposes at most two coherent directions, defines a product-specific visual thesis and no-go list, and prevents reference collage or literal cloning."
license: Apache-2.0
compatibility: Works with image-capable or text-only Agent Skills clients; visual inspection requires an available browser or image-analysis tool.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: art-direction, design-research, references, visual-language, anti-copy, anti-slop
---

# Design Direction

## Overview

Turn source material into a coherent visual decision, not a moodboard collage. Observe what a reference does, infer why it works, adapt the principle to the product's content and constraints, and explicitly name what must not be copied.

<HARD-GATE>
Do not copy source assets, layouts, distinctive illustrations, branded token values, proprietary Figma components, or recognizable interaction sequences. A public URL is not a reuse license. Verify the original source and license before reusing code or text; when licensing is absent or unclear, use the source only for high-level observation and attribution.
</HARD-GATE>

## When to use

- Establish art direction from screenshots, websites, portfolios, dashboards, design systems, component galleries, or resource lists.
- A user asks to make an interface feel distinctive, restrained, premium, dense, playful, technical, editorial, or unlike AI-generated templates.
- Compare visual approaches before defining tokens and components.
- Audit whether an existing UI has become a collage of libraries or trends.

Do not use for building the design system, implementing components, selecting a library solely by API, or copying an existing site. Use the design-system or engineering workflow after direction is selected.

## Workflow

### 1. Read product and content constraints first

Inspect `PRODUCT-STORY.md`, `PAGE-COPY.md`, `CLAIMS.md`, routes/journeys, content volume, data shapes, existing brand assets, accessibility constraints, supported platforms, and implementation stack. If these artifacts do not exist, obtain equivalent evidence; do not let references invent the product.

Name what the design must help users recognize, compare, trust, or do. Identify density, language length, data variability, and state complexity.

**Complete when:** the visual problem is expressed in product terms rather than adjectives alone.

### 2. Build a small, source-first reference set

Use three to eight references with distinct roles:

- structural/compositional;
- typographic/editorial;
- system/component;
- motion/interaction;
- data visualization or product-specific imagery, when applicable.

A curated list such as Numa1's Design-Ressources is a discovery index only. Follow each candidate to its original site or repository, inspect the current artifact, and verify its license before reuse. Prefer primary sources over screenshots of screenshots or derivative galleries.

Load [reference analysis rules](references/reference-analysis.md) for source quality, screenshots, dashboards, component libraries, and anti-collage checks.

**Complete when:** every chosen source has an exact URL, creator/maintainer when known, role, license status, and reason it is relevant to this product.

### 3. Record observation before interpretation

Copy [the reference ledger template](templates/reference-ledger.md) to `.design-flow/artifacts/REFERENCE-LEDGER.md`. For each reference separate:

1. `observed` — directly visible or verified behavior;
2. `principle` — why it may work;
3. `adaptation` — how the product can apply the principle;
4. `no-copy boundary` — recognizable elements excluded;
5. `license boundary` — what may or may not be reused.

Example: “irregular grid” is observation; “size follows decision priority” is principle; “allocate width by operational importance” is adaptation; “do not reproduce the same card geometry or artwork” is the no-copy boundary.

**Complete when:** no adaptation depends on copying the source's identity, and uncertain interpretations are labeled as hypotheses.

### 4. Synthesize one visual thesis

Define:

- tension: the productive contrast that makes the direction memorable;
- hierarchy: how attention moves;
- density: what is compact and what breathes;
- typography: roles, contrast, and content fit;
- geometry: grids, alignment, radius, borders, and rhythm;
- surfaces: depth, separation, and background behavior;
- color: semantic role and accent discipline;
- imagery/data language: what visualizes the product truth;
- signature: one product-specific recurring idea;
- restraint: patterns deliberately excluded.

The signature should emerge from product mechanism or content. A generic gradient, globe, floating card, or glowing orb is not automatically a signature.

**Complete when:** the thesis can guide an unfamiliar screen without referring back to source screenshots.

### 5. Offer at most two coherent directions

If a meaningful strategic choice remains, produce:

- Direction A — recommended, with rationale and risks;
- Direction B — genuinely different, with rationale and risks.

Do not create cosmetic variants of the same layout. Recommend one. If the user does not make a separate choice, the recommended direction may enter the design-system review, but it is not approved until the design-system gate is explicitly approved.

**Complete when:** each direction is internally coherent, decision-relevant, and testable with actual content.

### 6. Define the no-go list and handoff

Name project-specific failure modes, such as:

- uniform card wall despite unequal information priority;
- decorative gradients or glows detached from meaning;
- generic SaaS hero plus logo wall plus bento sequence;
- dashboards with fake metrics or chart-first layout;
- typography selected for novelty rather than language/content;
- copied interactions that conflict with task speed;
- inaccessible low contrast presented as sophistication.

Pass the selected thesis, reference ledger, and no-go list to `design-system-first`. Do not start product frontend implementation.

**Complete when:** the design-system author can derive tokens and components without reopening reference discovery or guessing what not to copy.

## Output contract

```text
Design direction: SELECTED | READY_FOR_SYSTEM_REVIEW | PARTIAL | BLOCKED
Visual problem: <product-specific problem>
Recommended thesis: <one sentence>
Signature: <product-derived recurring idea>

References
- <source>: <role, exact URL, license status>
- Discovery indexes only: <sources>

Direction
- Hierarchy/density: <rules>
- Typography/geometry/surfaces: <rules>
- Color/imagery/data: <rules>
- Motion posture: <restrained/expressive and why>
- No-go list: <specific exclusions>

Artifact
- REFERENCE-LEDGER.md: <path>

Decision
- Selected: <A/B or included in system review>
- Open risk: <content, accessibility, implementation, license>
```

## Common pitfalls

- Beginning from references before understanding content and user decisions.
- Treating a curated resource list as permission to reuse every linked asset.
- Combining one component from each fashionable library.
- Describing references only with adjectives such as clean or premium.
- Copying a layout while changing colors and calling it original.
- Using a dashboard template as both architecture and art direction.
- Offering five directions to avoid making a recommendation.
- Making visual novelty more important than legibility, state, or task speed.
- Failing to record source and license status at research time.

## Verification checklist

- [ ] Product story, copy, claims, journeys, data shapes, and state complexity informed the brief.
- [ ] The reference set is small, role-diverse, and traced to primary sources.
- [ ] Every source has an exact URL, role, creator when known, and license status.
- [ ] Observations, inferred principles, adaptations, and no-copy boundaries are separate.
- [ ] Discovery catalogs were not treated as reuse licenses.
- [ ] The thesis defines hierarchy, density, typography, geometry, surfaces, color, imagery/data, and motion posture.
- [ ] A product-derived signature and project-specific no-go list exist.
- [ ] At most two coherent directions were proposed and one is recommended.
- [ ] No code, assets, copy, distinctive layout, or brand tokens were cloned without a compatible license and attribution.
- [ ] Product frontend implementation has not started before the design-system approval gate.
