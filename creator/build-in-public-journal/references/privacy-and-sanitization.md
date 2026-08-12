# Privacy and sanitization

Apply this gate before writing to the private journal and again before creating a content opportunity.

## Two boundaries, not one

`/.build-in-public/` in `.gitignore` reduces accidental commits. It does not protect against local malware, shared machines, backups, editor sync, shell history, screenshots, or an agent reading the file later.

Store the minimum useful fact. Prefer a safe summary and an evidence pointer over raw material.

## Never persist

Do not put these values or payloads in the journal:

- passwords, API keys, access tokens, cookies, private keys, recovery codes, or connection strings;
- real `.env` content, authentication headers, session identifiers, or signed URLs;
- customer records, payloads, identifiers, support conversations, or private feedback;
- sensitive personal, financial, health, employment, location, or relationship information;
- confidential contracts, pricing, roadmaps, source material, or third-party conversations;
- internal hostnames, account identifiers, private repository URLs, topology, or control-plane details that are not approved for disclosure;
- raw prompts, completions, tool arguments, tool results, traces, or screenshots that may contain proprietary context;
- reproduction steps, affected endpoints, payloads, or exploit details for an unresolved vulnerability.

If one of these is central to the event, record only a redacted category or a pointer to the approved secure system.

## Privacy classes

| Class | Meaning | Editorial rule |
|---|---|---|
| `public_safe` | Facts and artifacts are already public or approved for disclosure | May be scored after fact check |
| `internal` | Useful private evidence with no current publication approval | Mine only a sanitized derivative after human review |
| `embargoed` | Disclosure may become safe after a named condition or date | Do not mine before the embargo clears |
| `never_public` | The event cannot safely become content | Keep out of the opportunity queue |

`never_public` is sticky. Only an explicit human decision can relax it.

## Sanitization decisions

For each detail, choose one action:

| Action | Use when |
|---|---|
| `keep` | The fact is necessary, verified, and approved for the current privacy class |
| `generalize` | Exact identity, amount, URL, vendor, or topology is unnecessary to preserve the lesson |
| `redact` | The record needs to acknowledge a field but must not retain its value |
| `delay` | Disclosure depends on a release, fix, customer consent, or coordinated announcement |
| `drop` | The detail adds risk without adding reusable evidence |

Never anonymize by changing a real customer name into a fake name while keeping identifying context. Remove or aggregate the identifying context.

## Security-sensitive events

For an active or unresolved security issue, the journal may contain only:

- event ID and `security-pointer` type;
- a generic impact class;
- a pointer to a secure private advisory or tracker;
- remediation owner and state;
- disclosure approval state;
- `privacy_class: never_public`;
- `content_eligible: false`.

Do not retain the exploit path or proof of concept here. Revisit only after remediation and coordinated disclosure. A fixed vulnerability is not automatically content-safe.

## Manual pre-write checklist

Before persistence, verify:

- every value is necessary to preserve the decision or lesson;
- evidence links expose no private path, account, user, customer, or infrastructure detail;
- screenshots and logs were not copied wholesale;
- third-party words are not quoted without consent;
- numbers have an approved disclosure status;
- no active security detail could help exploitation;
- interpretations and hypotheses cannot be mistaken for confirmed facts.

If uncertain, omit the detail and set `content_eligible: false`.

## Deterministic scanner boundary

Run `journal_guard.py scan` after each write. It detects common credential shapes and private-key markers. It cannot reliably detect:

- customer or proprietary data;
- personal information in ordinary prose;
- confidential business facts;
- sensitive internal URLs;
- a novel credential format;
- whether vulnerability detail is exploitable;
- whether a third party approved disclosure.

A clean scan means “no configured pattern matched,” not “safe to publish.”

## Public derivation rule

Never copy a private event wholesale into a public draft. Derive a minimal public-safe fact set:

1. selected confirmed fact;
2. approved artifact;
3. generalized context;
4. limitation or uncertainty;
5. explicit redactions and embargo state.

A human must approve this fact set before publication. This skill still does not write the publication.
