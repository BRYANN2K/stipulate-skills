# Discovery and profile selection

Use this reference only when repository evidence and the user's initial request do not fully define the bootstrap manifest. Ask the smallest coherent set of questions; do not run a fixed questionnaire when the answers already exist.

## Inspect first

Before asking, inspect applicable sources:

- `README`, project context, `AGENTS.md`, contribution rules, and existing ADRs;
- Terraform/OpenTofu files, Pulumi manifests, CloudFormation, Bicep, CDK, Ansible, Packer, Kubernetes, Helm, Kustomize, and Docker files;
- environment directories, backend configuration names, lock files, and ownership files;
- CI workflows and package/task definitions for validation commands;
- Git status and existing ignored/tracked boundaries.

Do not inspect secret values, `.env` contents, state contents, kubeconfig contents, private keys, or credential files. File names and key names are usually sufficient for discovery.

## Minimum decision set

Ask only about unresolved fields that change repository structure or operating boundaries.

| Decision | Why it matters | Safe fallback |
|---|---|---|
| Project name and one-line purpose | Names the source of truth and reader context | None; required |
| New project or adoption | Determines collision policy | `adopt` if a repository contains files |
| Stacks owned by this repository | Creates only relevant stack anchors | None; do not infer from installed tools |
| Environments | Defines the declared operating scope | None; do not invent `dev/staging/prod` |
| Deployment targets | Captures cloud, edge, on-premises, cluster, or other boundaries | Use an approved generic target when provider is undecided |
| Constraints | Preserves security, compliance, cost, availability, and ownership boundaries | Empty only if the user confirms none are known |
| Validation commands | Gives later agents an executable contract | Repository-native checks; otherwise ask or mark the decision open |
| Specification depth | Controls whether `specs/` is part of the foundation | `minimal` unless risk indicators apply |
| Documentation needed now | Avoids generating generic docs | Architecture only when it helps implementation; otherwise none |

Provider, region, state backend, public exposure, identity model, data residency, recovery objective, and budget can be structural decisions, but only ask for them when they govern the requested repository. Record unresolved decisions instead of choosing defaults.

## Profile decision

Choose `minimal` when all are true:

- scope is small and understood;
- change is reversible;
- one team owns the repository;
- no migration or production cutover is being designed;
- no material compliance or cross-system contract exists;
- implementation can be reviewed from the project contract and code.

Choose `spec-driven` when any is true:

- multiple teams, repositories, providers, or control planes must coordinate;
- a migration, state move, data transition, or production cutover is expected;
- a hard-to-reverse architecture decision remains;
- compliance, approval, or audit evidence is required;
- requirements and non-goals need explicit acceptance criteria;
- several active changes can conflict or require ordering.

Profile selection does not authorize OpenSpec. Use `generic` unless the user or existing repository explicitly chooses `openspec`.

## Stop conditions

Do not scaffold when:

- the project name or purpose is unknown;
- selected stacks contradict the repository evidence;
- environments or targets materially affect structure but remain implicit;
- a non-empty target was requested as `init`;
- existing project contracts would be replaced;
- the requested structure would expose credentials, state, customer data, or private methodology;
- the user expects infrastructure deployment rather than repository bootstrap.

Return the unresolved decisions and the smallest next question set instead.
