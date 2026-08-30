---
name: dashboard-application-engineering
description: "Use when building or changing an analytical, operational, or hybrid dashboard whose users make decisions or mutate resources. Inherits project data and permission conventions, requires source-backed facts and server-authorized actions where touched, and scales optional contract lint, browser checks, reconciliation, and live-data controls to the claim."
license: Apache-2.0
compatibility: Works with any dashboard or admin-console stack and Agent Skills-compatible client. The bundled JSON template and validator are optional structural lint; the validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: dashboard, admin-console, analytics, data-quality, permissions, browser-testing
---

# Dashboard Application Engineering

## Overview

Build dashboards as decision or operation surfaces, not chart inventories. Apply source/grain/freshness/reconciliation discipline to facts the change actually touches and permission/feedback/readback discipline to actions it actually exposes. Inherit the repository's data model, authorization vocabulary, route/state conventions, component system, and commands.

A clear request to change a bounded local dashboard slice authorizes the necessary local source writes. It does not require a dashboard manifest, every-state matrix, new metric catalog, or second implementation approval.

<HARD-GATE>
Never invent metrics, formulas, targets, source freshness, permissions, production data, or action semantics. Never use hidden controls as authorization or test destructive controls against real resources. New source or production query access, production data export, permission changes, bulk/destructive actions, dependency installation or changes, deployment, and publication require explicit authorization and a bounded environment/target.
</HARD-GATE>

## When to use

- Build an analytics dashboard, control plane, operations console, or hybrid decision surface.
- Change metrics, dense tables, filters, drill-down, resources, alerts, privileged actions, or partial-source behavior.
- Fix disagreement between summaries, charts, tables, detail views, actions, or source data.
- Audit metric meaning, freshness, permissions, failure handling, or reconciliation.

Use ordinary web-application engineering for general browser behavior without material dashboard semantics. This specialization is useful when source/metric semantics, dense query and drill-down, privileged operations, or independently failing/reconciling data regions materially affect the slice; it need not wait for an arbitrary count of those traits.

## Task modes

| Mode | Default path | Evidence target |
|---|---|---|
| Bounded edit | Trace only the affected field/widget/query/action, edit directly, preserve local conventions | Focused known-answer, render, or action check matching the claim |
| New behavior or surface | Define one decision/operation and build one independently useful source-to-user slice | Seeded source behavior plus real browser/action result where claimed |
| Complex contract or migration | Coordinate several sources, views, filters, roles, bulk actions, or metric definitions | Targeted source/role/state/reconciliation matrix; optional JSON structural lint |
| Release or live effect | Separate local readiness from production queries, exports, mutations, permission rollout, deployment, or publication | Exact authorization, bounded fixtures/environment, authoritative readback |

## Workflow

### 1. Identify the affected decision or operation

Read applicable instructions, routes, schemas, queries/API clients, transformations, metric/resource definitions, filters, permissions, actions, tests, and Git status only as far as the slice needs. Ask what user decision or operation the changed surface supports.

Identify the affected source facts, resource identities, roles/capabilities, views, and repository-native checks. Do not require a full dashboard inventory for a style-only or isolated defect. Ask only when missing semantics would change the result or make a displayed fact/action unsafe.

### 2. Inherit the project's data and permission model

Follow established metric registries, query layers, time/grain conventions, role/capability/policy checks, route guards, loading/error patterns, and audit mechanisms. Do not rename them into `analytics` / `operational` / `hybrid` or another bundled taxonomy unless that vocabulary is useful locally.

For complex cross-source, cross-view, filter, permission, state, or action work, optionally use `templates/dashboard-contract.json` as scratch memory and run:

```bash
python3 <skill-directory>/scripts/validate_dashboard_contract.py check --manifest /tmp/dashboard-contract.json --json
```

This bundled schema is **optional structural lint** for references inside its own model. Its mode, state, role, view, metric, and resource fields are not required application architecture. Use it only when the work maps cleanly; do not modify the dashboard to make it pass. A pass does not prove formula truth, freshness, authorization, action safety, reconciliation, or quality. Its secret and malformed-input checks harden only that optional file.

Load [dashboard modes and evidence](references/dashboard-modes-and-evidence.md) as a menu when formulas, cross-view filtering, partial source failure, bulk/destructive actions, or reconciliation are material.

### 3. Prove only the semantics the change relies on

For a touched metric or resource field, trace enough of source → query/API → transformation → presentation to establish the claim. Record applicable unit/grain, time window/timezone, null/late/duplicate treatment, freshness, active filter scope, formula/denominator, and a known-answer or invariant. Do not demand all fields from an untouched metric or a purely presentational change.

Choose presentation from the user's question. Prefer a native semantic table when exact values, scanning, sorting, resource identity, or actions matter and the cells do not form a composite keyboard widget. Use an ARIA grid only for real cell/row navigation, selection, or editing that requires managed focus; then implement the complete applicable keyboard, entry/exit, and interactive-descendant focus model rather than adding grid roles to a static table. Partial or stale data must not masquerade as complete current data.

When the touched source is Prometheus, preserve its metric meaning instead of treating the query as generic rows: keep canonical metric names/values in Prometheus base units while formatting display units separately, keep labels as bounded dimensions, interpret counters as monotonic totals or interval change rather than gauges, and distinguish an absent series from an observed zero. Do not rename an established series or impose Prometheus rules on another backend merely to satisfy this guidance.

