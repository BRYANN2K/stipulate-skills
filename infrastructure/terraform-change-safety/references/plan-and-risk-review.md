# Terraform plan and qualitative risk review

Load this reference only when the requested claim depends on evaluated plan behavior, drift, or execution readiness. A focused HCL review does not need a plan packet.

## Evidence selection

Use the strongest available evidence needed by the claim:

- machine-readable output from the exact saved plan and target for evaluated change semantics;
- the same plan's human-readable output for operator context;
- repository HCL, evaluated input sources, lock file, and module/provider identity;
- configured CI, policy, security, and cost results for the controls they actually test;
- operator description, clearly labeled unverified.

Record tool/version, root, target identity, workspace/backend posture, commit/input set, plan creation time, and plan digest when readiness or execution depends on freshness. Do not print sensitive before/after paths or state values.

## Normalized material change record

Read the plan's declared format version and tolerate additive fields or unknown `action_reason` values. `actions` is one input, not the review model. Consume, when emitted by the selected tool/version:

- `resource_changes` and `resource_drift` as separate collections;
- `output_changes`, including sensitivity and unknown final values;
- `checks`, preserving pass/fail/error/unknown rather than reducing them to “present”;
- deferred-change or deferral records, which can describe work excluded from current action totals;
- per-change `before`, `after`, `before_sensitive`, `after_sensitive`, `after_unknown`, replacement paths, import/move/previous-address metadata, and `action_reason`.

Apply the sensitive trees to the corresponding value trees before extracting, grouping, displaying, or logging paths. Overlay `after_unknown` on `after`; a null or omitted leaf without that mask is not enough to decide whether the final value is known. Treat `action_reason` as optional explanatory context and preserve unfamiliar values. Field absence can result from format version, command mode, or `omitempty`; distinguish unsupported/not-emitted from an observed empty collection.

For each material address—or a grouped set of routine equivalent addresses—capture the relevant fields:

| Address/group | Action and reason | Redacted before → after | Unknown/deferred | Drift/output/check effect | Cause/dependency effect | Target evidence |
|---|---|---|---|---|---|---|

Recognize the semantics supported by the actual tool version: read, create, update, delete, replace order, import, move, forget/remove, deferred, and no-op. Unknown values are uncertainty, not harmlessness. Enumerate every destructive, replacement, identity, network, data, backend, and other high-impact effect; summarize routine noise when it does not affect the decision.

Treat order-only, normalization, or provider-set differences as review-noise candidates only when provider schema and context explain them. Never auto-downgrade a diff from text shape alone.

### Compact adversarial examples

- `actions: ["update"]` accompanies an unknown replacement-sensitive endpoint under `after_unknown`. Calling it a routine in-place update from `actions` alone is a failure.
- Resource action totals are zero, but `resource_drift` changes a network boundary, an `output_changes` entry becomes sensitive, or a check is `fail`, `error`, or `unknown`. “No impact” is unsupported.
- A parser encounters an unfamiliar `action_reason` or a version-specific deferral record. Dropping the record or converting it to no-op is unsafe; retain it as unresolved context.
- A reporting tool redacts only keys named `password` while ignoring `before_sensitive`/`after_sensitive`. Even if its summary is correct, the review fails the confidentiality boundary.

## Applicable risk dimensions

Assess only dimensions that can change the decision:

- resource and dependency blast radius;
- privilege, identity, public-exposure, network, and policy effect;
- persistent data, encryption, retention, deletion, and restore effect;
- availability, capacity, replacement ordering, and shared failure domain;
- state/backend/locking and migration effect;
- provider/module/tool novelty or capability uncertainty;
- external systems not represented by the plan;
- cost uncertainty;
- reversibility, backup/restore proof, health signals, and observation gaps.

Use qualitative evidence and judgment. Do not assign ordinal points, sum risk dimensions, or let a synthetic threshold choose GO/CAUTION/BLOCKED. A catastrophic or target-identity uncertainty cannot be averaged away.

## Decision conditions

Block an execution recommendation when a material condition remains, for example:

- target identity, workspace, backend, or plan freshness cannot be established;
- a destroy/replacement/privilege/public-exposure effect is unplanned or unexplained;
- the plan no longer matches the reviewed code and inputs;
- a relevant required validation/policy check failed;
- a persistent-data effect lacks proportionate backup/restore evidence;
- a state/backend migration lacks an encrypted recovery copy and destination readback plan;
- rollback is merely “re-apply” without compatible prior artifact/state/data recovery.

Other gaps can be conditions or explicit uncertainty rather than automatic blockers. A verdict is optional when the user requests a readiness decision and remains advice, not authorization.

## Source notes

The record-consumption guidance is independently paraphrased from OpenTofu commit [`1d920536abf6162e3f336e751c336bcef788c64d`](https://github.com/opentofu/opentofu/tree/1d920536abf6162e3f336e751c336bcef788c64d) (MPL-2.0), especially [`website/docs/internals/json-format.mdx`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/website/docs/internals/json-format.mdx), [`internal/command/jsonplan/plan.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/command/jsonplan/plan.go), [`internal/command/jsonplan/resource.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/command/jsonplan/resource.go), [`internal/command/jsonchecks/checks.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/command/jsonchecks/checks.go), and deferral propagation in [`internal/engine/planning/deferred.go`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/internal/engine/planning/deferred.go). Fields remain conditional on the plan format and command/version actually inspected.
