---
name: anti-slop-review
description: "Use when reviewing a website, WebGL/WebGPU landing, web application, dashboard, frontend slice, source artifact, or bounded UI claim for generic or product-agnostic design, unsupported claims or fake data, reference collage, weak hierarchy, missing states/fallbacks, accessibility, responsive, lifecycle, performance, and browser/runtime defects. Supports targeted and full-surface review scopes with an optional separately requested, materially supported release-impact advisory, selecting evidence in proportion to the requested claim without numeric scoring."
license: Apache-2.0
compatibility: Works with any web stack and Agent Skills-compatible client. Source-only reviews can run offline; claims about rendered pixels, interaction, accessibility behavior, runtime, or devices require the relevant browser or runtime evidence.
metadata:
  version: "2.1.0"
  author: BRYANN2K
  category: design
  tags: anti-slop, design-review, visual-critique, accessibility, frontend-qa, evidence
---

# Anti-Slop Review

## Overview

Review the interface claim the user actually made. Turn “this feels generic” into localized, contextual findings, but do not turn a bounded source question into a ceremonial full-product audit or turn fashion preferences into global bans.

Choose the shortest evidence path that can support or falsify the requested claim. Inline evidence and semantic findings are valid. Persist a report only when the review is requested as a deliverable, must support re-entry across runs or agents, or project policy requires it.

<HARD-GATE>
Do not fabricate evidence, call skipped or unavailable checks passed, lower severity to manufacture a favorable result, or generalize a screenshot, source inspection, syntax check, linter, build, scan, or local request beyond what it directly proves. Review breadth and release impact are separate: describe an open `BLOCKER` or `MAJOR` as release-blocking only when the user explicitly requested a release-impact advisory and evidence materially supports that advisory for the named candidate. No review scope or advisory is human approval or authorization to merge, release, deploy, publish, mutate live data, accept risk, or take another external action.
</HARD-GATE>

## When to use

- Review a bounded copy, visual, design-system, state, accessibility, responsive, motion, runtime, source, or browser-quality claim.
- Investigate product-name-swappable copy, repeated container topology, fake data or unsupported proof, reference collage, weak hierarchy, missing states, arbitrary system drift, or decorative motion.
- Review an implemented route, changed frontend slice, working landing page, application journey, or dashboard.
- Perform a full-surface review when the user requests broad product/surface coverage, whether or not release impact is in scope.
- Add an advisory release-impact posture only when the user explicitly requests it and the named candidate has materially supporting evidence.
- Audit an applicable Three/R3F/WebGL/WebGPU/shader/`vgpu` experience for product value, semantic fallback, deterministic evidence, loss/pause behavior, device budgets, or cleanup.
- Re-review authorized corrections with fresh evidence for the affected claim.

Do not use this skill to choose the initial art direction, replace user research, conduct a penetration test, prove backend authorization from UI visibility, or infer production behavior from a preview.

## Review scope and optional release-impact posture

Choose review breadth before collecting evidence. Mutation authority, report persistence, and release impact are separate choices.

| Scope | Use when | Evidence boundary | Result boundary |
|---|---|---|---|
| `TARGETED_REVIEW` | The request names a bounded dimension, artifact, change, route, state, breakpoint, browser behavior, or tool check | Inspect only evidence that can confirm or falsify that claim. Source-only, one-context rendered, or focused runtime evidence can be sufficient. | Conclude only the named claim and exclusions. Do not infer quality of the rest of the surface. |
| `FULL_SURFACE_REVIEW` | The request asks for broad review of the material surface/product experience, without implying a release decision | Cover the material surfaces, journeys, claims, roles, states, responsive changes, accessibility paths, and runtime risks for the named surface—not a fixed matrix. | Conclude the reviewed surface only. Full-surface breadth does not imply release readiness, authority, or a go/no-go decision. |

Record a separate release-impact status only when relevant:

- `NOT_REQUESTED` — default; do not use release-blocking language.
- `ADVISORY` — the user explicitly requested release impact **and** evidence materially covers the named release candidate. Findings may then be described as release-blocking within that advisory.
- `REQUESTED_BUT_UNSUPPORTED` — the user requested release impact, but missing scope/evidence prevents a responsible advisory; name what is missing and keep the review conclusion bounded.

