---
name: stip-apply
description: Implement an approved workflow change and continue through relevant tests and corrections within its contract.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-apply

Read the current proposal and spec; use status to verify the approval. Run `start <id>` before source changes. It binds a baseline, detects preexisting work and refuses an unapproved or changed contract.

For a schema-v2 change, read [references/orchestration.md](references/orchestration.md) and its approved execution plan. The main agent orchestrates: dispatch ready implementation tasks to native workers, inspect and integrate returned results, then explicitly accept contributions or request bounded corrections. In OpenCode use `stip_delegate`, `stip_status` and `stip_contribution` when available. Codex and Claude Code use their own native delegation with file-based role bindings. A small implementation still uses one worker; additional workers need independent useful tasks. Do not silently replace failed delegation with substantial coordinator implementation.

Build the requested outcome in the existing stack. Read only relevant selected extension apply references, if present. Preserve existing decisions and unrelated edits. Run the affected checks, correct failures caused by this change and inspect the result as required by the contract. Do not stop automatically after the first draft.

Brief each worker with its objective, relevant criteria and extension references, dependencies, permitted files and expected evidence. Preserve one writer in a shared checkout. A worker that has returned is still awaiting coordinator review; it cannot approve its own contribution or advance the lifecycle. Reuse its native session for a scoped correction when appropriate, and reconcile uncertain outcomes before retrying. Existing v1 changes keep their approved execution rules unless explicitly migrated through validation.

A material question blocks only dependent work. If the user changes the contract, return to stip-validate and obtain agreement before implementing the changed scope. Do not loosen criteria to fit an implementation. Re-running start after a failed check preserves the original baseline and invalidates old evidence.

Do not deploy, push, publish or install unrelated dependencies merely because the feature is approved. Follow actual user authorization and environment permissions.

When the implementation is ready for reconciliation, invoke stip-check. The build itself is not evidence that all acceptance criteria passed. State which checks ran and where their outputs can be inspected.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
