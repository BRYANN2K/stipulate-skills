# Static GitOps repository audit

## Inventory

Map environments, clusters/tenants, bases/components, overlays, charts/releases, sources, dependencies, namespaces, CRDs, policies, secrets, and automation.

## Checks

### Structure

- environment and tenant boundaries are unambiguous;
- reusable bases do not embed environment-specific identities;
- dependency/order is explicit where required;
- generated files have an identifiable source and are not hand-edited.

### Supply and authenticity

- Git/OCI/chart sources use intentional immutable refs or controlled update policy;
- authentication uses deploy/workload identity or scoped credentials;
- source verification/signature policy exists where risk demands it;
- external URLs and registries are allowlisted or owned.

### Secrets

- no plaintext credentials or private keys;
- encrypted/external secret workflow is documented;
- decryption identity is least privilege and environment scoped;
- rotation and failure visibility are defined.

### Safety

- prune and deletion behavior is understood;
- namespaces/cluster-scoped resources have owners;
- RBAC and admission respect tenant boundaries;
- health, timeout, retry, and dependency behavior are explicit;
- drift exceptions are intentional and documented.

### Validation

Render every changed target. Validate API/CRD schemas, deprecated versions, duplicate identities, policy, labels/selectors/ports, and tool-specific linting. Record targets that cannot render and why.
