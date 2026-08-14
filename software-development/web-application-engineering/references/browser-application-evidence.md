# Browser application evidence matrix

## State ownership decision

| State | Default owner | Reason |
|---|---|---|
| Shareable filters, pagination, selected tab, deep-link context | URL | Survives refresh/back/forward and can be shared |
| Remote records and their freshness | Server plus query/cache layer | Server remains authoritative |
| In-progress field edits and local disclosure | Component/form state | Ephemeral and close to rendering |
| Authenticated identity and authorization | Server/session boundary | Client visibility is not security |
| Durable user preference | Explicit persisted preference boundary | Persist only with product need and migration strategy |
| Third-party or device state | External owner with local observation | Reconcile rather than pretending local authority |

Document exceptions. Do not duplicate one domain into multiple independent stores without a reconciliation rule.

## Route access contract

| Access class | `roles` contract | Meaning |
|---|---|---|
| `public` | Empty | No authenticated identity or role is required by the route declaration. |
| `authenticated` | Empty | Any authenticated identity may reach the route; resource-level server authorization still applies. |
| `role-gated` | One or more roles | The route declaration restricts access to the listed roles. |

Do not attach roles to `public` or `authenticated` routes as metadata. That creates a contradictory discriminator/companion pair and can silently turn a non-role-gated route into a role constraint in downstream checks. Client route declarations never replace server-side authorization.

## Journey matrix

For changed journeys select applicable cases:

| Dimension | Cases |
|---|---|
| Identity | unauthenticated, authenticated, expired session |
| Authorization | allowed, forbidden, wrong resource owner, stale role |
| Input | valid, missing, malformed, boundary length, hostile text |
| Data | loading, empty, populated, stale, partial, deleted concurrently |
| Network | slow, offline, timeout, 4xx, 5xx, duplicate response |
| Mutation | accepted, completed, rejected, duplicate click, cancellation, rollback |
| Navigation | direct link, refresh, back, forward, changed query, opened in second tab |
| Accessibility | keyboard, focus return, error association, live announcement, reduced motion |
| Viewport | narrow touch, representative desktop, zoom/text expansion where relevant |

Use seeded test identities and data. Do not exercise destructive paths on real user records.

## Mutation contract

A mutation is not complete when a button changes color. Prove:

1. the server checked identity, role, and resource scope;
2. validation ran at the boundary;
3. duplicate submission is prevented or safely idempotent;
4. UI feedback distinguishes accepted, completed, and failed work;
5. optimistic state has a tested rollback;
6. affected caches/state domains are invalidated or reconciled;
7. refresh or independent readback observes the authoritative result;
8. errors preserve useful context without exposing internals.

## Browser evidence

Pair claims with the right observation:

- rendering/layout → viewport and screenshot/visual inspection;
- accessibility → keyboard plus accessibility tree and announcements;
- request shape → network observation;
- authorization → server response and boundary test;
- persistence → refresh or independent data readback;
- history/URL → direct navigation and back/forward;
- performance → trace and representative measurements;
- completion → all acceptance evidence after the final relevant mutation.
