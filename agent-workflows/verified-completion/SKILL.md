---
name: verified-completion
description: "Use when an agent is about to claim a task is done, fixed, tested, deployed, published, or ready. Requires fresh evidence proportionate to each claim, separates task outcome from proof level, preserves destination readback, and prevents unavailable checks or successful commands from being reported as proof they do not provide."
license: Apache-2.0
compatibility: Works with any tool-capable agent. The optional deterministic evidence guard requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: agent-workflows
  tags: completion, verification, evidence, testing, delivery, honesty
---

# Verified Completion

## Overview

Make the final claim no stronger than the current evidence. Track two independent axes:

- **Outcome:** `COMPLETE`, `PARTIAL`, or `BLOCKED`.
- **Proof:** `CLAIMED`, `IMPLEMENTED`, `EXECUTED`, `VERIFIED`, or `PUBLISHED`.

A task can be `PARTIAL + VERIFIED` or `COMPLETE + IMPLEMENTED`. Choose the shortest check that can falsify the actual claim, then add depth only when the requested outcome, risk, or repository contract needs it.

<HARD-GATE>
Never upgrade a claim because work looks plausible, a tool invocation was issued, a command returned success without exercising the claimed behavior, or an earlier check passed before the last relevant mutation. Missing, stale, irrelevant, failed, skipped, unavailable, inaccessible, or contradictory evidence is a disclosed gap, not a pass. Never fabricate command output, tests, URLs, object IDs, commit state, destination state, approval, deployment, or publication.
</HARD-GATE>

## When to use

Use before saying work is done, fixed, working, tested, ready, pushed, deployed, published, or equivalent; after consequential edits or remote mutations; and when handing work to a reviewer as complete.

This skill governs claim truth. It does not replace implementation, test design, code review, deployment safety, user acceptance, or authorization.

## Proof ladder

| Level | What the evidence establishes |
|---|---|
| `CLAIMED` | Someone says the work exists; this is not completion proof |
| `IMPLEMENTED` | The requested current artifact or state was directly inspected |
| `EXECUTED` | The current artifact or operation actually ran |
| `VERIFIED` | Relevant acceptance behavior or criteria were checked on the current subject |
| `PUBLISHED` | The verified result was independently read back from the requested destination |

The ladder is cumulative. A parser proves syntax only when syntax is the criterion. A targeted test proves its target, not an entire suite. A successful push, upload, deploy, or create call proves the command reported success, not that the intended destination contains the result.

Load [the evidence contract](references/evidence-contract.md) for subject identity, freshness, and the optional machine manifest. Load [claim patterns](references/claim-patterns.md) for common code, document, Git, CI, release, deployment, and external-system cases.

## Workflow

### 1. State the claim and its scope

Extract the user's explicit requirements, exclusions, destination, environment, and requested validation at the granularity needed to avoid hiding a gap. A short task can use a plain checklist or final diff; requirement IDs and atomic records are optional unless complexity or a machine protocol makes them useful.

Choose the minimum proof needed:

- creation or edit: usually `IMPLEMENTED`;
- “ran” or an operation occurrence: `EXECUTED`;
- “works,” “fixed,” “valid,” or an acceptance claim: `VERIFIED`;
- remote delivery, release, deployment, upload, or publication: `PUBLISHED`.

Do not add commit, publication, deployment, or broad test requirements the user did not request.

### 2. Bind evidence to the current subject

Identify the exact subject—such as path and content, revision, build, environment, resource ID, or destination—and the newest relevant mutation. Evidence for an affected requirement must be observed after that mutation. Independent requirements can keep independent freshness boundaries; do not rerun unrelated expensive checks without reason.

### 3. Gather proportionate direct evidence

Start with the cheapest relevant check that could expose failure. Inspect the current artifact for `IMPLEMENTED`; execute it for `EXECUTED`; exercise the acceptance criterion for `VERIFIED`. Record a concise locator such as a command and result, path and digest, run ID, revision, URL, or rendered artifact.

Evidence must be:

- relevant to the requirement;
- fresh after the last relevant mutation;
- direct from the subject or destination;
- inspectable through a locator;
- scoped to what the check can establish.

Run repository-required checks and checks affected by the change. Do not manufacture a broad suite when a bounded check supports the bounded claim. Keep secrets, credentials, customer payloads, and private logs out of evidence records.

