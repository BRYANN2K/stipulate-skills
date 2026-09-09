# Native Stip delegation and OpenCode 2 plugin

Implement the user-approved architecture and interface preserved in proposal.md. Discovery remains with the coordinator. OpenCode execution stays native; Codex and Claude Code use native configuration files.

## Acceptance criteria

- AC-1: OpenCode workers are native child sessions; the plugin launches no Codex/Claude Code executable.
- AC-2: No role assignment yields a real worker inheriting the coordinator's effective model and compatible settings.
- AC-3: Backend, frontend, API, security, verification and docs can use independent assignments. Discovery stays with the main coordinator; optional Research has its own configurable helper profile.
- AC-4: Model changes recompute effort/Fast choices; unsupported settings cannot appear to work or be silently ignored.
- AC-5: OpenCode settings have no runtime picker and show its available model catalog only.
- AC-6: Codex and Claude Code select their native workers using file configuration, without requiring the OpenCode plugin.
- AC-7: Relevant extensions contribute from exploration onward; unrelated domains do not create mandatory workers.
- AC-8: The coordinator delegates implementation while retaining approval, integration, verification reconciliation and archive ownership.
- AC-9: Conflicts, unavailable models, permission waits, cancellation and restart yield inspectable outcomes without duplicate work.
- AC-10: The panel reflects actual state/activity, including failure and stale approval.
- AC-11: Scope changes invalidate approval; subsequent relevant source changes invalidate evidence.
- AC-12: Installation preserves existing skills, settings and customized agents; supported prior changes still work.
- AC-13: A small real CLI sandbox completes bootstrap, exploration, approval, delegated implementation, verification, documentation and a scoped archive commit with a relevant extension.
- AC-14: A simple exploratory conversation starts no automatic helper; a bounded research request returns findings to the main coordinator without taking over the conversation.
- AC-15: An implementation worker can finish while its result remains unaccepted; missing behavior triggers a scoped correction rather than an automatic passed check.
- AC-16: A separate verification worker examines the integrated candidate; implementation or documentation changes that affect the checked subject trigger appropriate renewed verification.
- AC-17: The same worker may handle a scoped correction, while unrelated tasks and independent verification use correctly separated sessions.
- AC-18: Task dependencies and ownership prevent premature dispatch and preserve preexisting user changes when integration or cancellation occurs.

