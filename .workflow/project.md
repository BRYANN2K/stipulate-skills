# Stipulate Skills — project map

Repository: `BRYANN2K/stipulate-skills`. Product: **Stipulate Skills**. Short name: **Stip**. Public commands: `stip-*`. Signature: **From intent to evidence.**

## Intent

Replace the historical catalog with seven independently installable skills that guide an idea through an approved contract, verified implementation, documentation, and a Git archive. Natural-language dialogue remains the way to explore and revise decisions. Domain extensions contribute during `stip-explore`.

## Map and evidence

| Area | Status | Evidence / decision |
|---|---|---|
| Core lifecycle | established | `scripts/workflow.py`; seven `stip-*` packages under `skills/` |
| Local skill installation | established | `scripts/install.py`; `tests/test_install.py` |
| Contracts and usage | established | `README.md`; `docs/workflow.md`; `.workflow/specs/core.md` |
| Domain extensions | established structurally; behavioral evaluation incomplete | 28 packages in `extensions/`, bundled in `stip-bootstrap`; complete setup and selective installer; `tests/test_extensions.py`; no extensions enabled in this repository's config |
| Graphical interface / design system | not-applicable | This repository provides instructions and a local CLI |
| Cloud deployment | not-applicable | Local execution without a service or API |
| Automated verification | established locally | Package validators and 49 passing tests during the Stip rename on macOS; language edits require their own relevant checks |
| Cross-environment CI | configured; remote execution unverified | `.github/workflows/validate.yml` |
| Behavioral evaluation on real projects | incomplete | CLI tests do not establish the quality of model decisions; real-project evaluation remains necessary |

## Conventions

Python standard library, version 3.10+, without third-party runtime dependencies. The canonical engine is `scripts/workflow.py`; regenerate portable copies with `scripts/build_skills.py` instead of editing them separately. Preserve explicit approval before `stip-apply`, actual evidence before check, and unrelated Git changes during archive. Repository documentation and instructions are written in English.

## Commands

- `python3 scripts/build_skills.py --check`
- `python3 scripts/validate_skills.py`
- `python3 scripts/validate_extensions.py`
- `python3 -m unittest discover -s tests -v`
- `python3 scripts/install.py --destination <skills-directory> --dry-run`
- `python3 scripts/install_extensions.py --project <physical-project-root> --extension <extension-id> --dry-run`

## History

The former catalog is preserved in Git history, a migration tag, and backups outside skill discovery paths. The seven public skills were renamed from `spec-*` to `stip-*`. Internal workflow markers and ownership identifiers remain compatible. Local delivery does not publish or push the repository.
