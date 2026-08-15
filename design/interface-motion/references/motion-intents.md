# Motion intents and implementation rules

## Intent taxonomy

| Intent | Useful pattern | Failure signal |
|---|---|---|
| Causality | Origin-aware reveal from the initiating control | Motion points somewhere unrelated to the trigger |
| Feedback | Immediate press, validation, save, or selection response | Feedback waits for a decorative timeline |
| Orientation | Drawer, nested level, reordering, or route continuity | Large travel without spatial meaning |
| Continuity | Shared identity through layout/state changes | Elements teleport or duplicate ambiguously |
| Progression | Step, upload, processing, or bounded sequence | Fake progress or endless looping presented as completion |
| Hierarchy | Briefly emphasize newly changed relevant content | Permanent pulsing or competing ambient motion |

## Timing posture

Choose tokens by semantic class and perceived distance, not one universal number:

- direct input feedback: shortest;
- local presence/state change: short;
- spatial relocation or overlay: long enough to preserve orientation;
- multi-step sequence: each step concise, total duration bounded;
- exit: usually no slower than entrance unless context requires continuity.

Test the actual component size and device. A timing value copied from a gallery is a hypothesis until observed in context.

## Easing posture

- entrance and spatial settling may decelerate;
- exit should communicate departure without lingering;
- direct manipulation should track the pointer/finger rather than ease behind it;
- spring behavior needs bounded overshoot and deterministic rest;
- opacity-only changes need less dramatic easing than spatial movement.

Store approved values as design-system tokens.

## Presence and overlays

Define trigger relationship, initial focus, containment, escape/outside dismissal, focus return, scroll behavior, viewport collision, and nested overlay behavior before animation. Keep the DOM present long enough for a meaningful exit only when that does not delay state or accessibility updates.

## Lists and layout

Use stable identity. Distinguish insert, remove, reorder, filter, and refresh. Do not animate every row during large updates. Preserve scroll/selection context. For reduced motion, update immediately and retain a non-spatial changed-state cue where needed.

## Async actions

Input acknowledgment, request pending, server acceptance, durable completion, and visual celebration are different states. Never let a checkmark or confetti imply durable success before readback. Handle cancellation, duplicate prevention, partial failure, and retry outside the animation timeline.

## Gestures

Specify axis lock, threshold, velocity, bounds, cancellation, snap target, keyboard alternative, touch-action behavior, and screen-reader equivalent. Direct manipulation follows input; release may settle with a bounded transition. Never make drag the only way to complete a critical task.

## Reduced motion

Prefer immediate state, short opacity, color/border emphasis, static position change, or textual progress. Remove large translation, parallax, zoom, rotation, shake, auto-pan, and repeated ambient movement. Ensure logic does not require animation events to complete.

## Evidence

A complete check observes:

- normal activation;
- rapid repeat activation;
- interruption/reversal;
- entry and exit;
- keyboard/focus;
- touch/gesture when applicable;
- normal and reduced motion;
- slow/failing data when applicable;
- console plus proportionate performance evidence.
