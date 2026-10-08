// Worker settings for Claude Code: orchestration.clients["claude-code"] in three scopes
// (personal <- project <- local), resolved defaults -> phase -> role -> phase-role.
// The OpenCode plugin reads only clients.opencode and orchestration.defaults, so nothing
// here is written outside clients["claude-code"].
import type {
  StipApplyGate,
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
    if (!['defaults', 'roles', 'phases', 'phase_roles', 'enforcement'].includes(key)) fail(`unknown section ${key}`)
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
  return { client, limits, applyGate }
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
    eff = { client: {}, limits: { max_workers: 2, max_shared_writers: 1 }, applyGate: 'block' }
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
