// Worker settings for Claude Code: orchestration.clients["claude-code"] in three scopes
// (personal <- project <- local), resolved defaults -> phase -> role -> phase-role.
// The OpenCode plugin reads only clients.opencode and orchestration.defaults, so nothing
// here is written outside clients["claude-code"].
import type {
  StipApplyGate,
  StipMotion,
  StipClientSettings,
  StipEffectiveSettings,
  StipProfile,
  StipScope,
  StipSettingsView,
} from '../../types'

export const PHASES = ['explore', 'validate', 'apply', 'check', 'docs'] as const
export const MODEL_ALIASES = ['haiku', 'sonnet', 'opus', 'fable'] as const
export const EFFORTS = ['inherit', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export const APPLY_GATES = ['off', 'warn', 'block'] as const
export const MOTION_MODES: readonly StipMotion[] = ['auto', 'calm', 'off']
export const SCOPES: readonly StipScope[] = ['personal', 'project', 'local']
const PROFILE_KEYS = ['model', 'effort', 'agent', 'isolate']
const DEFAULT_KEYS = [...PROFILE_KEYS, 'max_workers', 'max_shared_writers']
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/\-]{0,127}(\[1m\])?$/
const AGENT_TYPE = /^[A-Za-z0-9][A-Za-z0-9_:.-]{0,127}$/

export class SettingsError extends Error {}

