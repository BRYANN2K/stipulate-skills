---
name: anti-slop-review
description: "Use when reviewing a designed or implemented website, web application, or dashboard for generic AI-like copy, unsupported marketing claims, reference collage, arbitrary visual values, repetitive card layouts, fake data, missing states, decorative motion, design-system drift, accessibility, responsive, functional, SEO, or browser-quality failures. Produces evidence-linked findings and blocks release on material violations rather than an unexplained score."
license: Apache-2.0
compatibility: Works with any web stack and Agent Skills-compatible client. Runtime, accessibility, and responsive claims require an available browser and repository-native checks.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: anti-slop, design-review, copy-review, accessibility, frontend-qa, marketing-readiness
---

# Anti-Slop Review

## Overview

Review whether an interface is specific, truthful, coherent, usable, implemented faithfully, and verified in context. “AI slop” is not a visual genre or list of banned words; it is observable loss of product meaning through unsupported copy, borrowed identity, arbitrary composition, fake data, missing behavior, or decorative polish that outruns function.

<HARD-GATE>
Do not pass a surface because it looks polished in screenshots. Do not invent evidence, lower severity to meet a deadline, or call skipped checks passed. Claims, authorization, persistence, formulas, accessibility, responsive behavior, performance, SEO delivery, and motion semantics require the evidence appropriate to each claim.
</HARD-GATE>

## When to use

- Review an interface before design-system approval, implementation completion, merge, release, or publication.
- Audit generic copy, landing-page sameness, card-wall composition, trend collage, design drift, fake metrics, missing states, motion excess, accessibility, responsive, or browser behavior.
- Compare implemented frontend against approved product, reference, design-system, and project UI artifacts.
- Turn subjective “this feels AI-generated” feedback into specific evidence and fixes.

Do not use for choosing the initial direction, writing all copy from scratch, penetration testing, or proving backend/security behavior from UI evidence.

## Workflow

### 1. Establish review truth and scope

Inspect the requested surface, Git diff, repository instructions, product routes/journeys, `PRODUCT-STORY.md`, `PAGE-COPY.md`, `CLAIMS.md`, `REFERENCE-LEDGER.md`, `DESIGN.md`, `tokens.json`, `COMPONENTS.md`, compiled project UI skill, `MOTION.md` where applicable, implementation, tests, and current browser output.

Name baseline failures separately from changes under review. Identify which claims require source, code, test, browser, accessibility-tree, network, data, or human evidence.

Load [the review criteria](references/review-criteria.md) for severity and dimension-specific checks.

**Complete when:** scope, approved sources of truth, affected journeys/viewports/states, and evidence methods are explicit.

### 2. Audit truth and copy

Map visible claims, metrics, testimonials, logos, trust marks, urgency, comparisons, and availability to `CLAIMS.md` and primary evidence. Check that copy:

- names the actual user, mechanism, constraint, or task;
- does not survive unchanged under a competitor's brand;
- uses proof at the supported scope;
- preserves human voice rather than formulaic cadence;
- gives forms, loading, empty, error, success, permission, and destructive states actionable language;
- avoids invented specificity and decorative jargon.

Flag a common word only when its usage is vague or unsupported. Do not run a word blacklist as a quality metric.

**Complete when:** every visible factual claim is supported or reported, and each copy finding quotes the exact text and explains the product impact.

### 3. Audit direction and composition

Compare the surface with the selected visual thesis and no-go list. Check:

- attention follows user decisions;
- layout area reflects content importance;
- sections/components have distinct jobs;
- cards, borders, gradients, glows, blur, particles, and illustrations carry meaning;
- references were adapted into principles rather than recognizable fragments;
- typography, spacing, density, and imagery/data language remain coherent;
- product-specific signature is present without overwhelming the task.

Uniform grids are not automatically wrong; they fail when unequal information is forced into equal containers without product reason.

**Complete when:** each visual finding points to an approved principle or observable task/hierarchy failure rather than personal taste alone.

### 4. Audit design-system fidelity and states

Trace rendered values and components to semantic tokens, primitives, and `COMPONENTS.md`. Find:

- arbitrary colors, spacing, radius, shadows, typography, durations, or z-index values;
- duplicated/forked primitives;
- undocumented variants;
- broken theme/mode mapping;
- missing default, hover, focus-visible, active/selected, disabled, loading, success, error, empty, and skeleton states where applicable;
- responsive rules that merely stack without preserving identity, priority, or action context.

Inspect source and computed/rendered output. A clean token file does not prove product code uses it.

**Complete when:** every divergence is documented, justified and approved, or reported with exact source/rendered evidence.

### 5. Audit product and data behavior

Exercise the actual journey with safe representative data. For websites, inspect conversion, form, metadata, canonical/indexability, social, semantic heading, trust/legal, and analytics event behavior. For applications, inspect routes, permissions, state ownership, mutations, retries, and reconciliation. For dashboards, inspect source, grain, formula, freshness, filter scope, card/chart/table agreement, realistic fixtures, permissions, actions, partial failure, and post-action readback.

Synthetic data must be labeled and plausible enough to expose layout/state behavior without masquerading as production evidence.

**Complete when:** the interface's success, failure, data, and action semantics are tested through the appropriate implementation and source boundaries.

