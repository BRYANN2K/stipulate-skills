---
name: interface-motion
description: "Use when a web interface needs a targeted motion audit, a bounded transition or micro-interaction change, or a consequential/new shared motion system, including product-justified scroll-linked WebGL/WebGPU scenes. Keeps work proportional to the affected states and verifies motion behavior without forcing a motion artifact or a broad design workflow."
license: Apache-2.0
compatibility: Works with CSS, Web Animations, Motion/Framer Motion, GSAP, Three/R3F, vgpu, or repository-native animation tools. Browser verification requires an available interactive browser.
metadata:
  version: "1.2.0"
  author: BRYANN2K
  category: design
  tags: motion, micro-interactions, animation, reduced-motion, interaction-design, browser-testing, scroll, webgl, webgpu
---

# Interface Motion

## Overview

Use motion as state communication and choose the shortest safe mode. A targeted audit stays targeted; a bounded change inherits the current interface; a consequential or new motion system receives the deeper contract its shared effects require. Inspect, implement, and verify only affected motion and representative states where the behavior or claim can differ.

Calibrate freedom to consequence. Causal intent, semantic before/after state, focus and input behavior, data truth, reduced-motion/data equivalence, interruption, exit, lifecycle, and evidence boundaries are low-freedom contracts. Artifact shape, prototype depth, timing exploration, viewport selection, and iteration count are judgment calls. A motion file is memory or a deliverable, not an admission gate.

<HARD-GATE>
An explicit bounded local request to change motion authorizes the necessary local source edits within that named scope; an audit-only request remains read-only unless correction is also requested. Ask again only when scope or effect expands, an unresolved consequential shared-system choice needs the human, or the next action adds a dependency, changes live/external state, is destructive, deploys, or publishes. Do not add motion before the relevant static state and keyboard behavior work, animate an unsupported product claim, hide latency, postpone an available action, trap focus, create avoidable vestibular risk, or ignore reduced-motion/data needs.
</HARD-GATE>

## When to use

- Audit a named interaction or surface whose motion feels generic, excessive, sluggish, inconsistent, inaccessible, or lifecycle-unsafe.
- Add or refine bounded transitions, feedback, overlays, list changes, navigation, progress, selection, drag/gesture, or state micro-interactions.
- Prototype a spatial, gestural, interruption-sensitive, or novel interaction when direct integration would conceal material risk.
- Define or change shared motion tokens, primitives, timeline ownership, or reduced-mode behavior when several consumers genuinely need a system contract.
- Coordinate a product-justified scroll-linked Three/R3F/WebGL/WebGPU scene when spatial continuity or progression carries real narrative information.

Do not use for static art direction, generic ambient GPU backgrounds, video production, or as a substitute for loading and error-state design. Route a real-time landing through its semantic scene/fallback contract first; motion cannot justify the renderer by itself.

## Workflow

### 1. Select the adaptive mode and bound the claim

Inspect only enough request and repository context to choose a mode:

| Mode | Use when | Shortest safe path |
|---|---|---|
| `TARGETED_AUDIT` | A named transition, interaction, route, or motion defect needs diagnosis | inspect the affected rendered/source behavior → compare immediate and animated state → report evidence and the smallest correction; edit only when correction is authorized |
| `BOUNDED_CHANGE` | A local transition or coherent set of related micro-interactions is requested | inherit current tokens/primitives → trace affected states → implement the smallest coherent change → verify affected behavior |
| `MATERIAL_NEW_MOTION` | A consequential/new shared motion language, primitive, timeline, or real-time scene spans consumers or creates durable lifecycle rules | inspect representative consumers and ownership → define only the shared contract needed → prototype unresolved risk → implement the scoped system slice → verify representative affected uses |

Identify the exact surface, affected transitions, exclusions, existing system source, mutation authority, repository-native checks, and external-effect boundary. Do not promote a local coincidence into a system or run the full design workflow for a motion-only request. No mode imposes a fixed artifact, state matrix, viewport set, prototype, or review cycle.

**Complete when:** the selected mode and the motion claim are no broader than the requested outcome.

### 2. Trace only the affected state transitions

Inspect the governing interface rules, relevant token/primitive source, trigger, semantic before/after state, DOM or scene ownership, focus behavior, input paths, data/action lifecycle, current cleanup, and neighboring motion needed to judge the change. Reproduce or understand the transition without animation first.

Name the information function:

