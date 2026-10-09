import { describe, expect, test } from 'claude-code/testing'

import { DIGEST, ROOT, World, delegateAndLaunch, install, interfaceOf, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const edit = (file_path: string, agentId?: string) => ({ file_path, old_string: 'a', new_string: 'b', ...(agentId ? { agentId } : {}) })
const denied = (r: any) => String(r.deny ?? (r.isError ? r.text : ''))
const isolatedConfig = JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } })

async function withWorker($: any, on: any, w: World) {
  install(on, w)
  await start($)
  return (await delegateAndLaunch($, w, 'core')).agent_id as string
}

describe('worker ownership (AC-11)', () => {
  test('edits inside write_paths pass, outside are denied with the reason', async ($, on) => {
    const w = new World()
    const agent = await withWorker($, on, w)
    expect((await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`, agent))).result).toBe('ran Edit')
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/src/ui/b.ts`, content: 'x', agentId: agent }))).toMatch(/ownership guard: src\/ui\/b.ts is outside the task write_paths/)
    expect(denied(await call($, 'Edit', edit(`${ROOT}/src/core-extra/a.ts`, agent)))).toMatch(/outside the task write_paths/)
    expect(denied(await call($, 'NotebookEdit', { notebook_path: `${ROOT}/nb.ipynb`, new_source: 'x', agentId: agent }))).toMatch(/ownership guard/)
    expect(denied(await call($, 'Edit', edit(`${ROOT}/src/core/../../README.md`, agent)))).toMatch(/README.md is outside/)
  })

  test('.workflow and .git are never writable by workers', async ($, on) => {
    const w = new World()
    const agent = await withWorker($, on, w)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.workflow/changes/demo/spec.md`, content: 'x', agentId: agent }))).toMatch(/managed workflow or git state/)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.git/config`, content: 'x', agentId: agent }))).toMatch(/managed workflow or git state/)
  })

  test('a symbolic link out of the owned folder is resolved and denied', async ($, on) => {
    const w = new World()
    w.links.set(`${ROOT}/src/core/escape`, '/etc')
    const agent = await withWorker($, on, w)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/src/core/escape/passwd`, content: 'x', agentId: agent }))).toMatch(/outside this worker's checkout/)
  })

  test('an isolated worker writes in its worktree only', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, isolatedConfig)
    w.files.set(`${ROOT}/.workflow/.runtime/demo/worktrees/core-1/README.md`, 'x')
    const agent = await withWorker($, on, w)
    const wt = `${ROOT}/.workflow/.runtime/demo/worktrees/core-1`
    expect((await call($, 'Write', { file_path: `${wt}/src/core/a.ts`, content: 'x', agentId: agent })).result).toBe('ran Write')
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/src/core/a.ts`, content: 'x', agentId: agent }))).toMatch(/outside this worker's checkout/)
    expect(denied(await call($, 'Write', { file_path: `${wt}/.workflow/x`, content: 'x', agentId: agent }))).toMatch(/managed workflow or git state/)
  })

  test('workers cannot run the engine, rewrite git, delegate or call stip tools', async ($, on) => {
    const w = new World()
    const agent = await withWorker($, on, w)
    const bash = (command: string) => call($, 'Bash', { command, agentId: agent })
    expect(denied(await bash('python3 scripts/workflow.py check demo --results r.json'))).toMatch(/lifecycle guard/)
    expect(denied(await bash('cd x && python3 /p/assets/workflow.py runtime settle demo'))).toMatch(/lifecycle guard/)
    expect(denied(await bash('git commit -am "x"'))).toMatch(/git commit/)
    expect(denied(await bash('git -C sub push origin main'))).toMatch(/git push/)
    expect(denied(await bash('git stash'))).toMatch(/git stash/)
    expect(denied(await bash('git worktree add ../x'))).toMatch(/git worktree/)
    expect((await bash('git status && npm test')).result).toBe('ran Bash')
    expect(denied(await call($, 'Agent', { description: 'x', prompt: 'y', agentId: agent }))).toMatch(/not available to workers/)
    expect(denied(await call($, P + 'stip_status', { agentId: agent }))).toMatch(/not available to workers/)
  })
})

