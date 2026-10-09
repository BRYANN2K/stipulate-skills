// Builds the shared snapshot from engine output (pure).
import type {
  StipBinding,
  StipChangeRef,
  StipGraph,
  StipHelper,
  StipNodeState,
  StipJobStatus,
  StipPhase,
  StipSnapshot,
  StipTask,
  StipWorker,
} from '../../types'
import type { PlanTask } from './brief.ts'
import { fallbackLabel } from './criteria.ts'

export const ACTIVE: readonly string[] = ['starting', 'running', 'waiting', 'unknown', 'correction']
export const TERMINAL: readonly string[] = ['returned', 'failed', 'cancelled']

const ms = (iso: unknown): number | null => {
  if (typeof iso !== 'string') return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

export type Job = Record<string, any> & {
  task_id: string
  attempt: number
  status: StipJobStatus
  acceptance: 'pending' | 'accepted' | 'rejected'
}

/** The model and effort a job runs with: the host-reported model, else its recorded launch profile's. */
export function profileOf(job: Record<string, any>): { model: string | null; effort: string | null } {
  const p = job.profile && typeof job.profile === 'object' ? job.profile : {}
  const recorded = typeof p.model === 'string' && p.model && p.model !== 'inherit' ? p.model : null
  return {
    model: typeof job.actual_model === 'string' && job.actual_model ? job.actual_model : recorded,
    effort: typeof p.effort === 'string' && p.effort ? p.effort : null,
  }
}

const base = (path: unknown): string | null => {
  if (typeof path !== 'string' || !path.trim()) return null
  const name = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? ''
  return name ? (name.length > 32 ? `${name.slice(0, 31)}…` : name) : null
}

/** A short phrase for a tool call ("writing README.md", "running pytest"), at most 40 characters. */
export function activityOf(tool: string, input: Record<string, unknown> = {}): string {
  const file = base(input.file_path ?? input.notebook_path ?? input.path)
  let out: string
  switch (tool) {
    case 'Write':
      out = file ? `writing ${file}` : 'writing'
      break
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      out = file ? `editing ${file}` : 'editing'
      break
    case 'Read':
      out = file ? `reading ${file}` : 'reading'
      break
    case 'Grep':
    case 'Glob':
      out = 'searching'
      break
    case 'WebFetch':
    case 'WebSearch':
      out = 'browsing'
      break
    case 'TodoWrite':
      out = 'planning'
      break
    case 'Bash': {
      // The program, skipping variable assignments and wrappers (cd x && …, env, sudo-like prefixes).
      const words = String(input.command ?? '')
        .split(/&&|\|\||;|\|/)
        .map(part => part.trim().split(/\s+/).filter(w => w && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)))
        .find(ws => ws.length && !['cd', 'export', 'set'].includes(ws[0]!))
      const skip = new Set(['env', 'command', 'exec', 'time', 'nice', 'npx', 'uv', 'poetry', 'pipenv'])
      let i = 0
      while (words && i < words.length - 1 && (skip.has(words[i]!) || (words[i] === 'run' && i > 0))) i++
      let prog = words?.[i]?.split('/').pop() ?? ''
      if (/^python[0-9.]*$/.test(prog) && words?.[i + 1] === '-m' && words[i + 2]) prog = words[i + 2]!
      else if (/^python[0-9.]*$/.test(prog) && words?.[i + 1] && !words[i + 1]!.startsWith('-')) prog = base(words[i + 1]) ?? prog
      else if (['npm', 'pnpm', 'yarn', 'bun', 'cargo', 'go', 'make', 'git'].includes(prog) && words?.[i + 1] && !words[i + 1]!.startsWith('-'))
        prog = `${prog} ${words[i + 1] === 'run' && words[i + 2] ? words[i + 2] : words[i + 1]}`
      out = prog ? `running ${prog.replace(/['"`]/g, '')}` : 'running a command'
      break
    }
    default:
      out = tool.startsWith('mcp__') ? tool.split('__').pop()! : tool
  }
  return out.length > 40 ? `${out.slice(0, 39)}…` : out
}

const TEST_RUNNERS = /^(pytest|py\.test|unittest|tox|nox|vitest|jest|mocha|ava|playwright|go test|cargo test|npm test|pnpm test|yarn test|bun test|npm run test|mix test|swift test|rspec|phpunit|node --test|ctest|make test|make check)$/

/**
 * A short human phrase for one step of a worker's trail ("Reading api.py", "Running tests",
 * "Searching the code"): capitalized, never a bare tool name (unknown tools read "Using <name>").
 */
export function stepPhrase(tool: string, input: Record<string, unknown> = {}): string {
  let out: string
  switch (tool) {
    case 'Grep':
    case 'Glob':
      out = 'Searching the code'
      break
    case 'WebSearch':
      out = 'Searching the web'
      break
    case 'WebFetch': {
      const host = /^https?:\/\/([^/:?#]+)/.exec(String(input.url ?? ''))?.[1]
      out = host ? `Reading ${host.replace(/^www\./, '')}` : 'Reading a web page'
      break
    }
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      out = 'Updating its plan'
      break
    case 'Agent':
    case 'Task':
      out = 'Delegating'
      break
    case 'Skill':
      out = 'Using a skill'
      break
    case 'ToolSearch':
      out = 'Loading tools'
      break
    case 'LS':
      out = 'Listing files'
      break
    case 'Bash': {
      const a = activityOf(tool, input)
      const prog = a.startsWith('running ') ? a.slice(8) : ''
      const cmd = String(input.command ?? '')
      out = TEST_RUNNERS.test(prog) || /\b(pytest|unittest|vitest|jest|go test|cargo test|(npm|pnpm|yarn|bun)( run)? test)\b/.test(cmd) ? 'Running tests' : prog ? `Running ${prog}` : 'Running a command'
      break
    }
    default: {
      if (['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
        const a = activityOf(tool, input)
        out = a.charAt(0).toUpperCase() + a.slice(1)
        break
      }
      const name = tool.startsWith('mcp__') ? (tool.split('__')[1] ?? tool).replace(/[_-]+/g, ' ') : tool.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
      out = `Using ${name}`
    }
  }
  return out.length > 40 ? `${out.slice(0, 39)}…` : out
}

const STATUS_WORDS: Partial<Record<StipJobStatus, string>> = {
  queued: 'queued',
  starting: 'starting',
  waiting: 'waiting on permission',
  unknown: 'launch unconfirmed',
  correction: 'correcting',
}

/** What an active job is doing: the waiting state first, then the live phrase, the last tool, the status. */
function activityNow(status: StipJobStatus, live: StipBinding | undefined, lastTool: string | null): string | null {
  if (!ACTIVE.includes(status) && status !== 'queued') return null
  if (status === 'waiting' || status === 'unknown') return STATUS_WORDS[status]!
  return live?.activity ?? lastTool ?? STATUS_WORDS[status] ?? status
}

export function workerOf(changeId: string, job: Job, now: number, live?: StipBinding): StipWorker {
  const startedAt = ms(job.confirmed_at) ?? ms(job.created_at)
  const finishedAt = TERMINAL.includes(job.status) ? (ms(job.finished_at) ?? ms(job.updated_at)) : null
  const { model, effort } = profileOf(job)
  const lastTool = live?.lastTool ?? (typeof job.last_tool === 'string' ? job.last_tool : null)
  return {
    changeId,
    taskId: job.task_id,
    attempt: job.attempt,
    role: String(job.role ?? ''),
    phase: String(job.phase ?? ''),
    status: job.status,
    acceptance: job.acceptance,
    agentId: typeof job.session_id === 'string' ? job.session_id : null,
    lastTool,
    startedAt,
    finishedAt,
    elapsedMs: startedAt === null ? null : Math.max(0, (finishedAt ?? now) - startedAt),
    hasResult: typeof job.result_path === 'string',
    isolated: job.isolated === true,
    integrated: job.integrated === true,
    model,
    effort,
    activity: activityNow(job.status, live, lastTool),
    steps: live?.steps ? [...live.steps] : [],
    error: typeof job.error === 'string' ? job.error : null,
    reviewReason: typeof job.review?.reason === 'string' ? job.review.reason : null,
  }
}

export function helperOf(job: Record<string, any>, now: number, live?: StipBinding): StipHelper {
  const startedAt = ms(job.confirmed_at) ?? ms(job.created_at)
  const { model, effort } = profileOf(job)
  const lastTool = live?.lastTool ?? (typeof job.last_tool === 'string' ? job.last_tool : null)
  return {
    helperId: String(job.helper_id),
    changeId: typeof job.change_id === 'string' ? job.change_id : null,
    role: String(job.role ?? ''),
    phase: String(job.phase ?? ''),
    question: String(job.objective ?? '').slice(0, 500),
    status: job.status,
    agentId: typeof job.session_id === 'string' ? job.session_id : null,
    hasResult: typeof job.result_path === 'string',
    startedAt,
    finishedAt: TERMINAL.includes(job.status) ? (ms(job.finished_at) ?? now) : null,
    error: typeof job.error === 'string' ? job.error : null,
    model,
    effort,
    activity: activityNow(job.status, live, lastTool),
    steps: live?.steps ? [...live.steps] : [],
    title: fallbackLabel(String(job.objective ?? '')),
    titleSource: 'fallback',
  }
}

function lastRebaseOf(registry: Record<string, any> | null | undefined) {
  const r = Array.isArray(registry?.rebases) ? registry!.rebases.at(-1) : null
  if (!r || typeof r !== 'object') return null
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    from: typeof r.from === 'string' ? r.from : null,
    to: String(r.to ?? ''),
    at: String(r.at ?? ''),
    reason: typeof r.reason === 'string' ? r.reason : null,
    kept: list(r.kept),
    reopened: list(r.reopened),
    retired: list(r.retired),
    retiredIntegratedPaths: pathsByTask(r.retired_integrated_paths),
  }
}

/** `{task: [paths]}` as the engine records it, keeping only well-formed entries. */
export function pathsByTask(value: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [task, paths] of Object.entries(value as Record<string, unknown>))
    if (Array.isArray(paths)) out[task] = paths.filter((p): p is string => typeof p === 'string')
  return out
}

/** The graph state of one task (see StipNodeState). */
export function nodeState(t: StipTask): StipNodeState {
  const w = t.latest
  if (!w) return t.ready ? 'ready' : 'blocked'
  if (ACTIVE.includes(w.status)) return w.attempt > 1 || w.status === 'correction' ? 'correction' : 'running'
  if (w.acceptance === 'accepted') return t.awaitingIntegration || (w.isolated && !w.integrated) ? 'pending' : 'integrated'
  if (w.acceptance === 'rejected') return 'correction'
  if (w.status === 'returned') return 'pending'
  if (w.status === 'failed' || w.status === 'cancelled') return 'failed'
  return t.ready ? 'ready' : 'blocked'
}

/** The plan's dependency graph: one node per task (plan order), edges from each dependency to its dependant. */
export function graphOf(tasks: StipTask[]): StipGraph {
  const byId = new Map(tasks.map(t => [t.id, t]))
  const depth = new Map<string, number>()
  const depthOf = (id: string, seen: Set<string>): number => {
    const known = depth.get(id)
    if (known !== undefined) return known
    if (seen.has(id)) return 0
    seen.add(id)
    const deps = (byId.get(id)?.dependsOn ?? []).filter(d => byId.has(d))
    const d = deps.length ? 1 + Math.max(...deps.map(x => depthOf(x, seen))) : 0
    depth.set(id, d)
    return d
  }
  const nodes = tasks.map(t => ({
    id: t.id,
    role: t.role,
    phase: t.phase,
    state: nodeState(t),
    attempt: t.latest?.attempt ?? null,
    depth: depthOf(t.id, new Set()),
    dependsOn: [...t.dependsOn],
  }))
  const state = new Map(nodes.map(n => [n.id, n.state]))
  const edges = tasks.flatMap(t => t.dependsOn.filter(d => byId.has(d)).map(d => ({ from: d, to: t.id, done: state.get(d) === 'integrated' })))
  return { nodes, edges }
}

/** The Ledger's state fields before computeSnapshot fills them (see StipSnapshot). */
export function ledgerDefaults(): Pick<StipSnapshot, 'setup' | 'start' | 'explore' | 'contractDiff' | 'check' | 'archived' | 'ui'> {
  return {
    setup: null,
    start: { followUps: [], specs: [] },
    explore: null,
    contractDiff: null,
    check: { reviewer: null, criterion: null, reportAt: null },
    archived: null,
    ui: { motion: 'auto', typing: false },
  }
}

export function emptySnapshot(changes: StipChangeRef[], now: number, changeId: string | null = null, error: string | null = null): StipSnapshot {
  return {
    ...ledgerDefaults(),
    changeId,
    phase: null,
    schemaVersion: null,
    approval: { current: false, digest: null, by: null, adopted: false },
    approvalUnconfirmed: false,
    registryCurrent: true,
    orphanTasks: [],
    lastRebase: null,
    tampered: [],
    restoreHeld: [],
    extensions: [],
    enabledExtensions: [],
    tasks: [],
    workers: [],
    helpers: [],
    graph: { nodes: [], edges: [] },
    ready: [],
    awaitingReview: [],
    awaitingIntegration: [],
    active: { change: 0, helpers: 0, total: 0, writers: 0 },
    limits: { max_workers: 2, max_shared_writers: 1 },
    changes,
    archivedCount: 0,
    criteria: [],
    error,
    refreshedAt: now,
  }
}

/**
 * `status` is `status <id> --compact`; `show` is `runtime show <id>` (null for a v1 change);
 * `stateApproval` is the approval record of state.json when known.
 */
export function buildSnapshot(input: {
  changeId: string
  status: Record<string, any>
  show: Record<string, any> | null
  helpers: Record<string, any>[]
  live: Record<string, StipBinding>
  changes: StipChangeRef[]
  now: number
  approvedBy?: string | null
  /** The digest the person approved through Stip ($.store), or null. */
  userDigest?: string | null
  /** The person's record was adopted from an approval that predates the mod. */
  userAdopted?: boolean
  error?: string | null
}): StipSnapshot {
  const { changeId, status, show, now } = input
  const plan: PlanTask[] = Array.isArray(status.plan?.tasks) ? status.plan.tasks : []
  const jobs: Job[] = Array.isArray(show?.registry?.jobs) ? show!.registry.jobs : []
  const latest: Record<string, Job> = show?.latest ?? {}
  const live = Object.values(input.live)
  const liveOf = (j: Job) =>
    live.find(b => b.kind === 'task' && b.changeId === changeId && b.taskId === j.task_id && b.attempt === j.attempt)
  const liveHelper = (h: Record<string, any>) => live.find(b => b.kind === 'helper' && b.helperId === h.helper_id)
  const ready: string[] = Array.isArray(show?.ready) ? show!.ready : []
  const awaitingReview: string[] = Array.isArray(show?.awaiting_review) ? show!.awaiting_review : []
  const awaitingIntegration: string[] = Array.isArray(show?.awaiting_integration) ? show!.awaiting_integration : []
  const tasks: StipTask[] = plan.map(t => ({
    id: t.id,
    role: t.role,
    phase: t.phase,
    objective: t.objective,
    criteria: t.criteria ?? [],
    dependsOn: t.depends_on ?? [],
    writePaths: t.write_paths ?? [],
    ready: ready.includes(t.id),
    awaitingReview: awaitingReview.includes(t.id),
    awaitingIntegration: awaitingIntegration.includes(t.id),
    latest: latest[t.id] ? workerOf(changeId, latest[t.id]!, now, liveOf(latest[t.id]!)) : null,
  }))
  const workers = jobs
    .filter(j => latest[j.task_id]?.attempt === j.attempt)
    .map(j => workerOf(changeId, j, now, liveOf(j)))
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
  return {
    changeId,
    phase: (status.phase ?? null) as StipPhase | null,
    schemaVersion: typeof status.schema_version === 'number' ? status.schema_version : null,
    // An engine approval counts only when it is the one the person gave through Stip (AC-14).
    approval: {
      current: status.approval_current === true && input.userDigest === status.contract_digest,
      digest: typeof status.contract_digest === 'string' ? status.contract_digest : null,
      by: input.approvedBy ?? null,
      adopted: status.approval_current === true && input.userDigest === status.contract_digest && input.userAdopted === true,
    },
    approvalUnconfirmed: status.approval_current === true && input.userDigest !== status.contract_digest,
    registryCurrent: show?.registry_current !== false,
    orphanTasks: Array.isArray(show?.orphan_tasks) ? show!.orphan_tasks : [],
    lastRebase: lastRebaseOf(show?.registry),
    tampered: [],
    restoreHeld: [],
    extensions: Array.isArray(status.extensions) ? status.extensions : [],
    // Filled from the project config by computeSnapshot.
    enabledExtensions: [],
    tasks,
    workers,
    helpers: input.helpers.filter(h => h.change_id === changeId || h.change_id === null).map(h => helperOf(h, now, liveHelper(h))),
    graph: graphOf(tasks),
    ready,
    awaitingReview,
    awaitingIntegration,
    active: show?.active ?? { change: 0, helpers: 0, total: 0, writers: 0 },
    limits: show?.limits ?? { max_workers: 2, max_shared_writers: 1 },
    changes: input.changes,
    archivedCount: 0,
    criteria: [],
    ...ledgerDefaults(),
    error: input.error ?? (typeof status.runtime?.error === 'string' ? status.runtime.error : null),
    refreshedAt: now,
  }
}