- `causality` — connect action to result;
- `feedback` — acknowledge input or state change;
- `orientation` — show where content entered, moved, or will return;
- `continuity` — preserve identity across state or layout change;
- `progression` — communicate real bounded progress or sequence;
- `hierarchy` — briefly prioritize new or changed information.

A transition may serve more than one compatible intent when the relationship is explicit. If motion adds no information, keep the state change immediate or remove the motion.

**Complete when:** each affected trigger, before state, after state, user information need, focus destination, and causal intent is clear enough for the selected mode.

### 3. Define the smallest useful motion contract

Keep the contract inline, in the current working note, or inside an existing interface/scene brief by default. Use [the optional motion template](templates/motion.md) as a persistent artifact only when the user requests it as a deliverable, a handoff must survive across runs or implementers, or repository policy requires it. Do not duplicate an existing source of truth.

For each affected interaction record only what implementation or audit needs:

- trigger, eligibility, semantic before/after state, and causal intent;
- animated owner, properties, timing/easing token or justified local value;
- entrance, update, exit, interruption/reversal, cancellation/replacement, and repeated-input behavior;
- authoritative semantic state and animation generation/owner, including how stale finish callbacks from replaced or canceled work are rejected;
- focus, keyboard, pointer, touch, and gesture behavior as applicable;
- authoritative data/action completion versus visual completion, including cancellation or failure where applicable;
- reduced-motion and reduced-data equivalent, including a preference change while motion is in flight, or an explicit reason reduced data does not apply;
- event-independent reconciliation when a transition is skipped or a scroll/view timeline is inactive;
- acceptance evidence and the limits of the resulting claim.

For a conditional scroll-linked real-time scene, also define semantic DOM proof/action, scroll or state authority, scene/camera mapping, timeline and render-clock ownership, interpolation, layout remeasurement, input routing, hidden/offscreen pause, static fallback, resource cleanup, and backend-applicable WebGL context-loss or WebGPU device-loss behavior. Do not require GPU fields for ordinary UI motion.

Load [motion intents and implementation rules](references/motion-intents.md) only for the affected overlays, layout/list changes, async actions, gestures, lifecycle, or real-time renderer concerns.

**Complete when:** the relevant behavior is unambiguous without manufacturing a universal contract file or filling inapplicable fields.

### 4. Prototype only unresolved risk

Prototype in a repository-approved scratch location or temporary local workspace only when spatial measurement, gesture physics, sequencing, interruption, renderer feasibility, or another material uncertainty is cheaper and safer to resolve outside production. A familiar bounded transition may proceed directly in the real component.

Exercise only edge conditions capable of changing the decision, such as rapid input, reversal, resize, keyboard/focus transfer, touch cancellation, reduced modes, slow/failing data, pause/resume, or renderer loss. Delete or retain the prototype according to repository policy and handoff need; prototype code is not production-ready by default.

**Complete when:** decision-changing uncertainty is resolved or reported, not when an arbitrary prototype matrix is filled.

### 5. Audit or implement within the selected authority

In `TARGETED_AUDIT`, preserve source unless correction is authorized and localize every finding to observed behavior. In `BOUNDED_CHANGE`, edit only the affected component, primitive, token, and directly dependent state. In `MATERIAL_NEW_MOTION`, change shared sources and consumers only within the requested system boundary; do not broaden the task into redesign or migration.

Use repository-native animation tools already present. Prefer CSS for simple state transitions and a library only when sequencing, presence, gestures, layout continuity, or rendering justifies it. Do not install a dependency without explicit authorization.

Implementation posture:

- keep input and authoritative semantic/data state changes immediate even when visual completion continues; the animation projects state and never becomes its source of truth;
- prefer compositor-friendly properties and measure any necessary layout, filter, paint, or frame-loop cost in context;
- on replacement or cancellation, commit/reconcile the current authoritative state first, invalidate the old animation generation, and reject any late `finish`/promise/event callback whose generation or owner is no longer current;
- make cleanup idempotent and independent of `animationend`/`transitionend`; a canceled animation, skipped CSS transition, or inactive scroll/view timeline may not deliver the expected finish path;
- when reduced-motion preference changes in flight, cancel or reconcile risky motion immediately to the current semantic state or informative safe endpoint without delaying focus, action, or cleanup;
- avoid broad DOM animation, allocations or framework state updates per frame, and competing timeline/RAF owners;
- pause nonessential continuous visual work when hidden or outside its intended intersection range, then resume from current semantic state without a large time jump;
- clean up listeners, observers, timers, tweens, animation handles, RAF work, and owned renderer resources on cancellation, replacement, unmount, or navigation.

