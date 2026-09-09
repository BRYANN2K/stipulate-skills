# Stipulate native delegation and OpenCode 2 plugin

Revised September 9, 2026 following the user's scope correction and clarification that discovery belongs to the main coordinator. This replaces the earlier cross-runtime execution proposal.

## 1. Product boundary

The seven Stip skills guide native delegation inside the coding client the user is already using. The OpenCode plugin adds a settings menu and a right-hand panel. Codex and Claude Code receive file-based configuration and skill guidance for their own native subagents.

| Host | Workers | Configuration | Stip interface |
|---|---|---|---|
| OpenCode 2 | Native OpenCode child sessions | /stip-settings backed by project/personal files | Settings, lifecycle sidebar, worker details |
| Codex | Native Codex subagents | Supported native agent/configuration files | Existing Codex interface |
| Claude Code | Native Claude Code subagents | Supported native agent/configuration files | Existing Claude Code interface |

The OpenCode plugin has no runtime picker, external worker adapter, credential bridge, or cross-runtime fallback. It never starts Codex or Claude Code processes. A GPT or Claude model configured with an OpenCode provider still executes through a native OpenCode worker.

## 2. Shared behavior in the seven skills

The user speaks to one coordinator. It explores intent, selects relevant extensions, prepares the shared contract, delegates bounded tasks, integrates outputs, organizes corrections, and reconciles evidence.

Domain extensions describe the professional process. Worker profiles describe which native agent/model carries out each contribution. Installing an extension does not launch an agent.

### Discovery stays in the main conversation

Discovery is a responsibility of the main coordinator, not a default worker role. Keep the user's idea, priorities, tradeoffs, constraints and decisions in the active conversation. The coordinator's current model performs this work; the user changes it through the host's ordinary model selector.

During exploration, the coordinator may ask a native worker a bounded question: inspect an existing authentication flow, compare two integration options, locate design-system components, or examine a specific threat. Call this optional role Research or the relevant specialty. The worker returns findings to the coordinator; it does not take over discovery, interview the user independently, approve scope, or decide product priorities.

There is no automatic research worker when conversation alone is sufficient. Research defaults to the inherited model if it is actually needed and no profile was configured. The sidebar shows Research only after a real delegated task starts.

| Skill | Coordinator and worker behavior |
|---|---|
| stip-bootstrap | Adopt the project, identify the host, preserve its configuration and prepare inherited worker defaults. Map existing assets before proposing replacements. |
| stip-explore | Lead discovery in the main conversation. Load relevant extension guidance and delegate only bounded research or specialty questions that improve the discussion. |
| stip-validate | Prepare the shared specification and task/dependency plan; collect useful challenges and record explicit approval. |
| stip-apply | Check approval and baseline, delegate implementation, coordinate dependencies, integrate results and request corrections. |
| stip-check | Verify the integrated result against every criterion with fresh evidence, preferably using a worker distinct from the implementer. |
| stip-docs | Delegate affected documentation grounded in checked behavior and selected domain guidance. |
| stip-archive | Ensure workers have stopped writing, reconcile state, promote the specification, archive and create the scoped commit. |

In orchestrated mode, a small implementation task still uses one native worker. More workers require useful independence. The coordinator owns lifecycle mutations; workers contribute to the active phase without recursively invoking the entire approval/apply/archive procedure.

Approval and execution retain their existing semantics: stip-apply starts approved work; an explicit approve-and-apply request can authorize both. Routine corrections within scope do not require repeated confirmations. New scope returns to validation.

## 3. Model selection by role

Worker profiles describe reusable specialties, not permanently running agents. Recommended editable roles are Research, Architecture advice, Backend, API, Frontend, Design, Database, Cloud, Delivery, Security, Verification, Documentation and Communication. Discovery is intentionally absent: it remains with the coordinator.

Several extensions may inform a task, but it has one primary execution owner. A role does not mean a dedicated worker must always exist. For a small endpoint, one implementation worker can cover backend and API guidance; create separate workers only when their contributions can be meaningfully separated.

