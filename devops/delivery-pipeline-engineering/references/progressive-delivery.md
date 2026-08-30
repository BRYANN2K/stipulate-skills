# Progressive delivery branch

Load only for rollout strategy, production release readiness, or an authorized deployment plan. A CI edit, failed job, or artifact review does not need this packet.

## Strategy decision

| Strategy | Useful when | Main decision risk |
|---|---|---|
| Rolling | broad exposure is acceptable and changes are backward-compatible | subtle regression can spread before detection |
| Canary/rings | traffic/population segmentation and timely representative signals exist | sample may be too small or biased |
| Blue/green | parallel capacity and controlled cutover are available | state/schema and failback complexity |
| Feature flags | behavior can be separated safely from deployment | stale flags and dual-path complexity |

Use the project's existing mechanism when it meets the objective. Do not impose a controller, CRD, provider metric syntax, traffic percentage, dwell time, or threshold.

## Outcome and action semantics

Normalize analysis outcome before deciding the next action. Promotion authority remains separate from this classification.

| Analysis outcome | Meaning | Default decision |
|---|---|---|
| **success** | All applicable success and guardrail criteria were evaluated on the intended candidate and population | **promote-eligible**; promote only through the declared authority |
| **failure** | A declared failure or abort criterion was met | **abort** and use the predeclared rollback or roll-forward path |
| **query-error** | A signal could not be evaluated because its query/provider failed | **hold**; abort only when a predeclared fail-closed rule says so |
| **inconclusive** | Available evidence does not discriminate success from failure | **hold**; obtain discriminating evidence or abort at the declared overall limit |
| **timeout** | The analysis decision deadline expired | **hold or abort** according to declared policy; never reinterpret as success |
| **insufficient-sample** | The observation is valid but too small or unrepresentative for its criterion | **hold** within the declared limit, then become inconclusive or abort; never silently promote |

Multiple signals retain their individual outcomes. Do not turn query-error or missing samples into zero failures, let one successful metric erase a failed guardrail, or use manual promotion to relabel the evidence. Record the outcome, promote/hold/abort decision, decision authority, and evidence time separately.

## Decision evidence

For each exposure decision, capture only what is needed to promote, hold, abort, or learn:

- population/traffic/ring and progression;
- sample or dwell basis;
- primary user-facing signal and relevant guardrails;
- baseline plus success/failure/inconclusive/error interpretation;
- automatic/manual promotion and abort authority;
- observation window and delayed-effect risk;
- schema/data/config compatibility;
- rollback versus roll-forward criteria.

Not every strategy uses every field. Prefer user outcomes such as availability, correct results, latency, checkout/task success, then relevant saturation, error class, queue, and dependency signals.

Track deployment and feature exposure as separate state machines:

- **deployment identity/state** — immutable artifact and configuration revision present in each target, plus rollout operation and workload health;
- **exposure identity/state** — flag/config revision, evaluated audience or segment, treatment, owner, and readback from the decision point.

A completed deployment can have zero, partial, or full feature exposure. Disabling a flag does not roll back the deployed binary, and rolling back a binary does not prove flag state or audience changed. Define and read back both reversals when both mechanisms participate.

## Data compatibility

Use expand/migrate/contract or another compatible sequence when state/schema evolution requires it. Deploy code that tolerates old/new forms before destructive contraction where feasible. A binary rollback is unsafe after irreversible transformation; identify recovery or roll-forward instead.

## Effect boundary

Before any separately authorized deployment, re-confirm exact artifact digest/release, target environment/account/cluster, actor, configuration/schema state, expected signals, abort, rollback/roll-forward, and destination readback. A rollout plan or readiness verdict is not deployment authorization.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| The error query fails, the dashboard renders no points, and every other guardrail succeeds | Classify `query-error`, hold by default, and never convert missing evidence into success |
| A low-traffic ring reaches its dwell limit with no failures but below the declared sample basis | Classify `insufficient-sample`, hold, then apply the declared inconclusive/abort limit rather than promote |
| The artifact rollout completed, but the old feature treatment remains enabled for an unverified audience | Report deployment and exposure separately; read back or reverse the flag state without claiming binary rollback |

## Source anchors

Outcome separation and analysis-run decision handling are grounded in Argo Rollouts [`docs/features/analysis.md`](https://github.com/argoproj/argo-rollouts/blob/4e6a2798688e22868340d9871a3c8d78371f1568/docs/features/analysis.md) and the staged canary model in [`docs/features/canary/index.md`](https://github.com/argoproj/argo-rollouts/blob/4e6a2798688e22868340d9871a3c8d78371f1568/docs/features/canary/index.md), revision `4e6a2798688e22868340d9871a3c8d78371f1568`, Apache-2.0 ([root license](https://github.com/argoproj/argo-rollouts/blob/4e6a2798688e22868340d9871a3c8d78371f1568/LICENSE)). The table intentionally abstracts vendor objects, commands, defaults, and thresholds.