For scroll-linked 3D, native document scroll is the default authority. Derive normalized scene targets from measured layout, update fast values in the owned render tick, preserve normal document navigation and input, and provide usable semantic DOM/static fallback. When the backend exposes loss events, handle WebGL context loss or WebGPU device loss with bounded recovery or fallback and release the correct owners; do not add irrelevant loss machinery to non-GPU motion.

**Complete when:** implementation matches the affected contract, preserves ownership and task responsiveness, and introduces no implicit dependency or unrelated system change.

### 6. Preserve equivalent reduced modes and data truth

Reduced motion is not automatically “disable all CSS.” Preserve the same state information through an immediate change, short non-spatial opacity, static emphasis, textual progress, or another safe cue. Remove large translation, parallax, camera travel, zoom, orbit/rotation, shake, procedural drift, and nonessential repeated movement. Subscribe to preference changes only when the implementation has live motion to reconcile; if reduction becomes active mid-flight, invalidate the current animation generation and settle into the current semantic state or a safe informative endpoint. Never make focus transfer, authoritative state, cleanup, or task completion depend on `animationend`, `transitionend`, or a timeline becoming active.

When reduced-data preference or a project data-saving mode is relevant, avoid fetching nonessential motion assets, initializing an unnecessary renderer, or hiding required content behind media. Use semantic DOM, a lightweight poster, or another equivalent that retains proposition, proof, action, and state. Reduced data does not authorize stale or fake progress.

Keep input acknowledgment, request pending, server acceptance, durable completion/readback, and celebration distinct. Visual success must not outrun authoritative data, and pausing an offscreen animation must not pause the underlying task.

**Complete when:** affected tasks and feedback remain understandable and operable under applicable reduced-motion/data and data failure conditions.

### 7. Verify only affected motion and representative states

Use fresh repository-native checks and a real browser when claiming interaction behavior. Select states, inputs, viewports, preferences, and runtime conditions because the changed behavior or claim can differ there, not to satisfy a fixed matrix. One representative condition may be enough for an invariant local transition; responsive, spatial, data-driven, or real-time claims need the contrasting evidence that can falsify them.

Exercise the applicable subset:

- trigger, semantic before/after state, entrance/update/exit, and causal readability;
- repeated activation, mid-flight interruption, reversal, cancellation/replacement, authoritative-state reconciliation, and rejection of a stale finish callback from the superseded generation;
- keyboard, focus, pointer, touch, gesture, and accessible announcement behavior;
- reduced motion—including a preference toggle while motion is active—reduced data, slow/failing data, and visual-versus-authoritative completion;
- a skipped transition or inactive scroll/view timeline when the affected implementation otherwise expects finish/event-driven cleanup;
- resize/reflow or responsive framing where mapping changes;
- actual hidden/offscreen frame or timeline pause, resume behavior, and cleanup after affected cancellation/navigation/remount;
- for the active GPU backend, semantic/static fallback and applicable context/device loss without intercepting DOM actions;
- console/runtime errors and proportionate layout, paint, interaction, main-thread, frame, or resource evidence.

Recheck only evidence invalidated by the last relevant mutation. Stop when acceptance is met, further passes have diminishing value, a material blocker needs human input, or the agreed budget is reached; do not run a fixed number of cycles.

A screenshot or recording proves appearance only at its captured state and size. A parser, validator, lint, build, test, browser automation, or performance-tool result proves only the contract it actually exercised; none alone proves motion intent, feel, accessibility, lifecycle cleanup, device behavior, deployment, or publication.

**Complete when:** evidence supports the bounded motion claim and every skipped, unavailable, or untested material condition remains explicit.

### 8. Remove motion that does not earn its cost

Compare the affected animated and immediate states. Remove or simplify motion when it communicates no useful relationship, repeats without value, makes the task feel slower, competes with content, imitates a reference, or costs more complexity than the information warrants. Do not expand a local audit into a general taste rewrite.

**Complete when:** each retained affected animation has a named information benefit and residual gaps are visible.

## Output contract

Preserve the following information. A user- or host-specific presentation adapter may reorder or chunk applicable fields, but it must not hide evidence, gaps, causal intent, lifecycle or accessibility safety, or authority boundaries.