Review scope and release-impact status are orthogonal. A `FULL_SURFACE_REVIEW` need not be a release review, and a narrowly defined release candidate may receive an `ADVISORY` only when its material risks are actually covered. Do not silently expand either breadth or posture. Every release-impact conclusion is advisory evidence only and never merge, release, deployment, publication, or risk-acceptance authorization.

## Workflow

### 1. Bound the requested claim

Read only enough repository instructions, supplied context, source, diff, or runtime information to identify:

- the exact question, acceptance criterion, surface, or release candidate under review;
- `TARGETED_REVIEW` versus `FULL_SURFACE_REVIEW`, plus release-impact status independently;
- included and excluded dimensions, surfaces, changes, environments, and users where they affect the claim;
- governing product, claim, design, component, motion, data, or repository contracts;
- whether the review is source-only, rendered, behavioral, or mixed;
- review-only versus review-and-correct authority;
- evidence that would change the conclusion and material limitations already known;
- whether the result stays inline or meets a deliverable, re-entry, or project requirement for persistence.

A fixed bundle of routes, viewports, states, files, or browsers is not required. Select each context because it can expose a material difference in the requested claim. Name baseline failures separately from changes introduced by the reviewed work when attribution matters.

**Complete when:** the review scope, release-impact status, requested claim, exclusions, authority, and evidence boundary are clear enough to avoid both overclaiming and unnecessary expansion.

### 2. Choose evidence by the requested claim

Use the lowest evidence level that can responsibly answer the question, and add stronger evidence only when the claim needs it:

| Requested claim | Evidence that may be sufficient | Evidence needed before broader language |
|---|---|---|
| Copy, claim, data label, or source-contract fidelity | Exact text/source locator plus primary claim or data source | Rendered context when hierarchy, truncation, prominence, or user interpretation is part of the claim |
| Token, component, or implementation consistency | Source/diff trace to canonical rules | Computed or rendered evidence when actual output or interaction is claimed |
| Visual specificity, hierarchy, composition, or reference adaptation | Readable render of the affected context plus qualitative judgment | Additional contexts only where layout, content, state, or responsive behavior can materially change the judgment |
| Responsive behavior | Each behavior-changing range implicated by the change, including a boundary-adjacent case when risky | A broader device set only when the requested compatibility or release claim names it |
| Interaction, state, or recovery | The exercised path, transition, and readback relevant to the task | Other roles/states only when they share the risk or are material to a full-surface conclusion or requested release-impact advisory |
| Accessibility | The applicable keyboard, semantic, contrast, reflow, announcement, or assistive evidence | Do not promote an automated scan to full accessibility proof |
| Runtime, network, persistence, or performance | Direct runtime observation under recorded conditions and appropriate readback/measurement | Production, field, long-session, or device claims require corresponding evidence |
| Syntax, lint, type, build, or focused test | Exact command, target, result, and assertions/check scope | It remains a scoped tool signal; it does not prove visual, behavioral, accessibility, release, deployment, or publication quality |

Load [the rendered evidence protocol](references/rendered-evidence.md) only when pixels, responsive behavior, interaction, accessibility behavior, runtime, motion, or renderer behavior are in scope. A source-only limitation remains explicit but is not automatically `BLOCKED`; it blocks only when rendered or runtime evidence is essential to the requested verdict.

For `FULL_SURFACE_REVIEW`, build coverage from material user journeys, truth risks, changed behavior, supported environments, and failure impact. Material completeness is a reasoned coverage judgment, not completion of a universal checklist. If release-impact status is `ADVISORY`, separately confirm that this evidence materially covers the named candidate; full-surface breadth alone does not supply that posture.

**Complete when:** each conclusion can point to direct evidence of the type required by that conclusion, and unavailable evidence is scoped rather than silently treated as success.

### 3. Perform an unanchored visual read when visual quality is in scope

When the request concerns rendered quality, inspect the relevant render before reading automated audit output or conducting implementation-led diagnosis. Record material observations as `REVIEWER_JUDGMENT`, with a locator and consequence. Probe contextually:

- **Product-name swap:** would message and composition remain equally plausible for an unrelated product because audience, mechanism, constraint, proof, or next task is absent?
- **Repeated-container topology:** are unequal jobs forced into equal cards or panels in a way that obscures priority, relationship, action scope, or reading order?
- **Claim/data truth at first read:** do metrics, logos, testimonials, urgency, availability, or “live” surfaces imply authority without provenance or synthetic/demo labeling?
- **Reference collage:** do recognizable motifs compete, copy source-specific expression, or reveal incompatible visual and interaction logics?
- **Hierarchy:** can the intended user determine what this is, what matters now, and the next action in the expected order?
- **Missing states:** does a polished default conceal an applicable loading, empty, partial, error, permission, success, or recovery need?
- **Motion or optional GPU purpose:** does it communicate a product-specific causal or spatial beat, and do content and action remain usable when it is reduced, absent, paused, or failed?

These are investigation prompts, not automatic failures. Inter, purple, gradients, cards, bento grids, sparse type, stock imagery, 3D, or another common choice may be appropriate when it serves the product and task.

For a source-only or explicitly nonvisual targeted review, omit this step and say that rendered quality was not assessed. If rendering is unavailable, record exactly which claim remains unverified; return `BLOCKED` only if that missing evidence prevents the requested conclusion.

**Complete when:** visual observations, if applicable, were made before tool anchoring and are specific enough to test rather than expressions of taste.

### 4. Run only applicable truth, browser, code, and system probes

After any applicable unanchored visual read, inspect the sources and run probes that can change the conclusion. Depending on the claim, these may include:

- primary sources for visible claims, metrics, testimonials, logos, comparisons, urgency, availability, and live-status language;
- canonical tokens, primitives, components, content, motion rules, and computed output implicated by observed drift;
- keyboard order, focus visibility/movement/return, activation, escape, and traps along the affected path;
- semantic names, roles, values, headings, landmarks, announcements, contrast, non-color cues, zoom, and reflow;
- console/runtime errors, network behavior, state transitions, mutation readback, realistic fixtures, and synthetic/demo labels;
- overflow, wrapping, information priority, identity, and action preservation at decision-relevant widths;
- runtime metadata, forms/events, canonical/indexability, and social output for public pages when those claims are in scope;
- repository-native focused tests, lint, typecheck, build, or measurements proportionate to the affected code and claim.

When an axe-style accessibility scan is used, preserve its four outcomes separately with run context and rule/node locators: `violations`, `incomplete` (needs review), `passes`, and `inapplicable`. Do not flatten `incomplete` into pass/fail, discard it while reporting “zero violations,” or treat `inapplicable` as positive evidence. Resolve material `incomplete` items with manual/assistive evidence where possible; if any remains material to the requested conclusion, an unconditional `PASS` is unavailable—use `CONDITIONAL` when the bounded result remains useful or `BLOCKED` when that evidence is essential.

Keep proof boundaries explicit: UI visibility is not server authorization; request acceptance is not durable mutation; a local database is not production truth; preview behavior is not deployment; a scan is not full assistive-technology proof; and a screenshot is not semantics, interaction, persistence, analytics delivery, performance, or live data.

Real-time graphics are conditional, never a default audit branch. When the requested claim or release risk includes a canvas, shader, model, postprocess, or continuous loop, select the applicable fallback, reduced-motion/data, readiness, deterministic-frame, backend, shader/asset failure, loss, offscreen/hidden pause, budget, or lifecycle/resource-stability probes from the rendered evidence protocol. Do not require GPU performance or lifecycle work for an unrelated DOM, copy, or source review.

Label evidence by method:

- `AUTOMATED_SIGNAL` — tool output such as a command, scan, browser log, network trace, test, measurement, or capture metadata;
- `REVIEWER_JUDGMENT` — contextual interpretation of specificity, hierarchy, coherence, user impact, or whether a signal matters.

Neither label implies human approval. A syntax or tool pass proves only its named target and scope.

**Complete when:** the requested claim has proportionate evidence, with skipped, unavailable, degraded, and not-applicable probes distinguished where they matter.

### 5. Promote only evidence-linked findings

