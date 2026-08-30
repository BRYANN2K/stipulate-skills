---
name: build-in-public-journal
description: "Use when AI-assisted product or software work produces a meaningful bug, failed approach, decision, experiment, surprise, pivot, or verified result worth preserving in a private Git-ignored journal, or when the user asks to mine selected safe events for qualitative ideas on explicitly requested channels. Keeps capture separate from optional editorial review and never drafts publish-ready posts."
license: Apache-2.0
compatibility: Requires Git for the bundled project-local journal path. The optional deterministic guard uses Python 3.10 or newer and standard-library modules only.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: creator
  tags: build-in-public, devlog, evidence-journal, content-ideas, x, linkedin, blog
---

# Build in Public Journal

## Overview

Preserve consequential facts that disappear behind a fast diff: wrong assumptions, failed approaches, decisions, trade-offs, experiments, surprises, pivots, and verified results. Private capture is the core activity. Editorial mining is a separate, optional activity performed only when the user asks for ideas or channel evaluation.

This skill does not write a post, thread, hook, article, CTA, or imitation of the author's voice. It can identify a subject, neutral angle, proof, missing evidence, author questions, disclosure risks, and qualitative fit for only the channels the user requested. Capture never implies editorial eligibility, publication approval, or publication.

<HARD-GATE>
Never persist secrets, credentials, customer data, sensitive personal data, private conversations, proprietary or contract-restricted material, confidential infrastructure details, raw private prompts/tool output, or exploitable details of an unresolved vulnerability. A Git ignore rule and restrictive permissions reduce accidental exposure; they do not make a file confidential. Sanitize before writing and omit the event when a safe summary would still disclose protected information. Publication, disclosure, customer quotation, and vulnerability detail require explicit human authorization through the applicable process.
</HARD-GATE>

## When to use

- Capture a non-trivial failure, corrected assumption, decision, experiment, feedback-driven change, pivot, stop, or verified result.
- Maintain a private project-local devlog or evidence ledger.
- Review existing entries for new evidence, duplicates, supersession, or safe retention.
- On explicit request, mine selected safe entries for ideas on named channels such as X, LinkedIn, or a personal blog.

Do not log every prompt, command, edit, commit, routine failure, dependency update, formatting change, or green test. Do not manufacture struggle, infer a person's feelings or motives, turn private life into content, or draft publication-ready copy.

## Modes

| Mode | Purpose | Project mutation |
|---|---|---|
| `initialize` | Establish the ignored local journal boundary | selected ignore source and journal path |
| `capture` | Add or update one meaningful private evidence event | journal only |
| `review` | Read existing private evidence for duplicates, staleness, conflicts, privacy risk, or proposed disposition | none |
| `reconcile` | Apply a specifically requested correction, update, supersession, deduplication, closure, or sensitive-payload removal | journal only |
| `mine-ideas` | Optional qualitative editorial review after an explicit request | journal or caller-selected private output only |

Infer a clear read-only mode from the request, but never infer `reconcile`, `mine-ideas`, or another mutation from the word “review.” Journal changes need an explicit capture, reconciliation/edit, initialization, or requested private-output outcome. Do not interrupt active work for a low-value capture, and do not run `mine-ideas` as a hidden follow-on to `capture`.

## Workflow

### 1. Establish or verify the private boundary

The bundled default is `.build-in-public/journal.md` under the target Git repository. Before any write, confirm that the path stays under `.build-in-public/`, has no symlink or hard-link alias, is not tracked or staged, and has never appeared at **any** path under `.build-in-public/` on any ref. A check of only the current filename misses deleted or renamed sibling journals. On platforms that support it, restrict group/other access.

Choose the ignore policy explicitly before initialization:

- `repository` (default) may append `/.build-in-public/` to the repository-root `.gitignore`; use it only when a shared repository rule is intended.
- `local` may append the same rule to Git's resolved `$GIT_DIR/info/exclude`; use it only when the user selects a repository-local, unshared rule. It must not create or alter `.gitignore`.

Explain the selected mutation, then pass the same policy to `init` and later `check` calls:

```bash
python3 <skill-directory>/scripts/journal_guard.py init --repo . --ignore-policy <repository|local>
python3 <skill-directory>/scripts/journal_guard.py check --repo . --ignore-policy <repository|local>
```

The guard creates the journal from the optional template and sets restrictive POSIX permissions. It asks `git check-ignore -v` for the effective rule and reports its source; initialization or checking fails when Git reports a source other than the selected policy. This makes a higher-precedence `.gitignore` visible rather than falsely claiming that the local exclude controls the path.

