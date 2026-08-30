# Resilience and disaster recovery branch

Load this reference only when the requested claim involves availability, recovery, backup/restore, regional failure, migration/cutover, or a critical journey. Use the subset of prompts that can change the decision.

## Critical journey model

For each journey in scope, capture as needed: entry point, synchronous/asynchronous dependencies, state changes, success signal, failure domains, and recovery ownership. A focused backup question may need only the data and restore path.

For each material dependency edge, conditionally capture the contract that governs failure propagation:

- end-to-end and per-hop timeout budget, including queue time;
- retry owner, maximum attempts/elapsed time, exponential or other backoff, and jitter;
- idempotency key, consumer idempotence, or deduplication boundary for repeated writes/messages;
- bounded queue/buffer and how producers receive backpressure;
- load-shedding trigger, rejected work, and client behavior;
- user-visible degraded mode or alternate path;
- service quota, connection/thread/partition limits, headroom, scale lag, and warm capacity.

Do not populate every field by ritual. Use the subset that can invalidate the journey claim. Multiple independently configured retry layers, an unbounded queue, or a timeout longer than the caller's budget are findings even when each component appears reasonable alone.

## Failure and recovery prompts

Ask the applicable questions:

- What can fail together, and what objective is affected?
- How is failure detected at the user and system level?
- What contains propagation or shared fate?
- What automatic/manual recovery occurs?
- What state can be lost, duplicated, or made inconsistent?
- What prerequisite or dependency can defeat recovery?
- What has been tested, when, under what target and data conditions?

Do not force every component through every question.

## Hybrid and disconnected branch

Use only for hybrid, edge, on-premises, sovereign, or intermittently connected journeys. Model disconnection as distinct contracts rather than one “offline” flag:

- **control plane** — which management, policy, provisioning, update, certificate/secret rotation, and observability operations stop or expire;
- **data plane and data authority** — which local reads/writes continue, durability while partitioned, conflict/ordering rules, backlog limits, and reconciliation/failback after reconnection;
- **DNS/routing** — local resolvers, cached records and TTLs, split-horizon authority, dependency discovery, and recovery from stale answers;
- **identity** — local authentication path, cached/offline authorization, token/certificate lifetime, key availability, revocation lag, and break-glass ownership;
- **capacity** — local quota/headroom and what is shed or degraded when cloud scale-out is unavailable.

Prove each claimed behavior at the layer that owns it. Continued local workload execution does not prove that operators can manage it, new users can authenticate, names resolve correctly, or partitioned writes reconcile safely. Conversely, loss of cloud management does not by itself prove local data-plane outage.

## RTO/RPO evidence

Configured replication and backup schedules are inputs, not achieved RTO/RPO. Timed restore/failover tests, data reconciliation, runbook execution, target readback, and operator availability support stronger claims. Label a configured or documented objective separately from a demonstrated result.

## Multi-region decision branch

Before recommending active/active or active/passive multi-region, resolve only the governing issues: data authority/conflict semantics, traffic steering/failback, identity/secrets/certificates/configuration replication, capacity/quotas, cross-region observability, deployment coordination, operational ownership, test cadence, and accepted cost.

A simpler recoverable architecture may be safer than an unoperated multi-region design. Do not treat multi-region as a default reliability upgrade.

## Compact adversarial examples

- The gateway retries three times and the SDK retries three times, but neither owns the end-to-end budget. Reporting “retries configured” misses amplification and is not a resilience finding in their favor.
- A queue absorbs bursts but has no bound, producer feedback, expiry, or shedding behavior. It demonstrates buffering, not backpressure or overload containment.
- A write is retried after a timeout without an idempotency/deduplication contract. Success can duplicate the state change, so a retry recommendation is incomplete.
- A hybrid cluster keeps existing workloads running for one hour without cloud connectivity. That does not establish behavior after DNS TTL or identity tokens expire, during local capacity exhaustion, or when partitioned writes reconnect.

## Source notes

The edge-contract guidance is independently paraphrased from Microsoft Architecture Center commit [`72d58a67bbe612ff5f583b7bf5695d3432055559`](https://github.com/MicrosoftDocs/architecture-center/tree/72d58a67bbe612ff5f583b7bf5695d3432055559) (CC-BY-4.0), including [`docs/patterns/retry-content.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/patterns/retry-content.md), [`docs/antipatterns/retry-storm/index.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/antipatterns/retry-storm/index.md), [`docs/best-practices/transient-faults.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/best-practices/transient-faults.md), [`docs/patterns/idempotent-consumer.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/patterns/idempotent-consumer.md), [`docs/patterns/queue-based-load-leveling.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/patterns/queue-based-load-leveling.md), [`docs/patterns/throttling.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/patterns/throttling.md), and [`docs/patterns/circuit-breaker.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/patterns/circuit-breaker.md).

The disconnected branch is independently informed by the same pinned source, especially [`docs/hybrid/azure-local-baseline-content.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/hybrid/azure-local-baseline-content.md), [`docs/hybrid/hybrid-dns-infra-content.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/hybrid/hybrid-dns-infra-content.md), [`docs/guide/technology-choices/hybrid-considerations-content.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/guide/technology-choices/hybrid-considerations-content.md), and [`docs/example-scenario/identity/adds-extend-domain-content.md`](https://github.com/MicrosoftDocs/architecture-center/blob/72d58a67bbe612ff5f583b7bf5695d3432055559/docs/example-scenario/identity/adds-extend-domain-content.md). These are conditional prompts, not claims that every architecture needs every pattern or Azure-specific component.
