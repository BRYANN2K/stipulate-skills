# Native orchestration

Read this guide when preparing or executing an orchestrated change, configuring worker roles, or reconciling a native worker result. The seven skills remain the lifecycle interface. `/stip-settings` is a management command of the OpenCode plugin and of the Claude Code mod, not an eighth skill.

## Coordinator and worker responsibilities

Discovery stays in the main conversation with the coordinator's current model. The coordinator discusses intent with the user, chooses relevant extensions, prepares the contract, dispatches bounded work, integrates contributions, reconciles evidence and archives the result. Optional Research or specialist helpers answer specific questions; they do not take over discovery or decide product priorities. A conversation that needs no helper starts none.

In OpenCode, the coordinator explicitly calls `stip_research` for one read-only question during `explore` or `validate`. This uses the configured role/phase profile and the native subagent tool without requiring an implementation plan or approving anything. Helpers occupy the same project concurrency budget as implementation workers. Their private registry is separate from contract contributions: findings return to the main conversation and cannot mark acceptance criteria passed. The sidebar and `/stip-status` show them as research helpers, including unresolved launches. Use the native child session to inspect or interrupt a helper. The Claude Code mod provides the same `stip_research` tool; the coordinator then launches the helper from its ticket (see Claude Code mod tools). With other clients, use their configured native research/specialist agent.

A profile is a reusable assignment such as Backend or Verification. A task is an approved objective with criteria, dependencies and file ownership. A worker is an actual native session executing that task. Configuring a profile does not start a worker.

For orchestrated implementation, use at least one real worker. Additional workers need useful independence. Brief each worker with its objective, criterion IDs, relevant project facts and selected extension references, dependencies, owned paths and expected output. Load only the relevant extension guidance. Workers preserve existing edits, do not recursively spawn teams, do not approve or mutate lifecycle state, and do not commit or publish.

The coordinator inspects and integrates returned output before accepting it. A contribution reports changed paths, observed checks and results, unresolved gaps, and the candidate identity when available. Reuse the same native session for a correction to the same logical task; use a distinct session for unrelated work and independent verification. Reviewers look for concrete defects, unsupported assumptions and missing evidence without being instructed to agree or disagree.

Use at most two concurrent workers by default and one writer in a shared checkout. Read-only work may run alongside an implementation, but final verification needs a stable integrated candidate. Independent files alone do not provide filesystem isolation. Keep competing writes serialized unless the current host has explicit isolated-workspace support and controlled integration. The engine provides that support through `runtime reserve --isolate` and `runtime integrate`: with `max_shared_writers` above 1, each writing task gets its own Git worktree, and accepted work is integrated all-or-nothing. The Claude Code mod uses it; the OpenCode plugin does not yet.

## Stay inside the current host

| Current host | Delegation | Configuration |
|---|---|---|
| OpenCode 2 with the Stip plugin | Native OpenCode child sessions through the Stip tools | `/stip-settings` and the OpenCode section of `.workflow/config.json` |
| Codex | Native Codex subagents | Codex section projected into `.codex/agents/` |
| Claude Code with the Stip mod | Stip worker agent types (`stipulate:<role>`) launched from `stip_delegate` tickets | `/stip-settings` and the `claude-code` section of `.workflow/config.json` (plus personal and local scopes) |
| Claude Code without the mod | Native Claude Code subagents | Claude Code section projected into `.claude/agents/` |

OpenCode has no runtime picker and never launches Codex or Claude Code workers. The Claude Code mod launches only Claude Code agents. A model connected to an OpenCode provider remains an OpenCode worker. Codex and Claude Code configure and delegate in their own environments; they do not need the OpenCode plugin. Do not substitute another executable when a native capability is missing.

If required native delegation, model access, session observation or cancellation is unavailable, state the specific limitation and continue independent work. Preserve an existing v1 change's rules. Do not silently migrate it, invent worker activity, downgrade an approved orchestrated contract, or bypass host permissions.

