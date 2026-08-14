# Bootstrap contract

`infrastructure-project.json` is both the helper input and the generated machine-readable source of truth. The helper accepts exact fields only, rejects duplicate JSON keys, validates slugs, and rejects secret-like assignments, credential-bearing URI userinfo, and Basic/Bearer authorization headers. It canonicalizes common serialized ASCII escapes only in a temporary scan copy so equivalent quoted, Unicode-escaped, hex-escaped, percent-escaped, and repeatedly escaped representations cannot bypass these checks; that canonical scan copy never replaces the accepted text. Token-only userinfo is rejected for URI schemes other than an explicitly permitted username-only `ssh://username@host/path` locator, while userinfo containing `username:password` is rejected for every scheme. These are conservative leak-prevention checks rather than a complete secret scanner; keep all real credentials out of every field. It uses no network and executes no declared command.

## Top-level schema

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

## Generated files

Always planned:

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

`apply` recomputes the plan and requires the exact reviewed digest. A manifest edit, retargeted root ancestor, new target, changed target, or symlink invalidates approval. Unrelated files outside the planned paths do not.

The digest is a review-consistency mechanism, not a cryptographic authorization system and not a substitute for user approval.

## Doctor semantics

`doctor` reads the generated manifest and reports:

- manifest validity;
- presence and safety of required artifacts;
- whether generated `PROJECT.md` and `AGENTS.md` still match the manifest, ignoring LF/CRLF differences;
- managed `.gitignore` exclusions and the absence of later root or nested `.gitignore` negation rules;
- declared open decisions;
- count of validation commands.

It returns:

- exit `0`, `PASS` when all structural checks pass;
- exit `0`, `WARN` when open decisions remain or no validation commands are declared;
- non-zero, `FAIL` for missing or unsafe required structure.

It always reports an empty `commands_executed` array.

The `.gitignore` check is deliberately conservative. It scans readable nested `.gitignore` files without following symlinked directories and fails if one is unreadable, unsafe, or contains any negation rule. This avoids claiming that sensitive runtime or state paths remain excluded when a closer per-directory rule could reinclude them. It does not make ignored files secret, and it does not protect files already tracked by Git.

## Threat boundary

The helper protects generated target paths from ordinary collisions and symlink traversal. It does not defend against a concurrent hostile process with permission to mutate the same directory between individual writes. Run it in a trusted local workspace and inspect the final artifacts.
