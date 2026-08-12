# Contributing

Contributions are welcome when they make a workflow safer, more precise, or easier to verify.

## Before proposing a skill

A skill must change agent behavior in a way generic model knowledge does not reliably provide. Prefer improving an existing skill when the trigger and output contract overlap.

A good proposal answers:

1. What task triggers the skill?
2. What failure does the skill prevent?
3. What evidence must the agent inspect?
4. Which actions are read-only and which mutate state?
5. How is completion verified?
6. Which upstream sources influenced the workflow, and under what licenses?

## Required structure

```text
category/skill-name/
├── SKILL.md
├── references/   # optional
└── templates/    # optional
```

`SKILL.md` must:

- start with YAML frontmatter at byte zero;
- use a lowercase hyphenated `name` matching its directory;
- include a third-person `description` beginning with `Use when`;
- include `version`, `author`, and `license`;
- keep its always-loaded body focused on execution;
- link bulky or conditional material under `references/`;
- define safety boundaries, output format, pitfalls, and verification;
- avoid vendor telemetry, hidden network calls, and credentials;
- never treat a dry-run, plan, or successful command as authorization for a production mutation.

## Writing principles

- Prefer checkable instructions over “be careful” or “use best practices.”
- Separate observations, hypotheses, decisions, and actions.
- Include negative triggers: when the skill should not be used.
- Use exact completion criteria for every workflow phase.
- Keep examples realistic but free of secrets and proprietary identifiers.
- Do not hardcode time-sensitive version claims unless the workflow verifies them.

## Validation

```bash
python3 scripts/validate_skills.py
```

All checks must pass. If a required external tool is unavailable, document the skipped validation honestly rather than fabricating a successful result.

## Pull requests

Explain:

- the behavior changed;
- the failure mode prevented;
- the validation performed;
- any source or license added to `NOTICE.md`.
