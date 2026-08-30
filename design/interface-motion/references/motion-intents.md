# Motion intents and implementation rules

Use this reference as a conditional menu for the affected motion, not as a universal checklist. Select depth from the active mode and the behavior being claimed.

## Mode adaptation

- **`TARGETED_AUDIT`** — inspect the named rendered transition and its owning source, compare animated and immediate states, localize evidence, and propose the smallest correction. Keep source read-only unless correction is authorized; no durable artifact is required by default.
- **`BOUNDED_CHANGE`** — inherit the current primitive/token language, edit the smallest coherent owner and dependent states, and verify only behavior the change can affect. Keep one-off values local unless reuse already exists.
- **`MATERIAL_NEW_MOTION`** — inspect representative consumers, semantic classes, ownership, lifecycle, and compatibility before changing a shared primitive or timeline. Persist a contract only when it is the requested deliverable, must support a handoff/re-entry, or the project requires one.

Mode does not set a fixed interaction count, viewport matrix, prototype depth, or review cycle. Evidence expands only when the affected claim can differ.

## Intent taxonomy

| Intent | Useful pattern | Failure signal |
|---|---|---|
| Causality | Origin-aware reveal from the initiating control | Motion points somewhere unrelated to the trigger |
| Feedback | Immediate press, validation, save, or selection response | Feedback waits for a decorative timeline |
| Orientation | Drawer, nested level, reordering, or route continuity | Large travel without spatial meaning |
| Continuity | Shared identity through layout or state change | Elements teleport or duplicate ambiguously |
| Progression | Step, upload, processing, or bounded sequence | Fake progress or endless looping presented as completion |
| Hierarchy | Briefly emphasize newly changed relevant content | Permanent pulsing or competing ambient motion |

Write the semantic before and after state before choosing movement. More than one compatible intent may apply, but every retained effect needs an observable information job. When none applies, prefer the immediate transition.

## Timing posture

Choose timing by semantic class, perceived distance, input urgency, and current system behavior rather than a universal number:

- direct input feedback is usually the shortest class;
- local presence or state change should remain concise;
- spatial relocation or overlay movement may take enough time to preserve orientation;
- a multi-step sequence should remain bounded and must not delay available actions;
- exit should not linger unless continuity genuinely requires it.

Test the actual affected component and environment. A timing value copied from a gallery is a hypothesis until observed in context. Store a reusable value in the governing project tokens only when shared use justifies it; a bounded local exception can remain local and named.

## Easing posture

- Entrance and spatial settling may decelerate.
- Exit should communicate departure without lingering.
- Direct manipulation should track the pointer or finger rather than ease behind it.
- Spring behavior needs bounded overshoot, interruption behavior, and deterministic rest.
- Opacity-only changes need less dramatic easing than spatial movement.

## Presence and overlays

Define the initiating control, semantic before/after state, initial focus, containment, Escape or outside dismissal, focus return, scroll behavior, viewport collision, nested overlay behavior, and unmount ownership that apply. Keep DOM presence for an exit only when it does not delay state, focus, or accessibility updates. An interrupted exit must reconcile to the current semantic state rather than leave an invisible interactive layer.

## Replacement, cancellation, and finish-path independence

Treat the semantic component/data state as authoritative and each animation as a disposable projection of that state. For an affected interruption-sensitive transition:

- give the active animation/timeline an owner and monotonically changing generation or equivalent identity;
- when input, state, preference, route, or presence replaces/cancels it, reconcile the authoritative state and invalidate that generation before starting its successor;
- in every finish promise/event/callback, verify that the captured generation is still current and the owner is live before changing DOM presence, ARIA state, focus, cleanup status, or visual state;
- make cancellation and cleanup idempotent, and treat expected cancellation rejection as control flow rather than an unhandled error;
- do not wait for `animationend` or `transitionend`: a transition may be skipped, canceled, or replaced, and a scroll/view timeline can be inactive. The component must already have a correct semantic state and an explicit immediate reconciliation path.

When a reduced-motion preference changes while risky motion is running, invalidate/cancel the current generation, preserve the current semantic/data state, and apply the safe immediate or non-spatial equivalent. Focus, input acknowledgement, task completion, and cleanup must not wait for the old finish callback.

