// Stipulate core: tools, agent types, dispatch and tracking, guards, approval and settings.
// The interface (hooks/ui) reads the state below and calls the exported actions.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type {
  StipCriterion,
  StipTamper,
  StipTicket,
  StipBinding,
  StipChangeRef,
  StipClientSettings,
  StipScope,
  StipSettingsView,
  StipSnapshot,
} from '../../types'
import {
  TOOL_NAMES,
  agentTypeOf,
  buildBrief,
  buildHelperBrief,
  criteriaText,
  describeHelper,
  describeTask,
  helperAgentSpec,
  parseDescription,
  workerAgentSpec,
  type PlanTask,
} from './brief.ts'
import {
  PLUGIN,
  TOOL_PREFIX,
  WORKER_FORBIDDEN_TOOLS,
  absolute,
  applyGate,
  deny,
  helperBash,
  inside,
  mainBash,
  protectedState,
  reentryVerdict,
  storeWrite,

  workerBash,
  workerEnvPrefix,
  type WorkerMirror,
  workerWrite,
  writeTarget,
} from './guards.ts'
import {
  sha256,
  SAVE_SCRIPT,
  SCOPES,
  SettingsError,
  effective,
  personalPath,
  resolveProfile,
  validateClient,
  viewOf,
  withClient,
} from './settings.ts'
import { ACTIVE, buildSnapshot, emptySnapshot, type Job } from './snapshot.ts'
import { TOASTS, coalesce, toastText, type CoalesceState } from './notify.ts'
import { LABEL_PROMPT, cleanLabel, fallbackLabel, parseCriteria, parseEvidence } from './criteria.ts'
import { canon, hmac, legalTransition, sha256Sync, verifyRebase, parseRegistry, registryKey, verifyRegistry, type Registry, type Verdict } from './integrity.ts'

export * from './settings.ts'
export { applyGate, isApproved, workerBash, workerWrite, helperBash, mainBash, protectedState } from './guards.ts'
export { buildBrief, criteriaText, describeTask, parseDescription, TOOL_NAMES } from './brief.ts'

// --- The bundled lifecycle engine (assets/workflow.py), run through $.process.run ---
// Every lifecycle and registry mutation goes through it; the mod never edits that state.

type Dollar = EngineInterface

export type Conflict = { path: string; reason: string }

export class EngineError extends Error {
  conflicts: Conflict[] | undefined
  constructor(message: string, conflicts?: Conflict[]) {
    super(message)
    this.conflicts = conflicts
  }
}

export type Context = { root: string; engine: string }

let cached: { key: string; ctx: Context } | null = null

/** The project root (physical path, as the engine requires) and the bundled engine path. */
async function context($: Dollar): Promise<Context> {
  const session = await $.session.root()
  const engine = `${$.plugin.root.replace(/\/+$/, '')}/assets/workflow.py`
  const key = `${session}\u0000${engine}`
  if (cached?.key === key) return cached.ctx
  const stat = await $.fs.stat(session, { resolve: true }).catch(() => undefined)
  const root = stat?.realPath ?? session
  cached = { key, ctx: { root, engine } }
  cachedRoot = root
  return cached.ctx
}

/** True when the project uses Stip (a .workflow folder at its root). */
async function hasWorkflow($: Dollar, root: string): Promise<boolean> {
  return $.fs.exists(`${root}/.workflow`).catch(() => false)
}

function parseError(stderr: string, exitCode: number): EngineError {
  const text = stderr.trim()
  const last = text.split('\n').filter(Boolean).at(-1) ?? ''
  try {
    const value = JSON.parse(last) as { error?: string; conflicts?: Conflict[] }
    if (value && typeof value.error === 'string') return new EngineError(value.error, value.conflicts)
  } catch {}
  return new EngineError(text ? text.slice(-2000) : `Engine exited with status ${exitCode}`)
}

/** Runs one engine command and parses its JSON stdout; refusals throw EngineError. */
async function engine(
  $: Dollar,
  args: readonly string[],
  options: { stdin?: string; timeoutMs?: number } = {},
): Promise<any> {
  const ctx = await context($)
  const result = await $.process.run(['python3', ctx.engine, '--root', ctx.root, ...args], {
    cwd: ctx.root,
    env: { PYTHONDONTWRITEBYTECODE: '1', STIP_WORKER: '' },
    ...(options.stdin !== undefined ? { stdin: options.stdin } : {}),
    timeoutMs: options.timeoutMs ?? 60_000,
  })
  if (result.exitCode !== 0) throw parseError(result.stderr, result.exitCode)
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new EngineError('The engine returned output that is not JSON')
  }
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs a mutating engine command, serialized within this module and retried briefly
 * while another process holds .workflow/.lock.
 */
function mutate($: Dollar, args: readonly string[], options: { stdin?: string; timeoutMs?: number } = {}): Promise<any> {
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await engine($, args, options)
      } catch (e) {
        if (!(e instanceof EngineError) || !/Workflow is locked/.test(e.message) || attempt >= 4) throw e
        await $.clock.sleep(150 * (attempt + 1))
      }
    }
  }
  const lifecycle = args[0] !== 'runtime' || args[1] === 'revoke-approval'
  const guarded = async () => {
    if (lifecycle) lifecycleWrites++
    engineInFlight++
    await markBusy($, true)
    try {
      const result = await run()
      // Known-good registry state comes only from this call's own report of what it wrote.
      await adoptOwnWrite($, args, result).catch(e => log($, `adopt: ${errorText(e)}`))
      return result
    } finally {
      if (lifecycle) lifecycleWrites++
      engineInFlight--
      if (engineInFlight === 0) {
        await markBusy($, false)
        if (tickDeferred) {
          tickDeferred = false
          void integrityTick($, true).catch(err => log($, `watch: ${errorText(err)}`))
        }
      }
    }
  }
  const next = queue.then(guarded, guarded)
  queue = next.catch(() => undefined)
  return next
}

/** Bumped around every lifecycle write the core makes itself. */
let lifecycleWrites = 0
let engineInFlight = 0
let mainBashInFlight = 0

// --- Integrity watch (AC-11, AC-14) ---
// Registry files (.workflow/.runtime/<change>/state.json, engine-helpers.json): known-good comes ONLY
// from the mod's own engine calls (each verified against the job the call reports); nothing else may
// change them. Lifecycle state.json: changes inside a coordinator Bash call are accepted when no worker
// call overlapped it and the phase move is legal; anything else is restored.

/** Known-good text per watched file ('' when absent). */
/** This instance's cache of known-good text; the shared journal (below) is authoritative. */
const localKnown = new Map<string, string>()

// Known-good state is shared by every Stip instance on the project (another session, a backgrounded
// one, the module after a hot reload): each own engine write records the resulting text in a journal
// beside the registry, signed with a key kept in the plugin store. A change on disk that matches the
// journal is another instance's legitimate write, never tampering.

type Journal = { text: string; sha: string; by: string; at: number; mac: string }

function journalPath(root: string, path: string): string {
  if (path === `${root}/.workflow/.runtime/engine-helpers.json`) return `${root}/.workflow/.runtime/stip-known-helpers.json`
  const reg = /\/\.workflow\/\.runtime\/([a-z0-9-]+)\/state\.json$/.exec(path)
  if (reg) return `${root}/.workflow/.runtime/${reg[1]}/stip-known.json`
  const life = /\/\.workflow\/changes\/([a-z0-9-]+)\/state\.json$/.exec(path)
  if (life) return `${root}/.workflow/.runtime/${life[1]}/stip-known-lifecycle.json`
  return `${path}.stip-known.json`
}

const fingerprint = async (path: string, text: string) =>
  sha256Sync(path.includes('/.workflow/.runtime/') ? canon(parseRegistry(text)) : text)

let macKey: Uint8Array | null = null
async function journalKey($: Dollar): Promise<Uint8Array> {
  if (macKey) return macKey
  let raw = await $.store.get('journalKey')
  if (typeof raw !== 'string' || raw.length < 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    raw = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
    await $.store.set('journalKey', raw)
  }
  macKey = new TextEncoder().encode(raw as string)
  return macKey
}

async function mac($: Dollar, path: string, sha: string, at: number): Promise<string> {
  return hmac(await journalKey($), `${path}\n${sha}\n${at}`)
}

/** Journal entries already verified, by their raw text (a tick re-verifies only what changed). */
const verifiedJournal = new Map<string, Journal>()

async function readJournal($: Dollar, path: string): Promise<Journal | null> {
  const { root } = await context($)
  const text = await readOr($, journalPath(root, path)).catch(() => '')
  if (!text) return null
  const hit = verifiedJournal.get(text)
  if (hit) return hit
  try {
    const j = JSON.parse(text) as Journal
    if (typeof j.text !== 'string' || typeof j.sha !== 'string' || typeof j.at !== 'number') return null
    // A journal entry not signed with the project's key, or whose text does not match, is ignored.
    if (j.mac !== (await mac($, path, j.sha, j.at)) || j.sha !== (await fingerprint(path, j.text))) return null
    if (verifiedJournal.size > 64) verifiedJournal.clear()
    verifiedJournal.set(text, j)
    return j
  } catch {
    return null
  }
}

/** Known-good text: the shared journal's when valid, else this instance's own. */
async function known($: Dollar, path: string): Promise<string | undefined> {
  const j = await readJournal($, path)
  if (j) {
    localKnown.set(path, j.text)
    return j.text
  }
  return localKnown.get(path)
}

async function setKnown($: Dollar, path: string, text: string) {
  localKnown.set(path, text)
  const { root } = await context($)
  const at = await $.clock.now()
  const sha = await fingerprint(path, text)
  const entry: Journal = { text, sha, by: instanceId, at, mac: await mac($, path, sha, at) }
  const raw = JSON.stringify(entry)
  verifiedJournal.set(raw, entry)
  await $.fs.write(journalPath(root, path), raw)
}

/** This instance (session id; the same across hot reloads of one session). */
let instanceId = 'unknown'

/** Each instance's own busy marker (one file per instance, so none overwrites another's). */
const busyFile = (root: string, id: string) => `${root}/.workflow/.runtime/stip-busy-${id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}.json`

/** Another instance is writing (its engine call is in flight): skip judging until it is done. */
async function otherBusy($: Dollar): Promise<boolean> {
  const { root } = await context($)
  const mine = busyFile(root, instanceId).split('/').pop()
  const now = await $.clock.now()
  for (const entry of await $.fs.list(`${root}/.workflow/.runtime`).catch(() => [])) {
    if (!/^stip-busy-.*\.json$/.test(entry.name) || entry.name === mine) continue
    try {
      const b = JSON.parse(await readOr($, `${root}/.workflow/.runtime/${entry.name}`)) as { until?: number }
      if (typeof b.until === 'number' && b.until > now) return true
    } catch {}
  }
  return false
}

async function markBusy($: Dollar, on: boolean) {
  const { root } = await context($)
  const until = on ? (await $.clock.now()) + 15_000 : 0
  await $.fs.write(busyFile(root, instanceId), JSON.stringify({ by: instanceId, until })).catch(() => undefined)
}

/** A tick that fell during one of this instance's own engine calls runs right after it. */
let tickDeferred = false
/** Worker tool calls started, and worker Bash calls in flight (for attributing coordinator Bash windows). */
let workerCalls = 0
let workerBashInFlight = 0
/** When a worker last returned or ended; the watch keeps its fast cadence 30 s after it. */
let lastWorkerEnd = 0
const GRACE_MS = 30_000
/** Idle cadence: with no worker active, the watch compares every 10 s (every 3 s otherwise). */
const IDLE_MS = 10_000
let lastIdleCheck = 0
/** What was on disk when the watch restored a file, for /stip-resync to show and re-apply. */
const rejected = new Map<string, string>()
const RESYNC_HINT = 'If you made this change yourself (for example in another terminal), run /stip-resync to review and adopt it.'

const readOr = async ($: Dollar, path: string) => ((await $.fs.exists(path)) ? ((await $.fs.read(path)) as string) : '')
const registryText = (r: Registry | null) => (r ? JSON.stringify(r, null, 2) + '\n' : '')

async function watchedFiles($: Dollar): Promise<{ registries: string[]; lifecycles: string[] }> {
  const { root } = await context($)
  const changes = new Set<string>()
  for (const b of Object.values(await read($, workersAtom))) if (b.changeId) changes.add(b.changeId)
  const bound = await read($, bindingAtom)
  if (bound) changes.add(bound)
  return {
    registries: [...[...changes].map(id => `${root}/.workflow/.runtime/${id}/state.json`), `${root}/.workflow/.runtime/engine-helpers.json`],
    lifecycles: [...changes].map(id => `${root}/.workflow/changes/${id}/state.json`),
  }
}

/** Takes the files as they are now as known-good (session start, idle periods, first sight). */
/**
 * Takes disk as known-good only where no instance has recorded a known-good state yet (first
 * activation in a project, or a file first seen). A session start or hot reload keeps the journal's.
 */
async function baselineWatched($: Dollar) {
  const { registries, lifecycles } = await watchedFiles($)
  for (const p of [...registries, ...lifecycles]) if ((await known($, p)) === undefined) await setKnown($, p, await readOr($, p))
}

/** After the mod's own engine call: verify the registry against the job the call reports, then adopt it. */
async function adoptOwnWrite($: Dollar, args: readonly string[], result: any) {
  const { root } = await context($)
  if (args[0] === 'runtime' && args[1] !== 'show' && args[1] !== 'revoke-approval') {
    const helper = args.includes('--helper')
    const path = helper ? `${root}/.workflow/.runtime/engine-helpers.json` : `${root}/.workflow/.runtime/${args[2]}/state.json`
    const disk = await readOr($, path)
    if (!((await known($, path)) !== undefined)) {
      await setKnown($, path, disk)
      return
    }
    if (args[1] === 'rebase') {
      // A rebase retires removed tasks and reopens changed ones: exactly what it reports, nothing else.
      const before = parseRegistry((await known($, path))!)
      const after = parseRegistry(disk)
      if (verifyRebase(before, after, result ?? {})) await setKnown($, path, disk)
      else await onRegistryTamper($, path, verifyRegistry(before, after), after)
      return
    }
    const verdict = verifyRegistry(parseRegistry((await known($, path))!), parseRegistry(disk), result?.job ?? null, args[1] === 'reserve' && args.includes('--correction'), args[1])
    if (verdict.ok) await setKnown($, path, disk)
    else await onRegistryTamper($, path, verdict, parseRegistry(disk))
    return
  }
  // A lifecycle call of the mod's own (approve, validate, plan, revoke): adopt that change's state.
  const id = args[0] === 'runtime' ? args[2] : args[1]
  if (id && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    const path = `${root}/.workflow/changes/${id}/state.json`
    await setKnown($, path, await readOr($, path))
  }
}

const ACTIVE_WORKER = ['starting', 'running', 'waiting', 'unknown']

