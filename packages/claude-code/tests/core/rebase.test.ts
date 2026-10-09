// Attempt 8: re-approval moves the worker registry to the new contract; Python caches are disabled for
// every Bash call of the session; reconcile leaves other sessions' jobs alone.
import { describe, expect, test } from 'claude-code/testing'

import { DIGEST, ROOT, World, delegateAndLaunch, install, interfaceOf, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const D2 = 'cd34ef56ab12'.padEnd(64, '1')
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const approve = ($: any, digest: string) =>
  $.command.run({ command: 'stip-approve', args: `demo confirm ${digest.slice(0, 12)}`, origin: { kind: 'composer' } } as never)
/** The contract was revised after the registry started: approval stale, registry tied to the old digest. */
const revise = (w: World) => {
  w.contractDigest = D2
  w.approvalCurrent = false
  w.syncChange()
}

describe('re-approval and the worker registry', () => {
  test('a revised contract: dispatch is refused with the fix; the person re-approves; the registry is rebased; dispatch works', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const first = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: first, reason: 'answer' } as never)
    revise(w)
    // The person re-approves through Stip: approval first, then the registry follows automatically.
    const r = await approve($, D2)
    expect(r.text).toMatch(/Approved demo/)
    expect(r.text).toMatch(/worker registry was moved to the new contract/)
    expect(w.registryDigest).toBe(D2)
    expect(w.engineCalls('rebase')[0]).toContain('re-approved by the person')
    expect(w.latest('core')!.status).toBe('returned') // jobs kept
    expect((parse(await call($, P + 'stip_status'))).snapshot.registryCurrent).toBe(true)
    const next = await delegateAndLaunch($, w, 'ui')
    expect(next.status).toBe('running')
    for (let i = 0; i < 3; i++) await clock.advance(10_000)
    expect(w.said().some(t => /Registry restored|outside this Claude Code session/.test(t))).toBe(false)
  })

  test('the coordinator\'s dispatch on a stale registry explains how the person fixes it', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.registryDigest = 'old'.padEnd(64, '0')
    w.syncChange()
    const r = await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' })
    expect(String(r.deny)).toMatch(/re-approves the current contract .* or presses Rebase registry in the \/stip pane/)
    expect((parse(await call($, P + 'stip_status'))).snapshot.registryCurrent).toBe(false)
  })

  test('active workers block the rebase: the reply says so, and it is offered from the pane once they are done', async ($, on) => {
    const w = new World()
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    const worker = (await delegateAndLaunch($, w, 'core')).agent_id as string
    revise(w)
    const r = await approve($, D2)
    expect(r.text).toMatch(/still tied to the previous contract .*Rebase it from the pane once the workers are done/)
    expect(w.registryDigest).toBe(DIGEST)
    expect((parse(await call($, P + 'stip_status'))).snapshot.registryCurrent).toBe(false)
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: worker, reason: 'answer' } as never)
    expect(w.toasts.some(t => t === 'Workers done · rebase registry in /stip')).toBe(true)
    expect(await press($, 'rebase')).toMatchObject({ ok: true, value: { needed: true, done: true } })
    expect(w.registryDigest).toBe(D2)
    expect(w.engineCalls('rebase').at(-1)).toContain('rebased by the person from the pane')
  })

  test('the rebase is journaled as known-good (no restore afterwards)', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const worker = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: worker, reason: 'answer' } as never)
    revise(w)
    await approve($, D2)
    for (let i = 0; i < 3; i++) await clock.advance(10_000)
    expect(JSON.parse(w.files.get(`${ROOT}/.workflow/.runtime/demo/state.json`)!).contract_digest).toBe(D2)
    expect(w.said().some(t => /Registry restored/.test(t))).toBe(false)
  })
})

describe('Python caches are disabled for every Bash call of the session', () => {
  test('the session environment gets PYTHONDONTWRITEBYTECODE and the pytest cache flag; commands are not rewritten', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect(w.envSet.PYTHONDONTWRITEBYTECODE).toBe('1')
    expect(w.envSet.PYTEST_ADDOPTS).toBe('-p no:cacheprovider')
    await call($, 'Bash', { command: 'pytest -q' })
    expect(w.bashCommands.at(-1)).toBe('pytest -q')
    w.agents.push({ id: 'plain-1', description: 'helper', type: 'general-purpose', status: 'running' })
    await call($, 'Bash', { command: 'python3 -m pytest', agentId: 'plain-1' })
    expect(w.bashCommands.at(-1)).toBe('python3 -m pytest')
  })

  test('an existing PYTEST_ADDOPTS is kept', async ($, on) => {
    const w = new World()
    w.envVars = { PYTEST_ADDOPTS: '-x' }
    install(on, w)
    await start($)
    expect(w.envSet.PYTEST_ADDOPTS).toBe('-x -p no:cacheprovider')
  })
})

describe('reconcile is limited to this session\'s jobs', () => {
  test('another live session\'s running job is left alone; this session\'s lost job becomes unknown', async ($, on) => {
    const w = new World()
    const base = { role: 'backend', phase: 'apply', objective: 'x', write_paths: ['src/core'], read_paths: [], criteria: ['AC-1'], acceptance: 'pending', host: 'claude-code', launch_confirmed: true, created_at: '2026-01-01T00:00:00Z' }
    w.jobs.push(
      { ...base, run_id: 'r1', task_id: 'core', attempt: 1, status: 'running', session_id: 'agent-elsewhere', parent_id: 'other-session' },
      { ...base, run_id: 'r2', task_id: 'ui', attempt: 1, status: 'running', session_id: 'agent-gone', parent_id: 'sess-1', write_paths: ['src/ui'] },
    )
    install(on, w)
    await start($)
    expect(w.latest('core')!.status).toBe('running')
    expect(w.latest('ui')!.status).toBe('unknown')
  })
})

