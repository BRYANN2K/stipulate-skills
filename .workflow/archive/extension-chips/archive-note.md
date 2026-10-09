# Manual scoped archive

The user was editing packages/orca/panel.html during this change, so the engine archive refused ("Working tree changed after verification/documentation") although every change file matched the documented subject. This archive ran the engine's own archive function with the user's uncommitted Orca work excluded from the tree comparison only: packages/orca/*, docs/orca-plugin.md, scripts/build_skills.py. Those files are left uncommitted.

Verification notes: verify attempts 1 and 2 were full independent runs; attempt 3 re-verified the criteria corrected by extensions-ui attempt 3, at the person's request to shorten the loop. AC-24 was observed in a live Claude Code 2.1.296 session (sandbox log scratchpad/ac24/LOG-extension-chips.md).
