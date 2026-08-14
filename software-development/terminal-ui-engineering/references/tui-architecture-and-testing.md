# TUI architecture and testing

## Portable architecture

Use framework-native names when they exist, but preserve four roles:

1. **Model** — current application state: screen, focus, selection, dimensions, data, operation state, messages.
2. **Update** — deterministic transition from state plus event to new state plus effects.
3. **Effects** — network, filesystem, process, timer, and stream work outside the event loop; effects return events.
4. **View** — pure or observational rendering of state into a frame or widget tree.

Terminal initialization and cleanup wrap the application lifecycle. No background task writes directly to the renderer-owned screen.

## Event classes

Model at least:

- key and paste input;
- resize;
- timer/tick;
- data loaded/updated;
- progress/stream record;
- operation accepted/completed/failed;
- cancellation;
- signal/shutdown;
- terminal capability or fallback.

Attach operation/resource identity to asynchronous results. Ignore or reconcile stale results rather than applying them to the current selection.

## Focus and keymap

- One visible focus owner at a time unless the framework explicitly models composite focus.
- Global bindings must not silently conflict with focused-widget editing.
- Provide explicit quit and contextual cancel paths.
- Discover primary actions in persistent hints or contextual help.
- A destructive operation uses a distinct confirmation screen whose declared purpose identifies the operation and whose focus order exposes `cancel` and `confirm`.
- Runtime confirmation defaults to the safe action and identifies the exact target and effect; the static manifest validator cannot prove dynamic text or target binding.
- Preserve focus after refresh when the same stable identity remains.
- When a target disappears, choose and test a deterministic fallback.

## Terminal lifecycle

Tests must cover cleanup after:

- normal quit;
- command/domain error;
- panic/exception where the runtime permits recovery hooks;
- SIGINT and SIGTERM or platform equivalents;
- cancelled child task/process;
- failed initialization after partial mode changes.

Observable recovery includes cursor visibility, echo/input mode, raw/cooked mode, alternate-screen exit, and child cleanup. Do not promise signal behavior on a platform not exercised.

## Layered verification

### State tests

Drive events without a terminal. Assert state, emitted effects, operation identity, cancellation, stale-result handling, and focus fallback.

### Snapshot tests

Render representative states and sizes. Include long text, Unicode, narrow layout, errors, confirmations, and selected/focused variants. Normalize only unstable values such as timestamps, not whitespace or clipping bugs.

### Virtual terminal

Exercise composed frames and control sequences: cursor, clearing, dimensions, clipping, and redraw. Verify that background output cannot corrupt frames.

### PTY or ConPTY

Spawn the actual executable. Exercise startup, key sequences, resize, non-TTY behavior, signal, exit code, and terminal cleanup. Use bounded timeouts and deterministic fixture data.

## Compatibility

Contract fields for operation success/failure, resize, color, Unicode fallback, non-TTY behavior, and cleanup evidence must state an actionable present contract rather than an exact deferred placeholder such as `TODO`, `TBD`, `later`, `pending`, `unknown`, or `placeholder`. This is a bounded syntax guard, not proof that the behavior works at runtime.

Select a matrix from actual claims:

- POSIX PTY for Linux/macOS behavior;
- ConPTY or a Windows-native harness for Windows claims;
- representative xterm-compatible terminal;
- terminals/capabilities materially used by the product;
- `TERM=dumb`, `NO_COLOR`, redirected stdin/stdout, and missing Unicode capability where supported.

A green Linux PTY test is not Windows evidence.
