---
name: interface-motion
description: "Use when designing, prototyping, implementing, or auditing motion and micro-interactions for approved web UI states. Requires every animation to serve causality, feedback, orientation, continuity, progression, or hierarchy; defines trigger, properties, timing, easing, interruption, exit, and reduced-motion behavior; and verifies interaction in the real browser without decorative motion creep."
license: Apache-2.0
compatibility: Works with CSS, Web Animations, Motion/Framer Motion, or repository-native animation tools. Browser verification requires an available interactive browser.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: motion, micro-interactions, animation, reduced-motion, interaction-design, browser-testing
---

# Interface Motion

## Overview

Use motion as state communication. The static hierarchy, content, component states, focus behavior, and design-system tokens come first; animation then clarifies cause, feedback, location, continuity, progress, or temporary priority. No component earns motion merely because a recipe exists.

<HARD-GATE>
Do not add motion before the relevant static state and keyboard behavior work. Do not animate an unsupported product claim, hide latency, postpone an available action, trap focus, cause vestibular risk, or ignore `prefers-reduced-motion`. Dependency installation and product-wide motion changes require explicit scope and authorization.
</HARD-GATE>

## When to use

- Add or refine transitions, feedback, overlays, list changes, navigation, progress, selection, drag/gesture, or state micro-interactions.
- Prototype an interaction before integrating it into an approved component.
- Audit motion that feels generic, excessive, sluggish, inconsistent, or inaccessible.
- Define motion tokens and reduced-motion behavior for a design system.

Do not use for static art direction, video/marketing animation, decorative background effects, or as a substitute for loading and error-state design.

## Workflow

### 1. Trace the state transition

Inspect the approved `DESIGN.md`, `COMPONENTS.md`, `tokens.json`, optional `PROJECT-UI.md`, trigger element, before/after state, DOM ownership, focus behavior, data/action lifecycle, and existing motion conventions. Reproduce the transition without animation first.

Classify the intent:

- `causality` — connect action to result;
- `feedback` — acknowledge input or state change;
- `orientation` — show where content entered, moved, or will return;
- `continuity` — preserve identity across state/layout change;
- `progression` — communicate bounded progress or sequence;
- `hierarchy` — briefly prioritize new or changed information.

If no intent applies, keep the state change immediate.

**Complete when:** trigger, previous state, next state, user information need, focus destination, and one intent are explicit.

### 2. Write the motion contract

Copy [the motion template](templates/motion.md) to `.design-flow/artifacts/MOTION.md` when motion is material. For each interaction define:

- trigger and eligibility;
- animated element and semantic state;
- properties and ownership;
- duration token and easing token;
- entrance, update, and exit;
- interruption/reversal and repeated-input behavior;
- focus, pointer, touch, and keyboard behavior;
- data completion versus visual completion;
- reduced-motion equivalent;
- acceptance evidence.

Load [motion intents and implementation rules](references/motion-intents.md) for overlays, layout changes, lists, async actions, gestures, and performance.

**Complete when:** another engineer can implement and test the interaction without inventing behavior.

### 3. Prototype the risky behavior in isolation

For spatial, gestural, interruption-sensitive, or novel interactions, create an isolated prototype under `.design-flow/`. Use the existing stack and representative component/content. Avoid production routes and avoid polishing surrounding UI.

Exercise:

- rapid repeat input;
- reversal before completion;
- resize during animation;
- keyboard and focus transition;
- touch/drag cancellation where relevant;
- reduced motion;
- slow data completion and failure.

Delete or retain the prototype according to repository policy after learning is captured. Do not treat prototype code as production-ready by default.

**Complete when:** the behavior's state model and failure modes are understood before integration.

### 4. Implement through approved tokens and primitives

Use repository-native animation tools already present. Prefer CSS for simple state transitions and a library only when sequencing, presence, gestures, or layout continuity justify it. Do not install an animation dependency without explicit authorization.

Performance posture:

