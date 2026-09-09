# Coding clients

Stip uses the same seven Agent Skills packages and Python runtime across clients. Domain extensions remain project-local references selected per change. Python 3.10+ and Git are required. Unset worker models inherit the coordinator model. Native model assignments are optional; Stip does not grant tool permissions or bypass the client's approval controls.

## Project installation

From the target project, install for Codex, Claude Code, and OpenCode together:

```sh
npx github:BRYANN2K/stipulate-skills --agent codex claude-code opencode
```

The launcher installs the native plugin when OpenCode is selected; use `--no-opencode-plugin` for skills and commands only. [Installer reference](installation.md) covers requirements, scopes, updates, and removal.

The shared Agent Skills format also supports Grok Build: it discovers the shared `.agents/skills` directory. The published skills CLI tested during this integration rejected `--agent grok`, even though the upstream source already lists that adapter. Do not require that flag until the installed CLI supports it.

| Client | Single-client install option | Invocation | Project instructions |
| --- | --- | --- | --- |
| Codex | `--agent codex` | `$stip-bootstrap`, `$stip-explore`, etc. | `AGENTS.md` |
| Claude Code | `--agent claude-code` | `/stip-bootstrap`, `/stip-explore`, etc. | `CLAUDE.md` imports `AGENTS.md` |
| Grok Build | `--agent codex` (shared project directory) | `/stip-bootstrap`, `/stip-explore`, etc. | `AGENTS.md` |
| OpenCode v2 | `--agent opencode` | `/stip-bootstrap`, `/stip-explore`, etc.; `/stip-settings` configures the native plugin | `AGENTS.md` |

The shared-directory Grok fallback above is **project-local**. Do not add `--global` to it: a Codex global destination is not a Grok global destination. For a Grok-only global installation, use the repository's Python installer with `--destination "$HOME/.grok/skills"`. For other clients, `--global` selects their respective user-level destinations.

The launcher installs all seven packages, including all 28 domain extensions carried by `stip-bootstrap`. It does not create 28 additional slash commands.

## Bootstrap and existing projects

Invoke the bootstrap skill in the target repository. Its bundled `scripts/setup_stip.py --root <physical-project-root>` prepares `.workflow/`, adds the bounded `AGENTS.md` guidance, and adds a standalone `@AGENTS.md` import to `CLAUDE.md`.

Existing Claude instructions are preserved. Repeated setup does not duplicate the import. An existing `CLAUDE.md` symlink directly targeting the root `AGENTS.md` is preserved; other symlink targets are rejected. Imports shown inside fenced examples do not count as active imports. Close any unclosed Markdown fence before running setup.

Restart Claude Code after first setup so project instructions load at session start. When adopting existing instructions, inspect and reconcile contradictions explicitly. The low-level `workflow.py bootstrap` remains metadata-only; normal skill bootstrap uses `setup_stip.py`.

OpenCode v2 discovers `.agents/skills`, `.claude/skills`, and `.opencode/skills`. Standard skill discovery does not require configuration edits. The launcher also installs explicit slash-command wrappers and a native plugin package discovered under `.opencode/plugins/stipulate/` (or the global OpenCode config directory). Avoid installing differing copies with the same ID because client precedence rules can select a different copy than expected.

## Verification and limits

Verified locally during this integration:

- A real skills CLI installation targeting Codex, Claude Code, and OpenCode together.
- Grok Build 1.0.13 discovers the seven project skills and marks them user-invocable through `grok inspect --json`.
- The packaged bootstrap runs from the installed client paths, makes 28 extensions available, and preserves the Claude import on repeat runs.
- Automated tests cover existing instructions, active imports, fenced examples, symlinks, package preservation, and the shared workflow lifecycle.

These historical package checks establish discovery and installation behavior; they do not certify a model-driven lifecycle across every client. The native OpenCode integration targets the v2 `0.0.0-beta-19296` plugin API. Its workflow contract, delegation gates, and compatibility rules are documented in [orchestration](orchestration-contract.md). Codex and Claude Code use [native agent files](native-agents.md) rather than the OpenCode plugin.

For a private one-shot OpenCode CLI sandbox (`opencode2 run --standalone`), use `background: false` on `stip_delegate` so the command waits for the native child before the private backend can stop. Background dispatch in a continuing session still requires an observed completion and coordinator acceptance. See [private CLI runs](installation.md#private-cli-runs).

To validate a client interactively: confirm all seven entries, invoke bootstrap, explore one small change with one relevant domain, review and approve its spec, then apply/check/docs/archive. Confirm the shared files and approval/evidence gates rather than treating successful discovery as proof of correct agent behavior.

## References

- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code project instructions and AGENTS.md import](https://code.claude.com/docs/en/memory#agentsmd)
- [Grok Build skills](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/08-skills.md)
- [OpenCode v2 skills](https://opencode.ai/v2/docs/skills/)
- [OpenCode v2 instructions](https://opencode.ai/v2/docs/instructions/)
- [skills CLI](https://github.com/vercel-labs/skills)

## Explicit OpenCode slash commands

Install skills and explicit commands together:

```sh
npx github:BRYANN2K/stipulate-skills
# Or user-wide:
npx github:BRYANN2K/stipulate-skills --global
```

The launcher defaults to OpenCode v2 and supports `--agent opencode codex claude-code`, `--yes`, `--dry-run`, and `--no-opencode-plugin`. It checks command and managed plugin collisions before running the pinned skills CLI (1.5.25), copies skill resources out of npm's cache, installs commands, and installs the native plugin unless opted out. Re-run this launcher for updates; its locally packaged source is not a remote source for `npx skills update`. Global command and native plugin installation respect `XDG_CONFIG_HOME`. The plugin includes root entries for local discovery and a `./tui` package export, which OpenCode loads with the server plugin; no configuration file edits are needed.

Run **`/restart`** in an existing OpenCode session after installation. This reload step was confirmed for command discovery. If the sidebar or `/stip-settings` has not loaded, restart the CLI.

The skills, command, and plugin steps are not one transaction. A later failure may leave skills or commands installed. The plugin is staged with locked dependencies before activation, and a failed dependency installation preserves the active plugin. Resolve the reported problem and rerun the launcher.

### Manual command-only installation

Stip bundles seven command templates inside `stip-bootstrap/assets/opencode-commands`. Each command asks the agent to load the corresponding skill and forwards `$ARGUMENTS`; procedures and approval gates remain in the skills and workflow runtime. Optional native orchestration settings determine worker model assignments.

After installing the skills, run the helper from your installed bootstrap directory. For the global OpenCode installation:

```sh
python3 "$HOME/.config/opencode/skills/stip-bootstrap/scripts/install_opencode_commands.py" \
  --destination "$HOME/.config/opencode/commands"
```

From a repository checkout instead:

```sh
python3 scripts/install_opencode_commands.py --destination "$HOME/.config/opencode/commands"
```

For a project-local installation, choose `/absolute/path/to/project/.opencode/commands`. Add `--dry-run` to preview. Identical files are reused; custom files and symlinks are never overwritten. A conflicting file blocks the batch before writes. The skills CLI installs the bundled templates but does not itself copy them into OpenCode's commands directory.

In the OpenCode composer, type `/stip-bootstrap` or `/stip-explore your idea`. All seven names are available. These are prompt commands, not shell executables. Project command definitions can override global ones, so check existing project commands if behavior differs.
