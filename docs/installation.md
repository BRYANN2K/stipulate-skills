# Installation

The GitHub launcher installs the complete Stip package for OpenCode v2: seven skills, 28 bundled domain extensions, seven lifecycle commands, and the native plugin. The plugin adds the workflow sidebar, worker tracking, and `/stip-settings` without adding an eighth lifecycle skill.

## Requirements

- Python 3.10+ and Git for the workflow.
- Node.js 22.20+/npm for the npx installer, including skill-only installation: the pinned skills CLI requires this version. The standalone Python installer does not need Node.js.
- OpenCode v2 for the native plugin. The package pins its plugin API dependency to `0.0.0-beta-19296`; later beta API compatibility must be checked when updating.
- Your existing provider and model configuration. Installation does not connect providers or change permissions.

## One command

Run from the target repository:

```sh
npx github:BRYANN2K/stipulate-skills
```

For all projects:

```sh
npx github:BRYANN2K/stipulate-skills --global
```

To install the skills for several clients in the same run:

```sh
npx github:BRYANN2K/stipulate-skills --agent opencode codex claude-code
```

`--yes` selects unattended skills installation. `--dry-run` validates destinations and prints the intended changes without creating files or downloading dependencies. `--no-opencode-plugin` installs only skills and commands; use it for an OpenCode client that does not support the v2 plugin API. Selecting only Codex or Claude Code does not install the OpenCode plugin.

For a reproducible revision, replace the repository suffix with a tag or full commit:

```sh
npx github:BRYANN2K/stipulate-skills#<revision>
```

`npx skills add` remains available for the seven skills, but does not install Stip's explicit command wrappers or native plugin. The launcher performs those steps in addition to the pinned skills CLI installation.

## What is installed

| Resource | Project scope | Global scope |
| --- | --- | --- |
| Skills and bundled extensions | Client paths selected by skills CLI | Client user paths selected by skills CLI |
| OpenCode commands | `.opencode/commands/` | `<OpenCode config>/commands/` |
| Native plugin package and dependencies | `.opencode/plugins/stipulate/` | `<OpenCode config>/plugins/stipulate/` |

For global commands and the plugin, `OPENCODE_CONFIG_DIR` takes precedence over `$XDG_CONFIG_HOME/opencode/`, with `~/.config/opencode/` as the default. Hosts such as Orca set `OPENCODE_CONFIG_DIR` for their own OpenCode sessions: run the global installer from that host's shell terminal so it targets the same directory. Installing from an ordinary terminal can otherwise leave the host's plugin and commands absent. Project-local installation remains local even when the host sets this variable. Skill locations are selected separately by skills CLI.

The plugin is copied out of npm's temporary download directory and includes its own locked dependencies.

OpenCode v2 discovers immediate package directories under `plugins/`; the package carries root `index.ts`, `tui.tsx`, and `rpc.ts` entrypoints for the local-directory resolver, alongside its npm package exports. These root entries are required by the beta-19296 local-directory resolver; the `src/` files and package exports alone are insufficient. The TUI entrypoint loads the terminal UI. Stip therefore leaves `opencode.json`, `opencode.jsonc`, and `cli.json` unchanged, including comments and other plugins. Existing OpenCode rules that disable plugins still apply.

Dependencies are prepared outside the discovered `plugins/` directory with `npm ci --omit=dev --ignore-scripts`. The prepared directory is activated only after installation succeeds. No npm lifecycle hook runs the Stip installer.

## Start using it

1. Run `/restart` in an existing OpenCode session. Restart the CLI if the TUI contribution has not loaded.
2. Invoke `/stip-bootstrap` to adopt the repository. Installing the package does not bootstrap every project automatically.
3. Open `/stip-settings` to choose role models and concurrency. Unset model assignments inherit the coordinator model. Effort and Fast are available only when the chosen model exposes a compatible variant.
4. Use `/stip-explore` to discuss a change with the coordinator and its relevant domain extensions.
5. Review the spec and execution plan before approval and apply.

Native worker configuration for Codex and Claude Code is described in [native agent configuration](native-agents.md). Those clients use their own file formats; the OpenCode plugin does not launch either client as a worker runtime.

## Private CLI runs

For an isolated terminal run, OpenCode supports a private backend through `opencode2 run --standalone`. When using this one-shot mode, ask the coordinator to pass `background: false` to each `stip_delegate` call. This forwards the native subagent tool's foreground option and waits for the child result before the coordinator continues.

Background delegation is the default for an ongoing OpenCode session. A private one-shot backend can stop when its parent command exits, so a background dispatch response alone is not evidence that its worker completed. Keep the session alive or use foreground delegation, then inspect and accept the returned contribution before advancing the workflow.

The installer changes the machine and scope where it runs. It does not deploy the server plugin to a remote OpenCode host. The OpenCode integration always uses native OpenCode child sessions; it does not start Codex or Claude Code processes.

## Updates and local customization

Rerun the same launcher to update the installed package. Managed plugin files carry hashes in `.stipulate-install.json`. Modified, extra, unowned, or symlinked plugin files block replacement so that local work is preserved. Resolve a reported collision by saving your changes separately or choosing another installation scope; the installer has no force-overwrite mode.

The plugin stage preserves the active installation if dependency preparation fails. The entire launcher is not a transaction across the external skills CLI, command helper, and plugin installer: skills or commands may already have been installed when a later step fails. Resolve the reported error and rerun the command.

Changing plugin settings does not change an already dispatched worker's model. Project workflow data remains in `.workflow/`, independently of the installed plugin package. See the [orchestration contract](orchestration-contract.md) for approval and migration rules.

## Removal

Close OpenCode or stop using the plugin before removing it. Delete the managed `stipulate` directory under the installation scope's `plugins/` directory to remove the native plugin and its dependencies. This leaves skills, command wrappers, and `.workflow/` records available.

To remove the complete OpenCode integration, also remove the seven `stip-*.md` command files and the seven installed `stip-*` skill directories in that scope, after preserving any customizations. Do not remove other plugins or shared workflow records.

## Troubleshooting

- **Commands missing:** run `/restart` and check whether project command files override global commands.
- **Commands exist but no sidebar/settings:** confirm OpenCode v2, restart the CLI, and inspect its plugin diagnostics. A configured plugin-disable rule may prevent loading.
- **Unsupported model option:** select a model variant exposed by the current OpenCode catalog; effort and Fast are not universal model options.
- **Update blocked:** the installer names the conflicting command or plugin file. Preserve the customization before retrying.
- **Registry or dependency failure:** the active plugin remains available; check network access and the required Node version, then retry.

References: [OpenCode v2 plugin discovery](https://opencode.ai/v2/docs/plugins/), [CLI plugin exports](https://opencode.ai/v2/docs/build/plugins/cli/).
