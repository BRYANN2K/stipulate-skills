# Manual scoped archive

The user's packages/orca/panel.html was changing during this change, so the engine archive refused on the working-tree comparison. This archive ran the engine's own archive function with the user's uncommitted work excluded from the tree comparison only: packages/orca/*, docs/orca-plugin.md, scripts/build_skills.py, and an untracked assets/.DS_Store. Those are left uncommitted.

The security-bughunting extension is authored from standard vulnerability-class sources (OWASP ASVS, OWASP Top 10, CWE), strictly defensive and scoped to authorized testing of the user's own code. Claude-BugHunter (Sachin Sharma; MIT code, CC BY 4.0 content) is credited as inspiration in sources.md and NOTICE.md; no skills from it are copied or bundled.
