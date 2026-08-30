# Motion contract (optional template)

> Adapt this template to the affected motion. Keep the contract inline or in an existing brief unless it is a requested deliverable, must survive a handoff or later run, or project policy requires a persistent artifact. Omit inapplicable sections rather than filling a universal matrix.

## Scope and mode

- Mode: `TARGETED_AUDIT` / `BOUNDED_CHANGE` / `MATERIAL_NEW_MOTION`
- Requested surface and transitions:
- Exclusions:
- Mutation authority: audit-only / local correction authorized / scoped system change authorized
- Governing motion source, tokens, primitives, and implementation path:
- Existing static, keyboard, and focus behavior:
- Claim this contract must support:

## Affected interaction contracts

### Interaction name or source locator

- Component and semantic state:
- Intent: causality / feedback / orientation / continuity / progression / hierarchy
- User information need and causal relationship:
- Trigger and eligibility:
- Before state:
- After state:
- Animated element and owner:
- Properties:
- Timing/easing token or justified local value:
- Entrance/update/exit:
- Interruption/reversal/replacement/cancellation:
- Authoritative semantic state and active animation owner/generation:
- Stale finish promise/event/callback rejection:
- Repeated or obsolete input/state:
- Focus/keyboard/pointer/touch/gesture:
- Authoritative data/action completion versus visual completion:
- Affected slow/failure/retry behavior:
- Reduced-motion equivalent and mid-flight preference-change behavior:
- Reduced-data equivalent or not applicable because:
- Skipped transition / inactive scroll-or-view timeline reconciliation, if applicable:
- Hidden/offscreen behavior when continuous work applies:
- Cleanup owner and conditions:
- Acceptance evidence and claim limit:

## Conditional shared motion system

Use only for `MATERIAL_NEW_MOTION` fields that several affected consumers need.

- Representative consumers and semantic classes:
- Inherited versus new rules:
- Shared tokens/primitives and canonical source:
- Timeline/state/resource ownership:
- Compatibility or migration boundary:
- Local exceptions kept local:
- Adoption/removal condition:
- Representative uses that need verification:

## Conditional scroll-linked real-time scene

Use only when a product-justified GPU scene is active.

- Renderer/backend and repository-pinned versions:
- Product beat and intent:
- Semantic DOM proof/action and remove-canvas result:
- Native document scroll or contained-scroller authority:
- DOM range/beat to scene/camera mapping:
- Timeline/render-clock owner and frame-loop policy:
- Pointer/focus/keyboard/touch/anchor routing:
- Layout remeasurement and responsive framing where behavior differs:
- Reduced-motion static keyframe/poster/equivalent:
- Reduced-data loading/renderer behavior:
- Hidden/offscreen/static pause and resume:
- Loading, asset, shader, and generic fallback states:
- WebGL context loss or WebGPU device loss, only for the active backend:
- Navigation/unmount disposal and owned resources:
- Deterministic evidence controls needed for affected states:
- Performance/resource evidence and environment limits:

## Prototype findings, if needed

- Risk or decision the prototype isolates:
- Prototype path or temporary location:
- Affected variants/conditions exercised:
- Failure modes found:
- Decision carried into production:
- Retention/deletion decision:

## Affected browser and source evidence

Record each result narrowly: a validator or other tool result proves only the check it exercised, not motion quality, accessibility, lifecycle cleanup, or broader runtime behavior.

- Transition and semantic before/after state:
- Interruption/reversal/replacement/cancellation/exit/repeated input where applicable:
- Stale finish callback rejected after replacement/cancellation:
- Keyboard/focus/pointer/touch/gesture where applicable:
- Responsive or reflow contrasts where behavior differs:
- Reduced-motion/data equivalent, including mid-flight preference toggle when applicable:
- Skipped transition or inactive scroll/view timeline non-event path, when applicable:
- Slow/failing data and authoritative completion where applicable:
- Hidden/offscreen pause, resume, and cleanup where applicable:
- Conditional GPU fallback and context/device loss:
- Console/runtime and proportionate performance/resource evidence:
- Repository-native parser/lint/build/test/validator result:
- What screenshots, recordings, and tool results do **not** prove:
- Skipped/unavailable material checks and resulting claim limit:

## Removed motion and residuals

- Candidate removed or simplified:
- Information benefit retained:
- Reason:
- Residual risk or follow-up:
- Stop condition: acceptance met / diminishing value / material blocker / agreed budget
