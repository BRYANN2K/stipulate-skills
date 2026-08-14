# Agent instructions

<!--
Adapt this template from repository evidence. Remove every comment, unresolved
{{MARKER}}, and unused section before writing AGENTS.md into a project.
Keep only rules that apply repository-wide. Put materially different subtree
rules in the nearest nested AGENTS.md instead of duplicating them here.
-->

## Project

{{PROJECT_SUMMARY}}

### Read first

- `{{AUTHORITATIVE_FILE}}` — {{WHY_IT_IS_AUTHORITATIVE}}
- `{{SECONDARY_FILE}}` — {{WHY_IT_MATTERS}}

## Commands

<!-- Every command needs an exact repository source and a known scope. -->

- Setup: `{{SETUP_COMMAND}}`
- Focused test: `{{FOCUSED_TEST_COMMAND}}`
- Static validation: `{{STATIC_VALIDATION_COMMAND}}`
- Plan or preview: `{{PLAN_OR_PREVIEW_COMMAND}}`
- Full validation: `{{FULL_VALIDATION_COMMAND}}`

State prerequisites, credentials, backend or cluster access, network effects,
locks, generated output, and commands that should not run during normal work.

## Repository map

- `{{SOURCE_ROOT}}` — {{SOURCE_PURPOSE}}
- `{{TEST_ROOT}}` — {{TEST_PURPOSE}}
- `{{INFRASTRUCTURE_ROOT}}` — {{INFRASTRUCTURE_PURPOSE}}
- `{{ENVIRONMENT_ROOT}}` — {{ENVIRONMENT_SCOPE}}
- `{{GENERATED_ROOT}}` — {{GENERATION_RULE}}

## Engineering rules

- Choose the simplest implementation that fully meets the current requirement.
- Grow the product through working end-to-end slices; do not trade working behavior for unfinished complexity.
- Keep components modular and separate concerns at boundaries the current design actually needs.
- Inspect dependencies already present — packages, modules, providers, charts, collections, documentation, schemas, and types — before adding or reimplementing behavior.
- Prefer a mature, maintained library, module, provider, chart, or collection when it demonstrably reduces total complexity or improves reliability.
- Preserve released or explicitly supported public contracts and durable state, including resource addresses, schemas, module inputs/outputs, APIs, and persisted data. Make a breaking change only when the project explicitly allows it and the migration is understood.
- Make temporary workarounds explicit: document their scope, risk, and removal condition.
- Treat plan, preview, diff, and dry-run output as review evidence, not authorization to apply, deploy, reconcile, destroy, or migrate.
- Study repository patterns first. Consult established external implementations only for unfamiliar, consequential, or difficult-to-reverse decisions; adapt rather than copy blindly.

### Project-specific conventions

- {{VERIFIED_CONVENTION_WITH_SOURCE}}

### Infrastructure context

<!-- Remove this section when the repository has no infrastructure scope. -->

- Verify state, backend, environment, workspace or cluster, provider locks, and generated-file ownership from repository evidence; do not infer live state.
- State/backend ownership: {{STATE_BACKEND_OWNERSHIP}}
- Environments or targets: {{ENVIRONMENTS_AND_TARGETS}}
- Generated configuration: {{INFRASTRUCTURE_GENERATION_RULE}}

## Boundaries

### Always

- Read the closest applicable `AGENTS.md` and the authoritative project files before editing.
- Inspect neighboring source and tests instead of guessing conventions.
- For infrastructure, inspect source configuration, locks, environment overlays, policy, and runbooks without reading local state or credentials.
- Keep changes inside the requested scope and account for every modified file.
- Run safe, relevant validation after the last meaningful change.

### Ask first

- Add or replace a dependency, framework, package manager, or architectural boundary.
- Break a published contract, migrate durable state, or remove a compatibility path.
- Run a command with installation, network, credential, destructive, deployment, publication, or broad workspace effects.
- Plan, apply, deploy, reconcile, destroy, import, refresh, unlock, rotate, or migrate against an environment or backend.
- Commit, push, publish, deploy, delete, or migrate data unless the user explicitly authorized that exact action and target.

### Never

- Read, print, generate, or commit credentials or private runtime configuration.
- Read or expose Terraform/OpenTofu state, kubeconfigs, secret manifests, backend credentials, or sensitive plan output.
- Invent commands, paths, test results, project conventions, or successful execution.
- Infer current live resources, drift, health, or deployment status from checked-in desired configuration.
- Edit generated files directly when the repository declares another source of truth.
- Replace working code with speculative abstractions or unrelated refactors.

## Validation

- Run `{{FOCUSED_TEST_COMMAND}}` for {{FOCUSED_TEST_SCOPE}}.
- Run `{{STATIC_VALIDATION_COMMAND}}` for {{STATIC_VALIDATION_SCOPE}}.
- Run `{{PLAN_OR_PREVIEW_COMMAND}}` only when {{PLAN_OR_PREVIEW_CONDITION}}; identify the exact target and treat the result as review evidence.
- Run `{{FULL_VALIDATION_COMMAND}}` only when {{FULL_VALIDATION_CONDITION}}.
- Report passed, failed, skipped, unavailable, and not-applicable checks separately.

## Completion

Before claiming completion, inspect the final diff, exercise changed behavior at its real interface when applicable, and distinguish implemented, executed, verified, committed, published, and deployed work.

## Scoped instructions

- `{{SUBTREE}}/AGENTS.md` — {{LOCAL_SCOPE_DIFFERENCE}}