async function watching($: Dollar): Promise<boolean> {
  const bound = Object.values(await read($, workersAtom)).some(b => ACTIVE_WORKER.includes(b.status))
  if (bound) return true
  for (const path of (await watchedFiles($)).registries)
    if (parseRegistry((await known($, path)) ?? '')?.jobs.some(j => ACTIVE.includes(j.status))) return true
  return (await $.clock.now()) - lastWorkerEnd < GRACE_MS
}

/**
 * Cancels the active workers of a change (or all helpers) after tampering. The targets come from the
 * known-good registry (the trusted state), not from bindings a refresh may have synced from the tampered file.
 */
async function cancelActive($: Dollar, changeId: string | null, reason: string, registry?: Registry | null): Promise<string[]> {
  const { root } = await context($)
  const trusted = registry ?? parseRegistry((await known($, changeId ? `${root}/.workflow/.runtime/${changeId}/state.json` : `${root}/.workflow/.runtime/engine-helpers.json`)) ?? '')
  const targets = new Map<string, { helperId?: string; taskId: string; attempt: number }>()
  for (const j of trusted?.jobs ?? [])
    if (ACTIVE.includes(j.status)) targets.set(registryKey(j), typeof j.helper_id === 'string' ? { helperId: j.helper_id, taskId: j.helper_id, attempt: 1 } : { taskId: j.task_id, attempt: j.attempt })
  for (const b of Object.values(await read($, workersAtom))) {
    if (!ACTIVE_WORKER.includes(b.status)) continue
    if (changeId !== null ? b.changeId !== changeId || b.kind !== 'task' : b.kind !== 'helper') continue
    targets.set(b.helperId ?? `${b.taskId}#${b.attempt}`, b.helperId ? { helperId: b.helperId, taskId: b.taskId, attempt: 1 } : { taskId: b.taskId, attempt: b.attempt })
  }
  const out: string[] = []
  for (const t of targets.values()) {
    try {
      if (t.helperId) await cancel($, { helperId: t.helperId, reason })
      else if (changeId) await cancel($, { changeId, taskId: t.taskId, reason })
    } catch (e) {
      log($, `integrity cancel ${t.taskId}: ${errorText(e)}`)
    }
    // Deny the agent's further calls whatever the registry said.
    for (const b of Object.values(await read($, workersAtom)))
      if ((t.helperId ? b.helperId === t.helperId : b.changeId === changeId && b.taskId === t.taskId && b.attempt === t.attempt) && b.agentId)
        await patchBinding($, b.agentId, { status: 'cancelled' })
    out.push(`${t.taskId}#${t.attempt}`)
  }
  return out
}

/** Paths under write_paths that differ from HEAD in the main checkout. */
async function dirtyPaths($: Dollar, writePaths: string[]): Promise<string[]> {
  if (!writePaths.length) return []
  const { root } = await context($)
  const r = await $.process.run(['git', 'status', '--porcelain', '--untracked-files=all', '--', ...writePaths], { cwd: root, timeoutMs: 15_000 }).catch(() => null)
  if (!r || r.exitCode !== 0) return []
  return r.stdout
    .split('\n')
    .filter(Boolean)
    .map(l => l.slice(3).replace(/^.* -> /, ''))
}

/** Restores known-good registry state, cancels that change's workers and flags tampered attempts. */
async function onRegistryTamper($: Dollar, path: string, verdict: Verdict, disk: Registry | null) {
  const { root } = await context($)
  const text = registryText(verdict.restored)
  rejected.set(path, disk ? registryText(disk) : await readOr($, path))
  if (text) await $.fs.write(path, text)
  await setKnown($, path, text)
  const rel = path.slice(root.length + 1)
  const changeId = /\.runtime\/([a-z0-9-]+)\/state\.json$/.exec(path)?.[1] ?? null
  const flagged: string[] = []
  if (changeId) {
    for (const key of verdict.tampered) {
      const job = disk?.jobs.find(j => registryKey(j) === key) ?? verdict.restored?.jobs.find(j => registryKey(j) === key)
      if (!job || typeof job.task_id !== 'string') continue
      const paths = await dirtyPaths($, Array.isArray(job.write_paths) ? job.write_paths : [])
      const integratedClaim = verdict.integrated.includes(key)
      if (!integratedClaim && !paths.length) continue
      const tamper: StipTamper = {
        changeId,
        taskId: job.task_id,
        attempt: job.attempt,
        integratedClaim,
        paths,
        at: await $.clock.now(),
        note: `The registry record of ${job.task_id}#${job.attempt} was changed outside Stip${integratedClaim ? ' (it claimed an integration)' : ''}. Inspect git diff${paths.length ? ` of ${paths.join(', ')}` : ''} before accepting; source files were not reverted.`,
      }
      await update($, tamperedAtom, m => ({ ...m, [`${changeId}/${job.task_id}#${job.attempt}`]: tamper }))
      flagged.push(`${job.task_id}#${job.attempt}`)
    }
  }
  const cancelled = await cancelActive($, changeId, `The worker registry (${rel}) was changed outside this Claude Code session; restored and cancelled.`, verdict.restored)
  const text2 =
    `${PLUGIN}: ${rel} was changed outside this Claude Code session; restored the last good state` +
    (cancelled.length ? `, cancelled ${cancelled.join(', ')}` : '') +
    (flagged.length ? `. Tampered: ${flagged.join(', ')}; inspect git diff before accepting.` : '.') +
    ` ${RESYNC_HINT}`
  await notify($, flagged.length ? `tampered:${rel}` : `registry:${rel}`, flagged.length ? TOASTS.tampered(flagged) : TOASTS.registryRestored(cancelled.length), text2, 20_000)
  statusLine($, flagged.length ? TOASTS.tampered(flagged) : 'Registry restored')
  log($, text2)
  await refresh($, { force: true }).catch(() => undefined)
}

/** Restores an unexpected lifecycle change and cancels that change's workers. */
async function onLifecycleTamper($: Dollar, path: string, why: string) {
  const { root } = await context($)
  const good = (await known($, path)) ?? ''
  const disk = await readOr($, path)
  const changeId = /changes\/([a-z0-9-]+)\/state\.json$/.exec(path)?.[1] ?? null
  const archived = !disk && changeId !== null && (await $.fs.exists(`${root}/.workflow/archive/${changeId}/state.json`))
  rejected.set(path, disk)
  // A change moved to the archive is not recreated; it is reported for the person to resolve.
  if (good && !archived) await $.fs.write(path, good)
  const cancelled = changeId ? await cancelActive($, changeId, `Lifecycle state changed outside Stip (${why}); restored and cancelled.`) : []
  const text = `${PLUGIN}: ${path.slice(root.length + 1)} changed outside this Claude Code session (${why}); ${archived ? 'the change was archived, not restored' : 'restored'}${cancelled.length ? `, cancelled ${cancelled.join(', ')}` : ''}. ${RESYNC_HINT}`
  await notify($, `lifecycle:${path}`, TOASTS.lifecycleRestored(), text, 20_000)
  statusLine($, 'Lifecycle restored')
  log($, text)
  await checkProvenance($).catch(() => undefined)
  await refresh($, { force: true }).catch(() => undefined)
}

const phaseOf = (text: string): string | null => {
  try {
    return text ? (JSON.parse(text).phase ?? null) : null
  } catch {
    return null
  }
}

/** One watch tick (every 3 s): compare against known-good, never re-baseline while watching. */
async function integrityTick($: Dollar, force = false): Promise<string[]> {
  if (engineInFlight > 0) {
    tickDeferred = true
    return []
  }
  // The watch runs for the whole session and never re-baselines from disk; idle, it is slower.
  if (!force && !(await watching($))) {
    const now = await $.clock.now()
    if (now - lastIdleCheck < IDLE_MS) return []
    lastIdleCheck = now
  }
  const { root } = await context($)
  if (await $.fs.exists(`${root}/.workflow/.lock`)) return []
  if (await otherBusy($)) return []
  await baselineWatched($)
  const changed: string[] = []
  const { registries, lifecycles } = await watchedFiles($)
  for (const path of registries) {
    const disk = await readOr($, path)
    const good = (await known($, path))!
    if (canon(parseRegistry(disk)) === canon(parseRegistry(good))) continue
    const verdict = verifyRegistry(parseRegistry(good), parseRegistry(disk))
    if (verdict.ok) continue
    changed.push(path)
    await onRegistryTamper($, path, verdict, parseRegistry(disk))
  }
  // A coordinator Bash call in flight attributes lifecycle changes when it ends.
  if (mainBashInFlight === 0)
    for (const path of lifecycles) {
      if ((await readOr($, path)) === (await known($, path))) continue
      changed.push(path)
      await onLifecycleTamper($, path, 'not made by Stip or the coordinator in this session')
    }
  return changed
}

/** At the end of a coordinator Bash call: accept its lifecycle changes only when unambiguous and legal. */
async function attributeCoordinatorBash($: Dollar, overlapped: boolean) {
  const { lifecycles } = await watchedFiles($)
  for (const path of lifecycles) {
    const disk = await readOr($, path)
    const good = (await known($, path))
    if (good === undefined || disk === good) {
      await setKnown($, path, disk)
      continue
    }
    const { root } = await context($)
    const id = /changes\/([a-z0-9-]+)\/state\.json$/.exec(path)?.[1]
    // `archive` moves the change folder: its new phase is in .workflow/archive/<id>/state.json.
    const moved = !disk && id ? phaseOf(await readOr($, `${root}/.workflow/archive/${id}/state.json`)) : null
    const to = disk ? phaseOf(disk) : moved
    if (overlapped) await onLifecycleTamper($, path, 'a worker ran during the coordinator command')
    else if (!legalTransition(phaseOf(good), to)) await onLifecycleTamper($, path, `illegal phase move ${phaseOf(good)} -> ${to}`)
    else await setKnown($, path, disk)
  }
}

/** Flushes last tools recorded where the engine could not be called (re-entry path). */
async function flushPendingTools($: Dollar) {
  for (const [agentId, tool] of [...pendingTools]) {
    pendingTools.delete(agentId)
    const b = (await read($, workersAtom))[agentId]
    if (!b || !ACTIVE_WORKER.includes(b.status) || !b.agentId) continue
    await patchBinding($, agentId, { lastTool: tool })
    await mutate($, [...settleArgs(b, 'running'), '--last-tool', tool.slice(0, 256)]).catch(err => log($, `flush ${b.taskId}: ${errorText(err)}`))
  }
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// --- Shared state (PluginState['stipulate'] in types/index.d.ts) ---

export const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
export const settingsAtom = atom({ plugin: 'stipulate', key: 'settings' } as const, null)
export const bindingAtom = atom({ plugin: 'stipulate', key: 'binding' } as const, null)
export const workersAtom = atom({ plugin: 'stipulate', key: 'workers' } as const, {})
export const bandHiddenAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)
export const selectedTaskAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)
export const settingsDraftAtom = atom({ plugin: 'stipulate', key: 'settingsDraft' } as const, null)
export const ticketsAtom = atom({ plugin: 'stipulate', key: 'tickets' } as const, {})
export const tamperedAtom = atom({ plugin: 'stipulate', key: 'tampered' } as const, {})

// --- Toasts: short, coalesced; details go to a transcript notice the model does not read ---

let toastState: CoalesceState = {}

/** Shows `short` as a toast (≤60 chars, identical ones within 30 s coalesced as ×N) and appends `details`. */
async function notify($: Dollar, key: string, short: string, details?: string, timeoutMs = 10_000) {
  const r = coalesce(toastState, key, short, await $.clock.now())
  toastState = r.state
  try {
    $.ui.toast(r.text, { timeoutMs })
  } catch {}
  if (details)
    await $.session
      .append({ message: { type: 'system', content: [{ type: 'text', text: `Stipulate: ${details}` }] } } as never)
      .catch(() => undefined)
}

function statusLine($: Dollar, text: string) {
  try {
    $.ui.status(toastText(text))
  } catch {}
}

// --- Module memory for the synchronous paths (re-entry .catch, integrity watch) ---

/** agentId -> what a re-entry verdict needs; mirrors $.state workers. */
const mirror = new Map<string, WorkerMirror>()
/** Last tool per agent seen on a path that cannot call the engine; flushed by the timer. */
const pendingTools = new Map<string, string>()
let cachedRoot: string | null = null
let cachedGate: { changeId: string | null; phase: string | null; approved: boolean; mode: 'off' | 'warn' | 'block' } = {
  changeId: null,
  phase: null,
  approved: false,
  mode: 'block',
}

function mirrorAll(map: Record<string, StipBinding>) {
  mirror.clear()
  for (const [id, b] of Object.entries(map))
    mirror.set(id, { kind: b.kind, taskId: b.taskId, attempt: b.attempt, cwd: b.cwd, writePaths: b.writePaths, cancelled: b.status === 'cancelled' })
}

// --- Module-local caches (lost on hot reload; everything durable is in $.state or the registry) ---

const notOurs = new Set<string>()
const lastToolWrite = new Map<string, number>()
const spawning = new Set<string>()
let refreshing: Promise<StipSnapshot> | null = null
let lastRefresh = 0
let rebuilt = false

const LAST_TOOL_INTERVAL = 10_000
const HOST = 'claude-code'
const STATE_PHASES = ['explore', 'validate']

const jobKey = (b: { kind: string; changeId: string | null; taskId: string; attempt: number }) =>
  `${b.kind}:${b.changeId ?? '-'}/${b.taskId}#${b.attempt}`

function log($: Dollar, text: string) {
  try {
    $.ui.log(`${PLUGIN}: ${text}`, { to: 'debug' })
  } catch {}
}

// --- Project reads (read-only; mutations go through the engine) ---

async function readJson($: Dollar, path: string): Promise<any> {
  if (!(await $.fs.exists(path))) return null
  return JSON.parse(await ($.fs.read(path) as Promise<string>))
}

type ChangeBrief = { id: string; phase: string }