Decision-changing probes, only when the implementation has these paths:

| Forced condition | Required oracle |
|---|---|
| Transition A is replaced by B, then A's finish handler runs late | A cannot commit presence, ARIA/focus, data, or cleanup state; B/current semantic state remains authoritative |
| Active spatial motion receives a reduced-motion change | Risky motion stops/reconciles without losing task feedback, focus, or current state; the stale motion cannot finish later |
| CSS transition is skipped or a referenced scroll/view timeline is inactive | State and cleanup still complete through the explicit non-event path; no hidden interactive layer, pending flag, or stranded promise remains |

## Lists and layout

Use stable identity. Distinguish insert, remove, reorder, filter, refresh, and data replacement when those states are affected. Preserve scroll, selection, and focus context. Avoid animating a broad collection merely to signal one change. Under reduced motion, update immediately and retain a non-spatial changed-state cue where the distinction matters.

## Async actions and data truth

Input acknowledgment, request pending, server acceptance, durable completion/readback, and visual celebration are different states. Never let a checkmark, progress fill, or confetti imply durable success before authoritative evidence. Handle applicable cancellation, duplicate prevention, partial failure, retry, and obsolete responses outside the decorative timeline. Pausing visual work while hidden or offscreen must not pause authoritative task progress.

## Gestures

Specify only the gesture rules the affected interaction needs: axis or free movement, threshold, velocity, bounds, cancellation, snap target, keyboard alternative, touch-action behavior, and screen-reader equivalent. Direct manipulation follows input; release may settle with a bounded transition. Interruption and reversal return to a valid semantic state. Never make drag the only way to complete a critical task.

## Reduced-motion and reduced-data behavior

Preserve the same task, semantic state, and feedback with immediate change, short non-spatial opacity, color or border emphasis, static position, text, or another safe cue. Remove large translation, parallax, zoom, rotation, shake, auto-pan, camera travel, and nonessential procedural or repeated movement. If the preference changes during active motion, invalidate the old generation and reconcile immediately to the safe representation of current state. Logic, focus, and cleanup must not depend on animation events.

When reduced-data preference or a project data-saving mode applies, skip nonessential motion assets, heavy media, and renderer initialization. Keep required content and actions in semantic DOM and use a lightweight poster or equivalent state cue. Do not start a download and merely hide its animation, and do not treat reduced data as permission to fabricate progress or omit necessary state information.

## Lifecycle, pause, and cleanup

Name the owner of each timeline, listener, observer, timer, animation handle, RAF, and renderer resource affected by the change.

- Cancel, reverse, or reconcile obsolete visual work when semantic state changes.
- Pause nonessential continuous motion and actual frame submission when the document is hidden or the effect is outside its intended intersection range; do not merely freeze a time uniform while continuing to render.
- Resume from current semantic state and clamp or reset elapsed time so suspension does not create a jump.
- Clean up owned work on cancellation, replacement, unmount, route change, and renderer disposal.
- Preserve underlying data/action progress even when its visualization is paused.

Apply resource and loss handling to the active backend only. Ordinary CSS/DOM motion does not need GPU machinery. A WebGL renderer should respond to relevant context loss/restoration; a WebGPU renderer should respond to device loss. Use bounded recovery when safe, otherwise reveal the semantic DOM/poster fallback and release obsolete owners rather than retrying forever.

## Conditional scroll-linked real-time graphics

Use only when the selected scene expresses progression, orientation, continuity, hierarchy, or another named product beat. The page remains a semantic document, not a wheel-driven movie.

Contract:

