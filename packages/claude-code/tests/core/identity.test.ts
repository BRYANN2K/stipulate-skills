// AC-32 (live incident, 2026-10-08 final run): sessions left from an earlier project at the same path
// wrote `.workflow/.runtime/<change>/` (an old registry and signed `stip-known*.json` journals) for a
// change id that a new session then re-created; the new session's watch restored the stale lifecycle
// over the new one in a loop ("Lifecycle restored ×33"). These tests reproduce it.
import { describe, expect, test } from 'claude-code/testing'

import {
  BURST_RESTORES,
  SAME_RESTORES,
  canon,
  freshLifecycle,
  hmac,
  lifecycleIdentity,
  parseRegistry,
  predates,
  registryPredates,
  owedWork,
  restoreGate,
  sha256Sync,
  staleWorktrees,
  type RestoreRecord,
} from '../../hooks/core/integrity.ts'
import { ROOT, World, delegateAndLaunch, install, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const LIFE = `${ROOT}/.workflow/changes/demo/state.json`
const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
const J_LIFE = `${ROOT}/.workflow/.runtime/demo/stip-known-lifecycle.json`
const J_REG = `${ROOT}/.workflow/.runtime/demo/stip-known.json`
const KEY = 'f'.repeat(64)
const OLD = '2026-10-08T14:10:00+00:00'
const NEW = '2026-10-08T15:55:00+00:00'
/** Created before the harness engine's job stamps (2026-01-01), so this lifecycle's own jobs are newer. */
const EARLY = '2025-12-01T00:00:00+00:00'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const restores = (w: World) => w.said().filter(t => /Lifecycle restored|Registry restored|restored the last good state|; restored/.test(t)).length

/** The earlier project's lifecycle of the same change id: approved and applying. */
const oldLifecycle = JSON.stringify({
  schema_version: 2,
  id: 'demo',
  created_at: OLD,
  phase: 'applying',
  approval: { contract_digest: 'e'.repeat(64), by: 'user', recorded_at: OLD },
})
/** The earlier project's worker registry: jobs created before the new lifecycle. */
const oldRegistry =
  JSON.stringify(
    {
      version: 1,
      change_id: 'demo',
      contract_digest: 'e'.repeat(64),
      jobs: [{ task_id: 'core', attempt: 1, status: 'returned', acceptance: 'accepted', created_at: '2026-10-08T14:20:00+00:00', host: 'claude-code', parent_id: 'zombie' }],
    },
    null,
    2,
  ) + '\n'

/** A journal entry as an earlier mod build wrote it (no identity), signed with the project's key. */
function legacyEntry(path: string, text: string, at = Date.parse(OLD) + 60_000): string {
  const sha = sha256Sync(path.includes('/.runtime/') ? canon(parseRegistry(text)) : text)
  const mac = hmac(new TextEncoder().encode(KEY), `${path}\n${sha}\n${at}`)
  return JSON.stringify({ text, sha, by: 'zombie-session', at, mac })
}

/** The zombie sessions' records for `demo`, as found in the fresh clone. */
function plantZombieRecords(w: World) {
  w.files.set(REG, oldRegistry)
  w.files.set(J_REG, legacyEntry(REG, oldRegistry))
  w.files.set(J_LIFE, legacyEntry(LIFE, oldLifecycle))
}

/** A new change just created by `workflow.py new`: exploring, never approved, created now. */
function freshWorld(): World {
  const w = new World()
  w.phase = 'exploring'
  w.approvalCurrent = false
  w.approvedBy = null
  w.userDigest = null
  w.lifecycleExtra = { created_at: NEW }
  w.store.journalKey = KEY
  return w
}

describe('stale records of an earlier lifecycle (AC-32)', () => {
  test('incident: zombie journals and registry for a re-created change are set aside once, never restored', async ($, on) => {
    const w = freshWorld()
    const clock = install(on, w)
    plantZombieRecords(w)
    const lifecycle = w.files.get(LIFE)!
    await start($)
    for (let i = 0; i < 12; i++) await clock.advance(3_000)
    // The new lifecycle stands; nothing was restored; the stale records were renamed aside.
    expect(w.files.get(LIFE)).toBe(lifecycle)
    expect(restores(w)).toBe(0)
    expect(w.toasts.filter(t => t === 'Stale Stip records set aside')).toHaveLength(1)
    expect(w.notices().filter(n => /set aside/.test(n))).toHaveLength(1)
    expect(w.notices().find(n => /set aside/.test(n))).toMatch(/^Stipulate: records of an earlier lifecycle of demo .*created 2026-10-08T15:55:00/)
    const aside = [...w.files.keys()].filter(k => /\.stale-\d{8}T\d{6}Z$/.test(k)).map(k => k.replace(/\.stale-.*$/, '')).sort()
    expect(aside).toEqual([REG, J_REG, J_LIFE].sort())
    // The registry is gone (set aside): the snapshot shows no attempt of the earlier project.
    const status = parse(await call($, P + 'stip_status'))
    expect(status.snapshot.tasks.every((t: any) => t.latest === null)).toBe(true)
    // The journal now holds this lifecycle, bound to its identity and this session.
    const j = JSON.parse(w.files.get(J_LIFE)!)
    expect(j).toMatchObject({ v: 2, identity: `demo@${NEW}`, by: 'sess-1' })
  })

  test('a change the coordinator re-creates during the session is bound to its new lifecycle', async ($, on) => {
    const w = freshWorld()
    w.hasChange = false
    const clock = install(on, w)
    plantZombieRecords(w)
    await start($)
    // The coordinator runs `workflow.py new demo`: the engine writes a fresh lifecycle.
    w.bashEffect = () => {
      w.hasChange = true
      w.files.set(LIFE, w.lifecycleText())
    }
    await call($, 'Bash', { command: 'python3 scripts/workflow.py new demo' })
    w.bashEffect = null
    const lifecycle = w.files.get(LIFE)!
    expect(JSON.parse(lifecycle).created_at).toBe(NEW)
    for (let i = 0; i < 12; i++) await clock.advance(3_000)
    expect(w.files.get(LIFE)).toBe(lifecycle)
    expect(restores(w)).toBe(0)
    expect(w.toasts.filter(t => t === 'Stale Stip records set aside')).toHaveLength(1)
    // A zombie that keeps writing journal entries of its own lifecycle is ignored, not restored from.
    w.files.set(J_LIFE, legacyEntry(LIFE, oldLifecycle, Date.parse(NEW) + 5_000))
    for (let i = 0; i < 4; i++) await clock.advance(3_000)
    expect(w.files.get(LIFE)).toBe(lifecycle)
    expect(restores(w)).toBe(0)
  })

  test('a newer lifecycle written under running workers is tampering: restored', async ($, on) => {
    const w = new World()
    w.lifecycleExtra = { created_at: EARLY }
    w.store.journalKey = KEY
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const good = w.files.get(LIFE)!
    // A worker's script "re-creates" the change to escape the registry: fresh-looking, but workers run.
    w.files.set(LIFE, JSON.stringify({ schema_version: 2, id: 'demo', created_at: NEW, phase: 'exploring' }))
    await clock.advance(3_000)
    await clock.advance(3_000)
    expect(w.files.get(LIFE)).toBe(good)
    expect(w.said().some(t => /Lifecycle restored/.test(t))).toBe(true)
    expect(w.files.has(`${REG}`)).toBe(true)
    expect([...w.files.keys()].some(k => k.includes('.stale-'))).toBe(false)
  })

  test('a newer lifecycle that is not fresh (approved) is tampering too, workers or not', async ($, on) => {
    const w = new World()
    w.lifecycleExtra = { created_at: EARLY }
    w.store.journalKey = KEY
    const clock = install(on, w)
    await start($)
    const good = w.files.get(LIFE)!
    w.files.set(LIFE, JSON.stringify({ ...JSON.parse(good), created_at: NEW }))
    await clock.advance(10_000)
    expect(w.files.get(LIFE)).toBe(good)
    expect([...w.files.keys()].some(k => k.includes('.stale-'))).toBe(false)
  })

  test('a lifecycle put back to an older one is restored to the newer journal entry', async ($, on) => {
    const w = freshWorld()
    const clock = install(on, w)
    await start($)
    await clock.advance(10_000)
    const good = w.files.get(LIFE)!
    w.files.set(LIFE, oldLifecycle)
    await clock.advance(10_000)
    expect(w.files.get(LIFE)).toBe(good)
  })
})

describe('restore loop guard (AC-32)', () => {
  test('the same outside content is restored at most twice, then held with one notice; dispatch pauses until /stip-resync', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const good = w.files.get(LIFE)!
    const theirs = JSON.stringify({ ...JSON.parse(good), note: 'written by another process' })
    let restored = 0
    for (let i = 0; i < 8; i++) {
      w.files.set(LIFE, theirs)
      await clock.advance(3_000)
      await clock.advance(3_000)
      if (w.files.get(LIFE) === good) restored++
    }
    expect(restored).toBe(SAME_RESTORES)
    expect(w.toasts.filter(t => t === 'Restore loop stopped · run /stip-resync')).toHaveLength(1)
    expect(w.notices().filter(n => /no longer restored/.test(n))).toHaveLength(1)
    const status = parse(await call($, P + 'stip_status'))
    expect(status.snapshot.restoreHeld).toEqual(['.workflow/changes/demo/state.json'])
    expect(status.notes.join(' ')).toMatch(/Dispatch is paused/)
    const refused = await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' })
    expect(String(refused.deny)).toMatch(/Dispatch is paused for demo.*\/stip-resync/)
    // The person reviews and adopts it: the hold ends and dispatch works again.
    const r = await $.command.run({ command: 'stip-resync', args: 'confirm', origin: { kind: 'composer' } } as never)
    expect(r.text).toMatch(/Adopted/)
    expect(parse(await call($, P + 'stip_status')).snapshot.restoreHeld).toEqual([])
    expect((await delegateAndLaunch($, w, 'core')).status).toBe('running')
  })

  test('restoreGate: same content twice, a burst of five, then held; one notice per hold', () => {
    let log: Record<string, RestoreRecord> = {}
    const step = (sha: string, now: number) => {
      const g = restoreGate(log, 'f', sha, now)
      log = g.log
      return g
    }
    expect(step('a', 0).allowed).toBe(true)
    expect(step('a', 1).allowed).toBe(true)
    const third = step('a', 2)
    expect(third).toMatchObject({ allowed: false, notify: true })
    expect(step('a', 3)).toMatchObject({ allowed: false, notify: false })
    // Alternating contents still stop at the burst limit.
    log = {}
    const seen = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((sha, i) => step(sha, i).allowed)
    expect(seen.filter(Boolean)).toHaveLength(BURST_RESTORES)
  })
})

