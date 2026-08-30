---
name: sre-incident-investigation
description: "Use when quickly triaging, deeply investigating, planning or executing mitigation for, communicating about, or reviewing a production incident using metrics, logs, traces, events, deployments, and system context. Scales coordination and evidence to incident complexity without forcing hypothesis quotas."
license: Apache-2.0
compatibility: Works with available observability and infrastructure tools. Requested live investigation remains read-only unless an exact remediation is separately authorized.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: devops
  tags: sre, incident-response, observability, metrics, logs, traces, postmortem
---

# SRE Incident Investigation

## Overview

Restore understanding or service by the shortest safe route. A known alert or narrow query does not require incident roles, a full timeline, multiple hypotheses, every signal type, a mitigation packet, and a postmortem. Add coordination and evidence only as impact, ambiguity, duration, or handoff needs grow.

Separate read-only investigation, mitigation recommendation, effect authorization, recovery evidence, and later learning. A direct request to create or update bounded local incident notes authorizes those writes without a second approval. Root-cause certainty is not required before a reversible mitigation when the predicted user benefit and risks are understood.

<HARD-GATE>
Never expose credentials, secret values, unnecessary personal/customer data, or sensitive incident evidence. Installing tools; changing authentication or privileges; and restarting, scaling, failing over, rolling back, disabling controls, modifying traffic/configuration/data, rotating credentials, acknowledging/closing an incident, deploying, releasing, or publishing require explicit authorization for the exact action, service/resource, environment/region, and observation/rollback boundary. Read-only investigation or local report authoring does not authorize those effects.
</HARD-GATE>

## When to use

- Triage an active degradation, outage, alert storm, latency/error spike, saturation, or dependency failure.
- Test a focused operational hypothesis or explain a telemetry signal.
- Investigate across metrics, logs, traces, events, deploys, configuration, and topology.
- Plan or, after exact authorization, execute the smallest stabilizing mitigation.
- Write an incident update, handoff, timeline, or evidence-based postmortem.

Do not use for speculative tuning with no incident signal. Use `cloud-architecture-review` for broad design assessment and the relevant security response workflow for containment or forensic evidence acquisition.

## Task modes

Choose the smallest mode that serves the current incident. Modes can change as evidence changes; they are navigation, not gates.

| Mode | Goal | Default boundary |
|---|---|---|
| **Quick triage** | Confirm impact/scope and next discriminating check | Minimal read-only evidence |
| **Targeted query** | Test or explain one hypothesis/signal | One bounded service/environment/time window |
| **Investigation** | Discriminate uncertain causes across relevant signals | Read-only, hypothesis-driven |
| **Mitigation design** | Select a reversible stabilizer | Exact proposal; no execution |
| **Mitigation execute** | Perform an authorized stabilizer | Exact target/action with abort/rollback/readback |
| **Update/handoff** | Communicate current state and next action | Sourced concise summary |
| **Postmortem** | Explain contributing conditions and improve controls | Documents and follow-up evidence |

Active incidents prioritize restoration. Formal incident-command roles are optional and useful only when coordination complexity justifies them.

## Workflow

Use only applicable branches. The section names do not require an incident to pass through nine phases.

### Frame the current question

For quick triage, establish the affected service/journey, environment/region or tenant segment, time window/time basis, observed impact without invented numbers, current status, and available evidence. Record alert evaluation/data presence, notification disposition, incident workflow state, and service recovery separately: no-data, silenced, inhibited, or cleared is not by itself recovery. Add severity policy, incident commander, technical lead, communications owner, or scribe only when the organization already uses them or multiple actors need coordination.

A focused query can stop after the exact target, time window, result, interpretation, and uncertainty are recorded. A longer investigation may keep a sourced timeline of material alerts, deploys, configuration/traffic shifts, dependency failures, mitigation, and recovery. Use `templates/incident-report.md` only when a durable notebook improves coordination.

### Form and test only useful hypotheses

When the cause is uncertain, write one or more hypotheses that predict observable signals and choose the smallest query that can distinguish them. Include an alternative only when it could change the next action. There is no minimum or maximum hypothesis count; a known failure may need direct confirmation rather than invented competitors.

Track, as useful: claim, predicted/rejecting signals, query/source/time window, result, confidence change, and next test. Mark unavailable or contradictory evidence as inconclusive. Load [hypothesis and signal correlation](references/hypothesis-and-signal-correlation.md) when several signals or competing explanations need a ledger.

Do not query every backend. Stop when the leading explanation is actionable and alternatives no longer change mitigation, the requested answer is supported, or evidence/access limits prevent discrimination.

### Correlate signals with a common scope

Join resource identity (service/workload, environment, region/cluster, runtime unit, version/deployment/configuration) with trace identity (trace/span and parent/link, valid request correlation, sampling decision when known) instead of correlating only by service and time. Add tenant segment only where appropriate. Check sampling probability and selection bias, aggregation, cardinality, retention, missing telemetry, event versus ingestion time, and clock uncertainty before treating absence or ordering as proof.

