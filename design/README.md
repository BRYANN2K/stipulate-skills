# Design skills

A design-system-first workflow for specific, truthful, accessible web interfaces without generic AI copy, reference collage, fake data, or decorative polish that outruns function.

## Workflow

```text
product-story-and-copy
        ↓
design-direction
        ↓
design-system-first
        ↓
explicit human approval
        ↓
compiled project-local UI skill
        ↓
existing frontend engineering skill
        ↓
interface-motion
        ↓
anti-slop-review
```

[`web-craft`](web-craft/) orchestrates the complete flow and ships the deterministic gate.

## Skills

| Skill | Responsibility |
|---|---|
| [`web-craft`](web-craft/) | Route the surface, maintain workflow state, enforce design approval, compile the project UI contract, coordinate implementation, and verify the result |
| [`product-story-and-copy`](product-story-and-copy/) | Establish product truth, positioning, message hierarchy, claims, conversion copy, state microcopy, and marketing requirements |
| [`design-direction`](design-direction/) | Turn cited references into an original visual thesis, product-specific signature, and no-go list without cloning |
| [`design-system-first`](design-system-first/) | Define foundations, semantic tokens, composition, components, states, responsive/accessibility behavior, preview evidence, and project-local implementation instructions |
| [`interface-motion`](interface-motion/) | Specify and verify intentional motion for causality, feedback, orientation, continuity, progression, or hierarchy |
| [`anti-slop-review`](anti-slop-review/) | Audit truth, copy, composition, system fidelity, states, data, motion, accessibility, responsive behavior, marketing, and runtime evidence |

## Hard gate

Product frontend roots remain blocked until:

1. all eight design artifacts pass structural checks;
2. the human explicitly approves the exact review set;
3. approval is bound to current SHA-256 digests;
4. `PROJECT-UI.md` is compiled to `.agents/skills/<project>-ui/SKILL.md`;
5. `design_flow.py check-build` passes.

The approval record is tamper-evident evidence, not identity authentication. Use branch protection and CI for hostile-writer enforcement. An optional fail-closed Hermes `pre_tool_call` adapter is included under `web-craft/scripts/` but is never installed without explicit permission.

`web-craft/templates/agents-md-snippet.md` provides the portable project-context layer. It must be adapted and merged without overwriting existing repository instructions.

## Deterministic checks

```bash
python3 -m unittest discover -v -s design/web-craft/scripts -p 'test_*.py'
python3 scripts/validate_skills.py
python3 scripts/run_skill_tests.py
```

The design-flow tests cover missing artifacts, unresolved token markers, early/vague approval, digest invalidation, compiled-skill drift, protected writes, hook behavior, and final report structure.
