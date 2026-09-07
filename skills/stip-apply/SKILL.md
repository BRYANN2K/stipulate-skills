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

Build the requested outcome in the existing stack. Read only relevant selected extension apply references, if present. Preserve existing decisions and unrelated edits. Run the affected checks, correct failures caused by this change and inspect the result as required by the contract. Do not stop automatically after the first draft.

A material question blocks only dependent work. If the user changes the contract, return to stip-validate and obtain agreement before implementing the changed scope. Do not loosen criteria to fit an implementation. Re-running start after a failed check preserves the original baseline and invalidates old evidence.

Do not deploy, push, publish or install unrelated dependencies merely because the feature is approved. Follow actual user authorization and environment permissions.

When the implementation is ready for reconciliation, invoke stip-check. The build itself is not evidence that all acceptance criteria passed. State which checks ran and where their outputs can be inspected.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