async function listChanges($: Dollar): Promise<ChangeBrief[]> {
  const { root } = await context($)
  const dir = `${root}/.workflow/changes`
  if (!(await $.fs.exists(dir))) return []
  const out: ChangeBrief[] = []
  for (const entry of await $.fs.list(dir)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || entry.isLink) continue
    try {
      const s = await readJson($, `${dir}/${entry.name}/state.json`)
      if (s && typeof s.phase === 'string' && s.phase !== 'archived') out.push({ id: entry.name, phase: s.phase })
    } catch {}
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

async function registry($: Dollar, changeId: string): Promise<{ jobs: Job[] } | null> {
  const { root } = await context($)
  const data = await readJson($, `${root}/.workflow/.runtime/${changeId}/state.json`)
  return data && Array.isArray(data.jobs) ? data : null
}

async function helperRegistry($: Dollar): Promise<Record<string, any>[]> {
  const { root } = await context($)
  const data = await readJson($, `${root}/.workflow/.runtime/engine-helpers.json`).catch(() => null)
  return data && Array.isArray(data.jobs) ? data.jobs : []
}

const latestOf = (jobs: Job[], taskId: string) =>
  jobs.filter(j => j.task_id === taskId).sort((a, b) => b.attempt - a.attempt)[0]

// --- Binding: the change this session works on ---

/** The bound change; auto-binds when exactly one non-archived change exists. */
async function boundChange($: Dollar): Promise<string | null> {
  const current = await read($, bindingAtom)
  const changes = await listChanges($)
  if (current && changes.some(c => c.id === current)) return current
  const next = changes.length === 1 ? changes[0]!.id : null
  if (next !== current) await update($, bindingAtom, () => next)
  return next
}

async function bindChange($: Dollar, id: string): Promise<StipSnapshot> {
  const changes = await listChanges($)
  if (!changes.some(c => c.id === id)) throw new Error(`Unknown or archived change: ${id}`)
  await update($, bindingAtom, () => id)
  return refresh($, { force: true })
}

// --- Settings ---

async function scopePaths($: Dollar): Promise<Record<StipScope, string>> {
  const { root } = await context($)
  const personal = personalPath({
    CLAUDE_CONFIG_DIR: await $.env.get('CLAUDE_CONFIG_DIR'),
    HOME: await $.env.get('HOME'),
  })
  return { personal, project: `${root}/.workflow/config.json`, local: `${root}/.workflow/local.json` }
}

async function rawScopes($: Dollar, paths: Record<StipScope, string>): Promise<Record<StipScope, string>> {
  const raw = {} as Record<StipScope, string>
  for (const scope of SCOPES) {
    const path = paths[scope]
    raw[scope] = (await $.fs.exists(path)) ? ((await $.fs.read(path)) as string) : ''
  }
  return raw
}

/** Reads the three scopes and publishes the settings view. */
async function loadSettings($: Dollar): Promise<StipSettingsView> {
  const paths = await scopePaths($)
  const view = await viewOf(await rawScopes($, paths), paths)
  await update($, settingsAtom, () => view)
  cachedGate = { ...cachedGate, mode: view.effective.applyGate }
  return view
}

async function currentSettings($: Dollar): Promise<StipSettingsView> {
  return (await read($, settingsAtom)) ?? loadSettings($)
}

/**
 * Saves one scope's clients["claude-code"] section after validating it and the merged result;
 * refuses when any scope file changed since `revision` was read.
 */
async function saveSettings($: Dollar, scope: StipScope, value: StipClientSettings, revision: string): Promise<StipSettingsView> {
  if (!SCOPES.includes(scope)) throw new SettingsError('Invalid settings scope')
  validateClient(value)
  const paths = await scopePaths($)
  const raw = await rawScopes($, paths)
  const docs = Object.fromEntries(SCOPES.map(s => [s, raw[s] ? JSON.parse(raw[s]) : {}])) as Record<StipScope, any>
  const byScope = Object.fromEntries(SCOPES.map(s => [s, docs[s]?.orchestration?.clients?.['claude-code'] ?? {}])) as Record<
    StipScope,
    StipClientSettings
  >
  byScope[scope] = value
  effective(byScope, { ...docs.project?.orchestration?.defaults, ...docs.local?.orchestration?.defaults })
  const { root } = await context($)
  const text = JSON.stringify(withClient(raw[scope] ? docs[scope] : null, scope, value), null, 2) + '\n'
  const request = { lock: `${root}/.workflow/.lock`, paths: SCOPES.map(s => paths[s]), revision, dest: paths[scope], scope, text }
  const result = await $.process.run(['python3', '-c', SAVE_SCRIPT], { stdin: JSON.stringify(request), timeoutMs: 15_000 })
  if (result.exitCode !== 0) {
    let message = result.stderr.trim()
    try {
      message = JSON.parse(message.split('\n').at(-1) ?? '').error ?? message
    } catch {}
    throw new SettingsError(message || 'Settings could not be saved')
  }
  const view = await loadSettings($)
  await registerAgentTypes($).catch(e => log($, `agent types: ${errorText(e)}`))
  return view
}

// --- Agent types ---

async function planOf($: Dollar, changeId: string): Promise<PlanTask[]> {
  const status = await engine($, ['status', changeId, '--compact'])
  return Array.isArray(status.plan?.tasks) ? status.plan.tasks : []
}

/** Registers one agent type per role / phase-role in use, plus the research helper type. */
async function registerAgentTypes($: Dollar, plans?: PlanTask[]): Promise<string[]> {
  const view = await currentSettings($)
  const eff = view.effective
  const tasks = plans ?? (await Promise.all((await listChanges($)).map(c => planOf($, c.id).catch(() => [])))).flat()
  const done = new Map<string, unknown>()
  for (const t of tasks) {
    const profile = resolveProfile(eff, t.role, t.phase, { writing: t.write_paths.length > 0 })
    if (!profile.agent && !done.has(profile.agentType)) done.set(profile.agentType, workerAgentSpec(profile, t.role, t.phase))
  }
  for (const role of new Set(['research', ...Object.keys(eff.client.roles ?? {})])) {
    const profile = resolveProfile(eff, role, 'explore', { writing: false })
    if (!profile.agent) done.set(`helper-${role}`, helperAgentSpec(profile, role))
  }
  const names: string[] = []
  for (const [name, spec] of done) {
    try {
      await $.agent.register(spec as Parameters<Dollar['agent']['register']>[0])
      names.push(agentTypeOf(name))
    } catch (e) {
      log($, `agent type ${name}: ${errorText(e)}`)
    }
  }
  return names
}

// --- Worker bindings ---

async function setBinding($: Dollar, binding: StipBinding) {
  mirrorAll(await update($, workersAtom, m => ({ ...m, [binding.agentId]: binding })))
}

async function patchBinding($: Dollar, agentId: string, patch: Partial<StipBinding>) {
  mirrorAll(await update($, workersAtom, m => (m[agentId] ? { ...m, [agentId]: { ...m[agentId]!, ...patch } } : m)))
}

function bindingFromJob(root: string, changeId: string, job: Job, agentId: string, now: number): StipBinding {
  return {
    agentId,
    kind: 'task',
    changeId,
    taskId: job.task_id,
    attempt: job.attempt,
    helperId: null,
    cwd: job.isolated === true && typeof job.worktree === 'string' ? `${root}/${job.worktree}` : root,
    writePaths: Array.isArray(job.write_paths) ? job.write_paths : [],
    status: job.status,
    startedAt: Date.parse(job.created_at ?? '') || now,
    lastTool: typeof job.last_tool === 'string' ? job.last_tool : null,
  }
}

function bindingFromHelper(root: string, job: Record<string, any>, agentId: string, now: number): StipBinding {
  return {
    agentId,
    kind: 'helper',
    changeId: typeof job.change_id === 'string' ? job.change_id : null,
    taskId: String(job.helper_id),
    attempt: 1,
    helperId: String(job.helper_id),
    cwd: root,
    writePaths: [],
    status: job.status,
    startedAt: Date.parse(job.created_at ?? '') || now,
    lastTool: null,
  }
}

/** Rebuilds agent id -> job bindings from the registries (after a reload or a new session). */
async function rebuildWorkers($: Dollar) {
  const { root } = await context($)
  const now = await $.clock.now()
  const found: Record<string, StipBinding> = {}
  for (const change of await listChanges($)) {
    const data = await registry($, change.id).catch(() => null)
    for (const job of data?.jobs ?? [])
      if (job.host === HOST && ownAgent(job) && latestOf(data!.jobs, job.task_id)?.attempt === job.attempt)
        found[job.session_id] = bindingFromJob(root, change.id, job, job.session_id, now)
  }
  for (const job of await helperRegistry($))
    if (job.host === HOST && ownAgent(job)) found[job.session_id] = bindingFromHelper(root, job, job.session_id, now)
  mirrorAll(await update($, workersAtom, m => ({ ...found, ...m })))
  rebuilt = true
}

/** The Stip binding of a subagent, resolving agents this plugin spawned but has not recorded yet. */
async function workerFor($: Dollar, agentId: string): Promise<StipBinding | null> {
  const map = await read($, workersAtom)
  if (map[agentId]) return map[agentId]!
  if (!rebuilt) {
    await rebuildWorkers($)
    const again = (await read($, workersAtom))[agentId]
    if (again) return again
  }
  if (notOurs.has(agentId)) return null
  const info = (await $.agent.list()).find(a => a.id === agentId)
  const parsed = info ? parseDescription(info.description) : null
  if (!info || (!parsed && info.spawnedBy !== PLUGIN)) {
    // Not a Stip worker: a stip description only exists through a ticket (agent.spawn refuses others).
    if (info) notOurs.add(agentId)
    return null
  }
  const { root } = await context($)
  const now = await $.clock.now()
  if (parsed?.kind === 'task') {
    const job = (await registry($, parsed.changeId))?.jobs.find(j => j.task_id === parsed.taskId && j.attempt === parsed.attempt)
    if (job) {
      const binding = bindingFromJob(root, parsed.changeId, job, agentId, now)
      await setBinding($, binding)
      return binding
    }
  } else if (parsed?.kind === 'helper') {
    const job = (await helperRegistry($)).find(j => j.helper_id === parsed.helperId)
    if (job) {
      const binding = bindingFromHelper(root, job, agentId, now)
      await setBinding($, binding)
      return binding
    }
  }
  // Spawned by this plugin but not traceable to a job: treat as a worker with no ownership.
  return {
    agentId,
    kind: 'helper',
    changeId: null,
    taskId: 'untracked',
    attempt: 1,
    helperId: null,
    cwd: root,
    writePaths: [],
    status: 'unknown',
    startedAt: now,
    lastTool: null,
  }
}

/** The registry's current view of a binding's job (status), or null when it is gone. */
async function currentJob($: Dollar, b: StipBinding): Promise<Record<string, any> | null> {
  if (b.kind === 'helper') return b.helperId ? ((await helperRegistry($)).find(j => j.helper_id === b.helperId) ?? null) : null
  const jobs = (await registry($, b.changeId!))?.jobs ?? []
  const latest = latestOf(jobs, b.taskId)
  if (!latest) return null
  return latest.attempt === b.attempt ? latest : { ...latest, superseded: true }
}

function settleArgs(b: StipBinding, status: string): string[] {
  return b.kind === 'helper'
    ? ['runtime', 'settle', '-', '--helper', b.helperId!, '--status', status]
    : ['runtime', 'settle', b.changeId!, '--task', b.taskId, '--attempt', String(b.attempt), '--status', status]
}

// --- Approval provenance (AC-14): an approval counts only when the person gave it through Stip ---

const REVOKE_REASON = 'approval not given by the user through Stip'

type UserApproval = { digest: string; at: string; recordedAt?: string; adopted?: true }

/**
 * The person's approvals per physical project root, kept in this plugin's store (the model has
 * no tool that reads or writes it): `approvals[root][changeId]`, and `baselines[root]` once the
 * project's pre-existing approvals were adopted on first activation.
 */
async function storeMap($: Dollar, key: 'approvals' | 'baselines'): Promise<Record<string, any>> {
  const value = await $.store.get(key)
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {}
}

/** The records as stored (what an outside writer may have changed). */
async function storedApprovals($: Dollar): Promise<Record<string, UserApproval>> {
  const { root } = await context($)
  const mine = (await storeMap($, 'approvals'))[root]
  return mine && typeof mine === 'object' ? (mine as Record<string, UserApproval>) : {}
}

/**
 * This module instance's own copy of the person's records: taken at session start (after adoption)
 * and changed only by this module. The store is compared against it; it is never trusted over it.
 */
let knownRecords: Record<string, UserApproval> | null = null
/** Approvals the person is giving right now (written before the engine runs approve). */
const pendingApprovals = new Map<string, string>()

async function userApprovals($: Dollar): Promise<Record<string, UserApproval>> {
  if (knownRecords === null) knownRecords = await storedApprovals($)
  return knownRecords
}

async function writeApprovals($: Dollar, records: Record<string, UserApproval>) {
  const { root } = await context($)
  knownRecords = records
  const all = await storeMap($, 'approvals')
  await $.store.set('approvals', { ...all, [root]: records })
}

const sameRecord = (a: UserApproval | undefined, b: UserApproval | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Store records this instance did not write are forged: discarded (the store is repaired). */
async function discardForgeries($: Dollar): Promise<string[]> {
  const known = await userApprovals($)
  const stored = await storedApprovals($)
  const forged = [...new Set([...Object.keys(stored), ...Object.keys(known)])].filter(id => !sameRecord(stored[id], known[id]))
  if (forged.length) {
    await writeApprovals($, known)
    await notify($, 'records', TOASTS.recordsDiscarded(), `approval records for ${forged.join(', ')} were changed outside Stip and were discarded.`)
  }
  return forged
}

async function recordUserApproval($: Dollar, changeId: string, digest: string, recordedAt: string | undefined) {
  const record: UserApproval = { digest, at: new Date(await $.clock.now()).toISOString(), ...(recordedAt ? { recordedAt } : {}) }
  await writeApprovals($, { ...(await userApprovals($)), [changeId]: record })
}

async function forgetUserApproval($: Dollar, changeId: string) {
  const records = await userApprovals($)
  if (!(changeId in records)) return
  const { [changeId]: _gone, ...rest } = records
  await writeApprovals($, rest)
}

/**
 * First activation in a project: every approval the engine records at that moment predates the
 * mod and is adopted as the person's (`adopted: true`); only approvals appearing after this
 * baseline need a Stip user record. Idempotent: a baselined project is never re-adopted.
 */
async function ensureBaseline($: Dollar): Promise<string[]> {
  const { root } = await context($)
  const baselines = await storeMap($, 'baselines')
  if (typeof baselines[root] === 'string') {
    await userApprovals($)
    return []
  }
  const records = { ...(await storedApprovals($)) }
  const adopted: string[] = []
  for (const change of await listChanges($)) {
    const approval = (await readJson($, `${root}/.workflow/changes/${change.id}/state.json`).catch(() => null))?.approval
    if (typeof approval?.contract_digest !== 'string' || records[change.id]) continue
    const recordedAt = typeof approval.recorded_at === 'string' ? approval.recorded_at : undefined
    records[change.id] = { digest: approval.contract_digest, at: recordedAt ?? new Date(await $.clock.now()).toISOString(), ...(recordedAt ? { recordedAt } : {}), adopted: true }
    adopted.push(change.id)
  }
  await writeApprovals($, records)
  await $.store.set('baselines', { ...baselines, [root]: new Date(await $.clock.now()).toISOString() })
  return adopted
}

/** The engine's approval record is exactly the one the person made (same digest and, when known, same time). */
function isUsers(approval: Record<string, any> | undefined, record: UserApproval | undefined): boolean {
  return (
    !!approval &&
    !!record &&
    approval.contract_digest === record.digest &&
    (record.recordedAt === undefined || approval.recorded_at === record.recordedAt)
  )
}

/** True when the engine approval is current and is the one the person gave. */
function effectiveApproval(status: Record<string, any>, record: UserApproval | undefined): boolean {
  return status.approval_current === true && record?.digest === status.contract_digest
}

/**
 * Revokes every recorded engine approval the person did not give through Stip (any spelling of
 * a model-run `approve`). Reads state.json only; runs the engine only to revoke.
 */
async function checkProvenance($: Dollar): Promise<string[]> {
  const { root } = await context($)
  await ensureBaseline($)
  await discardForgeries($)
  const records = await userApprovals($)
  const revoked: string[] = []
  for (const change of await listChanges($)) {
    const state = await readJson($, `${root}/.workflow/changes/${change.id}/state.json`).catch(() => null)
    if (!state) continue
    const digest = state.approval?.contract_digest
    if (typeof digest !== 'string') {
      // The approval was withdrawn (stale contract or revocation): the person's consent does not carry over.
      if (records[change.id]) await forgetUserApproval($, change.id)
      continue
    }
    if (isUsers(state.approval, records[change.id])) continue
    if (pendingApprovals.get(change.id) === digest) continue
    try {
      await mutate($, ['runtime', 'revoke-approval', change.id, '--reason', REVOKE_REASON, '--force-phase'])
      revoked.push(change.id)
    } catch (e) {
      log($, `revoke ${change.id}: ${errorText(e)}`)
      unconfirmed.add(change.id)
    }
  }
  if (revoked.length) {
    const text = `${PLUGIN}: approval of ${revoked.join(', ')} was not given by you through Stip and was revoked (back to draft). Review and approve with /stip-approve.`
    await notify($, 'revoked', TOASTS.approvalRevoked(), text)
    statusLine($, `Approval revoked · ${revoked.join(', ')}`)
  }
  return revoked
}

/**
 * The agent a job is bound to. A correction `reserve` copies the previous attempt's agent id onto the
 * new, unlaunched job; it belongs to the new attempt only once its own launch is confirmed.
 */
const ownAgent = (job: Record<string, any>): string | null =>
  typeof job.session_id === 'string' && job.launch_confirmed !== false ? job.session_id : null

/** Changes whose unconfirmed approval could not be revoked (treated as unapproved everywhere). */
const unconfirmed = new Set<string>()

// --- Snapshot ---

/** Runs `status --compact` and `runtime show` once for the bound change and publishes the snapshot. */
async function refresh($: Dollar, options: { force?: boolean } = {}): Promise<StipSnapshot> {
  const now = await $.clock.now()
  const held = await read($, snapshotAtom)
  if (refreshing) return refreshing
  if (!options.force && held && now - lastRefresh < 1000) return held
  refreshing = (async () => {
    try {
      await checkProvenance($).catch(e => log($, `provenance: ${errorText(e)}`))
      const snapshot = await computeSnapshot($, await boundChange($))
      await update($, snapshotAtom, () => snapshot)
      cachedGate = { ...cachedGate, changeId: snapshot.changeId, phase: snapshot.phase, approved: snapshot.approval.current }
      await syncBindings($, snapshot)
      return snapshot
    } finally {
      lastRefresh = await $.clock.now()
      refreshing = null
    }
  })()
  return refreshing
}

async function computeSnapshot($: Dollar, changeId: string | null): Promise<StipSnapshot> {
  const now = await $.clock.now()
  const briefs = await listChanges($).catch(() => [] as ChangeBrief[])
  const finish = async (snap: StipSnapshot): Promise<StipSnapshot> => ({
    ...snap,
    changes: await changeSummaries($, briefs, changeId, snap.approval.current).catch(() => snap.changes),
    archivedCount: await archivedCount($).catch(() => 0),
    criteria: changeId ? await criteriaOf($, changeId).catch(() => []) : [],
    helpers: await titledHelpers($, snap.helpers),
  })
  const changes = briefs as StipChangeRef[]
  if (!changeId) return finish(emptySnapshot(changes, now))
  let snapshot: StipSnapshot
  try {
    const status = await engine($, ['status', changeId, '--compact'])
    let show: Record<string, any> | null = null
    let error: string | null = null
    if (status.schema_version === 2) {
      try {
        show = await engine($, ['runtime', 'show', changeId])
      } catch (e) {
        error = errorText(e)
      }
    }
    const { root } = await context($)
    const state = await readJson($, `${root}/.workflow/changes/${changeId}/state.json`).catch(() => null)
    snapshot = buildSnapshot({
      changeId,
      status,
      show,
      helpers: await helperRegistry($).catch(() => []),
      live: await read($, workersAtom),
      changes,
      now,
      approvedBy: typeof state?.approval?.by === 'string' ? state.approval.by : null,
      userDigest: (await userApprovals($))[changeId]?.digest ?? null,
      userAdopted: (await userApprovals($))[changeId]?.adopted === true,
      error,
    })
  } catch (e) {
    snapshot = emptySnapshot(changes, now, changeId, errorText(e))
  }
  const settings = await read($, settingsAtom)
  if (settings) snapshot = { ...snapshot, limits: settings.effective.limits }
  const tampered = Object.values(await read($, tamperedAtom)).filter(t => t.changeId === changeId)
  return finish({ ...snapshot, tampered })
}

// --- Display data: change picker, criteria, labels ---

async function changeSummaries($: Dollar, briefs: ChangeBrief[], bound: string | null, boundApproved: boolean): Promise<StipChangeRef[]> {
  const { root } = await context($)
  const out: StipChangeRef[] = []
  for (const c of briefs) {
    const proposal = await readOr($, `${root}/.workflow/changes/${c.id}/proposal.md`).catch(() => '')
    const heading = /^#\s+(.+?)\s*$/m.exec(proposal)?.[1]?.trim()
    const state = await readJson($, `${root}/.workflow/changes/${c.id}/state.json`).catch(() => null)
    const reg = await registry($, c.id).catch(() => null)
    const latest = new Map<string, Job>()
    for (const j of reg?.jobs ?? []) if ((latest.get(j.task_id)?.attempt ?? 0) < j.attempt) latest.set(j.task_id, j)
    const activeWorkers = [...latest.values()].filter(j => ACTIVE.includes(j.status)).length
    const recorded = !!state?.approval
    out.push({
      id: c.id,
      phase: c.phase,
      title: heading && heading !== c.id ? heading.slice(0, 80) : c.id,
      approval: c.id === bound ? (boundApproved ? 'approved' : recorded ? 'stale' : 'none') : recorded ? 'recorded' : 'none',
      activeWorkers,
      inFlight: activeWorkers > 0,
      finished: c.phase === 'documented',
      bound: c.id === bound,
    })
  }
  return out
}

async function archivedCount($: Dollar): Promise<number> {
  const { root } = await context($)
  const dir = `${root}/.workflow/archive`
  if (!(await $.fs.exists(dir))) return 0
  return (await $.fs.list(dir)).filter(e => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.name) && !e.isLink).length
}

/** Labels already generated (or given up on), by sha256 of the text; kept in the plugin store. */
async function labelStore($: Dollar): Promise<Record<string, string>> {
  const v = await $.store.get('labels')
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {}
}

/** Texts that still need a model label (filled while computing the snapshot; served by the timer). */
const labelWanted = new Map<string, { kind: 'requirement' | 'question'; text: string }>()
const labelAttempts = new Map<string, number>()

async function labelFor($: Dollar, kind: 'requirement' | 'question', text: string, labels: Record<string, string>) {
  const key = sha256Sync(`${kind}\n${text}`)
  const got = labels[key]
  if (got) return { title: got, titleSource: 'model' as const }
  labelWanted.set(key, { kind, text })
  return { title: fallbackLabel(text), titleSource: 'fallback' as const }
}

async function criteriaOf($: Dollar, changeId: string): Promise<StipCriterion[]> {
  const { root } = await context($)
  const spec = await readOr($, `${root}/.workflow/changes/${changeId}/spec.md`)
  const evidence = parseEvidence(await readOr($, `${root}/.workflow/changes/${changeId}/evidence.md`).catch(() => ''))
  const labels = await labelStore($)
  const out: StipCriterion[] = []
  for (const c of parseCriteria(spec)) {
    const ev = evidence[c.id]
    out.push({
      id: c.id,
      ...(await labelFor($, 'requirement', c.text, labels)),
      text: c.text,
      ...(ev ? { evidence: ev.evidence } : {}),
      status: ev?.status ?? 'pending',
    })
  }
  return out
}

async function titledHelpers($: Dollar, helpers: StipSnapshot['helpers']): Promise<StipSnapshot['helpers']> {
  if (!helpers.length) return helpers
  const explicit = ((await $.store.get('helperTitles')) ?? {}) as Record<string, string>
  const labels = await labelStore($)
  const out: StipSnapshot['helpers'] = []
  for (const h of helpers) {
    const given = explicit[h.helperId]
    out.push(given ? { ...h, title: given, titleSource: 'explicit' } : { ...h, ...(await labelFor($, 'question', h.question, labels)) })
  }
  return out
}

const LABEL_CONCURRENCY = 2
let labeling = false

/**
 * Generates missing labels in the background (timer), never while drawing: at most two model calls
 * at a time, each text once (a rejected or failed label falls back after two tries and is stored too).
 */
async function labelTick($: Dollar) {
  if (labeling || !labelWanted.size) return
  labeling = true
  try {
    const labels = await labelStore($)
    const batch = [...labelWanted].filter(([key]) => !labels[key]).slice(0, LABEL_CONCURRENCY)
    for (const [key] of labelWanted) if (labels[key]) labelWanted.delete(key)
    if (!batch.length) return
    const made = await Promise.all(
      batch.map(async ([key, { kind, text }]) => {
        const r = await $.model
          .complete({ model: 'haiku', prompt: LABEL_PROMPT(kind, text), maxTokens: 24, timeoutMs: 20_000 } as never)
          .catch(() => null)
        const label = r && (r as { isAnswered?: boolean }).isAnswered ? cleanLabel(String((r as { text?: string }).text ?? '')) : null
        const tries = (labelAttempts.get(key) ?? 0) + 1
        labelAttempts.set(key, tries)
        if (label) return [key, label] as const
        // Never ask twice more for the same text: after two failures the heuristic label is kept.
        return tries >= 2 ? ([key, fallbackLabel(text)] as const) : null
      }),
    )
    const add = made.filter((m): m is readonly [string, string] => m !== null)
    if (!add.length) return
    const next = { ...(await labelStore($)), ...Object.fromEntries(add) }
    const keys = Object.keys(next)
    if (keys.length > 500) for (const k of keys.slice(0, keys.length - 500)) delete next[k]
    await $.store.set('labels', next)
    for (const [key] of add) labelWanted.delete(key)
    // Update the published snapshot's titles without running the engine.
    const held = await read($, snapshotAtom)
    if (held) {
      const criteria = held.criteria.map(c => {
        const t = next[sha256Sync(`requirement\n${c.text}`)]
        return t && c.titleSource !== 'explicit' ? { ...c, title: t, titleSource: 'model' as const } : c
      })
      const helpers = held.helpers.map(h => {
        const t = next[sha256Sync(`question\n${h.question}`)]
        return t && h.titleSource !== 'explicit' ? { ...h, title: t, titleSource: 'model' as const } : h
      })
      await update($, snapshotAtom, () => ({ ...held, criteria, helpers }))
    }
  } finally {
    labeling = false
  }
}

/** Mirrors registry status onto live bindings so a cancellation made anywhere is enforced. */
async function syncBindings($: Dollar, snapshot: StipSnapshot) {
  if (!snapshot.changeId) return
  const statuses = new Map<string, StipBinding['status']>(snapshot.workers.map(w => [`${w.taskId}#${w.attempt}`, w.status]))
  const synced = await update($, workersAtom, m => {
    let changed = false
    const out = { ...m }
    for (const [id, b] of Object.entries(m)) {
      const s = b.kind === 'task' && b.changeId === snapshot.changeId ? statuses.get(`${b.taskId}#${b.attempt}`) : undefined
      if (s && s !== b.status) (out[id] = { ...b, status: s }), (changed = true)
    }
    return changed ? out : m
  })
  mirrorAll(synced)
}

// --- Reconciliation against $.agent.list() ---

async function finalAnswer($: Dollar, agentId: string): Promise<string> {
  const rows = await $.session.messages({ agentId }).catch(() => null)
  if (!Array.isArray(rows)) return ''
  return [...rows].reverse().find(r => r.role === 'assistant' && r.text.trim())?.text ?? ''
}

/** Reconciles active claude-code jobs of the given changes (and helpers) with the live agents. */
async function reconcile($: Dollar, changeIds?: string[]): Promise<number> {
  const ids = changeIds ?? (await listChanges($)).map(c => c.id)
  const agents = await $.agent.list()
  const { root } = await context($)
  const now = await $.clock.now()
  let changed = 0
  const apply = async (b: StipBinding, job: Record<string, any>) => {
    const key = jobKey(b)
    if (spawning.has(key)) return
    try {
      if (ownAgent(job)) {
        const info = agents.find(a => a.id === job.session_id)
        if (!info) {
          if (job.status !== 'unknown')
            await mutate($, [...settleArgs(b, 'unknown'), '--error', 'The agent is not running in this Claude Code session; reconcile before retrying.'])
        } else if (info.status === 'completed') {
          await mutate($, [...settleArgs(b, 'returned'), '--result-file', '-'], { stdin: await finalAnswer($, info.id) })
        } else if (info.status === 'failed') {
          await mutate($, [...settleArgs(b, 'failed'), '--error', 'The agent failed.'])
        } else if (info.status === 'killed') {
          await mutate($, [...settleArgs(b, 'cancelled'), '--error', 'The agent was stopped.'])
        } else if (job.status === 'unknown') {
          await mutate($, [...settleArgs(b, 'running')])
        } else return
        changed++
      } else {
        const description = b.kind === 'helper' ? describeHelper(b.helperId!) : describeTask(b.changeId!, b.taskId, b.attempt)
        const info = agents.find(a => a.description === description)
        const waiting = (await read($, ticketsAtom))[description]
        if (!info && waiting && job.status === 'starting') return
        if (info) {
          const args = b.kind === 'helper' ? ['runtime', 'confirm', '-', '--helper', b.helperId!] : ['runtime', 'confirm', b.changeId!, '--task', b.taskId, '--attempt', String(b.attempt)]
          await mutate($, [...args, '--session', info.id])
          await setBinding($, { ...b, agentId: info.id, status: 'running' })
          changed++
        } else if (job.status === 'starting') {
          await mutate($, [...settleArgs(b, 'unknown'), '--error', 'Launch not confirmed; it may or may not have started. Reconcile (stip_status) or cancel before retrying.'])
          changed++
        }
      }
    } catch (e) {
      log($, `reconcile ${key}: ${errorText(e)}`)
    }
  }
  for (const id of ids) {
    const data = await registry($, id).catch(() => null)
    for (const job of data?.jobs ?? []) {
      if (job.host !== HOST || !ACTIVE.includes(job.status) || latestOf(data!.jobs, job.task_id)?.attempt !== job.attempt) continue
      // Another live session's workers are not ours to judge: only this session's jobs are reconciled.
      if (!(await ownJob($, job, id))) continue
      await apply(bindingFromJob(root, id, job, job.session_id ?? '', now), job)
    }
  }
  for (const job of await helperRegistry($)) {
    if (job.host !== HOST || !ACTIVE.includes(job.status)) continue
    if (!(await ownJob($, job, null))) continue
    await apply(bindingFromHelper(root, job, job.session_id ?? '', now), job)
  }
  return changed
}

/**
 * A job reserved by this session (parent_id is the session id, the same across hot reloads and a
 * backgrounded session). Another live session's jobs are left to that session.
 */
async function ownJob($: Dollar, job: Record<string, any>, _changeId: string | null): Promise<boolean> {
  return job.parent_id === instanceId
}

// --- Actions (tools and interface) ---

const mainOnly = (agentId: string | undefined) => {
  if (agentId !== undefined) throw new GuardRefusal(deny('coordinator', 'stip_* tools belong to the main coordinator session, not a subagent'))
}

class GuardRefusal extends Error {}

export type DelegateInput = { changeId: string; taskId: string; instructions?: string; correction?: boolean }

/** Reserves, spawns and confirms one approved task (AC-8). Never launches twice for an uncertain launch. */
async function delegate($: Dollar, input: DelegateInput) {
  const { changeId, taskId } = input
  const { root } = await context($)
  await reconcile($, [changeId])
  const status = await engine($, ['status', changeId, '--compact'])
  const task: PlanTask | undefined = status.plan?.tasks?.find((t: PlanTask) => t.id === taskId)
  if (!task) throw new EngineError('Task is not in the approved execution plan.')
  if (status.approval_current === true && !effectiveApproval(status, (await userApprovals($))[changeId]))
    throw new EngineError(`The approval of ${changeId} was not given by the user through Stip; ask the user to approve it (band Approve or /stip-approve).`)
  // A reserved, unlaunched attempt: hand back the same ticket instead of reserving again.
  const current = latestOf((await registry($, changeId))?.jobs ?? [], taskId)
  if (current?.status === 'starting' && !input.correction) {
    const t = (await read($, ticketsAtom))[describeTask(changeId, taskId, current.attempt)]
    if (t) return { change_id: changeId, task_id: taskId, attempt: current.attempt, cwd: t.cwd ?? root, isolated: t.cwd !== null, reissued: true, ...ticketReply(t) }
  }
  const view = await loadSettings($)
  if (view.error) throw new SettingsError(`Fix the claude-code settings first: ${view.error}`)
  const eff = view.effective
  const profile = resolveProfile(eff, task.role, task.phase, { writing: task.write_paths.length > 0 })
  const previous = latestOf((await registry($, changeId))?.jobs ?? [], taskId)
  if (!profile.agent) await $.agent.register(workerAgentSpec(profile, task.role, task.phase) as never)
  const sessionId = await $.session.id()
  const recorded = { host: HOST, model: profile.model, effort: profile.effort, agent: profile.agent, agent_type: profile.agent ?? agentTypeOf(profile.agentType), isolate: profile.isolate, sources: profile.sources }
  const reserved = await mutate(
    $,
    [
      'runtime', 'reserve', changeId, '--task', taskId,
      ...(input.correction ? ['--correction'] : []),
      ...(profile.isolate ? ['--isolate'] : []),
      '--max-workers', String(eff.limits.max_workers),
      '--max-shared-writers', String(eff.limits.max_shared_writers),
      '--host', HOST, '--parent', sessionId, '--profile-json', JSON.stringify(recorded),
    ],
    { timeoutMs: 120_000 },
  ).catch(e => {
    if (e instanceof EngineError && /another contract|Registry belongs to|run runtime rebase|not in the plan/i.test(e.message))
      throw new EngineError(
        `${e.message} The worker registry is still tied to the previous approved contract: the person re-approves the current contract (band Approve or /stip-approve), which moves it automatically, or presses Rebase registry in the /stip pane.`,
      )
    throw e
  })
  const job: Job = reserved.job
  const cwd: string = reserved.cwd
  const isolated = job.isolated === true
  const spec = await $.fs.read(`${root}/.workflow/changes/${changeId}/spec.md`).catch(() => '') as string
  const prompt = buildBrief({
    changeId,
    task,
    attempt: job.attempt,
    root,
    cwd,
    isolated,
    criteria: criteriaText(spec, task.criteria),
    extensions: Array.isArray(status.extensions) ? status.extensions : [],
    instructions: input.instructions,
    correction: input.correction ? { reason: previous?.review?.reason ?? null } : null,
    foreignType: Boolean(profile.agent),
  })
  const ticket: StipTicket = {
    description: describeTask(changeId, taskId, job.attempt),
    kind: 'task',
    changeId,
    taskId,
    attempt: job.attempt,
    helperId: null,
    subagentType: profile.agent ?? agentTypeOf(profile.agentType),
    prompt,
    cwd: isolated ? cwd : null,
    model: profile.agent && profile.model !== 'inherit' ? profile.model : null,
    writePaths: task.write_paths,
    createdAt: await $.clock.now(),
  }
  await update($, ticketsAtom, m => ({ ...m, [ticket.description]: ticket }))
  const snap = await refresh($, { force: true }).catch(() => null)
  const reopened = snap?.changeId === changeId && snap.lastRebase?.reopened.includes(taskId)
  return {
    change_id: changeId,
    task_id: taskId,
    attempt: job.attempt,
    cwd,
    isolated,
    profile: recorded,
    ...ticketReply(ticket),
    ...(reopened ? { note: `${taskId} was reopened by the rebase onto the revised contract; this attempt redoes it against the new task definition.` } : {}),
  }
}

/** What the coordinator model is told to do with a ticket. */
function ticketReply(t: StipTicket) {
  return {
    status: 'reserved',
    launch: { tool: 'Agent', subagent_type: t.subagentType, description: t.description, prompt: 'Stipulate brief (filled in by the plugin)', run_in_background: true },
    next:
      `Call the Agent tool now with subagent_type "${t.subagentType}" and description "${t.description}" (any prompt). ` +
      'Stipulate supplies the brief, working directory and background mode, confirms the launch and records the answer when the worker finishes. Launch it once. ' +
      'If the Agent tool reports the type as unknown, it was registered this turn: launch it on your next turn.',
  }
}

/** Starts a read-only research helper (stip_research): reserved here, launched by the coordinator. */
async function research($: Dollar, input: { question: string; title?: string; role?: string; phase?: string; changeId?: string }) {
  const title = input.title?.trim().replace(/[.,;:!?]+$/, '')
  if (title !== undefined && (title.length < 2 || title.length > 40)) throw new EngineError('title must be 2 to 40 characters.')
  const role = input.role ?? 'research'
  const phase = input.phase ?? 'explore'
  if (!STATE_PHASES.includes(phase)) throw new EngineError('Research helpers support explore or validate only.')
  const view = await loadSettings($)
  if (view.error) throw new SettingsError(`Fix the claude-code settings first: ${view.error}`)
  const profile = resolveProfile(view.effective, role, phase, { writing: false })
  if (!profile.agent) await $.agent.register(helperAgentSpec(profile, role) as never)
  const { root } = await context($)
  const reserved = await mutate($, [
    'runtime', 'reserve', input.changeId ?? '-', '--helper', role, '--question', input.question, '--phase', phase,
    '--max-workers', String(view.effective.limits.max_workers), '--host', HOST, '--parent', await $.session.id(),
    '--profile-json', JSON.stringify({ host: HOST, model: profile.model, effort: profile.effort, agent: profile.agent }),
  ])
  const job = reserved.job
  if (title) {
    const titles = ((await $.store.get('helperTitles')) ?? {}) as Record<string, string>
    await $.store.set('helperTitles', { ...titles, [job.helper_id]: title })
  }
  const ticket: StipTicket = {
    description: describeHelper(job.helper_id),
    kind: 'helper',
    changeId: input.changeId ?? null,
    taskId: job.helper_id,
    attempt: 1,
    helperId: job.helper_id,
    subagentType: profile.agent ?? agentTypeOf(`helper-${role}`),
    prompt: buildHelperBrief(input.question, role, phase, input.changeId ?? null, root),
    cwd: null,
    model: profile.agent && profile.model !== 'inherit' ? profile.model : null,
    writePaths: [],
    createdAt: await $.clock.now(),
  }
  await update($, ticketsAtom, m => ({ ...m, [ticket.description]: ticket }))
  return { helper_id: job.helper_id, role, phase, ...ticketReply(ticket) }
}

/**
 * The coordinator's Agent call for a ticket (agent.spawn hook): spends the ticket, injects the brief,
 * working directory and background mode, and records the real agent id (AC-8). A launch whose outcome
 * is uncertain leaves the job `unknown`; it is never launched twice.
 */
async function launchTicket($: Dollar, t: StipTicket, run: (patch: { prompt: string; subagentType: string; background: boolean; cwd?: string; model?: string }) => Promise<any>) {
  const { root } = await context($)
  const binding: StipBinding = {
    agentId: '',
    kind: t.kind,
    changeId: t.changeId,
    taskId: t.taskId,
    attempt: t.attempt,
    helperId: t.helperId,
    cwd: t.cwd ?? root,
    writePaths: t.writePaths,
    status: 'starting',
    startedAt: await $.clock.now(),
    lastTool: null,
  }
  const confirmArgs =
    t.kind === 'helper'
      ? ['runtime', 'confirm', '-', '--helper', t.helperId!]
      : ['runtime', 'confirm', t.changeId!, '--task', t.taskId, '--attempt', String(t.attempt)]
  // Spend first: a second Agent call with the same description finds no ticket and is refused.
  await update($, ticketsAtom, m => {
    const { [t.description]: _spent, ...rest } = m
    return rest
  })
  const key = jobKey(binding)
  spawning.add(key)
  try {
    let spawned: any
    try {
      spawned = await run({
        prompt: t.prompt,
        subagentType: t.subagentType,
        background: true,
        ...(t.cwd ? { cwd: t.cwd } : {}),
        ...(t.model ? { model: t.model } : {}),
      })
    } catch (e) {
      await mutate($, [...settleArgs(binding, 'unknown'), '--error', `Launch outcome uncertain: ${errorText(e)}`.slice(0, 2000)]).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      throw e
    }
    if (spawned?.deny !== undefined) {
      await mutate($, [...settleArgs(binding, 'failed'), '--error', `Spawn refused: ${spawned.deny}`.slice(0, 2000)]).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      return spawned
    }
    let agentId: string | undefined = spawned?.agentId
    if (!agentId) agentId = (await $.agent.list().catch(() => [])).find(a => a.description === t.description)?.id
    if (!agentId) {
      await mutate($, [...settleArgs(binding, 'unknown'), '--error', 'The launch returned no agent id; outcome uncertain.']).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      return spawned
    }
    await setBinding($, { ...binding, agentId })
    const started = (await $.agent.list().catch(() => [])).find(a => a.id === agentId)
    if (started && started.type !== t.subagentType) {
      // The host ran another type (the configured model and rules would not apply): stop it now.
      await mutate($, [...settleArgs(binding, 'unknown'), '--error', `Launched as ${started.type}, not ${t.subagentType}.`]).catch(() => undefined)
      await mutate($, [...(t.kind === 'helper' ? ['runtime', 'cancel', '-', '--helper', t.helperId!] : ['runtime', 'cancel', t.changeId!, '--task', t.taskId]), '--reason', `launched as ${started.type} instead of ${t.subagentType}`]).catch(() => undefined)
      await patchBinding($, agentId, { status: 'cancelled' })
      await $.session.send({ to: { agentId }, text: 'Stipulate: this launch used the wrong agent type and was cancelled. Stop now.' } as never).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      return spawned
    }
    try {
      const model = typeof spawned?.model === 'string' && spawned.model !== 'inherit' ? spawned.model : null
      await mutate($, [...confirmArgs, '--session', agentId, ...(model ? ['--model', model] : [])])
      await patchBinding($, agentId, { status: 'running' })
    } catch (e) {
      // The agent runs and its guards apply (it is bound); the registry could not record it.
      await mutate($, [...settleArgs(binding, 'unknown'), '--error', `Started as ${agentId} but not confirmed: ${errorText(e)}`.slice(0, 2000)]).catch(() => undefined)
      await patchBinding($, agentId, { status: 'unknown' })
    }
    await refresh($, { force: true }).catch(() => undefined)
    return spawned
  } finally {
    spawning.delete(key)
  }
}

export type ReviewInput = { changeId: string; taskId: string; reason: string }

/** Removes (and returns) the tamper flags of a task once its attempt is reviewed. */
async function clearTamper($: Dollar, changeId: string, taskId: string): Promise<StipTamper | null> {
  const all = await read($, tamperedAtom)
  const mine = Object.entries(all).filter(([, t]) => t.changeId === changeId && t.taskId === taskId)
  if (!mine.length) return null
  await update($, tamperedAtom, m => Object.fromEntries(Object.entries(m).filter(([k]) => !mine.some(([key]) => key === k))))
  return mine.at(-1)![1]
}

/** Accepts the latest returned attempt; an isolated one is then integrated (AC-4 via the engine). */
async function accept($: Dollar, input: ReviewInput) {
  const reviewed = await mutate($, ['runtime', 'review', input.changeId, '--task', input.taskId, '--decision', 'accepted', '--reason', input.reason])
  let integration: Record<string, unknown> | null = null
  if (reviewed.job?.isolated === true) {
    try {
      integration = await mutate($, ['runtime', 'integrate', input.changeId, '--task', input.taskId], { timeoutMs: 120_000 })
      const skipped = Array.isArray(integration?.skipped) ? (integration!.skipped as { path?: string; reason?: string }[]) : []
      if (skipped.length) {
        const artefacts = skipped.filter(x => x.reason === 'build artefact').length
        const ignored = skipped.length - artefacts
        integration = {
          ...integration,
          note:
            `Not integrated, by design: ${[artefacts ? `${artefacts} build artefact${artefacts === 1 ? '' : 's'} (__pycache__, .pytest_cache)` : '', ignored ? `${ignored} gitignored file${ignored === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')}. ` +
            'They stay in the worker\'s worktree, which is removed; nothing to clean up in the main checkout.',
        }
      }
    } catch (e) {
      if (!(e instanceof EngineError)) throw e
      const conflicts = e.conflicts ?? []
      const strays = conflicts.length > 0 && conflicts.every(c => (c as { untracked?: boolean }).untracked === true)
      integration = {
        integrated: false,
        error: e.message,
        conflicts,
        ...(strays ? { only_untracked: true } : {}),
        guidance: strays
          ? `The contribution is accepted but NOT integrated: every conflict is an untracked file the worker left in its worktree outside its write_paths (${conflicts.map(c => c.path).join(', ')}). ` +
            'Request a correction (stip_delegate with correction: true) whose instructions ask the worker to delete exactly those stray files (or to keep its output inside its write_paths), then accept again. ' +
            'Build artefacts (untracked __pycache__/*.pyc and .pytest_cache/) are not conflicts: the engine skips them on integration and lists them as skipped.'
          : 'The contribution is accepted but NOT integrated; nothing was written to the main checkout. ' +
            'Resolve by requesting a correction (stip_delegate with correction: true, which rejects this attempt and reuses its worktree) ' +
            'or, when the main checkout changed, settle that change first and retry the integration.',
      }
    }
  }
  const tamper = await clearTamper($, input.changeId, input.taskId)
  await refresh($, { force: true }).catch(() => undefined)
  return {
    change_id: input.changeId,
    task_id: input.taskId,
    acceptance: 'accepted',
    job: summary(reviewed.job),
    integration,
    ...(tamper ? { warning: tamper.note } : {}),
  }
}

async function reject($: Dollar, input: ReviewInput & { discard?: boolean }) {
  const reviewed = await mutate($, [
    'runtime', 'review', input.changeId, '--task', input.taskId, '--decision', 'rejected', '--reason', input.reason,
    ...(input.discard ? ['--discard'] : []),
  ])
  await clearTamper($, input.changeId, input.taskId)
  await refresh($, { force: true }).catch(() => undefined)
  return { change_id: input.changeId, task_id: input.taskId, acceptance: 'rejected', job: summary(reviewed.job), next: 'Request a correction with stip_delegate correction: true, or leave it rejected.' }
}

export type CancelTarget = { changeId: string; taskId: string; reason?: string } | { helperId: string; reason?: string }

/** Records the cancellation, then denies every further tool call of that agent (AC-12). */
async function cancel($: Dollar, target: CancelTarget) {
  const reason = target.reason?.trim() || undefined
  const args =
    'helperId' in target
      ? ['runtime', 'cancel', '-', '--helper', target.helperId]
      : ['runtime', 'cancel', target.changeId, '--task', target.taskId]
  const result = await mutate($, [...args, ...(reason ? ['--reason', reason] : [])])
  const agentId: string | null = result.job?.session_id ?? null
  // Deny even an agent we never recorded (an unknown launch found later resolves to this job as cancelled).
  if (agentId) {
    mirrorAll(await update($, workersAtom, m => (m[agentId] ? { ...m, [agentId]: { ...m[agentId]!, status: 'cancelled' as const } } : m)))
    await $.session.send({ to: { agentId }, text: 'Stipulate: this task was cancelled by the coordinator. Stop now; further tool calls are refused.' } as never).catch(() => undefined)
  }
  await refresh($, { force: true }).catch(() => undefined)
  return { cancelled: true, agent_id: agentId, job: summary(result.job), note: 'Claude Code has no subagent stop in this API: the agent is told to stop and every further tool call it makes is denied.' }
}

/** The captured final answer of a worker attempt or a helper. */
async function readResult($: Dollar, target: { changeId: string; taskId: string; attempt?: number } | { helperId: string }) {
  if ('helperId' in target) {
    const { root } = await context($)
    const job = (await helperRegistry($)).find(j => j.helper_id === target.helperId)
    if (!job) throw new EngineError(`Unknown helper: ${target.helperId}`)
    const path = `${root}/.workflow/.runtime/helper-results/${target.helperId}.md`
    const result = (await $.fs.exists(path)) ? ((await $.fs.read(path)) as string) : null
    return { helper_id: target.helperId, status: job.status, result }
  }
  const shown = await engine($, ['runtime', 'show', target.changeId, '--task', target.taskId, ...(target.attempt ? ['--attempt', String(target.attempt)] : [])])
  return { change_id: target.changeId, task_id: target.taskId, job: summary(shown.job), result: shown.result ?? null }
}

/** Records the user's approval of the current contract (band button, /stip-approve). */
async function approveChange($: Dollar, id: string, expectedDigest?: string) {
  const status = await engine($, ['status', id, '--compact'])
  if (effectiveApproval(status, (await userApprovals($))[id]))
    throw new EngineError(`${id} is already approved by you for contract ${String(status.contract_digest).slice(0, 12)}; nothing to approve.`)
  if (expectedDigest && !String(status.contract_digest).startsWith(expectedDigest))
    throw new EngineError(`The contract changed since it was shown (now ${String(status.contract_digest).slice(0, 12)}); review it again.`)
  const before = (await userApprovals($))[id]
  pendingApprovals.set(id, String(status.contract_digest))
  let result: any
  try {
    await recordUserApproval($, id, String(status.contract_digest), undefined)
    result = await mutate($, ['approve', id, '--by', 'user', '--ack-user-approval'])
    const digest = String(result.approval?.contract_digest ?? status.contract_digest)
    await recordUserApproval($, id, digest, typeof result.approval?.recorded_at === 'string' ? result.approval.recorded_at : undefined)
  } catch (e) {
    const records = { ...(await userApprovals($)) }
    if (before) records[id] = before
    else delete records[id]
    await writeApprovals($, records)
    throw e
  } finally {
    pendingApprovals.delete(id)
  }
  unconfirmed.delete(id)
  const rebase = await rebaseIfStale($, id, 're-approved by the person')
  await refresh($, { force: true }).catch(() => undefined)
  await registerAgentTypes($).catch(() => undefined)
  return { ...result, rebase }
}

export type RebaseOutcome = {
  needed: boolean
  done: boolean
  kept?: string[]
  reopened?: string[]
  retired?: string[]
  error?: string
}

/** One line for replies: what the rebase kept, reopened (to redelegate) and retired. */
export function rebaseSummary(o: RebaseOutcome): string {
  if (!o.needed) return ''
  if (!o.done) return o.error ?? ''
  const parts = [`${o.kept?.length ?? 0} kept`]
  if (o.reopened?.length) parts.push(`reopened ${o.reopened.join(', ')} (redelegate them)`)
  if (o.retired?.length) parts.push(`retired ${o.retired.join(', ')} (no longer in the plan)`)
  return `The worker registry was moved to the new contract: ${parts.join('; ')}.`
}

/**
 * After the person re-approves a revised contract, the worker registry is still tied to the previous
 * contract (or holds jobs of tasks the plan no longer has): move it. The engine keeps unchanged tasks,
 * reopens changed ones and their dependants, and retires removed ones. Active workers block it.
 */
async function rebaseIfStale($: Dollar, id: string, reason: string): Promise<RebaseOutcome> {
  const shown = await engine($, ['runtime', 'show', id]).catch(() => null)
  const orphans: string[] = Array.isArray(shown?.orphan_tasks) ? shown.orphan_tasks : []
  if (!shown?.registry || (shown.registry_current !== false && !orphans.length)) return { needed: false, done: false }
  try {
    const r = await mutate($, ['runtime', 'rebase', id, '--reason', reason])
    const outcome: RebaseOutcome = { needed: true, done: true, kept: r.kept ?? [], reopened: r.reopened ?? [], retired: r.retired ?? [] }
    const redo = outcome.reopened!.length
    await notify($, `rebased:${id}`, redo ? `Registry rebased · ${redo} task${redo === 1 ? '' : 's'} to redo` : 'Registry rebased', `${id}: ${rebaseSummary(outcome)}`)
    return outcome
  } catch (e) {
    return {
      needed: true,
      done: false,
      error: `The worker registry is still tied to the previous contract (${errorText(e)}). Rebase it from the pane once the workers are done.`,
    }
  }
}

function summary(job: Record<string, any> | undefined) {
  if (!job) return null
  const keep = ['task_id', 'attempt', 'status', 'acceptance', 'session_id', 'isolated', 'integrated', 'worktree', 'last_tool', 'error', 'result_bytes', 'result_truncated', 'integration', 'cancellation', 'review']
  return Object.fromEntries(keep.filter(k => job[k] !== undefined).map(k => [k, job[k]]))
}

// --- Interface actions (/stip-action, called by the UI through $.command.run) ---

async function act($: Dollar, a: Record<string, unknown>): Promise<unknown> {
  const reason = typeof a.reason === 'string' ? a.reason : ''
  switch (a.action) {
    case 'refresh':
      return refresh($, { force: true })
    case 'bind':
      return bindChange($, str(a.change_id, 'change_id'))
    case 'accept':
      return accept($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), reason: str(reason, 'reason') })
    case 'reject':
      return reject($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), reason: str(reason, 'reason'), discard: a.discard === true })
    case 'cancel':
      return typeof a.helper_id === 'string'
        ? cancel($, { helperId: a.helper_id, ...(reason ? { reason } : {}) })
        : cancel($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), ...(reason ? { reason } : {}) })
    case 'delegate':
      return askToLaunch($, await delegate($, {
        changeId: str(a.change_id, 'change_id'),
        taskId: str(a.task_id, 'task_id'),
        ...(typeof a.instructions === 'string' ? { instructions: a.instructions } : {}),
        correction: a.correction === true,
      }))
    case 'approve':
      return approveChange($, str(a.change_id, 'change_id'), str(a.digest, 'digest'))
    case 'rebase': {
      const outcome = await rebaseIfStale($, str(a.change_id, 'change_id'), 'rebased by the person from the pane')
      await refresh($, { force: true }).catch(() => undefined)
      if (outcome.error) throw new EngineError(outcome.error)
      return outcome
    }
    case 'result':
      return typeof a.helper_id === 'string'
        ? readResult($, { helperId: a.helper_id })
        : readResult($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), ...(typeof a.attempt === 'number' ? { attempt: a.attempt } : {}) })
    case 'settings-load':
      return loadSettings($)
    case 'settings-save':
      return saveSettings($, a.scope as StipScope, (a.value ?? {}) as StipClientSettings, str(a.revision, 'revision'))
  }
  throw new EngineError(`Unknown action ${String(a.action)}`)
}

