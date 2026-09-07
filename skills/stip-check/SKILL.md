---
name: stip-check
description: Reconcile an applied change with every acceptance criterion using fresh, inspectable evidence.
license: Apache-2.0
metadata:
  version: "2.0.0"
  author: BRYANN2K
---

# stip-check

Read the approved contract and relevant extension check references. This stage evaluates the result; it does not redesign the feature or silently change requirements.

1. Exercise or inspect the actual behavior required by each criterion. A build proves compilation, not UX, authorization or deployment. Distinguish failures from unavailable checks.
2. Run `snapshot` after the last relevant source change. Create a results JSON outside the repository, or pass it through stdin: `{"subject_digest":"<snapshot digest>","criteria":[{"id":"AC-1","status":"passed","evidence":"<actual command/result or observation locator>"}]}`.
3. Run `check <id> --results <file-or-dash>`. Cover each criterion exactly once. Valid statuses are passed, failed, unverified, not-applicable; only all passed advances to checked. A not-applicable requirement needs a contract correction and reapproval rather than silent acceptance.
4. Report gaps. Corrections go through stip-apply when authorized, then a new check. When all criteria pass, proceed to stip-docs.

The command checks report consistency and working-tree identity. It cannot authenticate evidence or perform semantic verification itself. Never fabricate a report merely to advance state. Do not include credentials or private payloads in evidence.md.

## Runtime

Use the Python runtime bundled with this skill, independent of the current directory:

```text
python3 <this-skill-directory>/scripts/workflow.py --root <physical-project-root> <command>
```

Python 3.10+ and Git are required for implementation and archive. Run `--help` or `<command> --help` for exact arguments. The runtime is offline and never installs tools. System/developer instructions, current user intent and environment permissions remain authoritative.
