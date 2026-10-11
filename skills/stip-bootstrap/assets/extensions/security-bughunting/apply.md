# security-bughunting — apply

Read the approved contract and only the selected references. Preserve existing user work, conventions, and authorizations; do not expand scope. This is authorized, defensive work on code you own or are permitted to test.

## Domain procedure

Work through the vulnerability classes selected during explore, one at a time, on the change under development. For each class:

- Confirm where the untrusted input reaches the sink, and whether a control already neutralizes it.
- Implement the control that fits the stack and the project's conventions: parameterized queries and safe query builders rather than string-built queries; output encoding and a context-aware templating path rather than raw interpolation; an allow-list and canonicalization for paths and outbound hosts rather than denial by pattern; an object-level authorization check keyed to the caller's identity rather than a trust-the-id assumption; safe deserialization or a typed, bounded parser; secrets kept out of responses, logs, and artifacts.
- Write a repeatable negative test that fails on the vulnerable version and passes once the control is in place, plus a positive test for the allowed path. Run both on an authorized fixture, never against a system you do not own.

Keep a minimal, controlled reproduction rather than a live exploit. Patch or pin dependencies with known issues in scope, or record the residual risk and a dated follow-up and return to contract revision. Steps may overlap or be not-applicable with justification. Use [check.md](check.md) for the observable properties to confirm.

## Expected outcome

Deliver a concrete, inspectable result: the controls added, the tests that demonstrate them, and evidence linked to the actual `AC-n` IDs. Record the commands, environment, and fixtures used, and what remains simulated rather than observed. If the hunt reveals a weakness the contract does not cover, return to contract revision and approval; do not weaken a criterion to make a result pass.

This extension does not grant human approval, execute hooks, or authorize publication, external contact, intrusive testing, or deployment. Carry out previously authorized actions within their scope; request only authorization that is actually missing.