Use signals for their supported claims:

- metrics quantify when, where, and how much;
- traces locate paths, dependencies, fan-out, and latency contribution;
- logs report component-observed events within their logging/privacy limits;
- deploy/config/infrastructure events identify plausible changes;
- topology explains propagation and shared fate.

Correlation with a deployment is not causation. For each material causal edge, record the predicted mechanism, matching resource/trace path, order within clock uncertainty, control/intervention/counterfactual evidence, contradictions, and edge confidence. Seek a healthy/control population, version split, regional difference, or response to a reversible change where feasible.

### Select mitigation independently from root-cause certainty

Compare only plausible candidates by expected user benefit, time to effect, blast radius, reversibility, prerequisites, confidence, and new risk. Prefer the smallest controlled intervention that can restore the critical journey. Preserve evidence needed for later diagnosis when delay is safe; do not let postmortem completeness block urgent restoration.

A mitigation proposal should state only the decision-critical fields: exact target and action/procedure, expected user/system signal, observation window, abort condition, reversal/rollback, and ownership/communications when coordination needs them.

### Execute and read back an authorized effect

Immediately before an authorized action:

1. re-confirm actor, service/resource, environment, region/cluster/account, and current incident scope;
2. show the exact command/configuration/deployment diff or operation;
3. confirm expected effect, blast radius, prerequisites, and authorization;
4. confirm abort threshold and rollback/reversal path;
5. execute only that action and capture real output;
6. read back target state and user-facing/system health over the justified observation window.

Stop on target mismatch, changed procedure, unexpected scope, unavailable rollback, or regression. One meaningful change at a time is a useful default when causality matters, not an absolute rule during coordinated recovery.

Command success, healthy pods, no-data, a silence/inhibition, or a cleared alert/control-plane condition alone does not prove recovery. Use the affected user journey/SLI plus enough system evidence to rule out missing telemetry and displaced failure for the claim made.

### Learn at the useful depth

Run a postmortem only when requested or organizational policy requires it. Preserve sourced timeline, trigger, contributing conditions, propagation, detection, response, and recovery without forcing one root cause or “five whys.” Restore decisions and causal certainty can have different confidence.

Load [postmortem and actions](references/postmortem-and-actions.md) for durable learning work. Corrective actions should address an evidenced failure mode and predeclare baseline, predicted system/user outcome, evidence source, and effectiveness readback. Keep implementation status separate from effective/ineffective/inconclusive results. Add owner, priority, due condition/date, tracking ID, or counterfactual analysis when the team needs accountable follow-through; do not manufacture administrative fields for a small retrospective.

## Output contract

Adapt to the current mode and urgency:

- **Quick triage/targeted query:** current impact/scope, evidence and time window, interpretation/confidence, and next safe check.
- **Investigation:** material timeline, useful hypothesis ledger, resource/trace correlation identity, alert/data/notification/recovery states, causal-edge confidence, contradictions/limits, and stopping reason.
- **Mitigation design:** exact target/action, expected benefit, blast radius, authorization boundary, abort/rollback, and readback plan.
- **Executed mitigation:** authorization and target, action/output, post-action user/system readback, residual risk, and next observation.
- **Update/handoff/postmortem:** use the organization's format and include only facts, uncertainty, actions, and ownership needed by that audience.

Templates and query helpers are optional coordination aids, never evidence that an incident was understood or recovered. Do not emit both an active update and full investigation report unless both were requested or useful.

## Common pitfalls

- Turning a bounded alert into a full incident bureaucracy.
- Inventing extra hypotheses to satisfy a quota.
- Querying everything and worsening load or losing the discriminating signal.
- Treating the first correlated deploy as root cause.
- Using high-cardinality labels or broad logs containing private data.
- Restarting before preserving the small amount of volatile evidence needed.
- Confusing mitigation, durable correction, root cause, and recovery.
- Declaring recovery from command or control-plane health alone.
- Creating vague or administratively complete follow-ups with no failure-mode link.

## Verification checklist

Apply only relevant items:

- [ ] Scope, environment, time window, and impact are explicit enough for the current mode.
- [ ] Roles, timeline, hypotheses, and signal types were added only when useful.
- [ ] No hypothesis quota or fixed query ladder drove the investigation.
- [ ] Queries were bounded, privacy-safe, and changed confidence or were marked inconclusive.
- [ ] Conclusions preserve resource/trace identity, sampling and clock unknowns, contradictions, and causal-edge confidence.
- [ ] No-data, silenced, inhibited, or cleared states were mistaken for recovery; templates/helpers were not treated as proof.
- [ ] Local reports and read-only work proceeded without redundant approval.
- [ ] Any mitigation effect names exact target/action, diff/procedure, expected signal, abort/rollback, and readback.
- [ ] Recovery claims include proportionate user-facing/system readback, and corrective-action delivery remains separate from effectiveness readback.
- [ ] No credential/private-data access, install, auth/privilege effect, live mutation, closure, deployment, release, or publication occurred without explicit authorization.
