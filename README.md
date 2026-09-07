# Stipulate Skills

[![X — @bryann2k_dev](https://img.shields.io/badge/%40bryann2k__dev-000000?style=flat&logo=x&logoColor=white)](https://x.com/bryann2k_dev)

**From intent to evidence.**

The spec-driven workflow for AI-assisted development. Explore in natural language, agree on a specification, and build against verifiable outcomes.

**Seven core skills. Optional domain extensions. One shared contract.**

Stipulate Skills uses **Stip** as its short name and `stip-*` for its commands.

Stip provides seven skills for adopting an existing project or developing an idea through a durable contract, user review, and evidence tied to the delivered result. The core targets GPT-6 Astra in Codex and uses the Agent Skills format. Its runtime is local and offline: no paid API calls, telemetry, third-party Python dependencies, or publication actions.

## Installation

Python 3.10+ and Git are required. From this repository:

```sh
python3 scripts/validate_skills.py
python3 scripts/validate_extensions.py
python3 -m unittest discover -s tests -v
python3 scripts/install.py --destination "$HOME/.agents/skills" --dry-run
python3 scripts/install.py --destination "$HOME/.agents/skills"
```

For a project-scoped installation, use that project's `.agents/skills` directory as the destination. The installer preserves unrelated skills and rejects collisions or modified installed copies. Each skill includes its runtime and does not depend on the source repository path. Check the client's skill catalog after installation; open a new conversation if the catalog has not refreshed.

Uninstall only the copies owned by this project:

```sh
python3 scripts/install.py --destination "$HOME/.agents/skills" --uninstall
```

## Using Stipulate Skills in Codex

| Skill | Outcome |
|---|---|
| `$stip-bootstrap` | Prepare `.workflow/`, add workflow guidance to AGENTS.md, and establish an evidence-based project map |
| `$stip-explore` | Explore an idea with relevant extensions when available |
| `$stip-validate` | Prepare the specification, present it for review, and record explicit approval |
| `$stip-apply` | Implement, verify, and correct within the approved scope |
| `$stip-check` | Reconcile acceptance criteria with current evidence |
| `$stip-docs` | Create or update affected documentation |
| `$stip-archive` | Promote the specification, archive the change, and create a scoped local commit |

Example conversation: "$stip-bootstrap, adopt this repository and preserve its conventions." Then: "$stip-explore, let's add job cancellation." After reviewing the specification: "I approve this version; $stip-apply." Corrections return to apply/check. A new requirement returns to validate. Docs and archive close the change.

Extensions contribute domain questions and acceptance criteria during **explore**. Later phases use those decisions. Bootstrap identifies applicable domains and existing foundations without starting every domain process. The catalog contains 28 optional local extensions, separate from the seven core skills. See [Extensions](docs/extensions.md) for selective installation and use. No domain is enabled by default.

## Project structure

```text
AGENTS.md
.workflow/
  project.md
  config.json
  specs/
  changes/
    add-login/
      proposal.md
      spec.md
      tasks.md       # only when useful
      evidence.md
      state.json
  archive/
```

Bootstrap creates the empty directories; it does not create a fictitious `add-login` feature. Explore creates the first real change directory. `project.md` distinguishes observations, inferences, and gaps. Accepted specifications describe current accepted behavior; each change specification describes the complete desired version of its target.

## Guarantees and limits

- Bootstrap preserves existing files and adds one bounded workflow block to AGENTS.md if absent. The agent performs the domain assessment; the script does not certify project maturity. An existing workflow block is not automatically replaced.
- Approval binds proposal, specification, optional tasks, and selected extension references. Any byte change invalidates approval, including editorial changes in this version.
- Check requires every acceptance criterion and a current snapshot of non-ignored Git working-tree files, including contents, symlinks, and executable bits. Ignored files and `.workflow/` are outside the code snapshot. External results require identifiable evidence in the report.
- Evidence consists of inspectable attestations. The script cannot establish whether a human or agent reported truthfully. Local state is neither an authenticated signature system nor a barrier against a malicious operator with write access.
- Archive rejects stale source evidence, a nonempty index, selected files already dirty at start, a changed HEAD, and concurrent changes to the target specification. It does not absorb unrelated work or push commits.
- Snapshot schema v1 does not support submodules. Use the physical repository root. CI targets Linux and macOS; local delivery checks do not establish that remote CI has passed.

Tests cover the engine, installation, and synthetic lifecycle runs for all 28 extensions. Evaluating Astra's behavior on real projects is a separate activity. Passing core tests does not certify a product as production-ready.

[Core contract and commands](docs/workflow.md) · [Extensions](docs/extensions.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

The previous collection of 33 skills remains in Git history and migration backups. Its skill directories are not retained in this version's discovery paths.

## Migration to Stip

The seven public skill names now use `stip-` instead of `spec-`. Install the new packages, then remove only unchanged legacy packages using the previous installer. Preserve customized installations for reconciliation. `.workflow/`, runtime subcommands, approval records, and archive formats are unchanged. Bootstrap preserves existing AGENTS.md workflow blocks: update their skill references explicitly when adopting Stip. Internal `spec-workflow` block markers and ownership identifiers remain stable for compatibility.
