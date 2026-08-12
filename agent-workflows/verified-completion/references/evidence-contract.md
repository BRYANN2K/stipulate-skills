# Evidence contract

Use this reference to select and evaluate completion evidence. Evidence is a scoped observation, not a confidence statement.

## Five evidence properties

| Property | Question | Failure example |
|---|---|---|
| Relevant | Can this check fail when the requirement is broken? | `git diff --check` used to claim business logic works |
| Fresh | Was it observed after the last relevant mutation? | tests passed before the final patch |
| Direct | Did it inspect the artifact or destination itself? | another agent says the deployment succeeded |
| Inspectible | Is there a command, path, hash, ID, URL, or artifact? | “I checked it carefully” |
| Scoped | Is the claim limited to what the check proves? | one unit test becomes “all tests pass” |

Evidence missing any required property cannot support a completion upgrade.

## Cumulative levels

### `IMPLEMENTED`

Requires current inspection of the requested artifact or state.

Good evidence kinds:

- `artifact`: file, generated output, database object, configuration, or resource exists and was inspected;
- `diff`: current change contains the expected scoped modification;
- `inspection`: structured source or state inspection supports the requirement.

This level does not prove the artifact runs.

### `EXECUTED`

Requires `IMPLEMENTED` plus a real execution against the current artifact.

Good evidence kinds:

- `command`: requested operation ran with a recorded exit/result;
- `test`: relevant test process executed;
- `build`: build or compilation process executed;
- `smoke`: minimal end-to-end invocation executed;
- `parser`: machine parser consumed the artifact;
- `render`: renderer produced an inspectable output;
- `lint`: linter processed the current artifact.

Execution alone does not prove the acceptance criteria were sufficient.

### `VERIFIED`

Requires implementation plus relevant acceptance evidence. For executable work, it also requires execution.

Good evidence kinds:

- `test`: a test targets the changed behavior or regression;
- `build`: successful build is an acceptance criterion for the artifact;
- `smoke`: externally observable behavior matches the requirement;
- `parser`: format validity is the actual requirement;
- `render`: output was rendered and inspected for visual criteria;
- `lint`: lint cleanliness is an explicit criterion;
- `acceptance`: requirement-specific behavior was checked;
- `git`: branch, diff, commit, or clean-state claim was queried directly.

A check can support `VERIFIED` only when its scope matches the requirement. A parser does not prove visual quality; a screenshot does not prove accessibility; a unit test does not prove deployment.

### `PUBLISHED`

Requires `VERIFIED` plus at least one `remote` evidence item with:

- `immutable_reference: true`;
- `read_back: true`;
- a locator naming the destination and stable identifier.

Examples: remote commit SHA read from the remote ref, release ID fetched from the release API, deployment ID plus live health readback, uploaded object version fetched from storage.

## Freshness boundary

`changed_at` represents the newest mutation relevant to the requirements in the manifest. Every supporting `observed_at` must be equal to or later than it.

`target_level` must equal the highest `required_level` in the manifest. It is a summary of the completion contract, not an aspirational label.

For large tasks, split manifests when requirements have independent mutation boundaries. Do not set an artificially old `changed_at` to preserve stale checks.

The guard also applies a maximum observation age. Increase it only when a legitimately long-running workflow requires it, and explain why.

## Baseline and historical failures

Keep historical failed attempts outside the current supporting evidence list. A satisfied requirement should contain only evidence for the current state. Mention useful historical failures in notes or debugging records, not as current completion proof.

If the repository had pre-existing failures:

1. record the baseline command and result;
2. run the same scoped command after the change;
3. identify new failures separately;
4. never convert a failing baseline into a passing result.

## Evidence locators

Use concise locators, not raw output:

- `command: python3 -m unittest ...; exit=0`
- `path: dist/app.js; sha256:<digest>`
- `git: HEAD=<sha>; origin/main=<sha>`
- `ci: run <id>; conclusion=success`
- `url: <immutable or destination URL>; HTTP 200; content hash=<digest>`

Do not store secret values, authorization headers, cookies, customer payloads, private logs, or full command transcripts in a completion manifest.

## Evidence that never suffices alone

- an implementation plan;
- generated code that was not inspected;
- a tool call merely being issued;
- an agent or subagent self-report;
- a cached or pre-mutation result;
- a successful upload, push, or deploy command without destination readback;
- user silence;
- “looks correct” without naming the inspected artifact and criterion;
- a manifest that passes the deterministic guard.
