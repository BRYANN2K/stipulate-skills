# Native Stip mod for Claude Code

Provide a Claude Code function-hook plugin (`packages/claude-code/`, plugin name `stipulate`) that runs the Stip lifecycle natively in Claude Code on the terminal and desktop surfaces, backed by new engine `runtime` subcommands shared by every host. Decisions D1–D5 in proposal.md are part of this contract. The OpenCode plugin's behaviour is unchanged.

## Scope

- Engine: `workflow.py runtime …` subcommands owning dispatch gates, the worker registry, worktree isolation and integration.
- Mod: tools, agent types, commands, guards, context injection, band, pane, status line, toasts, settings.
- Distribution: repo-root marketplace file, launcher hint, documentation.

## Acceptance criteria

### Engine

- AC-1: `workflow.py runtime` provides `reserve`, `confirm`, `settle`, `review`, `cancel`, `integrate` and `show` with JSON stdout, `{"error"}` on stderr and a nonzero exit on refusal; `--help` documents each. Mutations take `.workflow/.lock` and write atomically.
- AC-2: `reserve` enforces the gates the OpenCode coordinator enforces today: schema-v2 change, current approval, task in the approved plan, phase compatibility, accepted dependencies, no active previous attempt, `max_workers` across changes and helpers, and writer limits. It records a `starting` job before any launch.
- AC-3: Writer limits: without isolation at most one active writing job; with isolation, writing jobs run concurrently up to `max_shared_writers`, each in its own git worktree created by `reserve` from a snapshot of the current working tree (tracked changes and untracked files inside its owned paths).
- AC-4: `integrate` applies an accepted isolated job's changes to the main checkout limited to its `write_paths`; it refuses, with a conflict report and no partial write, when an owned file changed in the main checkout since the snapshot or the job touched paths outside its ownership. Worktrees are removed after integration, rejection without correction, or cancellation.
- AC-5: Existing behaviour holds: OpenCode's registry format still validates; `check`, `docs` and `archive` gates still refuse unresolved or unaccepted jobs; existing tests pass.

### Mod — orchestration

- AC-6: Tools `stip_status`, `stip_research`, `stip_plan`, `stip_delegate`, `stip_interrupt`, `stip_contribution` and `stip_result` are registered with schemas in the prompt; each refuses when called from a subagent.
- AC-7: Workers are plugin agent types `stipulate:<role>` resolved from `orchestration.clients.claude-code` (personal ← project ← local; defaults → phase → role → phase-role); unassigned options inherit the coordinator's model; a model change resets unresolved effort.
- AC-8: `stip_delegate` reserves through the engine, spawns with `$.agent.spawn` (worktree `cwd` when isolated), confirms the real `agentId`, and never launches twice when the launch outcome is uncertain (job stays `unknown` until reconciled).
- AC-9: The registry reflects observed activity: `running`, `waiting` (permission ask), `returned` with the captured final answer, `failed`, `cancelled`; the last tool and elapsed time are recorded; `stip_result` returns the captured answer.
- AC-10: Correction reuses the same task ID with a new attempt; independent verification and unrelated tasks run in distinct agents.

### Mod — enforcement

- AC-11: A worker's `Edit`, `Write` and `NotebookEdit` outside its `write_paths` (relative to its worktree when isolated), or into `.workflow`/`.git`, is denied with the reason; workers cannot call `stip_*` or Agent. Worker Bash carries a `STIP_WORKER` marker that makes the engine refuse every mutation, and direct engine or history-changing git commands are denied. A worker that circumvents the marker inside a script it runs is detected during the session: tampering with the change's lifecycle state or worker registry is restored, the worker is cancelled and the affected job is flagged for the person. Deliberate circumvention by a process with the user's file access is a documented residual, not a guarantee (D7).
- AC-12: After `stip_interrupt` or cancel, every further tool call of that worker is denied and the job becomes `cancelled`.
- AC-13: Apply gate: with a change bound to the session and not approved, main-session source edits are denied in `block`, allowed with a warning in `warn`, untouched in `off`; `.workflow/changes/<id>/` documents stay editable. Default `block`.
- AC-14: Approval: while the mod is active, approval counts only when the person gave it through the band's Approve button or `/stip-approve`, which shows the contract digest being approved and runs the engine's approve. A model-initiated `approve` is denied before it runs or, if it got through, revoked during the session; approval records changed outside the mod during a session are discarded. Records forged while no session runs and approvals adopted at the mod's first activation in a project are documented residuals.
- AC-15: Every guard fails closed (`.catch` → deny) and states which rule refused.

### Mod — interface and context

- AC-16: An `AbovePrompt` band on terminal and desktop shows change, stage, approval state, running workers and those awaiting review, with Approve / Status buttons; it hides when no change is bound.
- AC-17: `/stip` opens a pane with stages, criteria, plan tasks with their state and dependencies, workers (details, accept, request correction, cancel) and research helpers; actions call the same engine paths as the tools.
- AC-18: A status line entry and toasts report worker return, failure, permission wait and stale approval.
- AC-19: A `prompt.compose` section gives the bound change, phase, approval and ready tasks; it is absent when nothing is bound.
- AC-20: `/stip-settings` edits profiles per scope with Claude Code models and effort levels and refuses invalid combinations; running jobs keep their recorded selection.
- AC-21: Refresh is event-driven (worker events, tool calls touching `.workflow`) with a timer fallback no faster than 10 s; no engine process is spawned per draw.

### Distribution and quality

