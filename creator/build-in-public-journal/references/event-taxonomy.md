# Event taxonomy and capture policy

Load this reference when deciding whether an event is meaningful or when a richer private record would help. The journal is an evidence ledger, not a transcript, timesheet, complete changelog, or editorial queue.

## Capture indicators

An event is usually worth keeping when it records one or more of these:

- a consequential technical or product decision with real trade-offs;
- an unexpected problem that caused meaningful investigation, redesign, impact, or reusable prevention;
- a non-obvious AI assumption, API shape, dependency, test, or implementation proven wrong;
- a distinct failed approach that eliminated a plausible option;
- an experiment or benchmark with a measured result or invalidated assumption;
- user, operator, or market evidence that changed scope, priority, UX, architecture, or go/no-go state;
- a meaningful capability with inspectable delivery or behavior evidence;
- a new constraint that will affect future work;
- a pivot, stop, rollback, or major direction change;
- a human-agent workflow change grounded in a concrete failure or observation.

These are editorial-noise heuristics, not an admission form. An explicit user request may justify capture even when the event is unusual, but it never overrides privacy and safety boundaries.

## Usually skip

- raw prompts, tool calls, shell commands, individual edits, or every commit;
- intentions that produced no decision or observation;
- retries with the same hypothesis and no new information;
- routine dependency, formatting, rename, or generated-file churn;
- ordinary compiler errors or typos without a reusable lesson;
- green tests unless they establish a meaningful result;
- AI output merely because it was fast, long, or high-volume;
- generic status such as “worked on billing”;
- feelings, reactions, conflict, or motives not supplied by the person involved.

## Event types

Use a label only when it aids later retrieval:

| Type | Use when | Potential detail |
|---|---|---|
| `decision` | A real choice has consequences | drivers, alternatives, reversibility |
| `experiment` | A hypothesis was tested | method, environment, result, limitation |
| `failure` | Expectation materially diverged from observation | impact, distinct attempts, cause hypothesis |
| `fix` | A consequential fault was corrected | cause, change, regression evidence, residual risk |
| `learning` | A non-obvious constraint changes future work | prior belief, evidence, updated model |
| `feedback-change` | External evidence changed the product or priority | source class, prior direction, change |
| `ship` | A meaningful capability became inspectable | user problem, changed behavior, destination evidence |
| `pivot` | Evidence caused a substantial direction change | previous hypothesis, decisive evidence, new direction |
| `stop` | Work or an option was deliberately abandoned | stop reason, reusable assets, consequence |
| `security-pointer` | A security event needs a safe acknowledgement | approved secure pointer and generic remediation state only |

## Minimal record

Keep enough information to distinguish and revisit the event:

- stable event identifier and date;
- concise factual label and project scope;
- event type/status only if useful;
- trigger, observation, decision/action, and consequence as applicable;
- safe evidence locator and what it verifies or leaves pending;
- human and AI contribution when relevant;
- privacy classification and any required omission or embargo.

Optional detail—expected result, alternatives, attempts, confidence label, follow-up, or updates—belongs only when it adds information. Editorial channel fields do not belong in a normal capture record.

## Claim labels

Keep these categories distinguishable in prose or fields:

| Label | Meaning |
|---|---|
| `confirmed_fact` | Direct observation or a claim supported by inspectable evidence |
| `interpretation` | An explanation of what facts may mean, attributed to its source |
| `hypothesis` | A testable explanation not yet verified |
| `content_idea` | A possible public angle derived later during explicitly requested mining |

A passing behavior check can confirm behavior without proving a proposed root cause.

## Updates and compaction

Bundle actions by outcome, summarize only distinct attempts that revealed new information, and link large evidence rather than pasting it. Before creating an event, reconcile its stable ID, outcome/decision, and evidence locators with existing entries. A duplicate with no new evidence is a no-op; a duplicate with new or conflicting evidence appends a dated `update`, `correction`, or `supersession` to the canonical event and records the resulting current status. Never add a second account of the same outcome or silently rewrite the earlier observation. Preserve alias IDs when reconciling existing duplicates, and close entries that have neither durable evidence nor a useful next check.
