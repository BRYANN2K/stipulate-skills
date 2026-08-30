# Anti-Slop Review

> Optional persistent report. Inline evidence-linked findings are valid. Use this file only when the review is a requested deliverable, must support re-entry across runs or agents, or project policy requires it. Delete or rename sections that do not apply.

## Review frame

- Review scope: `TARGETED_REVIEW` | `FULL_SURFACE_REVIEW`
- Release-impact status: `NOT_REQUESTED` | `ADVISORY` | `REQUESTED_BUT_UNSUPPORTED`
- Requested claim, surface, or named release candidate:
- Acceptance criteria and explicit exclusions:
- Governing product/claim/design/system/data contracts:
- Source revision, build, environment, and other locators needed for re-entry:
- Review-only or review-and-correct authority:
- Evidence contexts selected and why each can change the conclusion:
- Known environment or access limitations:
- Persistence reason: deliverable | re-entry | project requirement

### Conditional real-time graphics frame

> Omit unless a renderer claim or material release risk is in scope.

- Product-specific canvas/scene role and remove-canvas result:
- Renderer/backend/version and observed readiness/state:
- Deterministic inputs or capture controls relevant to the claim:
- Applicable semantic fallback, reduced modes, asset/shader failure, loss, offscreen/hidden pause, lifecycle, device, or performance contracts:
- Project/device budgets and representative environment gaps, if performance is in scope:

## Evidence

> Add only evidence needed for the requested claim. A source-only row can be sufficient for a source-only review. `PASS` from a tool means only that named check passed.

| ID | Kind | Claim and method | Context or locator | Observed result | Freshness, limitation, or proof boundary |
|---|---|---|---|---|---|
| EV-01 | `REVIEWER_JUDGMENT` / `AUTOMATED_SIGNAL` |  |  | PASS / FAIL / SKIPPED / DEGRADED / UNAVAILABLE / NOT_APPLICABLE |  |

### Axe-style accessibility result separation — only when such a scan ran

> Preserve all four tool outcomes separately. Zero `violations` is not an unconditional pass while a review item material to the conclusion remains `incomplete`; `inapplicable` supplies no positive evidence.

- Tool/version, context/include/exclude, rules/tags, route/state, and captured at:

| Result class | Rule IDs / node locators or retained result path | Count | Manual/contextual disposition | Effect on bounded conclusion |
|---|---|---:|---|---|
| `violations` | | | finding / false positive with evidence / out of scope | |
| `incomplete` | | | resolved with evidence / unresolved material / unresolved nonmaterial | `PASS` unavailable when material and unresolved |
| `passes` | | | scoped tool evidence only | |
| `inapplicable` | | | no matching content; no positive evidence | |

## Conditional unanchored rendered critique

> Complete before reading automated audit output when visual quality is in scope. Omit for source-only or explicitly nonvisual targeted work, and state in the conclusion that rendered quality was not assessed.

- Product/task and primary action in the observed context:
- Hierarchy, composition, and information priority:
- Product specificity and name-swap result:
- Container topology and relationship clarity:
- Copy/content/data plausibility and provenance concerns:
- Reference adaptation or collage concerns:
- Applicable missing states, motion purpose, responsive behavior, or recovery concerns:
- Conditional renderer product value, DOM/scene coherence, crop/occlusion/input, fallback/reduced/failure concerns:

### Rendered evidence manifest

> Record only context needed to understand or reproduce each retained artifact; do not force a route/role/state/viewport bundle when fields are irrelevant.

| ID | Artifact | Affected context and material conditions | Source/build and captured at | What it proves | Fresh after relevant mutation? |
|---|---|---|---|---|---|
| CAP-01 |  |  |  |  | yes / no |

## Findings

### F-01 — Finding title

- Severity: `BLOCKER` | `MAJOR` | `MINOR` | `NOTE`
- In requested scope: yes | no
- Kind: `REVIEWER_JUDGMENT` | `AUTOMATED_SIGNAL` | both
- Applicable text, element, source, surface, state, viewport, environment, or other locator:
- Governing contract or observable failure:
- Evidence IDs or direct locators:
- User/product impact:
- Smallest durable correction:
- Attribution: introduced | pre-existing | unknown | not relevant
- Status: open | fixed | accepted risk | not changed | blocked by dependency
- Fresh retest evidence or unverified boundary:

> Group repeated symptoms under one root-cause finding. Keep material out-of-scope risks visible without using them to broaden the declared review scope or activate release-impact posture.

## Correction pass — repeat only while useful and authorized

- Pass ID or description:
- In-scope findings addressed:
- Grouped changes and last relevant mutation:
- Evidence invalidated and freshly recaptured/rerun:
- Remaining findings and residual risk:
- Continue or stop rationale:

## Conclusion

- Review scope and bounded claim/surface:
- Release-impact status: `NOT_REQUESTED` | `ADVISORY` | `REQUESTED_BUT_UNSUPPORTED`
- Conclusion: `PASS` | `CONDITIONAL` | `FAIL` | `BLOCKED` | `TOOL_RESULT`
- Evidence supporting or preventing the conclusion:
- Material axe-style `incomplete` disposition, when applicable:
- Stop reason: acceptance met | diminishing returns | blocker/choice | agreed budget
- Open in-scope `BLOCKER` / `MAJOR` / `MINOR` / `NOTE` IDs:
- Material out-of-scope observations:
- Release impact: `NOT_ASSESSED` | `NOT_ISSUED — <missing candidate evidence>` | `NO_BLOCKING_FINDING_OBSERVED` | `RELEASE_BLOCKING — <IDs>`
- Source-only, rendered, browser, role, device, accessibility, data, performance, production, deployment, or publication limitations:
- Syntax/tool signal boundary, when applicable:
- Risk acceptance or external actions not authorized/performed:

For either review scope, an in-scope finding may fail the requested claim/surface. `FULL_SURFACE_REVIEW` does not activate release impact, and unresolved material `incomplete` review items prevent unconditional `PASS`. Use `BLOCKED` only when evidence essential to deciding the bounded conclusion is unavailable.

Issue release-blocking language only for an explicitly requested, materially supported `ADVISORY` for the named candidate. If support is insufficient, use `REQUESTED_BUT_UNSUPPORTED` and `NOT_ISSUED`. This advisory never authorizes merge, release, deployment, publication, or acceptance of risk.
