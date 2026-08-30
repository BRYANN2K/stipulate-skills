# Kubernetes symptom routes

Load only the branch that matches the requested symptom. These are discriminating prompts, not a fixed query ladder or requirement to inspect every listed signal.

## Optional hypothesis note

When the cause is uncertain, track only useful fields:

| Hypothesis | Predicted/rejecting signal | Bounded query | Result | Confidence/next step |
|---|---|---|---|---|

A familiar symptom is not proof. No hypothesis count is required; direct confirmation is appropriate when the failure mechanism is already known.

## Pending

Start with the pod scheduling condition/reason and relevant events. Branch only as predicted into requests versus capacity, affinity/topology, taints/tolerations, quotas, PVC binding, or admission. Do not inventory every node when one condition identifies the boundary.

## CrashLoopBackOff or startup failure

Inspect current/previous termination reason and exit code, bounded previous logs, and the relevant command/configuration/startup dependency/write-path/identity/probe branch. Backoff is a symptom, not a cause.

## OOMKilled or resource pressure

Correlate the exact container limit/request, working-set behavior available from telemetry, termination reason, node pressure, runtime/heap settings, workload size/traffic, and recent revision as needed. Raising a limit without understanding growth can defer rather than fix failure.

## Probe failure

Separate startup, readiness, and liveness semantics. Confirm only the implicated endpoint/port/protocol/timing, initialization, dependency behavior, and resource-pressure factors. Liveness generally should not encode remote dependency health unless the workload contract requires it.

## Service, network, or DNS

Trace the affected hop: source identity/namespace → egress policy/DNS → Service selector and EndpointSlice → target port/listener → ingress policy/gateway. Stop at the first supported break; do not run broad connectivity tests across the cluster.

## Rollout or controller progression

Inspect the owning controller's observed generation, conditions, unavailable replicas/jobs, scheduling/readiness, PDB or strategy only when relevant, and GitOps/operator ownership. Distinguish reconciliation success from workload/user health.

## Storage

Trace only the relevant PVC → StorageClass/provisioner → PV/topology → attachment/mount/filesystem permission boundary. Do not delete PVC/PV as diagnosis.

## API, CRD, admission, or RBAC

Use the target version, installed CRD schema, admission response, SubjectAccessReview-equivalent evidence where authorized, and exact ServiceAccount/role binding path. Do not grant broad privilege or read Secrets to test a theory.

## Render and diagnostic command effect checks

Before using a render or diagnostic command as evidence, classify its effects rather than trusting its verb:

- a local `kubectl kustomize <directory>` with only reviewed local resources can be an offline render;
- a URL target or remote base adds dependency/network access;
- a configured generator, plugin, post-renderer, hook, or kubeconfig auth exec adds local execution;
- server dry-run and commands that use API discovery, target schema/CRDs, or template lookup are live API access even when they do not intend to persist an object;
- `kubectl debug` can update a Pod's ephemeral-container subresource or create a debug Pod/copy, so it belongs to remediation/mutation authorization, not the read-only query set.

These classes can overlap. Inspect the exact repository command, values, dependency graph, environment, and kubeconfig behavior before execution.

### Compact adversarial examples

- `kubectl kustomize ./overlays/prod` is labeled offline, but the kustomization references a Git URL. Reclassify it as networked dependency resolution.
- A Helm-style render writes YAML only, but a configured post-renderer runs a local binary and a lookup reads the cluster. It is both local execution and live read, not a pure render.
- `kubectl apply --dry-run=server` returns no persisted object. It still used a live context and API-side authorization/admission, so it cannot support an “offline validated” claim.
- An incident runbook places `kubectl debug pod/api` beside `get` and `logs`. Move it behind the live-mutation gate even when the intent is observation.

## Stop condition

Stop when evidence supports an actionable explanation and meaningful alternatives no longer change the fix, the focused question is answered, or access/data limits prevent discrimination. State the limit instead of expanding collection or guessing.

## Source notes

The command-effect distinctions are independent guidance informed by the Kubernetes website at commit [`08a020ca9a9a509e7d027a2a20706f9fb4cbb463`](https://github.com/kubernetes/website/tree/08a020ca9a9a509e7d027a2a20706f9fb4cbb463) (CC-BY-4.0), including [`content/en/docs/reference/kubectl/generated/kubectl_kustomize/_index.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/reference/kubectl/generated/kubectl_kustomize/_index.md), [`content/en/docs/concepts/overview/kubernetes-api.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/concepts/overview/kubernetes-api.md), [`content/en/docs/reference/kubectl/generated/kubectl_debug/_index.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/reference/kubectl/generated/kubectl_debug/_index.md), and [`content/en/docs/concepts/workloads/pods/ephemeral-containers.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/concepts/workloads/pods/ephemeral-containers.md). The broader plugin, lookup, and network classification is conditional on the actual tool configuration; it is not a claim that every render performs those effects.
