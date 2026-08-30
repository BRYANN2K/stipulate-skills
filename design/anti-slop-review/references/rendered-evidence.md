# Rendered evidence protocol

Use this reference only when the requested claim depends on rendered pixels, responsive behavior, interaction, accessibility behavior, motion, runtime, or real-time graphics. It is not a universal device matrix and does not make browser capture mandatory for a source-only or explicitly nonvisual targeted review.

## Select evidence from the claim

Choose the smallest set of rendered contexts that can expose a material difference:

- copy prominence or hierarchy: the context where the text appears, with another width or state only when wrapping, order, visibility, or emphasis can change the judgment;
- responsive behavior: the behavior-changing ranges implicated by the implementation or content, plus a boundary-adjacent case when risky;
- application state or recovery: the affected task state and the transition/readback needed to prove it;
- motion: before/after and interruption or a trace/video when stills cannot show causality, control, or exit;
- broad surface quality: decisive task or conversion contexts and materially distinct content, responsive, or failure conditions;
- accessibility behavior: the applicable keyboard, semantic, announcement, contrast, reflow, or assistive context rather than screenshots alone;
- optional real-time graphics: only the deterministic frames, fallback/reduced/failure/loss/pause/lifecycle/performance evidence required by the named renderer claim or material release risk.

A single readable view can support a bounded visual claim. It cannot support responsive, interaction, accessibility, cross-state, device, or release-impact claims that were not exercised. A `FULL_SURFACE_REVIEW` uses representative risk-based coverage; it does not earn completeness by filling a fixed route, viewport, state, or browser grid. That breadth does not activate a release-impact advisory.

## Record enough capture context

For each retained screenshot, video, trace, or accessibility snapshot, record enough context for another reviewer to understand and, when needed, reproduce what it proves. Useful fields include:

- stable evidence ID and artifact path or inline attachment;
- affected surface and whichever route, role, state, fixture, or element locators are material;
- viewport/container dimensions, DPR, browser/runtime, device or emulation status when those conditions affect the claim;
- source revision/build and capture time when freshness or re-entry matters;
- theme, fonts, zoom, reduced-motion/data settings, cache, and animation/clock stabilization when relevant;
- baseline relationship when comparing (`APPROVED`, `ABSENT`, `STALE`, or a repository-native term).

Do not force every field into every record. A source-located copy screenshot may not need role or animation metadata; a deterministic renderer baseline usually does.

Prefer evidence at a readable scale. A viewport-sized image, focused region with surrounding context, full-page capture, video, or trace can each be primary when it best exposes the claim. Do not use a shrunken full-page thumbnail or isolated crop when it hides hierarchy, wrapping, focus, controls, or surrounding meaning.

## Preserve an unanchored visual read when applicable

When visual quality is being judged, inspect the current render before reading automated audit results or implementation-led diagnosis. Record material `REVIEWER_JUDGMENT` observations with locators, then use source and tool evidence to confirm or challenge them.

The blind read is not required for a targeted nonvisual probe. If the request is source fidelity, link syntax, one build command, or another tool-only result, report that narrow evidence without calling it rendered or interface quality.

## Freshness and comparison

A mutation invalidates only evidence it could materially affect. Recapture or rerun the affected context after the last relevant mutation; do not repeat an unrelated ceremonial matrix. A renamed or copied old artifact is not fresh evidence.

Pixel, accessibility-tree, trace, or snapshot diffs show change, not whether the change is better. Baselines are never accepted automatically. Interpret automated signals in context and record human judgment where hierarchy, coherence, or user impact is part of the claim.

When correction is authorized, repeat review passes only while another pass is likely to resolve a material in-scope finding. Stop on acceptance, diminishing returns, a blocker or consequential choice, or the agreed budget; preserve the stop reason and residual gaps.

## Browser and accessibility boundaries

Choose browser probes that can confirm or falsify the requested claim. Applicable evidence may include:

- keyboard order, focus visibility/return, activation, escape, and traps along the affected path;
- semantic roles, names, values, headings, landmarks, relationships, and announcements;
- automated accessibility `violations`, `incomplete`, `passes`, and `inapplicable` results retained as separate tool states and interpreted alongside manual evidence;
- contrast, non-color cues, zoom/reflow, overflow, wrapping, and content priority;
- console/runtime faults, network behavior, state transitions, action readback, and reduced motion;
- repository-native tests/build plus source-backed content/data where those claims are in scope.

A screenshot proves rendered pixels in the recorded context only. It does not prove function, semantics, focus order, accessibility, authorization, persistence, live data, performance, deployment, or publication. An automated accessibility result proves only the scanned rules and state; it is not certification. Keep `violations`, `incomplete`, `passes`, and `inapplicable` as distinct arrays or summaries with the run scope and rule/node locators. Resolve `incomplete` review items manually where possible; even with zero `violations`, an unresolved item material to the requested conclusion prevents unconditional `PASS` and leads to `CONDITIONAL` or `BLOCKED` according to whether it is essential. Do not count `passes` or `inapplicable` as proof outside the rules and nodes actually evaluated. Deduplicate repeated alerts by rule, target, and evidenced root cause. Tool impact metadata remains tool evidence; review severity comes from user/product consequence.

