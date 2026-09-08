# Coding clients

Stip uses the same seven Agent Skills packages and Python runtime across clients. Domain extensions remain project-local references selected per change. Python 3.10+ and Git are required. Stip does not set a model, grant tool permissions, or bypass the client's approval controls.

## Project installation

From the target project, install for Codex, Claude Code, and OpenCode together:

```sh
npx skills add BRYANN2K/stipulate-skills --skill '*' --agent codex claude-code opencode
```

This also supports Grok Build: it discovers the shared `.agents/skills` directory. The published skills CLI tested during this integration rejected `--agent grok`, even though the upstream source already lists that adapter. Do not require that flag until the installed CLI supports it.

| Client | Single-client install option | Invocation | Project instructions |
| --- | --- | --- | --- |
| Codex | `--agent codex` | `$stip-bootstrap`, `$stip-explore`, etc. | `AGENTS.md` |
| Claude Code | `--agent claude-code` | `/stip-bootstrap`, `/stip-explore`, etc. | `CLAUDE.md` imports `AGENTS.md` |
| Grok Build | `--agent codex` (shared project directory) | `/stip-bootstrap`, `/stip-explore`, etc. | `AGENTS.md` |
| OpenCode v2 | `--agent opencode` | Select `/stip-bootstrap`, `/stip-explore`, etc. in the skill command catalog | `AGENTS.md` |

The shared-directory Grok fallback above is **project-local**. Do not add `--global` to it: a Codex global destination is not a Grok global destination. For a Grok-only global installation, use the repository's Python installer with `--destination "$HOME/.grok/skills"`. For other clients, `--global` selects their respective user-level destinations.

Keep `'*'` quoted. The CLI installs the complete seven packages, including all 28 domain extensions carried by `stip-bootstrap`. It does not create 28 additional slash commands.

## Bootstrap and existing projects

Invoke the bootstrap skill in the target repository. Its bundled `scripts/setup_stip.py --root <physical-project-root>` prepares `.workflow/`, adds the bounded `AGENTS.md` guidance, and adds a standalone `@AGENTS.md` import to `CLAUDE.md`.

Existing Claude instructions are preserved. Repeated setup does not duplicate the import. An existing `CLAUDE.md` symlink directly targeting the root `AGENTS.md` is preserved; other symlink targets are rejected. Imports shown inside fenced examples do not count as active imports. Close any unclosed Markdown fence before running setup.

Restart Claude Code after first setup so project instructions load at session start. When adopting existing instructions, inspect and reconcile contradictions explicitly. The low-level `workflow.py bootstrap` remains metadata-only; normal skill bootstrap uses `setup_stip.py`.

OpenCode v2 discovers `.agents/skills`, `.claude/skills`, and `.opencode/skills`. No generated command wrappers or `opencode.json` edits are needed for standard skill discovery. Avoid installing differing copies with the same ID because client precedence rules can select a different copy than expected.

## Verification and limits

Verified locally during this integration:

- A real skills CLI installation targeting Codex, Claude Code, and OpenCode together.
- Grok Build 1.0.13 discovers the seven project skills and marks them user-invocable through `grok inspect --json`.
- The packaged bootstrap runs from the installed client paths, makes 28 extensions available, and preserves the Claude import on repeat runs.
- Automated tests cover existing instructions, active imports, fenced examples, symlinks, package preservation, and the shared workflow lifecycle.

Claude Code 2.1.220 is installed locally. OpenCode on this machine is 1.18.13, so this is **not an end-to-end OpenCode v2 runtime certification**. V2 compatibility is based on its official format, discovery, and command documentation. No model-driven lifecycle across all clients has been certified by the packaging tests.

To validate a client interactively: confirm all seven entries, invoke bootstrap, explore one small change with one relevant domain, review and approve its spec, then apply/check/docs/archive. Confirm the shared files and approval/evidence gates rather than treating successful discovery as proof of correct agent behavior.

## References

- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code project instructions and AGENTS.md import](https://code.claude.com/docs/en/memory#agentsmd)
- [Grok Build skills](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/08-skills.md)
- [OpenCode v2 skills](https://opencode.ai/v2/docs/skills/)
- [OpenCode v2 instructions](https://opencode.ai/v2/docs/instructions/)
- [skills CLI](https://github.com/vercel-labs/skills)
