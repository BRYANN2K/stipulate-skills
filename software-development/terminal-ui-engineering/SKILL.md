---
name: terminal-ui-engineering
description: "Use when building or changing a full-screen interactive terminal application with screens, focus, keybindings, asynchronous work, resize behavior, and terminal lifecycle ownership. Inherits the selected framework's architecture, keeps restoration strict, and applies cancellation, confirmation, contract lint, snapshots, virtual terminals, and PTY evidence only when the behavior or claim needs them."
license: Apache-2.0
compatibility: Works with Bubble Tea, Textual, Ratatui, curses, Ink, and other terminal UI stacks. The bundled JSON template and validator are optional structural lint; the validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: tui, terminal, interactive, accessibility, pty, testing
---

# Terminal UI Engineering

## Overview

Build full-screen terminal interfaces through the repository's chosen framework and conventions. Protect the observable terminal lifecycle while leaving state, message, command, widget, component, and task architecture to the selected stack. Bubble Tea, Textual, and Ratatui mechanisms apply only when that is the actual project stack; do not translate one framework into another's taxonomy.

A clear request to change a bounded local screen or interaction authorizes the necessary local source writes. It does not require a TUI manifest, model/update/view rewrite, confirmation screen, cancellation path, every test layer, or separate implementation approval.

<HARD-GATE>
A full-screen program that changes raw/cooked mode, echo, cursor visibility, mouse/paste modes, or the alternate screen must restore what it owns after every supported exit path, including relevant error and signal paths. Never run destructive operations merely to test a keybinding. Real resource mutation, shell/process execution with untrusted input, credential access, dependency installation or changes, packaging/release, publication, and deployment require explicit authorization and safe targets.
</HARD-GATE>

## When to use

- Build or modify a full-screen terminal application, dashboard, wizard, browser, monitor, or interactive client.
- Add screens/widgets, focus, keybindings, async work, streaming, resize, color, Unicode, mouse, or terminal compatibility behavior.
- Fix event-loop blocking, frozen input, flicker, corrupt frames, focus loss, resize defects, stale async updates, or terminal restoration.
- Select proportional state/render/process evidence for a TUI change.

Use `command-line-tool-engineering` for line-oriented commands and filters whose stable boundary is stdout/stderr and exit status rather than an owned terminal frame.

## Task modes

| Mode | Default path | Evidence target |
|---|---|---|
| Bounded edit | Inspect the affected widget/update/render/lifecycle path, edit directly | Focused state/render check; PTY only if the claim reaches the process/terminal boundary |
| New behavior or surface | Define one user operation and build one independently useful screen/interaction slice | Relevant state plus rendered or real-terminal interaction evidence |
| Complex contract or migration | Coordinate several screens, global/local keys, async tasks, destructive actions, or terminal/platform compatibility | Targeted transition/size/platform matrix; optional JSON structural lint |
| Release or live effect | Separate local readiness from real backend mutation, packaging, installation, release, or deployment | Exact authorization plus installed/process/platform evidence actually claimed |

## Workflow

### 1. Inspect framework and terminal ownership

Read applicable instructions, entrypoint, framework lifecycle, state/widget tree, update/event handling, task/effect boundary, keymap, routing/screens, terminal initialization/cleanup, tests, commands, and Git status as needed. Identify which layer owns terminal modes and which exit paths already restore them.

Name the user operation, affected screen/widget, state/event path, terminal features touched, supported environment claims, and existing test harness. Ask only when an unresolved behavior or compatibility choice materially changes the result.

### 2. Inherit the selected stack

Use framework-native architecture:

- Bubble Tea projects may use model/update/view and commands/messages;
- Textual projects may use apps/screens/widgets, reactive state, messages, workers, and pilots;
- Ratatui projects may use the repository's app/event/render organization and backend/test-buffer conventions;
- other stacks keep their own established ownership.

The portable concern is clear ownership of state, input/events, background I/O, rendering, and terminal cleanup—not identical names or a required rewrite.

For complex cross-screen, keybinding, operation, or compatibility work, optionally use `templates/tui-contract.json` as scratch memory and run:

```bash
python3 <skill-directory>/scripts/validate_tui_contract.py check --manifest /tmp/tui-contract.json --json
```

This bundled schema is **optional structural lint** for references inside its own model. Its required IDs, global keys, screen states, confirmation layout, cancellation flags, and verification booleans are a hardened profile, not universal TUI architecture or a quality gate. Use it only when the work maps cleanly; do not modify the application to make it pass. A pass does not prove input, rendering, cleanup, cancellation, confirmation, or platform behavior. Its secret and malformed-input checks harden only that optional file.

Load [the TUI architecture and testing guide](references/tui-architecture-and-testing.md) as a conditional menu for new async work, destructive operations, lifecycle changes, or compatibility claims.

### 3. Implement one operation slice

