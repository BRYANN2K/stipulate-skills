# Native worker configuration

Stip delegates inside the coding client that is already running. An OpenCode worker is an OpenCode child session. Codex and Claude Code use their own subagents. The OpenCode plugin never starts either of those clients.

Discovery stays with the main coordinator. A `research` profile is available for a bounded question, but configuring it does not start a worker. Profiles describe reusable assignments; the approved execution plan describes the actual tasks.

## Project settings

Add optional orchestration settings to `.workflow/config.json`. Keep unrelated workflow keys unchanged. This minimal example uses inherited models:

```json
{
  "orchestration": {
    "version": 1,
    "defaults": {
      "model": "inherit",
      "effort": "inherit",
      "fast": "inherit",
      "max_workers": 2,
      "max_shared_writers": 1
    },
    "clients": {
      "opencode": {
        "roles": {
          "backend": {},
          "security": {},
          "documentation": {}
        },
        "phases": {},
        "phase_roles": {}
      },
      "codex": { "roles": {}, "phases": {}, "phase_roles": {} },
      "claude-code": { "roles": {}, "phases": {}, "phase_roles": {} }
    }
  }
}
```

Only configure the clients you use. Missing orchestration settings produce a single inherited `stip-worker`; they do not start it. Each assignment accepts `model`, `effort`, `fast`, and optionally `agent` to bind an existing native agent. Roles are lowercase names with hyphens. `discovery` and `coordinator` are reserved responsibilities, not worker profiles.

For file projection, precedence is phase-and-role, role, phase, project defaults, then native inheritance. For example, `phase_roles.check.security` overrides `roles.security`. A higher-priority assignment that changes the model resets lower-priority effort and Fast settings unless those options are supplied again. `inherit` explicitly resets that option to inheritance; an omitted key leaves lower-priority configuration in place. Per-task assignments are resolved by the coordinator when dispatching and are not saved into these reusable files.

## Generate files for one client

From this repository:

```sh
python3 scripts/configure_agents.py --project /absolute/path/to/project --host codex --dry-run
python3 scripts/configure_agents.py --project /absolute/path/to/project --host codex
```

Replace `codex` with `opencode` or `claude-code`. `--host` is deliberately required: file generation never selects or launches another runtime. The helper reads the project's configuration and writes only that project's native agent files and ownership manifest. It does not change global settings, credentials, the coordinator model, or `.workflow/config.json`.

| Client | Generated definitions | Native fields |
| --- | --- | --- |
| OpenCode 2 | `.opencode/agents/stip-*.md` | `mode: subagent`, optional `model: provider/model#variant` |
| Codex | `.codex/agents/stip-*.toml` | `name`, `description`, `developer_instructions`, optional `model` and `model_reasoning_effort` |
| Claude Code | `.claude/agents/stip-*.md` | `name`, `description`, optional `model` and `effort` |

