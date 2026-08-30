# Cross-domain handoffs

Use this reference only when active work actually crosses a domain boundary. If the outcome already identifies a concrete specialist, invoke that specialist directly; do not pass through either domain umbrella first.

These are optional prose semantics for continuity, not a required artifact or schema. Carry them in the conversation or an existing project note, omit anything immaterial, and do not create a handoff file merely to satisfy this reference. This reference defines no framework API, manager or participant registry, transcript broadcast, fixed turn count, manifest, or installation step.

## Choose the relationship

| Relationship | Ownership rule |
|---|---|
| Consultation | The current owner retains the outcome and final synthesis. The consulted specialist answers one bounded question and returns evidence when the stated return condition is met. |
| Ownership transfer | The bounded remainder changes owner because another specialist owns its decisive work or acceptance condition. The prior owner does not continue the same work in parallel; any return is governed by the stated return condition. |

Once the need is known, name the concrete specialist rather than another umbrella orchestrator. Use a destination umbrella only while its specialist is genuinely ambiguous. Do not bounce an unchanged question from umbrella to umbrella.

## Carry the minimum continuity

A material handoff may carry these semantics in natural language:

- **Outcome, target, and exclusions:** the requested result, the exact repository/system/audience affected, and what must not happen.
- **Authority:** effects already allowed and effects that still need authority. The callee receives only the intersection of incoming authority and its own stricter gates; routing never expands authority.
- **Established facts:** each material fact with an inspectable source or evidence locator and its freshness or observation time. Keep inference labeled as inference.
- **Completed work and last relevant mutation:** discovery, decisions, checks, changed paths or external effects already completed, plus the last mutation after which evidence may need refreshing.
- **Open question:** the smallest unresolved question or blocker the next specialist must answer.
- **Next owner and decisive reason:** the concrete specialist and the boundary fact that makes it the owner, not a vague keyword match.
- **Route trail:** prior `(from, to, question)` hops, with any new evidence or narrowing that justified a repeat.
- **Return-to and return condition:** the owner that resumes synthesis and the answer, evidence, decision, or state that completes the consultation or permits a transfer back.

Do not replay completed work while its evidence is current and applicable. Reinspect only when it is stale, contradicted, missing for the new target, or invalidated by a later mutation, and say why.

If the same owner and materially same open question already appear in the route trail, do not hand it back absent new evidence or an explicitly narrower question. Return the blocker to the originating owner or surface it to the user instead of ping-ponging.

## Return and merge evidence

The callee returns the bounded answer, supporting locators and freshness, any work or mutation it performed, unresolved gaps, and whether the return condition was met. It does not send an entire transcript when selected facts and evidence suffice.

The originating owner merges every returned evidence set by claim. For a consultation it also retains final synthesis; after an ownership transfer it records the return without reclaiming the work unless the return condition says so.

- **supporting:** sources independently support the same bounded claim;
- **contradicting:** sources disagree, so preserve both locators and report the conflict;
- **qualifying:** evidence narrows the target, conditions, confidence, or time window;
- **missing:** a needed source, check, permission, or observation is unavailable.

Never upgrade an inference to an established fact merely because another specialist repeated it. Multiple scoped checks also do not prove a broader outcome they did not exercise.

## Compact routing evals

1. “Fix this README typo.” → `developer-documentation` directly; no front door or ADR.
2. “Review this Terraform plan; do not apply.” → `terraform-change-safety`; read-only authority survives.
3. “Why is Flux reporting HelmRelease drift?” → `gitops-operations`, not Kubernetes by keyword.
4. “500s began after deploy; investigate only.” → `sre-incident-investigation`; timestamped pipeline and application evidence may fan in, but no mutation.
5. “Add auth wizard to existing app; use current design.” → `web-application-engineering`; no Interface Studio or deployment.
6. “Redesign and implement the marketing hero; no publish.” → Interface Studio resolves the visual contract, then one website engineer implements it without rediscovery.
7. “Record the decided queue migration in an ADR with a sequence diagram.” → Documentation selects ADR plus diagram only because the one deliverable needs both.
8. “Audit AGENTS.md and substantiate the ‘tests pass’ claim.” → Agent Workflows selects authoring plus the completion adapter, with fresh post-mutation evidence.
9. “Privately save this incident lesson; don’t draft/post.” → `build-in-public-journal` directly; nothing publishable crosses the boundary.
10. Documentation finds unknown API behavior → Software answers one tagged question → Documentation resumes; the identical second hop is blocked without new evidence.
11. Metrics say recovered while GitOps remains degraded → the originating owner preserves both sourced claims and reports the conflict; it does not synthesize “healthy.”

## Source basis

