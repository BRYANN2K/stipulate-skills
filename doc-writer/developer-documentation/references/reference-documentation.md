# Reference documentation

Reference should mirror the product's current public contract and optimize exact lookup. Cover the changed or in-scope surface; do not manufacture exhaustive coverage for an unrelated bounded edit.

## API and protocol reference

For an operation, include the fields needed to use it correctly: identity and purpose, stability/version, authorization, inputs and constraints, request/response or message schemas, errors, and relevant behavior such as idempotency, pagination, filtering, rate limits, events, or deprecation. Omit inapplicable sections rather than filling placeholders.

Prefer generated structural reference from OpenAPI, AsyncAPI, protobuf, types, or another repository source, then add human guidance for intent and tasks. Check affected examples against the current contract and relevant tests.

## Generated-reference ownership seam

Before changing generated reference, identify five things in working notes or repository-native metadata:

1. the authoritative input, such as a schema, type, or generated help;
2. the existing generator and invocation;
3. the generated file or explicitly marked region;
4. the human-authored region that regeneration must preserve; and
5. the source and generator revision represented by the output, when the repository exposes one.

Change the authoritative input and regenerate only when the source is documentation-bearing and already within the requested authority. A docs request does not authorize changes to code behavior, schema semantics, CLI behavior, or another public machine contract: hand off that source change or request explicit scope expansion, then regenerate after the owner supplies the authorized revision. Review the boundary in the diff so regeneration neither overwrites the human seam nor leaves hand-edited output that the next run will discard. A revision can be an API/schema version, commit or digest, or generator version; do not invent one when the system does not expose it.

If conditions produce different product or version pages, enumerate the variants touched by the condition and inspect those rendered outputs. One default render does not cover the others. Use Sphinx, mdBook, or another generator only when it already governs the affected output or the user requests it; this seam does not mandate a documentation stack.

## CLI reference

Derive changed commands, flags, defaults, aliases, exit behavior, environment/config precedence, output formats, and examples from real help or source. State destructive behavior and interactivity where applicable. Do not infer a familiar flag from another CLI.

## Configuration reference

For each in-scope field, document the properties necessary for correct use: key/path, type, requiredness/default, accepted values or units, secret handling, reload/restart behavior, override precedence, version/deprecation, and example. Not every field needs every property; the source contract decides.

## Error reference

Use a stable identifier or observable condition, user impact, safe diagnostic evidence, remediation, retry behavior, and escalation data when available. Never expose secrets or advise blind retries for a permanent failure.

## Proportional checks

Confirm names, types, defaults, links, version markers, and examples affected by the change. Use broad public-surface coverage or generated/narrative drift checks for broad reference work, not as a prerequisite for a small correction.

## Compact evals

- **Positive:** An already-authorized documentation annotation in a schema is changed without altering its machine semantics; the existing generator updates only its marked block, adjacent guidance survives, the source/generator revision is reported, and every affected product version is rendered.
- **Negative:** A generated table is patched by hand, one default preview passes, and all product versions are declared current without identifying the generator or human-authored seam.

## Source note

The ownership seam and rendered-variant checks are independently worded from GitHub Docs' generated-region implementation in [`src/article-api/scripts/generate-api-docs.ts` at `5e0cd608`](https://github.com/github/docs/blob/5e0cd6082684634c7cb7852b99db179eb34313c3/src/article-api/scripts/generate-api-docs.ts) (code, MIT) and its review guidance in [`content/contributing/writing-for-github-docs/versioning-documentation.md` at `5e0cd608`](https://github.com/github/docs/blob/5e0cd6082684634c7cb7852b99db179eb34313c3/content/contributing/writing-for-github-docs/versioning-documentation.md) (content, CC-BY-4.0). No GitHub-specific generator or versioning syntax is required here.
