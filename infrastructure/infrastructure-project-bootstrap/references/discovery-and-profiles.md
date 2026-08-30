# Discovery and optional profile selection

Use this reference only when repository evidence and the request do not define the files being created. Ask the smallest coherent question; do not run a fixed questionnaire or make the optional helper schema a prerequisite for direct authoring.

## Inspect only what can change the result

Applicable evidence can include:

- project context, repository instructions, contribution rules, and established ADRs;
- IaC manifests, lock files, environment directories, and generated-file ownership;
- CI/task definitions that establish validation commands;
- Git status and ignore/tracked boundaries;
- existing project contracts and documentation structure.

Do not inspect `.env`, state, kubeconfig, private key, credential, customer-data, or other private contents. Names, key names, references, and established documentation are normally sufficient.

## Decision budget

A decision is required now only when it changes the requested file set, path ownership, security boundary, or meaning of the artifact being written. Other unknowns can remain explicit and deferred.

Potential decisions—not a mandatory questionnaire—include:

| Decision | Ask when | Safe handling |
|---|---|---|
| Target root and new/adopt posture | Collision behavior is unclear | Treat a non-empty root as adoption |
| Project name/purpose | The artifact needs identity/context | Inherit repository identity; otherwise ask only for the missing label |
| Stacks owned here | A stack directory or command is being created | Do not infer from installed tools |
| Environments/targets | They change directories, ownership, or safety rules | Omit or record open; never invent `dev/staging/prod` |
| Constraints | They govern the requested artifact | Preserve sourced constraints; do not fabricate policy |
| Validation commands | A durable executable contract is requested | Use repository-native commands or leave unknown |
| Specification depth | Cross-team or hard-to-reverse decisions need a durable surface | Default to the smallest project-native artifact |
| Documentation | It has a current reader/job | Do not create empty generic documentation sets |

Provider, region, backend, public exposure, identity, data residency, recovery, and budget can be structural decisions, but ask only when they govern the requested bootstrap output.

## Optional helper profiles

The deterministic helper supports two profiles because its generator needs a closed schema:

- **`minimal`** — small repository foundation and selected stack/document anchors;
- **`spec-driven`** — the same helper-owned foundation plus a generic specification anchor.

These profiles do not constrain direct/project-native bootstraps. `spec-driven` is useful when multiple systems or teams coordinate, a migration/cutover/state move is expected, durable compliance/acceptance evidence is required, or hard-to-reverse decisions need an explicit home. It is not required merely because production is mentioned.

Selecting a profile does not authorize installing or initializing OpenSpec. Use the repository's existing specification system when one exists.

## File-safety stops

Stop the selected write—not necessarily the entire bootstrap—when:

- the path escapes the requested root or traverses a symlink;
- current content has conflicting ownership or would be overwritten;
- the requested output would include credentials, state, customer data, or private methodology;
- a newly discovered structural choice changes the requested outcome;
- the requested next step is actually a dependency install, privileged/live operation, deployment, release, push, or publication.

Return the concrete conflict or smallest next question. Optional architecture unknowns that do not affect the selected local files should not block a useful minimal result.
