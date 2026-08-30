# Terraform/OpenTofu module engineering

## Module contract

A reusable module should expose the smallest stable interface that expresses intent:

- typed inputs with descriptions and validation;
- safe defaults only where a universal default exists;
- outputs needed by consumers, not provider object dumps;
- explicit provider and tool version constraints;
- no embedded credentials, account IDs, regions, or environment names;
- examples that are executable and pinned to intentional versions.

## Structure

Keep a root module focused on composition. Put reusable resources in child modules. Avoid wrapper modules that add no policy, abstraction, or lifecycle value.

## Security and state

Assume values may enter plan/state even when marked sensitive. Pass references to external secret systems when providers support it. Use workload identity/OIDC rather than long-lived cloud keys in CI.

## Proportional validation

Choose only the evidence needed by the module claim:

- formatting and `validate` for source/configuration structure;
- configured lint/security/policy checks for their actual rules;
- native tests for expressions, conditions, and plan assertions affected by the change;
- consumer/example validation for public interface compatibility;
- integration tests when provider behavior cannot be established statically;
- destructive tests only when explicitly authorized in an isolated ephemeral account/project with cleanup and readback.

No fixed ladder is required for a focused module question. A passing structural check is not provider-behavior proof.

## Safe evolution

Use additive interfaces, deprecation periods, `moved` blocks, and upgrade notes. A module major-version bump does not by itself make a destructive migration safe.