- prefer compositor-friendly `transform` and `opacity`;
- animate layout only when spatial continuity requires it and measurement proves acceptable;
- avoid animating broad DOM trees or expensive filters;
- keep input response immediate even when visual completion continues;
- separate data lifecycle from decorative timeline;
- stop or reconcile obsolete animations after state changes.

Use motion tokens; do not scatter arbitrary durations and easings through components.

**Complete when:** implementation matches the contract, respects component ownership, and introduces no undocumented token or dependency.

### 5. Implement reduced motion as an equivalent

Reduced motion is not always “disable all CSS.” Preserve the state information through immediate changes, short opacity changes, static emphasis, progress text, or another non-spatial cue. Remove parallax, large travel, zoom, rotation, shaking, and nonessential repeated movement.

Do not leave focus on an unmounted trigger or make completion dependent on `animationend` when animation may be absent.

**Complete when:** the same task, state, and feedback remain understandable with motion reduction enabled.

### 6. Verify feel and behavior in the real browser

Test at representative narrow and wide viewports with normal and reduced motion. Inspect:

- first and repeated activation;
- mid-flight interruption and reversal;
- focus order/return and accessible announcements;
- pointer, keyboard, and touch paths as applicable;
- slow CPU/network where data participates;
- console errors and obsolete async work;
- layout shift, dropped frames, interaction delay, and paint cost proportionately;
- consistency with neighboring motion and approved tokens.

A screen recording proves appearance, not focus, state ownership, data completion, or reduced-motion semantics. Pair visual evidence with DOM/accessibility and behavior checks.

**Complete when:** motion communicates the named intent under normal, rapid, interrupted, failure, and reduced-motion conditions without delaying the user's task.

### 7. Remove motion that does not earn its cost

Compare the animated and immediate versions. Remove or simplify motion when it:

- communicates no new state or spatial relationship;
- repeats on routine actions without value;
- makes the interface feel slower;
- competes with primary content;
- exists to imitate a reference;
- requires complexity disproportionate to the task.

**Complete when:** every retained animation has a named intent and observable benefit.

## Output contract

```text
Interface motion: IMPLEMENTED | VERIFIED | PARTIAL | REMOVED | BLOCKED
Interaction: <component/state transition>
Intent: causality | feedback | orientation | continuity | progression | hierarchy

Contract
- Trigger/before/after: <states>
- Properties/tokens: <values>
- Interruption/exit: <behavior>
- Focus/input/data: <behavior>
- Reduced motion: <equivalent>

Evidence
- Isolated prototype: <path/result or not needed>
- Browser normal/repeated/interrupted: <result>
- Keyboard/touch/focus: <result>
- Reduced motion: <result>
- Performance/console: <result>

Gaps
- <unavailable device, browser, gesture, or measurement>
```

## Common pitfalls

- Animating because a component gallery provides a recipe.
- Adding motion before static state, hierarchy, and focus work.
- Using one duration/easing for every semantic class.
- Making an interface wait for animation before accepting input.
- Tying authoritative success to visual completion.
- Ignoring repeated clicks, reversal, unmount, resize, or failed data.
- Replacing reduced motion with no feedback at all.
- Installing a motion library for one opacity transition.
- Polishing a prototype and silently shipping its state shortcuts.
- Treating smooth video capture as accessibility or performance evidence.

## Verification checklist

- [ ] Approved design-system, component, state, focus, and repository conventions were inspected.
- [ ] Every animation has exactly named information intent and before/after states.
- [ ] Trigger, properties, tokens, entrance/update/exit, interruption, and repeated-input behavior are explicit.
- [ ] Risky spatial/gesture behavior was prototyped in isolation before integration.
- [ ] Existing tools were preferred and no dependency was installed implicitly.
- [ ] Motion does not hide latency, block input, or outrun authoritative state.
- [ ] Keyboard, focus, pointer, touch, resize, and failure behavior were exercised where applicable.
- [ ] Reduced-motion users receive equivalent state and feedback without risky movement.
- [ ] Normal, rapid, interrupted, narrow, wide, and reduced-motion paths ran in a real browser.
- [ ] Console, layout shift, frames/paint, and interaction cost were checked proportionately.
- [ ] Motion without observable benefit was removed.
