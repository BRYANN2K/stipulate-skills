# Event taxonomy and capture policy

Use this reference during `capture` and `review`. The journal is a curated evidence ledger. It is not a transcript, timesheet, changelog of every commit, or emotional diary.

## Hard capture triggers

Create or update an event only when at least one trigger applies:

1. A consequential technical or product decision was proposed, accepted, rejected, or superseded.
2. An unexpected problem caused meaningful investigation, redesign, delay, user impact, or a reusable prevention.
3. An AI-generated assumption, API shape, dependency, test, or implementation was proven wrong in a non-obvious way.
4. A distinct approach failed and eliminated a plausible option.
5. An experiment or benchmark produced a measured result or invalidated an assumption.
6. External user, operator, or market evidence changed scope, priority, UX, architecture, or go/no-go state.
7. A user-visible or operator-visible capability shipped and has inspectable proof.
8. A new constraint or trade-off will affect future decisions.
9. A pivot, stop, rollback, or major change of direction occurred.
10. The human-agent workflow changed because a concrete failure or measurement showed a better verification boundary.

An explicit user request to record an event still passes through privacy sanitization, but it may override the editorial noise filter.

## Skip by default

Do not create an event for:

- prompts, tool calls, shell commands, individual file edits, or every commit;
- plans and intentions that produced no decision or outcome;
- repeated retries with the same hypothesis and no new information;
- formatting, renaming, generated-file churn, or routine dependency installation;
- a normal compiler error or typo with no reusable lesson;
- a green test unless the test proves a meaningful assumption or result;
- AI output merely because it was fast, long, or generated many lines;
- generic status such as “worked on billing”;
- feelings, conflict, customer reactions, or motives that were not supplied directly by the person involved.

## Event types

| Type | Use when | Useful extension fields |
|---|---|---|
| `decision` | A real choice has alternatives and consequences | drivers, options, reversibility, consequences, confirmation |
| `experiment` | A hypothesis was tested under stated conditions | hypothesis, method, environment, before/after, limitation |
| `failure` | Expected behavior materially diverged from observation | impact, attempts, root cause, correction, prevention |
| `fix` | A consequential fault was corrected and verified | cause, change, regression proof, residual risk |
| `learning` | A non-obvious constraint or principle will affect future work | prior belief, evidence, new model, future use |
| `feedback-change` | External evidence changed the product or priority | source class, previous direction, change, validation plan |
| `ship` | A meaningful capability became inspectable or usable | user problem, changed behavior, release proof, limitations |
| `pivot` | Evidence caused a substantial change of direction | old hypothesis, decisive evidence, new direction, sunk cost |
| `stop` | Work or an option was deliberately abandoned | stop criteria, evidence, reusable assets, consequences |
| `security-pointer` | A security-sensitive event must be acknowledged without details | private reference, owner, remediation state; always `never_public` while active |

## Required event fields

Every event needs:

- stable `event_id`;
- `occurred_at` and `recorded_at`;
- project scope or component;
- event type and status;
- trigger or problem;
- expected result or hypothesis when one existed;
- observed result;
- action or decision;
- impact or consequence;
- evidence references and verification status;
- human and AI contribution when AI participated;
- confidence and privacy classification;
- content eligibility state.

Use only fields that convey information. Do not fill optional sections with invented detail.

## Claim labels

Keep these categories separate:

| Label | Meaning |
|---|---|
| `confirmed_fact` | Direct observation or claim supported by an inspectable artifact |
| `interpretation` | An explanation of what the facts may mean; attribute it to the author or agent |
| `hypothesis` | A testable explanation that is not yet verified |
| `content_idea` | A possible public angle derived later from safe evidence |

A test result can confirm behavior without proving the proposed root cause. Label confidence accordingly.

## Status model

Use the smallest relevant vocabulary:

- `proposed`
- `in_progress`
- `observed`
- `evidence_pending`
- `verified`
- `accepted`
- `rejected`
- `superseded`
- `closed`
- `closed_no_content`

Do not convert an old observation into a new fact by editing its wording. Append a dated update, link the new evidence, and change status.

## Compaction rules

- Bundle actions by outcome or decision.
- Summarize only distinct attempts and what each taught.
- Link large diffs, logs, traces, benchmarks, and screenshots; do not paste them.
- Update one event when evidence arrives.
- Link superseding events rather than deleting history.
- During review, close entries that have neither evidence nor a concrete next check.
