# Resilience and disaster recovery review

## Critical journey model

For each journey document entry point, synchronous dependencies, asynchronous dependencies, state changes, success signal, timeout budget, degradation path, and recovery owner.

## Failure analysis

For each component ask:

1. What can fail?
2. How does the system detect it?
3. What contains the blast radius?
4. What automatic/manual recovery occurs?
5. What state can be lost or duplicated?
6. How has recovery been tested?
7. What dependency can defeat the design?

## RTO/RPO evidence

Configured replication and backup schedules are inputs, not achieved RTO/RPO. Use timed restore/failover tests, data reconciliation results, runbook execution, and operator availability as evidence.

## Multi-region gate

Before recommending active/active or active/passive multi-region, resolve:

- data authority and conflict semantics;
- traffic steering and failback;
- identity, secrets, certificates, and configuration replication;
- quotas and warm capacity;
- observability across regions;
- deployment coordination;
- operational ownership and test cadence;
- cost accepted for the objective.

A simpler recoverable architecture may be safer than an unoperated multi-region design.
