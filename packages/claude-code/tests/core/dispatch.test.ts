import { describe, expect, test } from 'claude-code/testing'

import { ROOT, World, delegateAndLaunch, install, launch, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const delegateCore = ($: any, w: World, extra: Record<string, unknown> = {}) => delegateAndLaunch($, w, 'core', extra)

describe('tools', () => {
  test('registers the seven tools in the prompt and the commands at session start', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect(w.registeredTools).toEqual(['stip_status', 'stip_research', 'stip_plan', 'stip_delegate', 'stip_interrupt', 'stip_contribution', 'stip_result'])
    expect(w.registeredCommands).toEqual(['stip-approve', 'stip-resync', 'stip-bind', 'stip-action', 'stip', 'stip-settings'])
    expect(w.registeredAgents.map(a => a.name)).toContain('backend')
    expect(w.registeredAgents.map(a => a.name)).toContain('helper-research')
  })

  test('every stip tool refuses a subagent caller (AC-6)', async ($, on) => {
    const w = new World()
    install(on, w)
    w.agents.push({ id: 'other-1', description: 'explore code', type: 'Explore', status: 'running' })
    await start($)
    for (const name of ['stip_status', 'stip_research', 'stip_plan', 'stip_delegate', 'stip_interrupt', 'stip_contribution', 'stip_result']) {
      const r = await call($, P + name, { change_id: 'demo', task_id: 'core', question: 'q', agentId: 'other-1' })
      expect(r.deny ?? r.text, name).toMatch(/coordinator guard/)
    }
    expect(w.engineCalls('reserve')).toHaveLength(0)
    // A subagent's ordinary tools are untouched.
    expect((await call($, 'Read', { file_path: `${ROOT}/x`, agentId: 'other-1' })).result).toBe('ran Read')
  })

  test('stip_status returns the bound change snapshot', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const out = parse(await call($, P + 'stip_status'))
    expect(out.bound).toBe('demo')
    expect(out.snapshot.phase).toBe('applying')
    expect(out.snapshot.tasks.map((t: any) => t.id)).toEqual(['core', 'ui', 'verify'])
    expect(out.snapshot.ready).toContain('core')
  })
})