- AC-22: `.claude-plugin/marketplace.json` lists the mod; `claude plugin validate packages/claude-code` reports no refusal; `build_skills.py` keeps the mod's bundled `workflow.py` in sync and `--check` detects drift.
- AC-23: `claude plugin test packages/claude-code` covers gates, guards (including fail-closed), registry transitions and settings resolution; engine `runtime` subcommands have unittest coverage including conflict and failure paths.
- AC-24: A real Claude Code session in a sandbox project completes explore → user approval via button → two isolated parallel writers → integration → independent verification → docs → archive, with visual inspection of band and pane in the terminal.
- AC-26: `check` accepts a report where every criterion covered only by docs-phase tasks is `pending-docs` and every other criterion is `passed`; the change becomes `checked`. `docs` and `archive` then refuse until those criteria are recorded `passed` with evidence. A criterion covered by any apply or check task cannot be `pending-docs`.
- AC-25: Documentation covers install, use, settings, enforcement limits (Bash is not sandboxed; mod API is early access; observed build) and how to re-qualify on a new build.

### Stip Ledger interface and live-run fixes

- AC-27: The /stip pane on terminal and desktop shows, in this order: change picker with Plan/Settings tabs; stage chips (done, current, pending styles); a "Who runs what" section with one row per task or group of tasks sharing model, effort and state (model name, Claude-style effort mark, current activity, one-glyph actions only where the action is allowed); a task graph (box-drawing text in the terminal, SVG on desktop) whose node colors encode integrated, running and correction; a criteria strip with one mark per criterion and the first open criterion named. Existing actions (approve, rebase, resync, delegate/launch, accept, correct, cancel, view result, details, settings) remain reachable.
- AC-28: The band reads `◆ Stip <change> <Stage> ▸ n/m <approval>` with only non-zero counts, Plan/Settings tab buttons (hotkeys p, s), collapse, and Approve as the single primary action when approvable; it never truncates mid-word and keeps its buttons at 60, 80, 110 and 140 columns.
- AC-29: Effort marks match Claude Code's glyphs for each level (including `● high` and `◐ medium`) everywhere the mod shows effort.
- AC-30: At terminal widths from 40 to 140 columns and in the desktop pane, no header, task row or helper row wraps mid-word or splits a model name across lines (render tests at 40, 50, 80, 105, 140 columns and desktop narrow/wide).
- AC-31: A correction of an isolated task refreshes the files outside the task's write_paths in its worktree from the main checkout's current content before the worker restarts, without touching the task's own uncommitted work.
- AC-32: Integrity journals, known-good copies or registries left by another session for a change id are never used to restore a lifecycle file that this session created or that is newer than the journal entry; the stale record is set aside with a one-line notice instead of a restore loop.
- AC-33: A `ui.press` for a handle no longer held is ignored without a transcript error.
- AC-34: When rebase retires a task whose work was already integrated, the rebase reply and the pane name the integrated paths that remain in the checkout.

### Ledger states and motion (revision 2)

- AC-35: The pane renders each state as in the validated preview `ledger-states.html`, on terminal and desktop: Setup (project without `.workflow/`: `/stip` is available read-only with a Set up action and what was found; no band, tools or guards there), New change (start action, follow-ups read from archived proposals, accepted specs), Explore (problem, findings, research, decisions from `proposal.md`), Validate (approval card with digest, criteria changed since the last approved version, plan graph with planned models), Apply (a "Waiting for you" group for returned work, tasks with live clock, current activity and a trail of recent steps, plan graph, criteria), Check (review row and the recorded proof per criterion), Docs (docs task and the criteria waiting on it), Archive (the change folds into one line with its commit, then a summary: criteria, tasks, duration, models used, follow-ups, Start next change), Settings (models by role with the Orchestrator row, limits, save state).
- AC-36: Motion plays once per event (phase change, approval seal, verdict, hand-off, unblocked tasks, changed criteria, archive fold, outdated evidence); only a running clock and the criterion under review repeat while work runs; nothing animates while the person is typing. A `motion` setting (auto, calm, off; default auto) is honoured everywhere; calm drops in-between frames, off shows final states. Terminal motion stays within the host redraw limit.
- AC-37: A `+ New` control next to the change picker (terminal hotkey `n`) starts `/stip-explore` in the person's prompt without closing the current change.
- AC-38: Section titles read "Tasks", "Models used" and "Models by role"; no "Who runs what" remains in the mod or its docs. Criteria are shown as a ruler of glyphs with AC labels (`✓` passed, `✗` failed, `◌` pending-docs, `·` open), not as colored cells. UI copy has no em dashes.

### Desktop polish

- AC-39: The mod registers no `stip-action` command in any state (setup or bound); every band and pane action still works through mod state; `/stip-correct <task-id> <reason>` requests a correction of a returned task with the person's reason (at least 8 characters), is refused for the model and for non-person origins, and the pane's Correct hint names it.
- AC-40: In the desktop pane the stage strip draws no bordered or filled chip: done stages green with ✓, the current stage bold in the accent color with `●`, later stages dim; the terminal strip is unchanged.
- AC-41: When the band is drawn at a terminal width different from the last one, the status line is refitted to that width, so it never ends mid-word at 40, 50, 80 or 140 columns, including after a resize.

### npx install for Claude Code

- AC-42: `npx github:BRYANN2K/stipulate-skills --agent claude-code` installs the mod itself by running `claude plugin install stipulate --marketplace BRYANN2K/stipulate-skills --scope project` in the current directory (`--scope user` with `--global`), with no prompt, after the skills; it reports the outcome and exits non-zero if the install fails.
- AC-43: Without a `claude` CLI on the PATH, the launcher installs the skills, prints the `/plugin install` line with a note that Claude Code was not found, and exits 0; `--dry-run` shows the exact `claude plugin install` command and changes nothing; other agents' installs are unchanged.
