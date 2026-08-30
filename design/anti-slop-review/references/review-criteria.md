# Anti-slop review criteria

Use this reference to calibrate evidence, findings, and conclusions. When visual quality is in scope, apply it after the unanchored rendered read so the checklist does not anchor the critique. For a source-only or explicitly nonvisual targeted review, use the relevant sections directly.

## Review-scope and release-impact boundary

- `TARGETED_REVIEW` answers a named dimension, artifact, change, context, or tool question. Only in-scope evidence and findings determine that conclusion; material out-of-scope risks remain visible without silently expanding the review.
- `FULL_SURFACE_REVIEW` covers the material journeys and risks of the named surface/product. It is a breadth decision, not a release verdict or authorization.
- Release impact is independent: `NOT_REQUESTED` by default; `ADVISORY` only after an explicit request and materially supporting evidence for the named candidate; `REQUESTED_BUT_UNSUPPORTED` when that evidence is missing.
- Source-only evidence can fully support a source-only claim. Its lack of rendered proof is a limitation, not an automatic blocker, unless the requested conclusion depends on rendered or runtime behavior.
- Neither review scope implies release readiness. Only `ADVISORY` may label an open `BLOCKER` or `MAJOR` release-blocking within the named candidate, and that label remains evidence rather than authorization.

## Finding threshold

Promote an observation only when at least one is true:

1. the reviewed artifact or surface contradicts a verified product, claim, repository, design, component, motion, content, data, or runtime contract;
2. it creates an observable task, comprehension, hierarchy, trust, state, accessibility, responsive, data, performance, or runtime failure within scope;
3. it presents a factual, functional, live, accessibility, performance, deployment, or publication claim that the cited evidence cannot support.

“Looks AI-generated,” “uses a common font,” “has many cards,” or an automated score alone is not a finding. Each material finding needs an applicable locator, direct evidence, impact, smallest durable correction, and status or retest boundary.

Missing evidence is normally an evidence gap in the conclusion, not a product defect. Assign defect severity only when evidence shows the defect or unsupported claim; use `BLOCKED` for the review conclusion when evidence essential to deciding the requested claim cannot be obtained.

## Contextual anti-generic tests

| Test | How to probe | Signal to investigate | What makes it a finding |
|---|---|---|---|
| Product-name swap | Replace the visible product name mentally with an unrelated product or category | Headline, proof, and CTA remain equally plausible | Copy or composition omits the actual audience, mechanism, constraint, proof, or next task and causes a specificity or trust failure |
| Repeated-container topology | Outline containers and compare their jobs, hierarchy, and interaction | Unrelated content is repeatedly placed in equal rounded boxes or the same bento topology | Equal treatment obscures priority, relationship, action scope, ownership, or responsive reading order |
| Fake data and claims | Trace metrics, charts, logos, testimonials, urgency, availability, and “live” language to sources | Production-like authority lacks provenance or synthetic/demo labeling | A reasonable user could be misled, or visible wording exceeds the source's scope |
| Reference collage | Compare recognizable motifs with stated product logic and each other | Multiple borrowed visual languages appear without a unifying rule | The mixture weakens identity, hierarchy, legibility, or interaction consistency, or copies protected/source-specific expression |
| Weak hierarchy | In each context relevant to the claim, identify what the surface is, what matters now, and the next action | Several elements demand equal attention or the primary action disappears | The intended user cannot reliably determine meaning, priority, ownership, or next step |
| Missing states | Enumerate transitions around the affected task and force representative failures when behavior is in scope | Only a polished default or happy path exists | An applicable loading, empty, partial, error, permission, success, or recovery state is absent or unusable |
| Motion purpose | Compare static, active, interrupted, and reduced behavior as the claim requires | Motion decorates, delays, masks state, or implies completion early | Motion harms task clarity, access, truth, control, continuity, or performance without a compensating information role |
| Conditional real-time value and fallback | When a renderer is in scope, remove or fail the canvas and inspect product value, DOM/proof/action, fallback/reduced behavior, native scroll, crop/occlusion, and input routing | Generic effect, blank/error fallback, GPU-only content/action, or DOM/scene desynchronization | The renderer adds no relevant product understanding, or reduction/failure makes content/action unavailable, misleading, inaccessible, or materially slower |