/**
 * An interface-reserved ticket is launched by the coordinator model (its Agent call is what keeps
 * the worker's tool calls under the mod's guards): the launch instruction is put in the person's
 * prompt box, and the person sends it.
 */
async function askToLaunch($: Dollar, reply: Record<string, any>) {
  const launch = reply.launch as { subagent_type: string; description: string } | undefined
  if (launch) {
    const text = `Launch the reserved Stipulate worker now: call the Agent tool with subagent_type "${launch.subagent_type}" and description "${launch.description}" (Stipulate fills in the brief).`
    const filled = await $.prompt.fill({ text, mode: 'insert' }).catch(() => ({ isFilled: false }))
    return { ...reply, prompt_filled: filled.isFilled === true, ...(filled.isFilled ? {} : { send_this: text }) }
  }
  return reply
}

/** What the coordinator must know about the registry after a revision (stip_status `notes`). */
function coordinatorNotes(s: StipSnapshot): string[] {
  const notes: string[] = []
  if (!s.registryCurrent)
    notes.push(
      `The worker registry is not on the approved contract${s.orphanTasks.length ? ` (it still holds tasks the plan no longer has: ${s.orphanTasks.join(', ')})` : ''}. ` +
        'Dispatch is refused until the person re-approves the current contract or presses Rebase registry in the /stip pane.',
    )
  const redo = (s.lastRebase?.reopened ?? []).filter(id => {
    const t = s.tasks.find(x => x.id === id)
    return t?.latest?.acceptance === 'rejected' && !['starting', 'running', 'waiting', 'unknown'].includes(t.latest.status)
  })
  if (redo.length)
    notes.push(
      `The last rebase reopened ${redo.join(', ')} (changed in the revised contract, or depending on a changed task): ` +
        'their previous work is rejected and must be redelegated (stip_delegate; add correction: true to reuse an isolated worktree).',
    )
  if (s.lastRebase?.retired.length) notes.push(`Retired by the last rebase (no longer in the plan): ${s.lastRebase.retired.join(', ')}.`)
  return notes
}

