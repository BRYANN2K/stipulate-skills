---
name: delivery-pipeline-engineering
description: "Use when answering, authoring, reviewing, validating, hardening, or troubleshooting CI/CD workflows, supply-chain controls, artifacts, environments, release readiness, deployments, progressive delivery, or rollback. Routes focused pipeline work narrowly and gates only real remote or privileged effects."
license: Apache-2.0
compatibility: Works with repository workflows from GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure DevOps, and similar systems. Platform access is optional for requested read-only evidence.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: devops
  tags: ci-cd, supply-chain, deployment, progressive-delivery, release
---

# Delivery Pipeline Engineering

## Overview

Take the shortest safe route from the delivery outcome. A syntax fix, failed job, permission question, or bounded workflow edit does not require a full trust-boundary audit, five control planes, provenance packet, progressive rollout plan, release verdict, and gate matrix. Add those branches only when the requested claim or effect needs them.

A direct request to edit bounded workflow files authorizes those local writes. Local authoring and validation are distinct from triggering a job or enacting the permissions/deployment encoded by the workflow.

<HARD-GATE>
Never expose credentials, secret values, private artifacts, or unnecessary customer data. Installing tools/runners/plugins; changing authentication, tokens, environment approvals, or privileges in a live system; and rerunning privileged jobs, approving environments, publishing artifacts, creating releases, triggering workflows, deploying, promoting, bypassing gates, rolling back, pushing, or publishing require explicit authorization for the exact operation, actor/identity, repository/ref, artifact, target environment/account/cluster, and rollout boundary. Local workflow authoring does not authorize those effects.
</HARD-GATE>

## When to use

- Answer a focused CI/CD syntax, trigger, permissions, artifact, cache, or deployment question.
- Create or edit a workflow, reusable job, script, gate, or release configuration.
- Diagnose a failed, flaky, skipped, or unsafe pipeline.
- Review supply-chain trust, identities, dependencies, artifacts, provenance, or secrets.
- Assess release readiness or design a rollout/rollback strategy.
- Prepare or, after exact authorization, perform an external delivery operation.

Use `terraform-change-safety` for Terraform plan semantics and `gitops-operations` for controller reconciliation behavior.

## Task modes

Choose the narrowest typed route; modes are not a universal release sequence.

| Mode | Outcome | Default boundary |
|---|---|---|
| **Focused guidance** | Explain one pipeline behavior or choice | Relevant source/docs only |
| **Author** | Create or change bounded workflow/script files | Local writes; no remote run |
| **Validate** | Parse/lint/test the affected workflow path | Existing local tooling; no implicit installs |
| **Failure diagnosis** | Explain a failed/skipped/flaky job | Relevant config plus requested read-only logs/status |
| **Security/provenance review** | Assess named trust or supply-chain risks | Only implicated boundaries and artifacts |
| **Release readiness** | Decide whether a candidate can progress | Candidate-scoped evidence and explicit gaps |
| **Rollout design** | Choose exposure, signals, abort, rollback | Plan only; no deploy |
| **Execute** | Run an explicitly authorized remote delivery operation | Only the approved ref/artifact/target/action |

Infer the route from the request. Platform/provider-specific branches apply only after discovering the actual system and version. Do not copy one CI vendor's fixed workflow, action tag, permission model, or deployment defaults into another.

## Workflow

Use only applicable branches. Headings are navigation, not gates a focused task must pass.

### Bound the delivery claim

Identify the repository/ref, workflow/job/script, event/actor trust, relevant artifact, and target environment only to the depth needed. Inspect reusable workflows, includes, composite actions, scripts, container images, dependencies/locks, caches, environment rules, identities, and secrets only when they can influence the requested path.

For a focused edit, stop after the affected execution path and contract are understood. For security, provenance, release, or deployment claims, trace the applicable chain:

```text
trigger/ref → workflow identity → executable inputs/dependencies → build/test
→ artifact/evidence → registry → environment identity/approval
→ deployment/rollout → destination readback
```

This graph is a threat/evidence model, not a requirement that every project implement every node.

### Author or diagnose the bounded path

Preserve repository conventions, public workflow inputs/outputs, status semantics, secret boundaries, and existing distribution strategy. Do not introduce floating “latest” dependencies or arbitrary fixed versions/values; follow project pinning/update policy and current platform guidance.

Separate untrusted contribution validation, trusted build, artifact publication, and deployment when privilege warrants it. Untrusted code must not gain privileged secrets or write tokens through checkout refs, caches, artifacts, outputs, comments, or command injection.

For failure diagnosis, normalize the execution result independently from enforcement: failure, skipped, canceled, superseded, timeout, or infrastructure failure; then record whether the path was required, advisory, or explicitly allowed. Only a success bound to the exact required candidate—immutable tested commit or merge context, workflow/check identity and revision, run attempt, and evaluated inputs/artifact—satisfies that check. Use only relevant logs/status and never dump contexts or secrets.

At each reusable-workflow boundary, verify the caller's permission ceiling, the callee's requested subset, the effective intersection, the callee revision, and explicitly mapped secrets. A nested workflow must not broaden permissions or inherit unrelated secrets.

### Validate in proportion to the claim

Use repository-native commands first and the lowest evidence rung that supports the outcome:

- source/diff inspection for triggers, permissions, and declared job flow;
- YAML/schema/parse/lint for workflow structure;
- local/unit tests for scripts, expressions, reusable components, and affected behavior;
- sandbox/dry-run or platform validation when explicitly requested and safe;
- remote job status/logs for an executed-run claim;
- artifact digest/provenance verification for an identity claim;
- destination configuration and service readback for a deployment claim.