Passing a heuristic does not prove quality, and triggering a signal does not prove failure. Apply only tests relevant to the requested claim and use product context and direct evidence.

## No global aesthetic bans

Do not issue findings merely because the surface uses:

- Inter or another common typeface;
- purple, blue, black, beige, or a fashionable palette;
- cards, bento grids, pills, gradients, blur, glow, large type, or sparse type;
- stock or generated imagery;
- motion, 3D, or illustration.

Investigate whether the choice serves content, hierarchy, interaction, system coherence, performance, and product identity. The same choice can be appropriate in one surface and generic or harmful in another.

## Evidence interpretation

Choose rows by claim; no review must collect every evidence type.

| Evidence | What it can support | What it cannot support alone |
|---|---|---|
| Exact source/diff locator | Declared copy, tokens, component logic, state branches, and intended implementation | Actual pixels, runtime behavior, user comprehension, or deployed output |
| Claims/data source | Supported wording, provenance, formula, fixture, and scope | Whether a current surface renders or delivers it, or whether production data is current |
| Readable screenshot plus capture context | Pixels, wrapping, visible hierarchy, overflow, and one visible condition | Interaction, semantics, focus order, authorization, persistence, live data, performance, or deployment |
| Visual critique | Specificity, hierarchy, coherence, reference adaptation, and likely comprehension in observed contexts | Runtime or factual truth without source/probe evidence |
| Accessibility scan | `violations`, `incomplete`, `passes`, and `inapplicable` for the scanned rules/nodes/state when retained separately | Keyboard path, announcements, screen-reader usability, unscanned states, accessibility certification, or an unconditional pass while material `incomplete` review items remain |
| Accessibility tree | Names, roles, values, landmarks, and relationships in the inspected state | Visual contrast, interaction outcomes, or complete assistive-technology behavior |
| Keyboard or assistive probe | Actual focus, activation, navigation, or announcement behavior along the exercised path | Pointer/touch behavior, other assistive stacks, or unexercised paths |
| Console/network trace | Observed runtime errors and requests under recorded conditions | Server authorization, durable persistence, production behavior, or success without readback |
| State/action readback | The exercised transition and observed result in the named environment | Other roles, data, failure paths, environments, or long-term durability |
| Syntax/lint/type/build/focused test | The exact parser, rules, target, assertions, and command result | Overall correctness, visual quality, accessibility, release readiness, deployment, or publication |
| Runtime measurement | The measured metric under recorded route, device, data, cache, and tool conditions | Field behavior, other devices, long-session stability, or universal performance quality |
| Deterministic GPU capture plus backend/state | One fixed renderer state at recorded viewport/DPR/seed/time/progress/environment | Frame rate, cleanup, device coverage, accessibility, performance quality, or context recovery |
| GPU/frame/resource counters | Observed submissions, resources, or supported timing in the recorded runtime | Universal budgets, physical-device behavior, thermals, battery, or absence of unobserved leaks |

Label tool-produced evidence `AUTOMATED_SIGNAL` and contextual interpretation `REVIEWER_JUDGMENT`. A screenshot capture can be an automated signal; its hierarchy reading is human judgment. The class names the reviewing agent or person who made the contextual interpretation; it does not imply human participation or approval. Actual human feedback must be cited as a separate source.

A tool status of `PASS` remains a scoped signal. It can contribute to a broader conclusion only alongside the other evidence that conclusion requires.

For an axe-style run, preserve and interpret each result class independently:

- `violations` are failed automated rules that still need contextual impact and root-cause interpretation;
- `incomplete` items were not conclusively passed or failed and require manual/assistive review or a named evidence gap;
- `passes` support only the exact evaluated rule/node/state;
- `inapplicable` means no matching content was found and supplies no positive result.

Zero `violations` does not erase `incomplete`. If an unresolved `incomplete` item is material to the requested conclusion, do not issue unconditional `PASS`; use `CONDITIONAL` when the conclusion remains useful but bounded, or `BLOCKED` when the missing determination is essential.