function fail(message: string): never {
  throw new SettingsError(message)
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function checkProfile(value: unknown, where: string, allowed: string[]): StipProfile {
  if (!isObject(value)) fail(`${where}: a profile must be an object`)
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(`${where}: unknown field ${key}`)
  const { model, effort, agent, isolate } = value
  if (model !== undefined) {
    if (typeof model !== 'string' || !(model === 'inherit' || (MODEL_ALIASES as readonly string[]).includes(model) || MODEL_ID.test(model)))
      fail(`${where}: model must be inherit, ${MODEL_ALIASES.join(', ')} or a full model id`)
  }
  if (effort !== undefined && (typeof effort !== 'string' || !(EFFORTS as readonly string[]).includes(effort)))
    fail(`${where}: effort must be one of ${EFFORTS.join(', ')}`)
  if (agent !== undefined && (typeof agent !== 'string' || !AGENT_TYPE.test(agent) || agent.startsWith('stipulate:')))
    fail(`${where}: agent must name an existing agent type (not a stipulate: type)`)
  if (isolate !== undefined && typeof isolate !== 'boolean') fail(`${where}: isolate must be true or false`)
  if (agent !== undefined && agent !== 'inherit' && effort !== undefined && effort !== 'inherit')
    fail(`${where}: effort cannot be applied to an existing agent type; remove effort or agent`)
  return value as StipProfile
}

function checkLimit(value: unknown, key: string) {
  if (value !== undefined && !(Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 8))
    fail(`defaults: ${key} must be an integer between 1 and 8`)
}

function checkRole(role: string, where: string) {
  if (!SLUG.test(role)) fail(`${where}: invalid role ${role}`)
  if (role === 'discovery' || role === 'coordinator') fail(`${where}: discovery stays with the coordinator`)
}

/** Validates one scope's clients["claude-code"] section; returns it unchanged or throws with the reason. */
export function validateClient(value: unknown): StipClientSettings {
  if (value === undefined || value === null) return {}
  if (!isObject(value)) fail('clients["claude-code"] must be an object')
  for (const key of Object.keys(value))
    if (!['defaults', 'roles', 'phases', 'phase_roles', 'enforcement', 'ui'].includes(key)) fail(`unknown section ${key}`)
  if (value.defaults !== undefined) {
    const d = checkProfile(value.defaults, 'defaults', DEFAULT_KEYS) as Record<string, unknown>
    checkLimit(d.max_workers, 'max_workers')
    checkLimit(d.max_shared_writers, 'max_shared_writers')
  }
  if (value.roles !== undefined) {
    if (!isObject(value.roles)) fail('roles must be an object')
    for (const [role, p] of Object.entries(value.roles)) {
      checkRole(role, 'roles')
      checkProfile(p, `roles.${role}`, PROFILE_KEYS)
    }
  }
  if (value.phases !== undefined) {
    if (!isObject(value.phases)) fail('phases must be an object')
    for (const [phase, p] of Object.entries(value.phases)) {
      if (!(PHASES as readonly string[]).includes(phase)) fail(`phases: invalid phase ${phase}`)
      checkProfile(p, `phases.${phase}`, PROFILE_KEYS)
    }
  }
  if (value.phase_roles !== undefined) {
    if (!isObject(value.phase_roles)) fail('phase_roles must be an object')
    for (const [phase, roles] of Object.entries(value.phase_roles)) {
      if (!(PHASES as readonly string[]).includes(phase)) fail(`phase_roles: invalid phase ${phase}`)
      if (!isObject(roles)) fail(`phase_roles.${phase} must be an object`)
      for (const [role, p] of Object.entries(roles)) {
        checkRole(role, `phase_roles.${phase}`)
        checkProfile(p, `phase_roles.${phase}.${role}`, PROFILE_KEYS)
      }
    }
  }
  if (value.enforcement !== undefined) {
    if (!isObject(value.enforcement)) fail('enforcement must be an object')
    for (const key of Object.keys(value.enforcement)) if (key !== 'apply_gate') fail(`enforcement: unknown field ${key}`)
    const gate = value.enforcement.apply_gate
    if (gate !== undefined && !(APPLY_GATES as readonly string[]).includes(gate as string))
      fail('enforcement.apply_gate must be off, warn or block')
  }
  if (value.ui !== undefined) {
    if (!isObject(value.ui)) fail('ui must be an object')
    for (const key of Object.keys(value.ui)) if (key !== 'motion') fail(`ui: unknown field ${key}`)
    const motion = value.ui.motion
    if (motion !== undefined && !(MOTION_MODES as readonly unknown[]).includes(motion)) fail('ui.motion must be auto, calm or off')
  }
  return value as StipClientSettings
}

/** Deep merge of plain objects; later wins, arrays and scalars replace. */
export function merge<T>(a: T, b: unknown): T {
  if (!isObject(b)) return (b === undefined ? a : b) as T
  const out: Record<string, unknown> = isObject(a) ? { ...a } : {}
  for (const [k, v] of Object.entries(b)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') fail('unsafe settings key')
    out[k] = isObject(v) ? merge(out[k], v) : v
  }
  return out as T
}

/**
 * Merges the scopes and checks combinations that only appear together.
 * `shared` is orchestration.defaults from project/local (only its limits are read).
 */
export function effective(
  byScope: Partial<Record<StipScope, StipClientSettings>>,
  shared: { max_workers?: unknown; max_shared_writers?: unknown } = {},
): StipEffectiveSettings {
  let client: StipClientSettings = {}
  for (const scope of SCOPES) client = merge(client, validateClient(byScope[scope]))
  validateClient(client)
  const pick = (key: 'max_workers' | 'max_shared_writers', fallback: number) => {
    const own = client.defaults?.[key]
    const value = own ?? (Number.isInteger(shared[key]) ? (shared[key] as number) : fallback)
    if (!(Number.isInteger(value) && value >= 1 && value <= 8)) fail(`${key} must be between 1 and 8`)
    return value
  }
  const limits = { max_workers: pick('max_workers', 2), max_shared_writers: pick('max_shared_writers', 1) }
  if (limits.max_shared_writers > limits.max_workers)
    fail(`max_shared_writers (${limits.max_shared_writers}) cannot exceed max_workers (${limits.max_workers})`)
  if (limits.max_shared_writers > 1) {
    const off: string[] = []
    if (client.defaults?.isolate === false) off.push('defaults')
    for (const [role, p] of Object.entries(client.roles ?? {})) if (p.isolate === false) off.push(`roles.${role}`)
    for (const [phase, p] of Object.entries(client.phases ?? {})) if (p.isolate === false) off.push(`phases.${phase}`)
    for (const [phase, roles] of Object.entries(client.phase_roles ?? {}))
      for (const [role, p] of Object.entries(roles)) if (p.isolate === false) off.push(`phase_roles.${phase}.${role}`)
    if (off.length)
      fail(`Parallel writers (max_shared_writers > 1) need isolated worktrees; isolate is false in ${off.join(', ')}`)
  }
  const applyGate: StipApplyGate = client.enforcement?.apply_gate ?? 'block'
  const motion: StipMotion = client.ui?.motion ?? 'auto'
  return { client, limits, applyGate, motion }
}

export type ResolvedProfile = {
  model: string
  effort: string
  agent: string | null
  isolate: boolean
  sources: Record<string, string>
  /** The plugin agent type name (without the `stipulate:` prefix). */
  agentType: string
}

/** The plugin agent type for a task: `<role>`, or `<phase>-<role>` when a phase layer applies. */
export function agentTypeName(settings: StipEffectiveSettings, role: string, phase: string): string {
  const c = settings.client
  const phased = c.phases?.[phase] !== undefined || c.phase_roles?.[phase]?.[role] !== undefined
  return phased ? `${phase}-${role}` : role
}

/**
 * Resolves a worker profile: defaults -> phase -> role -> phase-role -> override.
 * A layer that changes the model resets an effort no later layer sets (to inherit).
 */
export function resolveProfile(
  settings: StipEffectiveSettings,
  role: string,
  phase: string,
  options: { writing: boolean; override?: StipProfile } = { writing: false },
): ResolvedProfile {
  checkRole(role, 'role')
  const c = settings.client
  const layers: [string, StipProfile | undefined][] = [
    ['defaults', c.defaults],
    ['phase', c.phases?.[phase]],
    ['role', c.roles?.[role]],
    ['phase-role', c.phase_roles?.[phase]?.[role]],
    ['task', options.override],
  ]
  const value = { model: 'inherit', effort: 'inherit', agent: null as string | null, isolate: undefined as boolean | undefined }
  const sources: Record<string, string> = {}
  for (const [source, p] of layers) {
    if (!p) continue
    if (p.model !== undefined && p.model !== value.model) {
      value.effort = 'inherit'
      sources.effort = source
    }
    if (p.model !== undefined) (value.model = p.model), (sources.model = source)
    if (p.effort !== undefined) (value.effort = p.effort), (sources.effort = source)
    if (p.agent !== undefined) (value.agent = p.agent === 'inherit' ? null : p.agent), (sources.agent = source)
    if (p.isolate !== undefined) (value.isolate = p.isolate), (sources.isolate = source)
  }
  if (value.agent && value.effort !== 'inherit')
    fail(`effort ${value.effort} cannot be applied to existing agent type ${value.agent}`)
  const isolate = options.writing && (value.isolate ?? settings.limits.max_shared_writers > 1)
  return { model: value.model, effort: value.effort, agent: value.agent, isolate, sources, agentType: agentTypeName(settings, role, phase) }
}

/** The path of the personal settings file under the user's Claude configuration directory. */
export function personalPath(env: { CLAUDE_CONFIG_DIR?: string; HOME?: string }): string {
  const base = env.CLAUDE_CONFIG_DIR || (env.HOME ? `${env.HOME}/.claude` : null)
  if (!base) fail('Cannot locate the Claude configuration directory (HOME is unset)')
  return `${base.replace(/\/+$/, '')}/stipulate.json`
}

/** Reads `orchestration.clients["claude-code"]` from a parsed scope document. */
export function clientOf(doc: unknown): StipClientSettings {
  if (!isObject(doc)) return {}
  const o = doc.orchestration
  if (!isObject(o) || !isObject(o.clients)) return {}
  const c = o.clients['claude-code']
  return (c ?? {}) as StipClientSettings
}

export function sharedDefaults(doc: unknown): { max_workers?: unknown; max_shared_writers?: unknown } {
  if (!isObject(doc) || !isObject(doc.orchestration) || !isObject(doc.orchestration.defaults)) return {}
  const d = doc.orchestration.defaults
  return { max_workers: d.max_workers, max_shared_writers: d.max_shared_writers }
}

/** Returns the scope document with only clients["claude-code"] replaced. */
export function withClient(doc: unknown, scope: StipScope, value: StipClientSettings): Record<string, unknown> {
  const base: Record<string, unknown> = isObject(doc)
    ? structuredClone(doc)
    : scope === 'project'
      ? { schema_version: 1, extensions: {}, settings: { require_user_approval: true } }
      : {}
  const orchestration = isObject(base.orchestration) ? base.orchestration : {}
  const clients = isObject(orchestration.clients) ? orchestration.clients : {}
  base.orchestration = { ...orchestration, clients: { ...clients, 'claude-code': value } }
  return base
}

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** The optimistic revision over the three scope files' raw texts ('' when missing). */
export async function revisionOf(raw: Record<StipScope, string>): Promise<string> {
  return sha256(SCOPES.map(s => `${s}:${(raw[s] ? '1' : '0')}:${raw[s]}`).join('\u0000'))
}

/** Builds the settings view from the raw scope texts; never throws (the error is reported). */
export async function viewOf(raw: Record<StipScope, string>, paths: Record<StipScope, string>): Promise<StipSettingsView> {
  const revision = await revisionOf(raw)
  const byScope = { personal: {}, project: {}, local: {} } as Record<StipScope, StipClientSettings>
  const docs = {} as Record<StipScope, unknown>
  let error: string | null = null
  for (const scope of SCOPES) {
    try {
      docs[scope] = raw[scope] ? JSON.parse(raw[scope]) : {}
      byScope[scope] = clientOf(docs[scope])
    } catch (e) {
      error = `${scope} settings (${paths[scope]}): ${(e as Error).message}`
    }
  }
  let eff: StipEffectiveSettings
  try {
    if (error) throw new SettingsError(error)
    eff = effective(byScope, merge(sharedDefaults(docs.project), sharedDefaults(docs.local)))
  } catch (e) {
    error = (e as Error).message
    // Fail safe: an unreadable configuration keeps the strictest gate and the engine's limits.
    eff = { client: {}, limits: { max_workers: 2, max_shared_writers: 1 }, applyGate: 'block', motion: 'auto' }
  }
  return { effective: eff, byScope, paths, revision, error }
}

/** Python run under the project lock: verify the revision, then replace the scope file atomically. */
export const SAVE_SCRIPT = `
import hashlib, json, os, sys, tempfile
req = json.load(sys.stdin)
lock = req['lock']
os.makedirs(os.path.dirname(lock), exist_ok=True)
try:
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
except FileExistsError:
    print(json.dumps({'error': 'Workflow is locked by another operation; retry.'}), file=sys.stderr); sys.exit(1)
try:
    os.write(fd, b'stipulate-settings'); os.close(fd)
    def raw(p):
        try:
            with open(p, 'rb') as f: return f.read().decode('utf-8')
        except FileNotFoundError: return ''
    texts = [raw(p) for p in req['paths']]
    parts = [s + ':' + ('1' if t else '0') + ':' + t for s, t in zip(['personal', 'project', 'local'], texts)]
    if hashlib.sha256('\\u0000'.join(parts).encode('utf-8')).hexdigest() != req['revision']:
        print(json.dumps({'error': 'Settings changed elsewhere; reload before saving.'}), file=sys.stderr); sys.exit(1)
    dest = req['dest']
    if os.path.islink(dest):
        print(json.dumps({'error': 'Settings destination is a symlink.'}), file=sys.stderr); sys.exit(1)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), prefix='.stip-settings-')
    with os.fdopen(fd, 'w', encoding='utf-8') as f: f.write(req['text'])
    os.chmod(tmp, 0o600 if req['scope'] == 'personal' else 0o644)
    os.replace(tmp, dest)
    print(json.dumps({'saved': True, 'path': dest}))
finally:
    try: os.unlink(lock)
    except FileNotFoundError: pass
`

// --- Project extensions (AC-47, AC-48): `.workflow/config.json` `extensions.<id>`, nothing else ---

/** An extension id as the engine accepts it (its `slug`). */
export const EXTENSION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Where a newly enabled extension's folder is recorded. */
export const extensionPath = (id: string) => `.workflow/extensions/${id}`

/** The enabled flags of a parsed config document, by id (an unreadable document enables nothing). */
export function enabledOf(doc: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!isObject(doc) || !isObject(doc.extensions)) return out
  for (const [id, entry] of Object.entries(doc.extensions)) out[id] = isObject(entry) && entry.enabled === true
  return out
}

