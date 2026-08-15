---
name: product-story-and-copy
description: "Use when a website, web application, or dashboard needs product positioning, message hierarchy, conversion copy, interface microcopy, SEO/social metadata, or a claims audit before visual design. Separates facts, hypotheses, proof, and unknowns; writes specific human copy from product evidence; and blocks invented metrics, testimonials, urgency, or benefits."
license: Apache-2.0
compatibility: Works with any product, website, application, or dashboard workflow and Agent Skills-compatible client.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: design
  tags: product-story, copywriting, conversion, marketing, claims, anti-slop
---

# Product Story and Copy

## Overview

Turn verified product knowledge and customer language into a coherent story, page architecture, and interface copy before final composition. Copy is a product input, not filler: it determines hierarchy, proof placement, interaction labels, empty/error states, and the space components need.

<HARD-GATE>
Never publish or design around a claim without classifying its evidence. Do not invent customer quotes, logos, metrics, rankings, scarcity, urgency, compliance, availability, integrations, outcomes, or comparative superiority. Mark an unsupported idea as a hypothesis or exclude it from publishable copy.
</HARD-GATE>

## When to use

- Establish positioning, audience, value proposition, offer, objections, proof, or conversion flow for a website.
- Write or rewrite headlines, sections, calls to action, pricing copy, forms, onboarding, empty states, errors, confirmations, or dashboard labels.
- Audit copy that feels generic, hyperbolic, interchangeable, or AI-generated.
- Prepare content before art direction, a design system, layout, or frontend implementation.

Do not use for a mechanical typo fix, private sales outreach, long-form editorial content, or visual direction. Do not force a landing-page funnel onto an authenticated product surface.

## Workflow

### 1. Build the evidence map

Inspect the product source of truth: repository docs, features, routes, screenshots, demos, pricing, customer research, analytics definitions, support language, approved brand voice, and legal/compliance constraints. Record source locators. Treat current UI copy as evidence of implementation, not proof that a claim is true.

Classify each statement:

- `fact` — directly supported by a primary source;
- `derived` — follows from named facts through a stated inference;
- `hypothesis` — plausible but not validated;
- `unknown` — required information is absent;
- `forbidden` — fabricated, misleading, private, or explicitly disallowed.

Load [copy and evidence rules](references/copy-evidence-rules.md) when claims, testimonials, metrics, comparison, urgency, or regulated language appears.

**Complete when:** audience, problem, mechanism, capabilities, constraints, proof, unknowns, and source locators are distinguishable without relying on marketing adjectives.

### 2. Define the product story

Copy [the product story template](templates/product-story.md) to `.design-flow/artifacts/PRODUCT-STORY.md`. Define:

- primary audience and context;
- job to be done and current workaround;
- product mechanism and differentiated choice;
- promised outcome bounded by evidence;
- constraints and honest non-fit;
- objections and proof response;
- voice samples and language to avoid;
- primary journey and conversion event.

A product story is not a slogan list. Keep one central argument that can survive removal of the brand name.

**Complete when:** a skeptical reader can explain who the product is for, what changes, why this mechanism is credible, and when the product is not the right fit.

### 3. Create and enforce the claims ledger

Copy [the claims template](templates/claims.md) to `.design-flow/artifacts/CLAIMS.md`. Give every candidate claim an ID and record:

- exact wording;
- type;
- source and locator;
- scope and caveat;
- publishability decision;
- surfaces where it may appear.

Link publishable sections and data labels to claim IDs. Synthetic example data must be labeled and must not imply customer or production evidence.

**Complete when:** every measurable, comparative, testimonial, security, compliance, availability, and outcome claim has a decision and evidence locator; unresolved hypotheses are absent from final copy.

### 4. Design the message hierarchy

Choose the information order from the user's decision, not a default landing template. Depending on the surface, define:

- public website: recognition → mechanism → evidence → fit/objections → action;
- application: current state → available action → consequence → feedback/recovery;
- dashboard: scope/freshness → signal → evidence → drill-down/action.

A section earns space only if it advances understanding, confidence, or action. Do not add FAQ, logo walls, metrics, testimonials, “how it works,” or pricing merely because SaaS pages often contain them.

