// Builds the shared snapshot from engine output (pure).
import type {
  StipBinding,
  StipChangeRef,
  StipHelper,
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

export function workerOf(changeId: string, job: Job, now: number, live?: StipBinding): StipWorker {
  const startedAt = ms(job.confirmed_at) ?? ms(job.created_at)
  const finishedAt = TERMINAL.includes(job.status) ? (ms(job.finished_at) ?? ms(job.updated_at)) : null
  const model = typeof job.actual_model === 'string' ? job.actual_model : null
  return {
    changeId,
    taskId: job.task_id,
    attempt: job.attempt,
    role: String(job.role ?? ''),
    phase: String(job.phase ?? ''),
    status: job.status,
    acceptance: job.acceptance,
    agentId: typeof job.session_id === 'string' ? job.session_id : null,
    lastTool: live?.lastTool ?? (typeof job.last_tool === 'string' ? job.last_tool : null),
    startedAt,
    finishedAt,
    elapsedMs: startedAt === null ? null : Math.max(0, (finishedAt ?? now) - startedAt),
    hasResult: typeof job.result_path === 'string',
    isolated: job.isolated === true,
    integrated: job.integrated === true,
    model,
    error: typeof job.error === 'string' ? job.error : null,
    reviewReason: typeof job.review?.reason === 'string' ? job.review.reason : null,
  }
}

export function helperOf(job: Record<string, any>, now: number): StipHelper {
  const startedAt = ms(job.confirmed_at) ?? ms(job.created_at)
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
  }
}

export function emptySnapshot(changes: StipChangeRef[], now: number, changeId: string | null = null, error: string | null = null): StipSnapshot {
  return {
    changeId,
    phase: null,
    schemaVersion: null,
    approval: { current: false, digest: null, by: null, adopted: false },
    approvalUnconfirmed: false,
    registryCurrent: true,
    orphanTasks: [],
    lastRebase: null,
    tampered: [],
    extensions: [],
    tasks: [],
    workers: [],
    helpers: [],
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
    extensions: Array.isArray(status.extensions) ? status.extensions : [],
    tasks,
    workers,
    helpers: input.helpers.filter(h => h.change_id === changeId || h.change_id === null).map(h => helperOf(h, now)),
    ready,
    awaitingReview,
    awaitingIntegration,
    active: show?.active ?? { change: 0, helpers: 0, total: 0, writers: 0 },
    limits: show?.limits ?? { max_workers: 2, max_shared_writers: 1 },
    changes: input.changes,
    archivedCount: 0,
    criteria: [],
    error: input.error ?? (typeof status.runtime?.error === 'string' ? status.runtime.error : null),
    refreshedAt: now,
  }
}
