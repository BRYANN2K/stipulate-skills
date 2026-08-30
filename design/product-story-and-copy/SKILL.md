---
name: product-story-and-copy
description: "Use when a website, landing page, web application, or dashboard needs evidence-led product understanding, positioning, conversion copy, task/state microcopy, metadata, or claim control. Handles targeted copy edits directly without invoking the full design studio, and expands to storyboards or multiple routes only when the requested decision genuinely needs them. Preserves facts, hypotheses, proof, and unsupported-claim boundaries."
license: Apache-2.0
compatibility: Works with any product, website, application, or dashboard workflow and Agent Skills-compatible client.
metadata:
  version: "2.1.0"
  author: BRYANN2K
  category: design
  tags: product-story, copywriting, storyboarding, copy-routes, claims, interface-copy
---

# Product Story and Copy

## Overview

Create placement-ready content from product evidence. Choose the shortest safe mode: a targeted label, state, metadata, claim, section, or page-copy request stays bounded; a storyboard appears only when sequence is open; multiple copy routes appear only when a real strategic trade-off remains. Do not invoke the full Interface Studio merely because copy is being edited.

Calibrate freedom deliberately. Exact product facts, claim scope, legal/privacy wording, destructive consequences, and evidence locators are low-freedom. Voice, structure, route count, artifact form, and presentation order are higher-freedom unless the user or repository fixes them.

<HARD-GATE>
Never present an unsupported metric, customer outcome, quotation, logo, ranking, comparison, security/compliance statement, availability promise, urgency, scarcity, or capability as fact. Remove it, qualify it to supported scope, or keep it visibly internal. An explicit bounded copy request authorizes the named local copy/document/frontend-string edits; ask again only if scope/effect expands, a material unresolved choice needs the human, or publication/live/external/dependency effects appear.
</HARD-GATE>

## When to use

- Write or revise a specific headline, section, CTA, form, metadata field, label, help text, or interface state.
- Establish product understanding, positioning, message order, conversion copy, metadata, or interface microcopy.
- Prepare real content for a new landing page or visual concept.
- Define loading, empty, validation, error, permission, success, destructive, cancellation, retry, or dashboard context copy.
- Audit generic, interchangeable, hyperbolic, or evidence-free wording and public claims.

Do not use for a purely visual styling task, private sales outreach, or long-form editorial work. Do not force marketing routes onto task-led surfaces, and do not route a targeted copy request through the full design studio.

## Workflow

### 1. Choose the shortest content mode

Inspect enough repository and request context to select one mode:

| Mode | Use when | Minimum path |
|---|---|---|
| `TARGETED_COPY` | One bounded element, section, page, metadata set, or content defect is named | inspect governing facts/voice → edit requested copy and adjacent dependent states → truth/specificity check |
| `CLAIMS_CONTROL` | The outcome is a claim audit, proof boundary, or claims ledger | inventory affected claims → verify/qualify/reject → update only requested surfaces/ledger |
| `TASK_SURFACE` | App, dashboard, admin, onboarding, settings, or another task-led UI needs content | map affected task/state/consequence → draft exact copy → verify recovery and data scope |
| `OPEN_MARKETING` | A new/material marketing argument or page sequence is genuinely open | product truth → storyboard if needed → one route or enough distinct routes to resolve the trade-off → select/hand off |

A full product understanding record is not required for a bounded edit when existing sources already answer the relevant facts. A targeted mode may operate standalone and return inline output.

Record decision ownership only for a material choice: `human`, `delegated`, or `not-applicable`. If the user delegates content strategy, choose and continue. Selection does not authorize publication or unsupported proof.

### 2. Inspect the evidence the requested copy can rely on

Read repository instructions and the most relevant current sources: product docs, routes/UI strings, behavior/configuration, tests, demos, data models, pricing/policy, approved research/support language, brand voice, and legal constraints. Current copy proves wording exists, not that its claim is true.

