import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installPlugin, pluginDestination } from '../bin/plugin-install.mjs';

function fixture(t) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'stip-plugin-install-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const source = join(base, 'distribution');
  mkdirSync(join(source, 'src'), { recursive: true });
  mkdirSync(join(source, 'assets'));
  writeFileSync(join(source, 'package.json'), JSON.stringify({ name: '@stipulate/opencode', version: '0.1.0', exports: { '.': './src/index.ts', './tui': './src/tui.tsx' } }));
  writeFileSync(join(source, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': { name: '@stipulate/opencode' } } }));
  writeFileSync(join(source, 'index.ts'), "export { default } from './src/index.ts';\n");
  writeFileSync(join(source, 'tui.tsx'), "export { default } from './src/tui.tsx';\n");
  writeFileSync(join(source, 'rpc.ts'), "export * from './src/rpc.ts';\n");
  writeFileSync(join(source, 'src/index.ts'), 'export default "server";\n');
  writeFileSync(join(source, 'src/tui.tsx'), 'export default "tui";\n');
  writeFileSync(join(source, 'assets/workflow.py'), 'print("workflow")\n');
  const project = join(base, 'project with spaces');
  mkdirSync(project);
  return { base, source, project, options: { source, cwd: project, installDependencies: directory => { mkdirSync(join(directory, 'node_modules')); } } };
}

test('preview is read-only and reports the durable automatic discovery path', t => {
  const { project, options } = fixture(t);
  const result = installPlugin({ ...options, dryRun: true });
  assert.equal(result.destination, join(project, '.opencode/plugins/stipulate'));
  assert.deepEqual(readdirSync(project), []);
});

test('installs server and TUI package without editing user configuration', t => {
  const { project, options } = fixture(t);
  const original = '{\n // keep this comment\n "plugins": ["existing",],\n}\n';
  writeFileSync(join(project, 'opencode.jsonc'), original);
  const result = installPlugin(options);
  assert.equal(readFileSync(join(project, 'opencode.jsonc'), 'utf8'), original);
  assert.equal(readFileSync(join(result.destination, 'src/tui.tsx'), 'utf8'), 'export default "tui";\n');
  assert.equal(readFileSync(join(result.destination, 'index.ts'), 'utf8'), "export { default } from './src/index.ts';\n");
  assert.equal(readFileSync(join(result.destination, 'tui.tsx'), 'utf8'), "export { default } from './src/tui.tsx';\n");
  assert.ok(existsSync(join(result.destination, 'node_modules')));
  assert.ok(existsSync(join(result.destination, '.stipulate-install.json')));
  assert.deepEqual(readdirSync(join(project, '.opencode')), ['plugins']);
});

test('updates an unmodified managed package and preserves the previous one on dependency failure', t => {
  const { source, options } = fixture(t);
  const first = installPlugin(options);
  writeFileSync(join(source, 'src/index.ts'), 'export default "new server";\n');
  assert.throws(() => installPlugin({ ...options, installDependencies: () => { throw new Error('registry unavailable'); } }), /registry unavailable/);
  assert.equal(readFileSync(join(first.destination, 'src/index.ts'), 'utf8'), 'export default "server";\n');
  const second = installPlugin(options);
  assert.equal(second.mode, 'update');
  assert.equal(readFileSync(join(second.destination, 'src/index.ts'), 'utf8'), 'export default "new server";\n');
});

test('customized owned files and extra files block updates before dependency installation', t => {
  const { options } = fixture(t);
  const result = installPlugin(options);
  writeFileSync(join(result.destination, 'src/index.ts'), 'custom implementation');
  let called = false;
  assert.throws(() => installPlugin({ ...options, installDependencies: () => { called = true; } }), /Customized plugin file/);
  assert.equal(called, false);
  assert.equal(readFileSync(join(result.destination, 'src/index.ts'), 'utf8'), 'custom implementation');
  writeFileSync(join(result.destination, 'src/index.ts'), 'export default "server";\n');
  writeFileSync(join(result.destination, 'notes.md'), 'keep my work');
  assert.throws(() => installPlugin(options), /Unmanaged plugin file/);
});

test('unmanaged package and symlink targets are never overwritten', t => {
  const { base, project, options } = fixture(t);
  const destination = join(project, '.opencode/plugins/stipulate');
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'index.ts'), 'my plugin');
  assert.throws(() => installPlugin(options), /not managed by Stipulate/);
  rmSync(join(project, '.opencode'), { recursive: true });
  const outside = join(base, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(project, '.opencode'));
  assert.throws(() => installPlugin(options), /symlink/);
  assert.deepEqual(readdirSync(outside), []);
});

test('global discovery path respects XDG_CONFIG_HOME', t => {
  const { base, source } = fixture(t);
  const config = join(base, 'xdg', 'config');
  const result = installPlugin({ source, global: true, env: { XDG_CONFIG_HOME: config }, dryRun: true });
  assert.equal(result.destination, join(config, 'opencode/plugins/stipulate'));
  assert.equal(existsSync(config), false);
});

test('missing package runtime blocks the entire preview', t => {
  const { source, project, options } = fixture(t);
  rmSync(join(source, 'assets/workflow.py'));
  assert.throws(() => installPlugin({ ...options, dryRun: true }), /Incomplete plugin distribution/);
  assert.deepEqual(readdirSync(project), []);
});

test('concurrent target changes are detected after dependency staging', t => {
  const { options } = fixture(t);
  const first = installPlugin(options);
  assert.throws(() => installPlugin({ ...options, installDependencies: () => { writeFileSync(join(first.destination, 'notes.md'), 'user work'); } }), /Unmanaged plugin file/);
  assert.equal(readFileSync(join(first.destination, 'notes.md'), 'utf8'), 'user work');
});


test('missing local directory entrypoints block installation', t => {
  const { source, project, options } = fixture(t);
  rmSync(join(source, 'index.ts'));
  assert.throws(() => installPlugin({ ...options, dryRun: true }), /Incomplete plugin distribution: index.ts/);
  assert.deepEqual(readdirSync(project), []);
});


test('checkout installation excludes local bytecode and packaging control files', t => {
  const { source, options } = fixture(t);
  mkdirSync(join(source, 'assets/__pycache__'));
  writeFileSync(join(source, 'assets/__pycache__/workflow.cpython-314.pyc'), 'generated cache');
  writeFileSync(join(source, 'assets/workflow.pyc'), 'generated cache');
  writeFileSync(join(source, 'assets/.npmignore'), '__pycache__/\n');
  const result = installPlugin(options);
  assert.equal(existsSync(join(result.destination, 'assets/__pycache__')), false);
  assert.equal(existsSync(join(result.destination, 'assets/workflow.pyc')), false);
  assert.equal(existsSync(join(result.destination, 'assets/.npmignore')), false);
  assert.equal(readFileSync(join(result.destination, 'assets/workflow.py'), 'utf8'), 'print("workflow")\n');
});
