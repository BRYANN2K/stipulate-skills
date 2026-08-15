# Web Craft workflow contract

## State machine

```text
draft
  -> system-ready
  -> system-approved
  -> build-allowed
  -> verified
```

| Phase | Meaning | Product UI writes |
|---|---|---|
| `draft` | Content, references, direction, and system artifacts are being authored | Blocked |
| `system-ready` | Eight required artifacts pass structural review checks | Blocked |
| `system-approved` | A human approval reference plus the exact presented artifact and workflow-scope digest are recorded | Blocked until compilation |
| `build-allowed` | The approved `PROJECT-UI.md` is compiled project-locally and current | Allowed in declared UI roots |
| `verified` | A structured quality report is recorded after the build gate | Allowed while digests remain current |

A change to any approved artifact or security-relevant workflow field—including `ui_roots`—makes `check-build` fail even if the manifest still names a later phase. Run `ready`, present the new snapshot, record a new approval, and recompile.

## Required review artifacts

All paths are relative to the target project:

| Key | Path | Owner skill |
|---|---|---|
| Product story | `.design-flow/artifacts/PRODUCT-STORY.md` | `product-story-and-copy` |
| Page copy | `.design-flow/artifacts/PAGE-COPY.md` | `product-story-and-copy` |
| Claims | `.design-flow/artifacts/CLAIMS.md` | `product-story-and-copy` |
| References | `.design-flow/artifacts/REFERENCE-LEDGER.md` | `design-direction` |
| Design system | `.design-flow/artifacts/DESIGN.md` | `design-system-first` |
| Tokens | `.design-flow/artifacts/tokens.json` | `design-system-first` |
| Components | `.design-flow/artifacts/COMPONENTS.md` | `design-system-first` |
| Project UI source | `.design-flow/artifacts/PROJECT-UI.md` | `design-system-first` |

The validator checks presence, minimum substance, JSON shape, unresolved template markers, project UI frontmatter, required sections, and exact digests. It cannot judge whether a visual direction is good, a claim is true, or a component is accessible; human and runtime review do that.

Final `verify` additionally requires `## Scope`, `## Evidence`, `## Findings`, and `## Final verdict`; unique six-column evidence rows with fresh passing checks; no failed, skipped, or unavailable evidence; no unresolved BLOCKER or MAJOR; and exactly one `PASS` or `PASS_WITH_NOTES`. The recorded report digest must remain current or the effective phase falls back to `build-allowed`.

## Commands

```bash
# Initialize
python3 <skill>/scripts/design_flow.py init \
  --root . --name "Example" --surface website --ui-root src

# Inspect
python3 <skill>/scripts/design_flow.py status --root . --json

# Freeze the human review set
python3 <skill>/scripts/design_flow.py ready --root .

# Only after direct human approval
python3 <skill>/scripts/design_flow.py approve \
  --root . --approver human --approval-ref "review:<specific reference>"

# Compile and open the product UI gate
python3 <skill>/scripts/design_flow.py compile --root .
python3 <skill>/scripts/design_flow.py check-build --root .

# Test one write path
python3 <skill>/scripts/design_flow.py guard-write --root . --path src/App.tsx

# Record final evidence
python3 <skill>/scripts/design_flow.py verify \
  --root . --report .design-flow/QUALITY-REPORT.md
```

`compile --replace` may overwrite an independently edited destination. Use it only after reconciling that destination and receiving explicit permission for the overwrite. Normally, edit `PROJECT-UI.md`, re-review, reapprove, and compile.

## Approval boundary

The script accepts `--approver human` and requires a specific reference, but a local process cannot authenticate the speaker. The agent must enforce the conversational rule: never invoke `approve` unless the user directly approved the presented review set. For hostile or untrusted writers, require code review, branch protection, and CI.

## CI integration

A repository-specific CI step should run `check-build` when a protected UI root changes. The workflow manifest owns the root list, but CI must decide how to detect a relevant diff for its platform. Do not hardcode one provider or base branch in this portable skill.

## Hermes hook

The optional `hermes_pre_tool_guard.py` consumes the documented `pre_tool_call` JSON payload. It:

- discovers the nearest ancestor containing `.design-flow/workflow.json`;
- checks paths from `write_file` and both patch modes;
- blocks direct edits to the generated project UI skill;
- blocks suspicious terminal mutation patterns before the build gate;
- returns `{}` outside initialized projects.

Copy `templates/hermes-hooks.yaml` into the active profile configuration and replace its script path. Use `fail_closed: true`. Because shell syntax is not fully parseable with a regular expression, the terminal guard is defense in depth, not a security sandbox.
