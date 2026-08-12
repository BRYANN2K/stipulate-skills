# Documentation system and audit

## Inventory

Collect page/path, title, type, audience, product/version, owner, source of truth, generated/manual, inbound navigation, last meaningful review, and validation status.

## Journey coverage

Map:

- discover/evaluate;
- install and first success;
- learn concepts;
- accomplish core and advanced tasks;
- look up APIs/config/errors;
- operate and troubleshoot;
- upgrade/migrate/deprecate;
- contribute and extend.

A large page count can still leave a critical journey undocumented.

## Finding severity

- **Critical:** unsafe instruction, secret exposure, destructive omission, or fundamentally incorrect contract.
- **High:** prevents first success, production operation, migration, or correct API use.
- **Medium:** incomplete, stale, difficult to find, or inconsistent.
- **Low:** editorial/accessibility polish with limited task impact.

## Docs-as-code controls

Select only useful controls: Markdown/style lint, link/anchor check, spelling/terminology, code sample execution, API schema drift, CLI help generation, Mermaid rendering, docs build, accessibility, preview, ownership, and stale-content review triggers.

Prefer generated reference for mechanical contracts and authored guidance for intent/trade-offs. Keep generated output separate from hand-authored source.