| Worker profile | Typical bounded mission | Usual phases |
|---|---|---|
| Research | Inspect the repo, check a dependency, compare a narrow set of options | Bootstrap or explore, when useful |
| Architecture advice | Examine an interface boundary, migration or proposed decomposition | Explore or validate; coordinator retains the decision |
| Backend | Implement scoped server behavior and its checks | Apply |
| API | Implement or verify an agreed interface and error behavior | Apply or check |
| Frontend | Build approved UI states using existing project conventions | Apply |
| Design | Produce requested journeys/components or inspect existing design assets | Explore or apply, when selected |
| Database | Implement a scoped schema change and verify its migration | Apply or check |
| Cloud / Delivery | Implement approved infrastructure or delivery changes | Apply or check |
| Security | Examine relevant threats, review a candidate and verify negative cases | Explore, validate or check |
| Verification | Exercise acceptance criteria against an identified candidate | Check |
| Documentation | Update affected reader-facing documentation | Docs |
| Communication | Draft requested release/build-in-public material from evidence | Docs, when selected; publication stays separately authorized |

Resolve assignments in this order:

1. Explicit task assignment.
2. Phase-and-role assignment, such as security during check.
3. Role assignment.
4. Phase default.
5. Project worker default.
6. Coordinator's effective model and compatible settings.

An unset assignment inherits. An explicitly configured but unavailable assignment reports a problem; optional configured fallbacks stay within the current host and are recorded.

A fresh setup requires no role-by-role configuration. When changing to a different model without explicit effort/speed choices, use that model's supported defaults rather than copying incompatible settings.

