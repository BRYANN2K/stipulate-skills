# Live reconciliation debugging

## Read-only ladder

1. Confirm cluster context, namespace, controller, and target object.
2. Capture desired revision and observed revision.
3. Inspect Ready/Healthy/Synced conditions and transition times.
4. Inspect source artifact status and authentication errors.
5. Walk declared dependencies in order.
6. Inspect render/decryption/apply/admission errors.
7. Inspect resource ownership and inventory/prune state.
8. Follow affected resources into workload health.
9. Inspect bounded controller logs for the object/revision/time window.

## First failing boundary

Classify the earliest failure:

- **Source** — fetch/auth/revision/artifact unavailable.
- **Render** — path, values, template, decryption, or schema failure.
- **Apply** — RBAC, admission, immutable field, conflict, or missing CRD.
- **Health** — object applied but readiness/health condition fails.
- **Runtime** — workload is healthy by controller rules but user journey fails.
- **Drift/ownership** — multiple actors or ignore rules cause divergence.

Do not skip upstream boundaries: workload errors may be secondary to a stale or partially applied desired state.

## Evidence discipline

Record object, namespace, desired/observed revision, condition reason/message, first/last transition, controller log correlation, and affected resource. Mask secret values and credentials.