describe('cancellation (AC-12)', () => {
  test('after stip_interrupt every tool call of the worker is denied and the job is cancelled', async ($, on) => {
    const w = new World()
    const agent = await withWorker($, on, w)
    const out = parse(await call($, P + 'stip_interrupt', { change_id: 'demo', task_id: 'core', reason: 'wrong approach' }))
    expect(out.cancelled).toBe(true)
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(w.sent).toHaveLength(1)
    expect(denied(await call($, 'Read', { file_path: `${ROOT}/src/core/a.ts`, agentId: agent }))).toMatch(/cancellation guard/)
    expect(denied(await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`, agent)))).toMatch(/cancellation guard/)
    // Its late answer does not resurrect the job.
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
    expect(w.latest('core')!.status).toBe('cancelled')
  })

  test('a cancellation recorded outside the mod (engine CLI) is enforced too', async ($, on) => {
    const w = new World()
    const agent = await withWorker($, on, w)
    w.latest('core')!.status = 'cancelled'
    w.syncChange()
    expect(denied(await call($, 'Read', { file_path: `${ROOT}/a`, agentId: agent }))).toMatch(/cancellation guard/)
  })
})

describe('apply gate (AC-13)', () => {
  test('block: an unapproved bound change denies source edits but not its own documents', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    install(on, w)
    await start($)
    expect(denied(await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`)))).toMatch(/apply gate guard: change demo is draft/)
    expect((await call($, 'Edit', edit(`${ROOT}/.workflow/changes/demo/spec.md`))).result).toBe('ran Edit')
    expect((await call($, 'Write', { file_path: '/tmp/scratch.txt', content: 'x' })).result).toBe('ran Write')
  })

  test('warn: the edit runs with a toast', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    w.files.set(`${ROOT}/.workflow/local.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { enforcement: { apply_gate: 'warn' } } } } }))
    install(on, w)
    await start($)
    expect((await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`))).result).toBe('ran Edit')
    expect(w.said().at(-1)).toMatch(/apply gate guard/)
  })

  test('off: edits are untouched', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { enforcement: { apply_gate: 'off' } } } } }))
    install(on, w)
    await start($)
    expect((await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`))).result).toBe('ran Edit')
    expect(w.toasts).toHaveLength(0)
  })

  test('an approved, applying change lets the coordinator edit', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect((await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`))).result).toBe('ran Edit')
  })
})

describe('approval (AC-14)', () => {
  test('the model cannot approve through Bash, a skill or by editing state', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    install(on, w)
    await start($)
    expect(denied(await call($, 'Bash', { command: 'python3 scripts/workflow.py approve demo --by user --ack-user-approval' }))).toMatch(/approval guard/)
    expect(denied(await call($, 'Bash', { command: 'python3 skills/x/scripts/workflow.py --root . approve demo --by me' }))).toMatch(/approval guard/)
    expect(denied(await call($, 'Skill', { skill: 'stip-approve', args: 'demo confirm ab12cd34ef56' }))).toMatch(/approval guard/)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.workflow/changes/demo/state.json`, content: '{}' }))).toMatch(/approval guard/)
    expect(denied(await call($, 'Edit', edit(`${ROOT}/.workflow/.runtime/demo/state.json`)))).toMatch(/approval guard/)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.workflow/.lock`, content: '' }))).toMatch(/approval guard/)
    expect(w.engineCalls('approve')).toHaveLength(0)
    expect(w.approvalCurrent).toBe(false)
  })

  test('/stip-approve shows the digest, then approves only on the typed confirmation', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    install(on, w)
    await start($)
    const shown = await $.command.run({ command: 'stip-approve', args: 'demo', origin: { kind: 'composer' } } as never)
    expect(shown.text).toContain(`Contract digest: ${DIGEST}`)
    expect(shown.text).toContain('/stip-approve demo confirm ab12cd34ef56')
    expect(w.engineCalls('approve')).toHaveLength(0)
    const wrong = await $.command.run({ command: 'stip-approve', args: 'demo confirm ffffffffffff', origin: { kind: 'composer' } } as never)
    expect(wrong.text).toMatch(/contract changed/)
    expect(w.engineCalls('approve')).toHaveLength(0)
    const done = await $.command.run({ command: 'stip-approve', args: 'demo confirm ab12cd34ef56', origin: { kind: 'composer' } } as never)
    expect(done.text).toMatch(/Approved demo/)
    const approve = w.engineCalls('approve')[0]!
    expect(approve).toEqual(['approve', 'demo', '--by', 'user', '--ack-user-approval'])
  })

  test('a confirmation that does not come from the person is refused', async ($, on) => {
    const w = new World()
    w.approvalCurrent = false
    install(on, w)
    await start($)
    const r = await $.command.run({ command: 'stip-approve', args: 'demo confirm ab12cd34ef56', origin: { kind: 'peer' } } as never)
    expect(r.text).toMatch(/typed by the person/)
    // The interface's own actions go through Stip's `request` state, which only Stip writes
    // (states.test.ts); the one typed action command, /stip-correct, is the person's too.
    const c = await $.command.run({ command: 'stip-correct', args: 'core redo it with the edge cases', origin: { kind: 'scheduled-trigger' } } as never)
    expect(c.text).toMatch(/typed by the person/)
    expect(w.engineCalls('approve')).toHaveLength(0)
    expect(w.engineCalls('review')).toHaveLength(0)
  })

  test('the interface approves through the request state with the digest it showed', async ($, on) => {
    const w = new World()
    w.approvalCurrent = false
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect((await press($, 'approve:ab12cd34ef56'))!.ok).toBe(true)
    expect(w.approvalCurrent).toBe(true)
  })
})

