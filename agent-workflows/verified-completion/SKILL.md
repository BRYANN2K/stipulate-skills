---
name: verified-completion
description: "Use when an agent is about to claim a task is done, fixed, tested, deployed, published, or ready. Requires fresh evidence for each explicit requirement, separates task outcome from proof level, and prevents implementation, local execution, verification, or publication from being overstated."
license: Apache-2.0
compatibility: Works with any tool-capable agent. The optional deterministic evidence guard requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: agent-workflows
  tags: completion, verification, evidence, testing, delivery, honesty
---

# Verified Completion

## Overview

Prevent the last-mile failure common to agentic work: an artifact was edited, so the agent says the task is done. A completion claim is valid only when every requested requirement has a relevant, fresh, inspectable proof at the level the task actually requires.

Track two independent axes:

- **Outcome:** `COMPLETE`, `PARTIAL`, or `BLOCKED`.
- **Proof level:** `CLAIMED`, `IMPLEMENTED`, `EXECUTED`, `VERIFIED`, or `PUBLISHED`.

A task can be `PARTIAL + VERIFIED`, or `COMPLETE + IMPLEMENTED`. Never collapse these into a vague “done.”

<HARD-GATE>
Never upgrade a completion claim because the work looks plausible, a tool reported success without exercising the artifact, or an earlier check passed before the last relevant mutation. If proof is missing, stale, irrelevant, skipped, inaccessible, or contradictory, lower the claim and report the gap. Never fabricate command output, test results, URLs, commit state, deployment state, user approval, or external-system confirmation.
</HARD-GATE>

## When to use

Use this skill:

- before saying `done`, `fixed`, `working`, `tested`, `ready`, `deployed`, `published`, or equivalent;
- after building, changing, debugging, releasing, uploading, migrating, or configuring something;
- when the user asks to verify, ship, commit, push, deploy, publish, or confirm completion;
- before handing work to another agent, reviewer, or human as complete;
- when recovering from an interrupted or compacted session whose earlier evidence may be stale;
- when a task has multiple requirements, environments, side effects, or external systems.

Do not use this skill as a substitute for implementation, testing strategy, code review, deployment safety, or user acceptance. It governs the truthfulness and precision of the final claim.

## Proof ladder

| Level | What it proves | Minimum acceptable evidence |
|---|---|---|
| `CLAIMED` | Someone says the work exists | No technical proof; never present as completion |
| `IMPLEMENTED` | The requested artifact or change exists | Direct inspection of the current artifact, diff, or state |
| `EXECUTED` | The artifact actually ran or the operation actually occurred | Current command, build, invocation, or smoke execution |
| `VERIFIED` | Relevant acceptance criteria passed | Tests, parser, render review, readback, behavior check, or equivalent |
| `PUBLISHED` | The verified result exists in the requested external destination | Immutable remote reference plus independent readback from that destination |

The ladder is cumulative. `PUBLISHED` requires verified behavior, not merely a successful upload command. `VERIFIED` requires a current artifact, not a detached test result.

Load [the evidence contract](references/evidence-contract.md) when choosing proof for a task. Load [claim patterns](references/claim-patterns.md) for common code, document, Git, CI, deployment, and external-system cases.

## Workflow

### 1. Extract the completion contract

Turn the user's request into atomic requirements before final verification. Include:

- requested artifacts and behavior;
- explicit exclusions and constraints;
- requested mutations or delivery destinations;
- expected validation, if stated;
- environment or branch where the result must exist.

Do not add publication, deployment, or commit as a requirement unless the user requested it or the surrounding workflow unambiguously includes it.

Assign the minimum proof level to each requirement:

- creation or edit only: usually `IMPLEMENTED`;
- runnable behavior: at least `EXECUTED`;
- “works,” “fixed,” “validated,” or quality claim: `VERIFIED`;
- remote delivery, release, deployment, upload, or publication: `PUBLISHED`.

**Complete when:** every explicit requirement has an ID, a pass condition, and a required proof level.

### 2. Find the last relevant mutation

Identify the newest change that could invalidate earlier evidence: file edit, generated artifact, dependency change, configuration mutation, commit rewrite, deployment, or remote update.

Evidence older than that mutation is stale for affected requirements. Re-run it. A green test from before the final patch is not proof of the final patch.

For independent requirements, only invalidate evidence in the changed dependency path. Do not rerun unrelated expensive checks without reason.

**Complete when:** each requirement has a defensible evidence freshness boundary.

### 3. Gather direct evidence

Use the cheapest relevant check that can falsify the claim, then increase depth until the required level is met.

Good evidence has five properties:

1. **Relevant:** it tests the actual requirement.
2. **Fresh:** it was produced after the last relevant mutation.
3. **Direct:** it comes from the artifact or destination, not from an agent's summary.
4. **Inspectible:** command, path, URL, commit, run ID, or rendered artifact can be revisited.
5. **Scoped:** it proves only what the check can establish.

