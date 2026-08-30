# Static GitOps repository branches

Use this reference for a requested broad audit or affected-change validation. Select only checks that can support the requested claim; do not require a full inventory or render of unrelated targets.

## Relevant inventory

Map only the needed environments/clusters/tenants, bases/components, overlays, charts/releases, sources, dependencies, namespaces, CRDs, policies, secret references, automation, and generated ownership.

## Conditional checks

### Structure and ownership

- environment/tenant/cluster boundaries implicated by the change are unambiguous;
- reusable sources do not accidentally embed target-specific identity;
- dependency/order is explicit where behavior requires it;
- generated files have an identifiable source and are not hand-edited.

### Source trust and authenticity

- refs/update policy match the project's integrity needs;
- authentication uses the smallest established deploy/workload identity or scoped credential;
- verification/signature policy is assessed only where the threat model requires it;
- external sources/registries are intentional and owned or governed.

### Secrets

- no plaintext credential/private key is introduced;
- encrypted/external Secret references and decryption ownership are coherent;
- rotation/failure visibility is assessed when the request concerns it.

Never decrypt values merely to complete static validation.

### Safety and reconciliation

- prune/deletion behavior is understood where the diff can remove ownership;
- cluster-scoped/namespace ownership and RBAC/admission boundaries are checked where affected;
- health, timeout, retry, and dependency behavior are reviewed when changed;
- drift/ignore exceptions are narrow and explain the non-authoritative field owner.

### Claim-oriented validation

Render the exact changed or otherwise relevant targets only when the claim depends on generated output. Validate the applicable API/CRD versions, deprecated APIs, duplicate identities, policy, labels/selectors/ports, source references, and controller-specific lint. Record targets/checks as passed, failed, skipped, or unavailable and explain the evidence limit.

A source-only question may need no render. A successful render does not prove cluster admission, controller convergence, or workload health.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| A reusable base renders, but the changed production overlay cannot resolve its referenced source | Mark the affected target unavailable/failed; do not promote the base render into evidence for production |
| Source declares revision D7, while a generated file and review evidence identify D6 | Report the candidate identity mismatch and generated ownership; do not claim the desired target was validated |
| An ignore rule removes all differences for a field with no identified mutating owner | Reject the broad ignore until ownership, exact path, non-authoritative rationale, and a revisit test are evidenced |