Load [the review criteria](references/review-criteria.md). Promote an observation only when it contradicts a governing contract, creates an observable user/task/trust/system failure, or makes a claim beyond the available evidence.

Each material finding includes:

- a stable ID and `BLOCKER`, `MAJOR`, `MINOR`, or optional `NOTE` severity;
- whether it is inside the requested review scope;
- an exact text, element, source, route, state, viewport, environment, or other locator as applicable—not a forced bundle of all of them;
- evidence IDs or direct locators and evidence class (`AUTOMATED_SIGNAL`, `REVIEWER_JUDGMENT`, or both);
- the violated contract or contextual test, user/product impact, and smallest durable correction;
- status and fresh retest evidence when a correction occurs.

Group repeated symptoms under one root cause. Record material out-of-scope risks separately rather than silently expanding the review. Do not assign a numeric slop score, average dimensions, count common aesthetic choices, or inflate findings to make the review look comprehensive.

**Complete when:** each finding is localized, evidenced, proportional, fixable, and falsifiable on retest.

### 6. Correct and iterate while another pass is valuable

If correction is authorized, group fixes by root cause and affected surface. Preserve product character and do not turn a targeted correction into an unsolicited redesign. A relevant mutation makes affected evidence stale; recapture or rerun only what the changed claim needs.

Continue while another pass is likely to resolve a material in-scope finding within authority and budget. Stop when acceptance is met, further work has diminishing returns, a blocker or consequential choice needs the user, or the agreed budget is reached. State the stop reason and residuals. Never keep iterating merely to obtain a favorable label, reuse stale evidence, or soften severity because time ran out.

If correction is not authorized, provide the smallest actionable recommendation and do not imply it was applied or verified.

**Complete when:** fresh evidence supports the post-change claim, or the stop reason and remaining findings are explicit.

### 7. Issue only the bounded conclusion the scope supports

For either review scope, use the status that matches its stated boundary:

- `PASS` — direct evidence supports the targeted claim or materially reviewed surface and no unresolved in-scope finding or material incomplete evidence contradicts it;
- `CONDITIONAL` — the result is useful, but a named noncritical residual, unresolved material `incomplete` scan item, or evidence limitation bounds confidence;
- `FAIL` — direct evidence falsifies the claim or an in-scope acceptance/surface criterion remains unmet;
- `BLOCKED` — evidence essential to deciding the requested claim or full-surface conclusion is unavailable;
- `TOOL_RESULT` — a syntax, lint, build, test, scan, or other explicitly tool-only request; report the exact scoped result without calling the interface passed.

A `FULL_SURFACE_REVIEW` conclusion describes breadth of reviewed quality, not release impact. An open `BLOCKER` or `MAJOR` may fail either scope when it is in scope, but it is not “release-blocking” unless release-impact status is `ADVISORY`.

Handle release impact separately:

- `NOT_REQUESTED` → report `Release impact: NOT_ASSESSED`.
- `ADVISORY` → report either `NO_BLOCKING_FINDING_OBSERVED` or `RELEASE_BLOCKING: <IDs>` for the named candidate, tied to the material evidence that supports the advisory.
- `REQUESTED_BUT_UNSUPPORTED` → report `Release impact: NOT_ISSUED` and the missing candidate evidence; do not relabel a targeted or full-surface pass as release evidence.

Every release-impact result remains advisory evidence only. It never authorizes merge, release, deployment, publication, or acceptance of risk.

**Complete when:** the conclusion names its review scope, independent release-impact status/result, evidence, residuals, stop reason, and unproven effects without exceeding authority.

## Output contract

Adapt the order and level of detail to the request. Preserve the following semantics; a fixed report layout is not required.

