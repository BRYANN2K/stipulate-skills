# security-bughunting — check

The points below are **candidates**, not a mandatory checklist or already approved criteria. During explore/validate, the agent selects and reformulates useful candidates as actual, unique `AC-n` criteria in `spec.md`. During check, verify only that contract; do not add requirements on the fly. All verification runs on authorized fixtures, never against systems you do not own.

## Observable properties to adapt

- Untrusted input that reaches a query, command, path, template, or deserializer is neutralized by a control; a repeatable negative test fails on the vulnerable version and passes with the control in place.
- Each action's object-level and function-level authorization is enforced for the actual caller; a request for another principal's resource is refused with the expected status, shown by a repeatable test.
- Outbound requests and redirects resolve only to allowed destinations; a crafted host or path is refused.
- Rendered output in each context is encoded so injected markup or script is inert; a reflected or stored input does not execute.
- Secrets and sensitive data are absent from responses, logs, errors, and build artifacts; their source and rotation are identified.
- Dependencies and images in scope have versions or digests; issues blocking the change are fixed, or the contract is explicitly revised and reapproved with the residual risk and a dated follow-up.
- A deliverable artifact is linked to its commit and the controls actually executed; verification covers the tested artifact.

## Reconcile evidence

For each `AC-n`, compare observations with the expected outcome, recording the command or protocol, the environment and version, the data covered, and the limits. A file's existence, a test merely written, or a scanner finishing is not sufficient evidence of behavior. Distinguish a controlled reproduction, a real observation, and an objective that needs an operational observation period.

Counterexample to report: the authorized path is refused as intended, but the same resource is reachable by changing an identifier. Link the discrepancy to its criterion; correct it or report `failed` or `unverified`. Do not change a criterion or threshold to make it pass; a contract change requires revision and renewed approval. The core requires a report with the current subject digest and every exact criterion ID; it checks structure, statuses, and digests, not the truth of observations.