/**
 * The Settings tab's list: every folder of `.workflow/extensions/` whose manifest names its own id,
 * then configured ids without such a folder; each with its description, flag and the changes not
 * yet archived that select it. Sorted by id.
 */
export function projectExtensionsOf(
  doc: unknown,
  manifests: Record<string, unknown>,
  uses: Record<string, string[]>,
): { id: string; description: string | null; enabled: boolean; present: boolean; selectedBy: string[] }[] {
  const enabled = enabledOf(doc)
  const present = Object.entries(manifests)
    .filter(([id, m]) => EXTENSION_ID.test(id) && isObject(m) && m.id === id)
    .map(([id]) => id)
  const ids = [...new Set([...present, ...Object.keys(enabled).filter(id => EXTENSION_ID.test(id))])].sort()
  return ids.map(id => {
    const m = manifests[id]
    const description = isObject(m) && typeof m.description === 'string' && m.description.trim() ? m.description.trim() : null
    return { id, description, enabled: enabled[id] === true, present: present.includes(id), selectedBy: [...(uses[id] ?? [])].sort() }
  })
}

/**
 * The one refusal of AC-48: the changes not yet archived that select `id`, named; null when none.
 * Checked before anything is written, and again under the lock by EXTENSION_SCRIPT.
 */
export function disableRefusal(id: string, users: string[]): string | null {
  if (!users.length) return null
  const list = [...users].sort()
  return `${id} stays enabled: ${list.length === 1 ? 'change' : 'changes'} ${list.join(', ')} ${list.length === 1 ? 'selects' : 'select'} it. Remove it from ${list.length === 1 ? 'that change' : 'those changes'} while exploring, or archive ${list.length === 1 ? 'it' : 'them'}, first.`
}

