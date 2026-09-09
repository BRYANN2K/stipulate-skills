# Native orchestration

Read this guide when preparing or executing an orchestrated change, configuring worker roles, or reconciling a native worker result. The seven skills remain the lifecycle interface. `/stip-settings` is an OpenCode plugin management command, not an eighth skill.

## Coordinator and worker responsibilities

Discovery stays in the main conversation with the coordinator's current model. The coordinator discusses intent with the user, chooses relevant extensions, prepares the contract, dispatches bounded work, integrates contributions, reconciles evidence and archives the result. Optional Research or specialist helpers answer specific questions; they do not take over discovery or decide product priorities. A conversation that needs no helper starts none.

In OpenCode, the coordinator explicitly calls `stip_research` for one read-only question during `explore` or `validate`. This uses the configured role/phase profile and the native subagent tool without requiring an implementation plan or approving anything. Helpers occupy the same project concurrency budget as implementation workers. Their private registry is separate from contract contributions: findings return to the main conversation and cannot mark acceptance criteria passed. The sidebar and `/stip-status` show them as research helpers, including unresolved launches. Use the native child session to inspect or interrupt a helper. With other clients, use their configured native research/specialist agent.

A profile is a reusable assignment such as Backend or Verification. A task is an approved objective with criteria, dependencies and file ownership. A worker is an actual native session executing that task. Configuring a profile does not start a worker.

For orchestrated implementation, use at least one real worker. Additional workers need useful independence. Brief each worker with its objective, criterion IDs, relevant project facts and selected extension references, dependencies, owned paths and expected output. Load only the relevant extension guidance. Workers preserve existing edits, do not recursively spawn teams, do not approve or mutate lifecycle state, and do not commit or publish.

The coordinator inspects and integrates returned output before accepting it. A contribution reports changed paths, observed checks and results, unresolved gaps, and the candidate identity when available. Reuse the same native session for a correction to the same logical task; use a distinct session for unrelated work and independent verification. Reviewers look for concrete defects, unsupported assumptions and missing evidence without being instructed to agree or disagree.

Use at most two concurrent workers by default and one writer in a shared checkout. Read-only work may run alongside an implementation, but final verification needs a stable integrated candidate. Independent files alone do not provide filesystem isolation. Keep competing writes serialized unless the current host has explicit isolated-workspace support and controlled integration.

## Stay inside the current host

| Current host | Delegation | Configuration |
|---|---|---|
| OpenCode 2 with the Stip plugin | Native OpenCode child sessions through the Stip tools | `/stip-settings` and the OpenCode section of `.workflow/config.json` |
| Codex | Native Codex subagents | Codex section projected into `.codex/agents/` |
| Claude Code | Native Claude Code subagents | Claude Code section projected into `.claude/agents/` |

OpenCode has no runtime picker and never launches Codex or Claude Code workers. A model connected to an OpenCode provider remains an OpenCode worker. Codex and Claude Code configure and delegate in their own environments; they do not need the OpenCode plugin. Do not substitute another executable when a native capability is missing.

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
| `stip_plan` | `change_id`, `plan`, optional `migrate`: install the semantic plan before approval |
| `stip_delegate` | `change_id`, `task_id`, `instructions`, optional `correction`: launch or correct a ready native task |
| `stip_contribution` | `change_id`, `task_id`, `decision` (`accepted` or `rejected`), `reason`: record coordinator review of returned output |
| `stip_status` | Optional `change_id`: inspect lifecycle, plan and actual worker records |

The engine still owns `validate`, `approve`, `start`, `check`, `docs` and `archive`; use the relevant skill's bundled runtime for those transitions. The plugin's panel and settings do not approve a contract or waive lifecycle gates. Selecting a phase opens its artifacts rather than executing it.

After `start`, dispatch ready apply tasks. Reconcile real results, integrate them, accept contributions and release dependent tasks. Before final check, run the planned independent check workers against the integrated candidate and accept their inspected contributions. Delegate docs after check, review the outputs and finalize documentation. If a returned task needs correction, reject it with a concrete reason and dispatch the scoped correction; do not simply accept it to clear the panel.

Do not repeat a dispatch when its tool call or connection outcome is uncertain. Reconcile its recorded native session first. A session that is idle or has returned may still be awaiting acceptance. Permission waits, failure and cancellation are real states, not evidence of success.

## Native run records and finalization

OpenCode's plugin maintains its private registry at `.workflow/.runtime/<change-id>/state.json`. For Codex and Claude Code, the coordinator maintains equivalent records from observed native session activity; file projection only configures agents and does not launch or monitor them. Use actual native session IDs, never fabricated placeholders. Keep this directory ignored by Git.

The registry format is `{ "version": 1, "change_id": "...", "contract_digest": "...", "jobs": [...] }`. A job records `task_id`, `session_id`, a positive integer `attempt`, execution `status` and separate `acceptance`. Read the current digest from `status <id> --compact`. Record a dispatch reservation before launch and associate the actual native session once known. A lost or uncertain outcome remains `unknown` until reconciled.

Supported execution states are `queued`, `starting`, `running`, `waiting`, `unknown`, `correction`, `returned`, `failed` and `cancelled`. Acceptance is `pending`, `accepted` or `rejected`. Only a returned native session may have an accepted contribution. A correction retains the task ID with a new attempt; the same session may be reused for that task. Different logical tasks use different sessions.

All writers, including native-host coordinators recording run state, must use short `.workflow/.lock` exclusion and atomic JSON replacement. Reserve the lock by exclusive creation, release only a lock you acquired, and never hold it while awaiting a native session or network response. An existing lock signals another writer; do not remove it without reconciling that owner. The engine and plugin use this exclusion to prevent dispatch reservations racing lifecycle finalization. This is coordination, not an OS sandbox.

Before every finalization gate, reconcile real session states. The engine requires a current registry and refuses active, waiting, correcting or unknown workers. It also requires accepted latest attempts for all apply/check tasks before `check`, and every planned task before `docs` or `archive`. Older accepted attempts cannot conceal an unresolved retry.

Accepted contributions still need fresh evidence against the integrated files. Run the lifecycle's snapshot and criterion checks; renewed source changes invalidate relevant observations. Keep finalization with the coordinator. During v2 archive, the engine creates a bounded `execution-summary.json` with task/session/model provenance and contract/source digests, excluding prompts, credentials, usage data and transcripts. Review the generated summary against native outcomes. Do not stage the private registry. Valid registry syntax is not proof that work or checks happened.