Stop if the journal is tracked, staged, found anywhere in the dedicated directory's history, aliased, or outside the dedicated path. Adding an ignore rule cannot retract history. Do not edit agent instructions, hooks, or other persistent configuration without separate authorization. If the helper is unavailable, direct equivalent Git/path/history/permission checks are acceptable; do not weaken the boundary.

The guard checks a bounded set of path, Git, link, permission, and pattern properties. It cannot certify confidentiality, prevent later disclosure, inspect backups/editor sync, or determine whether prose contains private facts.

### 2. Capture only a meaningful event

Load [the event taxonomy](references/event-taxonomy.md) when the event is ambiguous or needs a detailed record. Capture when the event preserves a useful decision, non-obvious observation, verified result, or learning; an explicit user request can override the routine-noise filter but not the privacy gate.

Inspect only the evidence needed for the event, such as the relevant diff, test, benchmark, issue, decision note, release artifact, or user-provided fact. Link safe evidence rather than pasting logs, large diffs, transcripts, prompts, customer payloads, or tool output.

Separate:

- confirmed observation from interpretation or hypothesis;
- what the human specified, corrected, decided, or verified;
- what the agent researched, generated, tested, or got wrong;
- what the evidence establishes from what remains pending.

Do not infer emotions or motives. Mark unverified results as pending.

### 3. Sanitize before and after persistence

Load [privacy and sanitization](references/privacy-and-sanitization.md) before storing a potentially sensitive event. Keep the minimum fact that preserves the decision or lesson. For an unresolved security issue, store at most a non-exploitable pointer to the approved secure system, generic remediation state, and `never_public` classification; omit it entirely if even that is risky.

The optional bundled heuristic can catch some common credential shapes:

```bash
python3 <skill-directory>/scripts/journal_guard.py scan --repo .
python3 <skill-directory>/scripts/journal_guard.py check --repo . --ignore-policy <repository|local>
```

Only when the user requests it, an additional adapter may invoke a secret scanner that is **already installed and documented by the target repository**. Use the repository's existing command and configuration, confirm it can scan the exact ignored journal path, and do not install a package, enable a hook, change dependencies/configuration/baselines, or substitute a new scanner. Never echo a matched value into chat, the journal, or logs; report only a non-sensitive tool/status summary and safe finding class/location when the scanner supports that. If its output cannot be relayed safely, keep the raw output out of the response and direct the user to its protected local result.

A clean bundled or repo-native scan means only that its configured detectors did not match. Neither `scan` nor `check` can certify confidentiality, customer safety, contractual permission, vulnerability safety, or publication readiness. Manual review remains necessary, and uncertainty means omit or keep private.

### 4. Append or reconcile the smallest accurate record

Use the repository's existing private format or the [private journal template](templates/private-journal.md) as optional scaffolding. Before appending, compare the candidate's outcome/decision, stable ID, and evidence locators with existing events.

- Same event and no new evidence: make no duplicate.
- Same event plus new or conflicting evidence: keep the canonical event ID and append a dated `update`, `correction`, or `supersession` that names the evidence and resulting current status. Do not create a second event or silently rewrite the earlier observation.
- A genuinely later decision that replaces the first: create or reuse its own stable event and add reciprocal supersession links without deleting either history.

A concise entry can omit inapplicable fields. `review` is read-only: report proposed duplicate reconciliation, new or conflicting evidence, stale hypotheses, low-value closure candidates, and sensitive-payload risks without changing the journal. Only an explicitly requested `reconcile` may retain a canonical record plus dated alias/reconciliation notes, add evidence, reject a hypothesis, close an entry, or remove an accidentally retained sensitive payload. Preserve the fact that a correction occurred while keeping protected values out of history; never echo the sensitive payload in the proposal or result.

### 5. Mine ideas only on request

When the user explicitly requests editorial mining, ask or infer which entries and channels are in scope. Evaluate only those channels, qualitatively—never assign signal, privacy, virality, or platform scores and never require an all-channel card.

Apply the privacy/publication gate before editorial judgment. A mined idea is a derived view of its source event, not an independent claim: record the source event's current status and last update, and re-read that event before resurfacing the idea. If later evidence corrects, rejects, supersedes, reopens, or tightens the privacy state, update the idea's disposition or bind it to the superseding event before reuse; never carry forward the earlier candidate state unchanged.

