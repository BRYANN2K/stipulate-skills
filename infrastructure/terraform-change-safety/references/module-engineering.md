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

## Testing ladder

1. formatting and validate;
2. lint/security/policy checks;
3. native tests for expressions, conditions, and plan assertions;
4. integration tests for provider behavior;
5. examples validated as consumers;
6. destructive tests only in isolated ephemeral accounts/projects.

## Safe evolution

Use additive interfaces, deprecation periods, `moved` blocks, and upgrade notes. A module major-version bump does not by itself make a destructive migration safe.
