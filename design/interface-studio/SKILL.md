---
name: interface-studio
description: "Use when an interface design outcome is materially open, spans product story/copy, visual direction, design system, motion, or visual QA, or explicitly requests the full product-to-interface studio. This is the sole design orchestrator; focused design tasks and established-direction engineering go directly to their specialists. Real-time WebGL/WebGPU/Three/R3F/vgpu is strictly opt-in for an explicit request or named product need."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and any frontend stack. Rendered comparison and verification require an available browser or equivalent preview tool; no controller is required.
metadata:
  version: "2.1.0"
  author: BRYANN2K
  category: design
  tags: design-workflow, frontend, prototype, copywriting, visual-review, anti-slop, webgl, webgpu, vgpu
---

# Interface Studio

## Overview

Move from product evidence to a useful rendered interface without turning design into a paperwork gate. Choose the shortest safe path: a targeted request stays targeted; a bounded build inherits the existing visual world; the full studio is for a new or materially open interface, or when the user explicitly asks for it.

The named steps below are routing guidance, not admission gates. Calibrate freedom per step: product truth, accessibility, authority, fallback, and evidence boundaries are low-freedom contracts; the number of references, alternatives, artifacts, states, viewports, and revision passes is a judgment call driven by the actual decision and claim.

If a repository already contains `.design-flow/workflow.json` with schema `1.0`, treat that file as a project-local constraint. Do not bypass, delete, reinitialize, or migrate it without explicit migration authority. Its presence does not impose that schema on other projects.

<HARD-GATE>
An explicit bounded request authorizes the bounded local design or frontend work it names. Continue without asking again unless the scope or effect expands, an unresolved material choice needs the human, or the next action adds a dependency, touches live/external/production state, is destructive, or deploys/publishes. If the user explicitly delegates route or design selection, select, record the rationale, and continue. Authority never permits unsupported claims or weaker accessibility, fallback, reduced-motion/data, cleanup, performance, or evidence standards.
</HARD-GATE>

## When to use

- Create or materially redesign a landing page, marketing site, product flow, dashboard, admin surface, or substantial frontend slice.
- Coordinate product story, art direction, implementation, motion, and rendered critique when more than one discipline is materially involved.
- Repair a UI whose product framing and visual direction are both unsettled.
- Run the full studio because the user explicitly requests it.
- Route a strictly optional real-time concept when the user requests it or a named product need genuinely requires spatial, procedural, or interactive rendering.

Do not run the full studio for a targeted copy, direction, design-system, motion, or QA request. Invoke the matching specialist in its targeted mode. A mechanical typo or backend-only task needs neither the studio nor a design artifact.

### Cross-domain ownership

Interface Studio is the front door and owner for product story/copy, visual direction, design-system decisions, motion design, and visual QA on websites, landing pages, and materially visual UI. When the work also needs behavior or production engineering, carry the already-inspected facts and selected visual contract forward—do not replay discovery.

Choose the engineering route only after classifying the surface job below, then hand off directly: public content/navigation sites and conversion landing pages go to `website-production-engineering`; task/data UI goes to `web-application-engineering` or `dashboard-application-engineering` according to its state and data contract. Do not route a classified surface through the `software-engineering` entry skill or require both an umbrella and a direct specialist. If engineering only returns a bounded feasibility fact, Interface Studio keeps ownership and resumes when that fact is answered. If the remaining outcome is implementation behavior or production evidence, transfer ownership to the direct engineering specialist; it returns to Interface Studio only when implementation exposes a named unresolved visual decision. The selected visual contract stays authoritative, while engineering owns routes, state, permissions, data, forms, SEO delivery, security, runtime, and production evidence.

## Workflow

### 1. Route before producing artifacts

Inspect only enough repository evidence to classify the interface's primary job before choosing a mode, profile, or engineering handoff. Scope mode and surface class are separate decisions. If the request spans routes with different jobs, classify each affected route rather than forcing the whole product into one bucket.