Then load [qualitative editorial mining](references/editorial-mining.md) and optionally use [the opportunity template](templates/content-opportunity.md). Keep the result at idea level:

- source event and possible subject;
- neutral angle and why the requested audience may care;
- confirmed proof, missing evidence, and limitations;
- questions only the author can answer;
- qualitative rationale for each requested channel;
- details to remove, generalize, delay, or keep private.

An unsafe, generic, or unproved event may remain private, have no editorial value, or need evidence. The author controls voice and publication. This skill does not turn approval to mine ideas into approval to publish.

## Output contract

For capture or review, preserve:

- event identifier or the reason capture was skipped;
- concise qualification and evidence state;
- privacy classification and redactions/omissions;
- guard/scan/manual-review results that were actually performed, with their limits.

For editorial mining, also preserve:

- source event ID, its current status/last update, possible subject/angle, audience value, proof, and gaps;
- only the requested channels and qualitative fit rationale;
- author questions, disclosure controls, and a private/not-useful/needs-evidence/candidate disposition.

No fixed section order or mandatory card for every channel is required. A user-requested or host presentation adapter may reorder, chunk, summarize, or progressively disclose the response as long as it does not hide privacy, evidence, disclosure, publication, or unverified-content boundaries. Never include publish-ready prose.

## Common pitfalls

- Treating `.gitignore`, file mode, a clean scan, or a passing guard as confidentiality.
- Saving raw AI transcripts or private tool output as provenance.
- Logging routine activity until useful evidence is buried.
- Combining capture with unsolicited editorial mining.
- Evaluating X, LinkedIn, and blog when the user requested only one channel.
- Turning an unverified outcome into a dramatic lesson.
- Publishing customer, vulnerability, private URL, or third-party material without authorization.
- Writing the post instead of preserving the author's agency.

## Source basis

- Git ignore-source selection and verbose provenance independently implement factual command behavior verified against the GPL-2.0-licensed documentation at [`Documentation/gitignore.adoc`](https://github.com/git/git/blob/c73e85354c275c9d409b26445089bc16940fc527/Documentation/gitignore.adoc) and [`Documentation/git-check-ignore.adoc`](https://github.com/git/git/blob/c73e85354c275c9d409b26445089bc16940fc527/Documentation/git-check-ignore.adoc), commit `c73e85354c275c9d409b26445089bc16940fc527`. The whole-directory history guard is informed by path-history semantics in [`Documentation/git-log.adoc`](https://github.com/git/git/blob/c73e85354c275c9d409b26445089bc16940fc527/Documentation/git-log.adoc) at the same commit. Only factual command semantics are used; no Git documentation wording, structure, or implementation is copied or adapted.
- Optional existing-scanner guidance paraphrases scan-scope and file-scan behavior from detect-secrets' Apache-2.0-licensed [`detect_secrets/core/usage/scan.py`](https://github.com/Yelp/detect-secrets/blob/5e141933554a0b74e7341841f318be21e895339c/detect_secrets/core/usage/scan.py) and [`detect_secrets/core/scan.py`](https://github.com/Yelp/detect-secrets/blob/5e141933554a0b74e7341841f318be21e895339c/detect_secrets/core/scan.py), commit `5e141933554a0b74e7341841f318be21e895339c`. No scanner, plugin, baseline, or required dependency is copied.
- Additive reconciliation of an existing record is adapted at concept level from EveryInc compound-engineering-plugin's MIT-licensed [`skills/ce-strategy/references/update-run.md`](https://github.com/EveryInc/compound-engineering-plugin/blob/a1f601f17137f648be439965f8fdd9123303de5d/skills/ce-strategy/references/update-run.md), commit `a1f601f17137f648be439965f8fdd9123303de5d`. No workflow, template, or code is vendored.

## Verification checklist

- Is the path untracked, unaliased, access-restricted where supported, and absent from every historical path under `.build-in-public/`?
- Did `git check-ignore -v` report the explicitly selected repository or local source, with no unintended `.gitignore` mutation?
- Does the entry retain only a necessary, source-backed, sanitized fact?
- Did duplicate/new evidence become a dated correction, update, or supersession rather than duplicated or rewritten history?
- Are observations, interpretations, hypotheses, and human/AI contributions distinguishable?
- Are guard and scan results described as bounded heuristics rather than confidentiality proof?
- Was editorial mining explicitly requested, limited to named channels, and reconciled with the source event's current status?
- Does the result stop before publish-ready copy or publication?
