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

- AC-22: `.claude-plugin/marketplace.json` lists the mod; `claude plugin validate packages/claude-code` reports no refusal; the launcher prints the install line for `--agent claude-code`; `build_skills.py` keeps the mod's bundled `workflow.py` in sync and `--check` detects drift.
- AC-23: `claude plugin test packages/claude-code` covers gates, guards (including fail-closed), registry transitions and settings resolution; engine `runtime` subcommands have unittest coverage including conflict and failure paths.
- AC-24: A real Claude Code session in a sandbox project completes explore → user approval via button → two isolated parallel writers → integration → independent verification → docs → archive, with visual inspection of band and pane in the terminal.
- AC-26: `check` accepts a report where every criterion covered only by docs-phase tasks is `pending-docs` and every other criterion is `passed`; the change becomes `checked`. `docs` and `archive` then refuse until those criteria are recorded `passed` with evidence. A criterion covered by any apply or check task cannot be `pending-docs`.
- AC-25: Documentation covers install, use, settings, enforcement limits (Bash is not sandboxed; mod API is early access; observed build) and how to re-qualify on a new build.
