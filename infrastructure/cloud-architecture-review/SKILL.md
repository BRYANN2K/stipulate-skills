---
name: cloud-architecture-review
description: "Use when answering a focused cloud architecture question, comparing options, assessing artifacts or a system, or planning AWS, Azure, GCP, hybrid, or multi-cloud changes involving security, reliability, operations, performance, cost, recovery, or migration risk. Scales review depth and evidence to the decision."
license: Apache-2.0
compatibility: Can review diagrams, documentation, and IaC offline. Cloud CLI/API discovery is optional, read-only, and limited to a confirmed requested scope.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: infrastructure
  tags: cloud, architecture, aws, azure, gcp, resilience, well-architected
---

# Cloud Architecture Review

## Overview

Take the shortest safe path to the architecture decision actually requested. Start with outcomes and constraints, inspect enough evidence to distinguish feasible options, and stop when the decision or claim is supported. A focused cost, security, service, or topology question does not trigger an eight-dimension Well-Architected audit, full failure catalogue, or roadmap.

Keep provider capability selection subordinate to the system decision. AWS, Azure, Google Cloud, hybrid, and portable branches apply only after the target and constraints make them relevant.

<HARD-GATE>
Do not access or expose credentials, private customer data, secret values, or broader inventories than the requested scope. Installing tools; changing identity, authentication, permissions, resources, traffic, scale, DNS, data, backup, failover, or migration state; running fault injection; and deploying, releasing, or publishing require explicit authorization for the exact action, account/subscription/project, region, environment, and target. Architecture review and local artifact authoring do not authorize those effects.
</HARD-GATE>

## When to use

- Answer a focused architecture, service-choice, cost, security, reliability, or migration question.
- Compare architecture styles or provider/portable options against known objectives.
- Review diagrams, ADRs, IaC, Kubernetes, account structure, or inventory exports.
- Run a scoped or full architecture/resilience/DR assessment.
- Plan a remediation or migration without performing it.

Do not present this skill as compliance certification. Frameworks and provider guidance are decision aids, not proof of resilience, security, or certification.

## Task modes

Choose the narrowest useful mode. Modes are typed routes, not a mandatory audit sequence.

| Mode | Outcome | Default boundary |
|---|---|---|
| **Focused guidance** | Answer one architecture or provider question | Relevant supplied/repository evidence only |
| **Options/design** | Compare feasible designs or create a target design | Local artifacts; assumptions explicit |
| **Artifact review** | Review IaC, diagram, ADR, or inventory export | Read-only, claim-oriented inspection |
| **Scoped assessment** | Assess named objectives, journeys, or risks | Only governing dimensions and dependencies |
| **Full assessment** | Broad architecture review requested | Cross-system evidence and prioritized findings |
| **Resilience/DR** | Evaluate failure, restore, failover, RTO/RPO | Critical journeys and recovery evidence |
| **Read-only inventory** | Confirm current provider configuration | Confirmed scope and configured least-privilege access |
| **Change plan** | Prepare migration/remediation | Diff/plan, target, rollback/readback; no mutation |

Do not silently upgrade an artifact review to live inventory. A direct request for bounded local diagrams, ADRs, recommendations, or IaC design authorizes those local writes; ask again only if the outcome or effect boundary changes.

## Workflow

Use only applicable branches. Headings guide navigation and are not quality gates.

### Frame the decision

Capture the smallest set of objectives and constraints that can change the answer: business capability or critical journey, users/data class, availability/latency/RTO/RPO where relevant, regulatory or residency constraints, traffic/growth/cost boundaries, environments/regions, operating-team capability, current system, and decision horizon.

Do not invent SLOs, RTO/RPO, budgets, growth, or compliance requirements. Missing objectives reduce confidence or become explicit decision inputs; they do not force a full discovery workshop when a narrower answer remains possible.

### Select evidence proportional to the claim

Use the most authoritative available source for each material claim: current IaC/policy, rendered configuration, diagrams/ADRs, inventory exports or read-only APIs, telemetry/incidents/restore tests, and stakeholder statements. No fixed source ordering or one-row-per-sentence ledger is required. Preserve contradictions and label claims as observed/tested, documented, reported, inferred, or unknown.

Evidence levels support different claims:

- source/diagram inspection supports declared architecture;
- render/plan/diff supports proposed configuration and expected changes;
- read-only provider inventory supports current observed configuration at a target/time;
- telemetry and journey tests support behavior under the observed conditions;
- timed restore/failover evidence supports recovery claims;
- post-change destination readback supports an executed effect.

Templates, checklists, scanners, and framework scores never prove architecture quality by themselves. Load [evidence and prioritization](references/evidence-and-scoring.md) for complex assessments.

### Decide capabilities before products

For an options or design task, compare only viable choices against the governing requirements. Useful decision fields may include constraint fit, failure/shared-fate behavior, data semantics, operational burden, security boundary, migration/reversibility, cost drivers, portability, evidence, and confidence. Use only fields that distinguish the options.

Describe the required capability first, then map it to current provider-native or portable implementations. Confirm volatile provider facts from authoritative documentation. Do not copy one provider's SKU, golden values, region model, or reference architecture into a universal default.

