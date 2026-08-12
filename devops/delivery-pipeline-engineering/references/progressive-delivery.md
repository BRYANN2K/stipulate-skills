# Progressive delivery

## Strategy selection

| Strategy | Strong when | Main risk |
|---|---|---|
| Rolling | stateless, backward-compatible changes | broad exposure before subtle regression is detected |
| Canary/rings | traffic segmentation and fast SLIs exist | sample too small or unrepresentative |
| Blue/green | capacity supports two stacks and cutover is controllable | state/schema and failback complexity |
| Feature flags | behavior can be separated from deployment | stale flags and dual-path complexity |

## Gate design

For each exposure step define population/traffic, minimum sample or dwell time, primary SLI, guardrail metrics, baseline, pass threshold, abort threshold, and decision owner.

Use user-facing outcomes first: availability, correct results, latency, checkout/task success. Supplement with saturation, error classes, queues, and dependency health.

## Data compatibility

Prefer expand/migrate/contract. Deploy code that tolerates old and new schema before destructive contraction. A binary rollback is unsafe when data has been irreversibly transformed.

## Rollback vs roll-forward

Rollback when previous artifact and data/config remain compatible and it is faster/safer. Roll forward when rollback cannot reverse state, security requires the new version, or the defect has a narrow corrected artifact. State the decision criteria before rollout.
