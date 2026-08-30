---
name: design-direction
description: "Use when product understanding, copy, screenshots, sites, design systems, component libraries, or subject-world references must become an original visual thesis, a bounded direction, or decision-relevant rendered concepts. Handles targeted direction work without invoking the full design studio; uses the smallest cited source set and only enough alternatives to expose a real trade-off. Preserves licence/no-copy boundaries and keeps real-time graphics strictly optional."
license: Apache-2.0
compatibility: Works with image-capable or text-only Agent Skills clients; rendered comparison requires a browser, image-generation, design, or equivalent preview tool.
metadata:
  version: "2.1.0"
  author: BRYANN2K
  category: design
  tags: art-direction, visual-prototypes, design-research, references, concept-selection, anti-copy, webgl, webgpu, 3d
---

# Design Direction

## Overview

Turn product truth and real content into an original visual argument. Use the shortest safe mode: a targeted direction request can produce one thesis or bounded concept; research only supplies missing evidence; alternatives exist only for a material trade-off; a full rendered exploration belongs to a new/materially open interface or an explicit request.

**Reuse boundary:** do not copy a source's distinctive layout, artwork, icons, branded token values, proprietary components, code, text, or recognizable interaction sequence without compatible permission. A public URL is not a reuse licence. Unclear status means principle-only observation with attribution, never asset/code reuse. Permission and originality are separate checks: a compatible licence can permit direct reuse, but it does not make a direction original when the source's recognizable composition, sequence, or combined expression remains the concept. Rework it into a product-specific adaptation or label the authorized reuse honestly instead of presenting it as new art direction.

Exact source observations, licensing, product truth, accessibility constraints, and no-copy boundaries are low-freedom. Concept count, research count, artifact form, presentation order, and rendering depth are judgment calls calibrated to the decision.

<HARD-GATE>
An explicit bounded direction or local prototype request authorizes that named local work. Ask again only when scope/effect expands, a consequential unresolved choice needs the human, or a dependency, paid asset, live/external effect, deployment, or publication appears. If direction selection is delegated, choose and continue. Never trade originality, claim truth, accessibility, or source rights for speed.
</HARD-GATE>

## When to use

- Define or refine one visual thesis, signature, composition, or bounded page/feature direction.
- Give visual form to source-backed content for a new/material landing page or marketing surface.
- Explore information topology, density, navigation, and states for an open application/dashboard pattern.
- Translate screenshots, sites, systems, component libraries, or product-domain material into original principles.
- Decide whether bounded work should inherit an established system.
- Evaluate a specifically requested or product-justified WebGL/WebGPU/Three/R3F/`vgpu` concept without making it the default.

Do not use to clone a reference, build a full token/component system before a concept exists, manufacture alternatives for a settled change, or route a targeted direction request through the full Interface Studio.

## Workflow

### 1. Select the exploration mode

Inspect only the content, claims boundary, existing system/brand, representative data/states, platform/accessibility constraints, and stack needed for the visual decision. Equivalent inline evidence is enough for a bounded task.

| Mode | Use when | Minimum path |
|---|---|---|
| `TARGETED_DIRECTION` | One thesis, reference translation, signature, composition, or bounded concept is requested | inspect governing content/system → research only missing evidence → produce one viewable or implementation-ready direction → check originality/fit |
| `OPEN_EXPLORATION` | A new/material marketing interface has a real unresolved visual strategy | fair content contract → enough distinct concepts to cover the trade-off → render → select |
| `TASK_PATTERN` | A new app/dashboard topology or interaction pattern remains open | hold task/data/state constant → enough task-centered concepts → render relevant state(s) → select |
| `INHERIT_SYSTEM` | Bounded work fits a coherent established system | cite governing system → define the local placement/extension → skip alternatives and fresh inspiration unless a gap remains |

Record decision owner only when a material choice exists: `human`, `delegated`, or `not-applicable`. Delegated judgment authorizes selection and continuation within the bounded local scope; it does not authorize dependencies, publication, deployment, or asset purchase.

### 2. Research only what the decision lacks

Start from the product decision, not a gallery. Retain the smallest source set that unlocks a credible original direction. One strong source can be enough; several may be needed for distinct roles. Stop when another source would add fashionable fragments rather than decision value.

For every retained source record:

- exact primary URL and artifact/viewport/state inspected;
- exact visible observation, not an adjective;
- interaction evidence actually observed (live path, recording, trace, or source), or an explicit `still-only — interaction unobserved` boundary;
- adaptation principle tied to this product;
- licence/reuse status and date checked;
- originality decision independent of licence and an explicit no-copy boundary.

