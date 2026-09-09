# Orchestrated change contract

Stip's lifecycle engine supports an explicit orchestration contract for native workers. The coordinator owns approval, acceptance of contributions, final checks, documentation completion and archive. Discovery remains in the main conversation; a bounded research helper does not own discovery.

The engine validates local records. It does not launch native sessions, enforce filesystem permissions, prove that a session exists, or observe the truth of a worker's results. The native host integration must reconcile sessions and inspect contributions before recording them. The existing snapshot and scoped-commit checks still apply.

## Compatibility and explicit adoption

Project `.workflow/config.json` stays at `schema_version: 1`. A change continues to use state schema v1 until its coordinator explicitly installs an execution plan. Existing v1 contracts preserve their digest and lifecycle behavior, including already approved or applying changes.

An orchestrated change has `schema_version: 2` in its `state.json`. Older engines reject that state rather than silently ignoring its task obligations. Its `execution-plan.json` has a separate `version: 1` format.

From the repository root, before approval:

```sh
python3 scripts/workflow.py plan add-authentication --file /path/to/plan.json
python3 scripts/workflow.py validate add-authentication
# After explicit user approval of the current specification and plan:
python3 scripts/workflow.py approve add-authentication --by user --ack-user-approval
python3 scripts/workflow.py start add-authentication
```

An installed skill carries its own copy of `scripts/workflow.py`; use the path in that skill when operating another project. Pass `--root /physical/project/path` before the command when necessary. `--file -` reads JSON from standard input.

An approved or previously started v1 change needs an explicit migration:

```sh
python3 scripts/workflow.py plan add-authentication --file /path/to/plan.json --migrate
```

Installing or replacing a plan sets the phase to `draft` and removes approval, check and documentation attestations. It preserves any source baseline, initial HEAD and preexisting dirty-file record; migration does not absorb unrelated changes into a new baseline. The current contract must be reviewed and approved again. Plan replacement is refused while recorded workers are active or their outcome is unknown.

Changing formatting or ordering tasks, criteria, dependency lists or path lists does not change the semantic plan digest. Changing an objective, responsibility, criterion association, dependency, permitted path or expected output does. Human `proposal.md`, `spec.md` and optional `tasks.md` retain their existing byte-sensitive approval rules. Model assignments, native session identifiers and mutable progress are not part of the approved task plan.

