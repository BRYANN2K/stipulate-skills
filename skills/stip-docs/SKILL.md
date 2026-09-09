---
name: stip-docs
description: Create or update documentation affected by a checked change, grounded in the implementation and intended readers.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-docs

Begin after stip-check. Inspect current docs and identify affected readers: users, maintainers or operators. Update the smallest complete documentation set: usage, changed API/config behavior, examples, migration or runbook where applicable. Avoid generating empty documents or a universal docs package.

For a schema-v2 change, read [references/orchestration.md](references/orchestration.md) and delegate the planned documentation tasks to native workers. Provide the checked behavior, intended readers, relevant paths and extension references. The coordinator reviews examples and scope, integrates useful output and explicitly accepts each contribution. A configured Communication role may draft authorized release material; it does not authorize publication.

Use selected extension docs references when relevant. Verify examples and claims against actual behavior. Documentation should be usable outside this conversation and distinguish supported behavior from limitations.

After Markdown, reStructuredText or text edits, run `docs <id> --paths <changed-doc-paths> --summary <verification-and-scope>`. This accepts declared text-document changes while requiring the checked source tree to remain unchanged. For MDX, generated documentation or executable documentation code, rerun stip-check after those edits, then run docs with a summary. If no documentation changes are needed, explain that specifically in the summary.

Do not mark documentation complete if required reader needs remain unmet. Do not classify code changes as documentation to avoid verification. The next step is stip-archive.

All planned contributions must be accepted and workers quiescent before the engine records documentation completion. If no documentation change is required, a planned documentation task may return an inspected no-change conclusion with its reason; do not invent files to satisfy the plan.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
