# Evidence

Subject: `2d41fbf75796ac01f785fa52b7da657a01ab975d43531d557b284d474cc16bbc`

- AC-1: passed — workflow.py runtime show|reserve|confirm|settle|review|integrate|cancel|revoke-approval|rebase with JSON/stderr/exit codes and --help; tests/test_runtime.py (29) in 131-test suite OK; verifier attempts 1-11 engine_adv.py 52/52.
- AC-2: passed — reserve gates (approval, plan, phase, deps, active attempt, max_workers across changes+helpers, writer limits) tested in test_runtime.py and engine_adv*.py; re-approval dead-end fixed by runtime rebase (rebase_adv.py, rebase_adv2.py, crit_flow.py 7/7).
- AC-3: passed — isolated worktrees from working-tree snapshot, max_shared_writers concurrency: live parallel writers in verify attempts 2-11 and AC-24 run (scratchpad/ac24/LOG.md); test_runtime.py.
- AC-4: passed — integrate all-or-nothing with conflict report; out-of-ownership refused; build artefacts skipped and reported (artefact_adv.py 7/7); rollback.py; live integrations written/skipped.
- AC-5: passed — OpenCode registry compatibility test passes; OpenCode node --test 94/94 and tsc OK; check/docs/archive gates refuse unaccepted or unintegrated work (test_runtime.py).
- AC-6: passed — 7 stip_* tools prompt-listed, refused from subagents (claude plugin test 268/268; live tool calls in Nimbus and AC-24 sessions).
- AC-7: passed — stipulate:<role> agent types from clients.claude-code with scope/phase/role resolution; live models recorded per job (Nimbus registry: Opus apply, Fable verify, Haiku docs, Sonnet research); settings.test.ts.
- AC-8: passed — ticket launch via Agent tool with agent.spawn rewrite and engine confirm of real agent id; uncertain launches -> unknown, no re-spawn (tests + live verify attempts 4-11; wrong subagent_type refused live).
- AC-9: passed — observed states running/waiting/returned/failed/cancelled, last tool, elapsed, captured answer via stip_result (live registries; tests).
- AC-10: passed — corrections as new attempts in new agents; independent verification separate session (live verify attempts 7-11 interrupt/correction runs).
- AC-11: passed — Edit/Write/NotebookEdit ownership guard, stip_*/Agent/engine/git denial, STIP_WORKER marker, integrity watch restores+cancels+flags tampering incl. delayed scripts (live verify attempts 4-11, live9 R5); deliberate circumvention residuals documented per D7/D10.
- AC-12: passed — cancelled/interrupted workers denied live ('cancellation guard' refusals in verify attempts 3-11).
- AC-13: passed — apply gate block/warn/off: live refusal 'stipulate: apply gate guard' in AC-24 run (scratchpad/ac24/LOG.md) and Nimbus; tests.
- AC-14: passed — approval only via band Approve or /stip-approve with digest; model approve refused (AC-24 run: model declined; guard refusals live in verify runs) or revoked within ~0.1 s; in-session store forgery discarded; residuals per D10. Band Approve pressed live in AC-24 run and Nimbus by Claude acting on the person's explicit delegation; engine recorded by=user.
- AC-15: passed — all gating hooks registered with .catch fail-closed (claude plugin validate report); re-entry fallback tested.
- AC-16: passed — band on terminal (live AC-24 run: awaiting approval with Approve, approved, Docs 3/4 with running count, gone after archive) and desktop (person's screenshot scratchpad/launch/gui/04-desktop-pane-band.png); person inspected and requested redesigns, applied in mod-ui attempts 8-13.
- AC-17: passed — /stip pane with stages, criteria, plan tasks/deps, workers actions, helpers, change picker: live terminal captures (scratchpad/launch/cloud-trial/shots, tui-narrow-pane.txt) and desktop screenshot inspected by the person; ui tests 268/268.
- AC-18: passed — status line and toasts live (returned, revoked, tampered, rebase) with <=60-char coalesced rules (display.test.ts; live sessions).
- AC-19: passed — prompt.compose section with bound change/phase/approval; live: the model cited the injected rule when refusing to approve (AC-24 run).
- AC-20: passed — /stip-settings who-runs-what table/cards, all built-in roles, Add role, Orchestrator row, validation and revision-checked save (person used it live in Nimbus; tests).
- AC-21: passed — event-driven refresh with >=10 s idle timer, no engine process per draw (tests; verifier code inspection).
- AC-22: passed — .claude-plugin/marketplace.json validates --strict; launcher hint; build_skills.py syncs bundled engine and --check detects drift (distribution attempts 1-9). Real GitHub /plugin install not executed (needs push).
- AC-23: passed — claude plugin test packages/claude-code 268/268; python3 -m unittest 131 OK incl. runtime conflict/failure paths.
- AC-24: passed — Live run in scratchpad/verify10/sandbox-human (scratchpad/ac24/LOG.md): explore-validated change, button approval, two isolated parallel writers, integration, independent verification, check, docs, archive commit 95ae40d. Approval pressed by Claude on the person's explicit delegation (not by the person's own hand); visual inspection of band/pane done by the person in Nimbus terminal and desktop sessions. Verifier classification: PASSED (delegated).
- AC-25: passed — docs/claude-code-plugin.md (install, use, settings, lifecycle, runtime commands, enforcement limits D7/D10, verified-on builds 2.1.293/2.1.294, re-qualification steps), README Claude Code mod section, docs/orchestration.md tools/runtime/rebase/pending-docs; docs task accepted after a correction removing an unverified desktop user-scope claim; skill copies regenerated; build --check, validate_skills, 137 unittest OK.
- AC-26: passed — tests/test_docs_gate.py (6) in 137-test suite; verifier attempt 12 docs_gate_adv.py + archive_gate.py 20/20 with the real engine.
