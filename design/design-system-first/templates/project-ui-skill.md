---
name: {{PROJECT-SLUG}}-ui
description: Use when implementing or changing product UI in {{PROJECT-NAME}} after the approved design-system gate. Enforces the verified token, component, layout, state, accessibility, responsive, data, and repository conventions for this project.
license: Apache-2.0
metadata:
  version: "1.0.0"
  author: {{PROJECT-NAME}}
  category: project
  tags: ui, design-system, frontend
---

# {{PROJECT-NAME}} UI

## Project contract

The approved `.design-flow/artifacts/DESIGN.md`, `.design-flow/artifacts/tokens.json`, and `.design-flow/artifacts/COMPONENTS.md` are the sources of truth. This file is generated from `.design-flow/artifacts/PROJECT-UI.md`; edit and reapprove that source rather than the compiled copy.

- Surface:
- Protected UI roots:
- Token implementation path:
- Primitive component path:
- Product component path:
- Route/layout path:
- Styling convention:
- Data/state conventions:

## Implementation rules

1. Load the current approved artifacts before changing product UI.
2. Reuse documented primitives and product components before creating variants.
3. Resolve visual values through semantic tokens; record any exception in the design system and obtain reapproval.
4. Implement every applicable default, hover, focus-visible, active/selected, disabled, loading, success, error, empty, and skeleton state.
5. Preserve keyboard, focus, announcements, contrast, target size, responsive reflow, and reduced-motion behavior.
6. Use realistic labeled fixtures and source-backed data semantics; never invent production evidence.
7. Follow verified repository paths, import conventions, dependencies, and test commands below.

### Verified libraries and conventions

- Framework/version source:
- UI primitives:
- Icons:
- Forms:
- Tables/charts:
- Motion:
- Class/style merge helper:
- Package manager and lockfile:

### Prohibited drift

- Arbitrary color, spacing, radius, shadow, typography, or animation values:
- Duplicate/forked primitives:
- Unsupported dependencies:
- Generic card/layout defaults conflicting with `DESIGN.md`:

## Verification

Run only commands verified in this repository:

- Focused behavior test:
- Lint:
- Type check:
- Build:
- Browser/E2E:

Exercise real copy, narrow and wide layouts, keyboard/focus, applicable async/error/empty states, reduced motion, console/network state, and data/action readback. A screenshot does not prove semantics, authorization, persistence, or accessibility.
