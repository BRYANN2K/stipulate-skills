# Component state matrix

Use only applicable states, but explain every omission that affects interaction or asynchronous behavior.

## Universal interactive states

| State | Required decision |
|---|---|
| Default | Resting hierarchy, label, value, and affordance |
| Hover | Pointer affordance without being the only discovery mechanism |
| Focus-visible | High-contrast keyboard focus independent of hover |
| Active/pressed | Immediate activation feedback |
| Selected/current | Persistent state distinct from hover/focus |
| Disabled | Why interaction is unavailable; avoid disabling when an error would teach more |
| Loading/pending | Scope, duplicate prevention, preserved context, and completion feedback |
| Success | Authoritative result and next action |
| Error | Failure scope, preserved input/state, recovery, and focus/announcement |

## Content and data states

| State | Distinction |
|---|---|
| Skeleton | Structure is known and short-lived; does not fake final data |
| Initial loading | Nothing authoritative is available yet |
| Refreshing/stale | Existing data remains visible while freshness changes |
| Empty-first-use | No object exists yet; teach creation or setup |
| Empty-no-results | Data exists but current search/filter has no match |
| Empty-no-access | Absence is caused by permission, not lack of data |
| Partial | Some independent sources/regions failed and are attributable |
| Full error | The primary task cannot proceed |
| Offline | Network state and recoverability are explicit |

## Component-specific checks

### Forms

- label, description, required/optional semantics;
- untouched, dirty, valid, invalid, pending, server-rejected, disabled;
- input preservation and error summary/focus;
- autofill, password manager, keyboard, and mobile input behavior.

### Navigation

- current route, expanded/collapsed, nested state, overflow, mobile dismissal;
- direct URL, refresh, back/forward, focus return, and skip navigation.

### Dialogs, menus, popovers, drawers

- trigger relationship, initial focus, containment, escape/outside dismissal;
- nested overlay behavior, focus return, viewport collision, and reduced motion.

### Tables and dense lists

- loading, empty, no result, partial, stale, row selected, bulk selected;
- sort/filter/pagination/virtualization, column priority, truncation, and narrow fallback;
- keyboard strategy, exact values, resource identity, and action scope.

### Charts

- source, grain, unit, timeframe, timezone, freshness, null/late treatment;
- legend, tooltip, selection, keyboard alternative, tabular/text alternative;
- color-independent distinction and no decorative data.

### Destructive and async actions

- exact target/effect, confirmation, cancellation, duplicate prevention;
- accepted versus completed, progress, partial failure, rollback/retry;
- authoritative readback and reconciliation across affected views.

## Review rule

A screenshot proves appearance at one state and viewport. State coverage requires executable interaction, accessibility-tree evidence, and data/action readback where semantics matter.
