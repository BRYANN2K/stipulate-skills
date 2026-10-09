// Data the Stip Ledger interface draws from the snapshot alone (AC-27, AC-29), and the integrated paths
// of retired tasks (AC-34).
import { describe, expect, test } from 'claude-code/testing'

import { rebaseSummary } from '../../hooks/core/index.ts'
import { activityOf, graphOf } from '../../hooks/core/snapshot.ts'
import { TOASTS, TOAST_MAX, noticeText } from '../../hooks/core/notify.ts'
import { ROOT, World, delegateAndLaunch, install, interfaceOf, launch, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const status = async ($: any) => parse(await call($, P + 'stip_status'))
const returned = ($: any, agentId: string) =>
  $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId, reason: 'answer' } as never)
const configure = (w: World, defaults: Record<string, unknown>) =>
  w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults } } } }))

describe('Ledger data in the snapshot (AC-27, AC-29)', () => {
  test('each latest attempt carries its model, recorded effort and current activity', async ($, on) => {
    const w = new World()
    configure(w, { model: 'opus', effort: 'high' })
    install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    // Reserve recorded the resolved profile; the host reported the model it launched.
    expect(w.latest('core')!.profile).toMatchObject({ model: 'opus', effort: 'high' })
    await call($, 'Write', { file_path: `${ROOT}/src/core/README.md`, content: 'x', agentId: agent })
    let snap = (await status($)).snapshot
    const core = snap.tasks.find((t: any) => t.id === 'core').latest
    expect(core).toMatchObject({ model: 'claude-test', effort: 'high', activity: 'writing README.md', lastTool: 'Write' })
    expect(snap.workers[0]).toMatchObject({ taskId: 'core', effort: 'high', activity: 'writing README.md' })
    expect(snap.tasks.find((t: any) => t.id === 'verify').dependsOn).toEqual(['core', 'ui'])
    // Finished: no activity; model and effort stay.
    await returned($, agent)
    snap = (await status($)).snapshot
    expect(snap.tasks.find((t: any) => t.id === 'core').latest).toMatchObject({ model: 'claude-test', effort: 'high', activity: null })
  })

  test('the recorded profile model stands in until the host reports one; inherit is null', async ($, on) => {
    const w = new World()
    configure(w, { model: 'sonnet', effort: 'medium' })
    install(on, w)
    await start($)
    await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' })
    let latest = (await status($)).snapshot.tasks.find((t: any) => t.id === 'core').latest
    expect(latest).toMatchObject({ status: 'starting', model: 'sonnet', effort: 'medium', activity: 'starting' })
    w.latest('core')!.profile = { model: 'inherit', effort: 'inherit' }
    w.syncChange()
    latest = (await status($)).snapshot.tasks.find((t: any) => t.id === 'core').latest
    expect(latest).toMatchObject({ model: null, effort: 'inherit' })
  })

  test('helpers carry model, effort and activity too', async ($, on) => {
    const w = new World()
    configure(w, { model: 'haiku', effort: 'low' })
    install(on, w)
    await start($)
    const reply = parse(await call($, P + 'stip_research', { question: 'Where is the cache kept?', change_id: 'demo' }))
    let helper = (await status($)).snapshot.helpers[0]
    expect(helper).toMatchObject({ model: 'haiku', effort: 'low', activity: 'starting' })
    await launch($, reply)
    const agentId = w.agents.at(-1)!.id
    w.helpers[0]!.session_id = agentId
    w.helpers[0]!.status = 'running'
    w.syncChange()
    await call($, 'Read', { file_path: `${ROOT}/src/cache.ts`, agentId })
    helper = (await status($)).snapshot.helpers[0]
    expect(helper).toMatchObject({ status: 'running', activity: 'reading cache.ts' })
  })

  test('the graph gives each task a state and each dependency an edge', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    let graph = (await status($)).snapshot.graph
    expect(graph.nodes.map((n: any) => [n.id, n.state, n.depth])).toEqual([
      ['core', 'ready', 0],
      ['ui', 'ready', 0],
      ['verify', 'ready', 1],
    ])
    expect(graph.edges).toEqual([
      { from: 'core', to: 'verify', done: false },
      { from: 'ui', to: 'verify', done: false },
    ])
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    expect((await status($)).snapshot.graph.nodes[0]).toMatchObject({ id: 'core', state: 'running', attempt: 1 })
    await returned($, agent)
    expect((await status($)).snapshot.graph.nodes[0].state).toBe('pending')
    await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' })
    graph = (await status($)).snapshot.graph
    expect(graph.nodes[0].state).toBe('integrated')
    expect(graph.edges[0]).toEqual({ from: 'core', to: 'verify', done: true })
    // A correction of an accepted task shows as correction while it runs.
    await delegateAndLaunch($, w, 'core', { correction: true })
    expect((await status($)).snapshot.graph.nodes[0]).toMatchObject({ state: 'correction', attempt: 2 })
  })

  test('graphOf: states for every outcome; blocked without readiness', () => {
    const task = (id: string, latest: any, extra: Record<string, unknown> = {}) =>
      ({ id, role: 'r', phase: 'apply', objective: '', criteria: [], dependsOn: [], writePaths: [], ready: false, awaitingReview: false, awaitingIntegration: false, latest, ...extra }) as any
    const w = (over: Record<string, unknown>) => ({ attempt: 1, status: 'returned', acceptance: 'pending', isolated: false, integrated: false, ...over })
    const g = graphOf([
      task('a', null),
      task('b', w({ status: 'failed' }), { dependsOn: ['a'] }),
      task('c', w({ acceptance: 'rejected' }), { dependsOn: ['b'] }),
      task('d', w({ acceptance: 'accepted', isolated: true, integrated: false })),
      task('e', w({ status: 'cancelled' })),
    ])
    expect(g.nodes.map(n => [n.id, n.state, n.depth])).toEqual([
      ['a', 'blocked', 0],
      ['b', 'failed', 1],
      ['c', 'correction', 2],
      ['d', 'pending', 0],
      ['e', 'failed', 0],
    ])
  })

  test('activityOf: short phrases from tool calls', () => {
    expect(activityOf('Write', { file_path: '/p/docs/README.md' })).toBe('writing README.md')
    expect(activityOf('Edit', { file_path: 'src/app.ts' })).toBe('editing app.ts')
    expect(activityOf('Bash', { command: 'cd /p && PYTHONPATH=. python3 -m pytest -q' })).toBe('running pytest')
    expect(activityOf('Bash', { command: 'npm run test -- --watch' })).toBe('running npm test')
    expect(activityOf('Bash', { command: 'uv run pytest tests' })).toBe('running pytest')
    expect(activityOf('Bash', { command: 'python3 scripts/check.py' })).toBe('running check.py')
    expect(activityOf('Grep', { pattern: 'x' })).toBe('searching')
    expect(activityOf('mcp__server__lookup')).toBe('lookup')
    expect(activityOf('Write', { file_path: `/p/${'x'.repeat(80)}.md` }).length).toBeLessThanOrEqual(40)
  })
})