describe('dispatch (AC-8)', () => {
  test('reserves, hands the coordinator a ticket, and its Agent call gets the brief and is confirmed', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const reply = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core', instructions: 'Mind the cache.' }))
    expect(reply.status).toBe('reserved')
    expect(reply.launch).toMatchObject({ tool: 'Agent', subagent_type: 'stipulate:backend', description: 'stip demo/core#1', run_in_background: true })
    expect(w.latest('core')!.status).toBe('starting')
    expect(w.spawned).toHaveLength(0)
    const reserve = w.engineCalls('reserve')[0]!
    expect(reserve[reserve.indexOf('--max-workers') + 1]).toBe('2')
    expect(reserve[reserve.indexOf('--parent') + 1]).toBe('sess-1')
    expect(reserve).not.toContain('--isolate')
    await launch($, reply)
    const spawn = w.spawned[0] as any
    expect(spawn.subagentType).toBe('stipulate:backend')
    expect(spawn.description).toBe('stip demo/core#1')
    // The brief replaces whatever the model passed.
    expect(spawn.prompt).not.toContain('placeholder from the model')
    expect(spawn.prompt).toContain('AC-1: The core works.')
    expect(spawn.prompt).toContain('src/core')
    expect(spawn.prompt).toContain('Mind the cache.')
    expect(spawn.prompt).toContain(`${ROOT}/.workflow/extensions/cli-tooling/apply.md`)
    const confirm = w.engineCalls('confirm')[0]!
    expect(confirm[confirm.indexOf('--session') + 1]).toBe('agent-1')
    expect(w.latest('core')!.status).toBe('running')
  })

  test('isolates writing tasks when parallel writers are configured and launches in the worktree', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    install(on, w)
    await start($)
    const out = await delegateCore($, w)
    expect(out.isolated).toBe(true)
    const reserve = w.engineCalls('reserve')[0]!
    expect(reserve).toContain('--isolate')
    expect(reserve[reserve.indexOf('--max-shared-writers') + 1]).toBe('2')
    expect((w.spawned[0] as any).cwd).toBe(`${ROOT}/.workflow/.runtime/demo/worktrees/core-1`)
  })

  test('a Stipulate worker cannot be launched without a ticket, nor a ticket twice', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect(((await $.agent.spawn({ prompt: 'x', description: 'anything', subagentType: 'stipulate:backend' } as never)) as any).deny).toMatch(/dispatch guard: .*ticket/)
    expect(((await $.agent.spawn({ prompt: 'x', description: 'stip demo/core#1', subagentType: 'general-purpose' } as never)) as any).deny).toMatch(/ticket/)
    const reply = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))
    await launch($, reply)
    expect(((await launch($, reply)) as any).deny).toMatch(/ticket/)
    expect(w.spawned).toHaveLength(1)
    // Ordinary agents are untouched.
    await $.agent.spawn({ prompt: 'x', description: 'explore', subagentType: 'Explore' } as never)
    expect(w.spawned).toHaveLength(2)
  })

  test('delegating a reserved, unlaunched task re-issues the same ticket', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const first = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))
    const again = parse(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))
    expect(again.launch.description).toBe(first.launch.description)
    expect(again.reissued).toBe(true)
    expect(w.engineCalls('reserve')).toHaveLength(1)
  })

  test('an uncertain launch stays unknown and is never launched twice', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.spawnMode = 'throw'
    const first = await delegateCore($, w)
    expect(first.launch_error).toBeDefined()
    expect(w.latest('core')!.status).toBe('unknown')
    w.spawnMode = 'ok'
    const second = await delegateCore($, w)
    expect(second.deny).toMatch(/active or unknown/)
    expect(w.spawned).toHaveLength(1)
  })

  test('a launch whose answer was lost is reconciled through the agent list', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.spawnMode = 'throw-started'
    expect((await delegateCore($, w)).status).toBe('unknown')
    await call($, P + 'stip_status')
    expect(w.latest('core')!.status).toBe('running')
    expect(w.latest('core')!.session_id).toBe('agent-1')
  })

  test('an unknown job is reconciled once its agent appears', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.spawnMode = 'unlisted'
    expect((await delegateCore($, w)).status).toBe('unknown')
    w.late.forEach(f => f())
    await call($, P + 'stip_status')
    expect(w.latest('core')!.status).toBe('running')
    expect(w.latest('core')!.session_id).toBe('agent-1')
  })

  test('a refused launch records a failed attempt', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.spawnMode = 'deny'
    expect((await delegateCore($, w)).status).toBe('failed')
  })

  test('the interface reserves and puts the launch instruction in the prompt box', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const r = await $.command.run({ command: 'stip-action', args: JSON.stringify({ action: 'delegate', change_id: 'demo', task_id: 'core' }), origin: { kind: 'plugin', name: 'stipulate' } } as never)
    expect(JSON.parse(r.text!).ok).toBe(true)
    expect(w.prompts.at(-1)).toContain('subagent_type "stipulate:backend" and description "stip demo/core#1"')
  })
})