## Profiles and model options

The project configuration stays at schema v1 and may contain:

```json
{
  "orchestration": {
    "version": 1,
    "defaults": {
      "model": "inherit",
      "effort": "inherit",
      "fast": "inherit",
      "max_workers": 2,
      "max_shared_writers": 1
    },
    "clients": {
      "opencode": {"roles": {}, "phases": {}, "phase_roles": {}},
      "codex": {"roles": {}, "phases": {}, "phase_roles": {}},
      "claude-code": {"roles": {}, "phases": {}, "phase_roles": {}}
    }
  }
}
```

Merge this section into the existing configuration; preserve extensions and unrelated settings. Each role/phase assignment may specify `model`, `effort`, `fast` or a binding to an existing native `agent`. Resolve from general to specific: worker defaults, phase defaults, role assignment, then phase-and-role assignment. Unassigned options inherit. Changing the selected model resets unresolved effort and Fast to that model's supported defaults rather than copying incompatible settings.

The Claude Code mod reads `clients["claude-code"]` from three scopes, personal (`~/.claude/stipulate.json`) ← project (`.workflow/config.json`) ← local (`.workflow/local.json`). Its profiles take `model`, `effort`, `isolate` and `agent`, but not `fast`. The section may also hold `enforcement.apply_gate` (`off`, `warn`, `block`; default `block`) and the `max_workers` and `max_shared_writers` limits under `defaults`. Unassigned models inherit the coordinator session's model, which the person changes with `/model` and `/effort`.

Roles may include Backend, API, Frontend, Architecture, Design, Database, Cloud, Delivery, Security, Verification, Documentation, Communication and optional Research. Use lowercase role IDs in files. `discovery` and `coordinator` are not configurable worker roles. Selected domain extensions inform the task; they do not require one worker per extension.

Effort and Fast are separate model-dependent capabilities. Show or materialize only verified supported combinations. A variant named `fast` is not proof of priority processing, and a low reasoning effort is not Fast mode. Never silently change a model to enable speed or enable a paid tier through installation. Running jobs retain their recorded selection; profile edits affect future jobs.

### Native file projection

Each installed skill bundles `scripts/configure_agents.py`. For example, from any directory:

```sh
python3 <skill-directory>/scripts/configure_agents.py --project <physical-project-root> --host codex --dry-run
python3 <skill-directory>/scripts/configure_agents.py --project <physical-project-root> --host codex
```

Use `--host claude-code` or `--host opencode` only when configuring that host. This is a setup namespace, not an execution-backend selector. With no assignments, the helper creates an inherited `stip-worker` definition. Configured roles and phase overrides create named native definitions. The helper returns bindings and records ownership in `.workflow/native-agents/<host>.json`; use its `bindings` to resolve `phase/role`, `*/role`, `phase/*`, then `*/*` when a more specific entry is absent.

Projection detects unowned filename collisions and changes to previously generated files; it preserves those files and reports the conflict. It does not edit credential stores, make model calls, install providers or override host-wide permissions. Restart the native client when required to discover new definitions. Refresh projections when the source profiles or verified model capabilities change.

Explicit model or effort choices require `--capabilities <snapshot.json>`. Explicit effort on an inherited model also needs `--coordinator-model <actual-model-id>`. The capability file is a verified snapshot of the current host, not a guessed model catalog:

```json
{
  "version": 1,
  "host": "opencode",
  "models": {
    "provider/model-id": {
      "efforts": ["low", "high"],
      "default_effort": "low",
      "variants": {
        "high-standard": {"effort": "high", "fast": false}
      }
    }
  },
  "agents": [],
  "source": "Record where and when these native capabilities were verified."
}
```