OpenCode documents child model inheritance and model/variant preferences. It also states that children currently use their own configured permissions rather than automatically receiving a restricted parent policy. Configure and test Stip worker restrictions explicitly. [OpenCode agents](https://opencode.ai/v2/docs/agents/)

## 4. Model-dependent effort and Fast

Choose a model from the current project's OpenCode catalog first. The selected provider/model determines which effort, variant and speed controls can be offered. Recompute compatible choices whenever the model changes.

- Effort: only supported values.
- Fast: on/off only when the selected provider/model has a verified speed-tier mapping.
- Unsupported or unknown: unavailable control with an explanation.
- Inherit: show the effective selection when resolvable.
- Advanced variants: preserve native options that cannot be represented faithfully by simple controls.

Effort and Fast are independent. A variant named fast may only reduce reasoning effort; its name does not prove priority processing. OpenCode variants are model-specific request overlays. [OpenCode models](https://opencode.ai/v2/docs/models/)

Never silently switch the model to enable Fast. Installation does not enable paid speed options. Running jobs retain their original settings; edits apply to future jobs. Record requested and runtime-confirmed options separately where confirmation is available.

Codex and Claude Code receive supported settings through their own files and native delegation mechanisms. Check exact per-worker support before generating fields. If a setting is only supported at session or host scope, document that limitation rather than claim independent worker control.

## 5. OpenCode /stip-settings

This is a plugin management command, not an eighth lifecycle skill. There is no runtime column or executable-path setup.

Illustrative layout; models come from the user's actual OpenCode catalog:

~~~text
Stipulate settings                       Scope: This project

Coordinator      Current session
Default worker   Inherit coordinator
Concurrency      2 workers · 1 shared writer

Discovery        Main conversation

Role             Model              Effort       Fast
Backend          Choose…            —            —
API              Inherit            Inherit      Inherit
Frontend         Choose…            —            —
Security         Choose…            —            —
Verification     Inherit            Inherit      Inherit
Documentation    Inherit            Inherit      Inherit

Optional helpers: Research · Architecture · Design · Cloud…

Selected role: Backend
  Model          Search available OpenCode models…
  Effort         Options for the selected model
  Fast           Available only when supported

[Advanced] [Review changes] [Save]
~~~

Support model/provider search, role assignments, inheritance reset, optional binding to an existing native OpenCode subagent, phase overrides, concurrency, effective-setting provenance, and validated atomic saves. Keep advanced controls collapsed by default.

Discovery is an informational line, not another model override. Optional helpers use the same profile editor as implementation roles. Users may configure the Research helper without causing it to launch automatically. Display the current coordinator model near the inheritance controls so defaults are understandable.

The advanced section holds maximum active workers, shared-writer limit, same-host fallback order, optional usage/time limits, phase-specific overrides, and the policy for reusing a worker for follow-up corrections. These controls change execution behavior, never waive approval or evidence requirements.

Personal defaults, project configuration, and optional git-ignored local overrides are supported. The menu reads/writes the same configuration used by the skills. Native worker definitions are owned projections of these settings, with preservation of unrelated agents and detection of customized generated content.

## 6. OpenCode sidebar

Keep the approved presentation:

~~~text
STIPULATE
add-authentication

✓ Bootstrap
✓ Explore
✓ Validate · approved
▶ Apply
○ Check
○ Docs
○ Archive

Extensions
backend · security

AGENTS · 2 running
● Backend   Implementing login
● Security  Reviewing sessions
✓ Research  Existing auth inspected

/stip-settings
~~~

All workers in this panel are native OpenCode sessions. Selecting a worker opens its native session or detail view: task, actual model, effective settings where known, last observable action, elapsed time, files, results and reported usage.

Lifecycle progress comes from the Stip engine; activity comes from actual sessions. A configured worker is not an active worker, and process completion is not proof that criteria passed. Project bootstrap readiness, change preparation and approval need an explicit projection onto the seven displayed steps.

Support waiting reasons, failure, cancellation, restart reconciliation, a change selector, explicit session/change bindings, narrow terminals, keyboard navigation, and statuses understandable without color. Do not claim to expose hidden reasoning.

Sidebar slots, commands and session navigation are documented. Exact positioning below MCP and behavior in the installed beta require a real terminal check. [OpenCode CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli)

### Compact sidebar versus detail view

Keep three permanent blocks: selected change and lifecycle, relevant extensions, and actual worker activity. The existing native conversation remains the coordinator's workspace; do not add it to the worker count. Discovery is shown through the Explore step, without a fictitious Discovery worker.

Use at most two short lines per visible worker: role/status, then its current observable task or action and elapsed time. Model, effort, Fast, full paths, tool output and usage belong in the selected worker's detail view. Prioritize jobs needing attention and active workers; collapse queued jobs and older completed contributions when height is limited. The cycle remains visible while long activity lists scroll or collapse.

Selecting a lifecycle step opens its relevant artifact/status rather than automatically executing that step. Selecting the change title opens the change selector. Selecting a worker opens its details with an explicit Open session action. Settings opens /stip-settings. Support keyboard equivalents and a clear return path to the coordinator's session.

### States worth making visible

| Situation | Sidebar behavior |
|---|---|
| Project has no Stip setup | Offer stip-bootstrap; do not invent a completed cycle |
| Project ready, no selected change | Show project readiness and offer change selection/exploration |
| Discovery conversation | Highlight Explore; show helpers only if real tasks were delegated |
| Draft awaiting user review | Show Validate with Awaiting approval |
| Applying | Highlight Apply and show actual active workers |
| Checking | Show reported passed/failed/unverified criterion counts against the identified candidate |
| Permission or other blocker | Show a concise reason and a way to inspect the affected job |
| Approval/evidence stale | Remove the misleading completed status and explain what became stale |
| Archived | Show Archived and the verified commit locator; preserve access to the record |
| Connection lost | Mark worker activity as reconnecting/unknown until reconciled |

Use distinct symbols plus text for complete, active, pending, failed, waiting and returned-for-review. A completed native worker must not receive the same accepted-result marker until its contribution has actually been accepted. Avoid a generic percentage across the seven phases: they are not equal units of work. Task completion and verified criteria may be shown separately when their counts are trustworthy.

### Visual treatment

Use OpenCode theme tokens, restrained separators and a single active-step accent. A small activity indicator is sufficient; no moving timeline, flashing badge or per-token animation. Truncate long change/task labels in the compact view and reveal the complete text in details. Keep the panel usable at the width visible in the user's screenshot and adapt to narrow terminals without obscuring the conversation.

## 7. File-based configuration across clients

Keep .workflow/config.json as the declaration of Stip orchestration defaults and assignments. Separate client sections prevent interpreting an OpenCode model ID as a Codex or Claude Code ID. These sections are configuration namespaces, not selectable execution backends.

Proposed conceptual shape; not yet a released schema:

~~~json
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
      "opencode": {"roles": {}, "phase_roles": {}},
      "codex": {"roles": {}, "phase_roles": {}},
      "claude-code": {"roles": {}, "phase_roles": {}}
    }
  }
}
~~~

The OpenCode plugin consumes its section plus shared defaults. Codex and Claude Code setup translates their respective sections into supported native configuration. Users configure those hosts through files and natural-language requests to their agent.

