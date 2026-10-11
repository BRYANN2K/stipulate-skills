# security-bughunting — explore

Hunt for exploitable weaknesses in the change you are building, before it ships. This domain is for authorized, defensive work: code you own or are permitted to test. It is not for attacking third-party systems, and it adds no offensive tooling. Keep one coherent discussion with the user; do not run a separate security questionnaire.

## Decide whether this domain is relevant

Availability in configuration does not activate this domain. Select it during `stip-explore` only when the change introduces or touches an exploitable surface: untrusted input, authentication, authorization, session handling, secrets, parsing or serialization, file or path handling, outbound requests, templating or query building, or a dependency with known issues. Do not activate the whole catalog.

Relevant example: a new endpoint that reads a user-supplied id and returns a record. Out-of-scope example: renaming an internal variable with no change to inputs, permissions, or data flow; document the reasoned non-selection.

This domain is the hands-on hunt for weaknesses in the change. `security-engineering` owns threat modeling, controls, and trust boundaries; this one looks for the concrete classes an attacker would try against what you just wrote. A change may select both; neither implies the other.

## Map the attack surface of the change

List, for the code being added or modified: the entry points (requests, messages, files, CLI arguments, environment), the trust boundary each input crosses, where input reaches a sink (a query, a shell, a filesystem path, a template, a deserializer, an outbound URL), and which identity and authorization check governs each action. Reuse any existing threat model, test suite, or scanner result identified during bootstrap rather than restating it.

Classify each finding as **established** (reproduced against an authorized fixture), **inferred** (plausible from the code, not run), **incomplete** (a path or mode not covered), **missing** (searched, no evidence), or **not-applicable** (surface out of scope, justified).

## Pick the vulnerability classes that apply

From the surface, select only the classes the change can actually reach. Common classes to consider: injection (SQL, NoSQL, OS command, LDAP), cross-site scripting, server-side request forgery, broken object-level and function-level authorization (including insecure direct object references), authentication and session flaws, insecure deserialization, path traversal and unsafe file handling, server-side template injection, open redirect, secrets exposed in responses, logs, or artifacts, and known-vulnerable dependencies. Reference the catalogs in [sources.md](sources.md); map each selected class to a CWE where useful.

## Scope the contribution to the shared contract

For each class in scope, propose a verifiable property and how to confirm it, using the candidates in [check.md](check.md). The agent reformulates them as unique `AC-n` criteria in the shared `spec.md`; the engine does not remap domain IDs. Each criterion states the outcome, the context, and the expected evidence (for example, a repeatable negative test that fails on the vulnerable version and passes once the control is in place). Do not create a parallel specification. A new requirement after approval requires revising the contract and renewed approval.

## Boundaries

This domain finds and fixes weaknesses in the change; it does not authorize intrusive testing of systems you do not own, external reconnaissance, or exploitation beyond a controlled reproduction. Prefer a minimal, repeatable reproduction on an authorized fixture over a live exploit. `api-integrations` owns remote-call contracts; `backend-engineering` owns permissions and effects; `privacy-engineering` addresses risks to people; `quality-engineering` supplies general tests. Other domains mentioned here are possible collaborators, never automatic dependencies. Detailed sources are in [sources.md](sources.md); they inform decisions and do not create implicit acceptance criteria.