describe('identity rules (pure)', () => {
  const current = { change: 'demo', created: NEW }
  test('records of an earlier lifecycle predate the current one', () => {
    expect(lifecycleIdentity(oldLifecycle)).toEqual({ change: 'demo', created: OLD })
    expect(predates({ change: 'demo', created: OLD }, null, current)).toBe(true)
    expect(predates({ change: 'demo', created: NEW }, null, current)).toBe(false)
    expect(predates({ change: 'other', created: NEW }, null, current)).toBe(true)
    // Without an identity, the time the entry was written decides.
    expect(predates(null, Date.parse(OLD), current)).toBe(true)
    expect(predates(null, Date.parse(NEW) + 1, current)).toBe(false)
    // A lifecycle without created_at (older engine) never makes anything stale.
    expect(predates({ change: 'demo', created: OLD }, 0, { change: 'demo', created: null })).toBe(false)
  })
  test('a registry with jobs older than the lifecycle is stale; a fresh lifecycle is exploring and unapproved', () => {
    expect(registryPredates(oldRegistry, current)).toBe(true)
    expect(registryPredates(oldRegistry.replace('2026-10-08T14:20:00+00:00', '2026-10-08T16:00:00+00:00'), current)).toBe(false)
    expect(freshLifecycle(JSON.stringify({ id: 'demo', phase: 'exploring' }))).toBe(true)
    expect(freshLifecycle(oldLifecycle)).toBe(false)
  })
})

