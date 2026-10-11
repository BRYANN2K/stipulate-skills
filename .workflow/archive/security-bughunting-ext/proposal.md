# Add a security-bughunting domain extension

## Problem

Stip ships a `security-engineering` extension focused on threat modeling and security controls for a change. It has no extension focused on the complementary activity: actively hunting for exploitable weaknesses in the code the team is building, before it ships. Teams who want a "find the bugs in my own build" pass during a Stip change have to improvise it.

## Scope

Add a 29th catalog domain extension, `security-bughunting`, that plugs into the four Stip phases:

- explore.md: decide relevance (the change introduces or touches untrusted input, authentication, authorization, secrets, parsing, serialization, file or network I/O, or templating), map the attack surface of the change under development, and pick the vulnerability classes that apply.
- apply.md: implement with the controls that neutralize those classes and write repeatable negative tests that fail on the vulnerable version.
- check.md: candidate observable properties to adapt as acceptance criteria (injection neutralized with a repeatable negative test, no secrets in output or logs, authorization refused as expected, unsafe deserialization absent, dependencies patched), with evidence requirements.
- docs.md: how to document the review and its residual risk.

Wiring: `extensions/security-bughunting/` (manifest, four phase references, `sources.md`, `evaluation.json`); an entry in `extensions/catalog.json`; the `validate_extensions.py` count guard raised from 28 to 29; regenerate bundles with `build_skills.py`. Attribution in `sources.md`, `docs/credits.md` and `NOTICE`.

Out of scope: offensive tooling, exploit payloads, step-by-step attack procedures, or targeting third-party systems. The extension is for authorized testing of code and systems the user owns or is permitted to test.

## Decisions and open questions

- D1 (framing). The extension stays strictly defensive: it names vulnerability classes and observable properties, never exploit payloads or attack recipes. Its text states it is for the user's own builds and authorized scope. This keeps it aligned with the core's "reported evidence vs. actual observations" rule and with responsible use.
- D2 (relationship to security-engineering). security-engineering owns threat modeling and controls; security-bughunting owns the hands-on hunt for exploitable weaknesses in the change. A change may select both; neither implies the other.
- D3 (attribution, CC BY 4.0). The content is authored from standard vulnerability-class knowledge (OWASP ASVS, OWASP Top 10, CWE), with Claude-BugHunter (MIT code, CC BY 4.0 content, by Sachin Sharma) credited as a source of inspiration in `sources.md` and `docs/credits.md`, and a line added to `NOTICE`. We do not copy or redistribute its skills.
- D4 (model). The extension is model-agnostic. The project's security role can be pointed at the most capable model in `.workflow/config.json` or the Settings tab; `docs.md` notes this recommendation without pinning a model in the package.
