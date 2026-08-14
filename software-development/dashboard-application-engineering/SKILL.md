---
name: dashboard-application-engineering
description: "Use when building or changing an analytical, operational, or hybrid dashboard whose users make decisions or mutate resources. Defines source, grain, freshness, metric, resource, filter, view, permission, action, failure, and reconciliation contracts; implements dense accessible interfaces; and requires source-backed and real-browser evidence."
license: Apache-2.0
compatibility: Works with any dashboard or admin-console stack and Agent Skills-compatible client. The optional contract validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: dashboard, admin-console, analytics, data-quality, permissions, browser-testing
---

# Dashboard Application Engineering

## Overview

Build dashboards as decision and operation systems, not chart galleries. Every displayed fact must trace to a source, grain, freshness, and reconciliation rule; every resource action must trace to permission, confirmation, feedback, auditability, and post-action state. Keep analytical and operational semantics explicit even when they share one view.

<HARD-GATE>
Never invent metrics, formulas, targets, source freshness, permissions, production data, or action semantics. Never test destructive controls against real resources or grant roles implicitly. Source access, production queries, permission changes, bulk actions, data exports, publication, and deployment require explicit authorization and bounded test data or environment.
</HARD-GATE>

## When to use

- Build an analytics dashboard, control plane, operations console, or hybrid dashboard where data semantics or privileged operations dominate.
- Add metrics, tables, filters, drill-down, resource detail, alerts, bulk actions, or role-based views when at least two dashboard-specific dimensions are first-class: metric/source semantics, dense query-and-drill-down behavior, privileged mutations, or independently failing and reconciling data regions.
- Fix inconsistencies between cards, charts, tables, detail pages, action results, or source data.
- Audit metric definitions, data freshness, permissions, failure states, or operational safety.

Do not use this skill for a marketing page with decorative statistics, a static report, simple chart page, ordinary CRUD/admin screen, general web application without dashboard semantics, or configuring an observability vendor. Use the website, web application, or observability workflow instead.

This skill specializes `web-application-engineering`. Use the web-application skill for the shared shell, routing, authentication, forms, accessibility, and browser-security foundation; use this skill locally for source/metric semantics, dense exploration, permission-aware operations, partial-source behavior, and reconciliation.

## Workflow

### 1. Identify the decisions and operations

Inspect repository instructions, routes, schemas, queries/API clients, data transformations, metric definitions, resource models, tables/charts, filters, permissions, actions, tests, and Git status. Ask what decision or operation each surface enables. A widget without a supported question is not automatically required.

Classify the dashboard:

- `analytics` — primarily measures and compares facts;
- `operational` — primarily inspects and mutates resources;
- `hybrid` — uses metrics to prioritize resource operations.

**Complete when:** scope names users, decisions, sources, resources, metrics, actions, role boundaries, affected views, and validation commands.

### 2. Establish the source and product contract

Copy `templates/dashboard-contract.json` to a temporary path. Define:

- source owner, grain, freshness, and reconciliation;
- metric label, source, formula, grain, and freshness;
- resource identity, source, and statuses;
- filter scope, default, and shareability;
- views, paths, purpose, widgets, filters, roles, and states;
- actions, roles, destructiveness, confirmation, audit event, feedback, and reconciliation;
- permissions and acceptance evidence.

Validate read-only:

```bash
python3 <skill-directory>/scripts/validate_dashboard_contract.py check \
  --manifest /tmp/dashboard-contract.json \
  --json
```

The validator rejects credential-like assignments after bounded ASCII canonicalization, including repeated-quote serialized assignments, bounded-punctuation Basic/Bearer wrappers, dot- or space-separated credential names, and compact identifiers in any case with environment or version prefixes/suffixes, without reflecting the rejected value. This conservative filter does not prove arbitrary text secret-free.

Malformed manifests, including numeric literals beyond the runtime's bounded integer conversion, fail with a controlled generic JSON diagnostic rather than a traceback.

Load [dashboard modes and evidence](references/dashboard-modes-and-evidence.md) for analytical formulas, bulk actions, or partial source failure.

**Complete when:** all references resolve, hybrid mode has both metrics and resources, source and metric grain, formula, freshness, reconciliation, verification claim, and verification evidence fields are substantive rather than deferred placeholders, every view defines loading/empty/partial/error/ready states, each view role is permitted to access every resource exposed by that view's widgets, and destructive actions have substantive confirmation and reconciliation contracts. In these semantic fields, standalone or label-affixed `TODO`, `TBD`, or `placeholder` work markers (including `_label` and numeric affixes) are vacuous even inside longer or bounded ASCII-encoded text; `defer` or `deferred` is likewise vacuous when used as a directive at field start or after a label separator. Bounded future-work phrases such as `will be implemented later`, `not yet defined`, `future work`, `define ... after implementation`, explicit `plan`/`plans` for a later phase (including `plans on`, `plan is to`, and a bounded comma-delimited incidental clause before `to`), postponement until implementation, `intend`/`intends` to specify eventually, or any subject that `remain`/`remains` to be decided are also vacuous; the latter two forms likewise allow one bounded comma-delimited incidental clause before `to` or `to be`. Normal domain language remains valid when it states an actionable contract. This bounded syntax guard does not prove semantic substance; contract `PASS` still requires human/source review and execution evidence for the declared formula, safety, reconciliation, claim, and evidence.