Prefer one independently useful interaction across event/input → state → task/effect → render/result rather than separate architecture artifacts. Keep blocking network/filesystem/process/stream work outside the UI loop using the framework's normal mechanism. Attach operation identity or otherwise reject stale results when concurrent work can outlive its initiating selection.

Add only applicable behavior:

- cancellation for work that is meaningfully cancellable or whose abandonment must be represented;
- confirmation for destructive, irreversible, costly, or unusually broad actions, bound to the exact target/effect;
- duplicate prevention or idempotency for repeatable action keys when consequence requires it;
- focus restoration/fallback when the changed interaction moves or removes focus;
- progress and failure states when users otherwise cannot understand ongoing work.

Do not manufacture cancel semantics for an atomic local update or a confirmation modal for a harmless action. Never write background output outside a renderer-owned frame.

### 4. Handle terminal constraints that the surface exposes

Keep critical actions usable at the supported narrow/short boundary. Reflow, reduce, scroll, or show an actionable minimum-size state according to local conventions. Preserve focus visibility and discoverability for changed keys. Provide non-color meaning when color conveys state; honor `NO_COLOR` only when the project claims or already supports it. Check Unicode width/ASCII fallback only when those capabilities are part of the output.

If stdin/stdout can be redirected or the executable documents non-TTY behavior, preserve that contract and avoid control sequences in data streams. Do not invent CLI parity or a non-TTY export mode merely because the template contains one.

### 5. Verify from cheapest layer to claimed boundary

Choose the smallest evidence that can falsify the claim:

- transition/state test for event and operation logic;
- widget/render or snapshot test for stable visual states and sizes;
- framework test harness or virtual terminal for focus, composed frames, cursor/clearing, and dimensions;
- PTY/ConPTY for actual startup, input, resize, signal, exit, and terminal-mode behavior;
- installed/package probe only for distribution claims.

These are layers, not a mandatory ladder. A copy/layout change may need a focused render snapshot; async logic may need deterministic state/task tests; a raw-mode, resize, signal, input, or cleanup claim needs the relevant actual terminal boundary. Do not claim Windows from a POSIX PTY or all terminals from one emulator.

Regardless of other layers, changes to terminal ownership or exit handling must directly verify restoration for the affected normal and abnormal paths. Observe cursor, echo/input mode, raw/cooked mode, alternate-screen/mouse/paste state, and child cleanup only as the application owns them.

Use safe fixtures. Test destructive UI flow without executing the real backend unless that mutation is separately authorized.

### 6. Separate release and live effects

Run focused and relevant repository-native checks after the final mutation, inspect snapshots/diff, and distinguish untested platforms from supported ones. Evidence should match the claim, not fill every template slot.

Real backends, shell/process side effects, dependencies, packaging, installation, signing, release, publication, and deployment remain separate. Perform them only with exact authorization, bounded targets, and process/resource readback.

## Output contract

Report these semantics, in any order or adapter-specific presentation:

- outcome, user operation, screen/widget, and framework/terminal boundary;
- changed state/event/task/render/lifecycle paths;
- fresh evidence from the layers actually needed;
- terminal restoration result when applicable;
- untested platforms/terminals and live/distribution effects not performed.

An optional manifest or unused evidence layer need not appear. Never present a snapshot as input, resize, signal, cleanup, or platform proof.

## Common pitfalls

- Rewriting a Textual or Ratatui project into Bubble Tea vocabulary, or vice versa.
- Requiring cancellation, a confirmation screen, or every state for harmless bounded work.
- Running the full state/snapshot/virtual-terminal/PTY ladder regardless of claim.
- Blocking the UI loop or applying stale async results to current selection.
- Writing logs directly while the renderer owns the screen.
- Depending on color or Unicode as the only meaning when fallbacks are claimed.
- Passing snapshots while leaving terminal modes corrupted after real exit.
- Claiming platform compatibility from an untested terminal boundary.

## Verification checklist

- [ ] Task mode, operation, local boundary, selected framework conventions, and terminal ownership are clear.
- [ ] Bounded requested writes proceeded without mandatory artifacts or redundant approval.
- [ ] State/event/task/render architecture follows the matching stack rather than a forced taxonomy.
- [ ] Optional JSON/template use, if any, is described only as structural lint for complex work.
- [ ] Cancellation, confirmation, duplicate handling, focus fallback, and non-TTY behavior exist only when applicable.
- [ ] Blocking work and stale async results cannot corrupt the changed interaction.
- [ ] Relevant focus, keys, size, color, Unicode, and accessibility behavior were checked proportionately.
- [ ] Evidence layers stop at the cheapest layer that supports the claim; terminal-boundary claims have PTY/ConPTY or equivalent evidence.
- [ ] Affected terminal modes and child processes restore after applicable normal/error/signal exits.
- [ ] Real mutations, shell effects, dependencies, packaging, release, publication, and deployment remained separately authorized and verified.
