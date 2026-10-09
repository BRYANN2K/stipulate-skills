# Install the Claude Code mod with npx

## Problem

`npx github:BRYANN2K/stipulate-skills --agent claude-code` installs the skills but only prints the mod's install line (`/plugin install stipulate --marketplace BRYANN2K/stipulate-skills`), to be typed in a Claude Code session (AC-22). The person wants the npx launcher to install the mod.

- **established** (2026-10-09): `claude plugin install stipulate --marketplace <source> --scope project --json` runs with no prompt (stdin closed), adds the marketplace in user settings, and enables `stipulate@stipulate` in the project's `.claude/settings.json` (tested with an isolated `CLAUDE_CONFIG_DIR`).

## Scope

- `bin/install.mjs`: with `--agent claude-code`, after the skills, run `claude plugin install stipulate --marketplace BRYANN2K/stipulate-skills --scope project` (`user` with `--global`); fall back to printing the line when `claude` is missing; show the command in `--dry-run`.
- Tests for the launcher with a fake `claude` on the PATH.
- Docs: README and `docs/claude-code-plugin.md` install sections.

Out of scope: OpenCode and Codex installs; publishing to npm.

## Decisions

- D1: project scope by default, matching the launcher's project-local default and the scope observed working in the desktop app.
