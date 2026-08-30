# Real-time graphics profile

Real-time graphics are opt-in. The default is ordinary semantic HTML/CSS, with SVG, image, or video when they serve the concept. No option set is required to contain WebGL/WebGPU, and words such as “premium,” “cinematic,” “interactive,” or “Awwwards-like” do not imply a GPU renderer.

Load this reference only when the user explicitly requests real-time graphics or a named product need materially depends on WebGL, WebGPU, Three.js, React Three Fiber, or `vgpu`. It is an integration contract, not another mandatory artifact and not permission to add a dependency. If the admission test fails, return to the normal Interface Studio path and do not load a GPU skill or runtime.

## 1. Prove that real-time rendering earns its cost

Name the product beat that spatial, procedural, or interactive rendering makes clearer. Prefer CSS, SVG, video, or a static image when they communicate the same idea more reliably.

Run the remove-canvas test:

1. Hide the canvas. Product proposition, proof, document order, navigation, form, and CTA must remain understandable and usable in semantic DOM.
2. Name the useful spatial or causal understanding that is lost. If nothing meaningful is lost, the scene is decorative and should be simplified, deferred, or removed. If core content becomes inaccessible, the DOM/fallback contract is incomplete.

A generic orb, particles, liquid gradient, rotating object, star field, or bloom stack is not a concept until it expresses a product mechanism or narrative beat.

## 2. Record a compact scene contract

Keep this in the existing brief/options document or working notes:

| Field | Required decision |
|---|---|
| Narrative role | Product beat, user understanding, and why static media is insufficient |
| Renderer | Existing project renderer, Three/R3F, or `vgpu`; exact installed versions |
| Ownership | Semantic DOM, one canvas/renderer, authoritative scroll source, input routing, assets/resources |
| Beat map | Native scroll range or state → DOM content/proof → camera/scene state → transition |
| Fallbacks | Poster/DOM, reduced motion, GPU unavailable/init failure, asset failure, context/device loss, mobile/touch |
| Budgets | Project/device-specific JS and asset path, texture/geometry size, DPR/quality, frame/main-thread/GPU measures |
| Lifecycle | Ready, resize/reflow, active/pause, failure/recovery, navigation/unmount, dispose |
| Evidence | Claim-matched keyframes/states, fallback/reduced evidence, and deterministic capture inputs |

Do not copy universal FPS, triangle, draw-call, DPR, or bundle budgets from another project. Establish a baseline on representative target devices and declare the acceptable trade-off.

## 3. Preserve DOM and document ownership

- Keep H1, body copy, proof, links, CTA, form controls, consent, status, and accessible names in the document. Mark a purely decorative canvas hidden from assistive technology and remove it from pointer hit-testing.
- If the scene conveys meaningful information, provide an equivalent DOM explanation and controls. Never bake essential text or controls into pixels.
- The document's native scroll is the default authority. Derive normalized scene progress from layout/scroll observation; do not create a nested scroll surface, wheel-only progress, scroll-jacking, or indefinite pinning.
- Use one canvas/renderer for multiple coordinated sections when practical, with scissor/views or DOM proxies. A local canvas is acceptable for a truly isolated beat. Do not create a context per section.
- Define layer order, occlusion, pointer ownership, focus behavior, anchors, and resize/reflow after fonts/images/CLS. The canvas must not block the CTA or keyboard/touch scrolling.

A contained 3D experience may own its own scroll only when that containment is explicit, focusable, escapable, keyboard/touch operable, and not confused with the page scroll.

## 4. Preserve the project and route framework detail outward

Inspect the repository before choosing implementation detail. Preserve its renderer, versions, dependency graph, render loop, asset pipeline, and ownership model unless a change is explicitly authorized. No branch of Interface Studio grants permission to install Three/R3F/Drei, `vgpu`, postprocessing, smooth-scroll, decoder, model, or animation dependencies.

Keep this profile renderer-neutral. When implementation needs framework APIs or performance techniques:

