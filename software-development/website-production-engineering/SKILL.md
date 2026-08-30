---
name: website-production-engineering
description: "Use when building, redesigning, migrating, or auditing a public content, marketing, documentation, or conversion website. Takes the shortest safe page path, preserves product truth and URL continuity, keeps Interface Studio selection intact for visual work, and scales browser, accessibility, SEO, form, and release evidence to the claim."
license: Apache-2.0
compatibility: Works with any web stack and Agent Skills-compatible client. The bundled JSON template and validator are optional structural lint; the validator requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: website, frontend, accessibility, seo, performance, browser-testing
---

# Website Production Engineering

## Overview

Build public websites around truthful content, useful visitor paths, and observable browser behavior. Inherit the repository's stack, route/content model, design system, and commands. Leave implementation freedom high for ordinary local work; constrain claims, public URLs, form/privacy boundaries, dependencies, and live effects precisely.

A clear request to change a bounded local page or component authorizes the necessary local source writes. It does not require a page-contract file, validator pass, design-system project, or second implementation approval.

<HARD-GATE>
Do not invent product claims, customer proof, legal text, consent behavior, redirect intent, or conversion evidence. Dependency installation or changes, deployment, publication, DNS changes, real-recipient form submissions, tracking activation, deletion of public routes, search submission, and production migration require explicit authorization for that exact effect and environment. Keep browser test profiles separate from personal authenticated sessions and keep private data out of fixtures, captures, and reports.
</HARD-GATE>

## When to use

- Build or revise a marketing, company, product, documentation, portfolio, editorial, or campaign site.
- Add a public landing page whose primary purpose is discovery, reading, or conversion.
- Relaunch or migrate a site while preserving valuable content, URLs, rankings, and visitor paths.
- Audit affected metadata, redirects, forms, accessibility, performance, privacy, or launch readiness.

Use `web-application-engineering` for stateful product journeys and `dashboard-application-engineering` for analytical or operational consoles. Do not load this skill for pure visual inspiration or deployment-only work.

## Task modes

| Mode | Default path | Evidence target |
|---|---|---|
| Bounded edit | Inspect the affected route/component/content, edit directly, keep local conventions | Focused static check; browser evidence only for changed visible or interactive claims |
| New behavior or surface | Establish audience/task and one independently useful page slice; use Interface Studio when visually material | Focused behavior plus representative real-browser path and state |
| Complex contract or migration | Map interacting pages, forms, redirects, metadata, consent, or URL continuity; retain a ledger only when useful | Relevant rows from the evidence matrix; optional JSON structural lint |
| Release or live effect | Separate local readiness from deployment, DNS, tracking, real delivery, redirects, or search submission | Exact authorization and independent production readback |

## Workflow

### 1. Inspect the affected surface

Read applicable instructions, routes, layouts, content sources, shared components/tokens, metadata generation, forms, analytics/consent integration, redirects, tests, preview commands, and Git status—but only as far as the requested scope needs. For a relaunch, inventory important current URLs and available evidence without entering private accounts unless authorized.

Identify the visitor, requested outcome, content/claim sources, affected path family, existing conventions, and effects outside local source. Ask only about ambiguities that would materially change those.

### 2. Keep memory proportional

For a bounded page edit, a short in-session note is enough. For a new page, record the audience need, factual content, primary action, responsive reading order, relevant interaction states, and acceptance evidence in whichever form the repository already uses.

For a multi-page relaunch or complex form/redirect/metadata/consent change, optionally use `templates/website-contract.json` as working memory and run:

```bash
python3 <skill-directory>/scripts/validate_website_contract.py check --manifest /tmp/website-contract.json --json
```

This bundled schema is **optional structural lint** for its own page/form/redirect references. It is not the repository's required taxonomy, a design brief, proof of copy truth, a browser test, or a quality gate. Use it only when the work maps cleanly to it; do not create artifacts or rewrite the project merely to make it pass. The helper's secret and malformed-input checks harden that optional file only.

Load [the website evidence matrix](references/website-evidence-matrix.md) only for the claims in scope, especially forms, relaunches, consent, performance, or launch.

### 3. Select visual direction only when material

For visually material work, preserve the Interface Studio workflow. Use the website profile built from product truth, story, source-grounded copy, inspiration, and a bounded set of coherent directions or prototypes. The human selects when they reserve the decision; when the request explicitly delegates visual judgment, the agent may select and record why. That one selection authorizes the bounded local implementation—do not add a second approval gate.

For a coherent established site or obvious leaf edit, inherit the existing direction instead of manufacturing options. Reuse established tokens and components. Extract or update shared design rules only after observed reuse or when system work is explicitly requested.

If the selected direction materially uses WebGL, WebGPU, Three/R3F, shaders, or `vgpu`, preserve the repository's renderer and exact versions. Keep semantic DOM and a stable poster/fallback responsible for the H1, proof, CTA, form, navigation, and accessible equivalent. Treat renderer/asset dependencies, device/context loss, reduced motion/data, hidden/offscreen pause, resource cleanup, and project-specific performance budgets as conditional real-time requirements—not justification for an unrequested dependency change.