Preserve user instructions, existing agents, organizational constraints and client conventions. Use generated-file ownership and collision checks. Verify exact native paths, precedence and supported options before publishing installation examples. No native credential stores are modified.

## 8. Implementation architecture

Three components are sufficient:

1. **Stip core and skill guidance:** contracts, approval, task descriptions, roles, evidence and native delegation instructions.
2. **Client configuration support:** validated native file mappings for OpenCode, Codex and Claude Code. It configures each host's own agents, without executing another client.
3. **OpenCode plugin:** server-side state/config integration and TUI settings/sidebar using native OpenCode workers.

Retain the offline Python lifecycle engine. Keep OpenCode-specific behavior in the plugin. Share small routing/data contracts where useful; do not build a generic cross-runtime process scheduler or App Server/Claude CLI execution bridges.

The plugin registers or resolves the relevant Stip worker definitions. Native delegation executes work. Stip adds task/criterion association, ownership, concurrency rules and completion checks without replacing OpenCode's model/tool loop.

A worker receives the objective, criterion IDs, relevant project context and extension phase references, file ownership, dependencies and expected evidence. It does not receive the whole extension catalog. Its contribution reports changed paths, observed checks, results, blockers and uncertainty.

## 9. The coordinator's working loop

The coordinator remains accountable for the result even when it delegates all implementation. It is responsible for connecting the user's intent to the contract, choosing useful tasks, resolving conflicts, identifying missing work, and explaining the actual outcome.

Its loop during execution is:

1. Read the approved contract and latest project state.
2. Identify ready tasks, their dependencies, owners, relevant criteria and file boundaries.
3. Resolve each task's configured model and compatible settings.
4. Dispatch only useful ready tasks within concurrency and permission limits.
5. Continue coordination or other authorized independent work while workers run.
6. Inspect returned artifacts and observations; distinguish finished output from accepted output.
7. Request bounded corrections, integrate acceptable contributions, and release dependent tasks.
8. Freeze the integrated candidate, request verification, and reconcile every criterion.
9. Coordinate documentation and close through the existing archive rules.

The coordinator may inspect, integrate and resolve local conflicts; it should not quietly take over substantial implementation because a worker failed. It first diagnoses the failure, reuses or reassigns the task, or reports the unsupported delegation capability. A deliberately selected single-agent compatibility mode remains available for clients that cannot delegate; it must be clearly identified.

Workers return questions to the coordinator. Routine questions are answered from the contract and repo. Only decisions that materially affect scope or an unresolved user preference reach the user, bundled when possible. One blocked task does not stop unrelated ready work.

## 10. Worker lifecycle and task handoff

### Before launch

Each task has a stable ID, role, phase, criterion IDs, dependencies, read/write scope, candidate/baseline identity, and expected output. Include selected extension references, not the whole installed catalog. The coordinator's briefing gives facts and necessary constraints without prescribing the conclusions of research or review.

File ownership is explicit even when there is only one writer. Shared files, such as a lockfile or API schema, have an integration owner. If a worker discovers work outside its boundary, it returns the need to the coordinator instead of changing another task's files independently.

### Running and follow-up

One task is bound to an actual native child session. Keep the same worker for a scoped correction when its context remains relevant. Start a fresh worker for an unrelated task or a verification assignment that needs independence. Store the task/session association; a profile name alone is not a run identifier.

Workers may report progress, ask for clarification, identify conflicts or return a result. Do not force periodic generated progress prose when native tool events already show activity. Worker recursion is disabled by default; additional task decomposition returns to the coordinator.

### Completion and acceptance

A result includes:

- What was produced and which paths changed.
- Which criteria it contributes to.
- What was actually exercised, with command/result or artifact locators.
- Failures, uncertainties, skipped checks and dependencies.
- Questions or proposed changes that require a coordinator decision.

Maintain two distinct states: native execution state and coordinator acceptance. A native session can complete while its result still needs inspection, integration or correction. Only reconciled evidence advances the workflow.

Suggested task progression:

~~~text
queued → ready → starting → running → returned → accepted
                              │           └→ correction → running
                              ├→ waiting for permission/input
                              ├→ failed
                              └→ cancelled
~~~

Lost contact produces unknown execution status until reconciliation. A retry receives a new attempt ID while retaining the logical task ID. Never repeat uncertain writes solely because a connection ended.

## 11. Dependencies and parallel work