Execute checks rather than describing what should be run. Capture concise evidence locators; do not paste secrets, raw credentials, private payloads, or enormous logs into the report.

**Complete when:** every satisfied requirement has enough current evidence to reach its required level.

### 4. Verify side effects by readback

A mutation command returning zero proves only that the command reported success. For files, reopen or parse the result. For Git, compare local and remote object IDs. For APIs, retrieve the created resource by ID. For deployments, request the deployed behavior. For publication, fetch the public or intended-access artifact from the destination.

Use immutable identifiers when available: commit SHA, release ID, deployment ID, object version, workflow run ID, or content hash.

If authentication, network access, or the destination is unavailable, report `BLOCKED` or `PARTIAL`; do not promote the result to `PUBLISHED`.

**Complete when:** every claimed external side effect has an independent destination readback.

### 5. Reconcile contradictions and skipped checks

Treat results precisely:

- `PASSED`: current evidence supports the requirement;
- `FAILED`: evidence contradicts it;
- `SKIPPED`: a check was intentionally not run;
- `UNAVAILABLE`: the check could not be run;
- `NOT_APPLICABLE`: the check does not govern this requirement.

`NOT_APPLICABLE` is informational. It may appear beside relevant evidence, but it never raises the achieved proof level.

A failed relevant check blocks satisfaction until a newer relevant check passes or the requirement changes. A skipped or unavailable required check is missing proof, not a pass. Explain baseline failures separately from regressions introduced by the work.

**Complete when:** no satisfied requirement depends on failed, skipped, unavailable, or unexplained contradictory evidence.

### 6. Determine outcome and achieved proof level

Set the outcome:

- `COMPLETE`: every explicit requirement is satisfied at or above its required proof level;
- `PARTIAL`: useful work is complete, but at least one requirement is unsatisfied or unverified;
- `BLOCKED`: an identified external dependency prevents completion and at least one requirement remains blocked.

Set the achieved proof level to the lowest level reached across the requirements represented as complete. Never average levels and never let one strong check hide one unproved requirement.

For machine-checkable work, fill a temporary manifest matching [the completion manifest template](templates/completion-manifest.json) and run:

```bash
python3 <skill-directory>/scripts/completion_guard.py check \
  --manifest /tmp/completion-evidence.json \
  --repo .
```

The guard validates consistency, cumulative proof, freshness, and publication readback. It cannot judge whether a test is semantically relevant or whether tool output is authentic; inspect those manually.

**Complete when:** the outcome, claimed level, requirement statuses, and evidence agree.

### 7. Report without inflation

Use [the completion report template](templates/completion-report.md). Lead with the outcome and achieved level. Then list:

- satisfied requirements with concise proof;
- missing, failed, skipped, or blocked checks;
- external references for published work;
- exact scope not proven.

Do not say “all tests pass” if only targeted tests ran. Do not say “published” when only committed locally. Do not say “fixed” when the reproduction was never exercised. Do not bury a blocker after a success headline.

**Complete when:** a reader can distinguish what changed, what ran, what was verified, what was published, and what remains uncertain.

## Output contract

Return this compact structure:

```text
Outcome: COMPLETE | PARTIAL | BLOCKED
Proof: CLAIMED | IMPLEMENTED | EXECUTED | VERIFIED | PUBLISHED

Satisfied
- R1 — <requirement>: <evidence locator and result>

Gaps
- <failed, skipped, unavailable, stale, or out-of-scope proof>

Published references
- <immutable remote reference plus readback result>
```

Omit empty sections except `Gaps`; use `Gaps: none` for a complete claim. Keep raw logs outside the final response unless the user asks for them.

## Common pitfalls

- Treating an edited file as proof that behavior works.
- Running tests before the final mutation and reporting them as fresh.
- Using a command's zero exit code as proof that a remote side effect exists.
- Claiming an entire suite passed after running one targeted test.
- Treating lint, type-checking, unit tests, integration tests, and acceptance checks as interchangeable.
- Reporting a locally created commit as pushed or a pushed commit as deployed.
- Ignoring one unmet requirement because most of the task succeeded.
- Requiring publication when the user asked only for a local artifact.
- Dumping logs instead of giving inspectable evidence locators.
- Using the manifest guard as a substitute for real execution and human judgment.

## Verification checklist

- [ ] Every explicit requirement is represented exactly once.
- [ ] Each requirement has the correct minimum proof level.
- [ ] Evidence was produced after the last relevant mutation.
- [ ] Each check is relevant to the claim it supports.
- [ ] Current failures and skipped or unavailable required checks are disclosed.
- [ ] Side effects were independently read back from their destination.
- [ ] Published claims use an immutable remote identifier where available.
- [ ] The outcome and proof level are reported separately.
- [ ] The achieved level is no higher than the weakest completed requirement.
- [ ] No secret, credential, private payload, or fabricated output appears in the report.
- [ ] The final wording does not generalize beyond the checks actually run.
