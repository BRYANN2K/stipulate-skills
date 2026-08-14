---
name: terminal-ui-engineering
description: "Use when building or changing a full-screen interactive terminal application with screens, focus, keybindings, asynchronous work, resize behavior, and terminal lifecycle ownership. Defines screen and operation contracts, separates state/update/view, handles compatibility and cleanup, and requires layered state, snapshot, virtual-terminal, and PTY evidence."
license: Apache-2.0
compatibility: Works with Bubble Tea, Textual, Ratatui, curses, Ink, and other terminal UI stacks. The optional contract validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: tui, terminal, interactive, accessibility, pty, testing
---

# Terminal UI Engineering

## Overview

Build terminal user interfaces as state machines with strict terminal ownership, not as loops that print colored text. Separate model, update, effects, and view; make focus, keybindings, resize, cancellation, compatibility, cleanup, and non-TTY behavior explicit. Framework-specific mechanisms may differ, but the observable contract remains portable.

<HARD-GATE>
Never leave the terminal in raw mode, hide the cursor, or corrupt the alternate screen after exit, error, panic, cancellation, or signal. Never run destructive operations merely to test a keybinding. Real resource mutations, shell execution, credential access, package installation, publication, and deployment require explicit authorization and safe test boundaries.
</HARD-GATE>

## When to use

- Build or modify a full-screen terminal application, dashboard, wizard, file browser, monitor, or interactive client.
- Add screens, modal flows, focus, keybindings, async operations, streaming/log follow, resize behavior, color, Unicode, mouse support, or terminal compatibility.
- Debug flicker, frozen input, blocked event loops, corrupt terminal state, focus loss, resize defects, or inconsistent snapshots.
- Design layered tests for a terminal interface.

Do not use this skill for a line-oriented script, UNIX filter, or command whose stable contract is stdout/stderr and exit codes. Use `command-line-tool-engineering` for those tools.

## Workflow

### 1. Inspect terminal ownership and architecture

Read repository instructions, entrypoint, framework lifecycle, model/state, update/event loop, view/render path, effect/task boundary, keymap, screen routing, terminal initialization/cleanup, tests, and Git status. Identify whether any code blocks the UI thread, writes outside the renderer, owns raw mode twice, or bypasses normal shutdown.

**Complete when:** scope names screens, state owners, events, effects, keybindings, terminal modes, supported environments, and test harness.

### 2. Define the TUI contract

Copy `templates/tui-contract.json` to a temporary path. Record:

- screens, purpose, minimum size, focus order, and states;
- global and screen keybindings with discoverability;
- operations, async/cancellation behavior, confirmation, success, and failure;
- alternate-screen, cleanup, resize, color, Unicode, and non-TTY behavior;
- platform/terminal matrix and layered verification.

Validate read-only:

```bash
python3 <skill-directory>/scripts/validate_tui_contract.py check \
  --manifest /tmp/tui-contract.json \
  --json
```

The validator rejects credential-like assignments after bounded ASCII canonicalization, including repeated-quote serialized assignments, bounded-punctuation Basic/Bearer wrappers, dot- or space-separated credential names, and compact identifiers in any case with environment or version prefixes/suffixes, without reflecting the rejected value. This conservative filter does not prove arbitrary text secret-free.

Malformed manifests, including numeric literals beyond the runtime's bounded integer conversion, fail with a controlled generic JSON diagnostic rather than a traceback.

Load [the TUI architecture and test matrix](references/tui-architecture-and-testing.md) when adding screens, async work, or compatibility branches.

**Complete when:** IDs and scopes are unique, global quit and cancel paths exist, each destructive operation references a distinct confirmation screen whose purpose identifies the operation and whose focus order exposes cancel before confirmation, async operations are cancellable, success/failure states and cleanup/fallbacks are explicit rather than exact deferred placeholders, and all test layers are planned. The bounded placeholder guard rejects standalone values such as `TODO`, `TBD`, `later`, `pending`, `unknown`, and `placeholder` after bounded ASCII canonicalization while preserving actionable prose. This structural check does not prove that runtime confirmation text names the exact resource and effect; state and PTY tests must do that.

### 3. Model events and state transitions

Define events before rendering changes:

- input, resize, timer, data, progress, completion, failure, cancellation, and shutdown;
- active screen/modal, focus target, selection, scroll, viewport dimensions, async operation state, and transient messages;
- transition outputs: new state plus effects, not direct blocking I/O.

