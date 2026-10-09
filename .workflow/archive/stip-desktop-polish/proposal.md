# Desktop polish for the Stip mod

## Problem

The Ledger works in Claude.app (observed 2026-10-09, project `nimbus`), with three rough edges seen in the desktop and terminal captures:

- **established**: the desktop command menu lists `stip-action` (a JSON command for the interface). The desktop ignores `command.describe` `isHidden`, and the mod API has no way to unregister or hide a command at registration.
- **established**: in the desktop pane the current stage is drawn as a filled, bordered chip, which reads as a selected button rather than a position.
- **established**: the status line is cut mid-word at 40 columns (`greet-and-add · applyi…`, verify-ledger/a2/w-40.txt). `fitStatus` exists, but the status is fitted only when the snapshot changes or the session starts, using the last band width; a resize does not refit it.
- **established** (2026-10-09): `/stip` works on the first message of a desktop conversation when the project has the plugin installed; the earlier "first message" limitation came from a project without the plugin. Docs already corrected (commit ba1b353).

## Scope

1. Stop registering `stip-action`. The band and pane already act through mod state. The one thing only `stip-action` offered, a correction with the person's own reason, moves to a readable command: `/stip-correct <task-id> <reason>`.
2. Desktop stage strip: plain text, no chips. Done stages green with ✓, the current stage bold in the accent color with a `●` mark, later stages dim. Terminal look unchanged.
3. Refit the status line whenever the band sees a new terminal width.

Out of scope: the scenario re-run and the launch video; Orca plugin; engine changes.

## Decisions and open questions

- D1: replace `stip-action` with `/stip-correct` (readable, listed) rather than keep a JSON command visible on desktop. Tests that drove actions through `stip-action` move to the mod-state request path.
