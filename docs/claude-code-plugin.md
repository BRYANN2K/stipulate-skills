# Claude Code mod

The `stipulate` mod runs the Stip lifecycle natively in Claude Code. It adds tools for the coordinator, worker agent types per role, ownership and approval guards, a band above the prompt, a `/stip` pane, worker settings, a status line entry and toasts. Lifecycle and registry changes still go through the bundled engine (`packages/claude-code/assets/workflow.py`, a copy of `scripts/workflow.py`).

The mod is built on Claude Code's function-hook plugin API ("mods"), which is **early access**. It was developed against build 2.1.293 and qualified on 2.1.293 and 2.1.294. A newer build can change the API: re-qualify before relying on it ([Re-qualify on a new build](#re-qualify-on-a-new-build)).

The seven `stip-*` skills remain the lifecycle interface. The mod adds enforcement and a live view; it does not add an eighth skill.

## Install

Requirements: Claude Code with mod support, Python 3.10+ available as `python3`, and Git. The mod activates fully only in a project with a `.workflow/` folder at the session root. Elsewhere it registers only a read-only `/stip` that offers setup ([States](#states)); no tools, guards or engine calls.

Type this at the prompt of a Claude Code **terminal** session:

```text
/plugin install stipulate --marketplace BRYANN2K/stipulate-skills
```

Answer `y` to add the marketplace, then pick an install scope. The marketplace file is `.claude-plugin/marketplace.json` at the repository root; it points to `packages/claude-code`.

- **Desktop app.** Install the mod (see [Desktop app](#desktop-app)). Observed: after a **project**-scope install (`claude plugin install stipulate@<marketplace> --scope project`, run in the project folder), the mod loaded in the desktop app's Code tab, with the band rendered and the pane docked on the right. A **user**-scope install should also load there, per the mod API reference; this has not yet been exercised.
- **npx launcher.** `npx github:BRYANN2K/stipulate-skills --agent claude-code` installs the skills for Claude Code, then runs `claude plugin install stipulate --marketplace BRYANN2K/stipulate-skills --scope project` in the current directory. With `--global` it uses `--scope user`, so the mod applies to every project. The launcher does not prompt. If the `claude` CLI is not on the PATH, it prints the install line above instead; type that line in a Claude Code session. `--dry-run` shows the exact command.
- **Development.** Load the package from a checkout with `claude --plugin-dir packages/claude-code`. This works in the terminal only: neither `--plugin-dir` nor `CLAUDE_CODE_PLUGIN_DIRS` reaches the Claude Code process the desktop app starts.

The marketplace and package validate with `claude plugin validate --strict`. The complete `/plugin install` from GitHub has not been exercised yet: it needs the marketplace to be published on the default branch.

Bootstrap still prepares the project (`/stip-bootstrap`). The mod does not create `.workflow/` itself.

### Desktop app

Known limits of the desktop app (Claude.app), observed during qualification:

- **Install required.** The plugin must be installed; project scope works. `--plugin-dir` and `CLAUDE_CODE_PLUGIN_DIRS` do not reach the desktop app.
- **Updates need a version bump.** The desktop app loads the plugin from its plugin cache. An updated mod shows only after its version in `packages/claude-code/.claude-plugin/plugin.json` changes, or after a reinstall.
- **Per project.** With a project-scope install, `/stip` exists only in conversations opened on that project; elsewhere the app answers "/stip isn't a command here." Install at user scope to have it in every project.

## Use

Explore and validate with the main session as usual. Once a change exists, bind it to the session: the band, the pane, the context section and the apply gate follow the bound change.

Every button press in the band and the pane goes to the mod through its own state. No slash command is sent and no command row is added to the transcript. Refusals appear as toasts.

### Band

A band above the prompt (terminal and desktop) reads:

```text
◆ Stip  <change>  <Stage> ▸ n/m  <approval>  <counts>      [ a Approve ] [ p Plan ▾ ] [ s Settings ]
```

`n/m` is accepted tasks out of planned tasks. Then come `! rebase needed` or `! resync needed` when they apply, and only the non-zero counts: running workers, results to review, tickets ready to launch, research helpers and tampered attempts. The band is hidden while no change is bound.

| Button | Hotkey | Action |
| --- | --- | --- |
| **Approve** | `a` | The primary action, shown only when the current contract can be approved. Records **your** approval of the digest shown. |
| **Plan** | `p` | Opens or closes the `/stip` pane on its Plan tab. `▾` marks the tab that is open. |
| **Settings** | `s` | Opens or closes the pane on its Settings tab. |

In the terminal the hotkey letter leads each label; the desktop app draws its own hotkey hint. When space runs short, the text gives way first (counts become glyphs such as `▶2`, then the fraction, then the change name shortened at a word boundary), then the buttons shorten to `P` and `S`. Text is never cut mid-word. A collapsed band shows `◆ Stip` (with `●` when approval is pending) and a `+` button that expands it; the pane footer also offers **Expand band**.

### `/stip` pane

The pane has two tabs, **Plan** (titled `Stip`) and **Settings** (titled `Stip · Settings`). It draws from the mod's snapshot only; drawing never starts an engine process.

The Plan tab opens with a header and a stage strip:

- **Header:** the change picker (the change name with `▾`), **+ New** (hotkey `n`), the approval badge, and the Plan / Settings tabs. The picker lists in-flight changes first, then the others, then finished ones and the archived count; selecting one binds it. **+ New** puts `/stip-explore` in your prompt and keeps the current change bound.
- **Stages:** Explore, Validate, Apply, Check, Docs, Archive. In the terminal, done stages are green with `✓`, the current one is filled, and the rest are dim. In the desktop app the strip is plain text with no chips: done stages are green with `✓`, the current stage is bold in the accent color with a `●` mark, and later stages are dim. A stage in trouble shows `!` in the error color.

When a button puts a command in your prompt, a `✎ <command>` line confirms it: press Enter to send it. If your prompt already holds a draft, the draft is left as it is and the command is given in a notice instead.

#### States

The Plan tab shows one state per lifecycle moment:

| State | When | What it shows |
| --- | --- | --- |
| **Setup** | The project has no `.workflow/` | **Set up Stip**, which puts `/stip-bootstrap` in your prompt, and what was found: code and tests, Git state, existing rules files, CI. Read-only: no band, tools or guards run in such a project. |
| **New change** | No change is bound | **Describe a change** (hotkey `n`), which puts `/stip-explore` in your prompt; follow-ups from archived proposals, each with **Start change**; accepted specs; the open changes to bind. |
| **Explore** | The change is exploring | Problem, findings, research helpers and decisions, read from `proposal.md`. Open decisions are titled **Decisions for you**. |
| **Validate** | The contract is being validated | The approval card with the digest and **Approve contract**; criteria and tasks changed since the last approved version; the plan graph with the planned models (**Plan and assignees**). |
| **Apply** | Workers run | **Waiting for you** (returned work, launches, redos and problems), **Tasks**, the **Plan** graph, **Criteria** and research helpers. |
| **Check** | Independent verification | The review task, and the recorded proof per criterion under the criteria ruler. |
| **Docs** | Documentation | The docs task, the paths it edits, and the criteria waiting on it. |
| **Archive** | Just archived | The change folds into one line with its commit, then a summary: criteria, tasks, time, **Models used** (task, model, effort, attempts), follow-ups, and **Start next change**. |

Alerts appear above the state wherever they apply: an approval you did not confirm, an engine error, workflow files that kept changing outside Stip (with the `/stip-resync` hint), and the rebase row (`! Registry tied to the previous contract` or `! Plan changed · N tasks removed`, with **Rebase registry**; see [Revise an approved contract](#revise-an-approved-contract)).

#### Tasks

One row per task, or one row per group of tasks that share model, effort and state. Each row shows the model, the effort mark, the state or current activity, and the elapsed time. While a worker runs, its clock is live and a trail of its recent steps (for example `Reading api.py · Running tests`) follows the row, the newest step last.

Actions appear only where they are allowed:

- **Delegate**, **Launch** (a reserved ticket not yet launched), **Redo** (reopened by a rebase), **Accept** and **Correct** (asks for a correction reason);
- `✕` cancels a running worker, `▤` shows the captured result, `›` opens the details: objective, dependencies, owned paths, covered criteria, attempt, model and effort, last tool, agent, errors and review notes.

A group's `›` lists its members, each with its own `▤` and `›`. A row flagged as tampered asks for a second step, **Accept anyway (I inspected git diff)**. **Retired (N)** lists tasks a revised contract removed, with the paths their integrated work left in the checkout.

#### Plan graph and criteria

- **Plan graph:** task dependencies, drawn with box-drawing text in the terminal and as SVG in the desktop app. Color carries state; the legend names integrated, running and correction (and failed when present).
- **Criteria:** a ruler with one glyph per criterion over its AC label: `✓` passed, `✗` failed, `◌` pending-docs, `·` open. Under it, the first open criterion is named on one line. **All** lists every criterion with its one-line title; `›` opens one: its full text, recorded status and evidence, and the plan tasks that cover it.

#### Effort marks

The interface uses Claude Code's own effort glyphs everywhere it shows effort: `○` low, `◐` medium, `●` high, `◉` xhigh, `◈` max.

#### Motion

Motion plays once per event: a phase change, the approval seal, a verdict on a criterion, a command handed to your prompt, tasks that become ready, changed criteria, the archive fold and outdated evidence. Only a running clock and the criterion under review repeat while work runs. Nothing animates while you type in the prompt. The `ui.motion` setting controls it ([Settings](#settings)).

### Commands

| Command | Purpose |
| --- | --- |
| `/stip` | Open the pane. |
| `/stip-settings` | Open the worker settings ([Settings](#settings)). |
| `/stip-approve [change-id]` | Validate the change and show its criteria, plan size and **contract digest**. Approve by typing `/stip-approve <change-id> confirm <first 12 characters of the digest>`. The confirmation must be typed at the prompt. |
| `/stip-bind [change-id]` | Bind the session to a change. Without an argument, list the bound change and the open changes. |
| `/stip-resync` | Show workflow files changed outside this session (known-good → found). `/stip-resync confirm`, typed by you, adopts them as the known-good state. Approvals still need your own record. |
| `/stip-correct <task-id> <reason>` | Ask for a correction of a returned task, in your own words. The reason must be 8 or more characters and say what must change. |

`/stip-correct` works only in a bound project, not during setup. Only you can type it at the prompt: the model and other plugins or triggers are refused. The task's latest attempt must be returned and awaiting acceptance, or rejected, or the task must be awaiting integration. The band and the pane do not need this command.

### Tools for the coordinator

The main session receives seven tools (`mcp__stipulate__stip_*`). Every one is refused when called from a subagent.

| Tool | Inputs and purpose |
| --- | --- |
| `stip_status` | Optional `change_id`: phase, approval, plan tasks with latest attempts, ready tasks, workers, helpers, limits and coordinator notes. Naming a change binds it when nothing is bound. |
| `stip_research` | `question`, optional `title`, `role` (default `research`), `phase` (`explore` or `validate`), `change_id`: reserve a read-only helper for one question. |
| `stip_plan` | `change_id`, `plan`, optional `migrate`: install the execution plan before approval. |
| `stip_delegate` | `change_id`, `task_id`, optional `instructions`, `correction`: run the engine's dispatch gates and reserve a worker ticket. |
| `stip_interrupt` | `change_id` + `task_id`, or `helper_id`; optional `reason`: cancel a worker or helper. |
| `stip_contribution` | `change_id`, `task_id`, `decision` (`accepted`/`rejected`), `reason` (8+ characters), optional `discard`: record your review. Accepting an isolated attempt integrates it into the main checkout or refuses with a conflict report. |
| `stip_result` | `change_id` + `task_id` (optional `attempt`), or `helper_id`: read the captured final answer. |

### Launching a worker: the ticket

The mod's API skips a plugin's hooks for agents the plugin spawns itself. Workers are therefore launched by the coordinator model so that their tool calls stay guarded:

1. `stip_delegate` (or `stip_research`) checks the gates through the engine and reserves a `starting` job. It returns a **ticket**: a `subagent_type` such as `stipulate:backend` and a description.
2. The coordinator calls the **Agent** tool with exactly that `subagent_type` and description. The prompt can be anything: the mod replaces it with the Stip brief, sets the working directory (the worktree when isolated) and runs the agent in the background.
3. The mod confirms the real agent ID with the engine. If the launch outcome is uncertain, the job stays `unknown` and is never launched twice.

An Agent call for a `stipulate:` type without a ticket, with another `subagent_type`, or from a subagent is refused. If Agent reports the type as unknown, it was registered during this turn; launch it on the next turn.

**Delegate** in the pane reserves the ticket and fills the launch instruction into your prompt box. **Press Enter** to send it. Nothing launches until you do.

The registry then follows the agent: `running`, `waiting` (permission request), `returned` with its captured answer, `failed` or `cancelled`, plus the last tool and elapsed time. `returned` is not `accepted`: review the files and evidence, then record the decision with `stip_contribution` or the pane. A correction keeps the task ID with a new attempt.

### Status line, toasts and context

A status line entry summarises the bound change. It is refitted to the terminal width whenever the width changes, so it does not end mid-word after a resize. Short toasts (at most 60 characters, repeated ones coalesced) report worker returns and failures, permission waits, stale or revoked approval, restored state, tampering and rebase needs.

While a change is bound, a short section is added to the model's context: the change, phase, approval state, ready and running tasks, results awaiting review, and the rule that approval is your action. Nothing is added when no change is bound.

Refresh is event-driven (worker events and tool calls touching `.workflow`). A fallback timer refreshes no faster than every 10 seconds, only while agents are active.

## Settings

Open **`/stip-settings`**, the band's **Settings** (`s`) or the pane's Settings tab. The tab shows:

- **Scope** chips (Personal, Project, Local) and the file path of the selected scope.
- **Models by role:**
  - **Orchestrator:** the model and effort of this session, read-only. Change them with `/model` and `/effort`; Stip does not store them.
  - **Defaults** (every role unless set), then the roles in use: roles of the bound plan (`in plan`), `research` (helpers) and roles with their own settings. Roles that set nothing of their own share one dimmed row. Each row has **Model**, **Effort** and **Isolation** (`own worktree` or `shared`) pickers; an unset cell shows the inherited value in parentheses.
  - Phase overrides, **Other roles (N)** with **Show**, and **+ Add role** (lowercase hyphenated name; `discovery` and `coordinator` are reserved).
  - A row's `›` shows what it resolves to. On **Defaults** it lists the effective model, effort and isolation for every role, the limits, and **Add phase override…** (a role or all roles, then a phase). On a role it offers **Override `<role>` in a phase…**.
- **Limits and guards:** **Workers** and **Parallel writers** steppers (1 to 8), the **Apply gate** (`off`, `warn`, `block`) and **Motion** (`Auto`, `Calm`, `Off`).
- **Save** and **Discard**, with the save state (`Saved`, `Unsaved · N changes`) and validation messages.

Model choices are `inherit`, Opus 5.5, Fable 5.1, Sonnet 5.5, Haiku 5.5, the `opus`, `sonnet`, `haiku` and `fable` aliases, or a custom model ID. Effort is `inherit`, `low`, `medium`, `high`, `xhigh` or `max`, shown with its mark ([Effort marks](#effort-marks)).

Running workers keep the model and effort recorded at launch. Edits apply to the next delegation.

### Motion

`ui.motion` takes `auto` (the default), `calm` or `off`:

- **auto** plays every frame of each one-shot event.
- **calm** keeps the state changes but drops the in-between frames.
- **off** shows final states only; the running clocks and the review pulse stop repeating too.

### Scopes and files

| Scope | File | Use |
| --- | --- | --- |
| personal | `~/.claude/stipulate.json` (or `$CLAUDE_CONFIG_DIR/stipulate.json`) | Your defaults across projects. |
| project | `.workflow/config.json` | Shared with the repository. |
| local | `.workflow/local.json` | Overrides for this checkout. |

Scopes merge in the order personal ← project ← local; the later scope wins. The mod writes only `orchestration.clients["claude-code"]` in the selected file and preserves everything else. Saving takes `.workflow/.lock` and is refused when any scope file changed since it was loaded.

### Model per role

The section accepts `defaults`, `roles`, `phases`, `phase_roles`, `enforcement` and `ui`. Profiles take `model`, `effort`, `isolate` and `agent` (an existing agent type, which cannot be combined with an explicit effort). This example runs the apply phase on Opus with low effort, verification on Fable with medium effort, documentation on Haiku with high effort, and research on Sonnet with low effort. It allows two parallel writers:

```json
{
  "orchestration": {
    "clients": {
      "claude-code": {
        "defaults": {"max_workers": 3, "max_shared_writers": 2},
        "phases": {
          "apply": {"model": "claude-opus-5-5", "effort": "low"}
        },
        "roles": {
          "verification": {"model": "claude-fable-5-1", "effort": "medium"},
          "documentation": {"model": "claude-haiku-5-5", "effort": "high"},
          "research": {"model": "claude-sonnet-5-5", "effort": "low"}
        },
        "enforcement": {"apply_gate": "block"},
        "ui": {"motion": "calm"}
      }
    }
  }
}
```

Resolution runs from general to specific: defaults → phase → role → phase-and-role. An unset option inherits; an unset model is the coordinator's. A layer that changes the model resets an effort that no later layer sets. In the example, a `backend` task in `apply` runs on Opus low, and a `documentation` task in `docs` runs on Haiku high. A phase layer makes the agent type `stipulate:<phase>-<role>`; otherwise it is `stipulate:<role>`.

Limits come from `clients["claude-code"].defaults`, else from `orchestration.defaults`, else 2 workers and 1 writer. `max_shared_writers` cannot exceed `max_workers`. With `max_shared_writers` above 1, writing tasks run in their own worktree by default, and a profile with `isolate: false` is rejected. An unreadable configuration falls back to the `block` apply gate and the default limits.

## Lifecycle with the mod

### Approval

While the mod is active, approval counts only when you give it through the band's **Approve**, the pane's **Approve contract**, or `/stip-approve … confirm <digest>`. The model's own `approve` is refused before it runs. If one gets through, it is revoked during the session ("approval not given by the user through Stip"). Approvals that existed when the mod first activated in a project are adopted as yours.

### Apply gate

With a change bound and not approved, edits by the main session inside the project are refused (`block`, the default), allowed with a warning (`warn`), or not checked (`off`). The change's own documents under `.workflow/changes/<id>/` stay editable.

### Parallel writers

Without isolation, at most one writing worker runs at a time. With `max_shared_writers` above 1, each writing task runs in its own Git worktree. The worktree starts from a snapshot of the working tree: tracked changes, and untracked files inside its owned paths. Accepting the attempt integrates it into the main checkout, limited to its `write_paths` and all-or-nothing. Integration is refused with a conflict report when an owned file changed in the main checkout since the snapshot, or when the worker changed paths outside its ownership.

A correction of an isolated task reuses its worktree. Before the worker restarts, the engine refreshes every path outside the task's `write_paths` from the main checkout's current content, so the worker sees the work integrated since its first attempt. The task's own uncommitted work in its owned paths is kept. Non-owned symlinks and special entries are removed, never followed or written through. The reservation's `refreshed` record lists the paths written and deleted.

Integration never copies build artefacts (untracked `__pycache__/*.pyc` and `.pytest_cache/`) or gitignored files. It lists them under `skipped` in its result. In projects that use Stip, the mod sets `PYTHONDONTWRITEBYTECODE=1` and adds `-p no:cacheprovider` to `PYTEST_ADDOPTS` for the session's commands. `python3 -I` and `python3 -E` ignore `PYTHON*` variables, so those commands can still write bytecode; the skip covers it. They do not remove `STIP_WORKER`.

### Revise an approved contract

Change the contract in this order:

1. Edit **`spec.md` first**, adding or removing criteria.
2. Install the matching plan (`stip_plan`). Plan tasks must reference existing criteria and cover them all, so a plan that names a new criterion before the spec does is refused.
3. Validate, then approve the new digest (`/stip-approve`).

Re-approval through Stip rebases the worker registry automatically. A rebase does three things:

- **kept:** unchanged tasks keep their acceptance and integration;
- **reopened:** changed tasks and their dependants are marked rejected and must be redelegated (**Redo**);
- **retired:** jobs of removed tasks move to `retired_jobs`.

When a retired task's work was already integrated, its files stay in the checkout. The rebase reply names them (keep, revert or reassign them), and the pane lists them under **Retired (N)**.

While workers are active, the rebase is refused; the pane then shows **Rebase registry** for later. Until the registry matches the approved contract, dispatch is refused.

### Criteria finished by documentation

A criterion covered **only** by docs-phase tasks cannot pass before docs run. `check` accepts it as `pending-docs` when every other criterion is `passed`, and the change becomes `checked`. A criterion covered by any apply or check task cannot be `pending-docs`. After the docs tasks are accepted, re-run `check` with those criteria `passed` and their evidence. `docs` and `archive` refuse until then.

## Engine runtime commands

The mod drives these engine subcommands; another host can call them directly. They print JSON on stdout. On refusal they print `{"error": …}` on stderr and exit 1. Mutations take `.workflow/.lock` and replace files atomically. Use `--root <project>` before the subcommand to target another project.

| Command | Flags |
| --- | --- |
| `runtime show <id>` | `--task`, `--attempt`: registry, latest attempt per task, ready tasks, active counts; with `--task`, the job and its captured result. |
| `runtime reserve <id>` | `--task`, `--correction` (reuses an isolated worktree and records what was `refreshed`), `--isolate`, `--max-workers`, `--max-shared-writers`, `--host`, `--parent`, `--profile-json`. For a helper: `runtime reserve - --helper <role> --question <text> [--phase explore\|validate]`. |
| `runtime confirm <id>` | `--task` or `--helper`, `--attempt`, `--session <agent-id>` (required), `--model`. |
| `runtime settle <id>` | `--task` or `--helper`, `--attempt`, `--status running\|waiting\|returned\|failed\|cancelled\|unknown` (required), `--result-file <file\|->` (bounded to 64 KiB), `--last-tool`, `--error`. |
| `runtime review <id>` | `--task`, `--decision accepted\|rejected`, `--reason` (8+ characters), `--discard`. |
| `runtime integrate <id>` | `--task`: result lists `written`, `deleted`, `skipped`. |
| `runtime cancel <id>` | `--task` or `--helper`, `--reason`. The host must stop the session itself. |
| `runtime revoke-approval <id>` | `--reason` (required), `--force-phase` from `applying`, `checked` or `documented`. |
| `runtime rebase <id>` | `--reason`: result lists `kept`, `reopened`, `retired`, and `retired_integrated_paths` (per retired task, the integrated paths that remain in the checkout). |

For example:

```sh
python3 <skill-directory>/scripts/workflow.py runtime reserve add-login --task implement-login --isolate --host claude-code
python3 <skill-directory>/scripts/workflow.py runtime confirm add-login --task implement-login --attempt 1 --session <agent-id>
python3 <skill-directory>/scripts/workflow.py runtime review add-login --task implement-login --decision accepted --reason "Diff and tests inspected"
python3 <skill-directory>/scripts/workflow.py runtime integrate add-login --task implement-login
```

With the mod active, the main session may run only `runtime show` from Bash; registry changes go through the `stip_*` tools. Engine commands built from shell variables, `eval`, `source`, command substitution or a stripped environment are refused, so spell the engine path out instead of storing it in a shell variable. Any engine mutation is refused when `STIP_WORKER` is set.

A `check` report is a JSON file passed with `check <id> --results <file>` (or `-` for stdin). Take `subject_digest` from `snapshot`:

```json
{
  "subject_digest": "<digest from snapshot>",
  "criteria": [
    {"id": "AC-1", "status": "passed", "evidence": "Observed result and how it was obtained."},
    {"id": "AC-2", "status": "pending-docs", "evidence": "Covered only by the docs task; recorded after docs."}
  ]
}
```

## Enforcement and limits

The guards are coordination inside Claude Code, **not an operating-system sandbox**. Bash runs with your file access.

### Denied before the call runs

- **Worker edits:** `Edit`, `Write` and `NotebookEdit` outside the worker's checkout or `write_paths`, into `.workflow/` or `.git/`, or by a read-only task. Helpers edit nothing.
- **Worker tools:** `Agent`, `Task`, `Workflow`, `EnterWorktree`, `ExitWorktree`, `TeamCreate`, `TeamDelete` and every `stip_*` tool.
- **Worker Bash:** the workflow engine in any recognised spelling (path, module form, split names, globs); changes to `STIP_WORKER` or the environment the mod sets; the plugin store; `git commit`, `push`, `worktree`, `reset`, `checkout`, `stash`, `switch`, `rebase`, `clean`, and Git aliases. Each worker command runs with `STIP_WORKER` exported, so the engine refuses any lifecycle or registry mutation. Helpers may run only an allow-list of inspection commands.
- **Cancelled workers:** after `stip_interrupt` or **Cancel**, every further tool call.
- **Main session:** the model's `approve`; engine `runtime` mutations from Bash; engine calls built from variables, `eval`, `source` or substitution; edits to `.workflow/.runtime/`, `.workflow/.lock`, `changes/*/state.json` and the plugin store; source edits blocked by the apply gate.
- **Launches:** `stipulate:` agents without a ticket, with another type, or started by a subagent.

Every guard fails closed: an internal error refuses the call and names the rule (for example `stipulate: apply gate guard …`).

### Detected and undone during the session

- **Integrity watch.** Every 3 seconds while agents are active, and every 10 seconds when idle, the mod compares the worker registry and lifecycle state with the last state written by its own engine calls. Outside changes are **restored**. The worker responsible is **cancelled**, and the job is **flagged as tampered** for your review. A check also runs after each worker Bash command.
- **Approval provenance.** An approval that appears without your record is revoked. Changes to the approval records in the plugin store are discarded.
- **Changes from another terminal** are treated the same way and undone until you adopt them with `/stip-resync confirm`.

### Reused change id

Records can survive from an earlier lifecycle of the same change id, for example an earlier project at the same path. Journal entries are bound to the lifecycle they were written for (change id and creation time) and signed. Records of an earlier lifecycle are never used to restore the current one:

- On first sight, the stale journals, the registry and the old worktrees are set aside once (renamed with a `.stale-<timestamp>` suffix, Git worktrees pruned), with one notice naming them. The current files become the baseline.
- A change re-created later is accepted as new only when it is newer, still exploring and never approved, with no active job of the old lifecycle and no work of this session awaiting review or integration. Otherwise the watch restores it as tampering, unless you confirm it with `/stip-resync confirm`.

### Residuals

These cases are documented limits, not guarantees:

- Bash is not a sandbox. A script a worker runs can do what your user can, including writing outside its owned paths. Ownership is checked at integration for isolated workers and by the watch for workflow state, not for every file.
- Deliberate circumvention by a process with your file access cannot be prevented.
- A worker call inside the detection window runs before the cancellation takes effect.
- The plugin store can be forged while no Claude Code session runs.
- Approvals present at the mod's first activation in a project are adopted as yours.
- Integrated content from tasks that a revision later retires stays in the checkout. The rebase names those paths; review and revert them yourself if needed.
- Two Stip sessions on the same project share a journal signed with a key kept in the plugin store, so each accepts the other's engine writes. It is not a boundary between sessions you run.
- `python3 -I`/`-E` ignore `PYTHONDONTWRITEBYTECODE`; integration skips the resulting bytecode.
- The mod API is early access. The surfaces exercised are the terminal and the desktop Code tab; the IDE and mobile surfaces were not qualified.

## What has been verified

Recorded in the change evidence for the mod (`claude-code-mod`), on builds 2.1.293 and 2.1.294:

- `claude plugin validate --strict` passes for the marketplace and package, and `claude plugin test packages/claude-code` passes 268 of 268 tests. The Python suite, including the runtime and `pending-docs` tests, passes.
- Live sessions covered the guards and their refusals, interruption, corrections, integrity restoration, re-entry handling, and models recorded per role (Opus apply, Fable verification, Haiku docs, Sonnet research).
- A sandbox project went through explore, button approval, two isolated parallel writers, integration, independent verification, check, docs and archive. Claude pressed **Approve** on the person's explicit delegation, and the engine recorded the approval as the user's. The person inspected the band and pane in the terminal and the desktop app.

Recorded in the evidence of the Ledger change (`stip-ledger-ui`); the evidence does not name the build:

- `claude plugin validate --strict` passes, and `claude plugin test packages/claude-code` passes 403 of 403 tests. The Python suite (145 tests) and the OpenCode checks pass.
- Live terminal sessions rendered every pane state (Setup, New change, Explore, Validate, Apply, Check, Docs, Archive, Settings) and the band at 140, 110, 80, 60, 50 and 40 columns without mid-word cuts. Motion was checked in `auto`, `calm` and `off`. **+ New** filled `/stip-explore` and kept the change bound.
- The desktop app showed the Plan tab live (picker, **+ New**, stages, Tasks, SVG plan graph, criteria ruler) and the band. The desktop Settings tab is covered by render tests only.
- A live correction refreshed non-owned files in its worktree; a reused change id had its stale records set aside once, with no restore loop; debug logs held no `no handler` or `hook failed` lines after band and pane presses.

The status line is refitted on terminal width changes; it was verified live at 40 and 140 columns.

Not yet exercised: `/plugin install` from the published GitHub marketplace.

## Re-qualify on a new build

Run these steps after updating Claude Code, before relying on the guards:

1. `claude --version`: note the build.
2. `claude plugin validate --strict packages/claude-code` (the mod) and `claude plugin validate --strict .` (the marketplace, from the repository root): both pass.
3. `claude plugin test packages/claude-code`: every test passes.
4. **Live guard probe** in a sandbox project with an approved change: delegate a task and have the worker run `echo STIP=$STIP_WORKER`; it must print the task marker (`<task>#<attempt>`). Then have it write a file outside its `write_paths`; the call must be denied by the ownership guard.
5. **Parallel writers:** with `max_shared_writers` at 2, delegate two writing tasks. Both must run in their own worktrees, and both must integrate after acceptance.
6. **Re-entry:** start Claude Code with `--debug` (or `--debug-file <path>`) and search the log for `tool.call skipped: re-entry` on worker calls. There must be none. Such a line indicates that a worker call ran outside the mod's normal hook path.
7. **Interface:** open `/stip` and check the band and the pane at about 80 and 140 columns: no line cut mid-word, the Plan and Settings tabs switch, **Approve** appears only when approvable. In the same debug log, presses must leave no `no handler is held` or `hook failed` line.
8. **Desktop app** (if you use it): bump the version in `packages/claude-code/.claude-plugin/plugin.json` or reinstall, open a new conversation on the project, then run `/stip` and repeat step 7.

If a step fails, treat the guards as unverified on that build and keep using the previous build or the skills alone.