### 4. Implement one coherent page slice

Trace only the runtime path the slice uses: route, layout, components, styles, content, metadata, and form/data boundary. Prefer one independently useful vertical slice over separate artifact/component/test phases. Preserve framework, package-manager, content ownership, and local patterns.

Use the smallest feedback loop likely to catch the defect. A regression test is valuable for changed behavior or a recurring bug when a suitable harness exists; it is not mandatory ceremony for copy, CSS, or another change better checked directly. Keep server-side form validation authoritative, preserve user input on recoverable failure, use semantic controls and landmarks, provide purposeful media alternatives, and respect reduced motion.

### 5. Verify the claim at the user boundary

Choose evidence by claim:

- source/copy-only change → inspect rendered content or built output as needed;
- visual/responsive claim → real screenshot/inspection at the affected representative widths;
- navigation or form behavior → act through the browser and observe the user-visible result and failure recovery;
- accessibility claim → keyboard behavior plus relevant accessibility-tree/name/state evidence;
- metadata/redirect claim → runtime head or actual HTTP response;
- Lighthouse-backed audit/performance claim → when Lighthouse is already available and suitable, choose navigation for a page-load lifecycle, timespan for a bounded interaction interval, or snapshot for one prepared page state; use another project-native tool when it better matches the claim;
- relaunch/SEO-continuity claim → old/new inventory and tested mapping.

Use the repository's browser tooling. When Playwright is already selected or appropriate, prefer user-visible role/label/test-id locators, built-in actionability, and observable outcomes over implementation selectors and arbitrary sleeps. Do not install it implicitly or treat screenshots and pixel differences as universal quality judgments.

Do not install Lighthouse merely to satisfy this workflow. When a Lighthouse metric or score supports a claim, keep the mode and representative device/network/build conditions fixed, repeat enough runs to expose instability, and report the observed spread and a representative central value with known variability—not one best or isolated score. Snapshot evidence must not be presented as page-load or interaction-timing evidence.

For visually material Interface Studio work, capture the important wide, narrow, and critical states; critique against the selected direction and page purpose; revise only material in-scope findings; recapture after the last visual change. A screenshot proves only that rendered state.

Test only applicable states, browsers, viewports, links, forms, console/network paths, and motion modes. Label an untested environment as unavailable or skipped, not passed.

### 6. Separate release and live effects

Run repository-native checks proportionate to the changed paths, inspect the final diff, and scan for private content, debug artifacts, and unsupported claims. A local build is not publication.

Deploy, change DNS, activate analytics, submit to a real form destination, publish redirects, delete routes, or submit to search only when that exact destination/effect is authorized. Then verify the live visitor-visible result independently; a successful command alone is not release proof.

## Output contract

Report these semantics, in any order or adapter-specific presentation:

- outcome and bounded site/page scope;
- changed content, UI, metadata, forms, or redirects;
- selected or inherited visual direction when relevant;
- fresh evidence tied to each claim;
- residual gaps and live/dependency effects not performed.

Do not require a `Contract: PASS` line when no optional manifest was used, and do not call a build, screenshot, or deploy command a launched website without the corresponding evidence.

## Common pitfalls

- Turning a copy or CSS edit into a full contract and browser-matrix exercise.
- Starting from attractive components before truthful content and page purpose.
- Asking for a second design approval after an authorized selection.
- Inventing proof, urgency, policy, consent, or redirect intent.
- Treating a relaunch as only a redesign and losing URLs or useful content.
- Forcing every browser, state, budget, or form field onto work that does not touch it.
- Claiming behavior, accessibility, performance, or launch from a screenshot or local build.
- Installing tooling, enabling tracking, or activating real delivery as an implementation side effect.

## Verification checklist

- [ ] Task mode, local boundary, content/claim sources, affected paths, and repository conventions are clear.
- [ ] Bounded requested writes proceeded without redundant artifacts or approval.
- [ ] Visually material work used a human-selected or explicitly delegated Interface Studio direction; established/leaf work inherited the local system.
- [ ] Optional JSON/template use, if any, is described only as structural lint for complex work.
- [ ] No claim, proof, legal text, consent behavior, or URL migration was invented.
- [ ] The implementation is one useful slice and preserves public route/content ownership.
- [ ] Fresh evidence is proportional to the visible, interactive, accessibility, metadata, redirect, performance, or launch claims actually made.
- [ ] Lighthouse, when used, matches navigation/timespan/snapshot mode to the claim and reports repeated-run variability rather than one score.
- [ ] Server form boundaries, user input, private data, and safe fixtures were protected where applicable.
- [ ] Dependency, destructive, production, deployment, publication, DNS, analytics, real-delivery, and search effects remained separately authorized and verified.
