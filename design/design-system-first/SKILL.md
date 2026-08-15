---
name: design-system-first
description: "Use when defining or changing the visual foundations, tokens, typography, layout, components, states, responsive behavior, accessibility, data-visualization language, or implementation contract for a website, web application, or dashboard before product frontend code. Produces reviewable design artifacts and a project-local UI skill, and keeps the build blocked until explicit human approval."
license: Apache-2.0
compatibility: Works with any frontend stack and Agent Skills-compatible client. Integration with the Web Craft digest gate requires Python 3.10 or newer.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: design-system, tokens, components, states, accessibility, design-to-code
---

# Design System First

## Overview

Derive an interface system from approved content, product journeys, data, and direction before implementing product screens. A design system is a decision contract: foundations, semantic tokens, composition, components, states, responsive behavior, accessibility, motion posture, and the exact implementation rules a coding agent must follow.

<HARD-GATE>
Do not create product routes, product screen slices, or modify protected frontend roots while authoring this system. An isolated review preview under `.design-flow/` is allowed. Do not declare approval, run the Web Craft `approve` command, or compile the project-local UI skill without direct human approval of the presented review set.
</HARD-GATE>

## When to use

- Create a design system for a new website, application, dashboard, or redesign before frontend implementation.
- Define or reconcile typography, semantic colors, spacing, layout, components, states, responsive behavior, accessibility, or motion tokens.
- Turn an approved direction into a machine-readable project UI contract.
- Audit whether an existing interface has arbitrary values, component forks, missing states, or design drift.

Do not use for choosing the art direction from scratch, writing product copy, adding decorative animation, or implementing a bounded component under an already approved system.

## Workflow

### 1. Inspect inputs and implementation reality

Read `PRODUCT-STORY.md`, `PAGE-COPY.md`, `CLAIMS.md`, `REFERENCE-LEDGER.md`, repository instructions, current tokens/styles, primitives, component inventory, routes, content/data shapes, supported viewports, accessibility targets, dependencies, and tests. Trace existing values and variants before proposing replacements.

Separate:

- inherited constraints that must remain compatible;
- intentional existing patterns worth preserving;
- accidental drift or arbitrary values;
- new requirements introduced by content, state, or data.

**Complete when:** the system brief names content lengths, data densities, states, platforms, existing component boundaries, migration constraints, and verification paths.

### 2. Define principles and semantic foundations

Copy [the design-system template](templates/DESIGN.md) to `.design-flow/artifacts/DESIGN.md`. State three to five product-specific principles that resolve trade-offs. Then define:

- typography roles and tested content behavior;
- primitive and semantic colors;
- spacing, sizing, grid, and density;
- radius, border, shadow, and surface hierarchy;
- breakpoints as behavior changes, not device labels;
- iconography and imagery/data language;
- focus, contrast, target size, and reduced-motion rules.

A primitive value describes material; a semantic token describes purpose. Product code should consume semantic tokens wherever practical.

**Complete when:** each semantic token has a purpose, state behavior, theme behavior where applicable, and no unexplained value exists only to imitate a reference.

### 3. Encode tokens in a portable contract

Copy [the token template](templates/tokens.json) to `.design-flow/artifacts/tokens.json`. Keep one canonical hierarchy and map it to the repository's native implementation only after approval. Include only tokens the product needs, but cover the states and modes it actually supports.

Avoid parallel sources of truth such as unrelated CSS variables, Tailwind literals, theme objects, and component-local hex values. Document temporary migration aliases and their removal condition.

**Complete when:** `tokens.json` is valid, contains no template markers, and every proposed component value resolves to a token or a documented exception.

### 4. Design components from journeys and content

Copy [the component template](templates/components.md) to `.design-flow/artifacts/COMPONENTS.md`. Start from repeated product needs, not a universal component checklist. For each component define:

- purpose and non-purpose;
- anatomy and content contract;
- variants and sizes that express real semantics;
- applicable state matrix;
- keyboard, focus, announcement, and touch behavior;
- responsive behavior;
- data/failure behavior where relevant;
- composition rules and forbidden forks.

Load [the component state matrix](references/component-state-matrix.md) for forms, overlays, navigation, tables, charts, async content, and destructive actions.

**Complete when:** representative journeys can be composed without inventing new visual rules, and every applicable state has content plus interaction behavior.

### 5. Define composition and data language

Specify page shell, content width, grids, section rhythm, dense versus quiet regions, navigation, overlays, and responsive reflow. For dashboards, define decision-first information order, table/chart selection, source/freshness display, realistic fixture rules, and narrow-screen identity/action preservation.

Do not default to a uniform card grid. A border or card must express grouping, action scope, state, or hierarchy. Visualizations must answer a named question with defined data semantics.

**Complete when:** the system explains how to compose unequal information, long content, empty/error states, and dense data without falling back to generic cards.