describe('retired tasks keep their integrated files (AC-34)', () => {
  test('the rebase reply, the snapshot and stip_status name the integrated paths that remain', async ($, on) => {
    const w = new World()
    configure(w, { max_workers: 3, max_shared_writers: 2 })
    const clock = install(on, w)
    const press = interfaceOf(on)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'ui')).agent_id as string
    expect(w.latest('ui')!.isolated).toBe(true)
    await returned($, agent)
    await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'ui', decision: 'accepted', reason: 'checked the diff and tests' })
    expect(w.latest('ui')!.integrated).toBe(true)
    // The revised plan drops ui; its integrated file stays in the main checkout.
    w.tasks = w.tasks.filter(t => t.id !== 'ui').map(t => ({ ...t, depends_on: t.depends_on.filter(d => d !== 'ui') }))
    w.syncChange()
    await press($, 'refresh')
    const value = (await press($, 'rebase'))!.value
    expect(value).toMatchObject({ done: true, retired: ['ui'], retiredIntegratedPaths: { ui: ['src/ui/a.ts'] } })
    expect(w.notices().some(n => /these files remain in the checkout .*ui: src\/ui\/a\.ts/.test(n))).toBe(true)
    const s = await status($)
    expect(s.snapshot.lastRebase).toMatchObject({ retired: ['ui'], retiredIntegratedPaths: { ui: ['src/ui/a.ts'] } })
    expect(s.notes.join(' ')).toMatch(/these files remain in the checkout .*ui: src\/ui\/a\.ts/)
    // The retired job's new field is part of what the rebase reports: no restore afterwards.
    for (let i = 0; i < 3; i++) await clock.advance(10_000)
    expect(w.said().some(t => /Registry restored/.test(t))).toBe(false)
    expect(w.retiredJobs[0]).toMatchObject({ task_id: 'ui', retired_integrated_paths: ['src/ui/a.ts'] })
  })

  test('rebaseSummary names them; nothing is said when no retired task had integrated work', () => {
    const base = { needed: true, done: true, kept: ['core'], reopened: [], retired: ['ui'] }
    expect(rebaseSummary({ ...base, retiredIntegratedPaths: { ui: ['src/ui/a.ts', 'src/ui/b.ts'] } })).toMatch(
      /retired ui \(no longer in the plan\)\. Already integrated by retired tasks, these files remain in the checkout \(keep, revert or reassign them\): ui: src\/ui\/a\.ts, src\/ui\/b\.ts\.$/,
    )
    expect(rebaseSummary({ ...base, retiredIntegratedPaths: { ui: [] } })).not.toMatch(/remain/)
  })
})

