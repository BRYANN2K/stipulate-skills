---
name: software-engineering
description: "Use when a software request is broad, spans more than one application or tool specialty, or needs routing among project bootstrap, websites, web applications, dashboards, command-line tools, terminal UIs, and genuinely necessary interface direction."
license: Apache-2.0
compatibility: Works with Agent Skills-compatible clients and repository-native software stacks; browser, terminal, or service access is needed only for claims that require it.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: software-engineering, orchestration, routing, web, cli, tui
---

# Software Engineering

## Overview

Route a software outcome to the smallest specialist that owns its primary user and runtime contract. This skill is a lightweight entry point, not a replacement for specialists or a universal software-development lifecycle.

Use a specialist directly when the product shape is clear. Combine specialists only when the requested outcome genuinely crosses their boundaries. Do not impose mandatory phases, plans, manifests, artifacts, option counts, validators, design ceremony, or a second approval.

## When to use

- The request says “build software,” “app,” “site,” or “tool” but its primary interface or runtime contract is not yet clear.
- One requested outcome materially spans two software specialties.
- Product code arrives from another domain with completed discovery that should be preserved.
- Materially visual public/UI work may need Interface Studio because direction, system, or UX choices are actually open.

Do not use this orchestrator around an already bounded specialist task.

## Routing

| User outcome | Smallest route |
|---|---|
| Start or safely adopt a software repository; add a bounded project foundation | [software-project-bootstrap](../software-project-bootstrap/SKILL.md) |
| Build, redesign, migrate, or audit a public content, marketing, documentation, or conversion website | [website-production-engineering](../website-production-engineering/SKILL.md) |
| Build or change a stateful browser app with routes, auth, forms, server data, state, or multi-step journeys | [web-application-engineering](../web-application-engineering/SKILL.md) |
| Build or change an analytical or operational dashboard | [dashboard-application-engineering](../dashboard-application-engineering/SKILL.md) |
| Build or change a line-oriented command-line tool | [command-line-tool-engineering](../command-line-tool-engineering/SKILL.md) |
| Build or change a full-screen interactive terminal application | [terminal-ui-engineering](../terminal-ui-engineering/SKILL.md) |
| Resolve materially open visual direction, design-system, product-story, motion, or UX quality for a public/UI surface | Route that design outcome through [Interface Studio](../../design/interface-studio/SKILL.md), paired with the owning engineering specialist only if implementation is also requested |
| CI/CD, GitOps, release, or incident work | Hand off to [DevOps](../../devops/devops/SKILL.md) |
| IaC, Kubernetes, or cloud architecture work | Hand off to [Infrastructure](../../infrastructure/infrastructure/SKILL.md) |

A bounded UI implementation under an established direction/system goes straight to its engineering specialist. It does not require Interface Studio, new design artifacts, alternatives, or another approval.

## Workflow

These are routing decisions, not mandatory phases:

1. Identify the requested user outcome and the primary exposed contract: repository foundation, public page, stateful browser journey, decision surface, line protocol, or terminal lifecycle.
2. Inspect only enough current repository evidence to choose the owner and inherit existing stack, conventions, and visual system.
3. Select one engineering specialist by default. Add Interface Studio or another specialist only for a distinct part of the same requested outcome that is materially open.
4. Preserve each specialist's security, accessibility, compatibility, failure-state, and proof requirements.
5. Only when work actually crosses a domain boundary, use the [optional cross-domain handoff semantics](../../agent-workflows/agent-workflows/references/domain-handoffs.md) to distinguish consultation from ownership transfer. Carry the primary contract, accepted scope, current architecture and visual-system facts, completed work, last mutation, open question, evidence freshness, authority, and return condition; route directly to the concrete destination specialist once known, and never re-bootstrap or replay current discovery.
6. Stop at the bounded result or the exact authority, decision, or evidence blocker.

## Safety boundaries

A bounded user request authorizes the bounded local implementation it names. Do not ask for a second approval merely because an orchestrator or specialist was selected.

Pause if a next action expands beyond that request into secrets or private data, dependency installation, authentication or permission changes, destructive/live/remote mutation, deployment, release, publication, or a public machine contract such as a CLI format, exit behavior, API/schema, URL, or persisted-data compatibility surface. An explicit request naming the exact change and target supplies authority, but it does not relax the owning specialist's safety or verification conditions.

A helper `PASS`, compilation, lint, type-check, or screenshot proves only what it exercised. It is not standalone proof of software quality, accessibility, security, compatibility, or user behavior.

## Output contract

Preserve these semantics in any focus-appropriate order:

- selected specialist(s), primary contract, and routing reason;
- bounded scope, exclusions, inherited conventions, and authority boundary;
- changed paths or returned guidance, plus relevant execution or behavior evidence;
- design or cross-domain handoff state when applicable;
- failed, unavailable, or unperformed checks and external effects;
- outcome and proof level stated no more broadly than the evidence.

The format is flexible; focus-friendly delivery may reorder or progressively disclose these fields without removing gaps or proof limits.

## Common pitfalls

- Treating every browser surface as the same kind of website or web application.
- Confusing a line-oriented CLI with a full-screen TUI.
- Sending a bounded UI edit through mandatory design ceremony.
- Skipping Interface Studio when a materially visual direction, system, or UX decision is genuinely unresolved.
- Combining bootstrap, implementation, design, delivery, and infrastructure by default.
- Treating a helper `PASS` or successful build as end-to-end quality proof.
- Repeating discovery or losing decisions during a domain handoff.

## Verification checklist

- [ ] The route matches the primary user/runtime contract and is the smallest sufficient specialist set.
- [ ] Direct specialist use was preserved for clear intent.
- [ ] Interface Studio was used only for materially open visual/UX work, not bounded implementation ceremony.
- [ ] Cross-domain handoffs preserved completed discovery, decisions, and evidence locators.
- [ ] Public contracts and expanded effects stayed within exact authority and specialist safety boundaries.
- [ ] Fresh evidence supports only the behavior and proof level actually claimed.