Replace illustrative identifiers with actually observed values. OpenCode projection requires one verified native variant matching an explicit effort/Fast combination. Model-only OpenCode assignments can retain native defaults. Codex and Claude Code model changes require a verified default effort or an explicit supported effort; the projector rejects independent per-worker Fast overrides for those hosts, so keep `fast: "inherit"`. An existing agent binding requires a verified native agent ID and cannot simultaneously override its model/options in file projection. A capability snapshot does not prove current provider access.

## Approval-bound task plans

New orchestrated changes explicitly use state schema v2; existing v1 changes retain their original digest and lifecycle until migrated. The project config does not change schema. The v2 `execution-plan.json` format is:

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "implement-login",
      "role": "backend",
      "phase": "apply",
      "objective": "Implement the approved login behavior.",
      "criteria": ["AC-1"],
      "depends_on": [],
      "write_paths": ["src/auth"]
    },
    {
      "id": "verify-login",
      "role": "verification",
      "phase": "check",
      "objective": "Exercise AC-1 against the integrated candidate.",
      "criteria": ["AC-1"],
      "depends_on": ["implement-login"],
      "write_paths": []
    }
  ]
}
```

Add the relevant documentation task when needed. Required task fields are shown above; `read_paths` and `expected_output` are optional. IDs and roles are lowercase hyphenated names. Phases are `apply`, `check` and `docs`. References must identify existing acceptance criteria and collectively cover the spec. Dependencies must be acyclic and cannot point to a later phase. Write paths are literal project-relative files or directory prefixes, never `.workflow`, Git internals, globs, traversal or symlinks. Same-phase overlapping owners need an explicit dependency. Model choices and execution progress do not belong in the plan.

Use `stip_plan` in OpenCode, or the bundled engine's `plan <id> --file <json-file>` command. `--file -` accepts stdin. An approved or previously started v1 change needs explicit `--migrate`; installing any replacement plan removes approval/check/docs and returns the change to draft while preserving its source baseline. Present the specification and semantic task plan for approval together. Plan task ordering or JSON formatting does not change the semantic digest, but changing responsibilities, dependencies, ownership or criteria invalidates approval. Older engines reject schema-v2 state.

## OpenCode tools

Use the plugin tools when they are actually available in the current OpenCode session. Do not type their names as if that proves invocation; inspect the returned tool result and real native session identity.

| Tool | Inputs and purpose |
|---|---|
| `stip_status` | Optional `change_id`: inspect lifecycle, plan and actual worker records |
| `stip_research` | `question`, optional `role`, `phase` (`explore` or `validate`), `change_id`, `background`: ask one read-only research or specialist question |
| `stip_plan` | `change_id`, `plan`, optional `migrate`: install the semantic plan before approval |
| `stip_delegate` | `change_id`, `task_id`, optional `instructions`, `correction`, `background`: launch or correct a ready native task |
| `stip_interrupt` | `change_id`, `task_id`, optional `reason`: interrupt a known native worker and wait for it to stop |
| `stip_contribution` | `change_id`, `task_id`, `decision` (`accepted` or `rejected`), `reason`: record coordinator review of returned output |

## Claude Code mod tools

The Claude Code mod registers the same names plus `stip_result`. Every tool is refused when called from a subagent. Full usage, settings and enforcement limits are in the repository's `docs/claude-code-plugin.md`.

| Tool | Inputs and purpose |
|---|---|
| `stip_status` | Optional `change_id`: lifecycle, plan, latest attempts, ready tasks, workers, helpers, limits and coordinator notes |
| `stip_research` | `question`, optional `title`, `role`, `phase`, `change_id`: reserve a read-only helper ticket |
| `stip_plan` | `change_id`, `plan`, optional `migrate`: install the plan before approval |
| `stip_delegate` | `change_id`, `task_id`, optional `instructions`, `correction`: run the dispatch gates and reserve a worker ticket |
| `stip_interrupt` | `change_id` + `task_id`, or `helper_id`; optional `reason`: cancel; every further call of that agent is denied |
| `stip_contribution` | `change_id`, `task_id`, `decision`, `reason`, optional `discard`: review; accepting an isolated attempt integrates it |
| `stip_result` | `change_id` + `task_id` (optional `attempt`), or `helper_id`: read the captured final answer |

`stip_delegate` and `stip_research` do not start the agent. They return a ticket with a `subagent_type` and a description. The coordinator then calls the Agent tool once with exactly those values. The mod supplies the brief, working directory and background mode, and confirms the real agent ID with the engine. An Agent call for a Stip type without a ticket, with another type or from a subagent is refused. An uncertain launch stays `unknown` and is not repeated. **Delegate** in the `/stip` pane reserves the ticket and fills the launch instruction into the prompt; the person presses Enter to send it.

With the mod active, approval comes only from the person: the band's Approve or `/stip-approve <id> confirm <digest>`. The model's own `approve` is refused or revoked.

The engine still owns `validate`, `approve`, `start`, `check`, `docs` and `archive`; use the relevant skill's bundled runtime for those transitions. The OpenCode panel and settings do not approve a contract or waive lifecycle gates; the Claude Code mod's Approve records the person's own approval through the engine. Selecting a phase opens its artifacts rather than executing it.

After `start`, dispatch ready apply tasks. Reconcile real results, integrate them, accept contributions and release dependent tasks. Before final check, run the planned independent check workers against the integrated candidate and accept their inspected contributions. Delegate docs after check, review the outputs and finalize documentation. If a returned task needs correction, reject it with a concrete reason and dispatch the scoped correction; do not simply accept it to clear the panel.

Do not repeat a dispatch when its tool call or connection outcome is uncertain. Reconcile its recorded native session first. A session that is idle or has returned may still be awaiting acceptance. Permission waits, failure and cancellation are real states, not evidence of success.

## Engine runtime commands

The bundled engine's `runtime` subcommands own dispatch gates, the worker registry, worktree isolation and integration for any host. The Claude Code mod calls them; the OpenCode plugin keeps its own logic. They print JSON on stdout and, on refusal, `{"error": ...}` on stderr with exit status 1. Mutations take `.workflow/.lock` and write atomically.

| Command | Flags |
|---|---|
| `runtime show <id>` | `--task`, `--attempt` |
| `runtime reserve <id>` | `--task`, `--correction`, `--isolate`, `--max-workers`, `--max-shared-writers`, `--host`, `--parent`, `--profile-json`; a helper uses `-` as id with `--helper <role> --question <text> [--phase explore\|validate]` |
| `runtime confirm <id>` | `--task` or `--helper`, `--attempt`, `--session` (required), `--model` |
| `runtime settle <id>` | `--task` or `--helper`, `--attempt`, `--status` (required: `running`, `waiting`, `returned`, `failed`, `cancelled`, `unknown`), `--result-file <file or ->`, `--last-tool`, `--error` |
| `runtime review <id>` | `--task`, `--decision accepted\|rejected`, `--reason` (8+ characters), `--discard` |
| `runtime integrate <id>` | `--task` |
| `runtime cancel <id>` | `--task` or `--helper`, `--reason`; the host must stop the session itself |
| `runtime revoke-approval <id>` | `--reason` (required), `--force-phase` |
| `runtime rebase <id>` | `--reason` |

For example:

```sh
python3 <skill-directory>/scripts/workflow.py runtime reserve add-login --task implement-login --isolate --host claude-code
python3 <skill-directory>/scripts/workflow.py runtime integrate add-login --task implement-login
```

`reserve` enforces a schema-v2 change, a current approval, a task in the approved plan, phase compatibility, accepted dependencies, no active previous attempt, `max_workers` across changes and helpers, and the writer limit. It records a `starting` job before any launch. Parallel writers need `max_shared_writers` above 1 and `--isolate`; without isolation, one writer runs at a time. An isolated worktree starts from a snapshot of the working tree: tracked changes, and untracked files inside the task's owned paths.

`integrate` applies an accepted isolated attempt to the main checkout, limited to its `write_paths`, all-or-nothing. It refuses with a `conflicts` list when an owned file changed in the main checkout since the snapshot, or when the worker touched paths outside its ownership. Untracked build artefacts (`__pycache__/*.pyc`, `.pytest_cache/`) and gitignored files are never integrated; they are reported under `skipped`. Any engine mutation is refused while `STIP_WORKER` is set in the environment.

## Revising an approved contract

To add or remove criteria, edit `spec.md` first, then install the matching plan, validate, and approve the new digest. A plan must reference existing criteria and cover them all, so the spec has to change before the plan.

After re-approval, the registry still refers to the previous contract and dispatch is refused until it is rebased. The Claude Code mod rebases automatically when the person re-approves, and offers **Rebase registry** in its pane. Elsewhere, run `runtime rebase <id>`. The result reports:

- `kept`: unchanged tasks keep their acceptance and integration;
- `reopened`: changed tasks and their dependants become rejected and must be redelegated;
- `retired`: jobs of tasks removed from the plan move to `retired_jobs`.

Rebase is refused while workers are active or unknown. Content that a retired task already integrated stays in the checkout; review it yourself.

## Criteria completed by documentation

A criterion covered only by docs-phase tasks cannot pass before docs start. In the `check` report, such a criterion may be `pending-docs` when every other criterion is `passed`; the change then becomes `checked`. A criterion covered by any apply or check task cannot be `pending-docs`. Run the docs tasks, then re-run `check` with those criteria `passed` and their evidence. `docs` and `archive` refuse while any criterion is still `pending-docs`.

## Native run records and finalization

OpenCode's plugin maintains its private registry at `.workflow/.runtime/<change-id>/state.json`. The Claude Code mod maintains the same registry through the engine's `runtime` commands. For Codex, and Claude Code without the mod, the coordinator maintains equivalent records from observed native session activity; file projection only configures agents and does not launch or monitor them. Use actual native session IDs, never fabricated placeholders. Keep this directory ignored by Git.

The registry format is `{ "version": 1, "change_id": "...", "contract_digest": "...", "jobs": [...] }`. A job records `task_id`, `session_id`, a positive integer `attempt`, execution `status` and separate `acceptance`. Read the current digest from `status <id> --compact`. Record a dispatch reservation before launch and associate the actual native session once known. A lost or uncertain outcome remains `unknown` until reconciled.

Supported execution states are `queued`, `starting`, `running`, `waiting`, `unknown`, `correction`, `returned`, `failed` and `cancelled`. Acceptance is `pending`, `accepted` or `rejected`. Only a returned native session may have an accepted contribution. A correction retains the task ID with a new attempt; the same session may be reused for that task. Different logical tasks use different sessions.

All writers, including native-host coordinators recording run state, must use short `.workflow/.lock` exclusion and atomic JSON replacement. Reserve the lock by exclusive creation, release only a lock you acquired, and never hold it while awaiting a native session or network response. An existing lock signals another writer; do not remove it without reconciling that owner. The engine and plugin use this exclusion to prevent dispatch reservations racing lifecycle finalization. This is coordination, not an OS sandbox.

Before every finalization gate, reconcile real session states. The engine requires a current registry and refuses active, waiting, correcting or unknown workers. It also requires accepted latest attempts for all apply/check tasks before `check`, and every planned task before `docs` or `archive`. Older accepted attempts cannot conceal an unresolved retry.

Accepted contributions still need fresh evidence against the integrated files. Run the lifecycle's snapshot and criterion checks; renewed source changes invalidate relevant observations. Keep finalization with the coordinator. During v2 archive, the engine creates a bounded `execution-summary.json` with task/session/model provenance and contract/source digests, excluding prompts, credentials, usage data and transcripts. Review the generated summary against native outcomes. Do not stage the private registry. Valid registry syntax is not proof that work or checks happened.
