// Attempt 2: approval provenance (AC-14), ordinary subagents, worker Bash marking and backstop
// (AC-11), and the verifier's adversarial reproductions.
import { describe, expect, test } from 'claude-code/testing'
import type { Register } from 'claude-code'

import { applyGate, mainBash, normalizeCommand, workerBash } from '../../hooks/core/guards.ts'
import { DIGEST, ROOT, World, delegateAndLaunch, install, parse } from './harness.ts'

const P = 'mcp__stipulate__'

/**
 * An inline plugin that raises a tool call beneath the stipulate hook's own `$.fs.stat` call: the
 * host then skips stipulate's tool.call hook and asks its `.catch` instead (re-entry, `$` rejecting).
 * Self-contained (inline plugins run in their own environment); results go back through $.fs.write.
 */
const lender: Register = on => {
  on('fs.stat', async ($, e, next) => {
    const name = String(e.path).split('/').pop() ?? ''
    const calls: Record<string, Record<string, unknown>> = {
      __reenter_1: { tool: 'Write', file_path: '/proj/src/ui/x.ts', content: 'x', agentId: 'agent-1' },
      __reenter_2: { tool: 'Write', file_path: '/proj/src/core/x.ts', content: 'x', agentId: 'agent-1' },
      __reenter_3: { tool: 'Bash', command: 'python3 scripts/workflow.py runtime settle demo', agentId: 'agent-1' },
      __reenter_4: { tool: 'Bash', command: 'npm test', agentId: 'agent-1' },
      __reenter_5: { tool: 'Bash', command: 'python3 scripts/workflow.py approve demo --by user --ack-user-approval' },
      __reenter_6: { tool: 'Write', file_path: '/proj/.workflow/changes/demo/state.json', content: '{}' },
      __reenter_7: { tool: 'Read', file_path: '/proj/src/core/a.ts', agentId: 'agent-1' },
      __reenter_8: { tool: 'Edit', file_path: '/proj/src/core/a.ts', old_string: 'a', new_string: 'b' },
      __reenter_9: { tool: 'Read', file_path: '/proj/src/core/a.ts', agentId: 'agent-1' },
    }
    const call = calls[name]
    if (call) {
      const r = await $.tool.call(call as never).catch((err: Error) => ({ thrown: String(err?.message ?? err) }))
      await $.fs.write(`/proj/__result_${name.slice(10)}`, JSON.stringify(r))
    }
    return next(e)
  })
}
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const denied = (r: any) => String(r.deny ?? '')
const unapproved = (w: World) => {
  w.phase = 'draft'
  w.approvalCurrent = false
  w.approvedBy = null
}
/** What a model-run `approve` the filter could not read does to the world. */
const sneakApproval = (w: World) => () => {
  w.approvedAt = '2026-03-01T00:00:00+00:00'
  w.approvalCurrent = true
  w.phase = 'approved'
  w.approvedBy = 'user'
  w.syncChange()
}

describe('approval Bash filter obfuscations (verifier)', () => {
  const cases = [
    `python3 scripts/workflow.py 'approve' demo --by user --ack`,
    `python3 scripts/workflow.py "approve" demo --by user --ack-user-approval`,
    `A=approve; python3 scripts/workflow.py $A demo --by user --ack`,
    `python3 scripts/workflow.py approve demo --by user --ack`,
    `python3 scripts/../scripts/workflow.py approve demo --by user --ack`,
    `env python3 ./scripts/workflow.py approve demo --by=user --ack`,
    `cp scripts/workflow.py /tmp/w.py && python3 /tmp/w.py approve demo --by user --ack`,
    `python3 scripts/work''flow.py approve demo --by user --ack`,
    `python3 scripts/workflow.py ap\\prove demo --by user --a`,
    `python3 scripts/workflow.py $'\\x61pprove' demo --by user --a`,
    `python3 /tmp/w.py approve demo --by user --a`,
    `X=scripts/workflow.py; python3 $X status demo`,
    `eval "python3 scripts/workflow.py status demo"`,
    `python3 scripts/workflow.py $(echo approve) demo`,
    `env -u STIP_WORKER python3 scripts/workflow.py validate demo`,
  ]
  for (const c of cases)
    test(`main denies: ${c}`, () => {
      expect(mainBash(c)).not.toBeNull()
    })
  test('ordinary engine use and unrelated commands pass', () => {
    expect(mainBash('python3 scripts/workflow.py status demo --compact')).toBeNull()
    expect(mainBash('python3 scripts/workflow.py start demo')).toBeNull()
    expect(mainBash('pytest tests/test_approve.py -q')).toBeNull()
    expect(mainBash('git log --grep approve')).toBeNull()
  })
  test('normalisation reads quoting the way the shell does', () => {
    expect(normalizeCommand(`a'b'"c"\\d $'\\x65'`)).toBe('abcd e')
  })
})

