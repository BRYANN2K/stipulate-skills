# OpenCode interface

The Stipulate CLI plugin adds a lifecycle sidebar, `/stip-settings`, and `/stip-status` to OpenCode 2. All displayed workers are native OpenCode sessions. Discovery stays in the main coordinator conversation; a Research row appears only after a real delegated task exists.

## Sidebar

The plugin appends content to the public `sidebar.content` slot. This preserves the existing sidebar rather than replacing the MCP section. The host determines the final ordering and narrow-terminal visibility. The integration must be checked visually against the installed OpenCode version. [OpenCode CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli)

The sidebar shows the selected change, seven lifecycle stages, selected extensions, and worker activity. Accepted contributions use a check mark; returned contributions remain **awaiting review**. A completed native session never marks a workflow stage passed automatically. Errors and stale approval remain visible.

Select a change to associate it with the current session. Select a stage to read an artifact. Viewing a stage does not execute it. Select a worker to inspect its task, selected and runtime-confirmed model where available, resolved settings, criteria, owned files and observed status. Open its native session to read the actual conversation and tool work.

The worker count excludes the coordinator. Active tasks and results awaiting review stay visible; older outcomes collapse after two entries. Task durations are calculated only when timestamps exist. Unknown settings or missing runtime confirmation are labelled rather than inferred from the model name.

Mounted sidebars refresh at two-second intervals with at most one request in flight per sidebar. Disposing the sidebar clears its timer and aborts its pending request. The TUI reads server state and never dispatches a worker just because a sidebar was mounted or refreshed.

Explicit `stip_research` calls appear in a separate Research helpers group, with the selected specialty and observed outcome. They can use an exploration or validation profile before implementation approval. They return findings; they have no contribution-acceptance or lifecycle controls. Other native children are shown as observed session activity without claiming a Stip task association.

## Settings

Run `/stip-settings` or select Settings in the sidebar. This is a native OpenCode dialog flow with keyboard selection, searchable model choices, and the host's theme. There is no runtime selector.

- The coordinator is informational. Its model is changed through OpenCode's normal model selector.
- Default worker and specialist profiles support inherited choices, model, effort, Fast and an optional existing native subagent binding.
- Models come from the connected project's catalog. Effort options come from the selected model's advertised variants. Fast is unavailable without a verified speed option, and incompatible effort/speed combinations are disabled.
- Selecting another model resets effort and Fast to inheritance. Fast is a separate control and does not substitute another model. Running tasks retain their recorded settings.
- Optional roles include Research, Architecture, Design, Database, Cloud, Delivery and Communication. Adding a role does not launch it. Discovery and Coordinator are reserved responsibilities.
- Advanced controls include phase and phase/role overrides and the maximum concurrent worker count. A shared checkout permits one writer.

Choose the save scope deliberately: project settings are shared, local settings override them privately, and personal settings provide defaults across projects. The editor starts from that scope's actual layer, not a copy of the merged effective settings. Model-dependent editing resolves inherited settings up to the chosen layer; higher-priority local overrides may still affect the final effective profile.

Edits stay in memory until Save. Review shows the JSON that will be saved. A revision check rejects a stale save after another client changes settings; the draft remains available to inspect. Closing an unsaved draft offers discard or continued editing. Changes preserve other clients' configuration in the same settings document.

## Inspect and control

`/stip-status` opens the same changes, stages and worker details through keyboard-accessible native dialogs. It remains useful when the host hides the sidebar in a narrow terminal.

A returned contribution can be accepted or sent back for correction with an inspection note. A running owned task can be cancelled with a reason. Neither action discards code edits or automatically advances the lifecycle. Actions are tied to the inspected task attempt; stale attempts must be reopened. The server remains authoritative for permissions, current attempt and legal transitions.

Artifact views are scrollable and read-only. Bootstrap/Explore open the proposal, Validate opens the spec, Apply opens the execution plan, and Check/Docs/Archive open evidence. Files that do not yet exist show the server's explanatory result. The UI never fabricates a missing document.

## Verification boundary

The source targets the public OpenCode `0.0.0-beta-19296` TUI SDK and OpenTUI/Solid APIs. Type checking verifies API shape; it does not prove final sidebar placement, terminal interaction or a live model run. Record native screenshots and isolated lifecycle evidence separately before release.

The TUI consumes the Stip server RPC contract. It cannot claim controls that the backend does not support. Full session transcripts and live tool output remain in the native session view; the compact sidebar displays only the observed data provided by the server.
