#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, openSync, closeSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const OWNER = '.stipulate-install.json';
const PACKAGE = '@stipulate/opencode';
const hash = data => createHash('sha256').update(data).digest('hex');
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
function requireThat(value, message) { if (!value) throw new Error(message); }
function stat(path) { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; } }
function safePath(base, path) {
  const rel = relative(base, path);
  requireThat(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `Path escapes installation directory: ${path}`);
  let current = base;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    requireThat(!stat(current)?.isSymbolicLink(), `Refusing symlink in plugin installation: ${current}`);
  }
  return path;
}
function filesUnder(root, prefix = '') {
  const result = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    if (['__pycache__', 'node_modules', '.npmignore'].includes(entry.name) || /\.py[cod]$/.test(entry.name)) continue;
    const path = join(prefix, entry.name);
    requireThat(!entry.isSymbolicLink(), `Refusing plugin source symlink: ${path}`);
    if (entry.isDirectory()) result.push(...filesUnder(root, path));
    else { requireThat(entry.isFile(), `Unsupported plugin file: ${path}`); result.push(path); }
  }
  return result;
}
function sourcePackage(source) {
  requireThat(stat(source)?.isDirectory(), `Missing plugin distribution: ${source}`);
  const manifest = readJSON(join(source, 'package.json'));
  requireThat(manifest.name === PACKAGE && manifest.exports?.['.'] === './src/index.ts' && manifest.exports?.['./tui'] === './src/tui.tsx', 'Invalid Stipulate OpenCode plugin manifest');
  for (const file of ['package-lock.json', 'index.ts', 'tui.tsx', 'rpc.ts', 'src/index.ts', 'src/tui.tsx', 'assets/workflow.py']) {
    requireThat(stat(join(source, file))?.isFile() && !stat(join(source, file))?.isSymbolicLink(), `Incomplete plugin distribution: ${file}`);
  }
  const lock = readJSON(join(source, 'package-lock.json'));
  requireThat(lock.lockfileVersion >= 2 && lock.packages?.['']?.name === PACKAGE, 'Missing or invalid plugin dependency lock');
  const files = ['package.json', 'package-lock.json', 'index.ts', 'tui.tsx', 'rpc.ts', ...filesUnder(source, 'src'), ...filesUnder(source, 'assets')].sort();
  return { manifest, files, hashes: Object.fromEntries(files.map(file => [file, hash(readFileSync(join(source, file)))])) };
}
function checkExisting(destination) {
  if (!stat(destination)) return null;
  requireThat(stat(destination).isDirectory(), `Conflicting plugin path: ${destination}`);
  const ownerPath = join(destination, OWNER);
  requireThat(stat(ownerPath)?.isFile() && !stat(ownerPath)?.isSymbolicLink(), `Conflicting plugin directory: ${destination} is not managed by Stipulate`);
  const owner = readJSON(ownerPath);
  requireThat(owner.version === 1 && owner.package === PACKAGE && owner.files && typeof owner.files === 'object' && !Array.isArray(owner.files), 'Invalid Stipulate installation ownership record');
  for (const [file, expected] of Object.entries(owner.files)) {
    requireThat(!isAbsolute(file) && file.split(/[\\/]/).every(part => part && part !== '..' && part !== '.'), 'Unsafe path in plugin ownership record');
    const path = safePath(destination, join(destination, file));
    requireThat(stat(path)?.isFile() && hash(readFileSync(path)) === expected, `Customized plugin file blocks update: ${file}`);
  }
  // node_modules belongs to npm; all other files must be recorded to avoid losing local work.
  const visit = (prefix = '') => {
    for (const entry of readdirSync(join(destination, prefix), { withFileTypes: true })) {
      const file = join(prefix, entry.name);
      if (file === 'node_modules' || file === OWNER) continue;
      requireThat(!entry.isSymbolicLink(), `Customized plugin symlink blocks update: ${file}`);
      if (entry.isDirectory()) visit(file);
      else requireThat(Object.hasOwn(owner.files, file), `Unmanaged plugin file blocks update: ${file}`);
    }
  };
  visit();
  return owner;
}

