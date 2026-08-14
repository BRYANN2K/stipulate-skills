# Agent instructions: {{SCOPE_NAME}}

<!--
Use this file only when this subtree has materially different commands,
conventions, architecture, generated files, or safety boundaries. The root
AGENTS.md still supplies global context. Remove comments, unresolved markers,
duplicated global rules, and unused sections before writing the file.
-->

## Scope

Applies to `{{SUBTREE_PATH}}/` and its descendants.

{{LOCAL_CONTEXT}}

## Read first

- `{{LOCAL_AUTHORITATIVE_FILE}}` — {{WHY_IT_IS_AUTHORITATIVE}}

## Commands

- Focused test: `{{LOCAL_TEST_COMMAND}}`
- Static validation: `{{LOCAL_STATIC_VALIDATION_COMMAND}}`
- Plan or preview: `{{LOCAL_PLAN_OR_PREVIEW_COMMAND}}`

State local prerequisites and why these commands differ from the root workflow.

## Local conventions

- {{VERIFIED_LOCAL_CONVENTION_WITH_SOURCE}}

## Local boundaries

- {{LOCAL_BOUNDARY_OR_GENERATED_FILE_RULE}}
- State/backend/environment ownership: {{LOCAL_INFRASTRUCTURE_OWNERSHIP}}
- Live mutation boundary: {{LOCAL_MUTATION_BOUNDARY}}

## Validation

- Run `{{LOCAL_TEST_COMMAND}}` for changes under `{{SUBTREE_PATH}}/`.
- {{ADDITIONAL_LOCAL_VALIDATION_RULE}}
