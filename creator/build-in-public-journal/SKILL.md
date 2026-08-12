---
name: build-in-public-journal
description: "Use when AI-assisted product or software work produces a meaningful bug, failed approach, decision, experiment, surprise, pivot, or verified result worth preserving for possible build-in-public content. Maintains a private Git-ignored evidence journal and evaluates ideas for X, LinkedIn, and a personal blog without drafting posts."
license: Apache-2.0
compatibility: Requires Git. The deterministic journal guard uses Python 3.10 or newer and standard-library modules only.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: creator
  tags: build-in-public, devlog, evidence-journal, content-ideas, x, linkedin, blog
---

# Build in Public Journal

## Overview

Preserve the parts of AI-assisted work that disappear behind a fast diff: wrong assumptions, failed approaches, real decisions, trade-offs, surprises, user feedback, and verified results. Maintain one private project-local evidence ledger, then derive neutral content opportunities from facts the author can inspect.

This skill never writes a post, thread, hook, article, or imitation of the author's voice. It supplies possible subjects, angles, proof, missing evidence, author questions, channel fit, and disclosure risks. The author decides what to say and writes it.

<HARD-GATE>
Never persist secrets, credentials, customer data, sensitive personal data, private conversations, proprietary material, confidential infrastructure details, or exploitable details of an unresolved vulnerability. A Git ignore rule prevents accidental commits; it does not make a file confidential. Sanitize before writing, keep the minimum useful fact, and block editorial mining when disclosure is unsafe or uncertain.
</HARD-GATE>

## When to use

Use this skill:

- after a non-trivial bug, failed approach, corrected AI assumption, or surprising constraint;
- when a product or engineering decision has real alternatives or consequences;
- after an experiment, benchmark, release, user observation, pivot, or stop decision;
- at a natural pause or session end to preserve meaningful evidence;
- during a weekly review to mine possible ideas for X, LinkedIn, or a personal blog;
- when the user asks for a private devlog, build log, evidence journal, or build-in-public ideas.

Do not use it to record every prompt, command, edit, commit, retry, routine dependency update, formatting change, or green test. Do not use it to manufacture struggle, infer emotions, turn private life into content, or draft publication-ready copy.

## Operating modes

| Mode | Purpose | Mutates project files? |
|---|---|---|
| `initialize` | Create and verify the private journal | Yes: one `.gitignore` rule and one ignored Markdown file |
| `capture` | Add or update one consequential evidence event | Yes: private journal only |
| `review` | Deduplicate, close, supersede, or enrich existing events | Yes: private journal only |
| `mine-ideas` | Evaluate safe events and add neutral opportunity cards | Yes: private journal only |

If the requested mode is unclear, infer it from context. Do not interrupt active work merely to create a low-value entry.

## Workflow

### 1. Establish the private boundary

For `initialize`, explain the exact intended mutation before running it:

- append `/.build-in-public/` to the repository root `.gitignore` only when no current rule ignores the journal;
- create `.build-in-public/journal.md` from the included template;
- set restrictive file permissions where the platform supports them.

Then run from the target project:

```bash
python3 <skill-directory>/scripts/journal_guard.py init --repo .
python3 <skill-directory>/scripts/journal_guard.py check --repo .
```

The guard must pass before any journal write. It rejects non-Git directories, paths outside the repository, symlinks, hard links, tracked journals, missing ignore coverage, and overly broad POSIX permissions. If a journal is already tracked or staged, stop and warn the user; adding `.gitignore` cannot make a tracked file private.

Do not edit `AGENTS.md`, `CLAUDE.md`, hooks, or other persistent agent configuration unless the user separately authorizes that mutation.

**Complete when:** the journal exists, `git ls-files` does not report it, `git check-ignore -v` identifies a real ignore rule, and the guard exits successfully.

### 2. Decide whether an event deserves capture

Load [event taxonomy](references/event-taxonomy.md). Capture only when at least one hard trigger applies and the event adds a reusable fact, decision, result, or learning.

Ask internally:

1. What changed in the project or in our understanding?
2. What did we expect, and what was observed?
3. What evidence can another reviewer inspect?
4. What future decision could this record improve?

If the answer is only “work happened,” skip the entry. Silence is a valid result.

**Complete when:** the event passes a hard trigger or is explicitly rejected as routine noise.

### 3. Gather evidence without copying the session

Inspect only the sources needed to support the event: relevant diff, tests, benchmark, issue, decision note, release artifact, or user-provided fact. Link to durable local or public evidence; do not paste complete tool output, raw AI conversations, full prompts, credentials, customer payloads, or large diffs.

Record the division of labor accurately:

- what the human specified, corrected, decided, or verified;
- what the agent researched, generated, tested, or got wrong;
- which claim is a confirmed fact, interpretation, hypothesis, or content idea.

Never infer the author's feelings or motives. If an outcome is not verified, mark it `evidence_pending` rather than making it sound complete.

