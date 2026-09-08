# Contributing

The core owns the lifecycle; domain practices remain extensions. Changes must preserve user intent, scoped commits, and the distinction between reported evidence and actual observations.

The canonical engine is `scripts/workflow.py`. Copies inside each skill support independent installation; do not edit them directly. The bootstrap helpers are canonical in `scripts/setup_stip.py` and `scripts/install_extensions.py`; the domain catalog is canonical in `extensions/`. Do not edit generated resources in `skills/stip-bootstrap/assets/extensions/`. After changing the engine, helpers, or catalog:

```sh
python3 scripts/build_skills.py
python3 scripts/validate_skills.py
python3 scripts/validate_extensions.py
python3 -m unittest discover -s tests -v
```

Test relevant behavior, failure paths, and preservation of existing work. Skill descriptions should select a specific task. Avoid testing exact wording unless a format requirement makes it necessary. The seven `stip-*` skills are the public interface; changes to that set must document compatibility and migration.

Keep repository documentation, skill instructions, extension references, and human-readable JSON descriptions in English. Use **Stip** for the product, `stip-*` for public skills, and `.workflow/` for project state. Preserve internal compatibility identifiers and the technical term "specification" where appropriate. Match documentation examples to actual CLI arguments and distinguish verified behavior from planned work.

Do not add a domain to the core. Provide isolated fixtures without private data or real services. Schema changes must explain compatibility and migration. Preserve licenses for reused resources.