| Surface class | Primary user job | Profile and downstream bias |
|---|---|---|
| `PUBLIC_CONTENT_NAVIGATION_SITE` | Find, browse, understand, or move among public content, documentation, editorial, institutional, portfolio, or catalog destinations | Use the public-site branch of `profiles/landing.md`; preserve information architecture, navigation, reading hierarchy, findability, and SEO continuity; normally hand off to `website-production-engineering` |
| `CONVERSION_LANDING` | Evaluate an offer or proposition and take a focused signup, lead, purchase, download, or contact action | Use the conversion branch of `profiles/landing.md`; preserve audience, proof, objections, CTA consequence, and conversion path; normally hand off to `website-production-engineering` |
| `TASK_DATA_UI` | Complete an authenticated/operational task, inspect data, decide, or mutate a resource | Use `profiles/system.md`; preserve state, permissions, source/grain/freshness, actions, recovery, and reconciliation; hand off to `web-application-engineering` or `dashboard-application-engineering` as applicable |

A public website is not automatically a conversion funnel, and a product UI is not a styled landing page. Classification changes the content, profile, evidence, and handoff emphasis; it does not force `FULL_STUDIO` or any artifact.

Then choose one proportional mode:

| Mode | Use when | Shortest safe path |
|---|---|---|
| `TARGETED_COPY` | Wording, claims, metadata, or state copy is the requested outcome | `product-story-and-copy`: inspect governing evidence → draft/edit affected copy → truth/specificity check |
| `TARGETED_DIRECTION` | The user needs a visual thesis, reference analysis, or one bounded concept decision | `design-direction`: inspect content/system → research only missing evidence → render or describe enough to resolve the choice |
| `TARGETED_SYSTEM` | Tokens, components, foundations, or a shared UI contract are the requested outcome | `design-system-first`: inherit canonical sources → change/extract only the requested shared rule → validate representative affected uses |
| `TARGETED_MOTION` | One interaction, transition, or motion audit is requested | `interface-motion`: trace affected transition → specify/prototype/implement/audit → verify affected motion |
| `TARGETED_REVIEW` | A bounded visual, copy, accessibility, responsive, motion, runtime, or anti-slop review is requested | `anti-slop-review`: bound the claim → collect only decision-relevant evidence → report or correct within authority |
| `BOUNDED_BUILD` | A local slice fits a coherent existing visual world | inspect → inherit/extend locally → implement → capture/probe affected behavior → correct → verify |
| `FULL_STUDIO` | A new/material interface has open product framing or visual direction, or the user asks for the complete route | brief/storyboard → enough real alternatives to resolve open choices → selection → vertical slice → affected review loop |

For every mode identify the affected surface class, audience/task, existing visual system, requested local scope, repository-native checks, decision owner, and external-effect boundaries. Ask only questions whose answers materially change truth, scope, route, or an irreversible/consequential choice. A reversible local detail can proceed under a stated assumption.

Load [the workflow contract](references/workflow-contract.md) for authority, artifact, and completion rules.

### 2. Establish only the product and content truth the mode needs

Use repository evidence before invention. For a full or materially new surface, capture the audience/job, primary action, mechanism, constraints, proof, unknowns, and storyboard. The storyboard contains as many beats or frames as the decision or task needs—no fixed section count.

Use `product-story-and-copy` when positioning, public claims, conversion copy, or consequential state copy is in scope. Keep facts, hypotheses, proof, and unknowns distinct. Create a claims ledger only when externally checkable wording needs durable traceability; otherwise keep exact source locators inline or in the current working note. Never invent a metric, customer, testimonial, logo, capability, urgency, or result to fill a composition.

Inline chat or session notes are valid. Persist a brief, storyboard, options, or claims record only when the user requested it as a deliverable, it must survive across runs/agents, or repository policy requires it.

### 3. Resolve only real creative choices

When constraints already select a coherent route, make one evidence-backed recommendation and continue. When a real trade-off remains, create enough independent copy or visual options to expose it; stop when another option would not change the decision. One direction is valid. Alternatives must differ in strategic argument or structural visual logic, not synonyms or skins.

Research the smallest source set that supplies missing evidence. For every retained reference record its primary URL, exact observation, product-specific adaptation, reuse/licence status, and no-copy boundary. Do not assemble recognizable fragments into a collage.

Keep copy and visual options coupled where their arguments depend on each other; do not expand them into a combinatorial matrix. For an application/dashboard, compare the same representative task, data, and consequential state. For a bounded edit, inherit the system and skip options.