- **Authority:** use native document scroll by default or a deliberately contained scroller; keep progress and render ownership unambiguous and avoid competing clocks.
- **Mapping:** map DOM beat/proof/action through a measured document range and normalized target to camera/scene state and its static/reduced equivalent.
- **Frame model:** mutate fast scene values inside the owned render tick; avoid framework state setters and per-frame allocations. Demand/invalidate when static and clamp large deltas after hidden or suspended time.
- **Navigation:** preserve PageUp, PageDown, Space, Home, End, anchors, keyboard/touch scroll, pointer pass-through, and focus. Do not make wheel events the only authority or trap the user in indefinite pinning.
- **Layout:** remeasure affected proxies after font/image/layout changes, resize, and orientation where mapping can change. Define framing/crop behavior only for responsive conditions that materially differ.
- **Eligibility:** submit frames only while the page is visible, the scene is within its intended range, motion/data preferences permit it, and the runtime is not disposed.
- **Failure and exit:** loading, asset/shader error, backend-applicable context/device loss, route change, and unmount move to usable semantic DOM/poster state and release the correct owners.
- **Evidence:** expose deterministic progress/time/seed/quality controls only where needed to inspect decision-relevant states; verify applicable responsive, reduced, pause/resume, fallback/loss, and remount conditions without manufacturing a fixed capture set.

A generic orbit, particle field, parallax layer, or shader drift without a named information function is decorative background work and remains outside this skill.

## Source basis for cancellation, timelines, and preference changes

These rules paraphrase pinned CSSWG specifications at `0dba269181941a3e5db62118dbf50695fdaff455` (W3C Software and Document License): [`web-animations-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/web-animations-1/Overview.bs) for animation cancellation, replacement, and finish-promise behavior; [`css-transitions-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/css-transitions-1/Overview.bs) for transition start/cancel/end conditions; [`scroll-animations-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/scroll-animations-1/Overview.bs) for inactive scroll and view timelines; and [`mediaqueries-5/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/mediaqueries-5/Overview.bs) for reduced-motion preference and re-evaluation when the user environment changes. The local generation/ownership probes are implementation-neutral safety checks; no specification algorithm or source wording is copied.

## Evidence selection and claim limits

Choose from the following only when it can affect the requested transition or claim:

- activation and semantic before/after state;
- update, interruption, reversal, replacement/cancellation, stale finish callback, exit, or repeated input;
- keyboard, focus, pointer, touch, gesture, and announcements;
- reduced motion including an in-flight preference change, reduced data, and slow/failing data;
- skipped CSS transition or inactive scroll/view timeline when finish-path independence is material;
- responsive reflow or scene framing;
- hidden/offscreen pause, resume, cancellation, navigation, remount, and cleanup;
- active-backend fallback or context/device loss;
- console/runtime output and proportionate layout, paint, interaction, frame, or resource evidence.

Recheck evidence invalidated by the last relevant mutation and stop on acceptance, diminishing value, a material blocker, or the agreed budget. There is no universal repeat count, viewport set, or correction cycle.

A screenshot or recording proves captured appearance only. A parser, validator, build, lint, test, automation, or performance result proves only what that tool exercised; it does not by itself prove causal value, feel, accessibility, authoritative completion, cleanup, physical-device behavior, deployment, or publication.

## Replacement and inactive-timeline evals

- Rapid `A → B → A`: the newest semantic state owns the result; late finish callbacks from A or B cannot overwrite it.
- The animation owner is removed mid-flight: cleanup completes without relying on a finish event and no invisible interactive layer remains.
- Reduced motion is enabled mid-flight: risky spatial motion reconciles immediately to the current safe state while focus and action remain usable.
- A scroll source becomes inactive or a view transition is skipped/rejected: apply the immediate authoritative state and release obsolete work instead of waiting forever.

These cancellation, replacement, inactive-timeline, and skipped-transition mechanisms are grounded in the W3C CSSWG drafts at revision [`0dba269181941a3e5db62118dbf50695fdaff455`](https://github.com/w3c/csswg-drafts/tree/0dba269181941a3e5db62118dbf50695fdaff455): [`web-animations-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/web-animations-1/Overview.bs), [`scroll-animations-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/scroll-animations-1/Overview.bs), and [`css-view-transitions-1/Overview.bs`](https://github.com/w3c/csswg-drafts/blob/0dba269181941a3e5db62118dbf50695fdaff455/css-view-transitions-1/Overview.bs), under the W3C Software and Document License. The skill remains API- and renderer-neutral and does not make any of these mechanisms mandatory.