Record exact file/heading, route, test, URL, report/date, or equivalent reproducible locators for facts that matter. Do not inventory the whole repository for a one-line change. Load [copy and evidence rules](references/copy-evidence-rules.md) when claim status, route distinctness, or state completeness is nontrivial.

**Complete when:** enough audience/task, mechanism, action, voice, constraints, and claim evidence is known for the selected mode.

### 3. Ask only decision-changing questions

Draft what the evidence supports. Ask a concise batched question only when its answer would materially change:

- audience or qualifying/non-fit boundary;
- primary task or conversion action;
- product mechanism, offer, or availability;
- legality, privacy, destructive consequence, or claim publishability;
- a real choice between incompatible content strategies.

If an answer would only tune reversible wording, state the assumption and proceed. Never ask the user for a plausible metric or testimonial merely to make copy persuasive.

### 4. Storyboard only when sequence or state flow is open

For a new/material sequence, map enough moments to support the reader/user decision. Each moment can record the question/state, source-backed content, proof or data/state evidence, desired action, and next clarity.

- Marketing: keep product truth and proof inventory fair while routes may frame/order them differently.
- Application: entry → task → consequence → feedback → recovery/next action.
- Dashboard: scope/freshness → signal → supporting evidence → drill-down/operation → reconciliation.

Skip a new storyboard when the task names a bounded placement inside an established information architecture. No fixed beat count or stock hero/logo/cards/FAQ sequence applies.

### 5. Draft one route or only decision-relevant alternatives

#### Open marketing

When constraints select one argument, write one complete route. When a strategic trade-off remains, create enough distinct routes to expose it and stop when another would not change the decision. Distinguish routes in the relevant combination of audience tension, mechanism, proof strategy, objection, narrative topology, and CTA promise—not only headline, tone, or adjectives.

Give every compared route fair access to the same supported truth and proof inventory. Couple a route to a visual direction only when its argument materially depends on that direction; do not create every copy × visual combination or blend alternatives before selection.

#### Task surface

Draft only the affected task path, hierarchy labels, help, consequences, and applicable loading, empty, validation, error, permission, success, destructive, cancellation, retry, or stale-data states. Say what happened, what remained safe, and what can happen next. Do not fill a universal state matrix when states cannot occur or are outside scope.

#### Bounded existing copy

Preserve established terminology, tone, navigation, and content structure unless the request changes them. Edit the smallest coherent set, including adjacent success/failure wording only when the changed action affects it. Skip artificial alternatives.

### 6. Keep claims traceable without forcing a file

Create or update a claims ledger from [the claims template](templates/claims.md) only when it is requested, the project requires it, or material externally checkable wording needs durable traceability across surfaces/runs. Otherwise keep source and scope beside the draft or in an inline evidence note.

Qualifying claims include metrics, testimonials/logos, comparisons, customer outcomes, performance, security/compliance, availability, consequential capabilities, guarantees, and urgency. Use `publish`, `qualify`, `internal`, `reject`, or `unknown`. Exclude `internal`, `reject`, and `unknown` wording from public copy. A missing claim does not block unrelated source-backed content.

For proof that can age—such as counts, rankings, benchmarks, certification/status, pricing or availability, named customers, comparisons, and time-bounded outcomes—add lifecycle fields only when they improve control: evidence owner, checked/effective date, exact valid scope, expiry date or review/withdrawal trigger, and reverse locators for every active public use. Define who removes, replaces, or qualifies the wording when the trigger fires, and verify those locators during withdrawal. Do not force expiry metadata onto stable directly inspectable labels or timeless product mechanics, and do not create a ledger solely to satisfy these fields.

### 7. Add only requested and applicable completeness

For a public surface, add metadata, heading outline, social brief, canonical/indexability intent, consent/privacy, trust/legal, conversion event, or success copy only when the requested deliverable or downstream build needs it. These requirements do not prove runtime SEO, analytics, accessibility, consent delivery, deployment, or publication.