**Complete when:** each section or screen has one job, one supported message, required proof, and a transition to the next user decision.

### 5. Write human copy and state microcopy

Copy [the page copy template](templates/page-copy.md) to `.design-flow/artifacts/PAGE-COPY.md`. Use concrete nouns and verbs, product terminology, real constraints, and varied sentence rhythm. Preserve an existing human voice unless the user asks for a new one.

Write applicable states with the same care as the hero:

- labels and helper text;
- loading and progress;
- empty and first-use;
- validation and server error;
- destructive confirmation;
- success and next action;
- forbidden/permission state;
- cancellation and retry.

Avoid pretending that every state should sound playful or branded. Error copy should identify what happened, what remained safe, and what the user can do.

**Complete when:** final copy works without lorem ipsum, labels are unambiguous out of context, and state messages preserve action and recovery context.

### 6. Make the public surface marketing-ready

Where applicable, define:

- unique title and meta description;
- canonical and indexability decision;
- social title, description, and image brief;
- semantic heading outline;
- structured-data applicability without inventing fields;
- conversion event and success condition;
- form privacy/consent and error copy;
- trust/legal links required by the actual offer.

Do not call a page SEO-ready from metadata alone; technical implementation and crawl/runtime evidence belong to the website engineering workflow.

**Complete when:** metadata, conversion, trust, and measurement requirements are explicit and traceable to the page's real content and offer.

### 7. Run the anti-slop edit

For every paragraph, ask:

1. What specific fact or decision does this add?
2. Could a competitor paste it unchanged?
3. Is the claimed mechanism visible?
4. Does the proof support the exact scope?
5. Can one shorter sentence preserve the meaning?

Remove unsupported intensifiers, duplicated claims, manufactured tension, fake precision, throat-clearing, and generic CTA labels. Do not flatten deliberate human quirks or rewrite a raw voice into corporate polish.

**Complete when:** every retained line carries product-specific meaning, interaction guidance, proof, or necessary trust information.

## Output contract

```text
Product story and copy: READY | PARTIAL | BLOCKED
Audience / JTBD: <specific summary>
Primary mechanism: <how the product creates the outcome>
Conversion / task: <observable user action>

Artifacts
- PRODUCT-STORY.md: <path>
- PAGE-COPY.md: <path>
- CLAIMS.md: <path>

Claims
- Publishable: <IDs>
- Hypotheses excluded: <IDs>
- Unknown/blocking: <IDs>

Marketing readiness
- Metadata/heading/social: <status>
- Conversion measurement: <status>
- Trust/legal constraints: <status>

Evidence
- Sources inspected: <locators>
- Existing voice samples: <locators>
- Copy audit: <specific changes>
```

## Common pitfalls

- Starting with headline formulas before understanding the product mechanism.
- Treating current marketing copy as evidence for itself.
- Hiding unknowns behind polished prose.
- Writing the hero carefully while leaving forms, errors, and empty states generic.
- Adding a section because a competitor has one.
- Using “simple,” “fast,” “secure,” or “AI-powered” without scope and evidence.
- Converting every sentence into the same short punchy cadence.
- Fabricating urgency, customer volume, or production data in examples.
- Claiming SEO or conversion readiness without implementation evidence.

## Verification checklist

- [ ] Product, audience, job, mechanism, alternatives, constraints, and non-fit were inspected from sources.
- [ ] Facts, derived statements, hypotheses, unknowns, and forbidden claims are separated.
- [ ] Every publishable claim has an exact source locator, scope, and caveat.
- [ ] No metric, quote, logo, testimonial, urgency, compliance, or superiority was invented.
- [ ] The story has one product-specific argument rather than interchangeable benefits.
- [ ] Message order follows the user's decision rather than a fixed SaaS template.
- [ ] Headlines, body, CTA, labels, forms, loading, empty, success, and failure copy are covered where applicable.
- [ ] Metadata, headings, conversion measurement, trust, and legal requirements are explicit for public pages.
- [ ] Unsupported adjectives, repeated claims, generic filler, and fake precision were removed.
- [ ] Existing human voice was preserved unless a change was requested.