describe('stale worktrees and owed work (AC-32, attempt 2)', () => {
  const WT = '.workflow/.runtime/demo/worktrees/core-1'

  test('the old lifecycle\'s worktrees are moved aside with the registry; a new isolated reserve succeeds', async ($, on) => {
    const w = freshWorld()
    w.phase = 'applying'
    w.approvalCurrent = true
    w.approvedBy = 'user'
    w.userDigest = 'ab12cd34ef56'.padEnd(64, '0')
    w.approvedAt = '2026-10-08T15:56:00+00:00'
    w.jobStamp = '2026-10-08T16:00:00+00:00'
    w.worktreeCheck = true
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    const clock = install(on, w)
    const reg = JSON.parse(oldRegistry)
    reg.jobs[0] = { ...reg.jobs[0], isolated: true, worktree: WT, integrated: false }
    // A worktree of another change id, and one the stale registry does not record, stay where they are.
    w.files.set(REG, JSON.stringify(reg, null, 2) + '\n')
    w.files.set(`${ROOT}/${WT}/src/core/a.ts`, 'old work')
    w.files.set(`${ROOT}/.workflow/.runtime/other/worktrees/core-1/x.ts`, 'other change')
    await start($)
    await clock.advance(3_000)
    expect(w.files.has(`${ROOT}/${WT}/src/core/a.ts`)).toBe(false)
    expect([...w.files.keys()].some(k => /worktrees\/core-1\.stale-[0-9TZ]+\/src\/core\/a\.ts$/.test(k))).toBe(true)
    expect(w.files.get(`${ROOT}/.workflow/.runtime/other/worktrees/core-1/x.ts`)).toBe('other change')
    expect(w.gitCalls).toContainEqual(['worktree', 'prune'])
    const notice = w.notices().find(n => /set aside/.test(n))!
    expect(notice).toMatch(/1 old worktree moved aside \(\.workflow\/\.runtime\/demo\/worktrees\/core-1\.stale-/)
    expect(notice).toMatch(/written by another session \(zombie/)
    // The next isolated reserve of the same task creates its own worktree.
    const out = await delegateAndLaunch($, w, 'core')
    expect(out.isolated).toBe(true)
    expect(out.status).toBe('running')
    for (let i = 0; i < 4; i++) await clock.advance(3_000)
    expect(w.files.has(REG)).toBe(true)
    expect(restores(w)).toBe(0)
  })

  test('a re-creation while this session\'s returned work awaits review is restored; /stip-resync confirms it', async ($, on) => {
    const w = new World()
    w.lifecycleExtra = { created_at: EARLY }
    w.store.journalKey = KEY
    const clock = install(on, w)
    await start($)
    const r = await delegateAndLaunch($, w, 'core')
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: r.agent_id, reason: 'answer' } as never)
    for (let i = 0; i < 3; i++) await clock.advance(3_000)
    const good = w.files.get(LIFE)!
    const recreated = JSON.stringify({ schema_version: 2, id: 'demo', created_at: NEW, phase: 'exploring' })
    w.files.set(LIFE, recreated)
    for (let i = 0; i < 4; i++) await clock.advance(3_000)
    // Not accepted silently: restored, the registry with the unreviewed job kept.
    expect(w.files.get(LIFE)).toBe(good)
    expect(w.said().some(t => /Lifecycle restored/.test(t))).toBe(true)
    expect(w.files.has(REG)).toBe(true)
    expect([...w.files.keys()].some(k => k.includes('.stale-'))).toBe(false)
    // The person confirms the re-creation: the old lifecycle's records go aside, the notice says whose.
    const plan = await $.command.run({ command: 'stip-resync', args: '', origin: { kind: 'composer' } } as never)
    expect(plan.text).toMatch(/changes\/demo\/state\.json/)
    await $.command.run({ command: 'stip-resync', args: 'confirm', origin: { kind: 'composer' } } as never)
    expect(w.files.get(LIFE)).toBe(recreated)
    for (let i = 0; i < 4; i++) await clock.advance(3_000)
    expect(w.files.get(LIFE)).toBe(recreated)
    expect(w.files.has(REG)).toBe(false)
    const notice = w.notices().find(n => /re-created/.test(n))!
    expect(notice).toMatch(/demo was re-created \(new lifecycle created 2026-10-08T15:55:00\+00:00\), as you confirmed; the records of its earlier lifecycle \(created 2025-12-01T00:00:00\+00:00\), written by this session, were set aside/)
  })

  test('a fresh re-creation with nothing owed is accepted, and the notice names this session', async ($, on) => {
    const w = new World()
    w.lifecycleExtra = { created_at: EARLY }
    w.store.journalKey = KEY
    const clock = install(on, w)
    await start($)
    const r = await delegateAndLaunch($, w, 'core')
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: r.agent_id, reason: 'answer' } as never)
    await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' })
    await clock.advance(10_000)
    const recreated = JSON.stringify({ schema_version: 2, id: 'demo', created_at: NEW, phase: 'exploring' })
    w.files.set(LIFE, recreated)
    for (let i = 0; i < 4; i++) await clock.advance(3_000)
    expect(w.files.get(LIFE)).toBe(recreated)
    expect(w.notices().find(n => /re-created/.test(n))).toMatch(/written by this session, were set aside/)
  })

  test('pure: owed work and stale worktrees', () => {
    const job = (over: Record<string, unknown>) => ({ task_id: 'core', attempt: 1, status: 'returned', acceptance: 'pending', parent_id: 'me', ...over })
    const reg = (jobs: unknown[]) => JSON.stringify({ version: 1, change_id: 'demo', jobs })
    expect(owedWork(reg([job({})]), 'me')).toEqual(['core#1'])
    expect(owedWork(reg([job({})]), 'someone-else')).toEqual([])
    expect(owedWork(reg([job({ status: 'running', parent_id: 'other' })]), 'me')).toEqual(['core#1'])
    expect(owedWork(reg([job({ acceptance: 'accepted', isolated: true, integrated: false })]), 'me')).toEqual(['core#1'])
    expect(owedWork(reg([job({ acceptance: 'accepted', isolated: true, integrated: true })]), 'me')).toEqual([])
    const current = { change: 'demo', created: NEW }
    const text = reg([
      job({ worktree: WT, created_at: OLD }),
      job({ task_id: 'ui', worktree: '.workflow/.runtime/demo/worktrees/ui-1', created_at: '2026-10-08T16:00:00+00:00' }),
      job({ task_id: 'x', worktree: '.workflow/.runtime/demo/worktrees/../../../../src', created_at: OLD }),
      job({ task_id: 'y', worktree: '.workflow/.runtime/demo/worktrees/y-1', worktree_removed: true, created_at: OLD }),
    ])
    expect(staleWorktrees(text, 'demo', current)).toEqual([WT])
  })
})