describe('fail closed (AC-15)', () => {
  test('a worker guard that throws denies the call and names the rule', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.throwOn.add('agent.list')
    expect(denied(await call($, 'Edit', edit(`${ROOT}/src/core/a.ts`, 'agent-x')))).toMatch(/stipulate: worker ownership\/lifecycle\/cancellation guard failed/)
  })

  test('a main-session guard that throws denies the call', async ($, on) => {
    const w = new World()
    w.phase = 'draft'
    w.approvalCurrent = false
    install(on, w)
    await start($)
    w.throwOn.add('session.cwd')
    expect(denied(await call($, 'Edit', edit('src/core/a.ts')))).toMatch(/stipulate: apply gate\/approval guard failed/)
  })
})

describe('/stip-correct (AC-39)', () => {
  const correct = ($: any, args: string, origin: Record<string, unknown> = { kind: 'composer' }) => $.command.run({ command: 'stip-correct', args, origin } as never)
  const returnedCore = async ($: any, w: World) => {
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
  }

  test('rejects the returned attempt with the person\'s reason and reserves its correction, in one plain line', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await returnedCore($, w)
    const r = await correct($, 'core Handle the empty cache case')
    expect(r.text).toMatch(/^Correction of core requested/)
    expect(() => JSON.parse(String(r.text))).toThrow()
    const review = w.engineCalls('review').at(-1)!
    expect(review[review.indexOf('--decision') + 1]).toBe('rejected')
    expect(review[review.indexOf('--reason') + 1]).toBe('Handle the empty cache case')
    expect(w.engineCalls('reserve').at(-1)).toContain('--correction')
    expect(w.prompts.at(-1)).toMatch(/^Launch the reserved Stipulate worker/)
  })

  test('a reason under 8 characters, or a task with nothing returned, is refused', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect((await correct($, 'core')).text).toMatch(/8\+ characters/)
    expect((await correct($, 'ui redo the layout please')).text).toMatch(/no returned attempt/)
    await returnedCore($, w)
    expect((await correct($, 'core short')).text).toMatch(/8\+ characters/)
    expect(w.engineCalls('review')).toHaveLength(0)
    expect(w.latest('core')!.attempt).toBe(1)
  })

  test('the model and other origins cannot request a correction', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await returnedCore($, w)
    expect(denied(await call($, 'Skill', { skill: 'stip-correct', args: 'core Handle the empty cache case' }))).toMatch(/approval guard/)
    for (const kind of ['scheduled-trigger', 'peer'])
      expect((await correct($, 'core Handle the empty cache case', { kind })).text).toMatch(/typed by the person/)
    expect((await correct($, 'core Handle the empty cache case', { kind: 'plugin', name: 'stipulate' })).text).toMatch(/typed by the person/)
    expect(w.engineCalls('review')).toHaveLength(0)
    expect(w.latest('core')!.attempt).toBe(1)
  })
})
