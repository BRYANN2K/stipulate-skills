# Hypothesis-driven signal correlation

## Hypothesis ledger

| ID | Hypothesis | Predicts | Would reject | Query/evidence | Result | Confidence |
|---|---|---|---|---|---|---|

Write predictions before querying to reduce confirmation bias.

## Metrics

- Start with request rate, error ratio, and duration distributions for the affected journey.
- Use `rate()`/equivalent over a window appropriate to scrape interval and incident speed.
- Aggregate numerator and denominator consistently for ratios.
- Use histogram quantiles only when bucket boundaries and aggregation are valid.
- Check queue depth, wait time, throttling, concurrency, pool utilization, memory pressure, CPU throttling, IO, and dependency saturation as hypotheses require.
- Avoid unbounded label joins, per-user/request labels, and regex over high-cardinality dimensions during an incident.

## Traces

Select exemplars from the affected SLI or representative slow/error requests. Compare healthy and unhealthy traces. Inspect critical path, fan-out, retry loops, span status, version/region attributes, and missing spans. Sampling can hide rare failures; absence is not proof.

## Logs

Prefer structured fields and trace/request/correlation IDs. Bound time, service, environment, and error class. Separate application errors from secondary cancellation/noise. Never dump broad logs containing secrets or personal data into the report.

## Changes and topology

Correlate deployments, feature flags, configuration, certificates, DNS, scaling, infrastructure events, dependency releases, and traffic changes. Confirm whether the changed component lies on the affected path.

## Confidence update

Increase confidence only when a predicted signal appears and alternatives become less likely. Decrease it when a rejecting signal appears. An unavailable signal leaves uncertainty; it does not confirm the hypothesis.
