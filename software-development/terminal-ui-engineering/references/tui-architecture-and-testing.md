# TUI architecture and testing menu

Use this reference when a TUI change reaches architecture, async work, destructive operations, lifecycle, or compatibility. It offers portable concerns and evidence layers, not a mandatory model or test ladder. Preserve the chosen framework and repository conventions.

## Match the stack

| Stack | Native concepts to prefer |
|---|---|
| Bubble Tea | Model, `Update`, `View`, messages, commands, program options |
| Textual | App, screens/widgets, reactive state, messages/events, workers, Pilot/tests |
| Ratatui | The repository's app/event/render organization, backend and `TestBackend` conventions |
| curses, Ink, or other | Their established state, input, task, rendering, and cleanup ownership |

The portable questions are:

1. where current screen/widget/focus/selection/dimensions/operation state lives;
2. how input, resize, timer, data, progress, completion, failure, and shutdown become updates;
3. where blocking I/O and child processes run;
4. how stale async results are rejected or reconciled;
5. which renderer owns terminal output;
6. which lifecycle wrapper restores terminal state.

Do not rename code or introduce a second architecture solely to fit this list.

## Key, focus, and operation choices

Apply only what the changed interaction needs:

- avoid silent conflicts between global keys and focused text/widget editing;
- keep changed primary actions discoverable according to the local UI;
- preserve or deterministically relocate focus when a target disappears;
- provide a cancel path for operations that are meaningfully cancellable or abandonable;
- use confirmation for destructive, irreversible, costly, or broad effects, bound to the actual target/effect;
- default to the safe action when a consequential confirmation is used;
- prevent duplicate action keys when repeated execution has consequence.

A harmless navigation or atomic local update does not need a confirmation screen or cancellation state.

## Terminal lifecycle kernel

When the program owns raw/cooked mode, echo, cursor visibility, alternate screen, mouse/paste modes, or child processes, restoration is non-optional. Select the exit paths the application claims and the change can affect:

- normal quit;
- command/domain error;
- exception/panic where the runtime supports recovery hooks;
- SIGINT/SIGTERM or platform equivalents that the program handles;
- cancelled/failed child task;
- initialization failure after partial terminal mutation.

Observe only owned state: cursor visibility, echo/input mode, raw/cooked mode, alternate-screen/mouse/paste exit, and child cleanup. Do not promise signal recovery on a platform/runtime path that cannot be exercised.

## Evidence layers

Choose the cheapest layer that can falsify the claim, then cross the real terminal boundary only when the claim reaches it.

### Transition or state tests

Use for deterministic event/update logic, emitted tasks/effects, operation identity, cancellation when applicable, stale-result handling, and focus fallback.

### Widget/render or snapshot tests

Use for representative visual states/sizes, clipping, long text, selection/focus, errors, and confirmations when present. Normalize only truly nondeterministic data, not layout defects.

### Framework harness or virtual terminal

Use for composed frames, focus/key dispatch, cursor movement, clearing, dimensions, and ensuring background output cannot corrupt renderer-owned frames.

### PTY or ConPTY

Use for actual startup, key input, resize, signals, process exit, non-TTY behavior, and terminal restoration. Bound timeouts and use deterministic fixtures.

### Installed/package probe

Use only when claiming packaging, installation, or platform distribution.

A state test does not prove frames; a snapshot does not prove input/resize/cleanup; a POSIX PTY does not prove Windows; and a single terminal does not prove all terminal claims. Conversely, a bounded render edit does not need every layer.

## Capability and compatibility selection

Select only capabilities the project exposes or the change touches:

- narrow/short sizes or a declared minimum-size state;
- redirected stdin/stdout and `TERM=dumb` behavior;
- `NO_COLOR` or project-specific color controls;
- Unicode width/combining and ASCII fallback;
- mouse, bracketed paste, hyperlinks, clipboard, or other terminal modes;
- POSIX PTY, ConPTY, or named terminal families.

The optional JSON validator's fields and boolean verification plan are a hardened schema, not runtime proof or universal requirements. Use safe fixtures and keep real backend mutation separately authorized.
