# Stip Ledger interface and live-run fixes

## Problem

The Claude Code mod (spec `claude-code-mod`) works, but its pane and band are dense and text-only, and the live Nimbus runs (2026-10-08, logs in the session scratchpad: cloud-trial/LOG.md, final/LOG.md, ac24/LOG.md) surfaced defects that the archived change left open. The person reviewed and validated a visual direction, "Stip Ledger" (working name), as an HTML preview: `ledger-preview.html` in this folder (also published privately as an artifact). The design must be original: inspired by community mods, not copied (no side-by-side agent cards, swimlane time axis, animated connectors or "receipt" panels).

## Findings (classified)

- **established**: pane at ~80 columns wraps the header (`applyi/ng`) and breaks the helper row (`◆Sonnet ○ low·` / `5.5`) (final/LOG.md).
- **established**: Claude Code shows effort as `● high` and `◐ medium`; the mod uses `◑` for high.
- **established**: a correction reuses its first attempt's isolated worktree, so files outside the task's ownership are stale (docs worker saw the pre-fix `signing.py`).
- **established**: a stale integrity journal or registry for a reused change id (left by earlier sessions at the same project path) overrides a lifecycle newly created by the current session: "Lifecycle restored ×33".
- **established**: a band press after a re-render logs `ui.press hook skipped: … no handler is held under handle N`.
- **established**: the integrated content of a retired task stays in the main checkout without being reported.
- **established**: worker calls made inside the integrity watch's detection window run before the tamper cancel lands (documented residual; keep documented).
- **inferred**: the desktop app loads a user-scope install (only project scope observed).

## Scope

1. Ledger UI, terminal and desktop, matching the preview:
   - header: change picker, Plan/Settings tabs;
   - stage chips (done green, current filled, rest dim);
   - "Who runs what" box: one row per task or group of tasks sharing model/effort/state, model + Claude-style effort mark + activity, one-glyph action buttons (✕ cancel, ▤ result, › details) only where allowed;
   - task graph: box-drawing text in the terminal, SVG on desktop; color carries state (integrated, running, correction);
   - criteria strip: one mark per criterion (passed, failed, pending-docs), open item named underneath;
   - band: `◆ Stip <change> <Stage> ▸ n/m <approval>` + `[p Plan ▾] [s Settings] [–]`, Approve as the only primary action when approvable.
   Existing behaviors stay reachable (approve, rebase, resync, delegate/launch, accept/correct/cancel, settings table).
2. Fixes: effort glyphs aligned with Claude Code; narrow/medium widths never wrap mid-word or break rows; corrections refresh non-owned files from the main checkout; journals/registries from another session for a reused change id never override a lifecycle this session created (ignore or archive stale known-good with a notice); stale `ui.press` handles are ignored silently; retired tasks' integrated paths are reported.

Out of scope: animation beyond the existing running indicator; new engine lifecycle semantics; Orca plugin.

## Decisions and open questions

- D1 Visual direction = the validated preview (person, 2026-10-08). Name "Stip Ledger" is a working name.
- D2 Revision 2 (person, 2026-10-08): the validated `ledger-states.html` preview adds every pane state with integrated motion, `+ New`, `/stip` before bootstrap, plain section titles and a glyph criteria ruler. Earlier accepted tasks keep their work; new tasks build on them.
- Q1 Final name: keep "Stip Ledger" or choose another? (does not block implementation; UI shows "◆ Stip" only)
