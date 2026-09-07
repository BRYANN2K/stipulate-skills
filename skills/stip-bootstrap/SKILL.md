---
name: stip-bootstrap
description: Adopt Stip in a new or existing repository, preserving project conventions and assessing applicable domains.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-bootstrap

Prepare the project once; do not run a full audit before every feature.

1. Inspect the repository instructions and enough evidence to identify project intent, current structure and delivery context. For a new repository, clarify the minimum intent before inventing foundations. For an existing one, preserve conventions and distinguish observed behavior from intended behavior.
2. Run `bootstrap`. It creates only missing workflow files and appends one bounded block to AGENTS.md. It does not initialize Git, choose a stack, certify project maturity or install extensions.
3. Populate `.workflow/project.md` with intent, map, actual commands and relevant evidence. Classify each relevant area as established, inferred, incomplete, missing or not-applicable. Inspect source as well as docs. An interface may have an undocumented component system; cloud-only work needs no design assessment.
4. Review existing AGENTS.md rather than replacing it. Resolve contradictions explicitly. Set available extension paths in config only when the extension exists and its selection is justified. The repository ships 28 optional domain packages separately; bootstrap and the core skill installer do not install them. See the repository's docs/extensions.md when setting up extensions.
5. Report what was created, preserved, inferred and still unknown. Subsequent feature work starts at stip-explore; rerunning bootstrap preserves current changes and project notes.

Do not create an empty example feature. The first real stip-explore creates its own folder. Do not claim a project is production-ready merely because bootstrap succeeded.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
