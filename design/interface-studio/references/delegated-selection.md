# Delegated selection

Use this branch when the user explicitly delegates a material route, copy, or design choice. A bounded build request authorizes its named local work; delegation authorizes the agent to choose among real alternatives. Neither covers dependencies, destructive/live/external effects, production data, publication, or deployment.

If repository evidence and constraints already determine one coherent route, record that no comparison was needed and continue. Do not generate alternatives merely to exercise this procedure.

## Decision procedure

1. State the compact decision criteria before judging.
2. Produce only enough genuinely independent options to expose the unresolved trade-off. One candidate is valid when constraints already select it.
3. When a consequential comparison would benefit from independence and another reviewer is available, anonymize candidate authorship and request a cold comparison. This is optional evidence, not a quota.
4. Compare product truth, audience/task fit, narrative or interaction clarity, hierarchy, originality without copied expression, responsive viability, accessibility risk, asset/data honesty, and feasibility.
5. Choose one viable route. Do not synthesize a compromise unless the hybrid resolves a named requirement and is itself checked as the selected route.
6. Record the chosen ID or direct recommendation, decision owner `delegated`, exact authority reference, brief-linked rationale, principal risk, and next bounded step.
7. Continue immediately within the local scope. Do not request ceremonial approval.

## Tie, weak field, or changed decision

- If one option is materially stronger, choose it and name its trade-off.
- If viable options tie, prefer the clearer, more truthful, more accessible, and more implementable route unless the brief weights another criterion.
- If no candidate meets a critical requirement, correct the failed premise or stop with the blocker; do not loop to manufacture a winner.
- Regenerate only when the architecture of the choice is wrong. Use targeted edits for local defects.
- Ask the human only when a material choice remains unresolved under the delegated criteria or the proposed route would change scope/effect.

## Authority record

A plain inline note is sufficient unless the decision must survive runs/agents or the project requires persistence:

```text
Selection: <candidate or direct route>
Owner: delegated
Authority: <exact prompt/message reference>
Rationale: <decision-criteria evidence>
Main risk: <known trade-off>
Alternatives: <rejected IDs/reasons or not generated — constraints selected one route>
Next step: <bounded local work>
```

This record is traceability, not identity authentication or external-effect authorization.
