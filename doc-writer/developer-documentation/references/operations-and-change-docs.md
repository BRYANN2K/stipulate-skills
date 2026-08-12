# Operations and change documentation

## Runbook

A runbook supports action under pressure:

- purpose, scope, owner, prerequisites, permissions, and risk;
- trigger/alert and first safety checks;
- decision tree with bounded read-only diagnosis;
- stepwise action with expected output after each step;
- stop/escalation conditions;
- verification at service/user level;
- rollback/recovery and communications;
- cleanup and evidence to retain;
- last tested date/condition and review owner.

Separate observation from mutation. Place authorization gates before state-changing commands. Avoid copying secrets or brittle resource identifiers.

## Troubleshooting guide

Organize by symptom → likely causes → discriminating checks → safe fix → verification. Do not organize only by internal component when users search by observed symptom. Include exact error strings when stable and searchable.

## Migration guide

State source/target versions, supported paths, breaking changes, prerequisites, backup, compatibility window, phased steps, data/schema behavior, validation, rollback limitations, downtime, and cleanup. Test upgrade and rollback where technically possible. Explicitly say when rollback is impossible after data transformation.

## Deprecation

Document replacement, rationale, affected audience, warning mechanism, timeline, compatibility, migration, owner, and removal condition. Do not delete old docs before users can migrate; mark them and link forward.

## Changelog and release notes

Changelog is complete lookup by version; release notes are reader-prioritized communication. Include behavior changes, fixes, security implications, breaking changes, migrations, deprecations, known issues, and verified links. Do not claim availability before the artifact is public.