/**
 * Python run under the project lock (AC-47, AC-48): verify config.json is still the text the person
 * saw, refuse a disable that a change not yet archived selects (re-read under the lock), then set
 * only `extensions.<id>.enabled` (and `path` for a newly enabled one) and replace the file atomically.
 * Every other key and value is kept, in order, and the file keeps its layout as far as `json` can
 * write it: its indent (spaces or a tab, detected from the first indented line; one line stays one
 * line), whether non-ASCII text is written raw or as \u escapes, and its final newline. Residual: a
 * file mixing layouts is rewritten in the one detected, and spellings `json` normalizes (`\/`, `1E3`,
 * escapes of ASCII characters, spaces before colons) come back in its standard form. Every failure
 * is one line of JSON on stderr (`{"error": …}`), never a traceback.
 */
export const EXTENSION_SCRIPT = `
import hashlib, json, os, sys, tempfile
def out(error, **extra):
    print(json.dumps({'error': error, **extra}), file=sys.stderr); sys.exit(1)
try:
    req = json.load(sys.stdin)
    lock = req['lock']
except Exception as e:
    out('Invalid extension request: %s' % e)

# A JSON reader that keeps where each value sits in the text, so the edit touches only those spans.
WS = ' \\t\\r\\n'
class Bad(Exception): pass
def skip(t, i):
    while i < len(t) and t[i] in WS: i += 1
    return i
def string_end(t, i):
    i += 1
    while i < len(t):
        c = t[i]
        if c == '\\\\': i += 2; continue
        if c == '"': return i + 1
        i += 1
    raise Bad('unterminated string')
def value(t, i):
    i = skip(t, i)
    if i >= len(t): raise Bad('unexpected end')
    c = t[i]
    if c == '{':
        node = {'kind': 'object', 'start': i, 'members': []}
        i = skip(t, i + 1)
        if t[i:i + 1] == '}':
            node['end'] = i + 1; return node
        while True:
            i = skip(t, i)
            if t[i:i + 1] != '"': raise Bad('expected a key')
            kend = string_end(t, i)
            key = json.loads(t[i:kend])
            kstart = i
            i = skip(t, kend)
            if t[i:i + 1] != ':': raise Bad('expected a colon')
            v = value(t, i + 1)
            node['members'].append({'key': key, 'kstart': kstart, 'kend': kend, 'value': v})
            i = skip(t, v['end'])
            if t[i:i + 1] == ',': i += 1; continue
            if t[i:i + 1] == '}': node['end'] = i + 1; return node
            raise Bad('expected , or }')
    if c == '[':
        i = skip(t, i + 1)
        start = i - 1
        if t[i:i + 1] == ']': return {'kind': 'array', 'start': start, 'end': i + 1}
        while True:
            v = value(t, i)
            i = skip(t, v['end'])
            if t[i:i + 1] == ',': i += 1; continue
            if t[i:i + 1] == ']': return {'kind': 'array', 'start': start, 'end': i + 1}
            raise Bad('expected , or ]')
    if c == '"': return {'kind': 'string', 'start': i, 'end': string_end(t, i)}
    j = i
    while j < len(t) and t[j] not in WS + ',]}': j += 1
    if j == i: raise Bad('unexpected character')
    return {'kind': 'scalar', 'start': i, 'end': j}
def member(node, key):
    for m in node['members']:
        if m['key'] == key: return m
    return None

try:
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
except FileExistsError:
    out('Workflow is locked by another operation; retry.')
except OSError as e:
    out('The workflow lock could not be taken: %s' % e.strerror)
try:
    os.write(fd, b'stipulate-extensions'); os.close(fd)
    dest = req['config']
    if os.path.islink(dest):
        out('The project config is a symlink.')
    try:
        with open(dest, 'rb') as f: text = f.read().decode('utf-8')
        mode = os.stat(dest).st_mode & 0o7777
    except FileNotFoundError:
        out('The project config .workflow/config.json is missing; set Stip up again with /stip-bootstrap.')
    except (OSError, UnicodeDecodeError) as e:
        out('The project config could not be read: %s' % e)
    if hashlib.sha256(text.encode('utf-8')).hexdigest() != req['revision']:
        out('The project config changed elsewhere; reload before saving.')
    bom = 1 if text.startswith('﻿') else 0
    try:
        doc = json.loads(text[bom:])
        root = value(text, bom)
        if skip(text, root['end']) != len(text): raise Bad('extra text after the document')
    except (ValueError, Bad) as e:
        out('The project config is not valid JSON (%s); fix .workflow/config.json first.' % str(e).split('\\n')[0])
    if not isinstance(doc, dict) or not isinstance(doc.get('extensions'), dict) or root['kind'] != 'object':
        out('The project config has no extensions object.')
    ident = req['id']
    enabled = bool(req['enabled'])
    if not enabled:
        users = []
        changes = req['changes']
        for name in sorted(os.listdir(changes)) if os.path.isdir(changes) else []:
            try:
                with open(os.path.join(changes, name, 'state.json'), 'rb') as f: state = json.loads(f.read().decode('utf-8'))
            except (OSError, ValueError):
                continue
            selected = state.get('extensions') if isinstance(state, dict) else None
            if isinstance(selected, list) and state.get('phase') != 'archived' and ident in selected:
                users.append(name)
        if users:
            out('in use', users=users)

    # The file's own spelling of what is inserted: its line break, colon and indent unit.
    nl = '\\r\\n' if '\\r\\n' in text else '\\n'
    exts = member(root, 'extensions')
    if exts is None or exts['value']['kind'] != 'object':
        out('The project config has no extensions object.')
    colon = text[exts['kend']:exts['value']['start']]
    colon = colon.replace('\\r', '').replace('\\n', '')
    if ':' not in colon: colon = ': '
    def indent_of(pos):
        line = text.rfind('\\n', 0, pos) + 1
        lead = text[line:pos]
        return lead if lead.strip() == '' else None
    key_indent = indent_of(exts['kstart'])
    obj = exts['value']
    multiline = key_indent is not None and '\\n' in text[root['start']:root['end']]
    def first_indent(node):
        return indent_of(node['members'][0]['kstart']) if node['members'] else None
    unit = None
    if multiline:
        unit = key_indent if key_indent else '  '
        inner = first_indent(obj)
        if inner is not None and inner.startswith(key_indent) and len(inner) > len(key_indent): unit = inner[len(key_indent):]
    def spans_lines(node):
        return '\\n' in text[node['start']:node['end']]
    def insert(node, pairs, own_indent, multi):
        """Where and what to add so object node ends with pairs, spelled like its members."""
        texts = [json.dumps(k) + colon + v for k, v in pairs]
        if node['members']:
            last = node['members'][-1]
            if len(node['members']) > 1:
                gap = text[node['members'][-2]['value']['end']:last['kstart']]
            else:
                lead = text[node['start'] + 1:last['kstart']]
                gap = ',' + lead if '\\n' in lead else (', ' if colon.endswith(' ') else ',')
            return last['value']['end'], ''.join(gap + t for t in texts)
        if multi and unit is not None:
            inner = nl + own_indent + unit
            return node['start'] + 1, inner + (',' + inner).join(texts) + nl + own_indent
        return node['start'] + 1, (', ' if colon.endswith(' ') else ',').join(texts)
    entry = member(obj, ident)
    flag = 'true' if enabled else 'false'
    path_text = json.dumps(req['path'])
    edits = []
    if entry is not None and entry['value']['kind'] == 'object':
        node = entry['value']
        en = member(node, 'enabled')
        if en is not None:
            edits.append((en['value']['start'], en['value']['end'], flag))
        pairs = ([] if en is not None else [('enabled', flag)]) + ([('path', path_text)] if enabled and member(node, 'path') is None else [])
        if pairs:
            at, add = insert(node, pairs, indent_of(entry['kstart']) or '', spans_lines(obj))
            edits.append((at, at, add))
    elif enabled:
        # A new entry: laid out like a sibling entry object when there is one, else like the file.
        own = (indent_of(obj['members'][0]['kstart']) if obj['members'] else None)
        if own is None: own = (key_indent or '') + (unit or '')
        sibling = next((m['value'] for m in obj['members'] if m['value']['kind'] == 'object'), None)
        multi = spans_lines(sibling) if sibling is not None else (spans_lines(obj) if obj['members'] else multiline)
        empty = {'start': 0, 'members': []}
        obj_text = '{' + insert(empty, [('enabled', 'true'), ('path', path_text)], own, multi and unit is not None)[1] + '}'
        if entry is not None:
            edits.append((entry['value']['start'], entry['value']['end'], obj_text))
        else:
            at, add = insert(obj, [(ident, obj_text)], key_indent or '', spans_lines(obj) or multiline)
            edits.append((at, at, add))
    else:
        print(json.dumps({'saved': False, 'path': dest})); sys.exit(0)
    new = text
    for start, end, repl in sorted(edits, key=lambda e: e[0], reverse=True):
        new = new[:start] + repl + new[end:]

    # The edit must be exactly the intended change, or nothing is written.
    expected = json.loads(text[bom:])
    e = expected['extensions'].get(ident)
    if isinstance(e, dict):
        e['enabled'] = enabled
        if enabled and 'path' not in e: e['path'] = req['path']
    else:
        expected['extensions'][ident] = {'enabled': True, 'path': req['path']}
    try:
        if json.loads(new[bom:]) != expected: raise Bad('mismatch')
    except (ValueError, Bad):
        out('The project config could not be edited in place; change extensions.%s by hand.' % ident)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), prefix='.stip-config-')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f: f.write(new)
    os.chmod(tmp, mode)
    os.replace(tmp, dest)
    print(json.dumps({'saved': True, 'path': dest}))
except SystemExit:
    raise
except Exception as e:
    out('The extension setting could not be saved: %s: %s' % (type(e).__name__, str(e).split('\\n')[0]))
finally:
    try: os.unlink(lock)
    except (NameError, FileNotFoundError): pass
`
