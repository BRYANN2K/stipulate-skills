# Software bootstrap contract

## Manifest fields

| Field | Contract |
|---|---|
| `schema_version` | Exactly `1.0` |
| `project.name` | Lowercase kebab-case |
| `project.summary` | Factual non-empty summary |
| `project.kind` | `website`, `web-application`, `dashboard`, `terminal-ui`, `command-line-tool`, `desktop`, `api`, `backend`, `library`, `package`, or `other` |
| `profile` | `minimal` or `spec-driven` |
| `languages` | At least one observed/selected lowercase identifier |
| `package_managers` | Zero or more observed/selected lowercase identifiers; no default is inferred |
| `source_roots` | At least one literally canonical portable repository-relative path with no alias or generated-file hierarchy conflict |
| `test_roots` | At least one literally canonical portable repository-relative path with no exact, Unicode-normalized case-folded, or generated-file hierarchy conflict |
| `documentation` | Any of `architecture`, `adr`, `api`, `handover` |
| `spec_workflow` | `none`, `generic`, or `openspec`; `spec-driven` cannot select `none` |
| `validation` | Unique IDs with command strings; declarations only |
| `constraints` | Approved non-secret constraints |
| `open_decisions` | Unresolved decisions kept visible |

Unknown and duplicate JSON keys fail closed. Absolute, traversal, empty, current-directory, `.git`, backslash-separated, and non-canonical aliases such as `./src`, `src/`, `src//nested`, or `src/./nested` are rejected rather than normalized. Before a plan can be `READY`, the complete generated path graph rejects ancestor/descendant conflicts and Unicode-normalized case-folded aliases. The same normalized, case-folded comparison is made against entries already present in an existing target tree; an unreadable inventory blocks planning. Existing names are not reflected in the diagnostic. All manifest strings are scanned after bounded ASCII canonicalization. The credential filter rejects direct and repeated-quote serialized assignments, dot- or space-separated names, compact identifiers in any case with environment or version affixes, credential-bearing URIs, bounded-punctuation Basic/Bearer wrappers, and the documented encoded forms without reflecting their values. Unsupported values are reported by field and count rather than echoed. The filter remains deliberately conservative and cannot prove that arbitrary encoded text is secret-free; direct inspection remains mandatory.

## Mode invariants

### `init`

- Target may be absent or empty.
- Any non-empty target blocks the plan.
- Planning does not create the root.

### `adopt`

- Target must exist and be non-empty.
- User-owned content remains untouched.
- Missing managed files may be created.
- Exact generated content is unchanged.
- Different non-managed content blocks.
- Only the marked `.gitignore` block may be updated.
- A nested `.gitignore` with a negation rule, unreadable content, or an unsafe file boundary blocks planning before any managed write.

### `doctor`

- Read-only by contract.
- Reads `software-project.json`, generated contracts, required anchors, and ignore safety.
- Never executes validation strings.
- Returns `commands_executed: []`.

## Digest boundary

The plan digest binds:

- validated manifest content;
- mode;
- requested and resolved roots;
- status and collisions;
- every managed path's observed state;
- current content digest when readable;
- desired content digest;
- planned action.

Apply recomputes this state and fails on mismatch. It preflights root resolution, target safety, and every expected current digest before mutation. In `init` mode it prepares the complete tree in a sibling temporary directory and atomically renames that tree into place; preparation failure leaves the target absent or empty as originally observed. In `adopt` mode it snapshots only managed paths, journals each intended mutation before writing, and rolls those paths back in reverse order on failure. A failed rollback is reported explicitly rather than claimed as clean. These controls detect ordinary drift and bound write failures in a trusted local workspace; they cannot remove the final race against a hostile concurrent process.

## File ownership

Managed files are:

- `software-project.json`;
- `PROJECT.md`;
- `AGENTS.md`;
- the marked root `.gitignore` block;
- selected root `.gitkeep` anchors;
- selected documentation `README.md` anchors;
- optional `specs/README.md`.

No package manifests, source code, tests, CI, editor configuration, framework files, Git metadata, lockfiles, or deployment configuration are owned by this bootstrap.