// --- Tools ---

const S = (description: string) => ({ type: 'string', description })
const TOOLS: { name: (typeof TOOL_NAMES)[number]; description: string; inputSchema: Record<string, unknown> }[] = [
  {
    name: 'stip_status',
    description: 'Read the Stipulate change bound to this session: phase, approval, plan tasks with their latest attempts, ready tasks, workers and helpers. Reconciles worker records with running agents; never advances the lifecycle.',
    inputSchema: { type: 'object', properties: { change_id: S('Change id; defaults to the bound change. Naming one binds it when nothing is bound.') } },
  },
  {
    name: 'stip_research',
    description: 'Ask one bounded read-only research question during exploration or validation, answered by a read-only helper agent in the background. Creates no task and no approval. Discovery stays with you; read the answer with stip_result {helper_id}.',
    inputSchema: {
      type: 'object',
      properties: {
        question: S('The question, 1 to 8000 characters'),
        title: S('Optional short label for the interface (2-5 words, at most 40 characters)'),
        role: S('Helper role (default research)'),
        phase: { type: 'string', enum: ['explore', 'validate'] },
        change_id: S('Change the question is about'),
      },
      required: ['question'],
    },
  },
  {
    name: 'stip_plan',
    description: 'Install an execution plan for a change before user approval. Replacing a plan invalidates approval.',
    inputSchema: {
      type: 'object',
      properties: { change_id: S('Change id'), plan: { type: 'object', description: 'Execution plan: {version: 1, tasks: [...]}' }, migrate: { type: 'boolean' } },
      required: ['change_id', 'plan'],
    },
  },
  {
    name: 'stip_delegate',
    description: 'Dispatch one ready, approved plan task to a Stipulate worker agent (background). The engine checks approval, phase, dependencies and worker limits; writing tasks may run in an isolated git worktree. Returns at once; the answer is captured when the worker finishes. Use correction: true to resume a rejected or accepted task.',
    inputSchema: {
      type: 'object',
      properties: {
        change_id: S('Change id'),
        task_id: S('Task id from the approved plan'),
        instructions: S('Extra coordinator context for the worker'),
        correction: { type: 'boolean', description: 'New attempt of a reviewed task (same task id)' },
      },
      required: ['change_id', 'task_id'],
    },
  },
  {
    name: 'stip_interrupt',
    description: 'Cancel a running worker (change_id + task_id) or helper (helper_id). Every further tool call of that agent is denied and the job becomes cancelled.',
    inputSchema: { type: 'object', properties: { change_id: S('Change id'), task_id: S('Task id'), helper_id: S('Helper id'), reason: S('Why') } },
  },
  {
    name: 'stip_contribution',
    description: 'Record your review of a returned worker: accepted or rejected, with the reason (at least 8 characters). Check its files and evidence first; returned does not mean accepted. An accepted isolated attempt is integrated into the main checkout, or refused with a conflict report.',
    inputSchema: {
      type: 'object',
      properties: {
        change_id: S('Change id'),
        task_id: S('Task id'),
        decision: { type: 'string', enum: ['accepted', 'rejected'] },
        reason: S('Integration or verification reason'),
        discard: { type: 'boolean', description: 'On rejection, remove the isolated worktree instead of keeping it for a correction' },
      },
      required: ['change_id', 'task_id', 'decision', 'reason'],
    },
  },
  {
    name: 'stip_result',
    description: "Read a worker's captured final answer (change_id + task_id, optional attempt) or a helper's (helper_id).",
    inputSchema: { type: 'object', properties: { change_id: S('Change id'), task_id: S('Task id'), attempt: { type: 'integer', minimum: 1 }, helper_id: S('Helper id') } },
  },
]