This result separation is selectively informed by axe-core revision [`d50cdf6ea7c6f4cff426b6f3da7850b8c0b32eb6`](https://github.com/dequelabs/axe-core/tree/d50cdf6ea7c6f4cff426b6f3da7850b8c0b32eb6), MPL-2.0, including [`doc/API.md`](https://github.com/dequelabs/axe-core/blob/d50cdf6ea7c6f4cff426b6f3da7850b8c0b32eb6/doc/API.md). No axe dependency, rule dump, aggregate score, or severity mapping is required.

Tool absence is `UNAVAILABLE` or `DEGRADED`, never a pass. It makes the review `BLOCKED` only when the missing evidence is essential to the requested conclusion. Otherwise state the limitation and keep the conclusion bounded.

## Conditional WebGL/WebGPU evidence

Use this section only when a canvas, shader, model, postprocess, continuous render loop, or renderer-specific release risk is in scope. Do not impose it on unrelated DOM, copy, source, or style reviews.

### Observable state

Prefer a dev/test-only adapter or non-sensitive DOM attributes over arbitrary timeouts. Expose only the state needed by the requested probe, which may include:

```text
static | loading | ready | running | paused | lost | fallback | disposed | error
```

Depending on the claim, useful observations include actual backend (`webgpu`, `webgl2`, `webgl1`, `software`, or `none`), fallback reason, CSS and backing-store size/DPR, submitted frame count, seed/time/progress, pending assets, errors, and available resource counters. A readiness signal should follow the fonts, assets, pipeline preparation, and warmups that matter to the captured state. A timeout or non-black canvas does not establish readiness.

### Deterministic capture

For a visual-regression or fixed-frame claim, control and record the inputs that can change the result, as applicable:

- browser/OS and GPU/backend information observable in the environment;
- viewport, CSS canvas and backing dimensions, DPR, and quality tier;
- theme/fonts, seed/random inputs, camera, pointer/focus, scroll progress, time/frame, and warmups;
- asset/source hashes and cache/loading state;
- visibility/intersection plus normal, reduced-motion, reduced-data, and fallback mode when those modes are being compared.

CSS animation disabling does not freeze RAF/WebGL/WebGPU. The application or test adapter must control the actual loop, clock, progress, and frame needed by the claim. Use framework-specific controls only after checking the installed version and authoritative skill/docs. Keep baselines environment-specific. Derive pixel tolerance from observed cross-environment variation, never widen it merely to pass.

### Fallback, loss, pause, and lifecycle

Exercise only cases implicated by the renderer contract, changed path, or requested release risk. Candidates include:

- renderer absence, adapter/device/context creation denial, or unavailable optional features;
- shader/pipeline errors and missing, corrupt, or CORS-blocked model/texture/decoder assets;
- reduced motion or reduced data before heavy renderer/asset requests when that behavior is promised;
- offscreen/hidden pause and resume without a large clock/progress jump;
- WebGL context loss/restore or WebGPU device loss with bounded reconstruction or a durable usable fallback;
- resize, orientation, reflow, and framing after fonts or images settle;
- semantic DOM, proof, primary action, keyboard/focus/touch, and pointer pass-through without the canvas;
- repeated mount, ready/interact, navigation/unmount, and resize behavior long enough to determine whether contexts, RAF/tickers, listeners, observers, workers, and available resource counters plateau for the named lifecycle claim.

Mocks can validate a state machine but not real GPU rendering. Software GPU or mobile emulation does not prove a physical mobile GPU, thermals, battery, driver loss, or device performance. Missing representative hardware can be a named exclusion for a targeted fallback claim. It prevents a broader renderer/device verdict only when that verdict was requested and depends on the missing evidence.

### Performance evidence

Use performance checks only when performance is requested, changed, governed by a project budget, or material to the release risk. Prefer project/device-specific budgets for initial/deferred JS and assets, model/texture formats and dimensions, DPR/quality, frame/main-thread/GPU timing, Web Vitals, and relevant draw/triangle/resource/postpass guardrails.

Do not invent universal GPU budgets. Measure the composed route under recorded conditions and interpret counters rather than treating them as certification. Web Vitals field claims require field/RUM evidence; lab tools remain lab evidence. GPU time requires a supported timestamp/disjoint query or equivalent, not `performance.now()` around encoder submission. Unsupported timers or profilers are limitations, not passes.

A screenshot, non-black canvas, golden match, renderer counter, or syntax/tool success cannot establish frame rate, long-session stability, cleanup, accessibility, device coverage, or performance quality by itself.

## Conclusion boundary

Rendered evidence contributes only to the claim it exercised:

- a targeted review can pass a visual or browser claim with proportionate current evidence and explicit exclusions;
- a source-only review can pass its source claim while stating that rendered behavior was not assessed;
- missing rendered evidence is blocking only when the requested verdict depends on it;
- a `FULL_SURFACE_REVIEW` does not imply release impact;
- release-blocking language requires an explicitly requested, materially supported `ADVISORY` for the named candidate, independent of breadth;
- no rendered conclusion or release-impact advisory is human approval or merge, release, deployment, publication, or risk-acceptance authorization.
