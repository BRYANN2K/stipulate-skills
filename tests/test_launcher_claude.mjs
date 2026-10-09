import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const launcher = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'install.mjs');

// Fake `npx` and `claude` record their argv so nothing real is installed.
function fixture(t, claudeExit = 0) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'stip-launcher-claude-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bin = join(base, 'bin'), project = join(base, 'project');
  mkdirSync(bin); mkdirSync(project);
  const fake = (name, code) => {
    const path = join(bin, name);
    writeFileSync(path, `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(base, name + '.argv')}"\nexit ${code}\n`);
    chmodSync(path, 0o755);
    return path;
  };
  fake('npx', 0);
  const claude = fake('claude', claudeExit);
  const run = (args, env = {}) => spawnSync(process.execPath, [launcher, ...args], {
    cwd: project, encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, STIP_CLAUDE_BIN: claude, ...env },
  });
  const argv = name => existsSync(join(base, name + '.argv')) ? readFileSync(join(base, name + '.argv'), 'utf8').trim().split('\n') : null;
  return { base, project, run, argv };
}

test('claude-code installs the mod with project scope by default', t => {
  const { run, argv } = fixture(t);
  const result = run(['--agent', 'claude-code']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(argv('npx'), 'skills step ran first');
  assert.deepEqual(argv('claude'), ['plugin', 'install', 'stipulate', '--marketplace', 'BRYANN2K/stipulate-skills', '--scope', 'project']);
  assert.match(result.stdout, /\/stip is available/);
});

test('--global installs the mod with user scope', t => {
  const { run, argv } = fixture(t);
  const result = run(['--agent', 'claude-code', '--global']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(argv('claude').slice(-2), ['--scope', 'user']);
  assert.match(result.stdout, /every project/);
});

test('a failing claude plugin install exits non-zero', t => {
  const { run, argv } = fixture(t, 3);
  const result = run(['--agent', 'claude-code']);
  assert.equal(result.status, 3);
  assert.ok(argv('claude'));
  assert.match(result.stderr, /mod install failed/);
});

test('missing claude prints the /plugin install line and exits 0', t => {
  const { run, base, argv } = fixture(t);
  const result = run(['--agent', 'claude-code'], { STIP_CLAUDE_BIN: join(base, 'no-such-claude') });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(argv('npx'), 'skills still installed');
  assert.match(result.stdout, /not found/);
  assert.match(result.stdout, /\/plugin install stipulate --marketplace BRYANN2K\/stipulate-skills/);
});

test('--dry-run shows the claude command and runs nothing', t => {
  const { run, argv, project } = fixture(t);
  const result = run(['--agent', 'claude-code', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.claudeCode.command, ['claude', 'plugin', 'install', 'stipulate', '--marketplace', 'BRYANN2K/stipulate-skills', '--scope', 'project']);
  assert.equal(report.claudeCode.scope, 'project');
  assert.equal(argv('npx'), null);
  assert.equal(argv('claude'), null);
  assert.deepEqual(readdirSync(project), []);
});

test('opencode alone never calls claude', t => {
  const { run, argv } = fixture(t);
  const preview = run(['--agent', 'opencode', '--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /"claudeCode": null/);
  const result = run(['--agent', 'opencode', '--no-opencode-plugin']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(argv('npx'));
  assert.equal(argv('claude'), null);
});