```text
Anti-slop review scope: TARGETED_REVIEW | FULL_SURFACE_REVIEW
Release-impact status: NOT_REQUESTED | ADVISORY | REQUESTED_BUT_UNSUPPORTED
Requested claim/surface/candidate and exclusions: <bounded statement>
Conclusion: PASS | CONDITIONAL | FAIL | BLOCKED | TOOL_RESULT
Evidence: <IDs or direct source/render/runtime/tool locators and what each proves>
Axe-style scan, when used: <violations / incomplete / passes / inapplicable kept separate, with material incomplete disposition>
Findings: <BLOCKER/MAJOR/MINOR/NOTE IDs, scope, status, and fresh retest where applicable>
Correction: <not authorized/not needed or affected changes and evidence refreshed>
Stop reason: acceptance met | diminishing returns | blocker/choice | agreed budget
Release impact: NOT_ASSESSED | NOT_ISSUED <missing evidence> | NO_BLOCKING_FINDING_OBSERVED | RELEASE_BLOCKING <IDs>
Claim boundary: <limitations and function/accessibility/data/performance/deployment/publication not established>
Artifact: inline | <persistent report path and deliverable/re-entry/project reason>
Not authorized/performed: <external effects, risk acceptance, and other excluded work>
```

Use [the quality report template](templates/quality-report.md) only when persistence is warranted. Inline evidence-linked findings satisfy the review contract otherwise.

## Common pitfalls

- Expanding a targeted source, copy, breakpoint, or tool question into a full-surface review—or treating full-surface breadth as an implicit release review.
- Requiring one report, a fixed route/viewport/state matrix, or a predetermined number of correction passes regardless of the claim.
- Treating absent rendered evidence as automatically blocking a source-only or explicitly nonvisual conclusion.
- Reading automated output before a visual critique when visual quality is the actual claim.
- Treating a screenshot as proof of interaction, accessibility, authorization, persistence, performance, or production truth.
- Treating syntax, lint, build, test, or scan success as broad interface or release quality, or collapsing axe-style `incomplete`/`inapplicable` into a pass.
- Globally banning common fonts, palettes, cards, gradients, imagery, motion, or 3D.
- Calling a product-name swap or repeated-container count a failure without contextual impact.
- Treating synthetic dashboard values, local requests, or trust imagery as production evidence.
- Reporting automated signals without interpretation or qualitative judgment without a locator.
- Reusing stale evidence, continuing until a pass appears, or lowering severity at the budget boundary.
- Calling delegated selection human approval or any review verdict release/deployment/publication authorization.
- Forcing GPU fallback, lifecycle, device, or performance probes when real-time behavior is not implicated—or omitting them when the requested renderer claim depends on them.

## Verification checklist

Apply only items relevant to the requested scope and claim:

- [ ] Review breadth is explicitly `TARGETED_REVIEW` or `FULL_SURFACE_REVIEW`; full-surface breadth was not conflated with release impact.
- [ ] The claim, exclusions, evidence boundary, mutation authority, and persistence reason are explicit enough for the conclusion.
- [ ] Evidence type and breadth match the requested claim; no universal route, viewport, state, browser, artifact, or pass quota was imposed.
- [ ] Any visual judgment was made from readable current evidence before automated anchoring; a nonvisual review did not claim rendered quality.
- [ ] Product-name swap, container topology, claims/data, reference coherence, hierarchy, missing states, motion, or renderer value were tested only where relevant and contextually.
- [ ] No aesthetic choice was treated as a defect without a governing contract or observable product/user impact.
- [ ] Applicable source, keyboard, accessibility, console, network, responsive, state, and repository-native probes ran after the relevant mutation.
- [ ] Any axe-style result preserves `violations`, `incomplete`, `passes`, and `inapplicable` separately; unresolved material `incomplete` items prevent an unconditional pass.
- [ ] Optional GPU fallback, reduced modes, loss/pause, lifecycle, performance, and device checks were selected only when the claim required them.
- [ ] Every material finding has severity, scope, locator, evidence, impact, correction, status, and fresh retest where applicable.
- [ ] Syntax/tool results and screenshots were not generalized beyond their scoped signals.
- [ ] Work stopped on acceptance, diminishing returns, a blocker/choice, or the agreed budget with residuals visible.
- [ ] Release impact is `NOT_REQUESTED`, `ADVISORY`, or `REQUESTED_BUT_UNSUPPORTED` independently of breadth; only an explicitly requested, materially supported `ADVISORY` labels findings release-blocking.
- [ ] The result does not claim human approval, risk acceptance, merge/release authority, deployment, or publication.
- [ ] A report was persisted only for a deliverable, re-entry, or project requirement; otherwise inline findings were accepted.
