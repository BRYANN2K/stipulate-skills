# Kubernetes security and multi-tenancy

## Workload baseline

Prefer a restricted posture:

- run as non-root with a known UID strategy;
- disallow privilege escalation;
- drop capabilities, adding back only proven needs;
- read-only root filesystem when compatible;
- seccomp RuntimeDefault;
- no hostPID, hostIPC, hostNetwork, privileged mode, or hostPath by default;
- projected/short-lived service account tokens where supported.

Validate image provenance, digest strategy, registry trust, vulnerability policy, and update ownership.

## Identity and RBAC

Start with required verbs on named resource types in the smallest namespace. Treat `*`, cluster-admin, Secrets read, impersonation, token creation, RBAC write, admission write, and workload creation as privilege-escalation paths.

Disable automatic token mounting when the workload does not call the Kubernetes API.

## Network

NetworkPolicy effectiveness depends on CNI enforcement. Begin with explicit default-deny only when required allow paths are mapped and tested. Review ingress and egress separately, including DNS and control-plane dependencies.

## Multi-tenancy

Namespaces alone are not a security boundary. Evaluate RBAC, network isolation, quotas/limits, admission policy, runtime isolation, node pools, secret boundaries, and cluster-scoped resources. High-trust separation may require separate clusters/accounts/projects.

## Secret handling

Do not print Secret data. Inspect names, keys, ownership, mount paths, rotation metadata, and external-secret status first. Access values only when explicitly authorized and necessary, then avoid recording them in output.
