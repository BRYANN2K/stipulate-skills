# Hypothesis-driven signal correlation

Use this reference when uncertainty or cross-signal correlation justifies a ledger. A known failure or one focused query does not require competing hypotheses, every signal type, or a fixed query order.

## Optional hypothesis ledger

| Hypothesis | Predicts / would reject | Smallest query and scope | Result | Confidence change / next step |
|---|---|---|---|---|

Write predictions before querying when doing so reduces confirmation bias. Use as many hypotheses as can change the next action—possibly one, several, or none for direct confirmation. An unavailable signal leaves uncertainty; it does not confirm the leading theory.

## Alert, notification, and recovery states

Keep evaluation, notification routing, incident workflow, and service recovery separate:

| State | What it means | What it does not prove |
|---|---|---|
| **no-data** | The query produced no usable samples for the intended scope/window | Healthy service; distinguish no traffic, query mismatch, collection/ingestion loss, and retention gaps |
| **silenced** | Notification delivery is suppressed by an explicit matcher/time scope | The alert stopped evaluating or the condition recovered |
| **inhibited** | Notification is suppressed because a related alert takes precedence | The underlying condition is healthy or absent |
| **cleared/resolved** | The alert/incident condition is no longer active under its evaluation/workflow semantics | The user journey recovered, data is present, or failure was not displaced |
| **recovered** | The affected journey/SLI and necessary system signals read back as healthy over the justified observation window | Root cause certainty or permanent correction |

Always report the underlying evaluation result, data presence, notification disposition, incident state, and recovery readback independently when they affect the claim.

## Correlation scope

Preserve two joined identities rather than correlating on service name and wall-clock proximity alone:

- **resource identity** — service/workload, environment, cluster/region/zone, instance or runtime unit when useful, and version/deployment/configuration;
- **trace identity** — trace ID, span ID, parent span or link relationship, request/correlation ID when valid, sampling decision/probability when known, and event-time basis.

Add tenant segment only when privacy and need permit. Record observation window, query time, and source. Check aggregation, cardinality, retention, and joins before interpreting absence.

Treat sampling and clocks as explicit unknowns. A missing trace may be unsampled, dropped, late, or outside retention; sampled traces may not represent the failing population. Cross-host timestamps can be skewed, and ingestion time is not event time. Use parent/link identity, durations, bounded skew, and independent events before asserting order; if sampling probability or clock error is unknown, preserve that uncertainty.

## Causal-edge ledger

When proposing a causal chain, assess each edge separately:

| Edge A → B | Predicted mechanism | Matching resource/trace path | Order with clock uncertainty | Control/intervention/counterfactual | Contradictions | Confidence |
|---|---|---|---|---|---|---|

Use `confirmed`, `likely`, `possible`, or `unknown` at the edge level. Temporal adjacency or a shared deploy label alone is correlation. Raise confidence only when identity, mechanism, ordering within clock bounds, and a discriminating control or response align; one weak edge limits the chain claim.

## Metrics branch

- Use the affected journey's rate, error ratio, and duration distribution when applicable.
- Choose a window appropriate to scrape interval and incident speed.
- Aggregate numerator and denominator consistently; validate histogram bucket/aggregation assumptions.
- Inspect saturation, queues, waits, throttling, concurrency, pools, memory, CPU, IO, or dependency signals only when a hypothesis predicts them.
- Avoid unbounded joins, per-user/request labels, and high-cardinality regex during an incident.

## Traces branch

Use representative affected exemplars and a healthy comparison when available. Inspect only the implicated critical path, fan-out, retry loop, status, version/region attribute, or missing span. Sampling can hide rare failures; absence is not proof.

## Logs branch

Bound service, environment, time, request/trace/correlation ID, and error class. Prefer structured fields and separate primary errors from secondary cancellation/noise. Never dump broad logs, secret values, or unnecessary personal/customer data into output.

## Changes and topology branch

Correlate only plausible deployments, feature flags, configuration, certificates, DNS, scaling, infrastructure events, dependency releases, and traffic shifts. Confirm the changed component lies on the affected path and that the predicted mechanism appears.

## Stop rule

Stop when the requested question is supported, a mitigation decision no longer changes across plausible alternatives, or evidence limits are reached. Record contradictory and inconclusive results instead of querying every backend.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| An alert is silenced and its query now returns no data after telemetry ingestion failed | Report `silenced` plus `no-data`; do not call it cleared or recovered, and test the ingestion/query boundary |
| No failing trace is found, but the affected route is sampled sparsely and sampler details are unavailable | Keep the trace conclusion unknown; absence is not evidence that the dependency path is healthy |
| A deploy timestamp precedes a downstream spike, but host clocks are unsynchronized and resource versions do not match | Reject the causal edge until identity/order/mechanism are supported; preserve clock and candidate uncertainty |
| The alert clears after a restart while the user journey still fails in another region | Separate cleared from recovered and report displaced or continuing impact |

## Source anchors

- Resource and trace identity/sampling: OpenTelemetry specification [`specification/resource/README.md`](https://github.com/open-telemetry/opentelemetry-specification/blob/8057bf6d5cf0ab10891b9e6f7b928cded76ab2f7/specification/resource/README.md), [`specification/trace/api.md`](https://github.com/open-telemetry/opentelemetry-specification/blob/8057bf6d5cf0ab10891b9e6f7b928cded76ab2f7/specification/trace/api.md), and [`specification/trace/sdk.md`](https://github.com/open-telemetry/opentelemetry-specification/blob/8057bf6d5cf0ab10891b9e6f7b928cded76ab2f7/specification/trace/sdk.md), revision `8057bf6d5cf0ab10891b9e6f7b928cded76ab2f7`, Apache-2.0 ([root license](https://github.com/open-telemetry/opentelemetry-specification/blob/8057bf6d5cf0ab10891b9e6f7b928cded76ab2f7/LICENSE)).
- Alert evaluation and notification concepts: Prometheus documentation [`docs/alerting/index.md`](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/docs/alerting/index.md) and [`docs/practices/alerting.md`](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/docs/practices/alerting.md), revision `9ece2ea6375353799f014055bc577d795214aec0`, Apache-2.0 ([root license](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/LICENSE)).
- Incident mitigation/recovery discipline: PagerDuty incident-response docs [`docs/during/during_an_incident.md`](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/docs/during/during_an_incident.md), revision `464fc9d3e47e19e9d8da17cec1a41dc09624e95a`, Apache-2.0 ([root license](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/LICENSE)).

The normalized states and correlation ledger are tool-neutral; they prescribe no query syntax, threshold, or alerting default.
