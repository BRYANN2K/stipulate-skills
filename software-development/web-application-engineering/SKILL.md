---
name: web-application-engineering
description: "Use when building or changing a stateful browser application with routes, authentication, forms, server data, client or URL state, and multi-step journeys. Follows the repository's auth and state conventions, implements independently useful slices, and scales contract memory, browser checks, security evidence, and release controls to the work."
license: Apache-2.0
compatibility: Works with any browser application stack and Agent Skills-compatible client. The bundled JSON template and validator are optional structural lint; the validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: web-application, frontend, state-management, accessibility, security, browser-testing
---

# Web Application Engineering

## Overview

Build browser software around observable user outcomes while inheriting the repository's router, authorization model, schemas, state/cache boundaries, component system, and test conventions. Use high freedom inside a bounded implementation; be exact at trust boundaries, public behavior, durable mutation, and production effects.

A clear request to change a bounded local journey authorizes the necessary local source writes. It does not require a JSON contract, new state taxonomy, full E2E matrix, or separate implementation approval.

<HARD-GATE>
Never infer authorization from hidden UI, trust client validation as a security boundary, expose credentials or private/internal errors, silently discard user input, or test destructive actions against real data. Authentication changes, permission grants, any shared or remote environment/data mutation (including staging or test), production data access, data migrations, dependency installation or changes, destructive external actions, deployment, and publication require explicit authorization and environment scope.
</HARD-GATE>

## When to use

- Build or modify an authenticated or stateful browser product.
- Add or change routes, forms, journeys, mutations, URL state, server state, local state, or integrations.
- Fix loading, empty, error, stale, optimistic, concurrent, or permission behavior.
- Audit whether client behavior matches server contracts and user-visible accessibility requirements.

Use `website-production-engineering` for content-first public pages and `dashboard-application-engineering` when source/metric semantics, dense exploration, privileged operations, or independently failing data regions materially dominate. Backend-only work follows the repository's backend/API workflow.

## Task modes

| Mode | Default path | Evidence target |
|---|---|---|
| Bounded edit | Trace the affected component/boundary, edit directly, preserve local state/auth patterns | Focused check that can reproduce the defect or changed behavior |
| New behavior or surface | Define one actor outcome and build one independently deliverable vertical slice | Focused behavior plus the real browser path and relevant server result |
| Complex contract or migration | Map interacting routes, permissions, state owners, schemas, mutations, or compatibility | Targeted journey/role/state matrix; optional JSON structural lint |
| Release or live effect | Separate local readiness from auth rollout, migration, production data, deployment, or publication | Exact authorization, safe environment, rollout/rollback boundary, independent readback |

## Workflow

### 1. Trace the smallest end-to-end path

Read applicable instructions, route definitions, layouts/components, schemas, API clients, server handlers, authorization checks, state/cache code, form handling, tests, and Git status as needed for the slice. Trace navigation → input/boundary → server decision → persistence → rendered reconciliation.

Identify the actor, outcome, affected routes, state owners, permission boundary, mutations, failure cases, and repository-native checks. Treat URL/input/storage/network/third-party/model output as untrusted. Classify the trust boundary actually changed: browser request origin/integrity, session lifecycle, protected transaction/resource authorization, or error/log path. A presentation-only edit does not trigger a broad security retrofit. Ask only about choices that materially change behavior, ownership, compatibility, or risk.

### 2. Inherit the project's contract vocabulary

Use the repository's existing middleware, roles/capabilities/policies, route guards, schemas, cache/store ownership, error envelopes, and accessibility conventions. Do not rename them into this pack's taxonomy or add parallel state simply to complete an artifact.

For complex cross-route, permission, state, or mutation work, optionally use `templates/web-application-contract.json` as scratch memory and run:

```bash
python3 <skill-directory>/scripts/validate_web_application_contract.py check --manifest /tmp/web-application-contract.json --json
```

This bundled schema is **optional structural lint** for references inside its own model. Its `public` / `authenticated` / `role-gated` labels and state-owner fields are validator vocabulary, not required implementation architecture. Use it only when it maps cleanly; do not modify the application to make it pass. A pass is not authorization proof, behavior proof, rollback proof, or a quality gate. Its secret and malformed-input checks harden only that optional file.

Load [the browser application evidence matrix](references/browser-application-evidence.md) only for relevant changed trust boundaries, complex journeys, authentication, optimistic work, external integrations, or release claims.

### 3. Select and plan one useful slice

For visually material work, preserve the Interface Studio application profile: actor task, real or clearly synthetic data, permission boundaries, relevant loading/empty/error/forbidden/success states, inspiration, and coherent prototype(s). The human selects when they reserve judgment; explicitly delegated visual judgment may select and proceed. Do not add a second design approval gate. For a coherent established system or leaf edit, inherit its direction without manufacturing alternatives.

Choose the smallest independently useful journey segment that crosses the real interfaces it claims to change. State the observable success and the few failure/permission/state cases material to that slice. Do not require every theoretical state or a horizontal artifact/component/test train before implementation.

Reuse established components and tokens. Extract shared rules only after observed reuse or explicit system scope.

### 4. Implement through existing boundaries

Keep server authorization authoritative for every protected operation and current object/tenant scope. For a changed protected transaction, authorize the final action and resource at execution time and add re-authentication or transaction binding only when the product's sensitivity model calls for it. Validate at trust boundaries, map private failures to safe actionable user errors, and preserve entered data/context on recoverable failure. When an error/log path changes, keep stack traces, queries, tokens, credentials, and sensitive records out of user responses and ordinary logs; preserve the project's structured correlation and injection-safe logging conventions.

