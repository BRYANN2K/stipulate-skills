# Privacy and sanitization

Apply this boundary before private persistence and again before any optional editorial mining.

## Ignored is not confidential

A repository-root `.gitignore` rule or an explicitly selected repository-local `$GIT_DIR/info/exclude` rule, plus restrictive file mode, reduces accidental Git commits and casual local access. A local exclude is unshared, not stronger secrecy. Neither policy protects against malware, a shared account, backups, editor/cloud sync, shell history, screenshots, later agent access, manual copying, or any path under `.build-in-public/` that was previously committed.

Store the minimum useful fact. Prefer a safe summary and an evidence pointer over raw material.

## Never persist in this journal

- passwords, API keys, tokens, cookies, private keys, recovery codes, or connection strings;
- real environment/config secrets, authentication headers, session IDs, or signed URLs;
- customer records, payloads, identifiers, support conversations, or private feedback;
- sensitive personal, financial, health, employment, location, or relationship information;
- confidential contracts, pricing, roadmaps, source material, or third-party conversations;
- unapproved private hostnames, account identifiers, repository URLs, topology, or control-plane detail;
- raw prompts, completions, tool arguments/results, traces, logs, or screenshots containing proprietary context;
- affected endpoints, payloads, proof of concept, or exploit detail for an unresolved vulnerability.

When such material is central, use only a category-level statement or a pointer to the approved secure system. Omit the event when even a pointer or summary would create risk.

## Qualitative privacy classes

| Class | Meaning | Editorial boundary |
|---|---|---|
| `public_safe` | Facts are already public or explicitly approved for the intended disclosure | May be reviewed for requested channels after fact check |
| `internal` | Useful private evidence without current publication approval | Keep private unless a human approves a separately sanitized fact set |
| `embargoed` | Disclosure depends on a named release, consent, fix, or date | Do not mine or publish before the condition clears |
| `never_public` | The event is not suitable for public derivation | Keep out of editorial mining |

Treat `never_public` as sticky. Only an explicit authorized human decision can relax it, and a fixed vulnerability is not automatically public-safe.

## Detail-level sanitization

For each material detail, choose the safest useful action:

| Action | Use when |
|---|---|
| keep | necessary, verified, and approved for the current private/public boundary |
| generalize | exact identity, amount, URL, vendor, or topology is unnecessary |
| redact | the record needs to acknowledge a category but must not retain its value |
| delay | disclosure depends on release, remediation, consent, or coordinated announcement |
| drop | the detail adds risk without preserving the lesson |

Do not anonymize by replacing a real customer name while retaining identifying context. Remove or aggregate the context.

## Security-sensitive events

For an active or unresolved issue, the journal may contain only the minimum safe acknowledgement:

- a stable internal event reference and `security-pointer` type;
- a generic impact/remediation state;
- a pointer to the approved private advisory or tracker;
- disclosure state;
- `privacy_class: never_public`.

Do not retain the exploit path or proof of concept here. Use the project's security process and coordinated-disclosure rules.

## Manual review questions

Before persistence, ask whether every retained fact is necessary; evidence links reveal private identities or paths; logs/screenshots were copied; third-party words lack consent; exact numbers lack disclosure approval; security detail could aid exploitation; or an interpretation could be mistaken for fact. Uncertainty means omit the detail or keep the event out of editorial mining.

## Guard and scanner boundary

`journal_guard.py check` examines a bounded set of path, Git tracking/history, link-count, ignore, and POSIX permission properties. `journal_guard.py scan` detects configured common credential patterns and private-key markers. Neither command can certify confidentiality or publication safety.

An additional repository-native scanner is optional only when the user requests it and the target repository already documents and provides it. Do not install or configure a scanner, update a baseline, enable a hook, or change dependencies for this journal. Confirm the existing command includes the ignored journal; a tracked-files-only scan does not. Never relay a matched value. Keep raw output local when it cannot be safely reduced to tool name, status/count, and non-sensitive finding type/location.

Bundled and existing scanners cannot reliably detect customer/proprietary information, ordinary-language personal data, confidential business facts, sensitive internal URLs, novel credential formats, exploitable vulnerability prose, third-party consent, backups, editor sync, or later disclosure. A clean result means only that the checked invariants held or configured patterns did not match.

## Optional public derivation

Never copy a private event wholesale into a draft. When editorial mining is explicitly requested, derive a minimal fact set containing only selected confirmed facts, approved artifacts, generalized context, limitations, and named redactions/embargoes. A human must approve publication through the applicable process. This skill still does not write or publish the content.