- load the official `vgpu` skill for `vgpu`/WebGPU package APIs and only the references relevant to the current task;
- load the official GSAP core, timeline, ScrollTrigger, and performance skills for the applicable GSAP branch;
- use the repository-pinned Three/R3F documentation or another explicitly available official skill for its installed versions;
- use project-native test/debug hooks rather than inventing a second framework abstraction here.

Regardless of renderer, preserve these integration contracts: semantic DOM and usable poster/fallback, one clear render/timeline/scroll owner, no steady-state allocation or compilation without measured justification, bounded size/DPR/quality, explicit readiness and failure states, hidden/offscreen pause, idempotent cleanup, and context/device-loss handling. Renderer-specific mechanisms belong in the relevant authority, not this skill.

## 5. Make loading and degradation honest

The first useful DOM and CTA must not wait for the GPU. Use a stable poster/CSS/HTML state before `ready`, and retain it when any stage fails.

Cover, as applicable:

- JavaScript unavailable or renderer not loaded;
- `navigator.gpu` or WebGL unavailable;
- adapter/device/context creation rejected;
- optional feature unavailable;
- shader/pipeline compile failure;
- model/texture/HDRI/decoder/CORS failure;
- context or device loss;
- low-power/mobile policy;
- `prefers-reduced-motion`, including changes during the session;
- `save-data` or project-specific quality preference.

Degradation may preserve the same concept through a poster, static keyframe, short crossfade, lower-cost shader/geometry, or reduced quality. Record what is preserved, weakened, or removed. Do not silently replace a product explanation with an unrelated background.

Reduced motion normally fixes the camera/scene on an informative keyframe and removes parallax, zoom, orbit, repeated ambient pulses, and autoplay. It must retain the same content and action.

## 6. Own one timeline and a finite lifecycle

A real-time scene exposes a small lifecycle to the page:

```text
prepare → ready → active/paused → resize/reflow → failure/recovery → dispose
```

- Clamp large deltas after a hidden tab or suspended device.
- Pause or move to demand rendering when the document is hidden, canvas is outside the chosen intersection margin, or nothing changes.
- Remeasure DOM proxies after font/image load, responsive change, orientation, and layout shift.
- Prevent stale async initialization from activating after navigation or unmount.
- On teardown, stop ticker/RAF work and remove observers, listeners, controls, render targets, resources, surfaces/context, and diagnostics according to ownership.
- Repeat mount → interact/scroll → navigate/unmount enough times to distinguish warm-up from growth, then confirm loops, contexts, listeners, and observable resources reach a stable plateau. Use more cycles only when the claim or observed trend requires them.

### Conditional React/R3F StrictMode and shared-resource ownership probe

Use this probe only when the actual route uses React with R3F/Drei, asynchronous renderer/asset initialization or shared GPU resources are affected, and the lifecycle claim can differ. It is not a requirement for DOM-only, non-React, `vgpu`, vanilla Three, or unrelated graphics work.

- In development StrictMode, force `setup → cleanup → setup` while the first setup's asynchronous initialization is still pending. Each setup owns a distinct generation and abort/ignore signal; cleanup invalidates and aborts its generation before releasing exclusively owned work.
- Only the current live generation may publish `ready`, attach controls/listeners/RAF, install a canvas/renderer, or commit scene state. If the old promise settles later, it must be rejected as stale; it may dispose exclusively created orphan resources once, but it must not activate or tear down the successor.
- Classify resources as instance-owned or shared/cache-owned. An instance owner disposes exactly once. A cached loader asset, shared material/geometry/texture, or helper-managed target is not disposed when one consumer leaves unless that consumer is the documented final owner; final cache/registry/helper ownership disposes or evicts once after the last consumer according to the installed version's contract.
- R3F automatic unmount disposal and `dispose={null}` are not interchangeable global policies. Opting out is valid only when an explicit external/cache owner performs the final dispose; otherwise it leaks. Conversely, auto-disposal must not destroy a resource still shared by another live generation/consumer.