For asynchronous CI, review, deployment, or remote work, identify progress states separately from terminal states and bind every observation to the same candidate. A green job can still have late required review, a superseding run, stale feedback, or a terminal infrastructure failure. Bound any flaky retry by both current authorization and the repository's policy, preserve every attempt, and disclose whether a failure is branch/candidate-caused, infrastructure-caused, canceled, superseded, or still unknown; do not retry until green or reuse review/CI produced for an obsolete subject.

Classify material evidence as supporting, contradicting, qualifying, or missing. Preserve contradictions and limitations instead of averaging them into a favorable status.

### 4. Read back side effects and destinations

After a file write, reopen or parse the file when that matters to the claim. After an API or cloud mutation, retrieve the resource by stable identity. After a push, compare the intended remote ref. After deployment or publication, fetch the destination behavior or artifact through the intended access path. If the claim names a protocol version or endpoint, release version or channel, registry, branch, or environment, read back that exact target; a default, `latest`, preview, or neighboring target is not a substitute.

Use immutable or versioned identifiers when the destination provides them. When this verification participates in an authorized consequential remote action, bind the target identity and allowlisted action before the effect, then read back that same target afterward; the identity check does not grant authority or approve a high-risk judgment. Monitoring and validation stay read-only: never trigger a retry, merge, release, deployment, or other mutation merely to obtain completion evidence. If authentication, network access, or the destination is unavailable, the publication requirement remains unproved; report `PARTIAL` or `BLOCKED`, never `PUBLISHED`.

### 5. Reconcile results without inflation

Use precise check statuses:

- `PASSED`: current evidence supports its scoped criterion;
- `FAILED`: evidence contradicts the criterion;
- `SKIPPED`: intentionally not run;
- `UNAVAILABLE`: could not run;
- `NOT_APPLICABLE`: does not govern this requirement.

`SKIPPED`, `UNAVAILABLE`, and `NOT_APPLICABLE` cannot be relabeled as `PASSED` or raise proof. A relevant failure blocks satisfaction until newer relevant evidence passes or the requirement changes. Separate pre-existing failures from regressions introduced by the work.

Set `COMPLETE` only when all explicit requirements reach their required proof. Use `PARTIAL` for useful completed work with remaining gaps. Use `BLOCKED` when a named external dependency prevents required completion. The reported proof level cannot exceed the weakest requirement represented as complete.

### 6. Use the machine-checkable profile only when useful

For complex tasks, handoffs, audits, or workflows that require a structured machine record, the [manifest template](templates/completion-manifest.json), [report template](templates/completion-report.md), and guard are optional hardened aids:

```bash
python3 <skill-directory>/scripts/completion_guard.py check   --manifest /tmp/completion-evidence.json   --repo .
```

The guard checks manifest consistency, cumulative levels, timestamps, and declared publication readback. It cannot authenticate evidence, judge semantic relevance, execute checks, or prove the subject is correct. Ordinary bounded work does not need a manifest or guard unless the repository, user, or machine interface requires one.

## Output contract

The final response must preserve:

- the task outcome and achieved proof level;
- what requirements are satisfied, with concise fresh evidence;
- failed, skipped, unavailable, stale, blocked, or out-of-scope proof;
- destination reference and readback for any `PUBLISHED` claim;
- a clear boundary on what was not proved.

No fixed final block or section order is required. A user-requested or host presentation adapter may reorder, chunk, summarize, or progressively disclose the response as long as it does not omit the outcome, proof level, evidence, gaps, destination readback, or claim boundary. Never bury a blocker behind a success headline.

## Common pitfalls

- Treating an edit as proof that behavior works.
- Reusing evidence produced before the final relevant mutation.
- Generalizing one targeted check to all tests or the whole system.
- Calling a local commit pushed, or a successful deploy command published.
- Requiring a manifest or exhaustive evidence ceremony for a small bounded claim.
- Treating the optional guard as an evidence source.
- Replacing an unavailable required check with a plausible surrogate.

## Verification checklist

- Is every completion claim bound to the current subject and requested scope?
- Is the evidence fresh, relevant, direct, inspectable, and no broader than its check?
- Are unavailable, skipped, failed, and contradictory checks visible?
- Was each claimed external side effect read back from its destination?
- Can a reader distinguish implementation, execution, verification, and publication?