### Trace relevant boundaries and failure paths

For a focused review, trace only the actors, identities, networks, data stores, control planes, delivery path, observability, dependencies, or failure domains implicated by the question.

For a scoped/full resilience review, model critical journeys and the dependency/recovery chain. On each material dependency edge, capture only controls that can change the decision: caller and downstream timeout budget; the single intended retry owner plus attempt bound, backoff, and jitter; idempotency/deduplication; queue or flow-control backpressure; load shedding; accepted degraded behavior; and quota/warm-capacity assumptions. Presence of a retry, queue, or second region is not evidence that these contracts compose safely.

When a hybrid, edge, or intermittently connected target is in scope, separate cloud/control-plane connectivity from local data-plane continuity. Test the claimed behavior during disconnection for management and policy, local reads/writes and later reconciliation, DNS, identity/token lifetime and revocation, secrets/certificates/configuration, telemetry, and local capacity. Do not assume that running workloads prove manageability, or that a control-plane outage stops an otherwise autonomous local path.

Distinguish:

- redundancy configured;
- failover automation present;
- restore/failover tested;
- recovery objective demonstrated.

Load [resilience and DR](references/resilience-and-dr.md) only for claims involving availability, recovery, regional failure, backups, hybrid disconnection, or migration/cutover. Do not require every system to consider every hypothetical failure or every edge field.

### Assess only applicable concerns

Potential branches include security/identity/data, reliability/recovery, operability/observability, performance/capacity, cost/FinOps, sustainability, delivery/supply chain, governance/ownership, compliance mapping, and migration. Select branches from the stated objective and observed risk; a focused question can use one branch.

For each material finding, link the evidence, affected objective or failure mode, confidence, smallest useful recommendation, trade-off, and validation. Add owner, dependency, effort, rollback, or roadmap placement only when they help execution or governance.

Prioritize qualitatively by impact, likelihood/exposure, evidence uncertainty, dependency order, effort, and reversibility. Avoid decorative maturity totals and false numeric precision. A high-impact unknown remains visible without manufacturing a score.

### Prepare an effect without performing it

A change plan that could affect production must preserve:

1. exact account/subscription/project, region, environment, resources, actor, and authoritative source;
2. proposed IaC/configuration diff or provider operation;
3. data, identity, traffic, availability, cost, and dependency effects that actually apply;
4. prerequisites and validation evidence;
5. rollback/recovery and abort conditions;
6. post-change configuration and critical-journey readback.

Reconfirm these immediately before any separately authorized effect. Review completion alone is not permission to migrate, fail over, resize, rotate, deploy, or run fault injection.

## Output contract

Adapt the deliverable to the mode:

- **Focused guidance:** direct recommendation or options, governing evidence/assumptions, trade-off, and confidence.
- **Design/artifact review:** decision-oriented architecture or findings, relevant boundaries, source citations, and open choices.
- **Scoped/full assessment:** objectives, material findings ordered by risk and confidence, relevant failure paths, and a proportionate roadmap.
- **Resilience/DR:** critical journey, recovery chain, demonstrated versus configured claims, gaps, and test/readback needs.
- **Change plan:** exact target/environment, proposed diff/action, impact, prerequisites, rollback/abort, and readback; clearly state no mutation occurred.

Use a repository-native format. `templates/architecture-review.md` is optional for durable multi-finding work, not a mandatory report or quality certificate. Emit a verdict or Now/Next/Later roadmap only when the user needs that decision format.

## Common pitfalls

- Expanding a focused question into every architecture dimension and failure scenario.
- Treating framework completion, a template, or a maturity score as proof.
- Choosing a provider product before defining the required capability.
- Inventing SLOs, RTO/RPO, budgets, or compliance claims.
- Recommending multi-region before resolving data authority and operating capability.
- Adding retries at several layers without one owner, an end-to-end timeout budget, bounded backoff/jitter, and idempotency.
- Treating a queue as proof of backpressure or a running hybrid workload as proof that DNS, identity, data reconciliation, and management survive disconnection.
- Counting backups without restore evidence.
- Drawing an idealized diagram that contradicts current IaC or inventory.
- Requesting administrator credentials when supplied artifacts or read-only scope are enough.
- Turning recommendations into live changes during review.

## Verification checklist

Apply only relevant items:

- [ ] Review depth matches the requested decision rather than a universal audit.
- [ ] Objectives, constraints, target/provider, and unknowns are explicit to the needed level.
- [ ] Material architecture claims have proportionate evidence and confidence.
- [ ] Provider-specific branches were used only where the target required them.
- [ ] Applicable identity/data/network/failure/operational boundaries were traced; unrelated dimensions were not forced.
- [ ] Recommendations state meaningful trade-offs and validation rather than vendor feature shopping.
- [ ] Templates/frameworks were not represented as semantic or compliance proof.
- [ ] Local authoring proceeded without redundant approval.
- [ ] Any proposed live effect includes exact target/environment, diff/action, rollback/abort, and readback.
- [ ] No credential access, install, auth/privilege change, live mutation, deployment, release, or publication occurred without explicit authorization.
