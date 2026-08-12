---
name: cloud-architecture-review
description: Use when assessing or designing AWS, Azure, GCP, hybrid, or multi-cloud architectures for security, reliability, operations, performance, cost, sustainability, disaster recovery, and migration risk. Produces evidence-linked findings and a prioritized roadmap using read-only discovery by default.
license: Apache-2.0
compatibility: Can review diagrams and IaC offline. Cloud CLI or APIs are optional and must use read-only access for discovery.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: infrastructure
  tags: cloud, architecture, aws, azure, gcp, resilience, well-architected
---

# Cloud Architecture Review

## Overview

Review the system as an operating architecture, not a checklist of services. Connect business objectives and failure tolerance to actual topology, identity, data, delivery, telemetry, and recovery evidence across cloud providers.

<HARD-GATE>
Architecture assessment is read-only. Do not create, modify, delete, fail over, scale, rotate, migrate, or run fault injection. Never request administrator credentials when documentation, IaC, inventory exports, or read-only roles are sufficient.
Any state-changing follow-up requires explicit authorization for the exact target and action after the review has documented impact, validation, and rollback.
</HARD-GATE>

## When to use

- Well-Architected, resilience, security, cost, or platform review.
- New cloud design, migration, modernization, DR, or multi-region decision.
- Review architecture diagrams, Terraform, Kubernetes, account structure, or inventories.
- Build a prioritized remediation roadmap grounded in evidence.

Do not use as a compliance certification. Framework mappings are assessment aids and require qualified review.

## Workflow

### 1. Define decision context

Capture:

- business capability, users, critical journeys, data classes, and regulatory constraints;
- availability, latency, RTO, RPO, retention, and recovery expectations;
- environments, accounts/subscriptions/projects, regions, and shared services;
- traffic, growth, budget/FinOps constraints, and operating-team capabilities;
- review depth: design-only, IaC-backed, or read-only live inventory.

Do not invent an SLO or RTO. Missing objectives are a finding because architecture cannot be evaluated against an undefined target.

**Complete when:** scope, objectives, exclusions, evidence sources, and access boundary are explicit.

### 2. Build the evidence map

Use, in priority order:

1. current IaC and policy repositories;
2. rendered deployment artifacts and CI configuration;
3. architecture/data-flow diagrams and ADRs;
4. read-only inventories/configuration APIs;
5. monitoring, incidents, backup/restore and DR test results;
6. interviews or prose claims, labeled unverified.

Record contradictions instead of choosing the most convenient source. Load `references/evidence-and-scoring.md`.

### 3. Model the system and its boundaries

Map:

- actors and external dependencies;
- edge, ingress, network segmentation, and egress;
- compute/control planes and deployment units;
- identity federation, human access, workload identity, and privileged paths;
- data stores, replication, encryption, backup, and lifecycle;
- DNS, certificates, secrets, queues/events, and shared dependencies;
- observability and delivery systems;
- region/AZ/failure-domain placement.

Use `software-architecture-diagrams` if a diagram is requested, but preserve this review's evidence and risk model.

### 4. Review eight dimensions

| Dimension | Core question |
|---|---|
| Security | Can identity, data, network, and supply chain withstand misuse? |
| Reliability | What fails together, how is failure detected, and what recovers? |
| Operations | Can operators deploy, observe, respond, and learn safely? |
| Performance | Does architecture meet measured latency/throughput needs under load? |
| Cost | Are spend, allocation, scaling, commitments, and waste visible and controlled? |
| Sustainability | Is capacity right-sized and unnecessary work/data movement reduced? |
| Delivery | Are changes authenticated, reviewed, tested, progressive, and reversible? |
| Governance | Are ownership, policy, inventory, lifecycle, and exceptions explicit? |

For each finding: evidence, affected objective, failure scenario, severity, recommendation, owner, effort, and validation.

### 5. Run failure-mode analysis

For each critical journey, test conceptually:

- zonal and regional loss;
- identity provider or control-plane outage;
- dependency latency/failure and retry amplification;
- quota/capacity exhaustion;
- data corruption, accidental deletion, and credential compromise;
- deployment or configuration failure;
- observability blind spot;
- operator error and unavailable restore knowledge.

Shared fate matters more than service count. “Multi-AZ” is not sufficient if all paths depend on one mutable control or untested database restore.

Load `references/resilience-and-dr.md` for deeper reviews.

### 6. Score confidence and priority

Do not produce decorative maturity scores. Score a control only when evidence supports it. Use:

- **Verified** — directly observed or tested evidence;
- **Documented** — current documentation without execution proof;
- **Claimed** — stakeholder statement only;
- **Unknown** — no usable evidence.

Prioritize with impact × likelihood × exposure, then adjust for confidence, dependency order, effort, and reversibility. A high-impact unknown stays high priority.

### 7. Produce an actionable roadmap

Group actions into:

- **Now** — close critical exposure or establish missing visibility;
- **Next** — reduce major failure modes and prove recovery;
- **Later** — optimize cost/performance and remove systemic debt;
- **Accept** — consciously retained risk with owner and review date.

Every recommendation includes an owner role, validation signal, dependencies, and rollback where it changes production.

Use `templates/architecture-review.md`.

## Output contract

- Executive verdict against stated objectives
- Scope and evidence quality
- Current architecture and trust/failure boundaries
- Findings by severity and confidence
- Critical journey/failure-mode analysis
- Prioritized roadmap
- Open decisions and missing evidence
- Appendix with checks run and sources inspected

## Common pitfalls

- Applying one cloud provider's service names as universal architecture advice.
- Treating framework completion as proof of resilience or compliance.
- Recommending multi-region before understanding data consistency and operations.
- Counting backups without restore tests.
- Optimizing cost by removing resilience without stating the trade-off.
- Drawing an idealized diagram that contradicts IaC or inventory.
- Requesting broad credentials for convenience.
- Turning findings into live changes during the assessment.

## Verification checklist

- [ ] Business objectives, critical journeys, RTO/RPO, and exclusions are explicit.
- [ ] Architecture claims link to evidence and confidence.
- [ ] Identity, network, data, delivery, observability, and failure domains are mapped.
- [ ] Eight dimensions and critical failure scenarios were assessed.
- [ ] Backups and DR are judged by restore/failover evidence, not configuration alone.
- [ ] Roadmap items have owner, priority, dependency, and validation.
- [ ] No mutation or secret exposure occurred during review.
