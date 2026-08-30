# Evidence contract

Use this reference when a completion claim needs more than a direct final inspection. Evidence is a scoped observation tied to an identifiable subject, not a confidence score.

## Subject and evidence identity

Name what was observed precisely enough to distinguish it from an earlier or neighboring result:

- artifact path plus revision, digest, or relevant content;
- build/test run plus source revision;
- branch and commit;
- environment plus deployment/resource/version ID;
- destination plus object, release, post, or remote-ref identity.

This subject-to-evidence binding is conceptually informed by the subject and predicate separation in [in-toto/attestation at `2dcd055`](https://github.com/in-toto/attestation/tree/2dcd055e9f72e746687c306e35f4e59720ff45be) (Apache-2.0). This skill does not claim to emit an in-toto attestation.

## Evidence properties

| Property | Question | Failure example |
|---|---|---|
| Relevant | Could this check fail when the scoped requirement is broken? | `git diff --check` used to claim business logic works |
| Fresh | Was it observed after the last mutation that could affect it? | tests passed before the final patch |
| Direct | Did it inspect the subject or destination itself? | another agent says deployment succeeded |
| Inspectable | Is there a command, path, digest, ID, URL, or artifact? | “I checked carefully” |
| Scoped | Is the claim limited to what the observation establishes? | one unit test becomes “all tests pass” |

A missing property lowers the supported claim. Add only the evidence depth needed for the requested outcome and risk.

## Cumulative levels

### `IMPLEMENTED`

Current inspection shows that the requested artifact or state exists. Useful observations include a file/diff inspection, generated output, configuration/resource readback, or structured source inspection. This does not prove execution.

### `EXECUTED`

The current subject ran or the requested operation occurred. A command, test process, build, smoke invocation, parser, renderer, or linter can support this level. Execution does not by itself prove that the acceptance criteria were adequate.

### `VERIFIED`

Relevant acceptance evidence supports the claimed behavior on the current subject. For executable work this normally includes execution. A parser can verify format validity when format is the criterion; a rendered review can verify applicable visual criteria; a regression or behavior check can verify its targeted behavior.

A parser does not prove visual quality, a screenshot does not prove accessibility, and a unit test does not prove deployment.

### `PUBLISHED`

The verified result exists at the requested external destination and was independently read back there. Record the destination and a stable or immutable identifier when the system provides one. Examples include a remote commit SHA, release/object version, deployment ID plus behavior readback, or destination page/object fetched through the intended access path.

A successful upload, push, deploy, or publish command without destination readback does not reach this level.

## Freshness boundary

The relevant boundary is the newest mutation that could invalidate an observation, not merely elapsed wall-clock time. Split evidence boundaries when independent requirements change independently. Do not rerun unrelated expensive checks or preserve affected stale checks by choosing an artificially early boundary.

For a pre-existing failure, compare a clearly recorded baseline with the same scoped check after the change and distinguish unchanged failures from new regressions. Never convert a failing baseline into a pass.

## Concise locators

Prefer a revisitable locator over a raw transcript:

- `command: python3 -m unittest ...; exit=0`
- `path: dist/app.js; sha256:<digest>`
- `git: HEAD=<sha>; intended remote ref=<sha>`
- `ci: run <id>; head=<sha>; conclusion=success`
- `destination: <URL or object ID>; readback=<result>`

Do not store secret values, authorization headers, cookies, customer payloads, private logs, or full command transcripts in a completion record.

## Evidence roles and asynchronous lifecycle

For a consequential claim, retain the role of each material item:

- **supporting** — directly supports the bounded property;
- **contradicting** — conflicts with it and must remain visible;
- **qualifying** — narrows its subject, conditions, confidence, or time window;
- **missing** — required evidence has not been obtained.

For PR, CI, release, deployment, or another long-running remote process, bind observations to the same immutable candidate. Queued, pending, running, or waiting states show progress, not completion. Success, failure, cancellation, timeout, or supersession can be terminal for that run without proving the candidate ready. After a green job, refresh required review channels so late feedback remains visible. Treat skipped or advisory checks, branch/candidate failures, and infrastructure failures distinctly. A retry is a separately authorized remote effect: bound its count by repository policy, preserve every attempt, and never use a retry on a new head to launder stale CI or unresolved review.

Before an authorized remote effect, a deterministic check may confirm exact target identity and that the requested action belongs to a predeclared allowlist. It remains a consistency guard, not mutation authority or approval. Monitoring is read-only. After an effect, read back the same identity; when the claim names a protocol endpoint/version, release version/channel, registry, branch, or environment, a default or neighboring target does not qualify.

These mechanisms are selectively informed by OpenAI Codex's conditional PR watcher at [`.codex/skills/babysit-pr/SKILL.md`](https://github.com/openai/codex/blob/b8c86376a258e55efc8e5ecfbabc21c16c07d814/.codex/skills/babysit-pr/SKILL.md), revision `b8c86376a258e55efc8e5ecfbabc21c16c07d814`, Apache-2.0; GitHub Awesome Copilot's MIT-licensed [`build-evidence-map`](https://github.com/github/awesome-copilot/blob/f11a4e441c5ff061b4f8ae37952be8c602e4034e/skills/build-evidence-map/SKILL.md); and PyTorch's [triage skill](https://github.com/pytorch/pytorch/blob/3176d8d66e3a7dabcd801cc117a6e492cbabf3ed/.claude/skills/triaging-issues/SKILL.md), [`validate_issue_target.py`](https://github.com/pytorch/pytorch/blob/3176d8d66e3a7dabcd801cc117a6e492cbabf3ed/.claude/skills/triaging-issues/scripts/validate_issue_target.py), [`validate_labels.py`](https://github.com/pytorch/pytorch/blob/3176d8d66e3a7dabcd801cc117a6e492cbabf3ed/.claude/skills/triaging-issues/scripts/validate_labels.py), and [`labels.json`](https://github.com/pytorch/pytorch/blob/3176d8d66e3a7dabcd801cc117a6e492cbabf3ed/.claude/skills/triaging-issues/labels.json), whose repository uses composite BSD-style and third-party notices. Only the original target/action guard mechanism is used; no source code, project-specific polling, labels, target rules, retries, or mutation behavior is copied.

## Optional machine manifest

The manifest and `completion_guard.py` are useful when a task has many independently tracked requirements, a handoff requires a machine record, or a repository protocol requires it. They are not prerequisites for an ordinary bounded completion claim.

Within that optional schema:

- `changed_at` is a coarse shared freshness boundary; split manifests when that would otherwise cause unrelated reruns;
- `target_level` summarizes the highest required level;
- supporting `observed_at` values cannot precede the relevant boundary;
- publication evidence declares destination readback and stable-reference properties;
- the guard's maximum-age option is a machine policy, not a universal definition of freshness.

The guard validates internal consistency only. It cannot determine whether a locator is authentic, a test is semantically relevant, a destination is correct, or an omitted requirement matters.

## Evidence that never suffices alone

- an implementation plan;
- generated output that was not inspected;
- a tool call merely being issued;
- an agent or subagent self-report;
- a cached or pre-mutation result for affected work;
- a successful remote mutation command without destination readback;
- user silence;
- “looks correct” without a named subject and criterion;
- a manifest accepted by the deterministic guard.

## Additional design source

The separation of work scope from proportional verification was informed by OpenAI Agents Python's [`code-change-verification`](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/.agents/skills/code-change-verification/SKILL.md), [`runtime-behavior-probe`](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/.agents/skills/runtime-behavior-probe/SKILL.md), and [`final-release-review`](https://github.com/openai/openai-agents-python/blob/89c02c828ee8510fe9a84ee6675608193aa13b02/.agents/skills/final-release-review/SKILL.md) at revision `89c02c828ee8510fe9a84ee6675608193aa13b02` (MIT). The ladder, terminology, and contract here are independently written for this skill.
