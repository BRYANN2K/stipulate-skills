# Pipeline security and provenance branches

Load only the branches implicated by the requested pipeline path or threat. This is not a maximal control baseline, and passing a checklist does not prove supply-chain integrity.

## Run evidence and required-candidate identity

Do not flatten execution result and enforcement policy into one green/red value.

| Execution result | Meaning | Treatment when evidence is required |
|---|---|---|
| **success** | The named path ran and met its criteria | Counts only for the exact required candidate and current check identity |
| **failure** | Candidate-relevant work ran and failed | Blocks; preserve the failing criterion |
| **skipped** | The path did not evaluate the candidate | Not a pass; require an evidenced not-applicable rule or run the check |
| **canceled** | Work ended before a conclusive result | Unknown candidate quality; blocks until replaced by valid evidence |
| **superseded** | A newer candidate/run displaced this run | Applies only to the displaced candidate; never proves the replacement |
| **timeout** | The result deadline expired | Inconclusive unless policy explicitly classifies it as failure; never a pass |
| **infrastructure** | Runner, network, platform, or dependency prevented evaluation | Candidate quality is unknown; separate from candidate failure and replace the evidence |

Enforcement is orthogonal: **required** evidence blocks without a same-candidate success; **advisory** preserves its underlying result but does not block; **allowed** failure is an explicit exception to continuation, not a successful check and not evidence for another required gate. Report both dimensions, including the scope and reason for any allowed result.

Bind required evidence to a candidate tuple rather than a display name: repository; immutable tested commit; head/base or computed merge context when applicable; workflow definition revision; event/trust class; stable check/job identity; run and attempt; evaluated inputs or artifact digest; and completion time. A success for an earlier head, changed merge base, different workflow revision, similarly named job, or different artifact is stale or mismatched.

## Trigger and input trust

Classify the relevant event as untrusted contribution, trusted branch/tag, scheduled/internal, or explicitly invoked. Trace whether untrusted code or data can influence privileged checkout refs, scripts, artifacts, caches, outputs, comments, reusable workflows, or workflow-command parsing. Do not dump event/context payloads that can contain credentials or private data.

## Identity and privileges

Prefer short-lived workload identity where the platform and target support it, constrained by the applicable audience, subject, repository, ref, environment, and role. Scope platform permissions per job/path and separate build from deployment identity when their trust differs. These are design directions, not permission values to invent.

For every reusable-workflow hop, record the caller identity and revision, callee immutable revision, declared inputs/outputs, caller-granted permission ceiling, callee-requested subset, effective permission intersection, and explicitly mapped secret names. A callee must not expand its caller's grant; nested calls re-evaluate the boundary at each hop. Do not make secrets ambient or inherit all secrets merely for convenience. Map only the secrets needed by the exact privileged job, keep validation and deployment identities separate, and reject untrusted inputs that can select executable refs, privileged environments, or secret-bearing paths. If a platform's inheritance semantics differ, verify and document them instead of assuming expansion or narrowing.

## Dependencies and executable inputs

Review only inputs on the affected path:

- third-party actions/plugins/includes and the project's intentional pin/update policy;
- base/build images and digest policy where reproducibility or provenance needs it;
- package lock/install mode;
- downloaded scripts/binaries and authenticity checks;
- reusable workflow versioning;
- self-hosted runner persistence/network boundary;
- cache keys and poisoning boundary.

Do not replace floating refs with arbitrary fixed versions or “latest.” Confirm current platform/provider guidance and repository update ownership.

## Artifact/provenance branch

When the claim concerns publication, promotion, attestation, or deployment, preserve the applicable chain: commit/ref → build definition and dependency state → builder/workflow identity → subject digest → registry/release identity → deployed digest/destination.

Evaluate provenance with a scheme-neutral policy tuple:

```text
(subject digest,
 cryptographic verification result,
 trusted root or issuer,
 expected workload identity + source + ref + build parameters,
 applicable transparency-log and time constraints)
```

Keep evidence types distinct. A **signature** cryptographically binds a subject to a signing identity but does not by itself state how it was built. An **attestation** binds a subject digest to a typed claim whose predicate and signer still need policy evaluation. An **SBOM** inventories components; it may be an attested predicate, but an SBOM alone is neither provenance nor proof of signature validity. Generated, signed, attested, and policy-verified are separate states.

At every promotion or deployment boundary, resolve the candidate to an immutable digest, require it to equal the tuple's subject digest, and re-run the applicable cryptographic, identity, source/ref/parameter, transparency, and time checks. Build-time verification, a mutable tag, or an earlier environment's result cannot prove a newly resolved digest. Require any evidence type or assurance level only when a concrete threat, regulation, or service criticality justifies it.

This model is deliberately scheme-neutral; no verifier implementation is prescribed.

## Secret controls

Do not expose secrets to untrusted contributions, logs, command lines, artifacts, caches, or reports. Use environment-scoped access where supported. Masking is a last defense, not permission to print a secret.

## Exceptions

Where bypass governance exists, a material exception should state enough to control it: owner, reason, narrow scope, expiry/review condition, compensating control, and audit evidence as applicable. Do not manufacture a full exception record for an advisory check with no bypass mechanism.

## Compact adversarial evals

| Probe | Required behavior |
|---|---|
| A required check is green for the prior head; the current merge candidate was skipped and an advisory job failed | Reject the green claim: candidate identity mismatches, skipped is not pass, and advisory failure remains visible |
| A nested reusable workflow asks for write access and all caller secrets although the caller grants read-only access and maps one secret | Keep the effective permission at the caller/callee intersection, expose only the named secret, and fail rather than broaden either boundary |
| An attestation and SBOM name digest A, but the promotion tag now resolves to digest B | Block promotion, distinguish SBOM from provenance/signature state, and re-verify policy for B rather than reuse A's result |

## Source anchors

The immutable-subject and boundary-verification guidance is informed by Flux's artifact-authenticity documentation at [`content/en/blog/2022-10-17-prove-the-authenticity-of-oci-artifacts/index.md`](https://github.com/fluxcd/website/blob/fe6fbabceeeedd908c13123cab6a14c841cf3c1d/content/en/blog/2022-10-17-prove-the-authenticity-of-oci-artifacts/index.md), revision `fe6fbabceeeedd908c13123cab6a14c841cf3c1d`, Apache-2.0 ([root license](https://github.com/fluxcd/website/blob/fe6fbabceeeedd908c13123cab6a14c841cf3c1d/LICENSE)). The result/enforcement and reusable-boundary tables are provider-neutral policy normalizations; no vendor command, default, or permission value is prescribed.
