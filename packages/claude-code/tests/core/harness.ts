// Test world for the Stipulate core: a fake lifecycle engine, a virtual file system and
// fake agents, answered beneath the plugin through the test's `on`.
import { mock, type MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

export const ROOT = '/proj'
export const DIGEST = 'ab12cd34ef56'.padEnd(64, '0')

export type Task = {
  id: string
  role: string
  phase: string
  objective: string
  criteria: string[]
  depends_on: string[]
  write_paths: string[]
  read_paths: string[]
}

export type FakeJob = Record<string, any>

export const TASKS: Task[] = [
  { id: 'core', role: 'backend', phase: 'apply', objective: 'Build the core', criteria: ['AC-1'], depends_on: [], write_paths: ['src/core'], read_paths: [] },
  { id: 'ui', role: 'frontend', phase: 'apply', objective: 'Build the UI', criteria: ['AC-2'], depends_on: [], write_paths: ['src/ui'], read_paths: [] },
  { id: 'verify', role: 'verification', phase: 'check', objective: 'Verify', criteria: ['AC-1', 'AC-2'], depends_on: ['core', 'ui'], write_paths: [], read_paths: [] },
]

export type SpawnMode = 'ok' | 'throw' | 'throw-started' | 'deny' | 'unlisted'

export class World {
  files = new Map<string, string>()
  links = new Map<string, string>()
  phase = 'applying'
  approvalCurrent = true
  jobs: FakeJob[] = []
  helpers: FakeJob[] = []
  results = new Map<string, string>()
  calls: string[][] = []
  stdin: (string | undefined)[] = []
  agents: { id: string; description: string; type: string; status: string; spawnedBy?: string }[] = []
  spawned: Record<string, unknown>[] = []
  registeredAgents: Record<string, any>[] = []
  registeredTools: string[] = []
  registeredCommands: string[] = []
  toasts: string[] = []
  sent: unknown[] = []
  ran: string[] = []
  spawnMode: SpawnMode = 'ok'
  late: (() => void)[] = []
  throwOn = new Set<string>()
  nextAgent = 1
  integrateConflict = false
  failOn: string | null = null
  approvedBy: string | null = 'user'
  /** The person's approval record in the plugin store (null: none). */
  userDigest: string | null = DIGEST
  /** The current contract's digest, and the one the worker registry is tied to. */
  contractDigest = DIGEST
  registryDigest = DIGEST
  rebases: Record<string, unknown>[] = []
  retiredJobs: FakeJob[] = []
  /** The approved plan's tasks (a revision may add, change or remove tasks). */
  tasks: Task[] = TASKS.map(t => ({ ...t }))
  /** Tasks whose definition changed in the revised contract (the engine compares recorded fields). */
  changedTasks = new Set<string>()
  orphans(): string[] {
    return [...new Set(this.jobs.map(j => j.task_id).filter(id => !this.tasks.some(t => t.id === id)))].sort()
  }
  envSet: Record<string, string | undefined> = {}
  /** Variables the session's environment starts with. */
  envVars: Record<string, string> = {}
  /** Whether this project already has a provenance baseline (false: first activation adopts). */
  baselined = true
  approvedAt = '2026-01-01T00:00:00+00:00'
  head = 'aaaaaaaaaaaa1111'
  revoked: string[] = []
  workerEnvRefusals = 0
  /** Every Bash command as it reached the tool (after the plugin's rewrite). */
  bashCommands: string[] = []
  /** A side effect a Bash call has on the world (simulating what the command did). */
  bashEffect: ((command: string) => void) | null = null
  untrackedConflicts = false
  integrateSkipped: { path: string; reason: string }[] = []
  prompts: string[] = []
  /** Prompts sent to $.model.complete, and what the fake model answers (null: no answer). */
  completions: string[] = []
  labelReply: (prompt: string) => string | null = prompt => (/question/.test(prompt.split('\n')[0]!) ? 'Cache location question' : 'Core works label')
  /** Host calls answered beneath the plugin (for draining a tick before assertions). */
  activity = 0
  /** The type the host reports for a started agent (simulates the host ignoring the requested type). */
  typeOverride: string | null = null
  logs: string[] = []
  /** Transcript notices the plugin appended (details the model does not read). */
  notices: () => string[] = () => []
  /** Everything shown to the person: toasts, then notices. */
  said(): string[] {
    return [...this.toasts, ...this.notices()]
  }
  /** Paths `git status --porcelain` reports modified in the main checkout. */
  gitDirty: string[] = []
  store: Record<string, any> = {}

  constructor() {
    this.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ schema_version: 1, extensions: {} }))
    this.files.set(
      `${ROOT}/.workflow/changes/demo/spec.md`,
      '# Demo\n\n## Acceptance criteria\n\n- AC-1: The core works.\n- AC-2: The UI shows it.\n',
    )
    this.syncChange()
  }

  syncChange() {
    this.files.set(
      `${ROOT}/.workflow/changes/demo/state.json`,
      JSON.stringify({
        schema_version: 2,
        id: 'demo',
        phase: this.phase,
        ...(this.approvalCurrent ? { approval: { contract_digest: this.contractDigest, by: this.approvedBy, recorded_at: this.approvedAt } } : {}),
      }),
    )
    this.files.set(`${ROOT}/.workflow/.runtime/demo/state.json`, JSON.stringify({ version: 1, change_id: 'demo', contract_digest: this.registryDigest, ...(this.rebases.length ? { rebases: this.rebases } : {}), ...(this.retiredJobs.length ? { retired_jobs: this.retiredJobs } : {}), jobs: this.jobs }, null, 2) + '\n')
    this.files.set(`${ROOT}/.workflow/.runtime/engine-helpers.json`, JSON.stringify({ version: 1, jobs: this.helpers }, null, 2) + '\n')
  }

  latest(task: string) {
    return this.jobs.filter(j => j.task_id === task).sort((a, b) => b.attempt - a.attempt)[0]
  }

  /** Engine calls for one action, e.g. engineCalls('settle'). */
  engineCalls(action: string) {
    return this.calls.filter(c => c[0] === action || (c[0] === 'runtime' && c[1] === action))
  }

  flag(args: string[], name: string) {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }

  engine(args: string[], stdin?: string, env: Record<string, string> = {}): { exitCode: number; stdout: string; stderr: string } {
    this.calls.push(args)
    const readOnly = args[0] === 'status' || (args[0] === 'runtime' && args[1] === 'show')
    if (!readOnly && env.STIP_WORKER) {
      this.workerEnvRefusals++
      return { exitCode: 1, stdout: '', stderr: JSON.stringify({ error: 'STIP_WORKER is set: workers cannot mutate the workflow lifecycle or worker registry; report to the coordinator.' }) }
    }
    this.stdin.push(stdin)
    const ok = (v: unknown) => ({ exitCode: 0, stdout: JSON.stringify(v), stderr: '' })
    const no = (error: string, extra: Record<string, unknown> = {}) => ({ exitCode: 1, stdout: '', stderr: JSON.stringify({ error, ...extra }) })
    const [cmd, sub] = args
    // Like the real engine, read the registry from disk (a tampered file is what it sees).
    const reg = this.files.get(`${ROOT}/.workflow/.runtime/demo/state.json`)
    if (reg) {
      const parsed = JSON.parse(reg)
      this.jobs = parsed.jobs
      this.rebases = parsed.rebases ?? []
      this.retiredJobs = parsed.retired_jobs ?? []
      if (typeof parsed.contract_digest === 'string') this.registryDigest = parsed.contract_digest
    }
    const hreg = this.files.get(`${ROOT}/.workflow/.runtime/engine-helpers.json`)
    if (hreg) this.helpers = JSON.parse(hreg).jobs
    if (this.failOn && (cmd === this.failOn || sub === this.failOn)) return no(`forced failure of ${this.failOn}`)
    const active = (j: FakeJob) => ['starting', 'running', 'waiting', 'unknown', 'correction'].includes(j.status)
    const done = () => {
      this.syncChange()
    }
    if (cmd === 'status')
      return ok({
        schema_version: 2,
        id: 'demo',
        phase: this.phase,
        extensions: ['cli-tooling'],
        approval_current: this.approvalCurrent,
        contract_digest: this.contractDigest,
        plan: { version: 1, tasks: this.tasks },
      })
    if (cmd === 'validate') return ok({ criteria: ['AC-1', 'AC-2'], contract_digest: this.contractDigest, phase: this.approvalCurrent ? this.phase : 'draft' })
    if (cmd === 'approve') {
      this.approvalCurrent = true
      this.phase = 'approved'
      this.approvedBy = this.flag(args, '--by') ?? null
      this.approvedAt = `2026-02-0${this.engineCalls('approve').length}T00:00:00+00:00`
      done()
      return ok({ phase: 'approved', approval: { contract_digest: this.contractDigest, by: this.approvedBy, recorded_at: this.approvedAt } })
    }
    if (cmd === 'runtime' && sub === 'revoke-approval') {
      if (!this.approvalCurrent) return no('This change has no approval to revoke.')
      this.revoked.push(args[2]!)
      this.approvalCurrent = false
      this.approvedBy = null
      this.phase = 'draft'
      done()
      return ok({ change: args[2], phase: 'draft', approval_revoked: { reason: this.flag(args, '--reason') } })
    }
    if (cmd === 'runtime' && sub === 'rebase') {
      if (!this.approvalCurrent) return no('Contract or selected extension changed. Validate and obtain user approval again.')
      const orphans = this.orphans()
      const latestOf = (id: string) => this.jobs.filter(j => j.task_id === id).sort((a, b) => b.attempt - a.attempt)[0]
      const ids = [...new Set(this.jobs.map(j => j.task_id))].filter(id => !orphans.includes(id)).sort()
      if (this.registryDigest === this.contractDigest && !orphans.length) return ok({ change_id: 'demo', contract_digest: this.contractDigest, changed: false, registry_current: true, kept: ids, reopened: [], retired: [] })
      if (this.jobs.some(active)) return no('Workers are active or their outcome is unknown; reconcile them before rebasing the registry.')
      const stamp = '2026-02-02T00:00:00+00:00'
      for (const j of this.jobs.filter(j => orphans.includes(j.task_id))) this.retiredJobs.push({ ...j, retired_reason: 'task removed from the revised contract', retired_at: stamp })
      this.jobs = this.jobs.filter(j => !orphans.includes(j.task_id))
      const reopened = new Map<string, string>()
      for (const id of ids) if (this.changedTasks.has(id)) reopened.set(id, 'task changed in revised contract')
      for (let grew = true; grew; ) {
        grew = false
        for (const t of this.tasks)
          if (ids.includes(t.id) && !reopened.has(t.id) && t.depends_on.some(d => reopened.has(d))) (reopened.set(t.id, 'dependency changed'), (grew = true))
      }
      for (const [id, why] of reopened) {
        const job = latestOf(id)!
        if (job.review) job.superseded_review = job.review
        Object.assign(job, { acceptance: 'rejected', review: { decision: 'rejected', reason: why, at: stamp }, updated_at: stamp })
      }
      const kept = ids.filter(id => !reopened.has(id))
      const entry = { from: this.registryDigest, to: this.contractDigest, at: stamp, reason: this.flag(args, '--reason') ?? null, kept, reopened: [...reopened.keys()].sort(), retired: orphans }
      this.rebases.push(entry)
      this.registryDigest = this.contractDigest
      done()
      return ok({ change_id: 'demo', contract_digest: this.contractDigest, changed: true, registry_current: true, rebase: entry, kept, reopened: entry.reopened, retired: orphans })
    }
    if (cmd === 'plan') return ok({ change: args[1], plan: JSON.parse(stdin ?? 'null') })
    if (cmd !== 'runtime') return no(`unexpected command ${cmd}`)
    const id = args[2]!
    const task = this.flag(args, '--task')
    const helper = this.flag(args, '--helper')
    if (sub === 'show') {
      const latest = Object.fromEntries(this.tasks.flatMap(t => (this.latest(t.id) ? [[t.id, this.latest(t.id)]] : [])))
      const out: Record<string, unknown> = {
        change_id: 'demo',
        phase: this.phase,
        approval_current: this.approvalCurrent,
        contract_digest: this.contractDigest,
        registry: { version: 1, change_id: 'demo', contract_digest: this.registryDigest, ...(this.rebases.length ? { rebases: this.rebases } : {}), ...(this.retiredJobs.length ? { retired_jobs: this.retiredJobs } : {}), jobs: this.jobs },
        registry_current: this.registryDigest === this.contractDigest && !this.orphans().length,
        orphan_tasks: this.orphans(),
        latest,
        ready: this.tasks.filter(t => !this.latest(t.id) || this.latest(t.id)!.acceptance === 'rejected').map(t => t.id),
        awaiting_review: Object.values(latest).filter((j: any) => j.status === 'returned' && j.acceptance === 'pending').map((j: any) => j.task_id),
        awaiting_integration: [],
        active: { change: this.jobs.filter(active).length, helpers: this.helpers.filter(active).length, total: this.jobs.filter(active).length + this.helpers.filter(active).length, writers: 0 },
        limits: { max_workers: 2, max_shared_writers: 1 },
      }
      if (task) {
        const job = this.latest(task)
        if (!job) return no(`No worker record for task ${task}.`)
        out.job = job
        out.result = this.results.get(`${task}#${job.attempt}`) ?? null
      }
      return ok(out)
    }
    if (sub === 'reserve') {
      if (helper) {
        const job = { kind: 'helper', helper_id: `helper-${'0'.repeat(8)}-0000-4000-8000-${String(this.helpers.length + 1).padStart(12, '0')}`, change_id: id === '-' ? null : id, role: helper, phase: this.flag(args, '--phase') ?? 'explore', objective: this.flag(args, '--question'), status: 'starting', session_id: null, attempt: 1, host: this.flag(args, '--host'), created_at: '2026-01-01T00:00:00Z' }
        this.helpers.push(job)
        done()
        return ok({ change_id: job.change_id, job, cwd: ROOT })
      }
      if (!this.approvalCurrent) return no('Contract or selected extension changed. Validate and obtain user approval again.')
      if (this.orphans().length) return no(`Worker record needs a known task_id and a positive attempt (task ${this.orphans()[0]} is not in the plan; run runtime rebase).`)
      if (this.registryDigest !== this.contractDigest) return no('Registry belongs to another contract; reconcile it first.')
      const previous = this.latest(task!)
      if (previous && active(previous)) return no('This task already has an active or unknown native run.')
      const isolate = args.includes('--isolate')
      const attempt = (previous?.attempt ?? 0) + 1
      const t = this.tasks.find(x => x.id === task)!
      const job: FakeJob = {
        run_id: `run-${task}-${attempt}`,
        task_id: task,
        attempt,
        role: t.role,
        phase: t.phase,
        objective: t.objective,
        write_paths: t.write_paths,
        read_paths: [],
        criteria: t.criteria,
        status: 'starting',
        acceptance: 'pending',
        session_id: null,
        parent_id: this.flag(args, '--parent'),
        host: this.flag(args, '--host'),
        profile: JSON.parse(this.flag(args, '--profile-json') ?? 'null'),
        isolated: isolate,
        created_at: '2026-01-01T00:00:00Z',
        ...(isolate ? { worktree: `.workflow/.runtime/demo/worktrees/${task}-${attempt}`, integrated: false } : {}),
      }
      this.jobs.push(job)
      done()
      return ok({ change_id: 'demo', job, cwd: isolate ? `${ROOT}/${job.worktree}` : ROOT })
    }
    const job = helper ? this.helpers.find(h => h.helper_id === helper) : this.latest(task!)
    if (!job) return no(`No worker record for task ${task ?? helper}.`)
    const attempt = this.flag(args, '--attempt')
    if (!helper && sub !== 'cancel' && sub !== 'review' && sub !== 'integrate' && attempt !== String(job.attempt))
      return no(`Attempt ${attempt} is not the latest attempt of ${task}.`)
    if (sub === 'confirm') {
      if (!['starting', 'unknown'].includes(job.status)) return no('Only a starting or unresolved launch can be confirmed.')
      Object.assign(job, { session_id: this.flag(args, '--session'), status: 'running', launch_confirmed: true, actual_model: this.flag(args, '--model') ?? null })
      done()
      return ok({ job })
    }
    if (sub === 'settle') {
      const status = this.flag(args, '--status')!
      if (['returned', 'failed', 'cancelled'].includes(job.status) && (status !== job.status || job.acceptance !== 'pending')) return no('A finished attempt cannot change state; reserve a new attempt instead.')
      job.status = status
      const lastTool = this.flag(args, '--last-tool')
      if (lastTool) job.last_tool = lastTool
      const error = this.flag(args, '--error')
      if (error) job.error = error
      if (this.flag(args, '--result-file') === '-') {
        this.results.set(`${helper ?? task}#${job.attempt}`, stdin ?? '')
        job.result_path = `.workflow/.runtime/demo/results/${helper ?? task}-${job.attempt}.md`
        if (helper) this.files.set(`${ROOT}/.workflow/.runtime/helper-results/${helper}.md`, stdin ?? '')
      }
      done()
      return ok({ job })
    }
    if (sub === 'review') {
      if (job.status !== 'returned') return no('Only a returned native contribution can be reviewed.')
      job.acceptance = this.flag(args, '--decision')
      job.review = { reason: this.flag(args, '--reason') }
      done()
      return ok({ job })
    }
    if (sub === 'integrate') {
      if (this.integrateConflict)
        return no(`Integration of ${task} refused; nothing was written.`, {
          conflicts: this.untrackedConflicts
            ? [{ path: 'src/__pycache__/a.pyc', reason: 'Changed outside the task write_paths.', untracked: true }]
            : [{ path: 'src/core/a.ts', reason: 'Changed in the main checkout since the snapshot.' }],
        })
      job.integrated = true
      done()
      return ok({ task_id: task, written: ['src/core/a.ts'], deleted: [], skipped: this.integrateSkipped, job })
    }
    if (sub === 'cancel') {
      if (!active(job)) return no('No active attempt to cancel.')
      job.status = 'cancelled'
      job.cancellation = { reason: this.flag(args, '--reason') ?? null }
      done()
      return ok({ job, note: 'Recorded only' })
    }
    return no(`unexpected runtime ${sub}`)
  }

  realPath(path: string): string | undefined {
    for (const [from, to] of this.links) if (path === from || path.startsWith(from + '/')) return to + path.slice(from.length)
    if (this.files.has(path)) return path
    const dir = path.replace(/\/$/, '')
    if (dir === '' || dir === ROOT || [...this.files.keys()].some(f => f.startsWith(dir + '/'))) return dir || '/'
    return undefined
  }
}

