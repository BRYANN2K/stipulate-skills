---
name: delivery-pipeline-engineering
description: Use when designing, reviewing, hardening, or troubleshooting CI/CD pipelines, build provenance, test gates, artifacts, environments, deployments, progressive delivery, release readiness, and rollback. Produces an evidence-based delivery verdict and never deploys by default.
license: Apache-2.0
compatibility: Works with repository workflows from GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure DevOps, and similar systems.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: devops
  tags: ci-cd, supply-chain, deployment, progressive-delivery, release
---

# Delivery Pipeline Engineering

## Overview

Design and review the path from source commit to production outcome. Preserve artifact identity, least privilege, evidence-producing gates, environment separation, progressive rollout, and reversible delivery.

<HARD-GATE>
Do not rerun privileged jobs, approve environments, publish artifacts, create releases, deploy, promote, change secrets, bypass gates, or rollback unless the user explicitly authorizes that exact operation. Editing a workflow file is not authorization to trigger it.
</HARD-GATE>

## When to use

- Create or review CI/CD workflows and release pipelines.
- Harden build identity, permissions, dependencies, artifacts, provenance, and secrets.
- Design test/security/policy/cost gates and environment promotion.
- Plan canary, blue/green, rolling, feature-flag, rollback, or release readiness.
- Diagnose a failed or unsafe pipeline.

Use `terraform-change-safety` for Terraform plan semantics and `gitops-operations` for controller reconciliation details.

## Workflow

### 1. Map the delivery graph

Trace:

```text
source event → workflow identity → checkout/dependencies → build/test
→ artifact/provenance → registry → environment approval → deployment
→ rollout analysis → verification → promotion/rollback
```

Inspect reusable workflows, included templates, scripts, composite actions, container images, package manager locks, environment rules, secrets, and cloud identity. Do not assume the visible YAML contains all executed code.

**Complete when:** every executable trust boundary and artifact handoff is identified.

### 2. Define delivery objectives

Capture service criticality, release frequency, environments, compliance constraints, required tests, maximum acceptable rollout risk, deployment strategy, owners, and rollback/recovery expectations.

Separate PR validation, trusted-branch build, artifact publication, and production deployment. Untrusted fork/PR code must not receive privileged secrets or write tokens.

### 3. Review five control planes

Load `references/pipeline-security-and-provenance.md` for depth.

1. **Trigger and identity** — event trust, token permissions, OIDC/workload identity, approvals.
2. **Build integrity** — pinned dependencies/actions/images, isolated runners, deterministic build, cache boundaries.
3. **Quality evidence** — tests, lint, type, security, policy, IaC, migration, and docs checks.
4. **Artifact integrity** — immutable artifact built once, digest, signing/provenance/SBOM where warranted.
5. **Deployment safety** — environment separation, progressive exposure, health analysis, rollback, audit trail.

A green pipeline is not safe if a gate was skipped, marked non-blocking, or ran against a different artifact.

### 4. Design fast, discriminating gates

Move cheap deterministic checks early. Parallelize independent checks. Keep flaky tests visible and owned; do not normalize retries that hide failure.

Every blocking gate defines:

- what failure it prevents;
- exact input/artifact;
- pass/fail criteria;
- whether it is required or advisory;
- evidence retained;
- owner and exception process.

Avoid copying a maximal tool list. Select controls from threat model and failure history.

### 5. Preserve artifact identity

Build once, promote the same immutable digest across environments. Record source commit, dependencies/lock state, build workflow identity, artifact digest, provenance/signature, configuration version, and deployment target.

Rebuilding “the same commit” for production produces a different supply-chain event and invalidates staging evidence.

### 6. Plan progressive delivery

Load `references/progressive-delivery.md`. Choose rolling, canary, blue/green, ring, or feature flags based on failure detectability, state compatibility, traffic control, capacity, and rollback semantics.

Define:

- pre-deploy checks;
- exposure steps and dwell time;
- user-facing and system SLIs;
- automatic/manual abort thresholds;
- database/schema compatibility;
- rollback vs roll-forward trigger;
- post-deploy observation window.

### 7. Assign delivery verdict

- **READY** — identity, gates, immutable artifact, rollout, verification, and rollback are evidenced.
- **CONDITIONAL** — deploy only after listed controls/approvals.
- **BLOCKED** — privilege exposure, untrusted execution, failed/absent critical gate, artifact ambiguity, incompatible migration, or no credible rollback.

The verdict does not authorize deployment.

### 8. Implement and validate workflow changes

After editing:

- parse/lint workflow syntax;
- validate referenced scripts/actions/includes exist;
- inspect permissions and secret contexts at job level;
- run available local/unit pipeline tests;
- review diff for trigger broadening or privilege changes;
- do not trigger external workflows unless asked.

If a sandboxed run is authorized, verify emitted artifact and evidence. Never fabricate CI output.

Use `templates/delivery-review.md`.

## Output contract

- Delivery graph and trust boundaries
- Findings by severity and confidence
- Gate matrix
- Artifact/provenance model
- Rollout and rollback plan
- Verdict: READY / CONDITIONAL / BLOCKED
- Validation log and unavailable checks

## Common pitfalls

- Privileged `pull_request_target`/equivalent execution of untrusted code.
- Broad write tokens or static cloud keys.
- Mutable action tags, base images, dependencies, or deployment tags.
- Rebuilding artifacts per environment.
- Caches shared across trust boundaries.
- “Security scan” that is non-blocking or scans source but not the shipped artifact.
- Automatic production deploy without useful health/abort signals.
- Rollback that cannot handle database/schema changes.
- Treating manual approval as a substitute for technical evidence.

## Verification checklist

- [ ] Delivery graph includes scripts, templates, actions, identities, and artifacts.
- [ ] Untrusted code cannot access privileged credentials/tokens.
- [ ] Permissions are least privilege and environment scoped.
- [ ] Critical gates are blocking, discriminating, and use the intended artifact.
- [ ] The same immutable artifact is promoted.
- [ ] Rollout has SLI, thresholds, dwell time, abort, and rollback.
- [ ] Workflow changes were parsed/linted and diff-reviewed.
- [ ] No external run, release, or deployment occurred without authorization.