const str = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new EngineError(`${name} is required`)
  return v.trim()
}

async function serve($: Dollar, name: string, a: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'stip_status': {
      let id = typeof a.change_id === 'string' && a.change_id ? a.change_id : await boundChange($)
      if (id && !(await read($, bindingAtom))) await update($, bindingAtom, () => id)
      if (id) await reconcile($, [id])
      const bound = await read($, bindingAtom)
      const snapshot = id === bound ? await refresh($, { force: true }) : await computeSnapshot($, id)
      const settings = await currentSettings($)
      return {
        bound,
        snapshot,
        ...(snapshot.changeId ? { notes: coordinatorNotes(snapshot) } : {}),
        settings: { limits: settings.effective.limits, apply_gate: settings.effective.applyGate, error: settings.error },
      }
    }
    case 'stip_research':
      return research($, {
        question: str(a.question, 'question'),
        ...(typeof a.title === 'string' && a.title.trim() ? { title: a.title } : {}),
        ...(typeof a.role === 'string' ? { role: a.role } : {}),
        ...(typeof a.phase === 'string' ? { phase: a.phase } : {}),
        ...(typeof a.change_id === 'string' ? { changeId: a.change_id } : {}),
      })
    case 'stip_plan': {
      const id = str(a.change_id, 'change_id')
      const result = await mutate($, ['plan', id, '--file', '-', ...(a.migrate === true ? ['--migrate'] : [])], { stdin: JSON.stringify(a.plan ?? null) })
      await registerAgentTypes($).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      return result
    }
    case 'stip_delegate':
      return delegate($, {
        changeId: str(a.change_id, 'change_id'),
        taskId: str(a.task_id, 'task_id'),
        ...(typeof a.instructions === 'string' ? { instructions: a.instructions } : {}),
        correction: a.correction === true,
      })
    case 'stip_interrupt':
      return typeof a.helper_id === 'string' && a.helper_id
        ? cancel($, { helperId: a.helper_id, ...(typeof a.reason === 'string' ? { reason: a.reason } : {}) })
        : cancel($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), ...(typeof a.reason === 'string' ? { reason: a.reason } : {}) })
    case 'stip_contribution': {
      const input = { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), reason: str(a.reason, 'reason') }
      if (a.decision === 'accepted') return accept($, input)
      if (a.decision === 'rejected') return reject($, { ...input, discard: a.discard === true })
      throw new EngineError('decision must be accepted or rejected')
    }
    case 'stip_result':
      return typeof a.helper_id === 'string' && a.helper_id
        ? readResult($, { helperId: a.helper_id })
        : readResult($, { changeId: str(a.change_id, 'change_id'), taskId: str(a.task_id, 'task_id'), ...(typeof a.attempt === 'number' ? { attempt: a.attempt } : {}) })
  }
  throw new EngineError(`Unknown tool ${name}`)
}