export function opencodeConfigDirectory({ cwd = process.cwd(), env = process.env, home = homedir() } = {}) {
  return resolve(cwd, env.OPENCODE_CONFIG_DIR || join(env.XDG_CONFIG_HOME || join(home, '.config'), 'opencode'));
}

export function pluginDestination({ global = false, cwd = process.cwd(), env = process.env, home = homedir() } = {}) {
  const location = global ? opencodeConfigDirectory({ cwd, env, home }) : resolve(cwd);
  // Resolve existing system path aliases (such as macOS /var) before checking managed descendants.
  let anchor = location;
  while (!existsSync(anchor)) anchor = dirname(anchor);
  const base = resolve(realpathSync(anchor), relative(anchor, location));
  return { base, destination: global ? join(base, 'plugins', 'stipulate') : join(base, '.opencode', 'plugins', 'stipulate') };
}

export function preflightPlugin(options = {}) {
  const source = resolve(options.source || join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'opencode'));
  const target = options.destination ? { base: resolve(options.base || dirname(dirname(options.destination))), destination: resolve(options.destination) } : pluginDestination(options);
  safePath(target.base, target.destination);
  const distribution = sourcePackage(source);
  const existing = checkExisting(target.destination);
  return { source, ...target, distribution, existing };
}

function dependencies(directory) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  requireThat(result.status === 0, `Plugin dependency installation failed (${result.status ?? 'terminated'}); the active plugin was preserved`);
}

export function installPlugin(options = {}) {
  const ready = preflightPlugin(options);
  const summary = { package: PACKAGE, version: ready.distribution.manifest.version, destination: ready.destination, mode: ready.existing ? 'update' : 'install', sourceFiles: ready.distribution.files.length };
  if (options.dryRun) return { ...summary, dryRun: true };
  // Stage outside plugins/: OpenCode must never discover a half-installed package.
  const configDirectory = dirname(dirname(ready.destination));
  mkdirSync(configDirectory, { recursive: true });
  const transaction = join(configDirectory, `.stipulate-install-${randomUUID()}`);
  const staged = join(transaction, 'prepared');
  const backup = join(transaction, 'previous');
  mkdirSync(staged, { recursive: true });
  let previousMoved = false;
  let activated = false;
  let activationLock;
  const lockPath = join(configDirectory, ".stipulate-install.lock");
  try {
    for (const file of ready.distribution.files) {
      const path = join(staged, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, readFileSync(join(ready.source, file)));
    }
    (options.installDependencies || dependencies)(staged);
    writeFileSync(join(staged, OWNER), JSON.stringify({ version: 1, package: PACKAGE, release: ready.distribution.manifest.version, files: ready.distribution.hashes }, null, 2) + '\n');
    try { activationLock = openSync(lockPath, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw new Error("Another Stipulate plugin activation holds the install lock; retry after it finishes"); throw error; }
    // Recheck after dependency installation: another installer or user may have edited the target.
    safePath(ready.base, ready.destination);
    const current = checkExisting(ready.destination);
    requireThat(JSON.stringify(current) === JSON.stringify(ready.existing), 'Plugin installation changed during preparation; retry after reviewing it');
    mkdirSync(dirname(ready.destination), { recursive: true });
    if (stat(ready.destination)) { renameSync(ready.destination, backup); previousMoved = true; }
    renameSync(staged, ready.destination);
    activated = true;
    return { ...summary, dryRun: false };
  } catch (error) {
    if (previousMoved && !activated) renameSync(backup, ready.destination);
    throw error;
  } finally {
    if (activationLock !== undefined) { closeSync(activationLock); rmSync(lockPath); }
    // Never delete the previous installation if rollback failed.
    if (activated || !stat(backup)) rmSync(transaction, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = {};
  try {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--global') options.global = true;
      else if (args[i] === '--dry-run') options.dryRun = true;
      else if (['--source', '--destination', '--base'].includes(args[i])) { const key = args[i].slice(2); requireThat(args[i + 1] && !args[i + 1].startsWith('--'), `${args[i]} requires a path`); options[key] = args[++i]; }
      else throw new Error(`Unknown option: ${args[i]}`);
    }
    console.log(JSON.stringify(installPlugin(options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
