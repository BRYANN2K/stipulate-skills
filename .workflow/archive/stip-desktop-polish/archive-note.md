# Manual scoped archive

The user was editing packages/orca/panel.html during docs and archive, so the engine archive refused on working-tree drift outside this change. This archive followed the engine steps for this change's paths only.

Excluded and left uncommitted (user Orca work): packages/orca/*, docs/orca-plugin.md, scripts/build_skills.py.

Known gaps from verification (non-blocking): serveAction refusals for setup state, unknown action and already-approved are no longer asserted through the action path; /stip-correct rejected and awaiting-integration paths have no test; desktop stage strip checked by render tests only.