describe('tracking (AC-9, AC-10)', () => {
  test('turn.complete settles returned with the captured answer, read back by stip_result', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateCore($, w)
    await $.turn.complete({ answer: 'Changed src/core/a.ts; tests pass.', durationMs: 10, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'answer' } as never)
    expect(w.latest('core')!.status).toBe('returned')
    const settle = w.engineCalls('settle').at(-1)!
    expect(settle).toContain('--result-file')
    const result = parse(await call($, P + 'stip_result', { change_id: 'demo', task_id: 'core' }))
    expect(result.result).toBe('Changed src/core/a.ts; tests pass.')
  })

  test('an API error ends the attempt as failed', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateCore($, w)
    await $.turn.complete({ answer: '', durationMs: 10, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'error' } as never)
    expect(w.latest('core')!.status).toBe('failed')
  })

  test('a permission ask marks the worker waiting, the call resuming marks it running', async ($, on) => {
    const w = new World()
    install(on, w)
    on('classic.PermissionRequest', () => ({}) as never)
    await start($)
    await delegateCore($, w)
    await ($ as any).classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'npm test' }, agent_id: 'agent-1' })
    expect(w.latest('core')!.status).toBe('waiting')
    await call($, 'Read', { file_path: `${ROOT}/src/core/a.ts`, agentId: 'agent-1' })
    expect(w.latest('core')!.status).toBe('running')
  })

  test('the last tool is recorded at most every 10 seconds per job', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateCore($, w)
    const before = w.engineCalls('settle').length
    await call($, 'Read', { file_path: `${ROOT}/src/core/a.ts`, agentId: 'agent-1' })
    await call($, 'Read', { file_path: `${ROOT}/src/core/b.ts`, agentId: 'agent-1' })
    await call($, 'Read', { file_path: `${ROOT}/src/core/c.ts`, agentId: 'agent-1' })
    expect(w.engineCalls('settle').length - before).toBe(1)
    expect(w.latest('core')!.last_tool).toBe('Read')
  })

  test('a correction reuses the task id with a new attempt in a distinct agent', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateCore($, w)
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'answer' } as never)
    await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'rejected', reason: 'missing the error path' })
    const out = (await delegateCore($, w, { correction: true }))
    expect(out.attempt).toBe(2)
    expect(out.agent_id).toBe('agent-2')
    expect(w.engineCalls('reserve').at(-1)).toContain('--correction')
    expect((w.spawned[1] as any).prompt).toContain('missing the error path')
  })

  test('research helpers reserve, spawn read-only and capture their answer', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const out = parse(await call($, P + 'stip_research', { question: 'Where is the cache?', change_id: 'demo' }))
    expect(out.status).toBe('reserved')
    await launch($, out)
    out.agent_id = w.agents[0]!.id
    expect(w.helpers[0]!.status).toBe('running')
    expect((w.spawned[0] as any).subagentType).toBe('stipulate:helper-research')
    const spec = w.registeredAgents.find(a => a.name === 'helper-research')!
    expect(spec.disallowedTools).toContain('Edit')
    await $.turn.complete({ answer: 'In src/cache.ts.', durationMs: 1, isAborted: false, turnId: 't', agentId: out.agent_id, reason: 'answer' } as never)
    const result = parse(await call($, P + 'stip_result', { helper_id: out.helper_id }))
    expect(result.result).toBe('In src/cache.ts.')
    // Helpers are read-only.
    const edit = await call($, 'Write', { file_path: `${ROOT}/src/x.ts`, content: 'x', agentId: out.agent_id })
    expect(edit.deny ?? edit.text).toMatch(/read-only helper/)
  })
})

describe('contribution and integration', () => {
  test('an accepted isolated attempt is integrated through the engine', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    install(on, w)
    await start($)
    await delegateCore($, w)
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'answer' } as never)
    const out = parse(await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' }))
    expect(out.acceptance).toBe('accepted')
    expect(out.integration.written).toEqual(['src/core/a.ts'])
    expect(w.engineCalls('integrate')).toHaveLength(1)
  })

  test('an integration conflict is reported with guidance and nothing else changes', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    w.integrateConflict = true
    install(on, w)
    await start($)
    await delegateCore($, w)
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'answer' } as never)
    const out = parse(await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' }))
    expect(out.integration.integrated).toBe(false)
    expect(out.integration.conflicts[0].path).toBe('src/core/a.ts')
    expect(out.integration.guidance).toMatch(/correction/)
    expect(w.latest('core')!.acceptance).toBe('accepted')
    expect(w.latest('core')!.integrated).toBe(false)
  })
})