**Complete when:** each factual claim has a source or an honest confidence label.

### 4. Sanitize before persistence

Load [privacy and sanitization](references/privacy-and-sanitization.md). Derive the minimum safe record before touching the journal.

For an unresolved security issue, store only a non-exploitable pointer, owner, remediation state, and `never_public` classification. If sanitization would remove the meaning, do not record the event in this journal.

After writing, run:

```bash
python3 <skill-directory>/scripts/journal_guard.py scan --repo .
python3 <skill-directory>/scripts/journal_guard.py check --repo .
```

The scanner catches common credential shapes but cannot prove that text is safe. Manual review remains mandatory for privacy, customer, contractual, infrastructure, and vulnerability risks.

**Complete when:** the manual gate passes, the heuristic scan reports no findings, and the Git guard still passes.

### 5. Append or update one event

Use [the private journal template](templates/private-journal.md). Prefer one event per outcome or decision bundle, not one per action. Merge distinct attempts into a short attempts summary.

- Reuse the existing event when new evidence closes or changes it.
- Append a dated update instead of silently rewriting past observations.
- Link superseding decisions rather than deleting history.
- Keep event IDs stable.
- Do not create a content opportunity during capture unless enough evidence already exists.

**Complete when:** the journal contains the smallest accurate event record and no duplicate entry describes the same outcome.

### 6. Review the ledger

For `review`, process unresolved and unmined events:

- merge duplicates;
- add newly available evidence;
- mark stale hypotheses `rejected`, `closed_no_content`, or `evidence_pending` with a concrete next check;
- link superseded decisions;
- preserve confirmed history;
- remove accidental sensitive detail rather than propagating it.

Do not maintain an immortal “maybe content” pile. Every reviewed event should have a current state and next disposition.

**Complete when:** each reviewed event is current, deduplicated, and either private, waiting on named evidence, rejected, or eligible for mining.

### 7. Mine content opportunities

Load [scoring and platform fit](references/scoring-and-platform-fit.md) and [the opportunity template](templates/content-opportunity.md). Apply the publication gate before scoring. An event that is unsafe, unverified, generic, or useless outside the project does not become a candidate.

Score signal strength and each platform separately. Never produce a global “viral” score. A single event may fit one channel, several channels, need more evidence, remain private, or have no editorial value.

The output must stay at idea level:

- possible subject and neutral angle;
- why an audience may care;
- confirmed proof and missing evidence;
- questions only the author can answer;
- possible platform and format;
- facts to remove, delay, anonymize, or generalize.

Forbidden outputs include a completed opening line, post, thread, carousel script, LinkedIn update, blog draft, CTA, or prose “in the author's voice.”

**Complete when:** every candidate points to a journal event, has passed the safety gate, and leaves voice and wording to the author.

## Output contract

A capture operation returns only:

- event ID and type;
- one-line reason it qualified;
- evidence status;
- privacy class;
- journal guard and scan results.

A mining operation returns opportunity cards containing:

- source event ID;
- possible subject and angle;
- audience value;
- available and missing proof;
- questions for the author;
- X, LinkedIn, and blog fit with rationale;
- disclosure risks and required redactions;
- one disposition: `KEEP_PRIVATE`, `NOT_USEFUL`, `NEEDS_EVIDENCE`, `X_CANDIDATE`, `LINKEDIN_CANDIDATE`, `BLOG_CANDIDATE`, or `MULTI_PLATFORM`.

Do not include publish-ready prose.

## Common pitfalls

- Treating `.gitignore` as encryption or forgetting that already tracked files stay tracked.
- Saving raw AI transcripts because they seem like complete provenance.
- Logging every coding action until the useful signal becomes impossible to find.
- Turning a routine error into a dramatic story with an invented struggle or lesson.
- Mixing confirmed observations, interpretations, hypotheses, and content ideas.
- Treating AI speed, token count, or lines generated as an outcome by itself.
- Recommending the same resized idea for every platform.
- Publishing a vulnerability, customer detail, internal URL, or third-party quote before approval.
- Writing the post instead of preserving the author's agency.

## Verification checklist

- [ ] The journal is inside the Git repository and the configured relative path is safe.
- [ ] `journal_guard.py check` confirms the journal is ignored and untracked.
- [ ] The entry passed a hard capture trigger and is not routine activity.
- [ ] Facts, interpretations, hypotheses, and content ideas are distinguishable.
- [ ] Evidence is linked or explicitly pending.
- [ ] Human and AI contributions are described without invented motives.
- [ ] No raw prompts, secrets, customer data, private conversations, or exploitable security details were persisted.
- [ ] `journal_guard.py scan` reports no heuristic findings.
- [ ] Content mining applied safety before scoring.
- [ ] Platform fit was judged separately for X, LinkedIn, and blog.
- [ ] The output contains ideas and author questions, never publish-ready copy.
