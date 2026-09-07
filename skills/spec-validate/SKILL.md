---
name: spec-validate
description: Turn an explored change into a reviewable specification and record explicit user approval of its current version.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# spec-validate

Read the change proposal, relevant current specs and selected extension contributions. Produce a concise desired contract in spec.md, including scope, observable behavior, acceptance criteria and material unresolved decisions. Use `- AC-1: ...` lines with unique stable identifiers. For an existing target, this is its complete next specification, not a delta that drops old requirements.

Create tasks.md only when decomposition helps. Keep detailed discovery in proposal.md. Do not make a plan or checklist a substitute for a decision.

Run `validate <id>` and present the files to the user. Validation checks structure and invalidates a stale approval; it does not approve meaning. Continue editing through natural-language feedback. An explicit request to apply the presented, unchanged contract can supply approval; silence cannot.

Only after that agreement run `approve <id> --by user --ack-user-approval`. This flag is an audit attestation, not user authentication. Never invoke it to bypass the user's review. Proposal, spec, optional tasks, target and selected extension guidance are bound to approval. Core v1 treats any byte change to these documents as stale, including wording corrections; reapproval is conservative and explicit.

Stop after a reviewable draft unless approval/apply was actually requested. The next operation is spec-apply.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
