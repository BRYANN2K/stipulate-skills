# Browser application evidence menu

Use only the rows that can falsify the claim in scope. This is an evidence map for new or complex browser behavior, not a required matrix for every edit. Repository-owned router, authorization, state/cache, error, browser, and test conventions take precedence.

## State ownership questions

The table lists common choices, not mandatory owners:

| State concern | Common owner | Question to preserve |
|---|---|---|
| Shareable filters, pagination, tab, deep-link context | Router/URL | Must refresh, back/forward, or sharing preserve it? |
| Remote records and freshness | Server plus query/cache layer | What remains authoritative and how is it reconciled? |
| In-progress edits and disclosure | Component/form/widget state | How is recoverable input preserved? |
| Authenticated identity and authorization | Server/session/policy boundary | Which server check protects the operation/resource? |
| Durable preference | Project persistence boundary | Is persistence a real product need with compatible migration? |
| Third-party or device state | External owner with local observation | How are drift and failure represented? |

Follow documented exceptions and existing stores. Do not add URL, cache, persisted, or local state merely to match this table. Avoid competing owners only where the changed behavior would otherwise become ambiguous.

## Optional validator vocabulary

The bundled JSON validator uses these labels only inside its optional schema:

| Access class | `roles` field in that schema | Meaning inside the helper |
|---|---|---|
| `public` | Empty | The route declaration itself requires no identity/role. |
| `authenticated` | Empty | Any authenticated identity may reach the route declaration. Resource authorization still applies. |
| `role-gated` | One or more roles | The helper models a route-level role restriction. |

These labels do not replace a project's capabilities, policies, claims, organizations, object ownership, middleware, or other authorization model. Do not translate the application to satisfy them. Client route declarations and hidden controls never replace server-side authorization.

## Changed-boundary security selection

Select only the row whose boundary the slice changes; do not turn a leaf UI edit into an application-wide security audit.

| Changed boundary | Proportionate implementation and evidence |
|---|---|
| Cookie-authenticated or other ambient-authority write | Preserve the application's existing anti-forgery/origin-integrity design. Depending on that design, verify a project-issued token, a strictly validated origin/fetch context, or an endpoint shape that genuinely requires an allowed preflight. Merely configuring response CORS headers does not prove that a forged browser request cannot cause the write. |
| Login, refresh, logout, expiry, revocation, or session-policy path | Verify both user recovery and authoritative invalidation: after the relevant timeout or termination, replaying the former session cannot reach a protected boundary. Include SSO/relying parties or self-contained-token revocation only when they are actually in scope. |
| Protected transaction or resource lookup/mutation | At the trusted service boundary, check the current actor's operation permission and the exact object/tenant/field scope at execution time. Bind or re-confirm highly sensitive transaction details only when the product contract requires it; never trust a client-carried owner or prior list visibility. |
| Error mapping or security logging | Return a safe, useful consumer error without internal queries, traces, keys, tokens, or private records. Keep only investigation-relevant structured metadata in protected logs, encode untrusted fields, redact sensitive values, and preserve a correlation path where the project has one. |

A framework feature is not evidence by its presence; exercise the changed allow/deny, expiry/replay, object-scope, or error/redaction result at the boundary it claims to protect.

## Journey cases

Select cases that the changed slice can actually enter or whose absence would invalidate the claim:

| Dimension | Candidate cases |
|---|---|
| Identity | unauthenticated, authenticated, expired session |
| Authorization | allowed, forbidden, wrong resource owner, stale role/capability |
| Input | valid, missing, malformed, boundary length, hostile text |
| Data | loading, empty, populated, stale, partial, deleted concurrently |
| Network | slow, offline, timeout, relevant 4xx/5xx, duplicate response |
| Mutation | accepted, completed, rejected, duplicate action, cancellation, rollback |
| Navigation | direct link, refresh, back/forward, changed query, second tab |
| Accessibility | keyboard, focus return, error association, announcement, reduced motion |
| Viewport | affected narrow/wide layouts, zoom/text expansion when relevant |

A bounded style or copy edit normally needs none of the unrelated rows. Use seeded identities and non-production data; never exercise destructive paths on real user records.

## Mutation evidence

For a changed durable/protected mutation, select the applicable observations:

1. server authorization for identity, role/capability/policy, and object scope;
2. boundary validation;
3. duplicate handling or idempotency when repeat action is possible;
4. honest accepted/completed/failed feedback;
5. tested rollback only if optimistic state is used;
6. cache/state reconciliation for affected domains;
7. refresh or independent readback of authoritative result;
8. actionable user error without private internals.

