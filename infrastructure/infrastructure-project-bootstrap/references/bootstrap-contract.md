# Optional hardened helper contract

`infrastructure-project.json` is the optional deterministic helper input and its generated machine-readable source of truth. This contract applies only when the hardened helper route is selected; direct/project-native bootstraps do not need this manifest. A manifest or helper run is scaffolding, not proof of architecture quality.

The helper accepts exact fields only, rejects duplicate JSON keys, validates slugs, and rejects secret-like assignments, credential-bearing URI userinfo, and Basic/Bearer authorization headers. It canonicalizes common serialized ASCII escapes only in a temporary scan copy so equivalent quoted, Unicode-escaped, hex-escaped, percent-escaped, and repeatedly escaped representations cannot bypass these checks; that canonical scan copy never replaces the accepted text. Token-only userinfo is rejected for URI schemes other than an explicitly permitted username-only `ssh://username@host/path` locator, while userinfo containing `username:password` is rejected for every scheme. These are conservative leak-prevention checks rather than a complete secret scanner; keep all real credentials out of every field. It uses no network and executes no declared command.

## Helper schema

| Field | Type | Contract |
|---|---|---|
| `schema_version` | string | Must be `1.0` |
| `project` | object | Exact fields: `name`, `summary` |
| `profile` | string | `minimal` or `spec-driven` |
| `stacks` | string array | Non-empty, unique supported stack IDs |
| `environments` | string array | Non-empty, unique lowercase kebab-case IDs |
| `deployment_targets` | string array | Non-empty, unique lowercase kebab-case IDs |
| `documentation` | string array | Any unique subset of `architecture`, `adr`, `handover`, `runbooks` |
| `spec_workflow` | string | `none`, `generic`, or `openspec` |
| `validation` | object array | Unique command contracts; may be empty when commands are not yet known |
| `constraints` | string array | Approved project constraints; no secret values |
| `open_decisions` | string array | Unresolved structural decisions visible to later work |

Unknown and missing fields fail validation. This keeps typos and silently ignored decisions out of generated artifacts.

## Revisioned replay and three-way classification

For a hardened profile that will support later generator updates, record two identities in its existing ownership metadata or review record:

- the manifest/input `schema_version`; and
- an immutable `generator_revision` (template revision), such as a content digest or source commit.

The revision tuple identifies how the last helper-owned output was produced; it is not execution authorization. Do not add a sidecar solely for this bookkeeping, and do not substitute the currently installed helper version for the recorded version. The bundled `1.0` schema records the schema revision but not an immutable generator revision, so the bundled helper intentionally keeps its existing two-way, fail-closed collision behavior. Do not claim three-way update safety from that helper until a compatible revision-aware integration supplies the missing identity and can reproduce the base.

Where revision-aware replay is available, classify each helper-owned path using content or absence in three snapshots:

- **base** — output reproduced from the recorded schema, generator revision, manifest, and answers;
- **current** — the file now present in the target tree;
- **new** — output from the explicitly selected new schema/generator and inputs.

Use those comparisons rather than ownership labels alone:

- `current == base` and `new != base`: generator drift only; preview the generated update;
- `current != base` and `new == base`: local drift in a helper-owned path; preserve it and require an ownership decision;
- both `current` and `new` differ from `base`: preserve non-overlapping edits when the integration can prove a merge, otherwise report a user collision;
- no reproducible `base`, an unrecorded revision, or an ambiguous add/delete: collision/unknown, never permission to overwrite;
- `current == new`: converged, even if both differ from `base`.

This is classification, not a mandate to auto-merge. Symlink, path-escape, private-data, and ownership stops still apply.

### Compact adversarial examples

- Recorded generator `g1` produced `PROJECT.md=A`; the tree still contains `A`; `g2` produces `B`. This is generator drift, not a user collision, but the diff still needs review.
- Base is `A`, current is a human edit `C`, and new generator output is `B`. Calling `C` merely “stale generated content” and overwriting it is a failure; report a collision.
- Current and new both contain `B`, but the old generator cannot be retrieved. The path is converged, yet the integration still cannot claim it reconstructed or validated the historical base.

## Supported stacks

- `ansible`
- `aws-cdk`
- `bicep`
- `cloudformation`
- `docker`
- `helm`
- `kubernetes`
- `kustomize`
- `opentofu`
- `packer`
- `pulumi`
- `terraform`

A stack entry creates only an `infra/<stack>/.gitkeep` anchor. It does not generate provider configuration or install the tool.

## Validation commands

Each item has exact fields:

```json
{
  "id": "format",
  "command": "tofu fmt -check -recursive"
}
```