describe('core notices stay within the notify rules', () => {
  test('one "Stipulate:" prefix, collapsed whitespace, no repeat within the window; toasts fit', () => {
    expect(noticeText('stipulate: .workflow/x was   changed', false)).toBe('Stipulate: .workflow/x was changed')
    expect(noticeText('approval revoked', false)).toBe('Stipulate: approval revoked')
    expect(noticeText('approval revoked', true)).toBeNull()
    for (const t of [TOASTS.staleSetAside(), TOASTS.restoreStopped(), TOASTS.rebased(3), TOASTS.rebaseNeeded()]) {
      expect(t.length).toBeLessThanOrEqual(TOAST_MAX)
      expect(t).not.toMatch(/^stip/i)
    }
  })
})

describe('planned profiles and idle refresh (attempt 2)', () => {
  test('tasks not yet launched carry the profile a dispatch would use', async ($, on) => {
    const w = new World()
    w.files.set(
      `${ROOT}/.workflow/config.json`,
      JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { model: 'sonnet', effort: 'medium' }, roles: { verification: { model: 'opus', effort: 'high' } } } } } }),
    )
    install(on, w)
    await start($)
    const tasks = (await status($)).snapshot.tasks
    expect(tasks.find((t: any) => t.id === 'core').planned).toEqual({ model: 'sonnet', effort: 'medium', agent: null, isolate: false })
    expect(tasks.find((t: any) => t.id === 'verify').planned).toEqual({ model: 'opus', effort: 'high', agent: null, isolate: false })
    expect(tasks.find((t: any) => t.id === 'core').latest).toBeNull()
  })

  test('idle: another session\'s change is picked up within 15 s; nothing changed, no engine call', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await clock.advance(20_000)
    const before = w.calls.filter(c => c[0] === 'status').length
    for (let i = 0; i < 4; i++) await clock.advance(15_000)
    expect(w.calls.filter(c => c[0] === 'status').length).toBe(before)
    // Another session records evidence (no agent of this session is active).
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '- AC-1: passed — checked\n')
    await clock.advance(15_000)
    // The timer refreshed once (one engine status), with no tool call of this session.
    expect(w.calls.filter(c => c[0] === 'status').length).toBe(before + 1)
    await clock.advance(30_000)
    expect(w.calls.filter(c => c[0] === 'status').length).toBe(before + 1)
  })
})
