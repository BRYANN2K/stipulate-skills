# Stip core contract — schema v1

`2.0.0` is the repository package version; `schema_version: 1` is the workflow file schema. Python 3.10+ is sufficient for the runtime. CLI project paths refer to the target project, never implicitly to the skill's installation directory.

## States and transitions

```text
exploring → draft → approved → applying → checked → documented → archived
```

Validate checks structure and exposes the contract digest. Approve records user approval; the CLI operator is responsible for reporting it truthfully. Start rejects a changed contract. A failed check leaves the change in applying. Docs and archive require the preceding stages. Start can resume from checked or documented, invalidating their evidence while preserving the original baseline. A new contract requires validation and renewed user approval; an authorized correction can return to implementation and checking.

The `phase` field alone never proves that approval is current. Use `status`, which recalculates `approval_current`.

## End-to-end CLI example

From the tools repository, replace `/physical/path/to/project` with the actual physical Git root. Initialize Git separately if necessary. Calls are separated to show human review and real observations; this is not a script that approves itself.

```sh
python3 scripts/setup_stip.py --root /physical/path/to/project
python3 scripts/workflow.py --root /physical/path/to/project explore add-cancellation --title "Cancel a job"
```

Populate `project.md` and `proposal.md`. Complete `spec.md` with criteria such as:

```markdown
# Cancel a job

## Intent
Allow cancellation of jobs that are still pending.

## Acceptance criteria
- AC-1: Cancelling a pending job produces an observable cancelled state.
- AC-2: An unauthorized attempt is rejected by the server.
```

To evolve an existing specification, use `explore adjust-cancellation --target add-cancellation`. The target's content becomes the starting point, and archive protects its version against concurrent overwrites.

```sh
python3 scripts/workflow.py --root /physical/path/to/project validate add-cancellation
```

Present the current version to the user. **Only after approval:**

```sh
python3 scripts/workflow.py --root /physical/path/to/project approve add-cancellation --by user --ack-user-approval
python3 scripts/workflow.py --root /physical/path/to/project start add-cancellation
```

Implement the change, run relevant checks, correct failures, and request the source snapshot:

```sh
python3 scripts/workflow.py --root /physical/path/to/project snapshot
```

Create a JSON report outside the repository using the exact returned `subject_digest` and actual observations:

```json
{
  "subject_digest": "digest-returned-by-snapshot",
  "criteria": [
    {"id": "AC-1", "status": "passed", "evidence": "Actually observed command, result, and evidence location"},
    {"id": "AC-2", "status": "unverified", "evidence": "Server test not run: environment unavailable"}
  ]
}
```

This example intentionally does not pass: it cannot proceed to docs until AC-2 is verified successfully. The report can also be passed through stdin with `--results -`. Check exits with 0 when all criteria pass, 2 when a report records a failure or missing verification, and 1 when the report or preconditions are invalid. Its JSON output also exposes `all_passed` and `phase`.

```sh
python3 scripts/workflow.py --root /physical/path/to/project check add-cancellation --results /tmp/check-results.json
python3 scripts/workflow.py --root /physical/path/to/project status add-cancellation
```

After a fully successful check, update and verify affected documentation, then declare its paths:

```sh
python3 scripts/workflow.py --root /physical/path/to/project docs add-cancellation --paths README.md --summary "Cancellation example checked against observed behavior."
python3 scripts/workflow.py --root /physical/path/to/project archive add-cancellation --paths src/jobs.py tests/test_jobs.py README.md --message "Add pending-job cancellation"
```

Archive paths must match the differences since start exactly, excluding `.workflow/`. Include deletions and both old and new paths for renames. The paths above are illustrative. The specification and its archive records are added automatically; AGENTS.md, config.json, and project.md are not implicitly included.

## Files

- `config.json`: `schema_version`, an `extensions` object, and a `settings` object. User approval cannot be disabled in v1.
- `project.md`: intent, context, conventions, evidence of existing behavior, and questions. Maintained by the agent and project owner.
- `proposal.md`: problem, scope, decisions, and open questions.
- `spec.md`: the complete desired contract for the target, with unique `- AC-n: text` criteria. Semantic review must resolve material unknowns before approval.
- `tasks.md`: optional; included in the approval digest when present.
- `evidence.md`: a human-readable check report with criteria and evidence locations.
- `state.json`: ID, target, extensions, phase, approval, baseline, evidence, and documentation. Do not edit it to fabricate validation. Use `select <id> --extension <enabled-id>` to change extensions during renewed exploration; this invalidates previous approval.

The approved contract includes proposal/spec/tasks and selected extension manifests and references. Nested resources not declared in the manifest are not fully frozen: an extension must expose its governing references directly. Requirements that determine acceptance must appear in `spec.md`.

## Resuming work and local failures

- Changed contract: validate, user review, approve, then start. The source baseline from the first start is preserved.
- Code changed after check: run check again. Docs accepts only declared documentation changes.
- HEAD moved or a preexisting dirty file becomes part of the change: automatic archive refuses. Explicitly separate or reconcile the work, or create a new change on a clean baseline and transfer the specification after review. There is no silent bypass command.
- A hook rejects the commit: workflow metadata is restored and transaction paths are unstaged if HEAD has not moved. Source edits made by a hook are preserved and must be reviewed.
- A killed process may leave `.workflow/.lock`. Verify that the process is no longer active before removing the lock. Do not automatically remove it based only on age.
- Individual file writes are atomic. A system failure across multiple Git/file operations is not a database transaction. Inspect Git state and the archive before resuming after such a failure.

Normal `stip-bootstrap` uses `setup_stip.py` to prepare metadata and the complete domain catalog. The low-level `workflow.py bootstrap` remains metadata-only for advanced selective setup and fixtures. Existing configured domain packages are preserved by setup.