The task plan follows the production dependencies of the actual change. It is not a compulsory sequence of departments. Reuse existing architecture, APIs, design systems and operational conventions where they already satisfy the contract.

Illustrative authentication change, assuming the selected domains and scope justify these tasks:

~~~text
Main coordinator: explore with the user and prepare approval
  Optional Research: inspect existing authentication
  Optional Security advice: identify relevant failure cases

Approved contract and interface boundary
  ├─ Backend worker: implement server behavior
  └─ Frontend worker: implement agreed UI states
       Parallel only with independent files/workspaces
                  ↓
Coordinator integrates the candidate
  ├─ Verification worker: exercise acceptance criteria
  └─ Security worker: examine agreed security properties
                  ↓
Scoped corrections → fresh verification when needed
                  ↓
Documentation worker → coordinator review → archive
~~~

An agreed interface permits some parallel work; an unresolved interface creates a dependency first. Frontend implementation against mocks is not evidence of working integration. Final checks use the assembled result. A cloud-only change follows its own dependencies and does not acquire design tasks.

## 12. Review and correction policy

Use a different worker session for verification than for implementation when native delegation is available. It may use the same model. A configurable reviewer model is an option, not a requirement to buy access to another model.

Give the reviewer the contract, relevant project context, candidate identity and artifacts. Ask it to find concrete defects, unsupported assumptions, regressions and missing observations. Do not instruct it to agree or manufacture objections. A review finding should identify the behavior, supporting evidence, affected criterion or risk, and required correction or missing observation.

Reviewers assess the approved scope. Out-of-scope improvement ideas are recorded as suggestions, not silently added to the acceptance gate. Serious discoveries that require changing the contract return to the user through the coordinator.

The implementer can fix a finding in its original session, then the result is checked again against the new candidate. Avoid an unbounded reviewer/implementer loop: the coordinator tracks attempts, recurring failures and the smallest unresolved issue. Reassignment or a stronger model follows configured policy or an explicit user choice, not an invented best-model ranking.

## 13. Coordination limits and integrity

Default to two workers but one shared-checkout writer. Run independent read-only tasks concurrently when useful. Concurrent writers require isolated workspaces and serial integration; otherwise serialize them. Worktrees do not enforce permissions.

The worker limit excludes the main coordinator. Read-only contributors can run alongside a writer, but any final verification must identify a stable candidate. Two isolated writers require reproducible baselines, explicit ownership and serial integration. If a dirty checkout cannot be reproduced safely, use the shared checkout with serialized writers.

Workers do not recursively spawn teams by default. The coordinator retains state transitions, integration, verification reconciliation and archive ownership. Reviews against changing files are provisional; final verification uses the integrated stable snapshot.

Persist dispatch identifiers and native session associations. Multiple clients must not duplicate tasks. On reconnect, reconcile current sessions before retrying uncertain work. Unknown outcomes pause dependent dispatch. Preserve user edits during failures, cancellation and integration.

Use a compact execution plan for orchestrated changes. Bind semantic scope, ownership, dependencies and verification obligations to approval. Keep mutable progress and resolved model settings outside approved files. Version the contract extension so older engines cannot silently ignore it; existing approved v1 changes retain their original rules until explicitly migrated.

Keep volatile logs private/untracked and archive a bounded provenance summary. Final check and archive require quiescent workers and current evidence. Label estimated or unavailable usage honestly.

### Failures and user controls

| Situation | Expected behavior |
|---|---|
| Configured model unavailable | Explain the affected role; use only a configured same-host fallback or wait for reassignment |
| Rate limit or transient service failure | Bounded retry where safe; show the reason and next action |
| Permission request | Surface the native request; do not grant new access through a retry or alternate profile |
| Worker changes overlapping files | Stop competing writes and reconcile ownership before integration |
| Worker says it is done but output is incomplete | Mark result returned/needs correction; do not advance lifecycle state |
| User changes scope | Stop affected future dispatch, preserve existing work and revise the contract |
| User asks to stop | Stop new dispatches and cancel owned work where supported; preserve edits and report cancellation state |
| TUI or server restarts | Reconcile existing native sessions, settings and task state before dispatching again |
| Two UIs observe the same change | Share one authoritative run association; do not independently start duplicate workers |

The panel exposes inspect, open session, stop dispatch, cancel task and scoped retry. Pausing dispatch does not imply a running worker has paused. When a native client lacks a control, display the limitation rather than simulating success.

