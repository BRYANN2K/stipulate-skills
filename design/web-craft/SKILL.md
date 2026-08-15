---
name: web-craft
description: "Use when creating, redesigning, or materially changing a public website, web application, dashboard, or frontend interface. Orchestrates evidence-backed product copy, reference analysis, art direction, a design-system-first human approval gate, project-local UI instructions, implementation, intentional motion, and anti-slop verification before completion."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and any frontend stack. The deterministic workflow gate and optional Hermes hook require Python 3.10 or newer and use only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: design-workflow, frontend, design-system, copywriting, anti-slop, orchestration
---

# Web Craft

## Overview

Run one traceable workflow from product truth to verified interface. Content shapes composition; references become principles rather than copied fragments; the design system is reviewed before product frontend code; and implementation stays bound to an approved project-local UI contract.

<HARD-GATE>
Do not create or modify product frontend files until the required design artifacts are complete, the human has explicitly approved the review set, and `design_flow.py check-build` passes. A request to build, continue, create the workflow, or “use your judgment” is not design approval. Never run `approve` on the human's behalf or fabricate an approval reference.
</HARD-GATE>

## When to use

- Create or redesign a landing page, marketing site, authenticated web application, dashboard, admin console, or substantial frontend surface.
- The user asks for anti-AI-slop design, human copy, marketing readiness, a design system, micro-interactions, or a reference-led redesign.
- A coding agent needs a repeatable design-to-code workflow with an enforceable approval gate.
- An existing UI has drifted into arbitrary values, generic cards, unsupported claims, decorative motion, or inconsistent states.

Do not use for a one-line copy correction, a local color/token fix already covered by an approved system, backend-only work, or a read-only visual opinion. For a bounded leaf task, load the relevant specialist directly.

## Workflow

### 1. Inspect and route the surface

Read repository instructions, Git status, manifests, routes, layout and component trees, styling/tokens, content, data contracts, tests, and existing browser evidence. Classify the surface:

- `website` — content and conversion dominate;
- `web-application` — routes, state, permissions, forms, and mutations dominate;
- `dashboard` — source/metric semantics, dense exploration, or operational actions dominate.

Choose all product UI roots that the gate must protect. Do not use the repository root as a UI root.

**Complete when:** the surface, users, target journey, existing constraints, protected UI roots, repository-native checks, and relevant existing engineering skill are named from evidence.

### 2. Initialize the design flow

Run from the target project:

```bash
python3 <web-craft-skill>/scripts/design_flow.py init \
  --root . \
  --name "<project name>" \
  --surface <website|web-application|dashboard> \
  --ui-root <frontend-root>
```

Add another `--ui-root` for each independently protected frontend tree. Initialization creates `.design-flow/workflow.json` and `.design-flow/artifacts/`; it does not approve a design or authorize product code.

Use the repository's instruction-authoring workflow to adapt [the `AGENTS.md` gate snippet](templates/agents-md-snippet.md) with the exact protected roots and project slug. Merge it into the applicable project context without overwriting existing instructions or weakening stricter rules. This makes `web-craft`, the manifest, and the compiled project UI skill discoverable to later coding sessions.

For the exact state machine and commands, load [the workflow contract](references/workflow-contract.md).

**Complete when:** `status --json` reports `phase=draft` with the correct surface and UI roots, and the applicable repository context routes protected UI work through this gate.

### 3. Establish product truth and copy

Load [`product-story-and-copy`](../product-story-and-copy/SKILL.md). Produce:

- `PRODUCT-STORY.md`;
- `PAGE-COPY.md`;
- `CLAIMS.md`.

Keep facts, source-backed claims, hypotheses, and unknowns distinct. Use real labels, states, objections, calls to action, and product language before choosing the final composition.

**Complete when:** every publishable promise maps to evidence or is excluded, the primary journey and conversion path are explicit, and placeholder copy no longer determines layout.

### 4. Choose a defensible direction

Load [`design-direction`](../design-direction/SKILL.md). Produce `REFERENCE-LEDGER.md`, no more than two coherent directions, and one selected direction. Extract principles from references; do not assemble recognizable sections from unrelated libraries.

**Complete when:** the selected direction defines a visual thesis, product-specific signature, typography, density, composition, imagery/data language, and explicit no-go list.

### 5. Build the design system before the product UI

Load [`design-system-first`](../design-system-first/SKILL.md). Produce:

- `DESIGN.md`;
- `tokens.json`;
- `COMPONENTS.md`;
- `PROJECT-UI.md`;
- an isolated review preview or equivalent rendered evidence.

The preview may implement tokens and representative components under `.design-flow/`; it must not create product routes or product frontend slices. Show real copy, realistic data, applicable states, narrow and wide layouts, keyboard focus, and reduced motion.

Run:

```bash
python3 <web-craft-skill>/scripts/design_flow.py ready --root .
```

Report the preview and stop with `FRONTEND_BUILD=BLOCKED`.

**Complete when:** `ready` validates all eight artifacts and the human has enough rendered evidence to approve or request changes.

### 6. Record explicit human approval and compile the UI contract

Only after a direct human approval, run:

```bash
python3 <web-craft-skill>/scripts/design_flow.py approve \
  --root . \
  --approver human \
  --approval-ref "<specific conversation or review reference>"

python3 <web-craft-skill>/scripts/design_flow.py compile --root .
python3 <web-craft-skill>/scripts/design_flow.py check-build --root .
```

`ready` freezes both the eight artifact digests and security-relevant workflow scope (`project`, `surface`, `ui_roots`, artifact map, and compiled-skill path). `approve` accepts only that exact presented snapshot. `compile` atomically writes the approved `PROJECT-UI.md` to `.agents/skills/<project>-ui/SKILL.md`. Any artifact or scope drift requires a new `ready` and approval; edit the source artifact rather than the generated skill.

