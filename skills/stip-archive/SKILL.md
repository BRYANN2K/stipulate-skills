---
name: stip-archive
description: Close a documented workflow change, promote its accepted specification and create a scoped local Git commit.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-archive

Archive only after current approval, successful acceptance checks and documentation completion. Read status and inspect the intended Git changes. The user invoking this skill requests a local archive commit; it does not authorize a push or deployment.

For a schema-v2 change, read [references/orchestration.md](references/orchestration.md). Reconcile actual native sessions, stop further dispatch and ensure every planned contribution is accepted with no active or unknown workers. The main coordinator performs archive; workers do not change lifecycle records or commit. The engine generates a bounded execution summary during archive; review its task/session/model provenance against observed results. The private `.workflow/.runtime/` registry remains untracked and outside the archive commit.

Run `archive <id> --message <meaningful-message> --paths <exact-source-and-doc-paths-changed-since-start>`. The command promotes spec.md to `.workflow/specs/<target>.md`, moves the complete change to archive and commits those workflow records plus exactly the supplied paths. A new feature normally uses its change id as target; an evolution uses the target selected during explore.

The command refuses stale evidence, changed HEAD, concurrent target-spec edits, staged unrelated work or selected files that already had modifications at apply start. Do not reset, overwrite or absorb other work to satisfy it. Reconcile the Git situation with the user when it cannot be safely separated. If HEAD moved, the engine requires explicit reconciliation/restarting the change; it does not automatically rebase evidence.

Commit hooks run normally. A failed commit restores the workflow transaction and unstages its paths when HEAD did not change. Hook-caused source changes or an already-created unexpected commit require inspection; never claim rollback or success beyond the output.

Read back the archive, accepted spec and Git commit. Report the commit hash and any remaining unrelated work. Never amend the archive immediately to insert its own commit hash; Git history is its locator.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