Load [the landing profile](references/profiles/landing.md) for an active `PUBLIC_CONTENT_NAVIGATION_SITE` or `CONVERSION_LANDING` branch, selecting the matching public-surface job rather than imposing conversion structure on every website. Load [the system profile](references/profiles/system.md) only for an active `TASK_DATA_UI` branch.

Real-time graphics remain opt-in. Semantic HTML/CSS/DOM is the default, with SVG/image/video where sufficient. Load [the real-time graphics profile](references/realtime-graphics.md) only after an explicit request or named product need passes its admission test. There is no GPU option quota, hidden-text exception, implicit dependency permission, or forced renderer.

### 4. Make the decision viewable and select once

Render the minimum evidence that exposes the choice: lightweight HTML, a project route, wireframe, or readable image. Choose viewports and states because content, behavior, or the decision changes there—not to fill a matrix. A single representative view may be enough for a bounded nonresponsive choice; a responsive or stateful claim needs the relevant contrasting evidence.

Decision ownership is explicit:

- `human` when the user reserved a material choice;
- `delegated` when the user explicitly authorized the agent to choose;
- `not-applicable` when the established system or request already determines the route.

When delegated, compare the viable options against product truth, task/CTA clarity, hierarchy, originality, accessibility risk, responsive viability, and implementation cost, then choose and continue. A fresh reviewer can reduce builder bias when the decision is consequential, but it is not a quota. Do not average unrelated fragments. Read [delegated selection](references/delegated-selection.md) when this branch applies.

### 5. Build the smallest useful vertical slice

Implement in the repository's real stack and preserve its design system, primitives, terminology, and dependencies unless the request explicitly changes them. Start with the smallest slice that can falsify the chosen direction or complete the bounded request.

Hand behavior/production concerns to the one engineering route selected above, passing the existing brief, decision, constraints, and open questions rather than starting discovery again. Local build authority does not authorize dependency installation or live/resource mutation. Label synthetic fixtures rather than presenting them as customer or production evidence.

For a real-time direction, build semantic DOM and the static poster/fallback first, then the smallest decisive renderer beat. Preserve the existing renderer and versions. Route framework details to the official relevant skills or current project documentation: use `vgpu` for `vgpu`, and the official GSAP core/timeline/ScrollTrigger/performance skills when GSAP applies. The page and primary action must remain useful if the canvas never starts, is reduced, or fails.

Use `design-system-first` only for explicit system work, an inherited shared-system change, or reusable rules demonstrated by the slice. A bounded change should extend the canonical local system directly rather than waiting for a speculative new one.

### 6. Add only causal motion

Use `interface-motion` where motion communicates causality, feedback, orientation, continuity, progression, or hierarchy. Keep interruption, exit, input, data completion, reduced-motion behavior, and cleanup explicit. Verify only affected transitions and environments needed for the motion claim. Decorative motion cannot rescue weak static hierarchy.

### 7. Review the affected claim and stop responsibly

Use `anti-slop-review` in targeted or full-surface scope as the requested outcome requires; treat any explicitly requested release-impact advisory as a separate evidence posture, never as authorization. Capture readable rendered evidence for viewports and states where the changed behavior or quality claim can differ. Critique visual evidence before automated output when visual quality is in scope; then run the applicable keyboard, accessibility, console/network, responsive, state, build, and performance probes.

Group corrections by root cause and recapture only invalidated evidence. Stop when the requested acceptance criteria are met, additional passes have diminishing value, a material blocker needs human input, or the agreed time/iteration budget is exhausted. Do not run a fixed number of critique cycles or soften an open material finding to declare success.

A screenshot proves appearance at one state and size; syntax, lint, build, or tool `PASS` proves only that check. Neither is standalone proof of function, accessibility, claim truth, responsive quality, performance, renderer cleanup, deployment, or publication. For real-time work, keep fallback, reduced-motion/data, loss, offscreen pause, lifecycle, performance, and capture claims tied to directly affected evidence.

Run fresh repository-native checks after the last relevant mutation. Publication and deployment remain separate actions.

## Persistent artifacts

Artifacts are memory or deliverables, not admission tickets. Inline chat artifacts are valid.

