#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPlugin, preflightPlugin } from './plugin-install.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let global = false, yes = false, dry = false, plugin = true;
const agents = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--global' || arg === '-g') global = true;
  else if (arg === '--yes' || arg === '-y') yes = true;
  else if (arg === '--dry-run') dry = true;
  else if (arg === '--no-opencode-plugin') plugin = false;
  else if (arg === '--opencode-plugin') plugin = true;
  else if (arg === '--agent' || arg === '-a') {
    let count = 0;
    while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      const name = args[++i];
      if (!['opencode', 'codex', 'claude-code'].includes(name)) fail(`Unsupported agent: ${name}`);
      agents.push(name); count++;
    }
    if (!count) fail('--agent requires at least one client ID');
  } else if (arg === '--help' || arg === '-h') {
    console.log('Stip installer: [--agent opencode codex claude-code] [--global] [--yes] [--dry-run] [--no-opencode-plugin]\nDefault: OpenCode v2, project-local. Installs seven skills, OpenCode commands and the native Stipulate plugin. Use --no-opencode-plugin for skills and commands only.');
    process.exit(0);
  } else fail(`Unknown option: ${arg}`);
}
if (!agents.length) agents.push('opencode');
const selected = [...new Set(agents)];
const commandDir = global
  ? join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'opencode', 'commands')
  : join(process.cwd(), '.opencode', 'commands');
const helper = join(root, 'scripts', 'install_opencode_commands.py');
function fail(message) { console.error(message); process.exit(1); }
function run(cmd, argv) {
  const result = spawnSync(cmd, argv, { stdio: 'inherit', shell: false });
  if (result.error) fail(`${cmd}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status || 1);
}
// Preflight Python and command collisions before modifying installed skills.
run('python3', ['-c', 'import sys; assert sys.version_info >= (3,10), "Python 3.10+ required"']);
if (selected.includes('opencode')) run('python3', [helper, '--destination', commandDir, '--dry-run']);
let pluginPreview = null;
if (selected.includes('opencode') && plugin) {
  try {
    const ready = preflightPlugin({ global });
    pluginPreview = { package: '@stipulate/opencode', destination: ready.destination, version: ready.distribution.manifest.version };
  } catch (error) { fail(error.message); }
}
if (dry) {
  console.log(JSON.stringify({ agents: selected, scope: global ? 'global' : 'project', skills: 7, extensions: 28, commands: selected.includes('opencode') ? commandDir : null, plugin: pluginPreview }, null, 2));
  process.exit(0);
}
// Copy resources so installations do not depend on npm's temporary package cache.
const skillArgs = ['--yes', '--package=skills@1.5.25', 'skills', 'add', root, '--skill', '*', '--agent', ...selected, '--copy'];
if (global) skillArgs.push('--global');
if (yes) skillArgs.push('--yes');
run('npx', skillArgs);
if (selected.includes('opencode')) {
  run('python3', [helper, '--destination', commandDir]);
  if (plugin) {
    try { console.log(JSON.stringify(installPlugin({ global }), null, 2)); }
    catch (error) { fail(`${error.message}. Skills and commands may already be installed; resolve this error and rerun the launcher.`); }
  }
  console.log(plugin
    ? 'Stip installed: seven skills, slash commands, native subagents, sidebar and /stip-settings. In an already open OpenCode v2 session, run /restart; restart the CLI if the UI plugin has not loaded.'
    : 'Stip skills and commands installed. In an already open OpenCode session, run /restart to reload /stip-* commands.');
} else console.log('Stip skills installed.');