### 6. Audit motion

For every material animation, identify its intent: causality, feedback, orientation, continuity, progression, or hierarchy. Verify trigger, timing token, easing, exit, interruption, repeated input, focus, data relationship, and reduced-motion equivalent.

Report motion that delays action, implies success early, copies a reference, competes with content, or has no information role. Also report abrupt changes where motion is necessary to preserve spatial understanding.

**Complete when:** retained motion earns its cost and normal/reduced behavior is exercised in context.

### 7. Audit browser, accessibility, responsive, and performance evidence

Use representative narrow and wide viewports and relevant user settings. Inspect:

- landmarks, headings, names, roles, values, descriptions, and announcements;
- keyboard order, focus-visible, focus movement/return, skip paths, and traps;
- contrast, non-color cues, target size, zoom/reflow, overflow, and content wrapping;
- loading, empty, partial, error, permission, offline, and retry states;
- console errors, failed/duplicated requests, hydration/runtime warnings;
- image/font loading, layout shift, interaction delay, and bundle/network cost proportionately;
- metadata and social output in the actual document/response for public pages.

Separate unavailable, skipped, failed, and not applicable checks.

**Complete when:** browser claims come from fresh post-mutation execution, not source inspection or old screenshots alone.

### 8. Write findings, fix blockers, and rerun

Copy [the quality report template](templates/quality-report.md) to `.design-flow/QUALITY-REPORT.md`. Each finding records:

- stable ID and severity;
- dimension and affected locator;
- violated source rule or observable user failure;
- evidence;
- impact;
- smallest durable correction;
- verification result after correction.

Severities:

- `BLOCKER` — false/misleading claim, inaccessible primary task, broken core journey, authorization/data deception, gate bypass, or material unsupported behavior;
- `MAJOR` — significant hierarchy, state, responsive, system, motion, conversion, or recovery failure;
- `MINOR` — bounded inconsistency with low task impact;
- `NOTE` — evidence-backed opportunity, not required for pass.

Do not hide findings in a single aggregate score. Fix blockers and relevant majors, rerun affected evidence, then report residual risk honestly.

**Complete when:** `## Evidence` and `## Findings` are substantive, every blocker has a disposition, final checks are fresh, and skipped coverage is named.

## Output contract

```text
Anti-slop review: PASS | PASS_WITH_NOTES | FAIL | BLOCKED
Surface/journey: <scope>
Approved baseline: <artifact digests or locators>

Findings
- Blocker: <count and IDs>
- Major: <count and IDs>
- Minor: <count and IDs>
- Notes: <count and IDs>

Dimensions
- Truth/copy: PASS | FAIL | SKIPPED
- Direction/composition: PASS | FAIL | SKIPPED
- Design system/states: PASS | FAIL | SKIPPED
- Product/data behavior: PASS | FAIL | SKIPPED
- Motion: PASS | FAIL | NOT_APPLICABLE | SKIPPED
- Accessibility/responsive: PASS | FAIL | SKIPPED
- Marketing/runtime/performance: PASS | FAIL | NOT_APPLICABLE | SKIPPED

Evidence
- Source/claims: <locators>
- Static/tests/build: <commands/results>
- Browser/viewports/states: <results>
- Accessibility tree/keyboard/contrast: <results>
- Network/data/action readback: <results>

Residual gaps
- <unverified environment, role, device, production effect, publication>
```

## Common pitfalls

- Using an unexplained numeric slop score as the verdict.
- Treating personal taste as a violation without a principle or task impact.
- Banning common words, gradients, cards, or animation categorically.
- Reviewing only the happy path or desktop screenshot.
- Calling synthetic dashboard data production evidence.
- Checking token files without tracing actual rendered values.
- Checking hidden buttons instead of server authorization.
- Calling metadata SEO readiness without runtime/indexability evidence.
- Treating automated accessibility scans as keyboard or screen-reader proof.
- Fixing visible symptoms while leaving the system rule or duplicated component unchanged.
- Passing skipped browser, role, or reduced-motion coverage silently.

## Verification checklist

- [ ] Current diff, source artifacts, implementation, tests, and rendered output were inspected.
- [ ] Baseline failures are separated from regressions or scope findings.
- [ ] Every visible factual claim maps to evidence and exact allowed scope.
- [ ] Copy findings quote exact text and identify product/user impact.
- [ ] Composition findings trace to approved direction or observable hierarchy/task failure.
- [ ] Rendered values, components, variants, modes, and states trace to the approved design system.
- [ ] Product routes, conversion, permissions, state, failure, data, and action behavior were exercised as applicable.
- [ ] Dashboard metrics and fixtures are source-defined, reconciled, realistic, and honestly labeled.
- [ ] Every material animation has intent, interruption, exit, and reduced-motion evidence.
- [ ] Narrow/wide, keyboard/focus/tree/contrast, overflow/wrapping, console/network, and relevant performance checks ran after final mutation.
- [ ] Every finding includes severity, locator, evidence, impact, fix, and recheck status.
- [ ] Blockers and relevant majors were fixed or explicitly remain blocking.
- [ ] Skipped, unavailable, failed, and not-applicable evidence are reported distinctly.