## 14. Persisted files and audit boundaries

Preserve the existing layout. Add structured files only where orchestration needs them:

~~~text
.workflow/
  config.json                    # settings and native-host role mappings
  local.json                     # optional git-ignored overrides
  changes/<id>/
    proposal.md
    spec.md
    tasks.md                     # optional human explanation
    execution-plan.json          # bounded task graph for orchestrated changes
    state.json
    evidence.md
    execution-summary.json       # bounded results and provenance
~~~

Worker transcripts stay in the host's native session store; Stip keeps references rather than copying every conversation. Mutable task/session associations and dispatch bookkeeping live in a private runtime store. The sidebar reads that runtime state and the lifecycle engine together.

Distinguish approved task scope from routine scheduling detail. Changes to semantic responsibilities, permitted scope or acceptance obligations require revalidation. A retry, a new native session ID or reordering independent ready jobs does not rewrite the contract. Model changes within an authorized execution policy are logged separately; no new data access or paid option is authorized by that separation.

## 15. Revised delivery sequence

| Lot | Work | Evidence required |
|---|---|---|
| 0 — Native compatibility | OpenCode UI hooks, native worker, model-dependent controls, permissions and cancellation; native file configuration in Codex/Claude Code | Exact tested versions, supported controls and true native worker behavior |
| 1 — Shared Stip contract | Coordinator-owned discovery, role resolution, worker handoffs, task acceptance, schema compatibility and contribution guidance in seven skills | Main-conversation continuity, bounded delegation, inheritance, phase overrides and v1 preservation |
| 2 — Client configuration | Preserve/update host-native agent files and setup routines | Native worker selection in each host and explicit effort/Fast limitations |
| 3 — OpenCode coordination | Worker registration/resolution, task/session associations, ownership and restart reconciliation | Real native workers, no duplicate dispatch or competing shared writers |
| 4 — OpenCode UI | Settings, approved sidebar, model-dependent options and navigation | Interactive normal/narrow terminal tests and restart behavior |
| 5 — Packaging and qualification | npx setup, docs, migration and sandbox | Install/update preservation and full lifecycle through a scoped archive commit |

## 16. Acceptance scenarios

1. OpenCode workers are native child sessions; the plugin launches no Codex/Claude Code executable.
2. No role assignment yields a real worker inheriting the coordinator's effective model and compatible settings.
3. Backend, frontend, API, security, verification and docs can use independent assignments. Discovery stays with the main coordinator; optional Research has its own configurable helper profile.
4. Model changes recompute effort/Fast choices; unsupported settings cannot appear to work or be silently ignored.
5. OpenCode settings have no runtime picker and show its available model catalog only.
6. Codex and Claude Code select their native workers using file configuration, without requiring the OpenCode plugin.
7. Relevant extensions contribute from exploration onward; unrelated domains do not create mandatory workers.
8. The coordinator delegates implementation while retaining approval, integration, verification reconciliation and archive ownership.
9. Conflicts, unavailable models, permission waits, cancellation and restart yield inspectable outcomes without duplicate work.
10. The panel reflects actual state/activity, including failure and stale approval.
11. Scope changes invalidate approval; subsequent relevant source changes invalidate evidence.
12. Installation preserves existing skills, settings and customized agents; supported prior changes still work.
13. A small real CLI sandbox completes bootstrap, exploration, approval, delegated implementation, verification, documentation and a scoped archive commit with a relevant extension.
14. A simple exploratory conversation starts no automatic helper; a bounded research request returns findings to the main coordinator without taking over the conversation.
15. An implementation worker can finish while its result remains unaccepted; missing behavior triggers a scoped correction rather than an automatic passed check.
16. A separate verification worker examines the integrated candidate; implementation or documentation changes that affect the checked subject trigger appropriate renewed verification.
17. The same worker may handle a scoped correction, while unrelated tasks and independent verification use correctly separated sessions.
18. Task dependencies and ownership prevent premature dispatch and preserve preexisting user changes when integration or cancellation occurs.

## Current implementation state

The previous attempt prepared an exploration record and four relevant local extension packages in the repository. No plugin, external execution bridge, client configuration adapter, implementation approval or archive commit was created. This revised plan removes external execution work and keeps native delegation plus the OpenCode interface.
