# Kubernetes runtime troubleshooting

## Hypothesis table

Track investigations explicitly:

| Hypothesis | Signal that supports it | Signal that rejects it | Query | Result | Confidence |
|---|---|---|---|---|---|

Use `confirmed`, `likely`, `possible`, or `unknown`. A familiar symptom is not proof.

## Symptom routes

### Pending

Inspect scheduler condition/events, requests vs allocatable capacity, affinity/anti-affinity, taints/tolerations, quotas, PVC binding, topology constraints, and admission failures.

### CrashLoopBackOff

Inspect current and previous termination reason/exit code, previous logs, command/args, configuration references, startup dependencies, writable paths, identity, and probe timing. Backoff is a symptom, not a root cause.

### OOMKilled

Compare container limit, working-set trend, node pressure, request/limit mismatch, heap/runtime settings, traffic or job size, and recent deployment. Raising a limit without understanding growth may only delay failure.

### Probe failure

Separate startup, readiness, and liveness semantics. Confirm endpoint, port, protocol, timeout, thresholds, initialization duration, dependency behavior, and resource starvation. Readiness may depend on serving ability; liveness should usually not depend on remote services.

### Network/DNS

Trace source pod → egress policy → DNS → Service → EndpointSlice → target port → ingress policy → application listener. Confirm selectors and namespaces at each hop.

### Rollout stuck

Inspect Deployment/StatefulSet conditions, unavailable replicas, surge/unavailable settings, PDB, image pull, scheduling, readiness, quota, and immutable fields. Identify whether the rollout controller or GitOps controller owns progression.

### Storage

Trace PVC → StorageClass → provisioner → PV → topology → mount events → filesystem permissions. Do not delete PVC/PV as a diagnostic shortcut.

## Stop condition

Stop collecting when one hypothesis is strongly supported and meaningful alternatives are contradicted, or when access/data limits prevent discrimination. State the limit instead of guessing.