For an application/dashboard, include only states/data context that can affect the requested task or claim. Keep source, grain, scope, units, freshness, permissions, and consequences visible where interpretation depends on them.

### 8. Recommend or select only when a choice exists

Recommend the strongest route or hierarchy with evidence and trade-offs. If the user reserved the decision, ask one focused selection question. If judgment is delegated, record the choice and continue. If the request or inherited system already determines the content, use `not-applicable` and avoid a selection ritual.

A targeted copy-only request may finish here. Cross-discipline visual exploration belongs to `design-direction` or full Interface Studio only when the scope actually expands.

### 9. Run the truth and specificity edit

For each retained line ask: What source or behavior supports it? Which decision does it help? Could an unrelated product paste it unchanged? Is the mechanism visible? Does the CTA name the real next step? Remove duplicated promises, manufactured tension, fake precision, unsupported intensifiers, and accidental uniform cadence while preserving deliberate voice and necessary domain language.

Verify only affected copy, placement, wrapping/state behavior, and claim surfaces. A syntax, link, build, or automated check proves that check only, not copy quality, accessibility, publication, or runtime delivery.

## Output contract

Preserve the following information, but reorder or chunk it for the user's focus. `focus-friendly-delivery` may change presentation without hiding claim evidence, assumptions, safety boundaries, or gaps.

```text
Product story and copy: READY | PARTIAL | BLOCKED
Mode: TARGETED_COPY | CLAIMS_CONTROL | TASK_SURFACE | OPEN_MARKETING
Requested scope and exclusions: <specific>
Primary audience/task and action: <specific>
Draft/edits: <inline copy or paths>
Routes: <one selected route | candidate IDs and real differences | not applicable>
Decision: <selected/pending/not applicable> — owner=<human|delegated|not-applicable>
Claim evidence: <source locators, publishable/qualified/excluded wording; owner/date/scope/expiry and reverse withdrawal locators only where proof can age>
States/metadata checked: <affected set or not applicable>
Persistent artifacts: <paths or inline/not needed, with reason>
Unresolved questions and effects not proven: <gaps, publication/runtime boundaries>
```

## Common pitfalls

- Running full product discovery or Interface Studio for a targeted wording change.
- Treating storyboards, route counts, state matrices, or files as universal quotas.
- Calling headline synonyms distinct strategies or inventing proof to bias one route.
- Forcing marketing funnels onto task surfaces.
- Creating a claims file for every label, omitting traceability for a material public claim, or letting age-sensitive proof survive past its review/withdrawal trigger because active usage locators are unknown.
- Treating current marketing copy, a mockup, synthetic data, or a successful build as proof.
- Requesting approval after strategy was delegated or when constraints already select the wording.
- Claiming SEO, analytics, accessibility, consent, deployment, or publication from copy alone.

## Verification checklist

- [ ] The shortest content mode matches the bounded request; targeted work did not invoke the full studio.
- [ ] Only decision-relevant repository evidence was inspected before questions or drafting.
- [ ] Facts, hypotheses, proof, assumptions, and unsupported claims remain distinct.
- [ ] Questions are limited to unresolved issues that change truth, strategy, scope, or consequence.
- [ ] A storyboard exists only when sequence/flow is open and contains only needed moments.
- [ ] One route was accepted when constraints selected it; alternatives exist only for a real strategic trade-off and share fair proof.
- [ ] Task surfaces use task, data, consequence, feedback, and recovery copy only for applicable states.
- [ ] Bounded work preserves established terminology and edits the smallest coherent set.
- [ ] Material claims are supported, qualified, internal, rejected, or excluded; none were invented.
- [ ] Claims whose proof can age have proportional owner/date/scope/review-or-expiry controls and reverse usage/withdrawal locators where durable control is warranted; stable claims were not burdened with ceremonial metadata.
- [ ] Persistence is justified by deliverable, cross-run/agent memory, or project policy; inline output is accepted otherwise.
- [ ] Verification covers affected copy/claims/placement only and does not overstate tool results or publication/runtime effects.
