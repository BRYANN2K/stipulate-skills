# Component state matrix

This reference is an optional menu, not a universal component checklist or required artifact. Use it only when a state matrix is the requested deliverable, the project already requires one, or a durable handoff/re-entry would otherwise lose a nontrivial affected reused state contract. A bounded change may rely on the canonical component, focused tests, and a short inline note instead.

Select only states the affected reused component can enter or the completion claim depends on. Do not copy the full matrix, inventory untouched variants, or demand fresh evidence for unaffected behavior. For each selected state, use the evidence status that matches reality:

- `OBSERVED` — exercised in a current affected representative instance;
- `REQUIRED_BY_EXISTING_CONTRACT` — inherited from the repository's active canonical contract;
- `PROPOSED` — specified by a standalone or shared-system brief but not implemented;
- `UNVERIFIED` — implementation may exist, but current behavior was not exercised.

Do not infer interaction, semantic roles, accessible name/state/value, announcements, authorization, or persistence from a screenshot. Record a non-applicable state only when its omission could otherwise be mistaken for a missing affected requirement. The tables below are selection menus.

## Shared interactive states

| State | Contract to preserve | Evidence that can verify it |
|---|---|---|
| Default | Resting hierarchy, label, value, and affordance | Render plus accessible name/role/value |
| Hover | Pointer feedback without being the only discovery mechanism | Pointer interaction at supported viewport |
| Focus-visible | Keyboard-visible focus distinct from hover | Keyboard traversal and computed/rendered focus |
| Active/pressed | Immediate activation feedback | Repeated-input browser interaction |
| Selected/current | Persistent state distinct from hover and focus | State readback plus semantics such as current/selected |
| Disabled/unavailable | Reason, discoverability, and preserved context | Render, semantics, and attempted interaction |
| Loading/pending | Scope, duplicate prevention, and preserved context | Throttled or controlled async execution |
| Success | Authoritative result and next action | Completion response plus UI readback |
| Error | Failure scope, preserved state, recovery, focus/announcement | Forced failure and recovery path |

## Content and data states

| State | Required distinction |
|---|---|
| Skeleton | Structure is known and delay is expected; it does not impersonate final data |
| Initial loading | Nothing authoritative is available yet |
| Refreshing/stale | Existing data remains visible while freshness changes |
| Empty-first-use | No object exists yet; teach setup or creation |
| Empty-no-results | Data exists, but current search/filter has no match |
| Empty-no-access | Absence is caused by permission, not lack of data |
| Partial | Independent sources or regions failed and attribution remains visible |
| Full error | The primary task cannot proceed and recovery is explicit |
| Offline | Network state, preserved work, and retry behavior are clear |

## Component-specific probes

### Forms

- label, description, required/optional semantics, and correct input purpose;
- untouched, dirty, valid, invalid, pending, server-rejected, and unavailable behavior;
- input preservation, error summary, focus movement, and announcements;
- autofill, password-manager, keyboard, zoom, and narrow-screen behavior where relevant.

### Navigation

- current route, expanded/collapsed and nested state, overflow, and narrow dismissal;
- direct URL, refresh, back/forward, skip navigation, focus movement, and focus return.

### Dialogs, menus, popovers, and drawers

- trigger relationship, initial focus, containment strategy, escape/outside dismissal;
- nested overlays, focus return, viewport collision, scroll ownership, and reduced motion.

### Tables and dense lists

- loading, empty, no-results, partial, stale, row-selected, and bulk-selected states;
- sort, filter, pagination/virtualization, column priority, truncation, and narrow fallback;
- keyboard strategy, exact values, resource identity, and action scope.

### Charts

- source, grain, unit, timeframe, timezone, freshness, and null/late treatment;
- legend, tooltip, selection, keyboard access, and text or tabular alternative;
- color-independent distinction and an explicit user question rather than decorative data.

### Destructive and asynchronous actions

- exact target/effect, confirmation, cancellation, and duplicate prevention;
- accepted versus completed, progress, partial failure, rollback/retry;
- authoritative readback and reconciliation across affected views.

## Conditional APG behavior oracle

Use a WAI-ARIA Authoring Practices pattern only when the affected component intentionally has the same semantic pattern and interaction model. This is most relevant to composites and overlays such as dialog/alert dialog, menu button/menu/menubar, combobox/listbox, tabs, tree/treegrid, grid, or toolbar.

1. Name the exact matching pattern and why its semantics—not its appearance—fit.
2. Reconcile its keyboard, focus entry/movement/return, role/state/value, opening/dismissal, and selection behavior with the repository's canonical component contract.
3. Exercise only the matching affected behaviors in a real browser. Mark conflicts or untested clauses `PROPOSED` or `UNVERIFIED` rather than claiming APG conformance.
4. Do not apply a composite pattern to a native/simple button, link, select, disclosure, or other control that already has appropriate platform behavior. Do not use an APG example as drop-in production code or proof.

Pattern source: WAI-ARIA Authoring Practices at [`7e4034b262bc0d25332e330d8a582aaf34113829`, `content/patterns/patterns.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/patterns.html), with pattern-specific behavior in paths such as [`content/patterns/dialog-modal/dialog-modal-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/dialog-modal/dialog-modal-pattern.html) and [`content/patterns/combobox/combobox-pattern.html`](https://github.com/w3c/aria-practices/blob/7e4034b262bc0d25332e330d8a582aaf34113829/content/patterns/combobox/combobox-pattern.html) (W3C Software and Document License). This reference paraphrases behavioral categories; it does not copy examples.

## Use and proof rule

Document only changed or claim-relevant states in an affected reused component contract, plus states expressly required by a standalone deliverable. Keep instance-specific copy, permissions, and recovery local when they are not shared. Preserve meaningful distinctions such as loading versus empty, unavailable versus forbidden, accepted versus completed, and stale/partial versus ready.

Evidence belongs only to affected reused contracts and states. If required behavior was not exercised, label it `PROPOSED` or `UNVERIFIED`; never turn absence of evidence into a system guarantee. A parser or matrix-schema validator proves only syntax/schema, not state truth, accessibility, integration, or visual quality.
