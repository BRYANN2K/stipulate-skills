# Claim patterns

Choose the smallest relevant checks that test the user's actual requirement. These patterns are examples, not mandatory batteries; inherit repository commands and omit unaffected checks.

## Code change or bug fix

| Claim | Required proof |
|---|---|
| Implemented | Current diff or source inspection shows the intended change |
| Executed | Changed path is invoked, compiled, or run |
| Verified | Original reproduction fails before and passes after, or an equivalent regression test passes on current code |
| Published | Commit or release is remotely present and read back by SHA or release ID |

Never call a bug fixed solely because the new test passes if the test was never shown to reproduce the failure or otherwise exercise the defect.

## CLI or service

1. Inspect the implementation and configuration.
2. Start or invoke the current artifact.
3. Exercise one success path and relevant failure path.
4. Check output, exit status, and side effects.
5. For a service, verify readiness before the behavior test.
6. Stop temporary processes and report cleanup.

A process merely starting is `EXECUTED`, not proof that its behavior is correct.

## Document or Markdown

1. Confirm required sections and content exist.
2. Parse or lint when tooling exists.
3. Validate links and references.
4. Render when layout, tables, diagrams, or visual hierarchy matter.
5. Compare the final artifact after the last edit.

A Markdown parser supports syntax validity. It does not prove factual accuracy or readable rendering.

## SVG or visual artifact

1. Parse the SVG/XML.
2. Render to a raster or browser surface.
3. Inspect at the intended dimensions.
4. Check requested removals, clipping, overlap, contrast, and text legibility.
5. Re-render after a geometry change that could affect the visual claim.

Source inspection alone reaches `IMPLEMENTED`; rendered inspection is needed for `VERIFIED` visual claims.

## Git commit and push

| Claim | Direct check |
|---|---|
| Committed | `git rev-parse HEAD` and `git show --stat HEAD` |
| Pushed | fetch, then compare `HEAD` with the intended remote ref |
| Clean | `git status --short --branch` |
| Publicly available | fetch the commit or file through the intended remote/public interface |

A local commit is not pushed. A successful `git push` message should still be followed by remote ref readback.

## CI and asynchronous review

Use an immutable workflow run ID and candidate identity. Confirm:

- the run's commit/merge candidate is the intended current subject;
- progress and terminal state are not conflated;
- required jobs completed successfully rather than being skipped, canceled, superseded, timed out, or merely allowed to fail;
- infrastructure failure remains distinct from candidate failure;
- required review or feedback that arrived after an earlier green run has been addressed on the current subject;
- bounded retries follow repository policy and do not run until a favorable result appears.

A green workflow for an earlier commit, changed merge candidate, or superseded run is stale. A newly green run does not erase unresolved review feedback.

Adversarial cases: the required check was renamed and silently skipped; a flaky retry passed on a new head; all tests are green but required review arrived afterward; a runner outage is reported as a product regression or success. Preserve the exact state rather than upgrading any of these to verified completion.

## Package or release

1. Build the distributable from the intended commit.
2. Install it into a clean temporary environment.
3. Execute a representative command or import.
4. Publish only when authorized.
5. Query the exact registry, version, channel, and release ID named by the claim.
6. Download or install from that published source and verify content/version.

A release page existing does not prove the package can be installed. A protocol compatibility claim similarly needs an exchange and readback at the exact endpoint/version named by the claim; a default or `latest` target is not a substitute.

## Deployment

1. Identify the exact environment and intended version.
2. Deploy only with authorization.
3. Read back the deployment/version ID.
4. Wait for readiness using a bounded check.
5. Exercise the changed behavior through the deployed endpoint.
6. Inspect health and relevant error signals.
7. Record rollback status when required.

A control plane reporting “deployed” without behavior or health readback is not enough for `PUBLISHED` completion.

## External API or cloud object

After create/update/delete:

- retrieve the resource by stable ID;
- compare relevant fields, not secret values;
- for deletion, verify not-found or the documented terminal state;
- distinguish eventual consistency from failure with bounded retries;
- record the destination account/project/region without exposing credentials.

## User-facing publication

Verify both delivery and presentation:

- immutable post/page/object identifier;
- intended visibility and destination;
- fetched content or content hash;
- media and links present;
- no draft-only or preview-only state.

Do not claim public visibility when verification was authenticated-only unless that is the requested audience.

## Blocked verification

Use `BLOCKED` when an external dependency prevents required proof, for example:

- login wall or missing authorization;
- unavailable network or destination;
- manual approval still pending;
- required hardware absent;
- third-party outage.

State what was implemented, the highest achieved level, the exact missing proof, and the next action. Never replace the blocked check with a plausible-looking surrogate.

## Compact evaluation cases

| Case | Expected classification |
|---|---|
| A run is queued or still executing | Progress only; terminal proof is missing. |
| CI is green for commit A after the branch moved to commit B | The green result is stale and only qualifies evidence about A. |
| Current-head CI is green, then required review posts a blocking finding | The review is contradicting evidence; completion remains open. |
| A runner outage is followed by one authorized, policy-bounded retry on the same head | Preserve both attempts, classify the first as infrastructure failure, and use the second only for what it directly proves. |
| A branch test fails reproducibly while runners are healthy | Classify it as branch/candidate failure; do not retry until green or call it infrastructure noise. |
| A release exists on a preview channel but the claim names the stable registry/channel or protocol target | Exact-target readback is missing; do not claim `PUBLISHED`. |
| An action is allowlisted but the pre-effect repository, issue, account, or environment identity differs | Stop before the effect; the allowlist neither authorizes nor repairs the target mismatch. |

These are prose evaluation prompts, not a required harness, retry loop, or completion manifest.