### 6. Author the project-local implementation contract

Copy [the project UI skill template](templates/project-ui-skill.md) to `.design-flow/artifacts/PROJECT-UI.md`. Replace every marker and record verified project specifics:

- source directories and component boundaries;
- token implementation path;
- approved primitives and extension rules;
- route/layout/data conventions;
- installed libraries and import conventions;
- prohibited arbitrary values and component forks;
- repository-native test, lint, type, build, and browser commands.

`PROJECT-UI.md` must remain a complete valid Agent Skill whose name is `<project-slug>-ui`. It names `DESIGN.md`, `tokens.json`, and `COMPONENTS.md` as sources of truth. Do not invent commands or dependencies.

**Complete when:** a coding agent unfamiliar with the project can place and verify one component without guessing paths, libraries, or visual values.

### 7. Build an isolated system preview

Create a disposable or development-only preview under `.design-flow/` using the project's available rendering path without adding production routes. Show:

- actual typography with short, long, numeric, and error content;
- semantic colors and surfaces in supported modes;
- representative primitives and product components;
- default, hover, focus-visible, active/selected, disabled, loading, success, error, empty, and skeleton states where applicable;
- narrow and wide composition;
- realistic labeled data rather than impressive fake metrics;
- motion posture and reduced-motion outcome.

Capture rendered evidence and inspect the accessibility tree, keyboard path, contrast, overflow, wrapping, console, and network state. A static token table alone is not a system preview.

**Complete when:** the human can judge the actual system under representative content and states without seeing product frontend code.

### 8. Prepare review and stop

Run the Web Craft gate:

```bash
python3 <web-craft-skill>/scripts/design_flow.py ready --root .
```

Present the selected direction, system principles, tokens, component/state coverage, preview locators, responsive/accessibility evidence, open trade-offs, and no-go list. Stop with `FRONTEND_BUILD=BLOCKED` until explicit approval.

After direct approval, Web Craft records digests and compiles `PROJECT-UI.md`; this skill does not self-approve.

**Complete when:** `ready` passes, all review evidence is visible, and no protected frontend root was changed.

## Output contract

```text
Design system: DRAFT | SYSTEM_READY_FOR_REVIEW | APPROVED_EXTERNALLY | BLOCKED
Direction: <selected thesis>
Principles: <3-5 product-specific rules>

Artifacts
- DESIGN.md: <path>
- tokens.json: <path>
- COMPONENTS.md: <path>
- PROJECT-UI.md: <path>
- Preview: <path/URL/screenshots>

Coverage
- Foundations/themes: <summary>
- Components/variants: <summary>
- States: <matrix gaps or complete>
- Responsive/data: <summary>
- Accessibility/motion: <summary>

Evidence
- Rendered viewports: <results>
- Keyboard/focus/tree/contrast: <results>
- Console/network: <results>
- Existing-system migration: <risks>

Gate
- ready: PASS | FAIL
- Human approval: PRESENT | ABSENT
- Product frontend changed: NO | violation
```

## Common pitfalls

- Reducing a design system to a palette, type scale, and button.
- Designing components before real content, journeys, data, and states.
- Copying a design kit's brand values instead of deriving product semantics.
- Creating tokens that are aliases for arbitrary one-off values.
- Treating every grouping as a rounded card.
- Showing only default and hover states in the review.
- Using production-looking fake metrics without a synthetic label.
- Calling a Storybook-like gallery accessible without keyboard and tree evidence.
- Writing product screens inside the preview to bypass the gate.
- Inventing project paths, libraries, commands, or imports in `PROJECT-UI.md`.

## Verification checklist

- [ ] Product story, final copy, claims, selected direction, codebase, existing components, and data shapes were inspected.
- [ ] Principles resolve real product trade-offs and do not merely restate aesthetic adjectives.
- [ ] Primitive and semantic tokens cover supported modes and states without unexplained source imitation.
- [ ] Typography, grid, spacing, surfaces, iconography, imagery/data, responsive, accessibility, and motion posture are defined.
- [ ] Components derive from journeys and include purpose, anatomy, variants, content, states, behavior, and composition rules.
- [ ] Focus-visible, keyboard, announcements, contrast, target size, and reduced motion are explicit.
- [ ] Dense data, tables/charts, freshness, realistic fixtures, partial/error, and narrow-screen behavior are covered where applicable.
- [ ] `PROJECT-UI.md` contains only verified paths, libraries, conventions, and commands.
- [ ] The isolated preview uses real copy and representative states at narrow and wide widths.
- [ ] Browser, keyboard, accessibility-tree, contrast, overflow, console, and network evidence was captured.
- [ ] Web Craft `ready` passes and protected product frontend roots remain unchanged.
- [ ] Explicit human approval remains external to this skill.
