# Interface Studio workflow contract

Use this contract when Interface Studio needs cross-discipline routing. It describes proportional checkpoints and authority boundaries, not an approval state machine. A specialist-only request should stay in that specialist's targeted mode.

## Surface classification precedes routing

Classify each affected route by its primary user job before selecting a design profile or engineering handoff. This classification is independent of whether the work is targeted, bounded, or full studio.

| Surface class | Preserve first | Profile / engineering route |
|---|---|---|
| `PUBLIC_CONTENT_NAVIGATION_SITE` | public information architecture, findability, navigation, reading order, content continuity, metadata/SEO intent | public-site branch of `profiles/landing.md` / normally `website-production-engineering` |
| `CONVERSION_LANDING` | proposition, evidence, objection handling, CTA consequence, form or conversion path | conversion branch of `profiles/landing.md` / normally `website-production-engineering` |
| `TASK_DATA_UI` | task and state model, permissions, source/grain/freshness, actions, recovery, reconciliation | `profiles/system.md` / `web-application-engineering` or `dashboard-application-engineering` |

When one product spans these jobs, classify routes separately. Do not turn a public content/navigation site into a conversion sequence merely because both are public, or apply marketing ceremony to task/data UI.

## Scope routing

| Scope | Shortest safe path |
|---|---|
| Targeted copy, direction, system, motion, or QA outcome | Invoke only the matching specialist mode; return to Interface Studio only if scope expands across disciplines |
| Bounded edit in an established UI | Inspect → inherit/extend locally → implement → verify the affected behavior/claim |
| New page, flow, or meaningful visual pattern with settled framing | Compact working brief if needed → one recommended direction or enough options for the remaining trade-off → vertical slice → affected review |
| New identity, materially open interface, or explicit full-studio request | Product/content truth → storyboard → enough distinct alternatives → selection → vertical slice → proportional rendered review |
| Existing `.design-flow` schema `1.0` project | Follow that repository-local contract or request explicit migration authority; never bypass, delete, migrate, or reinitialize it implicitly |

The smallest valid route wins. One route or direction is valid when constraints already select it. Additional alternatives are justified only by a decision-relevant trade-off.

## Checkpoints are descriptive

```text
inspected → decided as needed → built or delivered → reviewed as needed → verified to claim
```

These words describe progress; they are not mandatory turns or human gates.

- `inspected`: enough product, repository, and authority context is known for the requested mode.
- `decided`: a real choice is selected by the human or delegated agent; use `not-applicable` when constraints already determine it.
- `built or delivered`: the requested local slice or design deliverable exists.
- `reviewed`: decision-relevant rendered/source evidence has localized findings when review is in scope.
- `verified to claim`: fresh evidence supports exactly the stated outcome and residual gaps remain visible.

A correction inside the authorized scope does not reopen local-write authority. Ask again only if scope/effect expands, an unresolved consequential choice requires the human, or the next action adds a dependency, changes live/external/production state, is destructive, or deploys/publishes.

## Decision authority

Record an owner only when a material choice exists:

- `human`: the user reserved or made the choice;
- `delegated`: the user explicitly delegated route/copy/design judgment;
- `not-applicable`: the request, established system, or evidence already determines the route.

If selection is delegated, choose and continue. A decision record is traceability, not permission to install dependencies, publish, deploy, use unsupported claims, or weaken accessibility/evidence boundaries.

A consequential new visual-system choice needs human selection when the user has not delegated it. Even a selected system proposal needs separate local build authority if the request was proposal-only. Bounded extensions of an inherited system may proceed under an explicit bounded build/edit request.

## Cross-domain handoff

Interface Studio owns product story/copy, visual direction, system decisions, motion, and visual QA for websites, landing pages, and materially visual UI. Behavior and production engineering belong to one downstream route selected from the surface class: public content/navigation and conversion landing work normally goes to `website-production-engineering`; task/data UI goes to `web-application-engineering` or `dashboard-application-engineering` according to the state/data contract. Prefer `software-engineering` instead when it is installed and orchestration across engineering disciplines is material.

Do not require both routes for a bounded task. Pass forward the surface class, already-inspected product facts, chosen direction, local system constraints, affected states, evidence, and unresolved questions. The downstream route must not replay discovery or reopen a delegated/selected visual decision unless implementation evidence reveals a material conflict.