Source basis: React documentation at [`7c36f7ac329fe3cf2e11222edce9a535158c2cab`, `src/content/reference/react/StrictMode.md`](https://github.com/reactjs/react.dev/blob/7c36f7ac329fe3cf2e11222edce9a535158c2cab/src/content/reference/react/StrictMode.md) and [`src/content/learn/synchronizing-with-effects.md`](https://github.com/reactjs/react.dev/blob/7c36f7ac329fe3cf2e11222edce9a535158c2cab/src/content/learn/synchronizing-with-effects.md) (documentation CC BY 4.0; React code MIT) for development setup/cleanup replay and abort-or-ignore of stale asynchronous work; R3F at [`ff3899dbf43d2a88895fecf53c147192abfd7431`, `docs/API/hooks.mdx`](https://github.com/pmndrs/react-three-fiber/blob/ff3899dbf43d2a88895fecf53c147192abfd7431/docs/API/hooks.mdx) and [`docs/API/objects.mdx`](https://github.com/pmndrs/react-three-fiber/blob/ff3899dbf43d2a88895fecf53c147192abfd7431/docs/API/objects.mdx), plus Drei at [`ffa15b956e320391b0e86084cb58c8da0445abe3`, `docs/misc/fbo-use-fbo.mdx`](https://github.com/pmndrs/drei/blob/ffa15b956e320391b0e86084cb58c8da0445abe3/docs/misc/fbo-use-fbo.mdx) (MIT) for loader caching and owner-specific unmount disposal. The generation/final-owner oracle is a local synthesis; no framework API or disposal policy is generalized beyond an affected installed React/R3F branch.

## 7. Resolve the decisive risk before expansion

Start with semantic DOM and the usable static fallback, then implement the smallest scene beat that can establish product value. Select further work by the affected claim and failure risk rather than completing a fixed sequence:

- exercise only the viewports or interaction conditions where composition or behavior can materially differ;
- inspect loading, reduced motion/data, renderer failure/loss, pause/resume, and disposal when the implementation or claim can fail there;
- prewarm assets or pipelines and measure the composed route only when startup or performance is part of the risk or acceptance claim;
- capture a selected keyframe, transition midpoint, or other deterministic state only when that state is needed to judge the claim;
- expand only while the beat improves product understanding without damaging the task or conversion path.

Postprocessing, physics, particles, multiple passes, custom controls, and continuous animation are opt-in costs, not quality defaults.

## 8. Deterministic evidence

For each retained GPU capture record the inputs needed to reproduce that claim: route/revision, observable renderer/backend environment, viewport/backing size/DPR, quality, seed/time/progress/pointer as relevant, asset/font readiness, and explicit ready state. Capture only material normal, constrained-layout, reduced, fallback, loading/failure/loss, or resize states; do not fill a universal renderer matrix.

Use exact one-frame/fixed-time submission for deterministic VGPU tests. For WebGL/R3F, freeze the clock/progress and wait for the app's explicit ready signal. Pixel tolerance may be necessary across GPU vendors; a diff shows change, not quality. Pair screenshots with runtime, lifecycle, accessibility, and performance evidence.

When evaluating Interface Studio itself or adding project regression fixtures, use [the real-time graphics evaluation cases](realtime-graphics-evals.md). They test decisions, fallbacks and evidence boundaries rather than Markdown shape.

## 9. Review gates

Block the real-time enhancement when:

- removing the canvas removes essential content or the CTA;
- the fallback is blank, misleading, or not actionable;
- motion reduction leaves risky ambient/camera movement;
- a second scroll/clock fights the document;
- the canvas intercepts focus, pointer, touch, or navigation;
- pipelines/assets compile or allocate in the visible steady-state loop without justification;
- DPR/quality is unbounded or the scene continues hidden/offscreen;
- ownership/disposal/context/device-loss behavior is unknown;
- source assets/models/HDRI/textures/fonts lack usable provenance/licence;
- the result is a generic GPU effect unrelated to the product;
- performance or accessibility is claimed from screenshots alone.

A blocked enhancement does not block the semantic-page work: continue the local build/review with the honest fallback and name the missing GPU evidence separately. Deployment and publication remain separately authorized.