This separation paraphrases axe-core revision [`d50cdf6ea7c6f4cff426b6f3da7850b8c0b32eb6`, `doc/API.md`](https://github.com/dequelabs/axe-core/blob/d50cdf6ea7c6f4cff426b6f3da7850b8c0b32eb6/doc/API.md) (MPL-2.0). It does not require axe, copy its rule catalog, or map tool impact directly to local finding severity.

## Severity calibration

Severity follows user impact and truth risk, not visual dislike, fix size, deadline pressure, or whether the issue predates the current change.

### `BLOCKER`

Use when direct evidence shows the bounded surface or artifact is materially deceptive, inaccessible, unsafe, or nonfunctional for a core task. Examples:

- fabricated customer proof, metric, availability, or live-status claim;
- an impossible primary keyboard path or unreachable core task;
- a destructive action whose target or effect is materially misrepresented;
- sensitive data exposure or UI wording that falsely asserts authorization;
- a broken core journey in a context material to the requested review;
- when real-time behavior is in scope, renderer failure removes essential content/action with no usable semantic fallback, or an essential canvas interaction has no accessible equivalent.

Do not create a `BLOCKER` finding merely because a browser, device, or tool is unavailable. Record that as an evidence gap; it may make the requested conclusion `BLOCKED`.

### `MAJOR`

Use when a significant user group, supported context, or task state cannot understand or complete the intended work, or the implementation materially violates a governing system or claim contract. Examples:

- identity or primary action is lost in a responsive context material to the claim;
- a recoverable error discards user input or offers no recovery;
- repeated container topology flattens decision hierarchy across the affected surface;
- reference collage creates materially inconsistent interaction cues;
- an important state, focus path, contrast relationship, or data semantic fails;
- when real-time behavior is in scope, hidden rendering continues against an applicable pause contract, reduced motion/data is ignored, loss has no bounded fallback, a named budget fails, or observed resources grow across representative remount/navigation testing.

### `MINOR`

Use for a bounded inconsistency with low task or truth impact, such as a secondary wrapping defect, a localized ambiguous phrase, or a token exception that weakens coherence without obstructing the task.

### `NOTE`

Use for an evidence-backed opportunity with no acceptance requirement. Notes are optional and are not defect ballast.

## Baseline, regression, scope, and duplication

- Mark whether a finding predates the reviewed change, was introduced by it, or cannot be attributed when that distinction affects ownership or acceptance.
- Group repeated symptoms under one root-cause finding with all useful locators.
- Do not lower a baseline finding merely because the current change did not introduce it; state scope and ownership honestly.
- When mutation is not authorized, propose the smallest correction without implying it was executed.
- An in-scope `BLOCKER` or `MAJOR` can fail a targeted claim or full-surface criterion. A material out-of-scope risk is disclosed separately and does not expand review breadth or activate a release-impact advisory.

## Conclusion rules

### Targeted or full-surface review

Apply the same bounded statuses to the declared breadth:

- `PASS`: direct evidence supports the named claim or materially reviewed surface and no unresolved in-scope finding or material `incomplete` item contradicts it.
- `CONDITIONAL`: a named noncritical residual, unresolved material `incomplete` item, or limitation bounds confidence without falsifying the useful conclusion.
- `FAIL`: direct evidence falsifies the requested claim or an in-scope acceptance/surface criterion remains unmet.
- `BLOCKED`: evidence essential to deciding the requested claim or full-surface conclusion is unavailable.
- `TOOL_RESULT`: report the exact status and scope for an explicitly syntax/tool-only request; do not convert it into an interface-quality verdict.

Open blocker/major findings affect the declared scope when in scope. Neither `TARGETED_REVIEW` nor `FULL_SURFACE_REVIEW` establishes release impact by itself.

### Separate release-impact advisory

- `NOT_REQUESTED`: release impact is `NOT_ASSESSED`; do not use release-blocking language.
- `ADVISORY`: only after explicit request and materially complete evidence for the named candidate, report `NO_BLOCKING_FINDING_OBSERVED` or `RELEASE_BLOCKING: <IDs>`.
- `REQUESTED_BUT_UNSUPPORTED`: report `NOT_ISSUED` plus missing candidate evidence; do not relabel any targeted, source-only, or full-surface pass as release evidence.

`NOT_APPLICABLE` can explain an excluded probe but supplies no positive evidence. No review conclusion or release-impact advisory is a numeric score, human approval, risk acceptance, merge/release authorization, deployment confirmation, or publication proof.