import { verifyRebase } from '../../hooks/core/integrity.ts'

describe('plan-aware rebase (attempt 9)', () => {
  /** core and ui done and accepted; then the contract is revised: core changes, ui is removed. */
  async function revisedPlan($: any, w: World) {
    for (const task of ['core', 'ui']) {
      const agent = (await delegateAndLaunch($, w, task)).agent_id as string
      await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
      await call($, P + 'stip_contribution', { change_id: 'demo', task_id: task, decision: 'accepted', reason: 'checked the diff and tests' })
    }
    w.tasks = [{ ...w.tasks[0]!, objective: 'Build the core, revised' }, { ...w.tasks[2]!, depends_on: ['core'] }]
    w.changedTasks.add('core')
    revise(w)
  }

  test('a revision is flagged before approval, then the rebase retires removed tasks and reopens changed ones', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await revisedPlan($, w)
    let status = parse(await call($, P + 'stip_status'))
    expect(status.snapshot.registryCurrent).toBe(false)
    expect(status.snapshot.orphanTasks).toEqual(['ui'])
    expect(status.notes.join(' ')).toMatch(/no longer has: ui.*re-approves the current contract or presses Rebase registry/)
    const r = await approve($, D2)
    expect(r.text).toMatch(/0 kept; reopened core \(redelegate them\); retired ui \(no longer in the plan\)/)
    expect(w.toasts).toContain('Registry rebased · 1 task to redo')
    expect(w.retiredJobs.map(j => j.task_id)).toEqual(['ui'])
    status = parse(await call($, P + 'stip_status'))
    expect(status.snapshot).toMatchObject({ registryCurrent: true, orphanTasks: [] })
    expect(status.snapshot.lastRebase).toMatchObject({ kept: [], reopened: ['core'], retired: ['ui'], reason: 're-approved by the person' })
    expect(status.notes.join(' ')).toMatch(/reopened core .* must be redelegated/)
    // The rebase is the mod's own write: journaled, never restored.
    for (let i = 0; i < 3; i++) await clock.advance(10_000)
    expect(w.said().some(t => /Registry restored/.test(t))).toBe(false)
    expect(JSON.parse(w.files.get(`${ROOT}/.workflow/.runtime/demo/state.json`)!).retired_jobs).toHaveLength(1)
    // Redelegating the reopened task works and says why.
    const again = await delegateAndLaunch($, w, 'core')
    expect(again.status).toBe('running')
    expect(again.attempt).toBe(2)
    expect(again.note).toMatch(/reopened by the rebase/)
  })

  test('orphaned tasks alone make the registry stale; the pane rebase retires them and reports it', async ($, on) => {
    const w = new World()
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'ui')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
    w.tasks = w.tasks.filter(t => t.id !== 'ui').map(t => ({ ...t, depends_on: t.depends_on.filter(d => d !== 'ui') }))
    w.syncChange()
    const refused = await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' })
    expect(String(refused.deny)).toMatch(/Rebase registry in the \/stip pane/)
    await press($, 'refresh')
    expect((await press($, 'rebase'))!.value).toMatchObject({ needed: true, done: true, retired: ['ui'], reopened: [] })
    expect(w.toasts).toContain('Registry rebased')
    expect((await delegateAndLaunch($, w, 'core')).status).toBe('running')
  })

  test('verifyRebase accepts exactly the reported changes', () => {
    const job = (task: string, over: Record<string, unknown> = {}) => ({ task_id: task, attempt: 1, status: 'returned', acceptance: 'accepted', ...over })
    const known = { version: 1, change_id: 'demo', contract_digest: 'old', jobs: [job('core'), job('ui'), job('docs')] }
    const entry = { from: 'old', to: 'new', at: 't', reason: null, kept: ['docs'], reopened: ['core'], retired: ['ui'] }
    const report = { contract_digest: 'new', changed: true, rebase: entry, kept: ['docs'], reopened: ['core'], retired: ['ui'] }
    const good = {
      version: 1,
      change_id: 'demo',
      contract_digest: 'new',
      rebases: [entry],
      retired_jobs: [{ ...job('ui'), retired_reason: 'task removed from the revised contract', retired_at: 't' }],
      jobs: [job('core', { acceptance: 'rejected', review: { decision: 'rejected', reason: 'task changed in revised contract', at: 't' } }), job('docs')],
    }
    expect(verifyRebase(known as any, good as any, report)).toBe(true)
    // A kept task's acceptance cannot change with it, nor can a reopened task be accepted.
    expect(verifyRebase(known as any, { ...good, jobs: [good.jobs[0], job('docs', { acceptance: 'rejected' })] } as any, report)).toBe(false)
    expect(verifyRebase(known as any, { ...good, jobs: [job('core', { integrated: true }), job('docs')] } as any, report)).toBe(false)
    // The header must carry the reported entry and digest.
    expect(verifyRebase(known as any, { ...good, contract_digest: 'other' } as any, report)).toBe(false)
    expect(verifyRebase(known as any, { ...good, rebases: [] } as any, report)).toBe(false)
  })
})