The approval record is tamper-evident workflow evidence, not identity authentication. Branch protection and review policy remain the authoritative control for a hostile writer.

**Complete when:** `check-build` prints `BUILD_GATE: PASS`, and the current coding session has loaded the compiled project UI skill.

### 7. Implement one bounded product slice

Load the compiled `<project>-ui` skill and route implementation by surface:

- `website` → `website-production-engineering`;
- `web-application` → `web-application-engineering`;
- `dashboard` → `web-application-engineering` plus `dashboard-application-engineering`.

Preserve repository conventions. Reuse approved tokens and components; document any necessary exception in the design artifacts and obtain reapproval before treating it as a new system rule. Implement real states and one useful vertical slice before expanding breadth.

**Complete when:** the slice works through its real public interface, uses the approved contract, and focused tests plus browser evidence pass.

### 8. Add only intentional motion

Load [`interface-motion`](../interface-motion/SKILL.md) after the static hierarchy and states work. Produce `MOTION.md` where motion is material. Every animation needs an intent, trigger, affected property, interruption behavior, exit, and reduced-motion outcome.

**Complete when:** motion improves causality, feedback, orientation, continuity, progression, or hierarchy without delaying the task or hiding state.

### 9. Audit, reconcile, and verify

Load [`anti-slop-review`](../anti-slop-review/SKILL.md). Review copy, marketing readiness, composition, design-system fidelity, data semantics, states, motion, accessibility, responsive behavior, console/network state, and performance proportionately. Write `.design-flow/QUALITY-REPORT.md` with `## Evidence` and `## Findings`.

Record the verified state:

```bash
python3 <web-craft-skill>/scripts/design_flow.py verify \
  --root . \
  --report .design-flow/QUALITY-REPORT.md
```

Run the repository's fresh tests, lint, type checks, build, and real-browser checks after the final mutation. Publication or deployment remains separate authorization.

**Complete when:** blocking findings are fixed or named, `verify` passes, the final diff is reviewed, and every completion claim is backed by fresh evidence.

## Enforcement modes

| Mode | Mechanism | Boundary |
|---|---|---|
| Portable | `AGENTS.md` routes UI work through `web-craft` and the compiled project UI skill | Instruction-level; compatible agents can still be misconfigured |
| Deterministic | `design_flow.py guard-write` checks protected paths and current digests | Direct path gate; run before UI writes and in CI |
| Hermes | Install [the hook template](templates/hermes-hooks.yaml) with `fail_closed: true` | Blocks ambiguous writes and all pre-approval terminal commands except an explicit read-only allowlist and exact controller invocations |
| Repository | CI runs `check-build` when protected UI roots change | Final merge gate; strongest portable enforcement with branch protection |

The hook is opt-in because it changes the user's Hermes profile. Configure it only with explicit permission and an absolute installed script path. Before approval it evaluates the terminal tool's effective `workdir`, rejects shell metacharacters, arbitrary interpreters, mixed patch payloads, and malformed or duplicate-key hook JSON. It is intentionally restrictive rather than a general shell parser; CI, branch protection, and review remain required for hostile writers and race conditions.

## Output contract

```text
Web Craft: DRAFT | SYSTEM_READY_FOR_REVIEW | SYSTEM_APPROVED | BUILD_ALLOWED | VERIFIED | BLOCKED
Surface: website | web-application | dashboard
Current phase: <phase>
Loaded skills: <exact names>
Protected UI roots: <paths>

Artifacts
- Product/copy: <paths and status>
- Direction: <path and selected thesis>
- Design system: <paths and digest status>
- Project UI skill: <source and compiled path>
- Motion: <path or not applicable>
- Quality report: <path or pending>

Gate
- Explicit approval: <reference or absent>
- check-build: PASS | BLOCKED
- Stale artifacts: <none or names>

Evidence
- Static/tests/build: <commands and results>
- Browser/accessibility/responsive: <results>
- Anti-slop findings: <blocking/non-blocking summary>

Not performed
- <deployment, publication, production mutation, missing checks>
```

## Common pitfalls

- Treating the request to build as approval of an unseen design system.
- Writing the product page while calling it a “design-system preview.”
- Loading every inspiration at once and producing a visual collage.
- Designing around placeholder copy or invented dashboard metrics.
- Editing the compiled project UI skill instead of its approved source.
- Running `approve` with a generic reference or on the human's behalf.
- Treating valid digests as proof of visual quality.
- Adding motion before static hierarchy, state, and focus behavior work.
- Claiming accessibility or marketing readiness from a screenshot alone.
- Installing the Hermes hook or deploying output without separate permission.

## Verification checklist

- [ ] Surface, users, journey, repository constraints, UI roots, and checks were inspected.
- [ ] The design flow was initialized with the correct protected roots.
- [ ] Product story, page copy, and claims distinguish facts, hypotheses, and unknowns.
- [ ] References were converted into principles with provenance and a no-copy boundary.
- [ ] `DESIGN.md`, tokens, components, states, responsive rules, accessibility, and project UI instructions are substantive.
- [ ] The isolated review preview uses real content and representative states.
- [ ] The human explicitly approved the exact digest-bound review set.
- [ ] The project-local UI skill was compiled and loaded; `check-build` passes.
- [ ] Implementation used the matching existing engineering skill and approved system.
- [ ] Motion has explicit intent and reduced-motion behavior.
- [ ] The anti-slop audit includes evidence and findings, not an unexplained score.
- [ ] Fresh static, behavior, browser, accessibility, responsive, and relevant performance checks ran after the final mutation.
- [ ] Publication, deployment, dependency changes, and profile hook installation were not implied by design approval.
