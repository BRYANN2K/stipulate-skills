---
name: web-application-engineering
description: "Use when building or changing a stateful browser application with routes, authentication, forms, server data, client or URL state, and multi-step user journeys. Defines route, state, permission, mutation, failure, and evidence contracts; implements behavior in bounded slices; and requires security, accessibility, and real-browser verification."
license: Apache-2.0
compatibility: Works with any browser application stack and Agent Skills-compatible client. The optional contract validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: web-application, frontend, state-management, accessibility, security, browser-testing
---

# Web Application Engineering

## Overview

Build browser software around observable user journeys and explicit ownership of routes, authorization, state, mutations, and failure recovery. Preserve the repository's architecture and public contracts. A structurally valid contract is necessary but cannot replace behavior tests, server-side authorization checks, or real-browser execution.

<HARD-GATE>
Never infer authorization from hidden UI, trust client validation as a security boundary, expose credentials or private errors, silently discard user input, or execute destructive product actions against real data while testing. Authentication changes, permission grants, data migrations, dependency installation, publication, and production mutations require explicit authorization and environment scope.
</HARD-GATE>

## When to use

- Build or modify an authenticated or stateful web product.
- Add routes, forms, user journeys, mutations, URL state, server state, local state, or external integrations.
- Fix browser behavior involving loading, empty, error, stale, optimistic, or permission states.
- Audit whether frontend behavior matches server contracts and accessibility requirements.

Do not use this skill for a content-first public website, a dashboard whose primary complexity is metric/resource semantics, or backend-only work. Route those to `website-production-engineering`, `dashboard-application-engineering`, or the relevant backend/API workflow.

`dashboard-application-engineering` is a specialization of this skill. Keep shared routing, authentication, forms, accessibility, and browser-security work here; load the dashboard specialization for a slice where at least two of these dominate: metric/source semantics, dense query-and-drill-down behavior, privileged mutations, or independently failing and reconciling data regions.

## Workflow

### 1. Trace the behavior end to end

Read repository instructions, route definitions, layouts, components, schemas, API clients, server handlers, authorization checks, state/cache code, form validation, tests, and Git status. Trace the affected journey from navigation through boundary validation and persistence back to rendered state.

Map trust boundaries: URL, user input, browser storage, network response, server session, third-party content, and model-generated output. Treat all external data as untrusted.

**Complete when:** scope names the actor, journey, routes, public contracts, state owners, permissions, mutations, and repository-native verification commands.

### 2. Define the application contract

Copy `templates/web-application-contract.json` to a temporary path. Record:

- routes, access class, and roles;
- use an empty `roles` list for `public` and `authenticated` routes; only `role-gated` routes declare one or more allowed roles;
- each state domain's owner, source of truth, and stale policy;
- user journeys with success and failure states;
- mutations, permission, optimism/rollback, and feedback;
- browser, viewport, accessibility, and evidence targets.

Validate read-only:

```bash
python3 <skill-directory>/scripts/validate_web_application_contract.py check \
  --manifest /tmp/web-application-contract.json \
  --json
```

The validator rejects credential-like assignments after bounded ASCII canonicalization, including repeated-quote serialized assignments, bounded-punctuation Basic/Bearer wrappers, dot- or space-separated credential names, and compact identifiers in any case with environment or version prefixes/suffixes, without reflecting the rejected value. This conservative filter does not prove arbitrary text secret-free.

Malformed manifests, including numeric literals beyond the runtime's bounded integer conversion, fail with a controlled generic JSON diagnostic rather than a traceback.

Load [the browser application evidence matrix](references/browser-application-evidence.md) for authentication, optimistic changes, external integrations, or cross-route work.

**Complete when:** references resolve, `public` and `authenticated` routes have empty role lists, each `role-gated` route declares at least one allowed role, each journey actor is allowed on every role-gated route it traverses, every state domain has one owner and stale policy, and optimistic mutations have a substantive rollback contract rather than a deferred placeholder. Standalone or label-affixed `TODO`, `TBD`, or `placeholder` work markers (including `_label` and numeric affixes) are vacuous even inside longer text; `defer` or `deferred` is likewise vacuous when used as a directive at field start or after a label separator. Bounded future-work phrases such as `will be implemented later`, `not yet defined`, `future work`, `define ... after implementation`, explicit `plan`/`plans` for a later phase (including `plans on`, `plan is to`, and a bounded comma-delimited incidental clause before `to`), postponement until implementation, `intend`/`intends` to specify eventually, or any subject whose behavior `remain`/`remains` to be decided are also vacuous; the latter two forms likewise allow one bounded comma-delimited incidental clause before `to` or `to be`. The bounded ASCII canonicalization covers encoded forms of these checks. Ordinary domain sentences beginning with words such as `Pending` or `Later` remain valid when they describe an actionable restoration behavior. This is a bounded syntax guard, not semantic proof: contract `PASS` does not replace human review or execution evidence that the stated rollback is concrete and effective.