For changed cookie-authenticated or other ambient-authority writes, preserve the project's request-integrity design and verify that an allowed request succeeds while a disallowed cross-origin form/navigation/request shape cannot perform the mutation. For changed session lifecycle behavior, make expiry/logout/administrative termination unusable at the authoritative session boundary; clearing client state alone is not invalidation. Apply neither check to unrelated presentation work.

Handle concurrency and optimistic behavior when applicable: prevent or tolerate duplicates, bind async results to the current operation, provide rollback before optimistic success, and reconcile affected state from an authoritative result. Do not add optimism, persistence, cancellation, URL ownership, or new state libraries when the requested behavior does not need them.

If and only if the repository already uses TanStack Query and this slice deliberately uses cache-level optimism, follow its installed framework/version conventions to cancel relevant in-flight refreshes, snapshot the touched cache state, restore that snapshot on failure, and then reconcile from an authoritative server result or invalidation. Do not introduce TanStack Query or transplant this sequence into a different cache model to satisfy this guidance.

Use the fastest useful feedback loop. Add a regression/public-boundary test when behavior changed and a suitable harness exists, especially for authorization, validation, mutation, or recurrence. A failing-first test can be useful for new logic but is not mandatory ceremony for a change better proved directly.

### 5. Verify user-visible behavior and security proportionately

Select only the cases needed to support the claim:

- render/layout → representative viewport and state inspection;
- interactive journey → perform the user action and observe outcome/recovery;
- authorization → allowed and denied server-boundary evidence, including object scope where relevant;
- persistence → refresh or independent readback;
- URL/history → direct navigation and back/forward when part of the contract;
- accessibility → keyboard, focus, names/states, announcements, and reduced motion as changed;
- performance → representative measurement of the changed bottleneck.

Default to local seeded fixtures and disposable identities. A shared or remote non-production system is still an external target: mutate it only with explicit authorization, bounded identities/data, isolation or cleanup as applicable, and authoritative post-action readback. Use the repository's browser tool. When Playwright matches the project, prefer role/label/test-id locators, actionability, and web-first outcome assertions over brittle implementation selectors or arbitrary sleeps; do not install it implicitly. A DOM snapshot or screenshot proves only what it observes.

For visually material Interface Studio work, capture important wide, narrow, and critical states, critique them against the selected direction and task hierarchy, fix material in-scope findings, and recapture after the final visual change.

Threat-model the changed boundary rather than the entire application. Select CSRF/cross-origin request-integrity, session expiry/invalidation, transaction/object authorization, replay/duplicate mutation, hostile input, safe error/log handling, stale state, unsafe redirects, or third-party failure evidence only when the slice exposes that risk.

### 6. Reconcile and separate live effects

Run focused and relevant repository-native checks after the final mutation and inspect the diff. Label baseline failures and skipped environments honestly. Do not expand to an entire suite merely to create evidence volume when a narrower check supports the claim; do not make a broad claim from a narrow test.

Authentication rollout, permission grant, migration, production account/data changes, dependency changes, deployment, and publication remain separate effects. Execute them only with exact authorization, bounded targets, and post-effect readback.

## Output contract

Report these semantics, in any order or adapter-specific presentation:

- outcome, actor journey, and bounded routes/state/permission scope;
- changed client and server/boundary paths;
- selected or inherited visual direction when relevant;
- fresh evidence mapped to the claims actually made;
- residual gaps and dependency/live effects not performed.

An optional manifest need not appear when it was not useful. Do not equate structural lint, a component test, a screenshot, or a build with end-to-end authorization and persistence.

## Common pitfalls

- Forcing the bundled route/role/state taxonomy over project conventions.
- Turning a leaf fix into a full contract, every-state matrix, or new state architecture.
- Treating hidden controls or client validation as authorization.
- Testing a component while claiming a complete browser journey.
- Adding optimistic UI without a real need, rollback, or reconciliation.
- Losing form input or exposing internal errors on server failure.
- Asking for redundant design approval after an authorized selection.
- Using personal authenticated sessions or real records for convenient tests.
- Calling a build, lint pass, or screenshot application proof.

## Verification checklist

- [ ] Task mode, actor outcome, local boundary, existing auth/state conventions, and changed trust boundaries are clear.
- [ ] Bounded requested writes proceeded without mandatory artifacts or redundant approval.
- [ ] The project's authorization, schema, state/cache, error, and component conventions were inherited rather than replaced.
- [ ] Optional JSON/template use, if any, is described only as structural lint for complex work.
- [ ] Protected operations enforce server-side authorization and private errors stay private.
- [ ] Only changed request-integrity, session, transaction/object, and error/log boundaries received their applicable security checks.
- [ ] The implementation is one independently useful slice with only applicable states, concurrency, rollback, and reconciliation behavior; TanStack-specific optimism was used only when that stack already existed.
- [ ] Visually material work follows the human-selected or explicitly delegated Interface Studio direction.
- [ ] Fresh browser, server, accessibility, persistence, and performance evidence is proportional to the claims made.
- [ ] Tests use safe identities/data and narrow claims do not imply unrun matrix coverage.
- [ ] Auth changes, permission grants, production data, migration, dependencies, destructive effects, deployment, and publication remained separately authorized and verified.