function refusal(e: unknown): { deny: string } {
  if (e instanceof GuardRefusal) return { deny: e.message }
  const conflicts = e instanceof EngineError && e.conflicts?.length ? `\nConflicts:\n${e.conflicts.map((c: Conflict) => `- ${c.path}: ${c.reason}`).join('\n')}` : ''
  return { deny: `${PLUGIN}: ${errorText(e)}${conflicts}` }
}

// --- Path placement for guards ---

/** Where a path lands with links resolved (the file, or its folder plus the name), or null. */
async function placed($: Dollar, path: string): Promise<string | null> {
  if (!path) return null
  const own = await $.fs.stat(path, { resolve: true }).catch(() => undefined)
  if (own?.realPath) return own.realPath
  const cut = path.lastIndexOf('/')
  const name = path.slice(cut + 1)
  if (!name || name === '.' || name === '..') return null
  const folder = await placed($, cut <= 0 ? '/' : path.slice(0, cut))
  return folder === null ? null : `${folder.replace(/\/$/, '')}/${name}`
}

const realCache = new Map<string, string>()
async function realDir($: Dollar, dir: string): Promise<string> {
  const hit = realCache.get(dir)
  if (hit) return hit
  const real = (await $.fs.stat(dir, { resolve: true }).catch(() => undefined))?.realPath ?? dir
  realCache.set(dir, real)
  return real
}

// --- Guards (AC-11 .. AC-15) ---

async function guardWorker($: Dollar, e: { tool: string } & Record<string, unknown>, b: StipBinding): Promise<string | null> {
  if (b.status === 'cancelled') return deny('cancellation', `task ${b.taskId} was cancelled; stop now`)
  const job = await currentJob($, b)
  if (!job) return deny('cancellation', `no registry record for ${b.taskId}; stop now`)
  if (job.status === 'cancelled') {
    await patchBinding($, b.agentId, { status: 'cancelled' })
    return deny('cancellation', `task ${b.taskId} was cancelled; stop now`)
  }
  if (job.superseded) return deny('cancellation', `attempt ${b.attempt} of ${b.taskId} was superseded by a newer attempt; stop now`)
  if (WORKER_FORBIDDEN_TOOLS.includes(e.tool) || e.tool.startsWith(TOOL_PREFIX))
    return deny('worker', `${e.tool} is not available to workers (no delegation, no lifecycle tools)`)
  const target = writeTarget(e)
  if (target !== null) {
    if (b.kind === 'helper') return deny('read-only helper', 'helpers do not edit files')
    const cwd = await realDir($, b.cwd)
    const real = await placed($, absolute(cwd, target))
    return storeWrite(real) ?? workerWrite(real, cwd, b.writePaths)
  }
  if (e.tool === 'Bash' && typeof e.command === 'string')
    return workerBash(e.command) ?? (b.kind === 'helper' ? helperBash(e.command) : null)
  return null
}

async function guardMain($: Dollar, e: { tool: string } & Record<string, unknown>, root: string): Promise<{ deny?: string; warn?: string }> {
  if (e.tool === 'Bash' && typeof e.command === 'string') {
    const why = mainBash(e.command)
    return why ? { deny: why } : {}
  }
  if ((e.tool === 'Skill' || String(e.tool) === 'SlashCommand') && /stip-(approve|action)\b/.test(JSON.stringify(e)))
    return { deny: deny('approval', '/stip-approve and /stip-action are the person\'s commands, not the model\'s') }
  const target = writeTarget(e)
  if (target === null) return {}
  const real = await placed($, absolute(await $.session.cwd(), target))
  const stored = storeWrite(real ?? absolute(await $.session.cwd(), target))
  if (stored) return { deny: stored }
  const rel = real === null ? null : inside(root, real)
  if (rel !== null) {
    const why = protectedState(rel)
    if (why) return { deny: why }
  }
  // Read fresh: a settings file edited by hand or by the person takes effect at once.
  const settings = await loadSettings($)
  const mode = settings.effective.applyGate
  if (mode === 'off') return {}
  const changeId = await boundChange($)
  if (!changeId) return {}
  let snapshot = await read($, snapshotAtom)
  if (!snapshot || snapshot.changeId !== changeId) snapshot = await refresh($, { force: true })
  if (real === null)
    return mode === 'block' ? { deny: deny('apply gate', `cannot place ${target}; refused while ${changeId} is not approved`) } : {}
  const verdict = applyGate({ rel, changeId, phase: snapshot.phase, approvalCurrent: snapshot.approval.current, mode })
  if (verdict.verdict === 'block') return { deny: verdict.reason! }
  if (verdict.verdict === 'warn') return { warn: verdict.reason! }
  return {}
}

async function trackBefore($: Dollar, b: StipBinding, tool: string) {
  if (!b.agentId) return
  const now = await $.clock.now()
  await patchBinding($, b.agentId, { lastTool: tool })
  const key = jobKey(b)
  const statusChange = b.status === 'unknown' || b.status === 'waiting'
  if (!statusChange && now - (lastToolWrite.get(key) ?? 0) < LAST_TOOL_INTERVAL) return
  if (b.status !== 'running' && !statusChange) return
  lastToolWrite.set(key, now)
  await mutate($, [...settleArgs(b, 'running'), '--last-tool', tool.slice(0, 256)])
    .then(() => patchBinding($, b.agentId, { status: 'running' }))
    .catch(err => log($, `last tool ${key}: ${errorText(err)}`))
}

// --- Worker Bash backstop (AC-11): lifecycle state and the main HEAD must not move under a worker ---

type Sentinel = { state: string; head: string; writes: number }

async function sentinel($: Dollar, b: StipBinding): Promise<Sentinel> {
  const { root } = await context($)
  const path = b.changeId ? `${root}/.workflow/changes/${b.changeId}/state.json` : null
  const state = path && (await $.fs.exists(path)) ? sha256Sync((await $.fs.read(path)) as string) : ''
  const head = await $.process
    .run(['git', 'rev-parse', '--verify', '-q', 'HEAD'], { cwd: root, timeoutMs: 10_000 })
    .then(r => r.stdout.trim())
    .catch(() => '')
  return { state, head, writes: lifecycleWrites }
}

async function backstop($: Dollar, b: StipBinding, before: Sentinel) {
  const after = await sentinel($, b)
  const stateMoved = after.state !== before.state && after.writes === before.writes
  const headMoved = after.head !== before.head
  if (!stateMoved && !headMoved) return
  const what = [stateMoved ? 'the change lifecycle state' : '', headMoved ? `the main checkout HEAD (${before.head.slice(0, 12)} -> ${after.head.slice(0, 12)})` : '']
    .filter(Boolean)
    .join(' and ')
  const reason = `Worker Bash changed ${what}; cancelled by the Stipulate backstop.`
  try {
    if (b.kind === 'helper' && b.helperId) await cancel($, { helperId: b.helperId, reason })
    else if (b.changeId) await cancel($, { changeId: b.changeId, taskId: b.taskId, reason })
  } catch (e) {
    log($, `backstop cancel ${b.taskId}: ${errorText(e)}`)
    await patchBinding($, b.agentId, { status: 'cancelled' })
  }
  await notify($, `backstop:${b.taskId}#${b.attempt}`, TOASTS.workerCancelled(`${b.taskId}#${b.attempt}`), `worker ${b.taskId}#${b.attempt} changed ${what}; it was cancelled.${headMoved ? ' HEAD was not restored: inspect it with git log.' : ''}`, 15_000)
  if (stateMoved) await checkProvenance($).catch(err => log($, `provenance: ${errorText(err)}`))
}

// --- Re-entry: synchronous rules from module memory ---

/** The verdict for a call the host routes to the `.catch` (re-entry), without any `$` call. */
function reentryDecision(e: { tool: string; agentId?: string } & Record<string, unknown>): string | null {
  if (e.agentId !== undefined) {
    const w = mirror.get(e.agentId)
    if (w) return reentryVerdict(w, e)
    if (e.tool.startsWith(TOOL_PREFIX)) return deny('coordinator', 'stip_* tools belong to the main coordinator session, not a subagent')
  }
  if (e.tool === 'Bash' && typeof e.command === 'string') return mainBash(e.command)
  const target = writeTarget(e)
  if (target === null) return null
  const root = cachedRoot
  const path = absolute(root ?? '/', target)
  const stored = storeWrite(path)
  if (stored) return stored
  const rel = root ? inside(root, path) : null
  if (rel !== null) {
    const why = protectedState(rel)
    if (why) return why
  }
  const verdict = applyGate({ rel, changeId: cachedGate.changeId, phase: cachedGate.phase as never, approvalCurrent: cachedGate.approved, mode: cachedGate.mode })
  return verdict.verdict === 'block' ? verdict.reason! : null
}

// --- /stip-resync: the person adopts changes made outside this session ---

function describeDiff(path: string, good: string, now: string): string {
  if (path.endsWith('/engine-helpers.json') || path.includes('/.runtime/')) {
    const ra = parseRegistry(good)
    const rb = parseRegistry(now)
    const a = new Map((ra?.jobs ?? []).map(j => [registryKey(j), j]))
    const b = new Map((rb?.jobs ?? []).map(j => [registryKey(j), j]))
    const lines: string[] = []
    // Top-level fields (contract_digest, version, change_id), digests shortened.
    const short = (v: unknown) => {
      const t = typeof v === 'string' ? v : JSON.stringify(v)
      return t === undefined ? '(none)' : /^[0-9a-f]{16,}$/i.test(t) ? t.slice(0, 8) : t.length > 40 ? t.slice(0, 37) + '…' : t
    }
    for (const k of [...new Set([...Object.keys(ra ?? {}), ...Object.keys(rb ?? {})])].filter(k => k !== 'jobs').sort())
      if (canon((ra as any)?.[k]) !== canon((rb as any)?.[k])) lines.push(`  ~ ${k}: ${short((ra as any)?.[k])} -> ${short((rb as any)?.[k])}`)
    for (const [k, j] of b) {
      const o = a.get(k)
      if (!o) lines.push(`  + ${k}: ${j.status}/${j.acceptance}`)
      else if (canon(o) !== canon(j))
        lines.push(`  ~ ${k}: ${o.status}/${o.acceptance}${o.integrated ? '/integrated' : ''} -> ${j.status}/${j.acceptance}${j.integrated ? '/integrated' : ''}`)
    }
    for (const k of a.keys()) if (!b.has(k)) lines.push(`  - ${k}`)
    return lines.join('\n') || '  (formatting only)'
  }
  return `  phase ${phaseOf(good) ?? '(none)'} -> ${now ? (phaseOf(now) ?? '?') : '(file gone)'}`
}

/** What differs between known-good and what was rejected or is on disk now. */
async function resyncPlan($: Dollar): Promise<{ path: string; content: string; summary: string }[]> {
  const { root } = await context($)
  const { registries, lifecycles } = await watchedFiles($)
  const out: { path: string; content: string; summary: string }[] = []
  for (const path of new Set([...registries, ...lifecycles, ...rejected.keys()])) {
    const good = (await known($, path)) ?? ''
    const content = rejected.get(path) ?? (await readOr($, path))
    if (content === good) continue
    out.push({ path, content, summary: `${path.slice(root.length + 1)}\n${describeDiff(path, good, content)}` })
  }
  return out
}

// --- Registration ---