This reference adapts mechanism-level lessons only; it does not import any framework runtime, topology, or data model.

- [OpenAI Agents Python at `89c02c8`](https://github.com/openai/openai-agents-python/tree/89c02c828ee8510fe9a84ee6675608193aa13b02) — MIT ([license](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/LICENSE)); inspected [handoffs](https://github.com/openai/openai-agents-python/tree/89c02c828ee8510fe9a84ee6675608193aa13b02/src/agents/handoffs), [filters](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/src/agents/extensions/handoff_filters.py), and [handoff](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/tests/test_handoff_tool.py) / [history-duplication](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/tests/test_handoff_history_duplication.py) tests for targeted context and no-duplication lessons.
- [Google ADK Python at `8cdbbb1`](https://github.com/google/adk-python/tree/8cdbbb158c70d22c414bd943ad29ec080d1a52b6) — Apache-2.0 ([license](https://github.com/google/adk-python/blob/8cdbbb158c70d22c414bd943ad29ec080d1a52b6/LICENSE)); inspected [agent transfer](https://github.com/google/adk-python/blob/8cdbbb158c70d22c414bd943ad29ec080d1a52b6/src/google/adk/flows/llm_flows/agent_transfer.py) and [target tests](https://github.com/google/adk-python/blob/8cdbbb158c70d22c414bd943ad29ec080d1a52b6/tests/unittests/flows/llm_flows/test_get_transfer_targets.py) for constrained destinations and loop/escalation lessons.
- [Microsoft Agent Framework at `edfe115e`](https://github.com/microsoft/agent-framework/tree/edfe115ea06bca57ae5a123d0fac5b3fdda13603) — MIT ([license](https://github.com/microsoft/agent-framework/blob/edfe115ea06bca57ae5a123d0fac5b3fdda13603/LICENSE)); inspected the Python [handoff orchestration](https://github.com/microsoft/agent-framework/blob/edfe115ea06bca57ae5a123d0fac5b3fdda13603/python/packages/orchestrations/agent_framework_orchestrations/_handoff.py), [handoff tests](https://github.com/microsoft/agent-framework/blob/edfe115ea06bca57ae5a123d0fac5b3fdda13603/python/packages/orchestrations/tests/test_handoff.py), and [replay tests](https://github.com/microsoft/agent-framework/blob/edfe115ea06bca57ae5a123d0fac5b3fdda13603/python/packages/ag-ui/tests/ag_ui/test_handoff_replay.py) for directed routing and replay resistance.
- [LangGraph Supervisor at `88859b3`](https://github.com/langchain-ai/langgraph-supervisor-py/tree/88859b34017ac3569bbd4a3092c7e77593a0a960) — MIT ([license](https://github.com/langchain-ai/langgraph-supervisor-py/blob/88859b34017ac3569bbd4a3092c7e77593a0a960/LICENSE)); inspected [handoff state](https://github.com/langchain-ai/langgraph-supervisor-py/blob/88859b34017ac3569bbd4a3092c7e77593a0a960/langgraph_supervisor/handoff.py) and [tests](https://github.com/langchain-ai/langgraph-supervisor-py/blob/88859b34017ac3569bbd4a3092c7e77593a0a960/tests/test_supervisor.py) for atomic destination/provenance and evidence fan-in lessons, not its supervisor architecture.
- [Agent Skills at `69ef37e`](https://github.com/agentskills/agentskills/tree/69ef37e9424c0a7ea9dd2293b559e43ec8176379) — documentation CC-BY-4.0 and code Apache-2.0 as stated in its [README](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/README.md) and code [license](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/LICENSE); inspected the [specification](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/docs/specification.mdx), [client guidance](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/docs/client-implementation/adding-skills-support.mdx), and [evaluation guidance](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/docs/skill-creation/evaluating-skills.mdx) for direct activation, progressive disclosure, and near-miss evaluation.
- [GitHub `agent-skill-stack` at `f11a4e4`](https://github.com/github/awesome-copilot/tree/f11a4e441c5ff061b4f8ae37952be8c602e4034e/skills/agent-skill-stack) — MIT under the repository [license](https://github.com/github/awesome-copilot/blob/f11a4e441c5ff061b4f8ae37952be8c602e4034e/LICENSE); inspected its [skill](https://github.com/github/awesome-copilot/blob/f11a4e441c5ff061b4f8ae37952be8c602e4034e/skills/agent-skill-stack/SKILL.md) and [workflow model](https://github.com/github/awesome-copilot/blob/f11a4e441c5ff061b4f8ae37952be8c602e4034e/skills/agent-skill-stack/references/workflow-model.md) for outcome-first selection and the smallest useful specialist set, not its indexing, manifest, or installation machinery.
