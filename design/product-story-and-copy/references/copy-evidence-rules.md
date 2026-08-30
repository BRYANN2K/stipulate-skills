# Copy and evidence rules

Load this reference when deciding what the repository proves, whether a durable claims record is needed, whether compared marketing routes are genuinely distinct, or which interface states need copy.

## Evidence-first drafting

Inspect available primary evidence before interviewing the user:

1. current behavior, source code, configuration, routes, schemas, and tests;
2. current first-party product, pricing, policy, and operational documentation;
3. verified demos, screenshots, support material, analytics definitions, and approved customer research;
4. approved brand voice and prior public wording;
5. named inferences from verified facts;
6. hypotheses kept internal and out of publishable claims.

Search snippets, generated summaries, competitor copy, visual mockups, example data, and old copy are discovery evidence only. Record an exact file/heading, route, test, URL, report/date, or other reproducible locator rather than “from the repo.”

## High-leverage question test

Ask only if the answer would change audience/non-fit, primary action, offer/mechanism, legal or claim scope, or the choice between routes. Batch related questions and explain the decision they unlock. Otherwise record a reversible assumption and keep drafting.

Never ask the user to supply a metric, testimonial, or proof simply to make a route persuasive. The route must work with the proof that exists.

## When `CLAIMS.md` is warranted

Create a separate ledger when public or product copy includes material proof or consequential externally checkable assertions such as:

| Claim class | Minimum evidence | Publishing boundary |
|---|---|---|
| Metric/popularity | Attributable measure, definition, scope, and date | State what was counted and when |
| Customer outcome | Approved attributable evidence and context | Do not generalize an anecdote into a guarantee |
| Testimonial/logo | Approved exact quote or logo use, identity, and display consent | Never synthesize, paraphrase as a quote, or imply endorsement |
| Comparison/ranking | Current evidence for both alternatives and a defined dimension | Date and scope; avoid universal “best” claims |
| Performance | Reproducible benchmark with environment, sample, baseline, and date | Publish method and bounds |
| Security/compliance | Authoritative control, audit, certification, or policy evidence | Name boundary; never infer certification |
| Availability | Current region, plan, limit, release state, and operational constraint | Distinguish released, beta, planned, and unavailable |
| Consequential capability | Current behavior/test/docs proving exact inputs, outputs, and limits | Qualify to supported scope |

A separate ledger is usually unnecessary for routine labels, instructions, and states whose behavior is directly inspectable and already cited in product understanding. Inline claim evidence is valid. Persist a ledger only when requested, required by the project, or needed across surfaces/runs/agents; keep it scoped to the material claim rather than every sentence.

## Claim decisions

Use these statuses consistently:

- `publish` — exact wording is supported at the stated scope;
- `qualify` — a narrower, caveated wording is supported;
- `internal` — hypothesis or draft framing; must not ship as fact;
- `reject` — misleading, fabricated, private, expired, or forbidden;
- `unknown` — evidence is missing; exclude from publishable copy until resolved.

Derived benefits must name the facts and inference. Example: a repository may prove batch export exists; it does not by itself prove that customers “save hours every week.”

## Proof aging and withdrawal controls

Use these controls only when a material claim's proof can become false, out of scope, unauthorized, or misleading over time and durable control is warranted. Common candidates are counts, rankings, benchmarks, current price/plan/region availability, named-customer or logo permission, certification/audit status, competitor comparisons, and dated outcomes. Stable product mechanics and directly inspectable routine labels do not need ceremonial expiry fields.

For each qualifying age-sensitive claim, retain the smallest useful lifecycle record:

- **owner** — person/team/system responsible for revalidation or withdrawal;
- **checked/effective date** — when the evidence was last verified for publication;
- **exact scope** — population, environment, plan, region, version, timeframe, comparison set, or other limit that makes the wording true;
- **expiry or review trigger** — a date or event such as pricing, certification, permission, benchmark, source-data, or competitor change;
- **reverse usage locators** — exact routes, source keys/files, metadata, social variants, structured content, generated outputs, or campaign surfaces currently carrying the claim;
- **withdrawal action** — remove, replace, qualify, or hold publication, plus status and fresh evidence that every recorded locator was handled.

“Allowed surfaces” is not a reverse index: it says where wording may appear, not where it currently appears. When a trigger fires, change the decision to `reject`, `unknown`, or a newly supported `qualify`/`publish`, trace the active locators in reverse, and record any unavailable external/publication surface as an unresolved withdrawal gap. Never claim global withdrawal from a repository search alone when generated, cached, deployed, social, or third-party copies were not inspected.

## Route distinctness test

Use this only when a real strategic trade-off warrants alternatives. One complete route is valid when constraints already select the argument. For every compared route, record the applicable dimensions:

| Dimension | Route `<ID>` | Route `<ID>` | Add column only if another trade-off remains |
|---|---|---|---|
| Audience tension/trigger | | | |
| Mechanism foregrounded | | | |
| Proof strategy/placement | | | |
| Main objection answered | | | |
| CTA and next-step promise | | | |
| Narrative topology | | | |

A route fails if it changes only wording, tone, metaphors, labels, or adjective intensity. Rework or remove it until a reasonable team could accept one and reject another for strategic reasons. Keep underlying facts, scope, and proof access fair. Stop adding routes once the decision is exposed.

## Anti-slop signals

Flag rather than blindly ban:

- abstract transformation with no visible mechanism;
- universal or superlative claims without scope;
- three-adjective stacks and uniform punchy sentence rhythm;
- fake intimacy, rhetorical pressure, or manufactured founder vulnerability;
- “from X to Y” contrasts that erase constraints;
- generic CTA labels detached from the resulting action;
- arbitrary numbers selected because they look persuasive;
- features relabeled as outcomes without user context;
- fake testimonials, logo walls, trust badges, live activity, scarcity, or urgency.

A common word is acceptable when it is the clearest exact word. Evaluate meaning, not a blacklist.

## Interface state copy

| State | Must answer |
|---|---|
| Loading/progress | What is happening; may the user leave, cancel, or continue? |
| First use/empty | Is this first use, no match, no permission, stale input, or no data? What starts recovery? |
| Validation | Which field/condition failed and how can it be corrected? |
| Server/partial failure | What failed, what remained safe, and what can be retried? |
| Permission | What is unavailable and who or what can change access? |
| Destructive confirmation | Which resource, scope, dependency, and irreversible effect are involved? |
| Success | What changed, where is it visible, and what is the next useful action? |
| Cancellation/timeout | What stopped, what was retained, and how can it resume? |
| Dashboard freshness | Source, scope, units, last update, delay, and unavailable/partial status where material |

## Marketing-readiness boundary

Copy may specify title, description, headings, social language, canonical/indexability intent, conversion events, consent/trust language, and structured-data applicability. It cannot prove crawlability, schema validity, analytics delivery, consent behavior, page speed, browser accessibility, or publication. Those require implementation and runtime evidence.