| Information that may need to survive | Persist only when |
|---|---|
| Product brief/storyboard | requested as a deliverable, needed across runs/agents, or required by the project |
| Options/reference ledger/selection | alternatives materially informed a consequential decision and future work needs the rationale |
| Claims ledger | externally checkable public claims need durable proof/scope traceability |
| Motion contract | multiple implementers/runs need the behavior, or the project requires it |
| Visual/quality review | the review itself is a deliverable, release evidence is requested, or corrections span runs |
| Design/UI contract or portable tokens | shared reuse is explicit/observed or a named consumer requires it |
| Real-time scene fields | the optional renderer branch is active and lifecycle/fallback decisions must survive |

The [templates](templates/) are optional scaffolds. Use only the relevant sections and repository-native names.

## Output contract

Preserve the following information, but order and chunk it for the user's focus. `focus-friendly-delivery` may change presentation, never hide authority, safety, evidence, or gaps.

```text
Interface Studio: ROUTED | BRIEFED | SELECTED | BUILT | REVIEWED | VERIFIED | BLOCKED
Mode: TARGETED_COPY | TARGETED_DIRECTION | TARGETED_SYSTEM | TARGETED_MOTION | TARGETED_REVIEW | BOUNDED_BUILD | FULL_STUDIO
Surface class: PUBLIC_CONTENT_NAVIGATION_SITE | CONVERSION_LANDING | TASK_DATA_UI — <classify each affected route when mixed>
Surface and requested scope: <surface, affected routes/states, exclusions>
Decision: <selected/inherited/pending/not applicable> — owner=<human|delegated|not-applicable>
Local work: <edits/build and paths>
Rendered/behavior evidence: <only affected routes, states, viewports, commands, results>
Real-time graphics: <not active or explicit need, renderer/versions, DOM/fallback/reduced/lifecycle evidence>
Review stop: <acceptance met | diminishing returns | blocker | agreed budget> — residual material findings=<none or IDs>
Persistent artifacts: <paths or inline/not needed, with reason>
Not authorized/performed: <dependencies, live effects, publication, deployment, other gaps>
```

## Common pitfalls

- Running the full studio for a targeted copy, token, motion, or QA request.
- Treating named phases, files, option counts, viewports, states, or critique cycles as universal quotas.
- Asking for approval after a bounded request or delegated choice already supplies authority.
- Mistaking local authority for permission to install dependencies or touch live/external/public state.
- Inventing claims or proof to strengthen a route.
- Copying reference expression instead of adapting an observed principle.
- Generating a speculative design system before a useful slice or ignoring an existing canonical system.
- Using unreadable thumbnails, stale captures, screenshots as functional proof, or syntax/tool success as quality proof.
- Adding a GPU blob, particles, rotating object, bloom, or scroll-jacking without a named product need and usable semantic fallback.
- Duplicating framework APIs instead of routing implementation detail to the relevant official skill/docs.

## Verification checklist

- [ ] Each affected route was classified as public content/navigation, conversion landing, or task/data UI before profile selection and engineering handoff; no website was automatically forced into a funnel.
- [ ] The request was routed to the shortest safe mode; targeted work did not invoke the full studio.
- [ ] Bounded local authority was honored without broadening scope or adding a redundant approval.
- [ ] Facts, hypotheses, proof, claims, and unresolved material choices remain distinct.
- [ ] Options, references, viewports, states, artifacts, and cycles exist only where they resolve the actual decision or support the claim.
- [ ] Every retained source has an origin, exact observation, adaptation, licence/reuse status, and no-copy boundary.
- [ ] One direction was accepted when constraints selected it; alternatives exist only for a real trade-off.
- [ ] Existing system rules were inherited/extended for bounded work; consequential new system choices have valid delegated or human authority before build.
- [ ] Any motion has causal purpose, interruption/exit, equivalent reduced-motion behavior, and affected verification.
- [ ] Any real-time branch was explicitly requested or justified by a named product need and preserves semantic DOM, fallback, reduced modes, loss handling, pause, cleanup, performance, and capture truth.
- [ ] Fresh evidence matches the affected behavior and completion claim; tool or syntax success was not overstated.
- [ ] Work stopped on acceptance, diminishing returns, blocker, or agreed budget with residual risk visible.
- [ ] Existing `.design-flow` schema `1.0` constraints were followed locally and not bypassed or migrated implicitly.