IDs must be unique lowercase kebab-case. Commands are stored as untrusted documentation and rendered in `PROJECT.md` and `AGENTS.md`; their presence is not execution authorization. An empty array is valid but makes `doctor` return `WARN`; keep the missing contract visible in `open_decisions`. The helper and doctor never execute commands because a manifest is data, not a trusted shell program.

## Helper-generated files

When the helper route is used, these are always planned:

- `infrastructure-project.json`
- `PROJECT.md`
- `AGENTS.md`
- `.gitignore`
- `infra/<stack>/.gitkeep` for each selected stack

Conditional:

- `docs/<type>/README.md` for selected documentation;
- `specs/README.md` when profile is `spec-driven` or `spec_workflow` is not `none`.

No provider resource, CI workflow, Git repository, commit, package, OpenSpec workspace, credential, state backend, or live operation is generated.

## Collision semantics

### `init`

The root may be absent or empty. Any entry in an existing root blocks the plan. This prevents accidental initialization inside the wrong directory.

### `adopt`

- the root must already exist as a non-empty directory; use `init` for an absent or empty root;
- missing generated files are planned as `create`;
- identical generated files are `unchanged`;
- `.gitignore` is the only file that can be `update`;
- the helper appends or refreshes one marked managed block while preserving user content outside it;
- any negation rule after that block is ambiguous and blocks planning or fails doctor, even when unrelated, because the standard-library helper does not reproduce Git's complete ignore engine;
- any differing generated file is a collision;
- files, directories, or parent paths that are symlinks block the affected target.

There is no force flag. Resolve ownership explicitly rather than bypassing collisions.

## Plan digest

The plan digest binds:

- normalized manifest content;
- mode;
- absolute requested root and its resolved destination;
- each actionable or conflicting generated target's observed content digest, absence, or unavailable-state reason;
- desired content digest;
- collision state and per-target observations.

`apply` recomputes the plan and requires the exact reviewed digest. A manifest edit, retargeted root ancestor, new target, changed target, or symlink invalidates the preview and digest. Unrelated files outside the planned paths do not.

The digest is a review-consistency mechanism, not a cryptographic authorization system. A direct request to bootstrap the bounded local file set supplies local-write authority; the digest does not add or replace that authority. A changed digest, root, collision, or scope still requires resolution before writing.

## Doctor semantics

`doctor` reads the generated manifest and reports:

- manifest validity;
- presence and safety of required artifacts;
- whether generated `PROJECT.md` and `AGENTS.md` still match the manifest, ignoring LF/CRLF differences;
- managed `.gitignore` exclusions and the absence of later root or nested `.gitignore` negation rules;
- declared open decisions;
- count of validation commands.

It returns narrow helper-conformance statuses:

- exit `0`, `PASS` when all structural checks pass;
- exit `0`, `WARN` when open decisions remain or no validation commands are declared;
- non-zero, `FAIL` for missing or unsafe required structure.

It always reports an empty `commands_executed` array. `PASS` means only that helper-owned structure matches this contract; it does not establish that commands work, architecture is correct, infrastructure is safe, or any live environment exists.

The `.gitignore` check is deliberately conservative. It scans readable nested `.gitignore` files without following symlinked directories and fails if one is unreadable, unsafe, or contains any negation rule. This avoids claiming that sensitive runtime or state paths remain excluded when a closer per-directory rule could reinclude them. It does not make ignored files secret, and it does not protect files already tracked by Git.

## Threat boundary

The helper protects generated target paths from ordinary collisions and symlink traversal. It does not defend against a concurrent hostile process with permission to mutate the same directory between individual writes. Run it in a trusted local workspace and inspect the final artifacts.

## Source notes

The revision ledger and base/current/new reasoning above are independent guidance informed by Copier at commit [`5f71fad40920cd03f0fe6bf2292daa43cf089fff`](https://github.com/copier-org/copier/tree/5f71fad40920cd03f0fe6bf2292daa43cf089fff) (MIT), especially [`docs/updating.md`](https://github.com/copier-org/copier/blob/5f71fad40920cd03f0fe6bf2292daa43cf089fff/docs/updating.md), [`copier/_main.py`](https://github.com/copier-org/copier/blob/5f71fad40920cd03f0fe6bf2292daa43cf089fff/copier/_main.py), [`copier/_subproject.py`](https://github.com/copier-org/copier/blob/5f71fad40920cd03f0fe6bf2292daa43cf089fff/copier/_subproject.py), and the collision cases in [`tests/test_updatediff.py`](https://github.com/copier-org/copier/blob/5f71fad40920cd03f0fe6bf2292daa43cf089fff/tests/test_updatediff.py). The terms and helper contract here are project-specific paraphrases, not copied Copier behavior or a claim that the bundled helper implements Copier.