```text
Interface motion: AUDITED | IMPLEMENTED | VERIFIED | PARTIAL | REMOVED | BLOCKED
Mode: TARGETED_AUDIT | BOUNDED_CHANGE | MATERIAL_NEW_MOTION
Requested scope and exclusions: <affected surface/transitions>

Affected contract
- Trigger / before / after / intent: <semantic states and causal relationship>
- Properties / timing ownership: <existing token, primitive, or justified local value>
- Interruption / replacement / cancellation / exit: <authoritative state, generation owner, stale-finish rejection>
- Focus / input / data: <behavior and authoritative completion>
- Reduced motion / data: <equivalent, including mid-flight preference change when applicable>
- Finish-path independence: <skipped transition/inactive scroll-view timeline reconciliation when applicable>
- Lifecycle: <hidden/offscreen pause, resume, cleanup; conditional GPU loss/fallback>

Work and evidence
- Audit findings or local edits: <locators/results>
- Representative affected states/environments: <browser and behavior evidence>
- Repository-native/tool checks: <commands/results and what they prove>
- Persistent motion artifact: <path or inline/not needed, with reason>

Gaps and claim boundary
- <unavailable device/input/state/measurement; not deployed/published or otherwise not proven>
```

## Common pitfalls

- Running a full design workflow or system inventory for one transition.
- Treating an audit-only request as edit authority, or asking again after a bounded change already supplies local authority.
- Requiring `MOTION.md`, a prototype, token promotion, or a full state matrix for every motion task.
- Animating because a component gallery provides a recipe or because a real-time renderer is available.
- Adding motion before static state, hierarchy, keyboard, and focus behavior work.
- Making input, authoritative success, cleanup, or focus wait for visual completion.
- Ignoring interruption, replacement/cancellation ownership, stale finish callbacks, reversal, exit, repeated input, unmount, resize, obsolete async work, or failure where they affect the transition.
- Depending on `animationend`/`transitionend` or an active scroll/view timeline for semantic state or cleanup when the transition can be skipped, canceled, replaced, or inactive.
- Replacing reduced motion with no feedback, or continuing heavy downloads/procedural motion under applicable reduced modes.
- Driving scroll-linked graphics from wheel-only input, framework state per frame, nested scroll without a contained contract, or competing clocks.
- Letting continuous work run hidden/offscreen, retaining resources after route changes, or ignoring backend-applicable GPU device/context loss.
- Treating a smooth recording, syntax check, validator, or automation `PASS` as proof of intent, accessibility, feel, performance, cleanup, or publication.
- Imposing fixed interaction counts, cycles, or viewport matrices instead of evidence selected by the affected claim.

## Verification checklist

- [ ] The adaptive mode and scope match the requested motion outcome.
- [ ] A bounded local change proceeded within existing authority; audit-only, dependency, live/external, destructive, deployment, and publication boundaries remained intact.
- [ ] Only the affected transitions, governing rules, and representative consumers/states were inspected.
- [ ] Each affected animation has a causal information intent and explicit semantic before/after states.
- [ ] Applicable properties/timing ownership, interruption/reversal/replacement/cancellation, authoritative state, stale-finish rejection, entrance/update/exit, repeated input, focus, and input behavior are clear.
- [ ] Authoritative data completion remains separate from visual completion, including affected cancellation or failure.
- [ ] Reduced-motion/data equivalents preserve the task and feedback without risky or unnecessary motion/assets, including a mid-flight preference change where live motion exists.
- [ ] A skipped transition or inactive scroll/view timeline cannot strand semantic state, focus, cleanup, or task completion.
- [ ] Hidden/offscreen continuous work pauses where appropriate, and affected listeners, timers, animations, render loops, and resources clean up.
- [ ] Conditional real-time work preserves semantic DOM/static fallback, native input/navigation, unambiguous progress/render ownership without competing clocks, layout remeasurement, and backend-applicable context/device loss handling.
- [ ] A prototype or persistent motion artifact exists only when risk, deliverable, handoff, or project policy justifies it.
- [ ] Fresh browser and repository-native evidence covers only representative affected conditions; gaps remain explicit.
- [ ] Screenshots and validator/tool results are not generalized beyond what they directly prove.
- [ ] No fixed counts, cycles, or viewport sets were imposed, and motion without observable benefit was removed.