### 3. Prove data semantics before presentation

For each metric and resource field, trace source → query/API → transformation → UI. Confirm:

- unit and grain;
- time window and timezone;
- null, unknown, late, deleted, and duplicated data treatment;
- freshness display or bounded expectation;
- filters included in each value;
- denominator and comparison baseline;
- reconciliation against an independent source or known invariant.

Do not choose a chart until the comparison or decision is clear. Prefer a table when users need exact values, scanning, sorting, filtering, or actions.

**Complete when:** a skeptical user can determine what every value means and how current it is.

### 4. Design dense information and state hierarchy

Place decision context before decoration:

1. scope and active filters;
2. summary signal with definition and freshness;
3. prioritized list/table or comparison;
4. drill-down with stable identity and shareable URL where useful;
5. actions with role and effect clarity;
6. recovery from empty, partial, stale, forbidden, and failed states.

Tables need explicit column priority, wrapping/truncation behavior, sorting, pagination or virtualization strategy, selection persistence, bulk-action scope, and responsive fallback. Do not hide critical resource identity or action context on narrow screens.

### 5. Implement a source-to-decision slice

Write a failing test for changed metric/resource/action behavior. Implement one path from seeded source through transformation to one user decision or operation. Enforce permissions server-side. Preserve stable metric and machine output contracts. For actions:

- bind confirmation to exact resources and effect;
- prevent duplicate submission;
- keep partial failures attributable per resource;
- report accepted versus completed operations accurately;
- reconcile cards, tables, detail views, selections, and caches afterward;
- emit audit events only through established repository mechanisms.

**Complete when:** focused tests prove the slice and no UI success state outruns authoritative state.

### 6. Exercise source, state, and browser evidence

Use safe seeded fixtures or an authorized non-production environment. Verify:

- source grain, formula, freshness, and known reconciliation examples;
- filter defaults, combinations, clearing, URL sharing, and back/forward;
- card/chart/table/detail agreement under the same scope;
- loading, empty, stale, partial-source, full-error, forbidden, and ready states;
- role-specific visibility plus server enforcement;
- action confirmation, cancellation, success, failure, duplicate prevention, and reconciliation;
- keyboard table navigation, focus, accessible names, chart alternatives, contrast, and responsive behavior;
- console and network failures.

Screenshots cannot prove formulas, authorization, or reconciliation. Pair rendered evidence with source-backed assertions and post-action readback.

The contract treats actions as role-scoped dashboard capabilities, not as proof that an action is rendered in a particular view. When a view exposes an action, render it only for the intersection of the view's roles, the action's roles, and the permission grant; verify the same boundary server-side.

### 7. Report readiness without data inflation

Run relevant static, unit, integration, seeded-data, and browser checks after the final mutation. Inspect the diff and generated output. Clearly label synthetic fixtures, stale snapshots, unavailable production data, skipped role tests, and unverified external effects. Do not equate a structurally valid contract with a trustworthy dashboard.

## Output contract

```text
Dashboard: IMPLEMENTED | VERIFIED | PARTIAL | BLOCKED
Mode: analytics | operational | hybrid
Decision / operation: <scope>

Contract
- Sources and freshness: <summary>
- Metrics/resources: <summary>
- Filters/views/roles/actions: <summary>

Evidence
- Contract: PASS | FAIL
- Source and reconciliation: <fixture/query/result>
- Behavior tests: <command/result>
- Browser states and roles: <result>
- Action readback: <result or not applicable>
- Accessibility/responsive: <result>

Gaps / not performed
- <production queries/actions, role coverage, exports, deployment, or missing evidence>
```

## Common pitfalls

- Starting from available charts rather than user decisions.
- Showing a number without source, formula, grain, window, timezone, or freshness.
- Letting filters affect some widgets but not others without disclosure.
- Treating hidden buttons as permission enforcement.
- Collapsing partial data into either success or total failure.
- Using optimistic success for long-running or destructive operations.
- Losing selection or action context during refresh.
- Verifying screenshots while ignoring source reconciliation.
- Testing actions against production resources for convenience.

## Verification checklist

- [ ] Users, decisions, mode, sources, metrics, resources, filters, views, roles, and actions were identified.
- [ ] The dashboard contract passes and all references resolve.
- [ ] Every displayed fact has source, grain, freshness, and reconciliation semantics.
- [ ] Every resource has stable identity and every protected action has server-side authorization.
- [ ] Destructive and bulk actions define confirmation, partial failure, feedback, auditability, and reconciliation.
- [ ] Loading, empty, stale, partial, forbidden, error, and ready states were exercised.
- [ ] Metrics, tables, detail, filters, and action results reconcile under the same scope.
- [ ] Real-browser, keyboard, accessibility, responsive, console, and network checks ran after the final mutation.
- [ ] Synthetic and unavailable data are labeled honestly.
- [ ] Production data mutations, exports, publication, and deployment were not performed implicitly.
