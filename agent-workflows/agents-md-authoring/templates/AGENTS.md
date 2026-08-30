<!-- Optional scaffold. Use only for a new file, remove every unused section/comment/marker, and prefer a smaller direct edit when possible. -->

# Agent instructions

<!--
Every retained rule needs target-repository evidence or an explicit current user decision.
Do not treat this scaffold as engineering doctrine, mutation policy, or a universal section schema.
Put only broadly applicable rules here; place material subtree differences in a nested AGENTS.md.
-->

## Project

{{PROJECT_SUMMARY}}

## Scope and precedence

- Repository root: `{{REPOSITORY_ROOT}}`
- Applicable human/project instructions: {{APPLICABLE_INSTRUCTION_SOURCES}}
- Nested instruction scopes: {{NESTED_SCOPE_MAP}}

## Read first

- `{{AUTHORITATIVE_FILE}}` — {{WHY_IT_IS_AUTHORITATIVE}}
- `{{SECONDARY_FILE}}` — {{WHY_IT_MATTERS}}

## Commands

<!-- Keep only commands verified in a manifest, task, CI job, or other authoritative source. State prerequisites and side effects. -->

- Setup: `{{SETUP_COMMAND}}` — {{SETUP_SCOPE_AND_EFFECTS}}
- Focused check: `{{FOCUSED_TEST_COMMAND}}` — {{FOCUSED_TEST_SCOPE}}
- Static check: `{{STATIC_VALIDATION_COMMAND}}` — {{STATIC_VALIDATION_SCOPE}}
- Plan or preview: `{{PLAN_OR_PREVIEW_COMMAND}}` — {{PLAN_OR_PREVIEW_SCOPE_AND_EFFECTS}}
- Broader check: `{{FULL_VALIDATION_COMMAND}}` — {{FULL_VALIDATION_CONDITION}}

## Repository map

- `{{SOURCE_ROOT}}` — {{SOURCE_PURPOSE}}
- `{{TEST_ROOT}}` — {{TEST_PURPOSE}}
- `{{GENERATED_ROOT}}` — {{GENERATION_OWNER_AND_RULE}}
- `{{OTHER_MATERIAL_ROOT}}` — {{OTHER_ROOT_PURPOSE}}

## Verified project rules

- {{VERIFIED_RULE_WITH_SOURCE}}
- {{VERIFIED_CONVENTION_WITH_SOURCE}}
- {{VERIFIED_COMPATIBILITY_OR_GENERATION_RULE}}

## Authority and boundaries

<!--
Record only repository-supported distinctions. A direct bounded request normally supplies authority
for its named local file edits. Do not add a second approval gate, a network ban, or a dependency
policy unless current human/repository evidence establishes it. Live, destructive, remote,
credential, auth/permission, publication, deployment, release, DNS, and public machine-contract
effects remain governed by the applicable user and repository authority.
-->

- Safe routine action in this repository: {{EVIDENCED_SAFE_ACTION}}
- Requires separate authority because: {{EVIDENCED_AUTHORITY_BOUNDARY}}
- Prohibited or protected surface: {{EVIDENCED_PROHIBITION_OR_PRIVATE_BOUNDARY}}
- Generated source of truth: {{GENERATED_SOURCE_OF_TRUTH}}
- Infrastructure state, backend, environment, or cluster ownership (only when evidenced): {{INFRASTRUCTURE_OWNERSHIP}}
- Desired configuration versus observed live state: {{LIVE_STATE_EVIDENCE_RULE}}

## Validation and completion

- After `{{CHANGE_SCOPE}}`, run `{{FOCUSED_TEST_COMMAND}}` when {{FOCUSED_TEST_CONDITION}}.
- Run broader checks only when {{BROADER_CHECK_CONDITION}}.
- Report passed, failed, skipped, unavailable, and not-applicable checks distinctly.
- Before a completion claim, inspect {{FINAL_DIFF_OR_ARTIFACT}} and verify {{CLAIM_SPECIFIC_BEHAVIOR}}.

## Scoped instructions

- `{{SUBTREE}}/AGENTS.md` — {{MATERIAL_LOCAL_DIFFERENCE}}
