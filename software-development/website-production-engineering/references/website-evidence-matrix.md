# Website evidence matrix

Load the relevant rows only. A website contract validator proves structural consistency, not the evidence below.

The contract's protected conversion, form-state, spam-protection, claim, and evidence fields reject exact deferred placeholders such as `TODO`, `TBD`, `later`, `pending`, `unknown`, and `placeholder`. Passing this bounded syntax guard still does not provide browser, delivery, abuse-resistance, analytics, or production evidence.

Performance budgets are structural finite-number declarations: `lcp_ms` and `inp_ms` must be positive, while `cls` may be zero. Integers too large for the runtime's finite floating-point range are rejected with a controlled diagnostic; a valid declaration still requires direct measurement evidence.

| Claim | Minimum direct evidence | Insufficient alone |
|---|---|---|
| Page renders correctly | Real-browser inspection at representative mobile and desktop widths | Static source, unit test, one screenshot |
| Navigation works | Keyboard and pointer traversal of changed paths; destination and focus result | Link markup inspection |
| Form works | Browser submission success and recoverable server failure using safe test delivery | Client validation, HTTP 200 without UI readback |
| Accessible interaction | Semantic inspection, keyboard path, focus visibility/order, accessibility tree, relevant automated checks | Accessibility linter only |
| Metadata is correct | Runtime document head or built output for title, description, canonical, robots, and social fields | Config source only |
| Redirect works | Actual HTTP status and final location; chain/loop check | Redirect config text |
| SEO continuity | Old/new URL inventory and tested mapping; sitemap/robots/404 evidence | New pages indexable in isolation |
| Performance target | Current measurement on representative page/network/device profile after final change | Fast local developer machine, bundle intuition |
| Analytics respects consent | Network evidence before and after explicit consent plus privacy contract | Tracking code present |
| Site is launched | Authorized production destination fetched independently, including key routes and external effects | Local build or deploy command success |

## Relaunch inventory

Before replacing an existing site, record for each important URL:

- old canonical path;
- current purpose and content owner;
- observed value (traffic, backlinks, conversions, user need, or explicit stakeholder requirement) when evidence exists;
- decision: retain, revise, merge, redirect, or retire;
- new canonical path;
- redirect status and test result;
- content migration status;
- post-launch monitoring owner.

Do not infer low value from absent analytics. Absence of access is an evidence gap.

## Form boundary

For each form verify:

1. accessible name and instructions;
2. client convenience validation and authoritative server validation;
3. per-field and summary errors where appropriate;
4. input preservation on recoverable failure;
5. duplicate submission handling;
6. spam/abuse control without blocking legitimate use;
7. explicit privacy context;
8. destination/delivery readback only in an authorized test system;
9. success state with honest next step;
10. no personal or credential data in logs, screenshots, fixtures, or reports.

## Browser matrix selection

Test affected risk, not every theoretical combination:

- at least one narrow touch viewport and one representative desktop viewport;
- each browser engine the project claims to support when behavior can differ;
- keyboard-only flow for changed interactions;
- reduced-motion mode for changed motion;
- slow/error network paths for forms or dynamic content;
- zoom and text wrapping where dense navigation or large type can break layout.

Label untested engines and devices as unavailable or skipped, not passed.
