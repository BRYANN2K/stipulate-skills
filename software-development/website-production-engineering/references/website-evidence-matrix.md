# Website evidence menu

Load only the rows that support claims in the current task. This is not a mandatory browser matrix or release checklist for every website edit. The bundled JSON validator is optional structural lint for its own page/form/redirect model; it cannot prove copy truth, design quality, accessibility, form delivery, abuse resistance, analytics behavior, performance, or publication.

## Claim-to-evidence map

| Claim | Minimum direct evidence | Insufficient alone |
|---|---|---|
| Changed page renders correctly | Real-browser inspection at the representative affected width/state | Static source, unit test, unrelated full-page screenshot |
| Navigation works | Perform changed keyboard/pointer path; observe destination and focus result | Link markup inspection |
| Form works | Browser success and recoverable server failure using safe test delivery | Client validation, HTTP success without UI/readback |
| Interaction is accessible | Semantic inspection, keyboard path, focus, accessibility name/role/state/tree as relevant | Accessibility linter only |
| Metadata is correct | Runtime head or built output for changed title, description, canonical, robots, or social fields | Config source only |
| Redirect works | Actual HTTP status/final location and relevant chain/loop check | Redirect config text |
| SEO continuity is preserved | Important old/new URL inventory and tested mapping; applicable sitemap/robots/404 evidence | New pages indexable in isolation |
| Performance target holds | Current measurement on a representative page/network/device profile after the final change | Fast local machine, bundle intuition |
| Analytics respects consent | Network evidence before/after explicit consent plus the owned privacy contract | Tracking code present |
| Site is launched | Authorized production destination fetched independently, including key paths/effects | Local build or deploy command success |

Scale evidence to the claim. A copy-only edit may need rendered content inspection; a CSS change may need affected widths; a form change needs behavior and failure recovery; a release claim needs the live destination. Untouched rows are not required.

When Playwright is already selected or appropriate, prefer user-visible role/label/test-id locators, built-in actionability, and outcome assertions over implementation selectors and arbitrary sleeps. Do not install a browser tool or force a pixel-diff gate merely to satisfy this reference.

## Lighthouse mode and variability (conditional)

Use Lighthouse only when it already belongs to the project/tooling or is otherwise explicitly available, and choose the run mode from the claim:

| Claim shape | Lighthouse mode | Boundary of the evidence |
|---|---|---|
| Initial or subsequent page load from a URL | Navigation | Audits one navigation lifecycle; record cache/profile assumptions relevant to the comparison. |
| User interaction or flow over a defined interval | Timespan | Measures supported audits between explicit start and end points; it is not a page-load substitute. |
| Accessibility/best-practice state after setup or interaction | Snapshot | Inspects one prepared DOM/page state; it does not establish navigation or interval performance. |

Confirm that the desired audit is supported in the chosen mode. Keep URL/build, device emulation, throttling/network, browser version, cache state, extensions, and background load controlled or reported as applicable. Run repeated comparable trials; preserve individual results or at least count plus range/spread and a representative median. Report regressions, overlap, and unexplained variance rather than selecting the best score or treating one number as deterministic. Compare like mode and conditions, and use field data when the claim is about real-user experience.

## Relaunch inventory

For an important URL affected by a relaunch, record only the useful fields:

- old canonical path and current purpose;
- known value (traffic, backlinks, conversions, user need, or stakeholder requirement) when evidence exists;
- retain, revise, merge, redirect, or retire decision;
- new canonical path and redirect status/result;
- content migration status and post-launch owner when applicable.

Do not infer low value from absent analytics. Missing access is an evidence gap. A bounded page addition does not need a site-wide inventory.

## Form boundary

For a changed form, verify the applicable boundaries:

1. accessible name/instructions and field/error association;
2. client convenience validation plus authoritative server validation;
3. input preservation on recoverable failure;
4. duplicate submission handling when repeat submission can matter;
5. spam/abuse control proportional to exposure;
6. truthful privacy context;
7. delivery/readback only in an authorized test system;
8. honest success state and next step;
9. no personal or credential data in logs, screenshots, fixtures, or reports.

Do not invent a privacy notice, recipient, CRM behavior, or abuse control to fill an optional artifact.

## Browser selection

Choose from actual risk and support claims:

- affected narrow and wide layouts;
- browser engines the project claims when behavior can differ;
- keyboard flow for changed interactions;
- reduced motion for changed motion;
- slow/error network paths for changed forms/dynamic content;
- zoom/text wrapping where navigation or typography can break.

Label untested engines/devices as skipped or unavailable, not passed. A browser emulation profile is not proof of a physical device or GPU.

## Compact adversarial evals

| Prompt cue | Expected routing or behavior |
|---|---|
| “Our homepage performance is 96; I ran one Lighthouse snapshot.” | Reject the proof: snapshot is not navigation performance, and one score hides variability. Select repeated navigation runs if that is the claim. |
| “Measure the performance of opening and submitting this interactive configurator.” | Use a bounded timespan only for supported interval audits; do not substitute a navigation or snapshot result. |
| “Inspect the accessibility state after the mobile menu opens.” | A prepared snapshot can support that state claim, paired with keyboard/focus evidence where interaction is claimed. |
| “Build a site or app for this product; we have not chosen which.” | Near miss: route first to **Software Engineering**, not directly to website production. |
| “Develop visual directions for a new landing page; no code or production behavior.” | Near miss: route the visual-only outcome to **Interface Studio**, not website production. |

## Upstream source note

Lighthouse commit [`f9cbf2bbdde9d10dd097304357974fd4c8e0f197`](https://github.com/GoogleChrome/lighthouse/tree/f9cbf2bbdde9d10dd097304357974fd4c8e0f197) is licensed under the repository [`LICENSE`](https://github.com/GoogleChrome/lighthouse/blob/f9cbf2bbdde9d10dd097304357974fd4c8e0f197/LICENSE) (Apache-2.0, including applicable NOTICE-preservation terms). The guidance is paraphrased from [`docs/user-flows.md`](https://github.com/GoogleChrome/lighthouse/blob/f9cbf2bbdde9d10dd097304357974fd4c8e0f197/docs/user-flows.md) for navigation/timespan/snapshot selection and [`docs/variability.md`](https://github.com/GoogleChrome/lighthouse/blob/f9cbf2bbdde9d10dd097304357974fd4c8e0f197/docs/variability.md) for run-to-run conditions and interpretation. This reference does not reproduce audit APIs or make Lighthouse a dependency.
