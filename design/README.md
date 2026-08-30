# Design skills

Freedom-first, evidence-led workflows for truthful, original, accessible interfaces. **Interface Studio is the design front door** for websites, landing pages, and materially visual UI; it chooses the shortest safe route rather than manufacturing options, documents, viewports, states, or review passes.

## Interface Studio routing

| Requested outcome | Route |
|---|---|
| Targeted copy, claims, metadata, or state wording | `product-story-and-copy` targeted mode |
| Targeted visual thesis, reference translation, or concept decision | `design-direction` targeted/inherit mode |
| Targeted token, component, foundation, or UI-contract work | `design-system-first` targeted/inherit/extract mode |
| Targeted transition, micro-interaction, or motion audit | `interface-motion` targeted mode |
| Targeted visual/copy/accessibility/responsive/runtime QA | `anti-slop-review` targeted mode |
| Bounded build inside a coherent existing UI | Interface Studio bounded-build route: inherit → implement → verify affected behavior |
| New/material interface with open framing or direction, or an explicit full-studio request | Interface Studio full route with only enough evidence/options to resolve each open choice |

A targeted request does not invoke the full studio. One copy route or visual direction is valid when constraints already select it; alternatives are warranted only for a real trade-off. Research, story beats, viewports, states, and correction passes are chosen by changed behavior and the claim being made, not by a fixed quota.

## Authority and decisions

An explicit bounded request authorizes the named local design/frontend work. Ask again only when scope or effect expands, an unresolved material choice needs the human, or a dependency, destructive action, live/external/production effect, deployment, or publication appears. Unsupported claims and weakened accessibility/evidence are never authorized by implication.

If route or design selection is explicitly delegated, the agent records the evidence-based choice and continues. Human approval is needed only for a consequential unresolved choice the user did not delegate, or when a proposal-only request did not grant local build authority. A bounded change normally inherits and extends the existing system.

A pre-existing `.design-flow/workflow.json` schema `1.0` remains a constraint for that project only. Follow it there; do not bypass, delete, reinitialize, or migrate it without explicit authority, and do not impose it elsewhere.

## Cross-domain handoff

Interface Studio owns product story/copy, visual direction, design-system decisions, motion, and visual QA. After the surface is classified, route behavior and production concerns once to the applicable `website-production-engineering`, `web-application-engineering`, or `dashboard-application-engineering` skill; do not send a classified surface through the `software-engineering` entry skill.

A bounded feasibility consultation returns its answer to Interface Studio. When the remaining outcome is implementation behavior or production evidence, ownership transfers to the direct engineering specialist and returns only for a named unresolved visual decision. Carry forward the already-inspected product facts, selected direction, local system constraints, affected states, evidence, remaining/prohibited authority, and open return condition so neither side replays discovery.

## Skills

| Skill | Responsibility |
|---|---|
| [`interface-studio`](interface-studio/) | Design front door and sole design orchestrator: route targeted modes or coordinate the full product-to-interface path, bounded build, optional graphics branch, and claim-matched review |
| [`product-story-and-copy`](product-story-and-copy/) | Ground facts, hypotheses, proof, claims, story, conversion copy, metadata, and task/state wording without invented evidence |
| [`design-direction`](design-direction/) | Convert the smallest cited source set into an original thesis or enough viewable concepts to resolve a real trade-off, with licence/no-copy boundaries |
| [`design-system-first`](design-system-first/) | Inherit/extend an existing system for bounded work, or author/extract shared foundations and components when system work is actually requested or demonstrated |
| [`interface-motion`](interface-motion/) | Specify, implement, or audit affected motion for causality, feedback, orientation, continuity, progression, or hierarchy, including interruption and reduced behavior |
| [`anti-slop-review`](anti-slop-review/) | Run targeted or full evidence-linked review without turning automated signals into visual/product-quality proof |

These specialist skills remain independently usable. They do not become competing orchestrators.

## Artifacts are optional memory

Inline chat and session artifacts are valid. Persist a brief, options/reference ledger, design/UI contract, claims ledger, motion contract, or review report only when:

- it is a requested deliverable;
- the decision/evidence must survive across runs or agents; or
- repository policy requires it.

Templates are scaffolds, not fixed bundles. Human output contracts describe information that must survive; `focus-friendly-delivery` may reorder or chunk it without hiding authority, safety, evidence, residual findings, or gaps.

## Optional real-time graphics

Semantic HTML/CSS/DOM is the default. WebGL, WebGPU, Three/R3F, shaders, and `vgpu` are opt-in only by explicit request or a named product need. There is no GPU option quota, forced renderer, hidden-text exception, implicit dependency installation, or excuse to weaken semantic fallback, reduced motion/data, context-loss handling, offscreen pause, cleanup, performance, accessibility, or deterministic capture truth.

Route framework APIs and detailed techniques to `vgpu` and other official relevant skills/docs instead of duplicating them in the design workflow.

## Quality evidence and stop rule

Choose viewports, states, probes, and recaptures from the changed behavior and completion claim. Critique rendered evidence before automated output when visual quality is in scope, then run applicable keyboard, accessibility, console/network, responsive, state, build, and performance checks. A screenshot proves one rendered state; syntax, links, lint, build, or tool `PASS` proves only that check.

Group corrections by root cause and stop on acceptance, diminishing returns, a material blocker or unresolved choice, the agreed budget, or an authority boundary. Open material findings within the requested review scope remain visible; a targeted pass is not a full release, deployment, or publication claim.

## Repository checks

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_skills.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/run_skill_tests.py
```

The validator checks structure, frontmatter, links, and repository safety contracts. It does not prove design quality, browser behavior, accessibility, renderer lifecycle, release readiness, deployment, or publication.