export const registerCore: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const { root } = await context($)
      instanceId = await $.session.id().catch(() => instanceId)
      if (await hasWorkflow($, root)) {
        // Every Bash call of the session (coordinator, subagents, workers) inherits these: no Python
        // bytecode or pytest cache files appear in checkouts or worktrees. Commands are not rewritten.
        await $.env.set('PYTHONDONTWRITEBYTECODE', '1').catch(err => log($, `env: ${errorText(err)}`))
        const addopts = (await $.env.get('PYTEST_ADDOPTS').catch(() => undefined)) ?? ''
        if (!/no:cacheprovider/.test(addopts))
          await $.env.set('PYTEST_ADDOPTS', `${addopts ? `${addopts} ` : ''}-p no:cacheprovider`).catch(err => log($, `env: ${errorText(err)}`))
        for (const tool of TOOLS) await $.tool.register({ ...tool, isDeferred: false })
        await $.command.register({ name: 'stip-approve', description: 'Approve the bound Stipulate contract (shows its digest first)', argumentHint: '[change-id] [confirm <digest>]' })
        await $.command.register({ name: 'stip-resync', description: 'Review and adopt workflow changes made outside this Claude Code session', argumentHint: '[confirm]' })
        await $.command.register({ name: 'stip-bind', description: 'Bind this session to a Stipulate change', argumentHint: '[change-id]' })
        await $.command.register({ name: 'stip-action', description: 'Stipulate interface action (JSON; used by the band and pane)', argumentHint: '{"action": ...}', immediate: true })
        await loadSettings($)
        await rebuildWorkers($)
        await registerAgentTypes($).catch(err => log($, `agent types: ${errorText(err)}`))
        await reconcile($).catch(err => log($, `reconcile: ${errorText(err)}`))
        await refresh($, { force: true })
        await baselineWatched($).catch(err => log($, `baseline: ${errorText(err)}`))
        // Integrity watch and re-entry flush, every 3 s while workers run.
        $.clock.every(3_000, () => {
          void (async () => {
            await flushPendingTools($)
            await integrityTick($)
            await labelTick($)
          })().catch(err => log($, `watch: ${errorText(err)}`))
        })
        // Fallback refresh, never faster than every 10 s and only while agents are active (AC-21).
        $.clock.every(15_000, () => {
          void (async () => {
            const held = await read($, snapshotAtom)
            const busy = held !== null && held.active.total > 0
            if (busy && (await $.clock.now()) - lastRefresh >= 10_000) await refresh($)
          })().catch(err => log($, `timer: ${errorText(err)}`))
        })
      }
    } catch (err) {
      log($, `session.start: ${errorText(err)}`)
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isStip = e.tool.startsWith(TOOL_PREFIX)
    const mutating = e.tool === 'Bash' || writeTarget(e as never) !== null
    if (e.agentId !== undefined) {
      const b = await workerFor($, e.agentId)
      if (b) {
        const why = await guardWorker($, e as never, b)
        if (why) return { deny: why }
        workerCalls++
        await trackBefore($, b, e.tool)
        let ran
        if (e.tool === 'Bash') {
          // Every worker command runs marked: the engine then refuses any mutation (AC-11).
          const before = await sentinel($, b)
          workerBashInFlight++
          try {
            ran = await next({ ...e, command: workerEnvPrefix(b.taskId, b.attempt) + e.command })
          } finally {
            workerBashInFlight--
          }
          await backstop($, b, before)
        } else ran = await next(e)
        const after = (await read($, workersAtom))[b.agentId]
        if (after?.status === 'waiting') {
          await mutate($, settleArgs(b, 'running')).catch(() => undefined)
          await patchBinding($, b.agentId, { status: 'running' })
        }
        if (mutating && (await checkProvenance($)).length) await refresh($, { force: true }).catch(() => undefined)
        return ran
      }
      if (isStip) return { deny: deny('coordinator', 'stip_* tools belong to the main coordinator session, not a subagent') }
      // An ordinary subagent (not a Stip worker) follows the main session's rules below.
    } else if (isStip) {
      try {
        mainOnly(e.agentId)
        const name = e.tool.slice(TOOL_PREFIX.length)
        const { tool: _t, tool_use_id: _id, ...args } = e as Record<string, unknown>
        return { result: JSON.stringify(await serve($, name, args), null, 2) }
      } catch (err) {
        return refusal(err)
      }
    }
    const { root } = await context($)
    if (!(await hasWorkflow($, root))) return next(e)
    const verdict = await guardMain($, e as never, root)
    if (verdict.deny) return { deny: verdict.deny }
    if (verdict.warn) await notify($, 'gate', TOASTS.applyGate(cachedGate.changeId ?? 'the change'), verdict.warn)
    const coordinatorBash = e.agentId === undefined && e.tool === 'Bash'
    const window = { calls: workerCalls, bash: workerBashInFlight }
    if (coordinatorBash) mainBashInFlight++
    let ran
    try {
      ran = await next(e)
    } finally {
      if (coordinatorBash) {
        mainBashInFlight--
        const overlapped = window.bash > 0 || workerBashInFlight > 0 || workerCalls !== window.calls
        await attributeCoordinatorBash($, overlapped).catch(err => log($, `attribute: ${errorText(err)}`))
      }
    }
    if (!mutating) return ran
    // Post-hoc AC-14 backstop: an approval that appeared during this call without the person is revoked.
    const revoked = await checkProvenance($)
    const target = writeTarget(e as never)
    const touched =
      (target !== null && target !== '' && absolute(await $.session.cwd(), target).startsWith(`${root}/.workflow/`)) ||
      (e.tool === 'Bash' && /(^|[\s'"=/])\.workflow\b|workflow\.py/.test(String((e as { command?: unknown }).command)))
    if (revoked.length || touched) await refresh($, { force: true }).catch(() => undefined)
    return ran
  }).catch(($, e, next) => {
    if (next.called) return next(e)
    // Re-entry: the host asks this handler in the hook's place; its own `$` calls reject, so the
    // verdict comes from module memory alone (AC-11..AC-15 still apply, decided synchronously).
    if (next.error?.kind === 're-entry') {
      const why = reentryDecision(e as never)
      if (why) return { deny: `${why} [re-entry]` }
      const w = e.agentId !== undefined ? mirror.get(e.agentId) : undefined
      if (w && e.agentId !== undefined) pendingTools.set(e.agentId, e.tool)
      if (w && e.tool === 'Bash') return next({ ...e, command: workerEnvPrefix(w.taskId, w.attempt) + (e as { command: string }).command })
      return next(e)
    }
    const rule =
      e.agentId !== undefined
        ? 'worker ownership/lifecycle/cancellation'
        : e.tool.startsWith(TOOL_PREFIX)
          ? 'coordinator'
          : writeTarget(e as never) !== null
            ? 'apply gate/approval'
            : e.tool === 'Bash' || e.tool === 'Skill'
              ? 'approval'
              : 'stipulate'
    return { deny: `${PLUGIN}: ${rule} guard failed; the call is refused (fail closed)` }
  })

  // Worker and helper types start only from a ticket (engine gates first): the coordinator's Agent call.
  on('agent.spawn', async ($, e, next) => {
    const stipType = e.subagentType.startsWith(`${PLUGIN}:`)
    if (!stipType && !parseDescription(e.description)) return next(e)
    const ticket = (await read($, ticketsAtom))[e.description]
    if (!ticket)
      return { deny: deny('dispatch', 'Stipulate workers start only from a stip_delegate or stip_research ticket: call that tool, then the Agent tool with the subagent_type and description it returns') }
    if (e.parentAgentId !== undefined) return { deny: deny('dispatch', 'only the main coordinator launches Stipulate workers') }
    // The configured model, tools and rules live in the ticket's agent type: launch exactly that one.
    if (e.subagentType !== ticket.subagentType)
      return { deny: deny('dispatch', `launch ${e.description} with subagent_type "${ticket.subagentType}" (not "${e.subagentType}"); if the Agent tool says that type is unknown, it is available from your next turn`) }
    return launchTicket($, ticket, patch => next({ ...e, ...patch }))
  }).catch(($, e, next) =>
    e.subagentType.startsWith(`${PLUGIN}:`) || parseDescription(e.description)
      ? next.called
        ? next(e)
        : { deny: `${PLUGIN}: dispatch guard failed; the launch is refused (fail closed)` }
      : next(e),
  )

  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.agent_id) {
      const b = (await read($, workersAtom))[e.agent_id]
      if (b && (b.status === 'running' || b.status === 'unknown')) {
        await patchBinding($, b.agentId, { status: 'waiting' })
        await mutate($, [...settleArgs(b, 'waiting'), '--last-tool', String(e.tool_name).slice(0, 256)]).catch(err => log($, `waiting: ${errorText(err)}`))
        await refresh($).catch(() => undefined)
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const b = (await read($, workersAtom))[e.agentId]
      if (b) lastWorkerEnd = await $.clock.now()
      if (b && b.status !== 'cancelled') {
        try {
          if (e.reason === 'answer') {
            await mutate($, [...settleArgs(b, 'returned'), '--result-file', '-'], { stdin: e.answer })
            await patchBinding($, b.agentId, { status: 'returned' })
          } else if (e.reason === 'aborted') {
            // An interrupt in the session: recorded as a cancellation with its reason, answer kept.
            const target = b.kind === 'helper' ? ['runtime', 'cancel', '-', '--helper', b.helperId!] : ['runtime', 'cancel', b.changeId!, '--task', b.taskId]
            await mutate($, [...target, '--reason', 'interrupted in the session']).catch(err => log($, `interrupt cancel: ${errorText(err)}`))
            await mutate($, [...settleArgs(b, 'cancelled'), '--error', 'Interrupted.', ...(e.answer ? ['--result-file', '-'] : [])], e.answer ? { stdin: e.answer } : {}).catch(() => undefined)
            await patchBinding($, b.agentId, { status: 'cancelled' })
          } else {
            const status = 'failed' as const
            const why = e.reason === 'refusal' ? `Refused: ${e.refusal.explanation ?? e.refusal.category ?? 'no detail'}` : 'The agent ended on an API error.'
            await mutate($, [...settleArgs(b, status), '--error', why.slice(0, 2000), ...(e.answer ? ['--result-file', '-'] : [])], e.answer ? { stdin: e.answer } : {})
            await patchBinding($, b.agentId, { status })
          }
        } catch (err) {
          log($, `turn.complete ${b.taskId}: ${errorText(err)}`)
        }
        const after = await refresh($, { force: true }).catch(() => null)
        if (after && !after.registryCurrent && after.active.change === 0 && after.approval.current)
          await notify($, `rebase:${after.changeId}`, 'Workers done · rebase registry in /stip', `${after.changeId}: the worker registry is still tied to the previous contract; rebase it from the /stip pane (Rebase registry).`)
      }
    }
    return next(e)
  })

  on('command.run', { command: 'stip-approve' }, async ($, e) => {
    try {
      const words = e.args.trim().split(/\s+/).filter(Boolean)
      const at = words.indexOf('confirm')
      const id = (at === 0 ? null : words[0]) ?? (await boundChange($))
      if (!id) return { text: 'No change is bound. Run /stip-bind <change-id> or /stip-approve <change-id>.' }
      if (at >= 0) {
        if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge')
          return { text: 'Approval must be typed by the person at the prompt.' }
        const digest = words[at + 1]
        if (!digest || digest.length < 8) return { text: `Name the digest you reviewed: /stip-approve ${id} confirm <first 12 characters of the digest>.` }
        const result = await approveChange($, id, digest)
        const summary = result.rebase ? rebaseSummary(result.rebase) : ''
        const rebased = summary ? ` ${summary}` : ''
        return { text: `Approved ${id} (contract ${String(result.approval?.contract_digest ?? digest).slice(0, 12)}) by the user.${rebased}` }
      }
      const current = await engine($, ['status', id, '--compact'])
      if (effectiveApproval(current, (await userApprovals($))[id]))
        return { text: `${id} is already approved by you for contract ${String(current.contract_digest).slice(0, 12)}; nothing to approve.` }
      const validated = await mutate($, ['validate', id])
      const digest = String(validated.contract_digest)
      const status = await engine($, ['status', id, '--compact'])
      const tasks = Array.isArray(status.plan?.tasks) ? status.plan.tasks.length : 0
      const lines = [
        `Change ${id}: phase ${validated.phase}${status.approval_current ? ', already approved for this contract' : ''}.`,
        `Criteria (${validated.criteria.length}): ${validated.criteria.join(', ')}.`,
        status.schema_version === 2 ? `Execution plan: ${tasks} task(s).` : 'No execution plan (schema v1).',
        `Contract digest: ${digest}`,
        '',
        `Approving records YOUR agreement to exactly this contract (proposal, spec, plan and extensions).`,
        `To approve, type: /stip-approve ${id} confirm ${digest.slice(0, 12)}`,
      ]
      await refresh($, { force: true }).catch(() => undefined)
      return { text: lines.join('\n') }
    } catch (err) {
      return { text: `Approval refused: ${errorText(err)}` }
    }
  })

  on('command.run', { command: 'stip-action' }, async ($, e) => {
    const reply = (value: unknown) => ({ text: JSON.stringify(value) })
    try {
      const a = JSON.parse(e.args) as Record<string, unknown>
      const fromUs = e.origin.kind === 'plugin' && (e.origin as { name?: string }).name === PLUGIN
      const byPerson = fromUs || e.origin.kind === 'composer' || e.origin.kind === 'bridge'
      if (!byPerson) return reply({ ok: false, error: 'Interface actions come from the person or the Stipulate interface.' })
      const value = await act($, a)
      return reply({ ok: true, action: a.action, value })
    } catch (err) {
      return reply({ ok: false, error: errorText(err), ...(err instanceof EngineError && err.conflicts ? { conflicts: err.conflicts } : {}) })
    }
  })

  on('command.run', { command: 'stip-resync' }, async ($, e) => {
    try {
      const plan = await resyncPlan($)
      if (!plan.length) return { text: 'Nothing to re-sync: the workflow files match what this session knows.' }
      if (e.args.trim() !== 'confirm')
        return {
          text: [
            'Changed outside this Claude Code session (known-good -> found):',
            ...plan.map(p => p.summary),
            '',
            'Adopting makes these the known-good state (approvals still need your record). If you made them, type: /stip-resync confirm',
          ].join('\n'),
        }
      if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') return { text: 'Re-sync must be typed by the person at the prompt.' }
      for (const p of plan) {
        if ((await readOr($, p.path)) !== p.content && p.content) await $.fs.write(p.path, p.content)
        await setKnown($, p.path, p.content)
        rejected.delete(p.path)
      }
      await checkProvenance($).catch(() => undefined)
      await refresh($, { force: true }).catch(() => undefined)
      return { text: `Adopted ${plan.length} file(s) as the known-good state:\n${plan.map(p => p.summary).join('\n')}` }
    } catch (err) {
      return { text: `Re-sync refused: ${errorText(err)}` }
    }
  })

  on('command.run', { command: 'stip-bind' }, async ($, e) => {
    try {
      const id = e.args.trim()
      if (!id) {
        const changes = await listChanges($)
        const bound = await read($, bindingAtom)
        return { text: `Bound: ${bound ?? 'nothing'}. Changes: ${changes.map(c => `${c.id} (${c.phase})`).join(', ') || 'none'}.` }
      }
      const snapshot = await bindChange($, id)
      return { text: `Bound to ${id} (${snapshot.phase ?? 'unknown phase'}).` }
    } catch (err) {
      return { text: `Bind refused: ${errorText(err)}` }
    }
  })
}