## Execution plan

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
      "write_paths": ["src/auth"],
      "read_paths": [".workflow/changes/add-authentication/spec.md"],
      "expected_output": "Changed paths, exercised checks, results and remaining uncertainties."
    },
    {
      "id": "verify-login",
      "role": "verification",
      "phase": "check",
      "objective": "Exercise AC-1 against the integrated candidate.",
      "criteria": ["AC-1"],
      "depends_on": ["implement-login"],
      "write_paths": []
    },
    {
      "id": "document-login",
      "role": "documentation",
      "phase": "docs",
      "objective": "Document the verified login behavior for API consumers.",
      "criteria": ["AC-1"],
      "depends_on": ["verify-login"],
      "write_paths": ["docs/authentication.md"]
    }
  ]
}
```

Required task fields are `id`, `role`, `phase`, `objective`, `criteria`, `depends_on` and `write_paths`. `read_paths` and `expected_output` are optional. Unknown keys are rejected so semantic instructions cannot be silently omitted from validation.

- A plan has 1–200 tasks with unique lowercase hyphenated IDs and role names. Roles are customizable; `discovery` is reserved for the main coordinator.
- Phases are `apply`, `check` and `docs`. Optional exploration helpers precede the approved execution contract and remain native host activity.
- Each task references one or more existing acceptance criteria, without duplicates. Collectively the plan covers every criterion in the specification.
- Dependencies reference existing tasks, cannot point to a later phase, and must form an acyclic graph.
- Paths are canonical project-relative literal files or directory prefixes. Root ownership, traversal, symlinks, globs and Git internals are rejected. Worker write ownership cannot include `.workflow` metadata.
- Same-phase tasks with overlapping write prefixes must have a direct or transitive dependency. Prefix comparisons are case-insensitive to avoid aliases on common macOS filesystems. Different phases are ordered by the lifecycle.

Path ownership is a coordination contract, not a sandbox. The host must apply actual worker permissions and enforce the configured concurrency limit. A single shared-checkout writer remains the default; parallel write sessions need isolation and controlled integration.

## Mutable native run registry

The host integration stores live associations in `.workflow/.runtime/<change-id>/state.json`, outside approved files and outside source snapshots:

```json
{
  "version": 1,
  "change_id": "add-authentication",
  "contract_digest": "digest-returned-by-workflow-status",
  "jobs": [
    {
      "task_id": "implement-login",
      "session_id": "native-child-session-id",
      "attempt": 1,
      "status": "returned",
      "acceptance": "accepted"
    }
  ]
}
```

The registry is required to finalize a v2 change. It must identify the current semantic contract. Its `jobs` may include additional host provenance fields, but the engine only consumes the fields above.

Each job names a task in the current plan and a positive integer attempt. A task/attempt pair is unique. A native session may be reused for another attempt of the same logical task, but it cannot own unrelated tasks. This also prevents implementation and independent verification tasks from claiming the same native session.

Execution states are `queued`, `starting`, `running`, `waiting`, `unknown`, `correction`, `returned`, `failed` and `cancelled`. Acceptance is separately `pending`, `accepted` or `rejected`. An accepted contribution requires `status: returned` and a nonempty native session ID. A completed tool call or a finished native session alone does not constitute acceptance.

Every finalization gate refuses `starting`, `running`, `waiting`, `unknown` or `correction` anywhere in the registry, including an older attempt. It also checks the latest attempt of every task required at that gate:

| Engine command | Required accepted contributions |
|---|---|
| `check` | All planned `apply` and `check` tasks |
| `docs` | All planned `apply`, `check` and `docs` tasks |
| `archive` | All planned `apply`, `check` and `docs` tasks |

A failed, cancelled, queued or returned-but-unaccepted latest attempt blocks its phase's finalization. An old accepted attempt cannot hide an unresolved retry. A known cancelled older attempt can remain as provenance.

Use the same `.workflow/.lock` exclusion protocol for short registry writes and dispatch reservations as the engine uses for mutations: create it exclusively, atomically replace the registry file, and release it only if acquired by the writer. Do not keep this lock while awaiting network operations or native worker completion. Reconcile native sessions after reconnect or restart before reserving another dispatch; missing contact means `unknown`, not a safe retry.

Ignore `.workflow/.runtime/` in version control. The archive transaction does not stage that directory. For v2, the engine generates `execution-summary.json` during archive and includes it in the scoped commit. It records the latest accepted attempt for each task, native session IDs, selected and runtime-confirmed models, effort/Fast, and contract/source digests. Missing optional metadata remains null. The export is capped at 256 KiB and excludes prompts, transcripts, review prose, credentials and usage data. A failed archive commit restores any prior summary bytes. Review this provenance alongside actual evidence; it does not alter the approved contract or prove that registry claims are truthful.

## Read APIs for the plugin

```sh
python3 scripts/workflow.py plan add-authentication
python3 scripts/workflow.py status add-authentication --compact
```

`plan` returns the validated normalized plan. `status --compact` returns change identity, target, selected extensions, phase, update time, `approval_current`, `contract_digest`, and—for v2—the task plan and a compact runtime summary. It omits potentially large baseline and verification snapshot maps. Runtime validation failures appear as `runtime.error` so a panel can display an actionable reconciliation problem. A malformed semantic contract still returns a command error.

The default `status` command retains the complete state output for existing consumers, with additional contract and orchestration information. Read commands do not advance the lifecycle. Selecting a phase in the UI should open its contract or evidence, not call a mutating command.

The registry is an attestation interface in a trusted local project. Valid syntax does not prove a native session exists, a worker obeyed its path scope, or reported tests ran. The host verifies those observations; the coordinator accepts the results; the engine checks contract consistency, quiescence attestations and fresh filesystem evidence before finalization.
