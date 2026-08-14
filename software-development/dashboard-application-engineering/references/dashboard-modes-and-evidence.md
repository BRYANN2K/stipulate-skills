# Dashboard modes and evidence

## Analytics mode

Use when users primarily compare, monitor, or explain measured facts.

Every metric needs:

- stable identifier and human label;
- source owner;
- formula and included/excluded records;
- grain and aggregation;
- unit, time window, and timezone where relevant;
- freshness and late-data behavior;
- null/unknown treatment;
- filter interaction;
- reconciliation example or invariant;
- drill-down path when users need to explain the value.

Source grain, metric formula and grain, freshness, reconciliation, destructive confirmation, verification claim, and verification evidence declarations must be actionable. Whole-field placeholder terms such as `eventually`, `unspecified`, `later`, `none`, or `not applicable` do not define a usable contract. Standalone or label-affixed `TODO`, `TBD`, or `placeholder` work markers (including `_label` and numeric affixes) remain vacuous inside longer or bounded ASCII-encoded text; `defer` or `deferred` is also vacuous as a directive at field start or after a label separator. Bounded future-work phrases include `plan`/`plans` for a later phase (`plans on`, `plan is to`, or one bounded comma-delimited incidental clause before `to`), postponement until implementation, `intend`/`intends` to specify eventually, and any subject that `remain`/`remains` to be decided; the latter two forms also allow one bounded comma-delimited incidental clause before `to` or `to be`. The same class includes `will be implemented later`, `not yet defined`, `future work`, or `define ... after implementation`. Those checks do not prohibit ordinary domain sentences that use words such as `Pending` or `Later` to state concrete behavior. Static rejection is only a syntax guard; it cannot establish that other prose is semantically correct or backed by runtime evidence.

A chart choice follows the question: trend, comparison, distribution, relationship, composition, or exact lookup. When exact values, actions, or auditability matter, include a table or equivalent accessible data representation.

## Operational mode

Use when users primarily inspect and mutate resources.

Every resource and action needs:

- stable identity and current status source;
- role and server-side permission;
- target scope, prerequisites, and effect;
- idempotency or duplicate-submission behavior;
- confirmation proportional to consequence;
- accepted versus completed semantics;
- audit event or established trace where applicable;
- cancellation/timeout behavior;
- per-resource partial failure for bulk operations;
- post-action reconciliation across list, detail, summary, selection, and cache.

Never make the UI the only permission boundary.

Every role allowed to open a view must be granted every resource exposed by that view's resource widgets. Actions are dashboard-level capabilities in the base contract: expose one in a view only when the role is allowed by the view, the action contract, and the permission grant. A structurally valid contract does not replace server-side authorization evidence.

## Hybrid mode

Use when metrics prioritize operational work. In addition to both branches, prove that:

- metric and resource list share compatible scope, filters, source semantics, and freshness;
- drill-down from aggregate to resource preserves context;
- post-action reconciliation updates the resource and affected aggregates;
- partial source failure does not present stale/partial metrics as complete;
- URL/deep-link state identifies the same filtered scope after refresh.

## Required dashboard states

Each view declares and exercises:

| State | Meaning |
|---|---|
| `loading` | Required data has not resolved; preserve stable layout where possible |
| `empty` | Source resolved successfully with no matching records |
| `partial` | Some required sources or fields are unavailable/stale |
| `error` | The view cannot provide its promised decision or operation |
| `ready` | Required sources meet the declared usable contract |

Add `forbidden`, `stale`, `submitting`, `accepted`, or `completed` when behavior needs them. Do not label partial data as empty or ready.

## Evidence matrix

| Claim | Evidence |
|---|---|
| Formula correct | Seeded known-answer test or source query plus independent calculation |
| Freshness correct | Source timestamps/contract and rendered freshness behavior |
| Filters consistent | Same seeded scope reconciles cards, charts, tables, and detail |
| Permission enforced | Server boundary test for allowed and denied roles/resources |
| Action works | Safe test mutation plus independent authoritative readback |
| Partial failure is safe | Seeded multi-source or bulk failure with attributable results |
| Dashboard usable | Real-browser keyboard, responsive, accessibility-tree, console, and network evidence |

Screenshots prove presentation only.