### 3. Plan one vertical behavior slice

Choose the smallest independently useful journey segment that crosses the real interfaces it claims to change. Define acceptance evidence before code:

- success path;
- unauthorized and forbidden behavior;
- invalid input;
- loading, empty, stale, partial, and service-failure behavior as applicable;
- keyboard/focus behavior;
- persistence and reconciliation after mutation.

Avoid horizontal plans such as “build all components, then wire state, then add tests.” Prefer one route or journey through UI, boundary, server, and verification.

**Complete when:** the slice has a falsifiable behavior test and a real-browser path.

### 4. Implement behavior with explicit state ownership

For new or changed behavior, write a failing test through the closest stable public interface before implementation. Reuse repository schemas at trust boundaries. Keep server state in the server/cache layer, shareable navigation state in the URL, ephemeral presentation state locally, and persisted client state only when an explicit product need justifies it.

Rules:

- enforce authorization server-side for every protected operation;
- validate input at the boundary and return stable errors;
- preserve form data and context on recoverable failure;
- cancel or ignore obsolete asynchronous work;
- define optimistic rollback before showing optimistic success;
- invalidate/refetch or otherwise reconcile affected state after mutation;
- keep loading, empty, forbidden, partial, error, and ready states distinguishable;
- preserve local component and design-system conventions.

**Complete when:** the focused test is GREEN and the changed behavior does not rely on hidden timing or visual-only permission gates.

### 5. Exercise the real browser journey

Use an isolated browser profile and representative seeded/test data. Verify:

- direct navigation, refresh, back/forward, deep links, and shareable URL state;
- authenticated, unauthenticated, and unauthorized behavior;
- form keyboard flow, validation, focus movement, and error recovery;
- loading, empty, stale, partial, offline/service-error, and retry behavior;
- mutation success, duplicate submission prevention, rollback, and reconciliation;
- console errors, failed/duplicated network requests, and unexpected redirects;
- accessibility tree, names, focus order, announcements, and reduced motion;
- representative mobile and desktop widths.

A DOM inspection or screenshot is evidence for only what it observes. Use network and server evidence for authorization and persistence claims.

**Complete when:** the changed journey runs after the final code mutation with expected UI, network, and durable-state results.

### 6. Verify security and performance proportionately

Threat-model changed boundaries. Test abuse cases next to use cases: role escalation, object ownership, replay/duplicate mutation, malicious input, stale client state, unsafe redirects, and third-party failure. Inspect dependency and security tooling already owned by the repository; do not force automated remediation or install tools implicitly.

Measure before optimizing. Profile actual rerenders, network waterfalls, server latency, bundle cost, and interaction delay. Keep complexity only when fresh evidence justifies it.

### 7. Reconcile and report

Run focused tests, relevant full suites, type/lint/build checks, and browser/E2E evidence after the final mutation. Inspect the diff. Separate baseline failures from regressions. Deployment, publication, real account changes, and production data effects remain separate actions.

## Output contract

```text
Web application: IMPLEMENTED | VERIFIED | PARTIAL | BLOCKED
Journey: <actor and outcome>
Routes / state / permissions: <contract summary>

Changed
- UI/client: <paths>
- Boundary/server: <paths or none>
- Tests: <paths>

Evidence
- Contract: PASS | FAIL
- Focused behavior: <command/result>
- Full relevant suite: <command/result>
- Browser journey: <success and failure results>
- Authorization/data readback: <result>
- Accessibility/performance: <result or unavailable>

Gaps / not performed
- <production accounts, migration, publication, deployment, or missing checks>
```

## Common pitfalls

- Choosing state libraries before identifying state ownership.
- Treating hidden controls as authorization.
- Testing components while claiming a browser journey works.
- Using optimistic UI without rollback and reconciliation.
- Collapsing empty, error, forbidden, and loading into one blank state.
- Losing form input after server validation.
- Verifying only client state without checking durable server state.
- Attaching test automation to a personal authenticated browser profile.
- Calling a build or screenshot proof of application correctness.

## Verification checklist

- [ ] Routes, boundaries, schemas, authorization, state owners, mutations, tests, and commands were traced.
- [ ] The application contract passes and references resolve.
- [ ] Changed behavior began with a failing behavior test where a harness exists.
- [ ] Protected operations enforce authorization server-side.
- [ ] State ownership, stale policy, rollback, feedback, and reconciliation are explicit.
- [ ] Success, invalid, unauthorized, failure, retry, loading, empty, and relevant partial states were exercised.
- [ ] The real browser journey ran after the final mutation at representative widths.
- [ ] Console, network, durable-state, keyboard, focus, accessibility, and reduced-motion evidence were checked proportionately.
- [ ] Security and performance claims are scoped to actual tests and measurements.
- [ ] Production mutations and publication were not performed implicitly.
