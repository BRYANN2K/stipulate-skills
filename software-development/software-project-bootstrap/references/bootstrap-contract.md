# Optional deterministic bootstrap profile

This reference documents only the bundled `bootstrap_project.py` helper and its JSON templates. It is a hardened, deterministic option for repeatable multi-file scaffolding or complex adoption—not the default contract for every bootstrap task. Direct bounded scaffolding may skip the manifest, plan digest, generated files, and doctor entirely.

Using the helper does not create a second approval requirement. If the user's existing bootstrap request already covers the unchanged `READY` plan, `apply` may proceed. Pause only when the plan adds unrequested files, exposes a collision, changes a material decision, or crosses the authorized boundary.

## Helper manifest schema

| Field | Bundled helper contract |
|---|---|
| `schema_version` | Exactly `1.0` |
| `project.name` | Lowercase kebab-case |
| `project.summary` | Factual non-empty summary |
| `project.kind` | One of the helper's website, web-application, dashboard, terminal-ui, command-line-tool, desktop, api, backend, library, package, or other labels |
| `profile` | `minimal` or `spec-driven` within this helper |
| `languages` | At least one observed/selected lowercase identifier |
| `package_managers` | Zero or more observed/selected identifiers; none is inferred |
| `source_roots` / `test_roots` | Literally canonical portable repository-relative paths compatible with the helper's generated graph |
| `documentation` | Optional helper-owned architecture, ADR, API, or handover anchors |
| `spec_workflow` | `none`, `generic`, or an already selected OpenSpec choice; `spec-driven` cannot select `none` |
| `validation` | Unique IDs and command declarations; the helper never executes them |
| `constraints` / `open_decisions` | Approved non-secret constraints and visible unresolved decisions |

These enumerations are helper vocabulary, not required project taxonomy. Do not translate an existing repository to fit them. Unknown/duplicate JSON keys, unsafe/non-canonical paths, generated-path aliases/conflicts, unreadable inventory, and credential-like values fail closed. The filters and bounded canonicalization are defensive syntax checks, not proof that arbitrary content is safe or semantically correct.

## Helper modes

### `init`

- Target is absent or empty.
- A non-empty target blocks this mode.
- Planning does not create the root.

### `adopt`

- Target exists and is non-empty.
- User-owned content remains untouched.
- Missing helper-managed files may be created.
- Different content outside the managed update rule blocks rather than overwrites.
- Only the marked root `.gitignore` block may be updated by the helper.
- Unsafe nested ignore rules, unreadable content, symlinks, and path conflicts block before managed writes.

### `doctor`

- Read-only structural comparison against a helper-generated manifest.
- Never executes validation strings and reports an empty executed-command list.
- `PASS`, `WARN`, and `FAIL` describe only the helper-managed foundation.

## Digest and write boundary

The helper plan digest binds the validated manifest, mode, requested/resolved roots, status/collisions, and every managed path's observed and desired state. `apply` recomputes that state and fails on mismatch.

In `init`, the helper prepares the complete managed tree beside the target and installs it by rename. In `adopt`, it journals only managed paths and attempts reverse-order restoration on failure. A failed restoration is reported, not hidden. Per-file replacement and digest checks reduce ordinary drift; they do not provide a transaction across arbitrary user files or defend against a hostile concurrent local writer.

## Helper-managed files

Depending on template choices, the helper can manage:

- `software-project.json`;
- `PROJECT.md`;
- `AGENTS.md`;
- the marked root `.gitignore` block;
- selected `.gitkeep` roots;
- selected documentation `README.md` anchors;
- optional `specs/README.md`.

No package manifest, source behavior, tests, CI, editor configuration, framework file, Git metadata, lockfile, dependency, or deployment configuration is owned by this helper. Do not generate all managed files merely because the helper can; use direct scaffolding when fewer artifacts better fit the request.
