# Terraform plan and risk review

## Evidence hierarchy

Prefer, in order:

1. saved plan JSON from the exact target;
2. saved plan's human-readable output;
3. repository HCL, evaluated inputs, lock file, and module source;
4. CI output and policy/security/cost reports;
5. operator description, clearly marked as unverified.

## Change inventory

For each address record:

| Address | Action | Before → after | Replacement cause | Dependency impact | Risk |
|---|---|---|---|---|---|

Explicitly capture `create`, `update`, `delete`, `delete+create`, `create+delete`, `read`, `no-op`, import, move, and deferred changes. Unknown values are uncertainty, not harmlessness.

## Risk dimensions

Score each 0–3:

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Blast radius | isolated | one service | shared subsystem | org/region/data plane |
| Reversibility | trivial | tested rollback | restore/manual recovery | irreversible/unknown |
| Data | none | metadata | persistent data path | deletion/corruption risk |
| Access/network | none | narrow | privilege/exposure change | public/admin boundary |
| Availability | none | rolling/no impact | interruption possible | outage expected/unknown |
| Novelty | routine | known variation | new provider/module | migration/first use |
| Observability | complete | minor gap | partial | no success signal |

### Verdict rules

- **BLOCKED** if any dimension is 3 with unresolved controls, or if target/plan/backup is uncertain.
- **CAUTION** if total ≥ 8, any dimension is 2, or a required approval is outstanding.
- **GO** only when all blocking questions are resolved and total < 8.

Do not average away a catastrophic risk.

## Mandatory blockers

- target identity or workspace cannot be proven;
- unplanned destroy/replacement;
- plan does not match current code/inputs;
- failed validation or policy gate;
- persistent data change without tested backup/restore;
- IAM privilege expansion or public exposure without explicit approval;
- provider/backend migration without a recovery copy;
- rollback described as “re-apply” without a known-good artifact and data strategy.

## Freshness

Record commit, lock-file hash, variable source, workspace, target identity, plan creation time, and plan artifact checksum when available. Approval applies only to that evidence set.