Record passed, failed, skipped, and unavailable checks. Parser/linter/template PASS is structural evidence only. Do not install a validator, push a branch, or trigger a workflow merely to satisfy a checklist.

### Review applicable trust and artifact boundaries

Load [pipeline security and provenance](references/pipeline-security-and-provenance.md) only for the relevant trigger, identity, dependency, runner, cache, secret, artifact, or promotion risks. Select controls from concrete threats, service criticality, and failure history; do not require a maximal tool list, highest provenance level, SBOM, signing, isolated builder, or every scanner for every project.

When a publication, promotion, provenance, or deployment claim depends on artifact identity, preserve source/dependency/build context and evaluate the scheme-neutral policy tuple: subject digest; cryptographic result; trusted root or issuer; expected workload identity, source, ref, and build parameters; and applicable transparency/time constraints. Keep signed, attested, and SBOM states distinct. Re-resolve and re-verify the same subject digest at promotion/deployment rather than trusting a mutable tag or build-time result. Prefer build-once/promote-by-digest when the system and migration constraints support it, not as an unexplained universal rewrite.

Every blocking gate should have a real failure it prevents, the input/artifact it evaluates, discriminating criteria, and observable evidence. Ownership/exception details are needed only where bypass governance exists. A green pipeline is not trustworthy when a critical path was skipped, advisory, stale, or evaluated a different artifact.

### Design progressive delivery only when relevant

Load [progressive delivery](references/progressive-delivery.md) for a production rollout, strategy comparison, or release-readiness claim that needs staged exposure. Choose rolling, canary/rings, blue/green, feature flags, or another project-native strategy from failure detectability, traffic control, capacity, state/schema compatibility, and reversal semantics.

Record enough to make the rollout decision: exposure progression, sample/dwell basis, user-facing and guardrail signals, and explicit handling for success, failure, query-error, inconclusive, timeout, and insufficient-sample as promote, hold, or abort. Keep decision authority, schema/data compatibility, observation window, and rollback versus roll-forward criteria explicit. When feature flags participate, track deployed artifact state separately from flag revision, audience, and treatment. Use only applicable fields and never invent traffic percentages, thresholds, or timing defaults.

A small CI change or artifact review does not need a progressive-delivery packet.

### Decide readiness or execute an effect

A readiness verdict is optional and candidate-specific. State READY/CONDITIONAL/BLOCKED or repository-native status only when the user asks for a go/no-go decision. It never authorizes a release or deployment.

Immediately before an authorized remote effect, bind and re-read:

1. actor identity and exact operation;
2. repository, commit/ref, workflow/run, and immutable artifact/release identity;
3. target account/project/subscription, environment, region/cluster, and current state;
4. reviewed workflow/configuration/deployment diff and privilege/data/schema effects;
5. required gates and their fresh evidence;
6. rollout/observation, abort, rollback or roll-forward procedure;
7. destination readback and user/service health signals.

Run only the authorized operation. Stop on target/artifact mismatch, changed diff, bypassed gate, unexpected privilege or scope, incompatible state, or health regression. Command/job success alone is not a published, deployed, or healthy outcome.

## Output contract

Adapt to the mode:

- **Focused guidance/diagnosis:** direct answer or cause classification, relevant path/log evidence, uncertainty, and next safe step.
- **Author/validate:** changed files, behavior and public-contract impact, relevant diff, checks actually run, and no remote-run claim.
- **Security/provenance review:** implicated trust boundaries, threat-linked findings, artifact evidence, and proportionate controls.
- **Release/rollout design:** exact candidate/target, material conditions, rollout signals and decision semantics, rollback/roll-forward, and evidence gaps.
- **Executed effect:** authorization and identity tuple, operation/result, destination readback, user/service health, and residual risk.

Use `templates/delivery-review.md` only when a durable multi-branch review helps. It is optional scaffolding, not a mandatory gate matrix, rollout packet, or quality proof.

## Common pitfalls

- Turning a focused workflow fix into a complete supply-chain and progressive-delivery audit.
- Assuming visible YAML contains all executable code.
- Exposing privileged credentials to untrusted contribution paths.
- Treating floating tags, “latest,” or arbitrary pinned examples as safe universal defaults.
- Rebuilding artifacts per environment while relying on earlier evidence.
- Requiring provenance/signing/SBOM or every scanner without a governing threat.
- Hiding failure with retries, `continue-on-error`, or advisory critical gates.
- Planning fixed canary percentages/thresholds without traffic and SLI evidence.
- Triggering a remote run, push, release, or deployment as an implicit validation step.
- Treating successful job completion as destination health.

## Verification checklist

Apply only relevant items:

- [ ] Scope and mode match the requested pipeline outcome.
- [ ] The affected executable path, inputs, identities, artifacts, and public contracts were inspected only as needed.
- [ ] Local authoring proceeded without redundant approval and did not trigger external effects.
- [ ] Validation preserves run result, required/advisory/allowed enforcement, exact candidate identity, and evidence freshness.
- [ ] Untrusted code cannot cross the implicated privileged or reusable-workflow boundary.
- [ ] Security/provenance controls are threat-linked, evidence types remain distinct, and promotion re-verifies the subject digest.
- [ ] Progressive rollout outcomes map to promote/hold/abort and deployment remains separate from feature exposure.
- [ ] Optional templates/validators were not represented as release quality proof.
- [ ] Any remote effect includes exact actor/ref/artifact/target/diff, abort/rollback, and destination/user-health readback.
- [ ] No credential/private-data access, install, auth/privilege effect, workflow trigger, push, release, deployment, rollback, or publication occurred without explicit authorization.
