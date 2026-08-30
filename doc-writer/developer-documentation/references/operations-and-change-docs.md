# Operations and change documentation

Use only the sections that affect the documented operation or change, while inheriting the repository's runbook, release, and migration conventions.

## Runbook

An actionable runbook usually needs the trigger and scope, prerequisites and permission boundary, safe diagnosis, bounded actions, stop/escalation conditions, and a way to verify or recover. Add ownership, communications, cleanup, retained evidence, or shelf-life metadata when the operating model relies on them.

Keep shelf-life claims distinct. **Last reviewed** means someone checked the prose, owners, dependencies, and applicability. **Last tested** or **last exercised** means named steps were actually run or simulated; record the scope, environment, result, and material steps skipped. An editorial review must not refresh the exercised date, and a partial exercise must not imply the whole runbook was tested.

Separate observation from mutation. Put authorization and risk before state-changing commands. Never copy credentials, private payloads, or brittle production identifiers into examples. Exercise only affected safe paths; do not test against production merely to validate prose.

## Troubleshooting

Organize around symptoms readers can observe when that matches how they search. Pair plausible causes with discriminating checks, then the safest applicable remedy and verification. Stable exact error strings can aid lookup; do not invent or expose sensitive output.

## Migration and deprecation

Cover the details germane to the actual transition: source/target versions, supported path, breaking behavior, prerequisites, backups, phased steps, data/schema effects, downtime, validation, rollback limits, compatibility window, replacement, or removal condition. State irreversible transformations before the step. Test only changed examples or procedures in a safe environment, and label unavailable rollback evidence.

## Changelog, migration guide, and release notes

Follow the repository's format and keep each artifact's job clear:

- A **changelog** is the durable, version-indexed lookup record of notable changes.
- A **migration guide** is the task path from named source versions or states to a named target, with prerequisites, actions, validation, and rollback limits.
- **Release notes** prioritize and explain one release for a particular audience; they can summarize and link to the changelog and migration guide rather than duplicate both.

For a breaking change, name the compatibility surface that changed—for example an API, CLI, configuration key, data schema, wire format, supported runtime, or operator workflow—and provide the replacement or migration link when one exists. Check whether that surface was previously deprecated and whether the removal matches the project's compatibility policy. Report missing or unverifiable prior notice as a compatibility gap; do not invent a deprecation history. Do not claim an artifact is available before destination readback establishes it.

## Compact evals

- **Positive:** A changelog entry names the removed CLI flag and its prior deprecation release, links a source-to-target migration guide, and release notes explain the user impact without pretending to be the procedure.
- **Positive:** A runbook records a new review date after an ownership and dependency review, while its older exercised date remains tied to a scoped sandbox simulation and lists untested production-only steps.
- **Negative:** “Breaking changes” names no compatibility surface or prior-notice gap, and the same announcement is treated as changelog, migration procedure, and release notes.
- **Negative:** Fixing links refreshes “last tested” even though no runbook step was exercised.

## Source note

The change-artifact boundary and prior-deprecation check are independently worded from [`source/en/2.0.0/index.html.md` in Keep a Changelog at `0c1ac1d9`](https://github.com/olivierlacan/keep-a-changelog/blob/0c1ac1d9f350d97a26db0dcae35cfaa66f5f9b78/source/en/2.0.0/index.html.md) (MIT). The separate review/test dates are informed by [`docs/during/security_incident_response.md` in PagerDuty's incident-response docs at `464fc9d3`](https://github.com/PagerDuty/incident-response-docs/blob/464fc9d3e47e19e9d8da17cec1a41dc09624e95a/docs/during/security_incident_response.md) (Apache-2.0). The wording and artifact contracts here are original and do not require either project's format.