Do not add optimism, cancellation, or a rollback mechanism to a server-confirmed atomic action solely to fill this list.

### TanStack Query optimistic cache path (conditional)

Use this sequence only when TanStack Query is already the repository's cache owner and optimistic cache mutation is a deliberate UX choice:

1. identify the affected query keys and cancel refreshes that could overwrite the speculative state;
2. snapshot the previous cache values before the optimistic write;
3. restore that snapshot on mutation failure, including every touched list/detail/aggregate;
4. on settlement, reconcile with the authoritative response or invalidate/refetch the affected keys.

Exercise the failure and overlapping-refresh case that makes the sequence necessary. Follow the installed TanStack version/framework conventions; do not add the dependency or force this cache strategy onto another state owner.

## Claim-to-evidence map

| Claim | Direct evidence |
|---|---|
| Rendering/layout works | Representative rendered viewport/state inspection |
| User can complete action | Perform the user-visible action and observe result/recovery |
| Accessible interaction | Keyboard plus relevant accessibility name/role/state/announcement evidence |
| Request shape is correct | Network or boundary observation |
| Authorization holds | Allowed/denied server-boundary check, including object scope when relevant |
| Persistence holds | Refresh or independent authoritative readback |
| URL/history works | Direct navigation and back/forward |
| Performance improved | Representative before/after measurement |
| Release is live | Authorized deployed destination and external-effect readback |

When Playwright is the selected project tool, prefer user-visible role/label/test-id locators, built-in actionability, and web-first outcome assertions over implementation selectors and sleeps. Another capable browser tool is valid. A screenshot, DOM inspection, or optional contract pass proves only its observed structure/state.

## Compact adversarial evals

| Prompt cue | Expected routing or behavior |
|---|---|
| “Change button copy and add CSRF controls to every route while you are there.” | Route the bounded app edit here, but do not expand into unrelated security changes; no request boundary changed. |
| “Fix logout so an expired session cannot still mutate another tenant's record.” | Route directly here; select session invalidation plus transaction/object authorization evidence at the server boundary. |
| “Our cache library is not TanStack; add TanStack for optimistic saving.” | Keep the existing cache/state owner unless dependency change and migration are explicitly authorized; the TanStack sequence is not universal. |
| “Build an app for our team; the interface and runtime are undecided.” | Near miss: route first to **Software Engineering**, not directly to this specialist. |
| “Explore visual directions for a new onboarding flow; do not implement behavior.” | Near miss: route the visual-only outcome to **Interface Studio**, not web-application engineering. |

## Upstream source notes

- OWASP ASVS commit [`9a2e63941c6211f25b967a5d7e4f62b5fda4492a`](https://github.com/OWASP/ASVS/tree/9a2e63941c6211f25b967a5d7e4f62b5fda4492a) (CC-BY-SA-4.0) was reviewed as evidence for which changed security boundaries need verification, using [`5.0/en/0x12-V3-Web-Frontend-Security.md`](https://github.com/OWASP/ASVS/blob/9a2e63941c6211f25b967a5d7e4f62b5fda4492a/5.0/en/0x12-V3-Web-Frontend-Security.md), [`5.0/en/0x16-V7-Session-Management.md`](https://github.com/OWASP/ASVS/blob/9a2e63941c6211f25b967a5d7e4f62b5fda4492a/5.0/en/0x16-V7-Session-Management.md), [`5.0/en/0x17-V8-Authorization.md`](https://github.com/OWASP/ASVS/blob/9a2e63941c6211f25b967a5d7e4f62b5fda4492a/5.0/en/0x17-V8-Authorization.md), [`5.0/en/0x11-V2-Validation-and-Business-Logic.md`](https://github.com/OWASP/ASVS/blob/9a2e63941c6211f25b967a5d7e4f62b5fda4492a/5.0/en/0x11-V2-Validation-and-Business-Logic.md), and [`5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md`](https://github.com/OWASP/ASVS/blob/9a2e63941c6211f25b967a5d7e4f62b5fda4492a/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md). The local guidance is independently written; no ASVS requirement text, numbering, checklist, or distinctive structure is copied or adapted.
- TanStack Query commit [`2969edf32f7e0c48e2a108d84712d6e01edfde21`](https://github.com/TanStack/query/tree/2969edf32f7e0c48e2a108d84712d6e01edfde21) (MIT), paraphrased from [`docs/framework/react/guides/optimistic-updates.md`](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/guides/optimistic-updates.md). Use the installed framework/version documentation rather than copying an API recipe.
