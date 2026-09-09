---
name: stip-validate
description: Turn an explored change into a reviewable specification and record explicit user approval of its current version.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-validate

Read the change proposal, relevant current specs and selected extension contributions. Produce a concise desired contract in spec.md, including scope, observable behavior, acceptance criteria and material unresolved decisions. Use `- AC-1: ...` lines with unique stable identifiers. For an existing target, this is its complete next specification, not a delta that drops old requirements.

Create tasks.md only when decomposition helps. Keep detailed discovery in proposal.md. Do not make a plan or checklist a substitute for a decision.

For native orchestration, read [references/orchestration.md](references/orchestration.md). Prepare a compact `execution-plan.json` with stable task IDs, roles, phases, criteria, dependencies, file ownership and objectives. Use OpenCode's `stip_plan` tool when available, or `plan <id> --file <plan-json>`. This explicitly opts the change into state schema v2 and binds the semantic task graph to approval. A previously approved or started v1 change requires `--migrate` and renewed approval; do not silently convert it. Include a separate verification task/session and relevant documentation work without creating a task for every installed extension.

Run `validate <id>` and present the files to the user. Validation checks structure and invalidates a stale approval; it does not approve meaning. Continue editing through natural-language feedback. An explicit request to apply the presented, unchanged contract can supply approval; silence cannot.

Only after that agreement run `approve <id> --by user --ack-user-approval`. This flag is an audit attestation, not user authentication. Never invoke it to bypass the user's review. Proposal, spec, optional tasks, target and selected extension guidance are bound to approval. Text changes to these documents invalidate approval, including wording corrections. V2 additionally binds semantic execution-plan changes; model settings and mutable worker progress remain outside the approved files.

Stop after a reviewable draft unless approval/apply was actually requested. The next operation is stip-apply.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