Keep update logic deterministic where possible. Effects perform I/O and return events. The renderer reads state and emits frames; it must not become a second state owner.

**Complete when:** every operation has normal, failure, cancellation, and shutdown transitions that tests can drive without a real terminal.

### 4. Implement one screen/operation slice

Write a failing state-transition or public behavior test before implementation. Keep the event loop responsive:

- move network, filesystem, process, and streaming work to the framework's effect/task mechanism;
- attach operation identity so stale completion events cannot update the wrong selection;
- throttle/coalesce high-frequency progress or resize events where required;
- preserve focus and selection through refresh where identity still exists;
- bind confirmation to the exact destructive target and effect;
- keep status and errors visible without writing outside the frame renderer.

**Complete when:** deterministic state tests are GREEN and the event loop contains no blocking work for the new path.

### 5. Design for terminal constraints

Handle narrow and short terminals explicitly. Reflow, reduce nonessential columns, or present a minimum-size message without panic or hidden critical actions. Define focus visibility, tab/shift-tab order where applicable, discoverable key hints, escape/cancel behavior, text alternatives for color, `NO_COLOR`, Unicode width/combining behavior, and ASCII fallback.

When output is redirected or no TTY is available, follow the declared non-TTY behavior. Do not emit control sequences into pipes or files.

### 6. Verify in layers

Use the cheapest relevant layer first, then the actual terminal boundary:

1. **State/update tests** — events produce expected state and effects.
2. **Snapshot/golden tests** — stable frames at representative states and sizes.
3. **Virtual-terminal tests** — cursor movement, clearing, dimensions, and composed frames.
4. **PTY/ConPTY tests** — startup, input, resize, signal, exit, non-TTY, and actual process behavior.
5. **Cleanup tests** — cursor, echo, raw mode, alternate screen, and process children recover after normal exit, error, panic, and signal.

Normalize only nondeterministic values, not layout defects. Exercise minimum and representative sizes, slow async work, cancellation, stale completion, and Unicode/color fallbacks.

**Complete when:** claims about real terminal behavior have PTY/ConPTY evidence after the final mutation.

### 7. Report interface readiness

Run repository-native static, unit, integration, snapshot, virtual-terminal, PTY, and platform checks that apply. Distinguish a platform not tested from one supported by evidence. Inspect the final diff and generated snapshots. Real backends and destructive operations remain outside scope unless separately authorized.

## Output contract

```text
TUI: IMPLEMENTED | VERIFIED | PARTIAL | BLOCKED
Screens / operation: <scope>
Framework and terminal boundary: <observed facts>

Evidence
- Contract: PASS | FAIL
- State transitions: <command/result>
- Snapshots: <sizes/states/result>
- Virtual terminal: <result>
- PTY/ConPTY: <startup/input/resize/signal/exit result>
- Cleanup/non-TTY/fallbacks: <result>
- Platforms: <tested / unavailable>

Gaps / not performed
- <real backend mutations, untested terminals/platforms, packaging, publication, deployment>
```

## Common pitfalls

- Blocking the event loop with network, process, file, or stream work.
- Updating state from background work without an operation identity.
- Writing logs directly while a frame renderer owns the screen.
- Treating one screenshot as resize, input, or cleanup proof.
- Depending on color or Unicode as the only meaning.
- Hiding keybindings or omitting a reliable cancel/quit path.
- Using terminal dimensions without handling zero, narrow, or resize events.
- Passing snapshots while never running the actual process in a PTY.
- Claiming Windows compatibility from POSIX PTY tests.

## Verification checklist

- [ ] Entrypoint, event loop, state, effects, rendering, keymap, lifecycle, tests, and commands were traced.
- [ ] The TUI contract passes and references resolve.
- [ ] Model/update/effects/view ownership is explicit.
- [ ] Blocking I/O is outside the event loop and stale events cannot corrupt current state.
- [ ] Focus, key hints, cancel, quit, confirmation, and failure paths are discoverable and deterministic.
- [ ] Resize, minimum size, non-TTY, `NO_COLOR`, Unicode, and ASCII fallback behavior are defined.
- [ ] State, snapshot, virtual-terminal, PTY/ConPTY, and cleanup evidence ran after the final mutation.
- [ ] Normal exit, error, panic, cancellation, and signal restore terminal modes.
- [ ] Tested platforms and terminals are distinguished from claimed support.
- [ ] Destructive backends, packaging, publication, and deployment were not performed implicitly.