const value = (v: unknown) => ({ value: v }) as never

/** Answers everything the core calls beneath the plugin. */
export function install(on0: On, world: World): MockClock {
  world.syncChange()
  // Every hook the harness answers counts as activity (drain waits until it stops).
  const on = ((...args: unknown[]) => {
    const hook = args[args.length - 1] as (...a: unknown[]) => unknown
    args[args.length - 1] = (...a: unknown[]) => {
      world.activity++
      return hook(...a)
    }
    return (on0 as unknown as (...a: unknown[]) => unknown)(...args)
  }) as unknown as On
  const clock = mock.clock(on0, { now: 1_000_000 })
  // The plugin's notices (door `note`), recorded without taking the test's own mock.session slot.
  const noticeRows: string[] = []
  on('session.append', { door: 'note' }, async ($, e, next) => {
    if (e.message.type === 'system') noticeRows.push((e.message.content as { text?: string }[]).map(b => b.text ?? '').join(''))
    return next(e)
  })
  world.notices = () => [...noticeRows]
  mock.env(on0, { HOME: '/home/u', ...world.envVars })
  on('env.set', ($, e) => ((world.envSet[e.name] = e.value), value(undefined)))
  // The plugin store, held by the world so a test can tamper with it as an outside writer would.
  Object.assign(world.store, {
    ...(world.userDigest ? { approvals: { [ROOT]: { demo: { digest: world.userDigest, at: '2026-01-01T00:00:00.000Z', recordedAt: world.approvedAt } } } } : {}),
    ...(world.baselined ? { baselines: { [ROOT]: '2026-01-01T00:00:00.000Z' } } : {}),
  })
  on('store.get', ($, e) => value(world.store[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(world.store[e.key]))))
  on('store.set', ($, e) => ((world.store[e.key] = JSON.parse(JSON.stringify(e.value))), value(undefined)))
  on('store.delete', ($, e) => (delete world.store[e.key], value(undefined)))
  on('store.keys', () => value(Object.keys(world.store)))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.root', () => value(ROOT))
  on('session.cwd', () => {
    if (world.throwOn.has('session.cwd')) throw new Error('no cwd')
    return value(ROOT)
  })
  on('session.id', () => value('sess-1'))
  on('session.messages', () => value([]))
  on('session.send', ($, e) => (world.sent.push(e), { isDelivered: true }) as never)
  on('tool.register', ($, e) => (world.registeredTools.push(e.name), value({ tool: `mcp__stipulate__${e.name}` })))
  on('command.register', ($, e) => (world.registeredCommands.push(e.name), value({ command: e.name })))
  on('agent.register', ($, e) => (world.registeredAgents.push(e), value({ agent: `stipulate:${e.name}` })))
  on('agent.list', () => {
    if (world.throwOn.has('agent.list')) throw new Error('agent list unavailable')
    return value(world.agents)
  })
  on('agent.spawn', ($, e) => {
    // The kit raises the spawn in the Agent tool's spelling (subagent_type).
    const raw = e as unknown as Record<string, unknown>
    const subagentType = String(raw.subagentType ?? raw.subagent_type)
    world.spawned.push({ ...raw, subagentType })
    const id = `agent-${world.nextAgent++}`
    // Launched by the coordinator model's Agent call: no spawnedBy.
    const started = () => world.agents.push({ id, description: e.description, type: world.typeOverride ?? subagentType, status: 'running' })
    if (world.spawnMode === 'throw') throw new Error('spawn transport failed')
    if (world.spawnMode === 'throw-started') {
      started()
      throw new Error('spawn answer lost')
    }
    if (world.spawnMode === 'deny') return { deny: 'blocked by policy' }
    // The kit hands the plugin no agentId from a test's answer; the plugin resolves it by description.
    if (world.spawnMode === 'unlisted') {
      world.late.push(() => started())
      return { model: 'claude-test' }
    }
    started()
    return { model: 'claude-test', agentId: id }
  })
  on('ui.toast', ($, e) => (world.toasts.push(e.text), value(undefined)))
  on('ui.log', ($, e) => (world.logs.push(String((e as { text?: string }).text)), value(undefined)))
  on('fs.exists', ($, e) => (world.activity++, value(world.realPath(e.path) !== undefined)))
  on('fs.read', ($, e) => {
    world.activity++
    const text = world.files.get(e.path)
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)
    return value(text)
  })
  on('fs.list', ($, e) => {
    const names = new Set<string>()
    for (const f of world.files.keys()) if (f.startsWith(e.path + '/')) names.add(f.slice(e.path.length + 1).split('/')[0]!)
    return value([...names].map(name => ({ name, kind: 'directory', size: 0, mtimeMs: 0, isLink: false })))
  })
  on('fs.stat', ($, e) => {
    world.activity++
    const real = world.realPath(e.path)
    if (real === undefined) throw new Error(`ENOENT: ${e.path}`)
    return value({ kind: world.files.has(real) ? 'file' : 'directory', size: 0, mtimeMs: 0, isLink: false, ...(e.resolve ? { realPath: real } : {}) })
  })
  on('process.run', ($, e) => {
    world.activity++
    const argv = [...e.argv]
    if (argv[0] === 'python3' && argv[1] === '-c') {
      const req = JSON.parse(e.init?.stdin ?? '{}')
      world.ran.push('save-settings')
      if (req.revision === 'stale') return value({ exitCode: 1, stdout: '', stderr: JSON.stringify({ error: 'Settings changed elsewhere; reload before saving.' }), isStdoutTruncated: false, isStderrTruncated: false })
      world.files.set(req.dest, req.text)
      return value({ exitCode: 0, stdout: JSON.stringify({ saved: true }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
    }
    if (argv[0] === 'git' && argv[1] === 'status')
      return value({ exitCode: 0, stdout: world.gitDirty.map(p => ` M ${p}\n`).join(''), stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
    if (argv[0] === 'git' && argv.includes('rev-parse'))
      return value({ exitCode: 0, stdout: world.head + '\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
    const at = argv.indexOf('--root')
    const r = world.engine(argv.slice(at + 2), e.init?.stdin, { ...(e.init?.env ?? {}) })
    return value({ ...r, isStdoutTruncated: false, isStderrTruncated: false })
  })
  // The tools themselves, beneath every guard: a call that reaches here ran.
  on('tool.call', ($, e) => {
    if (e.tool === 'Bash') {
      world.bashCommands.push(e.command)
      world.bashEffect?.(e.command)
    }
    return { result: `ran ${e.tool}` }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('model.complete', ($, e) => {
    world.completions.push(e.prompt)
    const text = world.labelReply(e.prompt)
    const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
    return value(text === null ? { isAnswered: false, reason: 'empty-reply', usage } : { isAnswered: true, text, usage })
  })
  on('prompt.fill', ($, e) => (world.prompts.push(e.text), { isFilled: true }) as never)
  on('fs.write', ($, e) => (world.activity++, world.files.set(e.path, e.text), value(undefined)))
  // A tick's work runs as many host round trips; settle until it has drained before assertions.
  const drain = async () => {
    // Settle until no host call was seen for 10 consecutive settles (bounded).
    let quiet = 0
    for (let i = 0; i < 4000 && quiet < 40; i++) {
      const before = world.activity
      await clock.settle()
      quiet = world.activity === before ? quiet + 1 : 0
    }
  }
  return {
    ...clock,
    advance: async (ms: number) => {
      await clock.advance(ms)
      await drain()
    },
    settle: drain,
  }
}

/** The coordinator model's Agent call for a ticket a stip tool returned. */
export async function launch($: any, reply: { launch?: { subagent_type: string; description: string } }) {
  if (!reply.launch) throw new Error('no ticket in ' + JSON.stringify(reply))
  return $.agent.spawn({ prompt: 'placeholder from the model', description: reply.launch.description, subagentType: reply.launch.subagent_type })
}

/**
 * stip_delegate, then the coordinator's launch, as a session does. Answers the delegate reply plus
 * what the launch produced: `agent_id` and the job `status` as the registry records them.
 */
export async function delegateAndLaunch($: any, w: World, task: string, extra: Record<string, unknown> = {}) {
  const r = await $.tool.call({ tool: 'mcp__stipulate__stip_delegate', change_id: 'demo', task_id: task, ...extra } as never)
  if (r.deny) return { deny: r.deny as string }
  const out = parse(r)
  await launch($, out).catch((e: Error) => (out.launch_error = e.message))
  const job = w.latest(task)
  out.status = job?.status
  out.agent_id = job?.session_id ?? w.agents.find(a => a.description === out.launch.description)?.id ?? null
  return out
}

export const parse = (r: { result?: unknown }) => JSON.parse(String(r.result))
