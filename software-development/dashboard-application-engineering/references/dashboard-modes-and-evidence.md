# Dashboard modes and evidence menu

Use this reference for the parts of a dashboard change that need source, dense-data, permission, partial-failure, or reconciliation reasoning. The labels below are useful lenses and optional validator vocabulary, not a required project taxonomy. Preserve the repository's metric, query, permission, route, and state models.

## Analytical lens

Apply when the changed surface asks users to compare, monitor, or explain measured facts. For each metric whose semantics the change relies on, record the applicable items:

- stable identifier and human label;
- source owner and authoritative query/path;
- formula, included/excluded records, and denominator;
- grain, aggregation, unit, time window, and timezone;
- freshness, late-data, null/unknown, duplicate, and deletion treatment;
- filter interaction and comparison baseline;
- known-answer example or independent reconciliation invariant;
- drill-down path when users need to explain the value.

A styling-only edit does not require rebuilding this inventory. A new or changed metric does require enough of it to make the displayed claim interpretable and testable.

Choose a chart only after the question is known: trend, comparison, distribution, relationship, composition, or exact lookup. When exact values, actions, scanning, sorting, or auditability matter, provide a table or equivalent accessible data representation.

### Prometheus-backed semantics (conditional)

Use this only when a touched metric/query actually comes from Prometheus:

- Preserve the metric's canonical base unit and suffix (for example seconds or bytes) in storage/query meaning; convert to a friendly display unit at presentation time without relabeling the underlying series.
- Model dimensions as labels only when their value set is bounded enough for the existing system. Do not encode dimensions into new metric names or place user/resource/request identifiers into unbounded labels.
- Treat a counter as a cumulative value that may reset. Use a project-appropriate rate or increase for interval questions; do not render the raw total as if it were a current gauge.
- Define missing-series behavior explicitly. Absence can mean not initialized, not scraped, filtered away, or genuinely inapplicable; it is not automatically an observed zero. Initialize known finite label combinations or apply a query fallback only when that product meaning is true.

Record the exact query, range/step, label filters, reset handling, and missing-to-display rule only for the changed metric. Other backends keep their own semantics.

### Native table versus ARIA grid

A native table is the default for read-only tabular relationships, including a table with ordinary links, buttons, or sortable column-header controls. It keeps normal document reading and Tab behavior.

Choose an ARIA grid only when the product needs a composite interaction such as cell-by-cell navigation, row/cell selection, or editing. Then implement and browser-test the full applicable model: one managed entry point/current cell, directional navigation, row/grid boundary movement, transitions into and out of interactive descendants or edit mode, and stable focus after sorting, pagination, virtualization, or deletion. Roles without that focus system make the table harder to use.

## Operational lens

Apply when the changed surface inspects or mutates resources. For an affected action, select what consequence requires:

- stable resource identity and authoritative current status;
- server-side role/capability/policy and object-scope check;
- exact target, prerequisites, and effect;
- duplicate handling or idempotency;
- consequence-proportional warning/confirmation;
- honest accepted versus completed semantics;
- existing audit/trace mechanism when applicable;
- cancellation/timeout only for work that supports it;
- attributable per-resource failure for relevant bulk work;
- authoritative reconciliation of affected list/detail/summary/selection/cache.

Never make the UI the only permission boundary. Do not add confirmation to harmless actions or cancellation to atomic work merely to satisfy a template.

### Consequential modal dialog

Use a modal only when interruption and explicit decision are proportionate to the consequence. On open, place initial focus where the content and risk require; for an irreversible confirmation, defaulting to the least destructive action is usually safer. While open, keep Tab and reverse-Tab within the dialog, let Escape close it before commitment, and prevent the background from being operable. On close, return focus to the invoking control unless it no longer exists or the completed workflow has a more logical next target. Verify these transitions in the browser; modal roles and `aria-modal` do not implement focus behavior.

## Hybrid lens

When metrics prioritize operational work, check the changed connections:

- aggregate and resource list share the intended scope, filters, source semantics, and freshness;
- drill-down preserves relevant context;
- action reconciliation updates the resource and affected aggregates;
- partial source failure does not present incomplete facts as complete;
- deep-link state identifies the intended filtered scope after refresh when sharing is a product requirement.

## State selection

Use only states the changed view can enter or the claim depends on:

| State | Meaning |
|---|---|
| `loading` | Required data has not resolved. |
| `empty` | The relevant source resolved successfully with no matching records. |
| `partial` | Some required source/field is unavailable or outside its usable freshness. |
| `error` | The surface cannot provide its promised decision/operation. |
| `ready` | Required inputs meet the declared usable contract. |

Add repository-native equivalents of forbidden, stale, submitting, accepted, completed, or other states only when applicable. These names are not mandatory. Never collapse partial/stale/forbidden data into honest empty or ready behavior.

## Claim-to-evidence map

| Claim | Direct evidence |
|---|---|
| Formula is correct | Seeded known-answer test or source query plus independent calculation |
| Freshness is correct | Source timestamps/contract and rendered freshness behavior |
| Filters are consistent | Same seeded scope reconciles affected summaries, charts, tables, and detail |
| Permission is enforced | Server-boundary test for allowed and denied role/capability/resource scope |
| Action works | Safe test mutation plus independent authoritative readback |
| Partial/bulk failure is safe | Seeded failure with attributable results and honest state |
| Dashboard is usable | Relevant real-browser keyboard, responsive, accessibility, console, and network evidence |
| Performance is acceptable | Representative measurement of the changed dense/expensive path |
| Production effect completed | Exact authorization plus source/resource readback |

Screenshots prove presentation only. The optional validator proves only reference consistency inside its bundled schema; neither proves source truth, authorization, reconciliation, or quality.

## Compact adversarial evals

| Prompt cue | Expected routing or behavior |
|---|---|
| “Add `role=grid` to this read-only results table so it is accessible.” | Keep native table semantics; a composite grid is not an accessibility upgrade without a real interaction need and complete focus model. |
| “Show raw request counter as the current request rate and turn every missing series into zero.” | If Prometheus backs it, select counter/rate and missing-series semantics before presentation; do not silently rewrite absence. |
| “Fix focus in the existing delete confirmation.” | Route directly here; verify initial, contained, Escape, and return focus without invoking a full design workflow. |
| “Build internal operations software; we have not chosen dashboard, app, or CLI.” | Near miss: route first to **Software Engineering**, not directly to this specialist. |
| “Create visual directions for a future admin dashboard; no implementation or data behavior.” | Near miss: route the visual-only outcome to **Interface Studio**, not dashboard engineering. |

## Upstream source notes

- W3C ARIA Authoring Practices commit [`7e4034b262bc0d25332e330d8a582aaf34113829`](https://github.com/w3c/aria-practices/tree/7e4034b262bc0d25332e330d8a582aaf34113829) (W3C Software and Document License), paraphrased from [`content/patterns/table/table-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/table/table-pattern.html), [`content/patterns/grid/grid-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/grid/grid-pattern.html), and [`content/patterns/dialog-modal/dialog-modal-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/dialog-modal/dialog-modal-pattern.html). The guidance selects patterns; it does not reproduce their full keyboard tables.
- Prometheus documentation commit [`9ece2ea6375353799f014055bc577d795214aec0`](https://github.com/prometheus/docs/tree/9ece2ea6375353799f014055bc577d795214aec0) (Apache-2.0), paraphrased from [`docs/practices/naming.md`](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/docs/practices/naming.md), [`docs/practices/instrumentation.md`](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/docs/practices/instrumentation.md), and [`docs/concepts/metric_types.md`](https://github.com/prometheus/docs/blob/9ece2ea6375353799f014055bc577d795214aec0/docs/concepts/metric_types.md). These conditions do not introduce Prometheus or override an existing metric contract.
