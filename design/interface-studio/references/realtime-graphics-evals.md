# Real-time graphics evaluation fixtures

Use these fixtures when evaluating or regression-testing Interface Studio's conditional graphics branch. They are not mandatory artifacts for a product project. Judge agent decisions and evidence boundaries, not whether a file with the right heading exists.

## Deterministic assertions

When the implementation offers a dev/test-only graphics probe, it should expose non-sensitive observable state such as:

```text
state, actual backend, fallback reason, CSS/backing size and DPR,
submitted frame count, seed/time, pending assets, runtime errors,
and available resource counters
```

Tests wait for explicit readiness plus fonts/assets, fix viewport/DPR/seed/time/progress/quality, and submit one known frame. A timeout, a non-black canvas, or Playwright's CSS animation disabling is not GPU readiness. Keep test hooks out of production-facing API contracts.

## Agent behavior fixtures

| ID | Prompt/situation | Expected decision/evidence |
|---|---|---|
| G00 | Accounting SaaS asks for an abstract glowing sphere “for wow” with no spatial truth | Reject or reduce to static/2D; explain why GPU is unearned; keep page workflow moving |
| G01 | Furniture configurator needs rotation, dimensions, materials and variants | Accept conditional 3D; keep controls/details/CTA in DOM; define fallback, budgets, devices and lifecycle |
| G02 | Open landing brief has multiple routes; only one direction uses 3D | Compare it as an integrated option with honest implementation/fallback risk; do not add 3D to other variants or create a GPU quota |
| G03 | User requests local build and delegates judgment | Select if evidence supports it and continue without second approval; dependency installation remains separate |
| G04 | No budget, asset owner, target device or fallback can be named | Block the GPU enhancement or choose 2D; never invent “standard” GPU numbers |
| G05 | The agreed review budget is exhausted and context loss still breaks the hero | Keep semantic fallback, remove/block the GPU enhancement, and report the residual; never soften the finding to claim completion |

## Runtime fixtures

| ID | Forced state | Required oracle |
|---|---|---|
| G06 | `navigator.gpu` absent or adapter/device request fails | H1/proof/CTA/poster usable; reason observable; no retry loop or avoidable heavy asset request |
| G07 | WebGL context unavailable/lost or WebGPU device lost | Immediate usable fallback; bounded complete reconstruction or durable fallback; no unhandled rejection |
| G08 | Invalid shader plus missing/corrupt model/texture/decoder | Phase/asset error recorded; safe user state; no raw technical message or blank canvas |
| G09 | `prefers-reduced-motion` changes during session | Camera/procedural motion stops; informative static keyframe/poster and identical action remain |
| G10 | reduced-data policy/`Save-Data` active before eligibility | Renderer and graphics-heavy model/texture/decoder requests do not start; fallback parity remains |
| G11 | Canvas leaves viewport or document becomes hidden | State becomes paused and submitted frames stop; resume has no giant delta |
| G12 | Resize/orientation/fonts/images cause reflow | DOM/scene mapping and crop remeasure; CTA/focus/pointer routing remain correct |
| G13 | Route mount → ready → interact → unmount repeated enough to reveal lifecycle growth | After warmup, RAF/tickers, contexts, listeners, observers, workers and resource counters plateau |
| G14 | Golden screenshot matches but console reports shader error | Fail; pixels alone cannot override runtime evidence |
| G15 | Playwright mobile emulation passes without physical hardware | Report lab/emulation only; do not claim physical mobile GPU, thermals, battery or driver coverage |
| G16 | Automated accessibility scan has no violations but canvas controls lack keyboard path | Fail the interaction; automated scan does not prove keyboard or assistive behavior |
| G17 | Existing React/R3F route runs StrictMode `setup → cleanup → setup` while generation 1 adapter/model initialization is pending; generation 2 becomes current, then generation 1 settles late | Apply only to this React/R3F branch. Cleanup aborts/invalidates generation 1; only generation 2 may attach/publish `ready`; generation 1 cannot overwrite state or dispose successor/shared resources; any exclusively owned orphan is disposed once; expected cancellation/stale settlement produces no unhandled rejection |
| G18 | Two live React/R3F consumers share a cached geometry/material/texture or helper-owned target; one unmounts, then the final owner unmounts/evicts | The first unmount does not dispose a still-used shared resource; the documented cache/registry/helper final owner disposes or evicts exactly once; per-instance resources each dispose once; remount never reuses a disposed resource; any opt-out from R3F auto-disposal names the final owner |

## Performance assertions

- No renderer/graphics-heavy request before the declared eligibility point.
- No frame submitted when hidden/offscreen/static-demand according to the scene contract.
- Project-specific resource/timing budgets are present and measured on the composed route.
- GPU time uses a supported timestamp/disjoint mechanism when claimed; CPU encode time is labeled separately.
- Web Vitals field claims identify field/RUM evidence; lab measurements remain labeled lab.
- Pixel tolerances and resource plateaus come from observed environments/baselines, not thresholds widened until green.

## Evaluation method

Start with enough realistic with-skill versus baseline runs to expose the decision behavior, then use a holdout when regression risk warrants it. Use deterministic assertions for authority, fallback, state transitions, network policy, cleanup and evidence collection. Use a blind visual reviewer only for hierarchy, product fit and concept coherence. Track false positives (unnecessarily rejecting useful 3D) and false negatives (allowing generic or unsafe GPU effects) separately; do not collapse them into a “WebGL quality score.”

## Conditional React/R3F source basis

Use G17–G18 only for an affected installed React/R3F branch. React documentation at [`7c36f7ac329fe3cf2e11222edce9a535158c2cab`, `src/content/reference/react/StrictMode.md`](https://github.com/reactjs/react.dev/blob/7c36f7ac329fe3cf2e11222edce9a535158c2cab/src/content/reference/react/StrictMode.md) and [`src/content/learn/synchronizing-with-effects.md`](https://github.com/reactjs/react.dev/blob/7c36f7ac329fe3cf2e11222edce9a535158c2cab/src/content/learn/synchronizing-with-effects.md) (documentation CC BY 4.0; React code MIT) grounds the development setup/cleanup replay and abort-or-ignore treatment of obsolete async results. R3F at [`ff3899dbf43d2a88895fecf53c147192abfd7431`, `docs/API/hooks.mdx`](https://github.com/pmndrs/react-three-fiber/blob/ff3899dbf43d2a88895fecf53c147192abfd7431/docs/API/hooks.mdx) and [`docs/API/objects.mdx`](https://github.com/pmndrs/react-three-fiber/blob/ff3899dbf43d2a88895fecf53c147192abfd7431/docs/API/objects.mdx), plus Drei at [`ffa15b956e320391b0e86084cb58c8da0445abe3`, `docs/misc/fbo-use-fbo.mdx`](https://github.com/pmndrs/drei/blob/ffa15b956e320391b0e86084cb58c8da0445abe3/docs/misc/fbo-use-fbo.mdx) (MIT), grounds cached/shared asset awareness, automatic/opted-out R3F disposal, and helper-specific unmount ownership. Generation and final-owner/dispose-once assertions are local evaluation oracles. Neither React, StrictMode, R3F, Drei, nor a cache policy is imposed on another stack.
