# Documentation systems and broad audits

Load this reference for a documentation-estate audit or structural redesign. Do not build an inventory for a bounded page edit unless it helps answer the request.

## Optional inventory

Record only fields that support the audit: page/path, audience/job, product or version, source of truth, generated/manual ownership, inbound navigation, last meaningful review, and validation state. Add named owner or page type when the repository already uses those concepts.

## Journey and code coverage

Check the reader journeys that matter to the product, such as discovery, first success, core tasks, exact lookup, operation/troubleshooting, migration, and contribution. A large page count can still omit one critical journey.

For technical coverage, map relevant public code surfaces—packages, modules, APIs, CLI commands, schemas, configuration, or examples—to the docs that claim to cover them. Use a table or durable artifact only when the audit is broad enough to benefit; otherwise keep working notes.

This docs-to-code coverage idea was informed by the documentation organization in [openai/openai-agents-python at `89c02c8`](https://github.com/openai/openai-agents-python/tree/89c02c828ee8510fe9a84ee6675608193aa13b02) (MIT). The audit method and wording here are independently written.

## Prioritizing findings

Prioritize by reader and operational consequence rather than filling a fixed severity quota:

- unsafe, secret-bearing, or materially incorrect instructions first;
- blockers to adoption, operation, migration, or correct API use next;
- stale, missing, inconsistent, or hard-to-find material after that;
- editorial polish when it improves an actual reading or accessibility problem.

## Docs-as-code controls

Select only controls that govern the affected documentation: link/anchor checks, Markdown/style lint, terminology, example execution, schema drift, generated CLI/API reference, Mermaid rendering, docs build, accessibility, preview, ownership, or stale-content triggers.

Prefer generated reference for mechanical contracts and authored guidance for intent and trade-offs. Keep generated output distinct from its hand-authored source.
