# Rendered visual loop

Use this loop only when rendered quality or browser behavior is part of the requested outcome. A targeted review exercises the affected claim; a full-surface review expands coverage only when requested or needed for a material release-quality claim.

## Stabilize only the comparison you need

Record enough context to reproduce the evidence: route, state/fixture, viewport, theme/font conditions, reduced-motion setting, animation/clock treatment, and source revision when available. Prefer readable viewport-sized captures or focused chunks over a shrunken full-page thumbnail.

Choose evidence by changed behavior and claim:

- copy or hierarchy change: the viewport/state where the wording and hierarchy appear, plus another width only if wrapping/order can materially differ;
- responsive change: each behavior-changing range and a breakpoint-adjacent case when risky;
- application state change: the affected task state and any transition/recovery needed to prove it;
- motion: before/after plus interruption or a trace/video when stills cannot show the claim;
- full page/surface quality: representative decisive, conversion/task, and materially distinct responsive/state evidence;
- optional real-time graphics: deterministic affected keyframes and applicable fallback, reduced, loading/failure/loss, pause, and lifecycle evidence required by the specific renderer claim.

There is no universal device or state matrix. A single view can support a bounded visual claim; it cannot support responsive, interaction, accessibility, or cross-state claims that were not exercised.

## Visual judgment before tool anchoring

When visual quality is in scope, inspect the render before reading lint/audit output. Record material observations with locators:

- product/task and primary action clarity;
- hierarchy and whether unequal jobs are flattened into equal containers;
- product-specific thesis/signature and copy/data plausibility;
- reference adaptation versus recognizable collage;
- affected wrapping, order, focus, action, or state comprehension;
- motion purpose rather than decoration;
- for an active real-time branch, product value, DOM/scene coherence, crop/occlusion/input, and usable fallback/reduced states.

Familiar fonts, colors, cards, gradients, or motion are not failures by themselves. Diagnose a product, contract, or user impact.

If the requested outcome is a nonvisual targeted probe, such as link syntax or one build command, the blind visual pass is not required. Report that narrow result without calling it interface quality.

## Applicable browser and code probes

After the visual read, run only probes that can confirm or falsify the requested claim:

- repository-native lint, typecheck, tests, and build for affected code;
- affected interaction/route and keyboard/focus path;
- semantic names/roles/values, announcements, contrast, zoom/reflow, or automated accessibility results where applicable;
- console/network behavior and state transitions;
- affected overflow, content extremes, reduced motion, and responsive behavior;
- source-backed claims/data and synthetic-fixture labels;
- system-token/component traces when fidelity is in scope;
- optional GPU route: actual backend/state, deterministic readiness, shader/asset errors, affected performance budget, offscreen/hidden pause, loss/fallback, and resource/lifecycle stability.

Route renderer-specific control details to the relevant official skill/docs. Tool absence is `UNAVAILABLE` or `DEGRADED`, not `PASS`. A syntax, linter, build, screenshot, or automated scan result proves only its stated check.

## Findings

Each material finding records:

```text
ID | severity | REVIEWER_JUDGMENT or AUTOMATED_SIGNAL | requested scope and locator
problem | evidence | impact | correction | retest/status
```

Use `BLOCKER`, `MAJOR`, `MINOR`, and `NOTE` according to user/truth impact. Only findings material to the requested review scope affect its verdict. Record an important out-of-scope risk separately rather than silently expanding the review or using it to block an unrelated bounded claim.

## Revise, recapture, and stop

If correction is authorized, group fixes by root cause. A relevant mutation invalidates affected screenshots and probes; recapture/retest those, not a ceremonial full matrix.

Repeat only while another pass is likely to resolve a material finding within scope and budget. Stop when acceptance criteria are met, value is diminishing, a blocker/choice needs the human, the agreed budget is reached, or the next fix would broaden scope/effect. State the stop reason and residuals. Never keep iterating until a passing label appears or lower severity because time ran out.

## Bounded verdict

- `PASS`: fresh substantive evidence supports the requested review claim and no in-scope blocker/major remains.
- `CONDITIONAL`: no in-scope blocker/major remains, but a named noncritical limitation or evidence gap bounds confidence.
- `FAIL`: direct evidence establishes an in-scope blocker/major defect.
- `BLOCKED`: evidence essential to decide the requested claim is unavailable or inaccessible.

For a syntax/tool-only request, report the tool result rather than reusing a visual-quality verdict. For a targeted review, name the dimension and exclusions next to the verdict. A full release-quality statement requires breadth appropriate to that claim; a targeted pass is not release authorization.

Real-time unavailability may be conditional only when the semantic DOM/fallback and core actions pass and the missing renderer/device claim is excluded. It is blocking when the requested experience depends on the unverified path or an applicable fallback, reduced mode, loss, pause, budget, or cleanup contract fails.

Persist a report only when it is requested, must survive correction runs/agents, or project policy requires it. Otherwise an inline evidence/findings summary is valid. Human-facing output may be reordered/chunked for focus, but must preserve scope, safety, evidence, residuals, and unverified effects.
