# Native Stip mod for Claude Code

## Problem

Stip on Claude Code today means skills plus `.claude/agents/` projection (`configure_agents.py`). The coordinator records native runs by hand, nothing enforces lifecycle gates or file ownership, and there is no live view of the change. OpenCode v2 has a native plugin (`packages/opencode/`, spec `opencode-orchestration`) with tools, a sidebar, settings and worker tracking. Claude Code now ships function-hook plugins ("mods", API early access, observed on build 2.1.293) that can draw in the terminal and desktop, register tools, commands and agent types, spawn subagents and intercept every tool call with its `agentId`.

Goal: a Claude Code mod that reaches parity with the OpenCode plugin where it matters and goes further where the Claude Code host allows enforcement the OpenCode host does not.

## Findings (classified)

- **established** — OpenCode plugin inventory: 6 tools (`stip_status`, `stip_research`, `stip_plan`, `stip_delegate`, `stip_interrupt`, `stip_contribution`), sidebar (stages, extensions, agents, helpers, observed children), `/stip-settings`, `/stip-status`, per-role profiles in 3 scopes, registry `.workflow/.runtime/<change>/state.json`, worker write-scope via permission hook (packages/opencode/src/*).
- **established** — OpenCode gaps: worker result never captured ("Inspect result" dead), `last_tool` never written, `queued`/`correction` states unused, no stop-dispatch/scoped retry controls, no helper interrupt, Python spawned every 2 s per sidebar, Bash bypasses write scope, coordinator logic is Node-only so other hosts cannot reuse dispatch gates.
- **established** — Mod API (types/claude-code.d.ts, build 2.1.293): `tool.call` carries `agentId` (subagent identity at call time); `$.agent.register` (model, effort, tools, disallowedTools, permissionMode); `$.agent.spawn` runs in background and its answer arrives as `turn.complete` with that `agentId`; `$.agent.list` gives status; `$.tool.register` (`mcp__<plugin>__<name>`); `$.command.register`; `prompt.compose`; `ui.render` for `AbovePrompt` and `Pane` on `terminal`, `desktop`, `vscode`, `mobile`; `$.ui.status`, `$.ui.toast`; `$.process.run`, `$.fs`, `$.clock.every`; `$.state` / `$.store`. No Node runtime inside the mod.
- **established** — No explicit subagent stop in `$.agent`; cancellation must deny the worker's further tool calls (and optionally SendMessage it).
- **inferred** — Bash commands inside a worker can be inspected (argv text) but not reliably confined; write ownership remains coordination, not a sandbox.
- **incomplete** — Mod API is early access and moves between releases; no compatibility promise.

## Scope (proposed)

1. `packages/claude-code/` mod (`.claude-plugin/plugin.json`, `hooks/register.tsx`, types contract, bundled `assets/workflow.py`), distributed through a `.claude-plugin/marketplace.json` at the repo root and referenced by the npx launcher for `--agent claude-code`.
2. Tools: parity set `stip_status`, `stip_research`, `stip_plan`, `stip_delegate`, `stip_interrupt`, `stip_contribution`, plus `stip_result` (read a returned worker's captured answer).
3. Workers as plugin agent types (`stipulate:<role>`), profile from `.workflow/config.json` → `orchestration.clients.claude-code` (+ local/personal scopes), spawned with `$.agent.spawn`, tracked through `tool.call`/`turn.complete` by `agentId`: status, last tool, elapsed time, captured answer.
4. Enforcement (beyond OpenCode):
   - worker `Edit`/`Write`/`NotebookEdit` outside its task `write_paths`, or into `.workflow`/`.git`, is denied;
   - workers cannot call `stip_*`, Agent, or lifecycle commands;
   - cancelled/interrupted workers have every further tool call denied;
   - main-session source edits are denied while the bound change is not approved (apply gate), configurable `off | warn | block`;
   - approval: see open question Q3.
5. UI on terminal and desktop: `AbovePrompt` band (change, stage, approval, workers running/awaiting review, action buttons), `/stip` pane (stages, criteria, plan DAG with task states, workers with details/accept/correct/cancel, helpers), status line entry, toasts on worker return/failure/stale approval.
6. Context: a `prompt.compose` section with the bound change, phase, approval state and ready tasks, so a new session does not re-derive it.
7. Settings: `/stip-settings` pane over Claude Code model aliases/ids and effort levels, same 3 scopes and resolution order as OpenCode.
8. Refresh event-driven (tool calls touching `.workflow`, worker events) with a slow timer fallback, instead of a 2 s Python poll.

Out of scope: changing the OpenCode plugin's behaviour; Codex; parallel writers in isolated worktrees (see Q4).

## Decisions (user, 2026-10-07)

- D1 Dispatch gates and registry mutations move into the engine as `runtime` subcommands of `scripts/workflow.py`; the mod calls them. The OpenCode plugin keeps its own logic in this change.
- D2 Distribution: repo-root `.claude-plugin/marketplace.json`; install line `/plugin install stipulate --marketplace BRYANN2K/stipulate-skills`; the npx launcher prints it for `--agent claude-code`.
- D3 With the mod active, approval requires a user action (band button or `/stip-approve`); the model's own `approve` invocation is denied.
- D4 Apply gate defaults to `block` when a change is bound to the session; configurable `off | warn | block`.
- D5 Parallel writers are in scope: each writing task may run in its own git worktree; the coordinator integrates accepted output into the main checkout through the engine, detecting conflicts instead of overwriting.

## Open questions

- D6 Worktree base: snapshot of the current working tree (tracked changes via `git stash create`, plus untracked files inside owned paths), so workers see the user's uncommitted state. (user, 2026-10-07)
- D7 Bash inside workers is filtered for lifecycle commands only; it is not a sandbox. Accepted by the user.
- D8 Pre-existing uncommitted edits to `scripts/build_skills.py`, `docs/orca-plugin.md` and `packages/orca/` belong to a later Orca plugin change: preserve them, never stage them in this change.
- D9 Live verification showed the mod API skips a plugin's hooks for agents the plugin spawns itself; workers are launched by the model from a ticket so their calls stay guarded. (2026-10-07)
- D10 Without an OS sandbox, AC-11 and AC-14 are stated as "denied or detected and undone in session"; deliberate circumvention by a script with the user's file access, store forgery while no session runs, and adoption at first activation are documented residuals. (user, 2026-10-07)
- D11 A criterion covered only by docs-phase tasks deadlocks check (docs cannot start before check). The engine gains a `pending-docs` check status for such criteria, required `passed` at docs/archive (AC-26, task docs-gate). Earlier tasks unchanged. (user chose option 2, 2026-10-08)
- Mod API stability (accepted): early access; the package pins the observed build and documents a re-qualification step.
