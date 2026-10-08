// Attempt 7: no false positives after an interrupt, several Stip instances on one project (another
// session, a backgrounded one, a hot reload), and launches with the exact agent type.
import { describe, expect, test } from 'claude-code/testing'

import { ROOT, World, delegateAndLaunch, install, launch, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
const JOURNAL = `${ROOT}/.workflow/.runtime/demo/stip-known.json`
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const restored = (w: World) => w.said().some(t => /Registry restored|was changed outside this Claude Code session/.test(t))
const interrupt = ($: any, agentId: string) =>
  $.turn.complete({ answer: 'partial work', durationMs: 1, isAborted: true, turnId: 't', agentId, reason: 'aborted' } as never)

describe('interrupts and re-dispatch (live Nimbus regression)', () => {
  test('an interrupt is a cancellation with a reason; a new dispatch is neither restored nor cancelled', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const first = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await interrupt($, first)
    const job1 = w.latest('core')!
    expect(job1.status).toBe('cancelled')
    expect(job1.cancellation?.reason).toBe('interrupted in the session')
    expect(w.results.get('core#1')).toBe('partial work')
    await clock.advance(10_000)
    const second = await delegateAndLaunch($, w, 'core')
    expect(second.attempt).toBe(2)
    expect(second.agent_id).not.toBe(first)
    for (let i = 0; i < 4; i++) await clock.advance(10_000)
    expect(w.latest('core')!.status).toBe('running')
    expect(restored(w)).toBe(false)
  })

  test('a correction starts a new agent; the interrupted agent never inherits the new attempt', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const first = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: first, reason: 'answer' } as never)
    await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'rejected', reason: 'missing the error path' })
    // The engine copies the old agent id onto the reserved correction (as the real engine does).
    const reply = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core', correction: true }))
    w.latest('core')!.session_id = first
    w.syncChange()
    // The old agent wakes up before the new launch: it is not the new attempt's worker.
    const stray = await call($, 'Write', { file_path: `${ROOT}/src/core/a.ts`, content: 'x', agentId: first })
    expect(String(stray.deny ?? '')).toMatch(/cancellation guard|superseded/)
    await launch($, reply)
    const job = w.latest('core')!
    expect(job.attempt).toBe(2)
    expect(job.session_id).not.toBe(first)
    for (let i = 0; i < 4; i++) await clock.advance(10_000)
    expect(w.latest('core')!.status).toBe('running')
    expect(restored(w)).toBe(false)
  })
})

describe('several Stip instances on one project', () => {
  test('a write recorded in the shared journal by another instance is adopted, not restored', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    // State A (registry + its journal entry), then this instance moves on to state B.
    const regA = w.files.get(REG)!
    const journalA = w.files.get(JOURNAL)!
    await call($, P + 'stip_interrupt', { change_id: 'demo', task_id: 'core', reason: 'stop' })
    expect(w.files.get(JOURNAL)).not.toBe(journalA)
    // Another instance (another session, or this one after a hot reload) writes A with its journal entry.
    w.files.set(REG, regA)
    w.files.set(JOURNAL, journalA)
    await clock.advance(10_000)
    expect(w.files.get(REG)).toBe(regA)
    expect(restored(w)).toBe(false)
  })

  test('while another instance is writing, its window is not judged; afterwards tampering still is', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const r = JSON.parse(w.files.get(REG)!)
    r.jobs[0].acceptance = 'accepted'
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    w.files.set(`${ROOT}/.workflow/.runtime/stip-busy-other-session.json`, JSON.stringify({ by: 'other-session', until: 1_000_000 + 12_000 }))
    await clock.advance(3_000)
    expect(JSON.parse(w.files.get(REG)!).jobs[0].acceptance).toBe('accepted')
    await clock.advance(12_000)
    expect(JSON.parse(w.files.get(REG)!).jobs[0].acceptance).toBe('pending')
    expect(restored(w)).toBe(true)
  })

  test('a journal entry not signed with the project key is ignored (a forged known-good)', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const r = JSON.parse(w.files.get(REG)!)
    r.jobs[0].acceptance = 'accepted'
    const forged = JSON.stringify(r, null, 2) + '\n'
    w.files.set(REG, forged)
    const j = JSON.parse(w.files.get(JOURNAL)!)
    w.files.set(JOURNAL, JSON.stringify({ ...j, text: forged }))
    // Two ticks: one may fall while an own engine call is still in flight (skipped by design).
    await clock.advance(3_000)
    await clock.advance(3_000)
    expect(JSON.parse(w.files.get(REG)!).jobs[0].acceptance).toBe('pending')
  })
})

describe('launch with the ticket\'s exact agent type', () => {
  test('another subagent_type is refused with the type to use; the ticket stays valid', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const reply = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))
    const wrong = (await $.agent.spawn({ prompt: 'x', description: reply.launch.description, subagentType: 'general-purpose' } as never)) as any
    expect(wrong.deny).toMatch(/subagent_type "stipulate:backend"/)
    expect(w.spawned).toHaveLength(0)
    await launch($, reply)
    expect((w.spawned[0] as any).subagentType).toBe('stipulate:backend')
    expect(w.latest('core')!.status).toBe('running')
  })

  test('a launch the host ran as another type is cancelled at once', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const reply = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))
    w.typeOverride = 'general-purpose'
    await launch($, reply)
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(w.latest('core')!.cancellation?.reason).toMatch(/launched as general-purpose instead of stipulate:backend/)
  })
})