Prefer origins, current official artifacts, creator-authored case studies, inspectable terms, and subject-world material. Load [reference analysis rules](references/reference-analysis.md) for difficult provenance, concept differentiation, or rendering decisions. Skip fresh inspiration research in `INHERIT_SYSTEM` when the canonical system already answers the choice.

Inline research notes are valid. Persist a ledger only when requested, required by the project, actual reuse/attribution must survive, or the decision will cross runs/agents.

### 3. Hold comparison truth fair when alternatives exist

Name only the constants needed for fair comparison: product facts/caveats, proof inventory, representative content/data/state, primary action/task, target constraint, and technical/accessibility boundaries. Do not use fake metrics, customers, production states, or unlicensed assets to make one concept persuasive.

Keep each copy strategy coupled to the direction it materially serves rather than generating every combination. Fairness means equal access to supported truth and proof, not identical sentences. Task concepts should use the same representative job, data, state, and consequence.

Skip this comparison contract when one targeted or inherited direction is already selected.

### 4. Produce the minimum viewable direction evidence

A direction must be concrete enough for its requested purpose. When alternatives are resolving an open visual decision, every candidate must be viewable through disposable HTML/CSS, a project-native preview, an image comp, a readable wireframe, or an equivalent real render. A concise implementation brief or annotated locator is sufficient only when a targeted/inherited decision is already selected and no visual comparison remains. Do not add a framework or reusable component library merely to compare concepts.

For each explored direction include the applicable subset of:

- one-sentence thesis and product/subject-world signature;
- topology, attention path, typography, density, palette/asset/data language, and motion posture;
- real copy/data needed to expose wrapping, hierarchy, proof, state, and action;
- a readable viewport/state or annotated locator that tests the decisive claim;
- interaction claims only when the behavior was actually observed or prototyped—a still image supports pictured composition, not hover, scroll, timing, focus, transition, or responsive behavior;
- honest trade-off, accessibility/responsive/implementation risk, and concept-specific no-go.

When constraints select one direction, stop at one. When alternatives are warranted, render enough structurally and strategically independent concepts to expose and resolve the material trade-off—not palette/font swaps—and stop when that trade-off is covered. A downstream frame, constrained viewport, or non-happy state is required only when it changes the decision or supports the claim.

For applications/dashboards, vary the relevant information topology, navigation/focus model, density, disclosure, state handling, and action placement around the same task. Do not style a marketing funnel and call it an application concept.

### 5. Keep real-time graphics strictly conditional

Semantic HTML/CSS/DOM is the default. No option set must contain a GPU concept. Enter the renderer branch only when the user explicitly requests it or a named product need requires spatial, procedural, or interactive rendering that static media cannot communicate as well.

A viable real-time direction preserves, as applicable:

- named product beat and canvas role;
- remove-canvas result: proposition, proof, order, controls, and CTA remain usable in semantic DOM;
- static/reduced-motion and reduced-data equivalent;
- DOM/canvas/native-scroll/input/resource ownership;
- readable deterministic frames only for decision-changing states/viewports;
- renderer/version feasibility, project-specific budget risk, loading/failure/loss, offscreen pause, cleanup, and asset provenance.

If nothing meaningful is lost without the canvas, simplify to static media. If content/action disappears, repair DOM/fallback before selecting it. Do not install a renderer or decoder during concept work. Route `vgpu`, GSAP, Three/R3F, and other framework details to official relevant skills or the repository-pinned documentation rather than duplicating APIs here.

### 6. Compare and select only when needed

Evaluate candidates against product/task fit, content/proof legibility, originality without copied expression, accessibility risk, responsive behavior, and implementation cost. Run originality independently of permission: a licensed candidate still fails the original-direction claim when a reasonable reviewer can recognize the source from substantially the same composition, sequence, and combined motifs. Likewise, strip or qualify any interaction claim supported only by a still frame.

- `human`: present the viable set and one recommendation, then ask the unresolved selection question.
- `delegated`: record the evidence-based choice, rationale, risk, and continue within local authority.
- `not-applicable`: the request/system already selected the direction; no approval ritual.

A fresh reviewer can reduce builder bias for a consequential choice, but it is not mandatory. Do not merge unrelated fragments into a safe average. Reopen the concept only when feedback changes its architecture or governing truth, not for a local fix.

### 7. Hand off only what implementation must retain

Keep the selected direction as inline output or persist a brief only when it is a deliverable, must survive runs/agents, or the project requires it. Preserve:

- thesis and product-specific signature;
- composition/topology and responsive priority relevant to the build;
- type/density/palette semantics and asset/data provenance;
- motion intent and reduced equivalent when material;
- representative content/states and no-go;
- accepted trade-off, evidence locators, and unresolved risks;
- conditional renderer role, semantic fallback, ownership, versions, budget/lifecycle boundaries.

Do not create a speculative full design system. `design-system-first` may inherit/extend the current system for bounded work or consolidate genuinely shared rules afterward.

### 8. Verify only the decision claim

Inspect the direction at the viewport/state that exposes the decision, plus contrasting cases only when content, behavior, or the claim changes. Check real text/data, action clarity, contrast, reading/focus order, responsive risk, asset rights, and reduced-motion intent as applicable. Record unavailable checks. If hover, scroll, focus, gesture, transition, sequence, or responsive behavior affects selection, observe or prototype that behavior; do not infer it from a still.

A rendered frame proves the pictured state, not unobserved interaction, function, accessibility, performance, cleanup, deployment, or publication. Syntax/tool `PASS` proves only that tool. Stop refinement when the decision is resolved, value diminishes, a material choice/blocker needs the human, or the agreed budget is reached.

## Output contract

Preserve this information when it applies. A user-requested or host presentation adapter may reorder, relabel, chunk, summarize, or progressively disclose it, but must not hide citations, no-copy/licence boundaries, selection authority, risks, or gaps.

```text
Design direction: READY | RENDERED | SELECTED | PENDING_HUMAN | PARTIAL | BLOCKED
Mode: TARGETED_DIRECTION | OPEN_EXPLORATION | TASK_PATTERN | INHERIT_SYSTEM
Requested visual decision and exclusions: <specific>
Sources: <IDs, URLs, observations, observed-interaction/still-only boundary, adaptations, licence/reuse, independent originality/no-copy decision>
Directions: <one direct direction or candidate IDs with real differences and viewable locators>
Decision: <selected/pending/not applicable> — owner=<human|delegated|not-applicable>
Selected handoff: <inline summary or path, trade-off/no-go/risk>
Real-time graphics: <not active or explicit/named need, remove-canvas/fallback, renderer/lifecycle boundary>
Evidence: <decision-relevant viewports/states and results>
Not performed/proven: <system build, dependency, runtime/accessibility/performance, publication gaps>
```

## Common pitfalls

- Running a full exploration for a targeted thesis or inherited-system placement.
- Browsing by quota before reading product/content evidence.
- Treating a screenshot, public URL, community file, or code licence as blanket reuse permission—or treating compatible permission as proof that a recognizable copied composition is original.
- Manufacturing a fixed number of palette/font swaps instead of resolving one real trade-off.
- Giving one option stronger invented proof/data or generating every copy × style combination.
- Forcing landing composition onto an operational task.
- Building tokens/components/full state matrices before choosing the direction.
- Applying universal aesthetic bans instead of a product/concept-specific no-go.
- Requesting approval after selection was delegated or when constraints already decide.
- Treating a still image as evidence of hover, scroll, focus, transition, sequence, responsive, or other unobserved interaction.
- Treating a generic GPU effect as a direction, hiding content in canvas, or duplicating renderer APIs.

## Verification checklist

- [ ] The shortest exploration mode matches the request; targeted work did not invoke the full studio.
- [ ] Product truth, real content/data, claims boundary, existing system, and constraints were inspected proportionately.
- [ ] Research stopped when the missing evidence was supplied; every retained source has origin, observation, observed-interaction or still-only boundary, adaptation, licence/reuse status, independent originality decision, and no-copy boundary.
- [ ] One direction was accepted when constraints selected it; alternatives exist only for a real structural/strategic trade-off.
- [ ] Compared options use fair product truth/proof/data and are viewable enough to expose their decisive difference.
- [ ] The selected thesis/signature is original after source expression is removed; compatible licensing was not mistaken for originality.
- [ ] Interaction claims are limited to behavior actually observed or prototyped; still frames support pictured composition only.
- [ ] Any real-time branch is explicitly requested or tied to a named product need and preserves semantic DOM/fallback, reduced modes, ownership, failure/loss, pause, cleanup, performance/capture truth, and source rights.
- [ ] Selection authority is explicit only when needed; delegated judgment continued without a redundant approval.
- [ ] Handoff/persistence is proportional and does not create a speculative full system.
- [ ] Verification matches the visual decision claim and does not overstate still frames, tools, runtime, accessibility, deployment, or publication.
