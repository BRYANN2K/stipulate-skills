# Manual scoped archive

The user was editing Orca files (packages/orca/panel.html) during check, docs and archive, so the engine archive kept refusing on working-tree drift outside this change. This archive followed the engine steps (promote the spec, write the execution summary, move the change, commit) for this change's paths only.

Excluded and left uncommitted (user Orca work, pre-existing before apply): packages/orca/*, docs/orca-plugin.md, scripts/build_skills.py.