describe('worker Bash filter obfuscations (verifier)', () => {
  const cases = [
    `python3 scripts/work''flow.py check demo --results r.json`,
    `cp scripts/workflow.py w.py; python3 w.py runtime settle demo --task core --attempt 1 --status returned`,
    `git -c core.editor=true commit -am x`,
    `git "commit" -am x`,
    `env -u STIP_WORKER python3 w.py runtime settle demo`,
    `unset STIP_WORKER; python3 w.py approve demo`,
    `env -i PATH=/usr/bin python3 w.py approve demo`,
    `STIP_WORKER= python3 w.py approve demo`,
    `git sw\\itch main`,
  ]
  for (const c of cases)
    test(`worker denies: ${c}`, () => {
      expect(workerBash(c)).not.toBeNull()
    })
})

describe('ordinary subagents follow the main-session rules', () => {
  test('cannot approve through Bash', async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    w.agents.push({ id: 'plain-1', description: 'helper', type: 'general-purpose', status: 'running' })
    const r = await call($, 'Bash', { command: 'python3 scripts/workflow.py approve demo --by user --ack-user-approval', agentId: 'plain-1' })
    expect(denied(r)).toMatch(/approval guard/)
  })
  test('cannot edit source while the change is unapproved (block)', async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    w.agents.push({ id: 'plain-2', description: 'helper', type: 'general-purpose', status: 'running' })
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/src/core/a.ts`, content: 'x', agentId: 'plain-2' }))).toMatch(/apply gate/)
  })
  test('cannot write engine or lifecycle state, whatever the case of the path', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    w.agents.push({ id: 'plain-3', description: 'helper', type: 'general-purpose', status: 'running' })
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.workflow/changes/demo/state.json`, content: '{}', agentId: 'plain-3' }))).toMatch(/lifecycle state/)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/.Workflow/changes/demo/state.json`, content: '{}' }))).toMatch(/lifecycle state/)
  })
  test('change documents are editable only for the bound change', () => {
    expect(applyGate({ rel: '.workflow/changes/other/spec.md', changeId: 'demo', phase: 'draft', approvalCurrent: false, mode: 'block' }).verdict).toBe('block')
  })
})

describe('approval provenance (AC-14 backstop)', () => {
  test('an approval the person did not give is revoked at session start', async ($, on) => {
    const w = new World()
    w.userDigest = null
    install(on, w)
    await start($)
    expect(w.revoked).toEqual(['demo'])
    const revoke = w.engineCalls('revoke-approval')[0]!
    expect(revoke).toContain('--force-phase')
    expect(revoke[revoke.indexOf('--reason') + 1]).toBe('approval not given by the user through Stip')
    expect(w.said().at(-1)).toMatch(/was not given by you/)
    expect(parse(await call($, P + 'stip_status')).snapshot.approval.current).toBe(false)
  })

  test('a re-approval of the same digest the person once approved is still not the person\'s', async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    w.bashEffect = sneakApproval(w)
    await call($, 'Bash', { command: 'python3 tools/innocent.py' })
    expect(w.revoked).toEqual(['demo'])
  })

  test('an approval recorded for another digest is not the person\'s', async ($, on) => {
    const w = new World()
    w.userDigest = 'f'.repeat(64)
    install(on, w)
    await start($)
    expect(w.revoked).toEqual(['demo'])
  })

  test('an approval that appears during any Bash call is revoked right after it', async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    w.bashEffect = sneakApproval(w)
    expect((await call($, 'Bash', { command: 'python3 tools/innocent.py' })).result).toBe('ran Bash')
    expect(w.revoked).toEqual(['demo'])
    expect(w.approvalCurrent).toBe(false)
    expect(denied(await call($, 'Edit', { file_path: `${ROOT}/src/core/a.ts`, old_string: 'a', new_string: 'b' }))).toMatch(/apply gate/)
  })

  test('an approval that cannot be revoked is treated as unapproved everywhere', async ($, on) => {
    const w = new World()
    w.userDigest = null
    w.failOn = 'revoke-approval'
    install(on, w)
    await start($)
    const status = parse(await call($, P + 'stip_status'))
    expect(status.snapshot.approval.current).toBe(false)
    expect(status.snapshot.approvalUnconfirmed).toBe(true)
    expect(denied(await call($, P + 'stip_delegate', { change_id: 'demo', task_id: 'core' }))).toMatch(/not given by the user through Stip/)
    expect(w.spawned).toHaveLength(0)
    expect(denied(await call($, 'Write', { file_path: `${ROOT}/src/core/a.ts`, content: 'x' }))).toMatch(/apply gate/)
  })

  test('the person\'s approval is recorded and then counts', async ($, on) => {
    const w = new World()
    unapproved(w)
    w.userDigest = null
    install(on, w)
    await start($)
    const done = await $.command.run({ command: 'stip-approve', args: `demo confirm ${DIGEST.slice(0, 12)}`, origin: { kind: 'composer' } } as never)
    expect(done.text).toMatch(/Approved demo/)
    await call($, 'Bash', { command: 'ls' })
    expect(w.revoked).toEqual([])
    expect(parse(await call($, P + 'stip_status')).snapshot.approval.current).toBe(true)
  })

  test('/stip-approve and the approve action refuse an approval that is already the person\'s', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const shown = await $.command.run({ command: 'stip-approve', args: 'demo', origin: { kind: 'composer' } } as never)
    expect(shown.text).toMatch(/already approved by you/)
    const confirmed = await $.command.run({ command: 'stip-approve', args: `demo confirm ${DIGEST.slice(0, 12)}`, origin: { kind: 'composer' } } as never)
    expect(confirmed.text).toMatch(/already approved by you/)
    const action = await $.command.run({ command: 'stip-action', args: JSON.stringify({ action: 'approve', change_id: 'demo', digest: DIGEST.slice(0, 12) }), origin: { kind: 'plugin', name: 'stipulate' } } as never)
    expect(JSON.parse(action.text!).ok).toBe(false)
    expect(w.engineCalls('approve')).toHaveLength(0)
    expect(w.engineCalls('validate')).toHaveLength(0)
  })
})

describe('worker Bash marking and backstop (AC-11)', () => {
  const delegate = async ($: any, w: World) => (await delegateAndLaunch($, w, 'core')).agent_id as string

  test('every worker command runs with STIP_WORKER and no Python caches', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const agent = await delegate($, w)
    await call($, 'Bash', { command: 'npm test', agentId: agent })
    expect(w.bashCommands.at(-1)).toBe(`export STIP_WORKER='core#1' PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS="-p no:cacheprovider"; npm test`)
    // The coordinator's commands are not rewritten.
    await call($, 'Bash', { command: 'git status' })
    expect(w.bashCommands.at(-1)).toBe('git status')
  })

  test('a worker that moves the main HEAD is cancelled and flagged', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const agent = await delegate($, w)
    w.bashEffect = () => {
      w.head = 'bbbbbbbbbbbb2222'
    }
    await call($, 'Bash', { command: 'make release', agentId: agent })
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(w.said().at(-1)).toMatch(/HEAD was not restored/)
    w.bashEffect = null
    expect(denied(await call($, 'Read', { file_path: `${ROOT}/src/core/a.ts`, agentId: agent }))).toMatch(/cancellation guard/)
  })

  test('a worker that changes lifecycle state is cancelled and an approval it made is revoked', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const agent = await delegate($, w)
    // Simulates an approval made under a spelling no filter reads, with the marker somehow shed.
    w.approvalCurrent = false
    w.approvedBy = null
    w.syncChange()
    w.bashEffect = sneakApproval(w)
    await call($, 'Bash', { command: './tool.sh', agentId: agent })
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(w.revoked).toEqual(['demo'])
  })
})

describe('integration and refresh', () => {
  test('a refusal made only of untracked strays says so and recommends a correction', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    w.integrateConflict = true
    w.untrackedConflicts = true
    install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: 'agent-1', reason: 'answer' } as never)
    const out = parse(await call($, P + 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' }))
    expect(out.integration.only_untracked).toBe(true)
    expect(out.integration.guidance).toMatch(/untracked file/)
    expect(out.integration.guidance).toMatch(/delete exactly those stray files/)
    expect(out.integration.guidance).toMatch(/Build artefacts .* are not conflicts: the engine skips them/)
  })

  test('a relative .workflow path triggers a refresh', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    const before = w.engineCalls('status').length
    await call($, 'Write', { file_path: '.workflow/changes/demo/notes.md', content: 'x' })
    expect(w.engineCalls('status').length).toBeGreaterThan(before)
    const after = w.engineCalls('status').length
    await call($, 'Write', { file_path: 'src/core/a.ts', content: 'x' })
    expect(w.engineCalls('status').length).toBe(after)
  })
})

describe('adoption on first activation (no baseline yet)', () => {
  test('approvals that predate the mod are adopted, not revoked', async ($, on) => {
    const w = new World()
    w.baselined = false
    w.userDigest = null
    install(on, w)
    await start($)
    expect(w.revoked).toEqual([])
    expect(w.approvalCurrent).toBe(true)
    const snap = parse(await call($, P + 'stip_status')).snapshot
    expect(snap.approval.current).toBe(true)
    expect(snap.approval.adopted).toBe(true)
    expect(snap.approvalUnconfirmed).toBe(false)
    expect((await call($, 'Edit', { file_path: `${ROOT}/src/core/a.ts`, old_string: 'a', new_string: 'b' })).result).toBe('ran Edit')
  })

  test('a model approval after the baseline is still revoked', async ($, on) => {
    const w = new World()
    w.baselined = false
    w.userDigest = null
    unapproved(w)
    install(on, w)
    await start($)
    w.bashEffect = sneakApproval(w)
    await call($, 'Bash', { command: 'python3 tools/innocent.py' })
    expect(w.revoked).toEqual(['demo'])
  })

  test('a second session start does not adopt an approval made in between', async ($, on) => {
    const w = new World()
    w.baselined = false
    w.userDigest = null
    unapproved(w)
    install(on, w)
    await start($)
    // Between sessions, something approves without the person (no tool call observed it).
    sneakApproval(w)()
    await start($)
    expect(w.revoked).toEqual(['demo'])
    expect(parse(await call($, P + 'stip_status')).snapshot.approval.adopted).toBe(false)
  })

  test('the person\'s own approval is not marked adopted', async ($, on) => {
    const w = new World()
    w.baselined = false
    w.userDigest = null
    unapproved(w)
    install(on, w)
    await start($)
    await $.command.run({ command: 'stip-approve', args: `demo confirm ${DIGEST.slice(0, 12)}`, origin: { kind: 'composer' } } as never)
    const snap = parse(await call($, P + 'stip_status')).snapshot
    expect(snap.approval.current).toBe(true)
    expect(snap.approval.adopted).toBe(false)
  })
})

describe('re-entry: the .catch decides from memory (AC-11, AC-15)', () => {
  test('worker and main-session calls raised beneath the plugin\'s own frame meet their guards', { plugins: [{ name: 'lender', register: lender }] }, async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const raise = async (n: number) => {
      await call($, 'Edit', { file_path: `${ROOT}/__reenter_${n}`, old_string: 'a', new_string: 'b' })
      return JSON.parse(w.files.get(`${ROOT}/__result_${n}`) ?? 'null')
    }
    expect(denied(await raise(1))).toMatch(/ownership guard: src\/ui\/x.ts is outside the task write_paths.*\[re-entry\]/)
    expect((await raise(2)).result).toBe('ran Write')
    expect(denied(await raise(3))).toMatch(/lifecycle guard.*\[re-entry\]/)
    expect((await raise(4)).result).toBe('ran Bash')
    expect(w.bashCommands.at(-1)).toBe('npm test') // the host runs re-entry calls as raised: the marker cannot be added here
    expect(denied(await raise(5))).toMatch(/approval guard.*\[re-entry\]/)
    expect(denied(await raise(6))).toMatch(/lifecycle state.*\[re-entry\]/)
    await call($, P + 'stip_interrupt', { change_id: 'demo', task_id: 'core' })
    expect(denied(await raise(7))).toMatch(/cancellation guard.*\[re-entry\]/)
  })

  test('the apply gate holds on the re-entry path', { plugins: [{ name: 'lender', register: lender }] }, async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    await call($, 'Edit', { file_path: `${ROOT}/.workflow/changes/demo/__reenter_8`, old_string: 'a', new_string: 'b' })
    expect(denied(JSON.parse(w.files.get(`${ROOT}/__result_8`)!))).toMatch(/apply gate guard.*\[re-entry\]/)
  })

  test('the 3-second timer flushes the last tool recorded on the re-entry path', { plugins: [{ name: 'lender', register: lender }] }, async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    await call($, 'Edit', { file_path: `${ROOT}/__reenter_9`, old_string: 'a', new_string: 'b' })
    expect(JSON.parse(w.files.get(`${ROOT}/__result_9`)!).result).toBe('ran Read')
    expect(w.latest('core')!.last_tool).toBeUndefined()
    await clock.advance(3_000)
    expect(w.latest('core')!.last_tool).toBe('Read')
  })
})

describe('integrity watch (AC-11, AC-14)', () => {
  test('a registry change made outside Stip while a worker runs is restored and the worker cancelled', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    const path = `${ROOT}/.workflow/.runtime/demo/state.json`
    const good = w.files.get(path)!
    // A script the worker ran (marker shed) marks its own job accepted.
    const forged = JSON.parse(good)
    forged.jobs[0].status = 'returned'
    forged.jobs[0].acceptance = 'accepted'
    w.files.set(path, JSON.stringify(forged))
    await clock.advance(3_000)
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(JSON.parse(w.files.get(path)!).jobs[0].acceptance).toBe('pending')
    expect(w.said().some(t => /was changed outside this Claude Code session; restored the last good state, cancelled core#1/.test(t))).toBe(true)
    expect(denied(await call($, 'Read', { file_path: `${ROOT}/a`, agentId: agent }))).toMatch(/cancellation guard/)
  })

  test('the coordinator\'s own engine commands through Bash are accepted', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    w.bashEffect = () => {
      w.phase = 'checked'
      w.syncChange()
    }
    await call($, 'Bash', { command: 'python3 scripts/workflow.py check demo --results r.json' })
    w.bashEffect = null
    await clock.advance(3_000)
    expect(w.latest('core')!.status).toBe('running')
    expect(JSON.parse(w.files.get(`${ROOT}/.workflow/changes/demo/state.json`)!).phase).toBe('checked')
  })

})

describe('approval record forgery (AC-14)', () => {
  test('a store record written outside this module is discarded and the approval revoked', async ($, on) => {
    const w = new World()
    unapproved(w)
    install(on, w)
    await start($)
    // Outside writer: approve through the engine and forge the matching store record.
    sneakApproval(w)()
    w.store.approvals = { [ROOT]: { demo: { digest: DIGEST, at: w.approvedAt, recordedAt: w.approvedAt } } }
    await call($, 'Bash', { command: 'ls' })
    expect(w.revoked).toEqual(['demo'])
    expect(w.said().some(t => /changed outside Stip and were discarded/.test(t))).toBe(true)
    expect(w.store.approvals[ROOT].demo).toBeUndefined()
  })

  test('commands touching the plugin store are refused', () => {
    expect(mainBash('python3 -c "import json" ~/.claude/plugins/store/stipulate_inline-c0ea.json')).not.toBeNull()
    expect(mainBash('cat ~/.claude/plugins/store/x.json')).not.toBeNull()
    expect(workerBash('sed -n 1p ~/.claude/plugins/store/stipulate_x.json')).not.toBeNull()
  })
})

describe('worker and main filter: adversarial cases (verifier, attempt 2)', () => {
  const main = [
    `python3 -c "import subprocess;subprocess.run(['python3','scripts/workflow.py','appr'+'ove','c1','--by','user','--a'+'ck'])"`,
    `python3 $(echo c2NyaXB0cy93b3JrZmxvdy5weQ== | base64 -d) $(echo YXBwcm92ZQ== | base64 -d) c1 --by user --ac`,
    `bash /tmp/approve.sh`,
    `python3 scripts/workflow.py appro\\\nve c1 --by user --ac`,
    `python3 scripts/workflow.py approv[e] c1 --by user --ac`,
    `python3 scripts/workflow.py approv? c1 --by user --ac`,
    `python3 scripts/workflow.py --root . approve c1 --by=user --a`,
  ]
  for (const c of main)
    test(`main denies: ${c}`, () => {
      expect(mainBash(c)).not.toBeNull()
    })
  const worker = [
    `python3 -c "import os;os.environ.pop('STIP'+'_WORKER');os.execvp('python3',['python3','scripts/work'+'flow.py','runtime','settle','c1'])"`,
    `python3 scripts/work?low.py runtime review c1 --task t --decision accepted --reason xxxxxxxxx`,
    `sh -c 'ST=STIP; unset \${ST}_WORKER; python3 scripts/workflow.py check c1 --results r'`,
    `git -c alias.x=commit x -am m`,
    `git -C . com\\mit -am m`,
    `cmd=commit; git $cmd -am m`,
  ]
  for (const c of worker)
    test(`worker denies: ${c}`, () => {
      expect(workerBash(c)).not.toBeNull()
    })
  test('ordinary globs and tests still pass', () => {
    expect(workerBash('ls src/*.ts && pytest tests/*.py -q')).toBeNull()
    expect(mainBash('ls *')).toBeNull()
  })
})

describe('integrity: known-good comes only from the mod\'s own engine calls (attempt 5)', () => {
  const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
  const LIFE = `${ROOT}/.workflow/changes/demo/state.json`
  /** What selfaccept5.py does: settle returned, review accepted (and optionally integrate). */
  const selfAccept = (w: World, integrated = false) => () => {
    const r = JSON.parse(w.files.get(REG)!)
    const job = r.jobs.find((j: any) => j.task_id === 'core')
    Object.assign(job, { status: 'returned', acceptance: 'accepted', review: { reason: 'self review by worker' } }, integrated ? { integrated: true } : {})
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
  }

  test('run6: a worker that self-accepts through a script is restored and cancelled, even after more worker calls', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    w.bashEffect = selfAccept(w)
    await call($, 'Bash', { command: 'python3 /tmp/selfaccept5.py', agentId: agent })
    w.bashEffect = null
    for (let i = 0; i < 3; i++) await call($, 'Bash', { command: 'sleep 2', agentId: agent })
    await clock.advance(3_000)
    const job = JSON.parse(w.files.get(REG)!).jobs[0]
    expect(job.acceptance).toBe('pending')
    expect(job.status).toBe('cancelled')
    expect(w.said().some(t => /demo\/state.json was changed outside this Claude Code session; restored.*\/stip-resync/.test(t))).toBe(true)
  })

  test('live run6: a status poll between the tampering and the tick does not spare the worker', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    w.bashEffect = selfAccept(w)
    await call($, 'Bash', { command: 'python3 /tmp/selfaccept5.py', agentId: agent })
    w.bashEffect = null
    // The coordinator polls: the refresh sees the tampered record (returned/accepted).
    expect(parse(await call($, P + 'stip_status', { change_id: 'demo' })).snapshot.tasks[0].latest.acceptance).toBe('accepted')
    await clock.advance(3_000)
    const job = JSON.parse(w.files.get(REG)!).jobs[0]
    expect(job.status).toBe('cancelled')
    expect(job.acceptance).toBe('pending')
    expect(w.said().some(t => /restored the last good state, cancelled core#1/.test(t))).toBe(true)
    expect(denied(await call($, 'Read', { file_path: `${ROOT}/a`, agentId: agent }))).toMatch(/cancellation guard/)
  })

  test('tampering is caught at once when the mod\'s own next engine call succeeds over it', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    // A forged second job appears; the worker's next call makes the mod settle its last tool.
    const r = JSON.parse(w.files.get(REG)!)
    r.jobs.push({ ...r.jobs[0], task_id: 'ui', attempt: 1, status: 'returned', acceptance: 'accepted', session_id: 'forged' })
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    await clock.advance(11_000)
    await call($, 'Read', { file_path: `${ROOT}/src/core/a.ts`, agentId: agent })
    const jobs = JSON.parse(w.files.get(REG)!).jobs
    expect(jobs.some((j: any) => j.task_id === 'ui')).toBe(false)
    expect(jobs[0].status).toBe('cancelled')
  })

  test('a worker that finished before the tick is still caught within the grace period', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    w.bashEffect = selfAccept(w)
    await call($, 'Bash', { command: './x.sh', agentId: agent })
    w.bashEffect = null
    // Its final answer arrives; settling over the tampered record is refused, nothing is adopted.
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
    await clock.advance(3_000)
    const job = JSON.parse(w.files.get(REG)!).jobs[0]
    expect(job.acceptance).toBe('pending')
    expect(w.said().some(t => /restored the last good state/.test(t))).toBe(true)
  })

  test('a claimed integration or changed owned files flag the attempt tampered; accepting warns; review clears it', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    w.gitDirty = ['src/core/a.ts']
    w.bashEffect = selfAccept(w, true)
    await call($, 'Bash', { command: './x.sh', agentId: agent })
    w.bashEffect = null
    await clock.advance(3_000)
    const snap = parse(await call($, P + 'stip_status')).snapshot
    expect(snap.tampered).toHaveLength(1)
    expect(snap.tampered[0]).toMatchObject({ taskId: 'core', attempt: 1, integratedClaim: true, paths: ['src/core/a.ts'] })
    expect(w.said().some(t => /Tampered: core#1; inspect git diff before accepting/.test(t))).toBe(true)
    expect(JSON.parse(w.files.get(REG)!).jobs[0].integrated).toBeUndefined()
    expect(w.files.has(`${ROOT}/src/core/a.ts`)).toBe(false) // source files are not touched by the restore
  })

  test('the coordinator cannot drive the registry through the engine CLI', () => {
    expect(mainBash('python3 scripts/workflow.py runtime review demo --task core --decision accepted --reason xxxxxxxx')).toMatch(/registry guard/)
    expect(mainBash('python3 scripts/workflow.py --root . runtime integrate demo --task core')).toMatch(/registry guard/)
    expect(mainBash('python3 scripts/workflow.py runtime show demo --task core')).toBeNull()
  })

  test('an illegal lifecycle move inside a coordinator Bash call is restored and the workers cancelled', async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const good = w.files.get(LIFE)!
    w.bashEffect = () => w.files.set(LIFE, JSON.stringify({ ...JSON.parse(good), phase: 'archived' }))
    await call($, 'Bash', { command: 'python3 tools/do-something.py' })
    w.bashEffect = null
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('applying')
    expect(w.latest('core')!.status).toBe('cancelled')
    expect(w.said().some(t => /illegal phase move applying -> archived/.test(t))).toBe(true)
  })

  test('a lifecycle change outside any coordinator call is restored at the next tick', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await delegateAndLaunch($, w, 'core')
    const good = w.files.get(LIFE)!
    w.files.set(LIFE, JSON.stringify({ ...JSON.parse(good), phase: 'checked' }))
    await clock.advance(3_000)
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('applying')
    expect(w.latest('core')!.status).toBe('cancelled')
  })

  test('idle, the watch still compares every 10 s (not every 3 s) and never re-baselines from disk', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    await clock.advance(10_000) // the first idle comparison sets the cadence
    const r = JSON.parse(w.files.get(REG)!)
    r.note = 'edited while idle'
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    await clock.advance(3_000)
    expect(JSON.parse(w.files.get(REG)!).note).toBe('edited while idle') // not yet: idle cadence
    await clock.advance(7_000)
    expect(JSON.parse(w.files.get(REG)!).note).toBeUndefined()
    expect(w.said().some(t => /outside this Claude Code session; restored/.test(t))).toBe(true)
  })
})

describe('session-long watch and /stip-resync (attempt 6)', () => {
  const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
  const LIFE = `${ROOT}/.workflow/changes/demo/state.json`
  const resync = ($: any, args = '') => $.command.run({ command: 'stip-resync', args, origin: { kind: 'composer' } } as never)

  test('R5: a delayed script that self-reviews and integrates after the worker ended (past the grace) is restored and flagged', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
    await clock.advance(80_000) // well past the 30 s grace
    w.gitDirty = ['src/core/a.ts']
    const r = JSON.parse(w.files.get(REG)!)
    Object.assign(r.jobs[0], { acceptance: 'accepted', review: { reason: 'self review by worker' }, integrated: true, worktree_removed: true })
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    await clock.advance(10_000)
    const job = JSON.parse(w.files.get(REG)!).jobs[0]
    expect(job.acceptance).toBe('pending')
    expect(job.integrated).toBeUndefined()
    const snap = parse(await call($, P + 'stip_status')).snapshot
    expect(snap.tampered[0]).toMatchObject({ taskId: 'core', integratedClaim: true, paths: ['src/core/a.ts'] })
    expect(w.said().some(t => /outside this Claude Code session.*Tampered: core#1/.test(t))).toBe(true)
  })

  test('/stip-resync shows what changed and adopts it only on the person\'s confirmation', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    // The person validates in another terminal (back to draft): restored by the watch.
    w.files.set(LIFE, JSON.stringify({ ...JSON.parse(w.files.get(LIFE)!), phase: 'draft' }))
    await clock.advance(10_000)
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('applying')
    expect(w.said().some(t => /run \/stip-resync/.test(t))).toBe(true)
    const shown = await resync($)
    expect(shown.text).toContain('.workflow/changes/demo/state.json')
    expect(shown.text).toContain('phase applying -> draft')
    expect(shown.text).toContain('/stip-resync confirm')
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('applying')
    const refused = await $.command.run({ command: 'stip-resync', args: 'confirm', origin: { kind: 'peer' } } as never)
    expect(refused.text).toMatch(/typed by the person/)
    const adopted = await resync($, 'confirm')
    expect(adopted.text).toMatch(/Adopted 1 file/)
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('draft')
    await clock.advance(10_000)
    expect(JSON.parse(w.files.get(LIFE)!).phase).toBe('draft')
    expect((await resync($)).text).toMatch(/Nothing to re-sync/)
  })

  test('the coordinator\'s archive (folder moved) is a legal move, not restored', async ($, on) => {
    const w = new World()
    w.phase = 'documented'
    install(on, w)
    await start($)
    w.bashEffect = () => {
      const st = JSON.parse(w.files.get(LIFE)!)
      w.files.delete(LIFE)
      w.files.set(`${ROOT}/.workflow/archive/demo/state.json`, JSON.stringify({ ...st, phase: 'archived' }))
    }
    await call($, 'Bash', { command: 'python3 scripts/workflow.py archive demo --message m' })
    expect(w.files.has(LIFE)).toBe(false)
    expect(w.said().some(t => /outside this Claude Code session/.test(t))).toBe(false)
  })
})