### 4. Select and implement one decision slice

For visually material work, preserve the Interface Studio dashboard profile: user decision/operation, source-backed or clearly synthetic data, permission boundaries, relevant loading/empty/stale/partial/forbidden/error/ready states, inspiration, and coherent prototype(s). The human selects when they reserve judgment; explicitly delegated visual judgment may select and proceed. Do not add a second approval gate. In an established system or leaf edit, inherit the existing direction.

Implement one independently useful path from a safe source fixture to a user decision or operation. Reuse local components/tokens and extract shared rules only after observed reuse or explicit system scope. Add a focused regression or known-answer test when changed semantics/behavior and the existing harness make it useful; do not require failing-first ceremony for a visual-only change.

For a protected action, enforce authorization server-side and bind any consequence warning/confirmation to the actual target and effect when consequence warrants it. A consequential modal confirmation needs context-appropriate initial focus (the safer action for an irreversible choice), focus contained while open, Escape dismissal before commitment, and focus returned to the invoker or a logical successor; a dialog role alone is not the interaction. Prevent or safely handle duplicate submission, distinguish accepted from completed work, preserve per-resource failure for bulk work when applicable, and reconcile the affected summaries/lists/details/caches from authoritative state. Use existing audit mechanisms only.

### 5. Verify with safe, claim-scoped evidence

Use seeded fixtures or an explicitly authorized non-production environment. Select evidence by claim:

- metric/formula → known-answer test or independent calculation;
- freshness/scope → source timestamp/contract plus rendered behavior;
- cross-view/filter agreement → same fixture and scope across affected views;
- permission → allowed/denied server-boundary evidence for role and resource;
- action → safe test mutation plus authoritative readback;
- partial/bulk failure → attributable seeded results and honest UI state;
- presentation/accessibility → real browser, keyboard, names/tree, responsive state; for a selected grid or consequential dialog, exercise its managed focus path rather than checking roles alone;
- performance → current measurement for the changed dense/expensive path.

Use the repository's browser tooling. When Playwright matches the project, prefer user-visible locators, actionability, and outcome assertions over arbitrary waits or implementation selectors; do not install it implicitly. Screenshots prove presentation only, never formulas, authorization, freshness, or reconciliation.

For visually material Interface Studio work, capture the important widths and critical states, critique the selected direction for decision hierarchy/data legibility/permission clarity, fix material in-scope findings, and recapture after the last visual change.

Exercise only relevant loading, empty, stale, partial, forbidden, error, ready, submission, and completion states. Do not fabricate coverage of a state the surface cannot enter.

### 6. Reconcile and separate live effects

Run focused and relevant repository-native checks after the final mutation, inspect the diff, and label synthetic data, unavailable sources, skipped roles, and unverified effects. Evidence volume does not make a source untrustworthy claim true.

Production queries, data exports, real resource actions, role grants, bulk/destructive operations, dependency changes, deployment, and publication remain separate. Execute only with exact authorization, bounded targets, and authoritative post-effect readback.

## Output contract

Report these semantics, in any order or adapter-specific presentation:

- outcome, user decision/operation, and bounded view/source/action scope;
- changed facts, UI, boundaries, or tests;
- selected or inherited visual direction when relevant;
- fresh source, behavior, permission, reconciliation, and browser evidence actually obtained;
- synthetic/unavailable data, residual gaps, and live effects not performed.

An optional manifest need not appear when unused. Never treat structural lint or a screenshot as trustworthy dashboard proof.

## Common pitfalls

- Requiring a full metric/resource catalog for a bounded style or copy fix.
- Forcing bundled mode, role, state, or view labels over repository conventions.
- Starting from available charts rather than the user decision.
- Showing a number without enough source context to support the claim.
- Letting filters silently diverge across affected views.
- Treating hidden buttons as permission enforcement.
- Using optimistic success for long-running/destructive work without authoritative reconciliation.
- Asking for redundant design approval after selection.
- Testing production queries or actions for convenience.

## Verification checklist

- [ ] Task mode, decision/operation, local boundary, affected sources/actions, and repository conventions are clear.
- [ ] Bounded requested writes proceeded without mandatory artifacts or redundant approval.
- [ ] The project's data, metric, permission, state, route, and audit conventions were inherited.
- [ ] Optional JSON/template use, if any, is described only as structural lint for complex work.
- [ ] Every changed displayed fact has enough source, grain, freshness, filter, and reconciliation evidence for the claim; Prometheus-specific unit/label/counter/absence semantics were applied only when that source exists.
- [ ] Native table semantics remain the default; any selected grid or consequential modal has its complete applicable keyboard/focus behavior.
- [ ] Every changed protected action has server authorization, consequence handling, feedback, and authoritative readback as applicable.
- [ ] The implementation is one independently useful source-to-decision/operation slice.
- [ ] Visually material work follows the human-selected or explicitly delegated Interface Studio direction.
- [ ] Browser, accessibility, state, source, permission, action, and performance checks are fresh and proportional.
- [ ] Production data access/export/mutation, grants, bulk/destructive effects, dependencies, deployment, and publication remained separately authorized and verified.
