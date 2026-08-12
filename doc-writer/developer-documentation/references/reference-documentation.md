# Reference documentation

Reference mirrors the product's contract and optimizes lookup, not narrative learning.

## API reference

For every operation document:

- method/path or protocol/topic;
- purpose and stability/version;
- authentication/authorization/scopes;
- path/query/header/cookie parameters with type, constraints, default, requiredness;
- request media type/schema/example;
- response codes, headers, schema, and examples;
- error model and retry/idempotency behavior;
- pagination/filtering/sorting;
- rate limits and relevant webhooks/events;
- deprecation/sunset and migration link.

Prefer generated structural reference from OpenAPI/AsyncAPI/protobuf/types, then add hand-written concepts and task guides. Validate examples against the contract and implementation tests.

## CLI reference

Derive commands, flags, defaults, aliases, exit codes, environment variables, config precedence, output formats, and examples from real help/source. State destructive behavior and interactivity. Do not invent a flag because another CLI uses it.

## Configuration reference

For each field: key/path, type, required/default, valid range/enum, units, secret status, reload/restart behavior, environment override, version introduced/deprecated, and example. Document precedence deterministically.

## Error reference

Use stable error identifier, condition, user impact, diagnostic evidence, safe remediation, retryability, and escalation data. Never expose internal secrets or advise blind retries for permanent failures.

## Quality checks

- every public surface is covered or intentionally excluded;
- names/types/defaults match source;
- examples parse and run;
- links resolve;
- generated and narrative docs do not contradict;
- version/deprecation markers are consistent.
