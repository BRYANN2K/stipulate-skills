# Scoring and platform fit

Apply scoring only after an event passes the publication gate. Scores prioritize review; they do not predict reach and must not override privacy.

## Publication gate

Every candidate must be:

1. **True:** claims are observed, author-supplied, or cited.
2. **Useful:** someone outside the project can apply the result, method, decision, or warning.
3. **Proven:** at least one inspectable artifact supports the central fact.
4. **Safe:** no secret, customer/private data, personal detail, contract conflict, internal topology, live exploit detail, or unapproved quotation remains.
5. **Timely:** the change is shipped/resolved or clearly labeled as an experiment, and any embargo has cleared.
6. **Specific:** the event contains a concrete constraint, choice, observation, or result.

A failed gate receives `KEEP_PRIVATE`, `NOT_USEFUL`, or `NEEDS_EVIDENCE` without platform scoring.

## Signal strength

Score the evidence event independently of channel fit.

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Specificity | Generic activity | Named topic | Concrete choice or failure | Exact constraint, decision, or measured result |
| Evidence | None | Recollection only | One inspectable artifact | Multiple or independently verified artifacts |
| Audience utility | Project-only | Interesting context | Reusable lesson | Reusable method, warning, or decision framework |
| Novelty/surprise | Expected | Mild contrast | Clear invalidated assumption | Not scored above 2 |
| Transferability | One-off | Similar projects | Broadly reusable | Not scored above 2 |
| Maturity | Speculation | Observed, unresolved | Verified/resolved | Not scored above 2 |

Maximum signal score: 15.

| Score | Disposition |
|---|---|
| 0–5 | `NOT_USEFUL` |
| 6–8 | `NEEDS_EVIDENCE` or retain privately |
| 9–11 | Candidate if evidence is at least 2 and the publication gate passed |
| 12–15 | Strong evidence-backed candidate |

Do not rescue a weak evidence score with a dramatic angle.

## Privacy risk

Privacy is a separate hard gate, not a penalty subtracted from signal.

| Risk | Meaning | Result |
|---|---|---|
| 0 | Already public or explicitly approved | Continue |
| 1 | Safe after named redactions/generalization | Continue only after sanitization |
| 2 | Approval, release, fix, or embargo is pending | `KEEP_PRIVATE` |
| 3 | Secret, customer/private data, sensitive personal detail, active vulnerability, or contractual prohibition | `KEEP_PRIVATE`; normally `never_public` |

## X fit: 0–6

Score each dimension 0–2:

- **Sharp fact:** can one observed fact or contrast stand on its own?
- **Compression:** can the useful point survive short context without distortion?
- **Immediate artifact:** is there a safe demo, number, screenshot, diagram, or compact code/test result?

| Score | Fit |
|---|---|
| 0–2 | Poor |
| 3–4 | Possible after stronger proof or framing |
| 5–6 | Strong `X_CANDIDATE` |

Good shapes: one specific observation, a compact decision contrast, a verified before/after, or a genuine open question. Omit the full project history and unsupported hot takes.

## LinkedIn fit: 0–6

Score each dimension 0–2:

- **Professional consequence:** did it affect delivery, reliability, cost, quality, customers, team practice, or resource allocation?
- **Reusable process:** can another builder or team apply the decision or verification boundary?
- **Discussion value:** is there a real trade-off or field observation that professionals can examine without performative vulnerability?

A 5–6 score produces `LINKEDIN_CANDIDATE`. Translate low-level detail into why the decision mattered, while retaining a proof point. Do not turn it into generic leadership advice.

## Personal blog fit: 0–6

Score each dimension 0–2:

- **Depth:** are there enough chronology, alternatives, constraints, and consequences for sustained analysis?
- **Reproducibility:** can the author provide method, environment, code, data, tests, or sources?
- **Durability:** will the explanation remain useful as a canonical reference after the immediate update passes?

A 5–6 score produces `BLOG_CANDIDATE`. Strong shapes include a full decision record, reproducible benchmark, sanitized postmortem, migration, tutorial derived from a solved problem, or architecture walkthrough.

## Multi-platform rule

Use `MULTI_PLATFORM` when at least two platform scores are 5 or higher. Do not reuse one generic angle. Select a different job for each channel:

- X gets the smallest sharp fact or artifact.
- LinkedIn gets the professional consequence and reusable process.
- The personal blog gets chronology, alternatives, method, limitations, and durable proof.

## Opportunity card requirements

Every scored candidate includes:

- source event ID;
- possible subject;
- neutral angle, not an opening line;
- why the audience may care;
- confirmed proof and missing evidence;
- questions for the author;
- per-platform score and rationale;
- privacy risk, redactions, and embargo state;
- final disposition.

Never add predicted impressions, virality claims, or a finished hook.
