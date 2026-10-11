# Evidence

Subject: `86938477b55d3b5056096926fac1e41d38e7debe555c0da92f654c581f1bac4f`

- AC-1: passed — extensions/security-bughunting/ has extension.json (schema_version 1, id security-bughunting, 4 phase files named) plus explore/apply/check/docs.md, sources.md, evaluation.json; no SKILL.md (ls + validate_extensions structural pass).
- AC-2: passed — Phase files 575/342/376/222 words (<=1200); grep found no AC-[A-Z0-9]+-digits; links are to in-package check.md and sources.md which exist; validate_extensions link check passed.
- AC-3: passed — explore.md states authorized/own-builds scope and gives relevant + out-of-scope examples; apply.md ties controls to repeatable negative tests; check.md lists observable properties and keeps reported-vs-observed; docs.md covers residual risk; no payloads or attack steps present (authored at vulnerability-class level).
- AC-4: passed — evaluation.json: schema_version 1, extension security-bughunting, four cases {relevant,irrelevant,existing,insufficient} with expected {select,do-not-select,inspect-and-reuse,failed-or-unverified}, each with prompt and reason; validate_extensions case-shape assertions passed.
- AC-5: passed — sources.md has https links (OWASP ASVS, OWASP Top 10, CWE, OWASP Cheat Sheets) with 2026-10-11 consulted dates and credits Claude-BugHunter (Sachin Sharma, MIT code, CC BY 4.0 content), stating no skills copied; validate_extensions requires https and passed.
- AC-6: passed — extensions/catalog.json lists security-bughunting (id, description, path) inserted before security-engineering; now 29 entries; other entries unchanged.
- AC-7: passed — NOTICE.md gains a Claude-BugHunter attribution block (MIT code, CC BY 4.0 content, inspiration, no skills bundled); prior notice content unchanged.
- AC-8: passed — validate_extensions.py passes with count guard 29 (editorial_cases 116); build_skills.py --check reports bundles in sync after regeneration.
- AC-9: passed — python3 -m unittest discover -s tests: OK (full suite, /private/tmp/full-suite.txt); validate_skills.py: PASS. Count guards bumped to 29 in tests/test_extensions.py and tests/test_package.py.
- AC-10: passed — docs/extensions.md, README.md (badge + body), docs/getting-started.md read 29 not 28; docs.md notes the security role can use the most capable model without the package pinning one.
