# Anti-slop review criteria

## Core test

A finding is valid when at least one is true:

1. the interface contradicts an approved product, claim, direction, system, component, motion, or repository contract;
2. the interface creates an observable task, comprehension, trust, state, accessibility, responsive, data, or performance failure;
3. the implementation makes a claim that the available evidence cannot support.

“Looks AI-generated” without a locator, violated contract, or user impact is not a finding.

## Dimensions and evidence

| Dimension | Strong evidence | Weak evidence alone |
|---|---|---|
| Claims/copy | Primary source, claims ledger, exact visible text | Brand adjectives, detector score |
| Composition | Approved thesis plus rendered task hierarchy | Personal taste, isolated screenshot crop |
| Design system | Source trace plus computed/rendered values | Token file exists |
| States | Executed interaction and accessibility tree | Component inventory checkbox |
| Data/dashboard | Source/query/fixture, formula, grain, freshness, reconciliation | Convincing-looking chart |
| Motion | State contract plus normal/interrupted/reduced browser evidence | Smooth screen recording |
| Accessibility | Semantics/tree, keyboard/focus, contrast, zoom/reflow, announcements | Automated scan alone |
| Responsive | Representative narrow/wide execution with real content | CSS breakpoint presence |
| Marketing | Runtime metadata, canonical/indexability, form/event behavior | Copy specification alone |
| Performance | Measured changed path under stated conditions | Generic best-practice claim |

## Anti-slop patterns to investigate

These are prompts for evidence, not categorical bans:

- unsupported “fast, secure, effortless, all-in-one” claims;
- product mechanism replaced by abstract transformation language;
- identical short-sentence rhythm or three-part lists throughout;
- standard hero/logo wall/bento/testimonial/FAQ order without decision rationale;
- uniform rounded cards for unequal content;
- decorative gradients, glows, dots, or blobs disconnected from product meaning;
- mixed visual identities from multiple component libraries;
- arbitrary values and one-off variants that bypass system tokens;
- default-only components with missing focus, disabled, async, empty, and error states;
- dashboards designed around chart availability rather than user decisions;
- synthetic values presented like live customer/production metrics;
- motion added to routine actions without state or spatial meaning;
- mobile layouts that stack everything while losing priority, identity, or actions;
- polished visuals masking broken routes, forms, permissions, or recovery.

## Severity calibration

### Blocker

Use when release/approval would be materially deceptive, inaccessible, unsafe, or nonfunctional. Examples: fabricated claim, primary keyboard path impossible, destructive action misrepresented, design gate bypassed, private/production data exposed, metric formula false, core journey broken.

### Major

Use when a significant group or state cannot use or understand the surface as intended, or the implementation materially diverges from the approved system. Examples: no mobile action path, missing recoverable error state, widespread arbitrary values, motion-induced task delay, conversion form loses input.

### Minor

Use for bounded inconsistency that does not block the task. Examples: one undocumented spacing exception, secondary state wording ambiguity, noncritical wrapping inconsistency.

### Note

Use for a supported improvement with no approval/release requirement. Keep notes separate so they do not inflate defect counts.

## Verdict rules

- `FAIL`: one or more unresolved blockers, or majors that invalidate the requested approval/completion claim.
- `BLOCKED`: required evidence cannot be obtained and absence prevents a responsible verdict.
- `PASS_WITH_NOTES`: no blockers/invalidating majors; residual minors/notes and skipped noncritical evidence are explicit.
- `PASS`: required dimensions have fresh evidence and no unresolved required findings.

Never average dimensions. One deceptive claim or inaccessible primary task cannot be canceled by strong visual polish.
