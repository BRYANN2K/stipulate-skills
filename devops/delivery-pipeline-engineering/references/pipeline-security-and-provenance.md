# Pipeline security and provenance

## Trigger trust

Classify events as untrusted contribution, trusted branch/tag, scheduled/internal, or manually approved. Prevent untrusted code from influencing privileged jobs through checkout refs, artifacts, caches, outputs, comments, or workflow-command injection.

## Identity

Use short-lived OIDC/workload identity with audience, subject, repository, branch/tag, environment, and role constraints. Scope platform tokens per job. Separate build identity from deployment identity.

## Dependencies and executable inputs

Review:

- third-party actions/plugins/includes pinned to immutable revisions;
- base/build images pinned by digest where practical;
- package manager lock files and install modes;
- downloaded scripts/binaries with checksum/signature verification;
- reusable workflow versioning;
- self-hosted runner persistence and network access;
- cache keys and poisoning boundaries.

## Artifact chain

Capture commit → build definition → dependencies → builder identity → artifact digest → SBOM/provenance/signature → registry → deployed digest. Verify at the promotion/deployment boundary, not only at build time.

## Secret controls

Do not expose secrets to forked PRs, logs, command lines, artifacts, or caches. Use environment-scoped secret access. Treat masking as a last defense, not permission to print a secret.

## Exceptions

A bypass or non-blocking gate needs owner, reason, scope, expiry, compensating control, and audit trail. Permanent “temporary” exceptions are findings.
