# Add a security-bughunting domain extension

## Goal

Add a defensive, authorized-scope domain extension that gives a Stip change a hands-on "hunt for exploitable weaknesses in my own build" pass across the four lifecycle phases, as the 29th catalog package, with proper attribution.

## Scope

- New canonical package `extensions/security-bughunting/`.
- Catalog registration and the validator count.
- Regenerated bundles under `skills/stip-bootstrap/assets/extensions/` and any other sync targets `build_skills.py` owns.
- Attribution in the package sources, `docs/credits.md`, and `NOTICE`.

Out of scope: offensive tooling, exploit payloads, attack procedures, third-party targeting; changes to the engine lifecycle; model pinning in the package.

## Acceptance criteria

- AC-1: `extensions/security-bughunting/` contains `extension.json` with `schema_version` 1, `id` "security-bughunting", a non-empty one-line `description`, and `explore`, `apply`, `check`, `docs` naming the four phase files, plus `explore.md`, `apply.md`, `check.md`, `docs.md`, `sources.md`, and `evaluation.json`; no `SKILL.md` anywhere under it.
- AC-2: Each of the four phase references is non-empty, at most 1200 words, contains no criterion id matching `AC-[A-Z0-9]+-\d+`, and every relative link it contains is in-package, non-absolute, without `..`, and resolves to a file that exists.
- AC-3: The content is strictly defensive: it describes vulnerability classes and observable properties, contains no runnable exploit payload or step-by-step attack procedure, and states in explore.md that it is for the user's own builds and authorized scope. explore.md gives a relevant and an out-of-scope selection example; apply.md ties controls to repeatable negative tests; check.md lists observable properties to adapt and keeps the "reported evidence vs. actual observation" distinction; docs.md covers documenting residual risk.
- AC-4: `evaluation.json` has `schema_version` 1, `extension` "security-bughunting", and exactly the four cases with ids {relevant, irrelevant, existing, insufficient} whose `expected` values are exactly {select, do-not-select, inspect-and-reuse, failed-or-unverified}, each with a non-empty `prompt` and `reason`.
- AC-5: `sources.md` contains at least one `https://` link and credits Claude-BugHunter (Sachin Sharma, MIT code and CC BY 4.0 content) as a source of inspiration, noting that no skills from it are copied or redistributed; cited standards (for example OWASP ASVS, OWASP Top 10, CWE) carry a consulted date.
- AC-6: `extensions/catalog.json` lists the new package with its id, description, and `path` "security-bughunting", keeping the other entries unchanged.
- AC-7: `NOTICE.md` gains a reference to Claude-BugHunter (Sachin Sharma; MIT code, CC BY 4.0 content) stating it is a source of inspiration and that no skills from it are bundled; existing notice content is unchanged.
- AC-8: `python3 scripts/validate_extensions.py` passes with the catalog containing 29 packages (its count guard reads 29), and `python3 scripts/build_skills.py --check` reports the bundles in sync after regeneration.
- AC-9: `python3 -m unittest discover -s tests` passes, and `python3 scripts/validate_skills.py` passes.
- AC-10: Every place that states the catalog count (`docs/extensions.md`, `README.md` badge and body, `docs/getting-started.md`) reads 29, not 28; `docs.md` notes that the project's security role can be pointed at the most capable model without the package pinning one.