OpenCode discovers Markdown agents under `.opencode/agents`; omitting their model gives native parent-model inheritance. Model variants are model-specific. Per-agent request overlays currently are not applied by the v2 runner, so this helper never uses them to claim an effective effort or Fast setting. [OpenCode agents](https://opencode.ai/v2/docs/agents/), [OpenCode models](https://opencode.ai/v2/docs/models/)

Current Codex discovers standalone TOML definitions in `.codex/agents`. No legacy `[agents.<role>]` entries are added to `config.toml`. A custom file can preserve an already-resolved effort when only its model changes; the helper therefore writes a verified default effort for an explicit new model. [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Claude Code reads project agents in `.claude/agents`. Its native frontmatter supports model and model-dependent effort, and environment or invocation overrides may take precedence. Fast is configured at session/settings scope rather than through a documented agent frontmatter field. [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Claude Code Fast mode](https://code.claude.com/docs/en/fast-mode)

Restart the client after generating definitions. The binding map returned as JSON and saved in `.workflow/native-agents/<host>.json` tells the coordinator which native ID to use:

```text
*/*                 stip-worker
*/backend           stip-role-backend
check/backend       stip-phase-check-role-backend
```

Phase-specific files are generated only when phase configuration exists. A profile does not launch an agent, replace the coordinator, or make an extension mandatory. Reuse an existing agent with `agent` only when its ID is present in the capability snapshot; the helper binds to it without editing it. Combining that binding with model/effort/Fast overrides is rejected because the projector cannot safely modify the user's definition.

## Explicit model capabilities

The OpenCode menu can use its live catalog. The standalone file helper is offline and cannot establish account access or infer available models from their names. Explicit model choices therefore require a reviewed, host-scoped `--capabilities` JSON snapshot. Inherited defaults require no catalog.

The following is a format example using a fictional provider/model, not a shipped compatibility list:

```json
{
  "version": 1,
  "host": "opencode",
  "source": "Record the installed version and where these settings were verified",
  "models": {
    "provider/example-model": {
      "efforts": ["low", "high"],
      "default_effort": "low",
      "variants": {
        "careful": { "effort": "high", "fast": false },
        "careful-priority": { "effort": "high", "fast": true }
      }
    }
  },
  "agents": ["existing-reviewer"]
}
```

Use model IDs and variants actually available in the selected client. Every `fast` mapping must be verified from that provider's effective speed-tier configuration; a variant named `fast` may simply lower effort. Do not label it as priority speed from its name. The helper requires one unambiguous variant matching the requested options. It does not silently fall back, change models, or enable a priority tier through an inherited Fast choice.

```sh
python3 scripts/configure_agents.py \
  --project /absolute/path/to/project \
  --host opencode \
  --capabilities /absolute/path/to/opencode-capabilities.json \
  --dry-run
```

For Codex or Claude Code snapshots, use that client's exact model identifier in `models`. `efforts` contains the available native levels and `default_effort` the verified default. Variants are used only by OpenCode. Codex's `codex debug models --bundled` is an offline metadata source, but its bundled catalog is not evidence that the account can currently run every listed model.

If the model inherits but an effort or Fast setting is explicit, also supply `--coordinator-model`. The generated definition pins the validated model snapshot: a static file cannot follow future coordinator-model changes while guaranteeing the same options are compatible. Regenerate it to follow a different model, or reset every option to `inherit` for fully native dynamic inheritance.

**Independent per-worker Fast projection for Codex and Claude Code is currently rejected**, including explicit `false`; use `inherit` and the host's native session control. Codex documents a session `service_tier` setting, but this helper does not claim that child sessions independently enforce it. No unsupported field is generated. [Codex speed](https://learn.chatgpt.com/docs/agent-configuration/speed)

## Preservation and limitations

- Dry-run performs no writes, including no lock or manifest creation.
- The ownership manifest stores hashes and role bindings, not transcripts or credentials. Commit it alongside generated native files so later updates can identify them.
- A file without ownership, a customized generated file, a symlink, or an unexpected manifest path blocks the operation before native files change. Reconcile the customization deliberately instead of forcing an overwrite.
- Updates replace only unchanged owned files. Removed profiles remove only their unchanged owned projections. Unrelated agents and other hosts remain intact.
- A project lock serializes this helper's invocations. Atomic file replacement and rollback handle ordinary write failures. This is not a filesystem transaction against power loss or non-cooperating concurrent editors; interrupted batches fail their next ownership check rather than overwrite uncertain files.
- Keep `.workflow/.native-agents.lock` out of Git. It is an empty persistent lock file, not accepted project state.
- Generated instructions keep approval, integration, verification reconciliation, commits and archive with the coordinator. Tool denials limit recursive agents where supported. Prompt instructions and command-pattern denials are not a general OS sandbox. Existing host permissions still apply, and native execution requires the host's own policy checks.
- Worker-count and shared-writer limits remain coordinator policies. The helper does not change native concurrency settings or guarantee isolation for arbitrary host invocations.
- This helper reads project config only. Personal defaults, local overlays and OpenCode menu changes must be resolved by the caller before generating equivalent project profiles.

Compatibility investigation used OpenCode `0.0.0-beta-19296`, Codex CLI `0.145.0`, and Claude Code `2.1.220`. Local CLI help, the Codex generated protocol schema and official native-file documentation were inspected. Unit tests exercise generation and preservation; they do not constitute successful model calls in Codex or Claude Code. Check runtime-confirmed settings when a native worker actually starts.
