---
name: sre-incident-investigation
description: Use when triaging, investigating, mitigating, or reviewing production incidents using metrics, logs, traces, events, deployments, and system context. Runs hypothesis-driven read-only investigation, separates evidence from inference, and gates every remediation.
license: Apache-2.0
compatibility: Works with any available observability or infrastructure tools. Live access should be read-only during investigation.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: devops
  tags: sre, incident-response, observability, metrics, logs, traces, postmortem
---

# SRE Incident Investigation

## Overview

Unify incident command and technical investigation. Stabilize coordination, establish a timeline, test hypotheses across metrics/logs/traces/changes, then propose the smallest reversible mitigation. Preserve uncertainty instead of manufacturing a root cause.

<HARD-GATE>
Investigation is read-only. Do not restart, scale, fail over, rollback, disable controls, modify traffic, rotate credentials, patch configuration, execute database changes, or acknowledge/close an incident unless the user explicitly authorizes the exact action. Never query or print secret values or unnecessary personal data.
</HARD-GATE>

## When to use

- Active production degradation, outage, alert storm, latency/error spike, saturation, or dependency failure.
- Root-cause investigation across metrics, logs, traces, events, deploys, and configuration changes.
- Mitigation planning, incident updates, handoffs, or evidence-based postmortems.

Do not use for speculative performance tuning without an incident signal. Use `cloud-architecture-review` for broad design assessment.

## Modes

| Mode | Goal | Default boundary |
|---|---|---|
| **Triage** | Establish impact, severity, ownership, and first hypotheses | Read-only |
| **Investigate** | Discriminate causes using correlated evidence | Read-only |
| **Mitigate** | Propose/execute smallest reversible stabilizer | Approval required |
| **Learn** | Build blameless timeline, causes, and actions | Documents only |

Select one primary mode and state it. Active incidents prioritize restoration over exhaustive diagnosis.

## Workflow

### 1. Open the incident frame

Capture:

- start/detection time, current time window, environment, services, regions/tenants;
- user-visible impact and affected critical journeys;
- severity criteria, incident commander, technical lead, communications owner;
- known recent changes and external dependencies;
- available telemetry and access limitations.

If formal roles do not exist, name temporary roles without creating bureaucracy. Never invent impact numbers.

**Complete when:** scope, impact, severity rationale, owner, and observation window are explicit.

### 2. Establish a minimal timeline

Record only sourced events: alert fired, deployment, config change, traffic shift, dependency error, saturation onset, mitigation, recovery. Normalize timestamps to one timezone and preserve source links/query identifiers.

Use `templates/incident-report.md` as the live notebook. Facts and hypotheses belong in separate sections.

### 3. Form competing hypotheses

Start with 2–5 hypotheses that predict observable signals. Include at least one alternative to the leading theory. Use the table in `references/hypothesis-and-signal-correlation.md`.

Bad: “The database is slow.”

Good: “A connection-pool limit introduced in deploy X causes request queueing; predicts rising acquisition latency, flat DB CPU, and failures concentrated on new pods.”

### 4. Query from broad to discriminating

Use the smallest query that can reject or support a hypothesis:

1. user-facing rate/errors/duration and affected segment;
2. resource saturation and queueing;
3. service/dependency topology and trace exemplars;
4. structured logs around trace/request IDs;
5. deployment/config/infrastructure events;
6. deeper platform queries only when needed.

Prefer rate and ratio over raw cumulative counters. Compare against a useful baseline. Check aggregation, label cardinality, sampling, clock skew, retention, and missing telemetry before interpreting absence.

For query discipline and anti-cardinality safeguards, load `references/hypothesis-and-signal-correlation.md`.

**Complete when:** each query changes the probability of a hypothesis or is explicitly marked inconclusive.

### 5. Correlate signals

Build a causal narrative only when ordering and mechanism agree:

- metrics establish **when/where/how much**;
- traces establish **which path/dependency**;
- logs establish **what the component reported**;
- changes establish **what could have altered behavior**;
- topology establishes **how failure propagates**.

Correlation with a deploy is not causation. Look for canary/control populations, version split, regional difference, rollback response, or a mechanism in code/config.

### 6. Update confidence and stop intelligently

Label every conclusion:

- **Confirmed** — direct evidence and mechanism, meaningful alternatives contradicted.
- **Likely** — multiple independent signals align; one material gap remains.
- **Possible** — plausible but weak or non-discriminating evidence.
- **Unknown** — evidence unavailable or contradictory.

Stop expanding when the leading hypothesis is actionable and alternatives no longer change mitigation, or when evidence limits are reached. State why.

### 7. Select mitigation

Rank candidates by time-to-effect, blast radius, reversibility, confidence, and new risk. Prefer configuration/traffic/release rollback over unbounded manual repair when it safely restores service.

Before any approved action provide:

- exact target and command/procedure;
- expected signal and observation window;
- abort threshold;
- rollback/reversal;
- owner and communication impact.

Execute one meaningful change at a time when possible; otherwise causality is lost.

### 8. Verify recovery

Recovery requires user-facing and system evidence across a stable observation window:

- critical SLI returned to acceptable range;
- saturation/queue/backlog is draining;
- no displaced failure appeared elsewhere;
- synthetic/real journey succeeds;
- alerts are resolving for the right reason.

“Pods are running” or “command succeeded” is not service recovery.

### 9. Learn without hindsight bias

For postmortem depth load `references/postmortem-and-actions.md`. Preserve detection, contributing conditions, propagation, response, and recovery. Avoid a single-person “root cause” when system controls could have prevented or contained the event.

## Output contract

### Active incident update

- Status and severity
- User impact
- Timeline since last update
- Confirmed facts
- Hypotheses with confidence
- Actions taken and observed result
- Next read-only query or proposed gated mitigation
- Risks/blockers
- Next update time/condition

### Investigation report

- Scope/evidence limitations
- Timeline
- Hypothesis matrix
- Findings and confidence
- Causal/contributing factors
- Mitigation and recovery evidence
- Follow-up actions with owners and validation

## Common pitfalls

- Querying everything and drowning in non-discriminating data.
- Treating the first correlated deploy as root cause.
- Using high-cardinality labels or regex queries that worsen the incident.
- Restarting workloads before capturing previous state/logs.
- Confusing mitigation with permanent correction.
- Declaring recovery from control-plane health only.
- Writing a clean causal story that hides uncertainty or contradictory evidence.
- Creating vague actions such as “improve monitoring.”

## Verification checklist

- [ ] Impact, severity, ownership, target, and time window are explicit.
- [ ] Timeline entries and claims link to evidence.
- [ ] Competing hypotheses were tested with discriminating queries.
- [ ] Confidence labels reflect evidence quality.
- [ ] No mutation occurred during investigation without authorization.
- [ ] Mitigation included expected signal, abort, and rollback.
- [ ] Recovery is proven at the user and system levels.
- [ ] Follow-ups have owners, due criteria, and measurable validation.