## Artifact policy

Inline chat, temporary previews, and session notes are valid. Persist an artifact only when at least one is true:

1. the user requested it as a deliverable;
2. the information must survive across runs or agents;
3. repository policy requires it;
4. later implementation or review would otherwise lose a consequential decision, proof boundary, or evidence trail.

Possible artifacts, never a fixed bundle:

- brief/storyboard for durable product truth and constraints;
- options/reference ledger when alternatives and source boundaries matter;
- claims ledger for material externally checkable wording and proof scope;
- motion or real-time scene contract when behavior/lifecycle decisions must survive;
- visual/quality report when the review is a deliverable or spans correction runs;
- design/UI contract or portable tokens for explicit or observed shared-system work.

Low-fi must be viewable enough to test its claim—a prototype, route, wireframe, or readable image—not another prose description. Temporary comparison assets may remain untracked or be removed according to repository policy.

## Full studio sequence

For a new or materially open interface, use the sequence as navigation:

```text
product evidence and claims boundary
→ storyboard/task flow
→ one route if selected, otherwise enough distinct content/visual alternatives
→ source-first reference evidence only where needed
→ viewable concepts at decision-changing states/viewports
→ human or delegated selection
→ smallest useful local vertical slice
→ visual judgment plus applicable browser probes
→ grouped corrections while they remain valuable and authorized
→ fresh claim-matched verification
```

Do not make the comparison larger than the decision. Keep coupled copy/direction alternatives together rather than creating every combination. In `profiles/landing.md`, use the public-site branch for navigation/reading work and the conversion branch for an offer decision; neither is a mandatory section formula. For task/data UI, follow `profiles/system.md`; it does not impose marketing ceremony.

## Evidence contract

Choose evidence from the behavior and claim:

- record route/locator, relevant state/fixture, viewport/environment, source revision when available, and evidence freshness;
- include contrasting viewport or state evidence only where layout, content, interaction, fallback, or the claim can change;
- critique rendered work before automated output when visual quality is in scope;
- run only applicable keyboard, accessibility, console/network, state, build, responsive, and performance probes;
- classify skipped, unavailable, degraded, and not-applicable checks honestly.

For optional real-time graphics, evidence must match the claims being made about semantic fallback, reduced motion/data, renderer failure/loss, offscreen pause, lifecycle/cleanup, deterministic capture, and performance. Route renderer APIs to the official relevant skill/docs. A screenshot cannot prove frame pacing, physical devices, context recovery, cleanup, accessibility, or performance.

A material finding includes severity, locator, evidence, impact, correction, and retest. Syntax, link, lint, build, or automated audit `PASS` proves that check only; it never upgrades the visual or product-quality claim by itself.

## Revision stop rule

Use grouped correction passes without a universal count. Stop when one condition occurs:

- the requested acceptance criteria are met;
- another pass has diminishing decision or user value;
- a material blocker or unresolved choice requires human input;
- the agreed time/iteration budget is reached;
- further work would cross the authorized scope/effect boundary.

Recapture only evidence invalidated by a relevant mutation. At stop, report open material findings and evidence gaps without lowering severity or implying release quality outside the requested review scope.

## Independent boundaries

| Boundary | Bounded local design/build authority covers it? |
|---|---|
| Requested frontend/design files in the stated local scope | Yes |
| Selecting a material route/direction | Only when delegated or human-selected; not needed when constraints already decide |
| Unsupported public claim | No; prove, qualify, mark internal, or remove |
| Dependency install/upgrade, renderer/decoder/model package | No |
| Destructive action or real user/resource mutation | No |
| Production/live/external environment or account | No |
| Deployment, publication, DNS, analytics/consent activation | No |

## Completion rule

A completion label means the final local result has fresh evidence for the bounded claim and no undisclosed material finding within that scope. It does not mean approved, deployed, published, production-safe, universally responsive, fully accessible, or performance-certified unless those separate claims were actually authorized and tested.

Human-facing outputs may reorder or chunk the contract for `focus-friendly-delivery`, but must preserve authority, safety, evidence, residual findings, and unverified effects.
