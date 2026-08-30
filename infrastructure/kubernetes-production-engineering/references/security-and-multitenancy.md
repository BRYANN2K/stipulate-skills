# Kubernetes security and multi-tenancy branches

Load only when the request or observed exposure involves security, tenant isolation, identity, secrets, host access, or supply-chain posture. These prompts are contextual: classify each result as a safety invariant, established project policy, recommendation under named assumptions, or informational option. Do not turn the whole list into a universal release gate.

## Workload isolation

A restricted posture is a strong starting point when compatible, but validate workload needs and platform policy before prescribing values:

- non-root/known UID strategy;
- privilege escalation and Linux capabilities;
- writable root filesystem and required write paths;
- seccomp/runtime profile;
- hostPID, hostIPC, hostNetwork, privileged mode, and hostPath;
- ServiceAccount token mounting and API access;
- image origin, digest/update policy, and registry trust when supply-chain risk is in scope.

Some workloads legitimately require exceptions. Name the requirement, narrow scope, compensating control, and validation rather than applying or waiving a default silently.

## Conditional Pod Security Admission branch

Use this branch only when the selected cluster/version enables Kubernetes Pod Security Admission for the namespaces in scope. Confirm competing admission or policy controllers and exemptions before treating namespace labels as the governing control.

Evaluate the three label modes independently:

- `pod-security.kubernetes.io/enforce` controls admission rejection for the selected level;
- `pod-security.kubernetes.io/audit` records policy violations for accepted requests;
- `pod-security.kubernetes.io/warn` returns user-facing warnings.

Each mode can select `privileged`, `baseline`, or `restricted` and can optionally pin a matching `pod-security.kubernetes.io/<mode>-version`. Choose levels and pinned versions from the target's threat model, Kubernetes version, supported workload behavior, and rollout evidence. Do not prescribe `restricted`, `latest`, all three modes, or a staged audit/warn-to-enforce rollout universally. Namespace label changes and admission configuration changes are live mutations.

### Compact adversarial examples

- A review demands `enforce=restricted` for an unknown distribution/version and declares every exception a blocker. Without target admission posture and workload compatibility, that is an unsupported universalization.
- `warn=restricted` passes a developer test, so the report claims Pods will be rejected. Warning is not enforcement; keep each mode's effect distinct.
- Labels use an unpinned `latest` version in a long-lived environment. Do not claim policy behavior is stable across control-plane upgrades without target-specific evidence.
- An external policy controller, exemption, or namespace override governs the workload. Namespace labels alone do not prove effective admission behavior.

## Identity and RBAC

Trace the actual subject → role/binding → resource/verb/name/namespace path. Treat wildcard access, cluster-admin, Secret read, impersonation, token creation, RBAC/admission write, and workload creation as potential privilege-escalation paths. Recommend the smallest permission supported by observed operations; do not invent an exhaustive role.

Disable automatic token mounting only when the workload does not need Kubernetes API access and the change is compatible with its controller/platform.

## Network

NetworkPolicy behavior depends on CNI enforcement and the application's required flows. Consider default-deny only after DNS, control-plane, ingress, egress, dependency, and operational paths are mapped enough to avoid self-inflicted outage. Review ingress and egress separately when relevant.

## Multi-tenancy

Namespaces alone are not a complete hostile-tenant boundary. Assess only the separation required by the threat model: RBAC, network, quota, admission, runtime/node isolation, Secret boundaries, cluster-scoped resources, and account/project/cluster separation. Higher-trust isolation can justify separate clusters/accounts/projects; it is not automatic.

## Secret handling

Do not print Secret data. Inspect names, keys, references, ownership, mount paths, rotation metadata, and external-secret/controller status first. Access a value only when explicitly authorized and necessary, minimize exposure, and never persist it in the report.

## Source notes

The Pod Security Admission branch is independently paraphrased from the Kubernetes website at commit [`08a020ca9a9a509e7d027a2a20706f9fb4cbb463`](https://github.com/kubernetes/website/tree/08a020ca9a9a509e7d027a2a20706f9fb4cbb463) (CC-BY-4.0), especially [`content/en/docs/concepts/security/pod-security-admission.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/concepts/security/pod-security-admission.md), [`content/en/docs/tasks/configure-pod-container/enforce-standards-admission-controller.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/tasks/configure-pod-container/enforce-standards-admission-controller.md), and [`content/en/docs/setup/best-practices/enforcing-pod-security-standards.md`](https://github.com/kubernetes/website/blob/08a020ca9a9a509e7d027a2a20706f9fb4cbb463/content/en/docs/setup/best-practices/enforcing-pod-security-standards.md). Selection remains conditional on the actual target/version and is not a universal rollout prescription.
