// Interface tests (AC-16..AC-21) over the core's test world (tests/core/harness.ts).
import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { bandLine, bandSegments, compactWords, effortLabel, friendlyModel, meaningfulTool, modelEffort, planGroups, shortPath, decodeUi, encodeUi } from '../../hooks/ui/model.ts'
import { emptySnapshot } from '../../hooks/core/snapshot.ts'
import { ROOT, DIGEST, World, install, launch } from '../core/harness.ts'

const P = 'mcp__stipulate__'
const SURFACES = ['terminal', 'desktop'] as const
const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 110, scroll: { offset: 0, bodyRows: 5 }, view: {} }
const PANE_PROPS = { title: 'Stip', isFocused: true, bodyColumns: 105, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} }
const VIEWPORT = { columns: 200, rows: 50, isFullscreen: true }

type Seen = { status: (string | undefined)[]; opened: string[]; open: Map<string, string> }

/** The core's world plus what the interface calls beneath the plugin (status line, panes). */
function world(on: On, setup?: (w: World) => void): { w: World; seen: Seen; clock: ReturnType<typeof install> } {
  const w = new World()
  setup?.(w)
  const seen: Seen = { status: [], opened: [], open: new Map() }
  const clock = install(on, w)
  on('ui.status', ($, e) => (seen.status.push(e.text), { value: undefined }) as never)
  on('ui.open', ($, e) => (seen.opened.push(e.id), seen.open.set(e.id, e.title ?? e.id), { value: { isPlaced: true } }) as never)
  on('ui.close', ($, e) => (seen.open.delete(e.id), { value: undefined }) as never)
  on('ui.panes', () => ({ value: [...seen.open].map(([id, title]) => ({ id, title, isShown: true, isFocused: false, isPlaced: true })) }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('classic.PermissionRequest', () => ({}) as never)
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'You are Claude Code.', scope: 'shared' as const }] }))
  return { w, seen, clock }
}

const start = ($: any) => $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
const tool = ($: any, name: string, args: Record<string, unknown> = {}) => $.tool.call({ tool: P + name, ...args } as never)
const rowText = async (ui: any, id: string) => (await ui.find({ key: `row-${id}` }))?.text as string | undefined
const delegate = async ($: any, task: string) => launch($, JSON.parse(String((await tool($, 'stip_delegate', { change_id: 'demo', task_id: task })).result)))
const finish = ($: any, agentId: string, reason: 'answer' | 'error', answer = 'Done; tests pass.') =>
  $.turn.complete({ answer, durationMs: 5, isAborted: false, turnId: 't', agentId, reason } as never)
const command = ($: any, name: string) =>
  $.command.run({ command: name, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 200 } })
const unbind = (w: World) => {
  w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
  w.syncChange = () => {}
}
const band = ($: any, surface: (typeof SURFACES)[number]) =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'AbovePrompt', props: BAND_PROPS, viewport: VIEWPORT })
const SETTINGS = 'Stip · Settings'
const pane = ($: any, surface: string, view: 'plan' | 'settings' = 'plan', columns = PANE_PROPS.bodyColumns) =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'Pane', requestId: 'stipulate', props: { ...PANE_PROPS, bodyColumns: columns, title: view === 'settings' ? SETTINGS : 'Stip' }, viewport: VIEWPORT })
const short = (t: string) => t.length <= 60 && !/^stip(ulate)?:/i.test(t)

describe('band (AC-16)', () => {
  for (const surface of SURFACES)
    test(`draws nothing of its own when no change is bound (${surface})`, async ($, on) => {
    world(on, unbind)
    await start($)
    const ui = await band($, surface)
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeUndefined()
    expect(await ui.find({ key: 'band-text' })).toBeUndefined()
    await ui.unmount()
    })

  for (const surface of SURFACES)
    test(`shows awaiting approval; Approve sends the approve action with the shown digest (${surface})`, async ($, on) => {
    const { w } = world(on, w => {
      w.phase = 'draft'
      w.approvalCurrent = false
    })
    await start($)
    const ui = await band($, surface)
    const text = (await ui.find({ key: 'band-text' }))?.text ?? ''
    expect(text).toBe('◆ Stip  demo  Validate ▸ 0/3  ● awaiting approval')
    expect(await ui.find({ key: 'panel' })).toBeDefined()
    const before = w.engineCalls('approve').length
    await ui.press({ key: `approve:${DIGEST.slice(0, 12)}` })
    const call = w.engineCalls('approve').at(-1)!
    expect(w.engineCalls('approve').length).toBe(before + 1)
    expect(call).toContain('--by')
    expect(call[call.indexOf('--by') + 1]).toBe('user')
    expect(w.approvalCurrent).toBe(true)
    // Approved now: the button is gone and the band says so.
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeUndefined()
    expect((await ui.find({ key: 'band-text' }))?.text).toContain('✓ approved')
    await ui.unmount()
    })

  test('counts running workers and those to review; Panel toggles the pane; – collapses to the mark', async ($, on) => {
    const { seen } = world(on)
    await start($)
    await delegate($, 'core')
    await delegate($, 'ui')
    await finish($, 'agent-1', 'answer')
    const ui = await band($, 'terminal')
    const text = (await ui.find({ key: 'band-text' }))?.text ?? ''
    expect(text).toBe('◆ Stip  demo  Apply ▸ 0/3  ✓ approved  1 running  1 to review')
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeUndefined()
    expect((await ui.find({ key: 'panel' }))?.props.label).toBe('Panel')
    await ui.press({ key: 'panel' })
    expect(seen.open.get('stipulate')).toBe('Stip')
    await ui.redraw()
    expect((await ui.find({ key: 'panel' }))?.props.label).toBe('Panel ▾')
    expect((await ui.find({ key: 'panel' }))?.props.variant).toBe('primary')
    // Settings switches the same pane to its Settings tab; pressing the shown tab closes it.
    await ui.press({ key: 'settings' })
    expect(seen.open.get('stipulate')).toBe(SETTINGS)
    await ui.redraw()
    expect((await ui.find({ key: 'settings' }))?.props.label).toBe('Settings ▾')
    expect((await ui.find({ key: 'panel' }))?.props.label).toBe('Panel')
    await ui.press({ key: 'settings' })
    expect(seen.open.has('stipulate')).toBe(false)
    await ui.redraw()
    expect((await ui.find({ key: 'panel' }))?.props.label).toBe('Panel')
    await ui.press({ key: 'collapse' })
    expect((await ui.find({ key: 'band-text' }))?.text).toBe('◆ Stip')
    expect(await ui.find({ key: 'panel' })).toBeUndefined()
    await ui.press({ key: 'expand' })
    expect((await ui.find({ key: 'band-text' }))?.text).toContain('1 running')
    await ui.unmount()
  })

  test('yields to a survey', async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, hasSurvey: true }, viewport: VIEWPORT })
    expect(await ui.find({ key: 'band-text' })).toBeUndefined()
    await ui.unmount()
  })
})

describe('pane (AC-17)', () => {
  for (const surface of SURFACES)
    test(`/stip opens the pane; it shows stages, criteria, tasks and workers; Accept / Cancel / Delegate act (${surface})`, async ($, on) => {
    const { w, seen } = world(on)
    await start($)
    await delegate($, 'core')
    await delegate($, 'ui')
    await finish($, 'agent-1', 'answer')
    const ran = await command($, 'stip')
    expect(ran.text).toContain('opened')
    expect(seen.opened).toContain('stipulate')
    const ui = await pane($, surface)
    expect((await ui.find({ key: 'stages' }))?.text).toContain('▶ Apply')
    expect((await ui.find({ key: 'stages' }))?.text).toContain('✓ Validate')
    expect((await ui.find({ key: 'counts' }))?.text).toBe('1 running · 1 awaiting review · 1 ready')
    // Criteria collapsed to one line until shown.
    expect(await ui.find({ key: 'ac-AC-1' })).toBeUndefined()
    expect((await ui.find({ key: 'criteria' }))?.text).toContain('2 · 0 verified · 0 failed')
    await ui.press({ key: 'criteria-toggle' })
    expect((await ui.find({ key: 'ac-AC-1' }))?.text).toMatch(/^○ AC-1 The core works/)
    expect((await ui.find({ key: 'ac-AC-1' }))?.text).not.toContain('[')
    // One row per task: icon, id, model, duration, plain state; actions only where actionable.
    expect(await rowText(ui, 'core')).toMatch(/^◆ core\s+claude-test\s+0s\s+awaiting review$/)
    expect(await rowText(ui, 'ui')).toMatch(/^▶ ui\s+claude-test\s+0s\s+running$/)
    expect(await rowText(ui, 'verify')).toMatch(/^○ verify\s+ready$/)
    expect(await ui.find({ key: 'accept:ui' })).toBeUndefined()
    expect(await ui.find({ key: 'cancel:core' })).toBeUndefined()
    expect(await ui.find({ key: 'result:core' })).toBeDefined()
    expect(await ui.find({ key: 'correct:core' })).toBeDefined()
    expect(await ui.find({ key: 'cancel:ui' })).toBeDefined()
    expect(await ui.find({ key: 'delegate:verify' })).toBeDefined()
    expect(await ui.find({ key: 'h-workers' })).toBeUndefined()

    await ui.press({ key: 'accept:core' })
    const review = w.engineCalls('review').at(-1)!
    expect(review[review.indexOf('--decision') + 1]).toBe('accepted')
    expect(w.latest('core')!.acceptance).toBe('accepted')

    await ui.press({ key: 'cancel:ui' })
    expect(w.latest('ui')!.status).toBe('cancelled')

    await ui.press({ key: 'delegate:verify' })
    expect(w.engineCalls('reserve').some(c => c.includes('verify'))).toBe(true)

    expect(await rowText(ui, 'core')).toMatch(/^✓ core\s+claude-test\s+0s\s+accepted$/)
    expect(await rowText(ui, 'ui')).toMatch(/^! ui\s+claude-test\s+0s\s+cancelled$/)
    await ui.press({ key: 'details-core' })
    expect(await ui.find({ type: 'Text', text: /writes src\/core/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /covers AC-1 The core works/ })).toBeDefined()
    await ui.unmount()
    })

  test('Request correction takes a reason, rejects the attempt and starts a correction', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    const ui = await pane($, 'terminal')
    await ui.press({ key: 'correct:core' })
    await ui.input({ key: 'reason:core', text: 'Handle the empty cache case' })
    const review = w.engineCalls('review').at(-1)!
    expect(review[review.indexOf('--decision') + 1]).toBe('rejected')
    expect(review[review.indexOf('--reason') + 1]).toBe('Handle the empty cache case')
    const reserve = w.engineCalls('reserve').at(-1)!
    expect(reserve).toContain('--correction')
    expect(w.latest('core')!.attempt).toBe(2)
    await ui.unmount()
  })

  test('mobile has no Input: correction falls back to a fixed reason', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    const ui = await pane($, 'mobile')
    await ui.press({ key: 'correct:core' })
    expect(w.engineCalls('review').at(-1)).toContain('rejected')
    expect(w.latest('core')!.attempt).toBe(2)
    await ui.unmount()
  })

  test('View result appends the captured answer as a notice', async ($, on) => {
    world(on)
    const session = mock.session(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer', 'Changed src/core/a.ts.')
    const ui = await pane($, 'terminal')
    await ui.press({ key: 'result:core' })
    const notices = session.appended().filter(r => r.message.type === 'system')
    expect(JSON.stringify(notices.map(r => r.message.content))).toContain('Changed src/core/a.ts.')
    await ui.unmount()
  })
})

describe('status line and toasts (AC-18)', () => {
  test('status follows the snapshot; toasts on returned, failed, waiting and stale approval', async ($, on) => {
    const { w, seen } = world(on)
    await start($)
    expect(seen.status.at(-1)).toBe('demo · applying')
    await delegate($, 'core')
    expect(seen.status.at(-1)).toBe('demo · applying · 1 running')
    await delegate($, 'ui')
    await ($ as any).classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'npm test' }, agent_id: 'agent-2' })
    expect(w.toasts.some(t => /^ui#1 waiting on permission$/.test(t))).toBe(true)
    await finish($, 'agent-1', 'answer')
    expect(w.toasts.some(t => /^core returned · review it$/.test(t))).toBe(true)
    expect(seen.status.at(-1)).toContain('1 review')
    await finish($, 'agent-2', 'error')
    expect(w.toasts.some(t => /^ui failed/.test(t))).toBe(true)
    w.approvalCurrent = false
    await tool($, 'stip_status')
    expect(w.toasts.some(t => /^Approval of demo stale · contract changed$/.test(t))).toBe(true)
    expect(seen.status.at(-1)).toContain('approval stale')
    expect(w.toasts.every(short)).toBe(true)
  })

  test('the status line is cleared when nothing is bound', async ($, on) => {
    const { seen } = world(on, unbind)
    await start($)
    expect(seen.status.length).toBeGreaterThan(0)
    expect(seen.status.at(-1)).toBeUndefined()
  })
})

describe('context section (AC-19)', () => {
  const compose = ($: any) => $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })

  test('one session section, last, with change, phase, approval and ready tasks', async ($, on) => {
    world(on)
    await start($)
    const { sections } = await compose($)
    const last = sections.at(-1)!
    expect(sections.length).toBe(2)
    expect(last.id).toBe('stipulate:change')
    expect(last.scope).toBe('session')
    expect(last.text).toContain('`demo`')
    expect(last.text).toContain('phase applying')
    expect(last.text).toContain('approval approved')
    expect(last.text).toContain('Ready tasks: core, ui, verify')
    expect(last.text).toContain("Approval is the user's action")
    expect(last.text.length).toBeLessThan(600)
  })

  test('absent when nothing is bound', async ($, on) => {
    world(on, unbind)
    await start($)
    const { sections } = await compose($)
    expect(sections.map((s: { id: string }) => s.id)).toEqual(['base'])
  })
})

describe('settings tab (AC-20): who runs what', () => {
  const statusText = async (ui: any) => (await ui.find({ key: 'status' }))?.text ?? ''
  for (const surface of SURFACES)
    test(`a table of Defaults and roles; refuses invalid values, saves a valid profile (${surface})`, async ($, on) => {
      const { w, seen } = world(on)
      await start($)
      const ran = await command($, 'stip-settings')
      expect(ran.text).toContain('opened')
      expect(seen.open.get('stipulate')).toBe(SETTINGS)
      const ui = await pane($, surface, 'settings')
      expect((await ui.find({ key: 'scope:project' }))?.props.label).toBe('Project●')
      expect((await ui.find({ key: 'path' }))?.text).toBe('/proj/.workflow/config.json')
      for (const row of ['defaults', 'role:backend', 'role:frontend', 'role:verification', 'role:documentation', 'role:research'])
        expect(await ui.find({ key: `srow-${row}` }), row).toBeDefined()
      expect(await ui.find({ key: 'table-head' })).toBeDefined()
      const model = await ui.find({ key: 'm:role:backend' })
      expect((model?.props.options as { label: string }[])[0]!.label).toBe('inherit (inherited)')
      expect((model?.props.options as { label: string }[]).map(o => o.label)).toContain('Opus 5.5')
      expect(((await ui.find({ key: 'apply-gate' }))?.props.options as { label: string }[])[0]!.label).toBe('block (default)')

      // Parallel writers 3 > workers 2: refused before any save.
      for (let i = 0; i < 2; i++) await ui.press({ key: 'max_shared_writers-inc' })
      expect(await statusText(ui)).toMatch(/Not valid: max_shared_writers \(3\) cannot exceed max_workers \(2\)/)
      await ui.press({ key: 'settings-save' })
      expect(w.ran).not.toContain('save-settings')
      for (let i = 0; i < 2; i++) await ui.press({ key: 'max_shared_writers-dec' })

      // "Custom id…" opens a field; an invalid id is refused.
      await ui.select({ key: 'm:role:backend', value: '@custom' })
      await ui.input({ key: 'custom:role:backend', text: 'not a model!' })
      expect(await statusText(ui)).toMatch(/Not valid: .*model must be/)

      await ui.select({ key: 'm:role:backend', value: 'claude-sonnet-5-5' })
      await ui.select({ key: 'e:role:backend', value: 'high' })
      expect((await ui.find({ key: 'eff-backend/apply' }))?.text).toMatch(/backend\/apply\s*Sonnet 5\.5\s*◑ high/)
      expect(await statusText(ui)).toBe('Unsaved changes')
      await ui.press({ key: 'settings-save' })
      expect(w.ran).toContain('save-settings')
      const saved = JSON.parse(w.files.get(`${ROOT}/.workflow/config.json`)!)
      expect(saved.orchestration.clients['claude-code'].roles.backend).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' })
      expect(await statusText(ui)).toContain('Saved the project scope')
      expect((await ui.find({ key: 'running-note' }))?.text).toContain('changes apply to the next delegation.')
      await ui.unmount()
    })

  test('mobile cycles each cell with a button', async ($, on) => {
    const { w } = world(on)
    await start($)
    await command($, 'stip-settings')
    const ui = await pane($, 'mobile', 'settings')
    await ui.press({ key: 'm:role:backend' })
    await ui.press({ key: 'm:role:backend' })
    await ui.press({ key: 'settings-save' })
    const saved = JSON.parse(w.files.get(`${ROOT}/.workflow/config.json`)!)
    expect(saved.orchestration.clients['claude-code'].roles.backend).toEqual({ model: 'claude-opus-5-5' })
    await ui.unmount()
  })

  test('a narrow desktop pane shows one card per role, friendly names, wrapped lists; phase overrides are added', async ($, on) => {
    world(on)
    await start($)
    await command($, 'stip-settings')
    const ui = await pane($, 'desktop', 'settings', 45)
    expect(await ui.find({ key: 'table-head' })).toBeUndefined()
    expect((await ui.find({ key: 'sname-role:backend' }))?.text).toMatch(/^backend\s*in plan\s*all phases$/)
    await ui.select({ key: 'm:role:backend', value: 'claude-opus-5-5' })
    await ui.select({ key: 'e:role:backend', value: 'xhigh' })
    const eff = await ui.find({ key: 'eff-backend/apply' })
    expect(eff?.text).toMatch(/^backend\/apply\s*Opus 5\.5\s*◕ xhigh\s*shared$/)
    expect(eff?.props.flexWrap).toBe('wrap')
    const texts = (await ui.findAll({ type: 'Text' })).map((t: any) => t.text).join('\n')
    expect(texts).not.toContain('claude-opus-5-5')
    expect((await ui.find({ key: 'running-note' }))?.text).toContain('next delegation.')
    await ui.select({ key: 'add-role', value: 'backend' })
    await ui.select({ key: 'add-phase', value: 'check' })
    expect(await ui.find({ key: 'srow-pr:check:backend' })).toBeDefined()
    await ui.unmount()
  })
})

describe('approval provenance in the interface', () => {
  const bandText = async (ui: any) => (await ui.find({ key: 'band-text' }))?.text ?? ''

  test('an approval adopted at first activation reads "approved (adopted)" and offers no Approve', async ($, on) => {
    world(on, w => {
      w.baselined = false
      w.userDigest = null
    })
    await start($)
    const ui = await band($, 'terminal')
    expect(await bandText(ui)).toContain('approved (adopted)')
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeUndefined()
    await ui.unmount()
  })

  test('an approval the person did not give that cannot be revoked reads as not confirmed; Approve stays', async ($, on) => {
    world(on, w => {
      w.userDigest = null
      w.failOn = 'revoke-approval'
    })
    await start($)
    const b = await band($, 'desktop')
    expect(await bandText(b)).toContain('! approval revoked')
    expect(await b.find({ type: 'Button', text: /Approve/ })).toBeDefined()
    await b.unmount()
    const p = await pane($, 'terminal')
    expect((await p.find({ key: 'title' }))?.text).toContain('approval not confirmed by you — revoked')
    expect(await p.find({ key: 'unconfirmed' })).toBeDefined()
    await p.unmount()
  })

  test('after a revocation back to draft Approve is offered and the interface adds no second toast', async ($, on) => {
    const { w, seen } = world(on)
    await start($)
    // A re-approval the person did not give (a new engine approval record) appears during a Bash call.
    w.bashEffect = () => {
      w.approvedAt = '2026-03-01T00:00:00+00:00'
      w.approvalCurrent = true
      w.phase = 'approved'
      w.syncChange()
    }
    const before = w.toasts.length
    await $.tool.call({ tool: 'Bash', command: 'python3 tools/innocent.py' } as never)
    expect(w.revoked).toEqual(['demo'])
    const added = w.toasts.slice(before)
    expect(added.filter(t => /approval/i.test(t))).toHaveLength(1)
    expect(added[0]).toMatch(/not given by you/)
    expect(seen.status.at(-1)).toMatch(/approval revoked/)
    const ui = await band($, 'terminal')
    expect(await bandText(ui)).toContain('awaiting approval')
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeDefined()
    await ui.unmount()
  })
})

describe('integration feedback', () => {
  test('an accepted attempt refused for untracked strays says so with the guidance', async ($, on) => {
    const { w } = world(on, w => {
      w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    })
    const session = mock.session(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    w.integrateConflict = true
    w.untrackedConflicts = true
    const ui = await pane($, 'terminal')
    await ui.press({ key: 'accept:core' })
    expect(w.toasts.some(t => t === 'core accepted, not integrated · stray files')).toBe(true)
    expect(w.toasts.every(short)).toBe(true)
    const notice = JSON.stringify(session.appended().filter(r => r.message.type === 'system').map(r => r.message.content))
    expect(notice).toContain('only untracked stray files')
    expect(notice).toContain('delete exactly those stray files')
    await ui.unmount()
  })
})

describe('launch tickets', () => {
  test('Delegate fills the prompt, says so, and lists the attempt as ready to launch until launched', async ($, on) => {
    const { w } = world(on)
    await start($)
    const ui = await pane($, 'terminal')
    await ui.press({ key: 'delegate:core' })
    expect(w.prompts.at(-1)).toContain('stip demo/core#1')
    expect(w.toasts.some(t => t === 'core: launch in your prompt · press Enter')).toBe(true)
    expect(await rowText(ui, 'core')).toMatch(/^◇ core\s+ready to launch — press Enter in your prompt$/)
    const b = await band($, 'terminal')
    expect((await b.find({ key: 'band-text' }))?.text).toContain('1 ready to launch')
    await b.unmount()
    // Pressing again re-fills the prompt with the same ticket; nothing is reserved twice.
    const reserves = w.engineCalls('reserve').length
    await ui.press({ key: 'relaunch:core' })
    expect(w.engineCalls('reserve').length).toBe(reserves)
    expect(w.prompts.filter(p => p.includes('stip demo/core#1')).length).toBe(2)
    // Once the coordinator launches it, it is an ordinary running worker.
    await launch($, { launch: { subagent_type: 'stipulate:backend', description: 'stip demo/core#1' } })
    await tool($, 'stip_status')
    expect(await rowText(ui, 'core')).toMatch(/^▶ core\s+claude-test\s+0s\s+running$/)
    expect(await ui.find({ key: 'relaunch:core' })).toBeUndefined()
    await ui.unmount()
  })

  test('a worker cancelled by the integrity watch shows why', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'ui')
    Object.assign(w.latest('ui')!, { status: 'cancelled', error: 'Lifecycle or registry files changed outside Stip while this worker ran (.workflow/changes/demo/state.json); restored and cancelled.' })
    w.syncChange()
    await tool($, 'stip_status')
    const ui = await pane($, 'terminal')
    expect(await rowText(ui, 'ui')).toMatch(/^! ui\s+.*cancelled$/)
    await ui.press({ key: 'details-ui' })
    expect(await ui.find({ type: 'Text', text: /why: .*state\.json\); restored and cancelled/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\/stip-resync lists the differences/ })).toBeDefined()
    await ui.unmount()
  })
})

describe('tampered attempts', () => {
  test('flagged: marked with its paths, counted on the band; Accept takes a second explicit press and shows the warning', async ($, on) => {
    const { w, clock } = world(on)
    const session = mock.session(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    // Something outside Stip rewrites the returned attempt's record as accepted and integrated.
    const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
    w.gitDirty = ['src/core/a.ts']
    w.bashEffect = () => {
      const r = JSON.parse(w.files.get(REG)!)
      Object.assign(r.jobs.find((j: any) => j.task_id === 'core'), { acceptance: 'accepted', integrated: true, review: { reason: 'self review' } })
      w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    }
    await $.tool.call({ tool: 'Bash', command: './x.sh' } as never)
    w.bashEffect = null
    await clock.advance(3_000)
    await tool($, 'stip_status')
    const toasts = w.toasts.length

    const b = await band($, 'terminal')
    expect((await b.find({ key: 'band-text' }))?.text).toContain('1 tampered')
    await b.unmount()
    const ui = await pane($, 'terminal')
    expect(await rowText(ui, 'core')).toMatch(/^! core\s+.*tampered — inspect git diff$/)
    expect(await ui.find({ key: 'accept:core' })).toBeUndefined()

    const reviews = w.engineCalls('review').length
    await ui.press({ key: 'accept-check:core' })
    expect(w.engineCalls('review').length).toBe(reviews)
    expect(await ui.find({ type: 'Text', text: /paths: src\/core\/a\.ts/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\/stip-resync confirm adopts them/ })).toBeDefined()
    expect(w.toasts.slice(toasts).some(t => t === 'core flagged tampered · check git diff first')).toBe(true)

    await ui.press({ key: 'accept:core' })
    expect(w.engineCalls('review').length).toBe(reviews + 1)
    expect(w.toasts.some(t => t === 'core accepted · tamper warning (see notice)')).toBe(true)
    expect(w.toasts.every(short)).toBe(true)
    expect(JSON.stringify(session.appended().map(r => r.message.content))).toContain('accepted although flagged tampered')
    // Reviewed: the core cleared the flag.
    expect(await ui.find({ type: 'Text', text: /tampered/ })).toBeUndefined()
    await ui.unmount()
  })
})

describe('research helpers (live regression: a helper row crashed the pane)', () => {
  const withHelper = async ($: any) => {
    const r = JSON.parse(String((await tool($, 'stip_research', { question: 'Where is the cache?', change_id: 'demo' })).result))
    await launch($, r)
    await tool($, 'stip_status')
  }

  for (const surface of ['terminal', 'desktop', 'mobile'] as const)
    test(`the pane draws a running research helper (${surface})`, async ($, on) => {
      world(on)
      await start($)
      await withHelper($)
      const ui = await pane($, surface)
      expect((await ui.find({ key: 'h-helpers' }))?.text).toContain('Research helpers (1)')
      const row = (await ui.findAll({ type: 'Box' })).find((b: any) => String(b.key ?? '').startsWith('hrow-'))
      expect(row?.text).toMatch(/research · running · /)
      expect(row?.text).not.toContain('…')
      expect(await ui.find({ type: 'Button', text: /Cancel/ })).toBeDefined()
      await ui.unmount()
    })

  test('the band counts a running helper', async ($, on) => {
    world(on)
    await start($)
    await withHelper($)
    for (const surface of SURFACES) {
      const ui = await band($, surface)
      const text = (await ui.find({ key: 'band-text' }))?.text ?? ''
      expect(text).not.toContain('running')
      expect(text).toContain('1 helper')
      await ui.unmount()
    }
  })
})

describe('status line: revocation wording', () => {
  test('a change entering draft from exploration reads "awaiting approval", not "revoked"', async ($, on) => {
    const { w, seen } = world(on, w => {
      w.phase = 'exploring'
      w.approvalCurrent = false
      w.approvedBy = null
      w.userDigest = null
    })
    await start($)
    w.phase = 'draft'
    w.syncChange()
    await tool($, 'stip_status')
    expect(seen.status.at(-1)).toBe('demo · draft · awaiting approval')
    expect(seen.status.some(t => /revoked/.test(String(t)))).toBe(false)
  })
})

describe('pane layout (live review redesign)', () => {
  test('friendly model names', () => {
    expect(friendlyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(friendlyModel('claude-fable-5-1')).toBe('Fable 5.1')
    expect(friendlyModel('claude-haiku-5-5')).toBe('Haiku 5.5')
    expect(friendlyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
    expect(friendlyModel('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5')
    expect(friendlyModel('us.anthropic.claude-opus-5-5-v1:0')).toBe('Opus 5.5')
    expect(friendlyModel('opus')).toBe('Opus')
    expect(friendlyModel('inherit')).toBeNull()
    expect(friendlyModel(null)).toBeNull()
    expect(friendlyModel('some-very-long-custom-model-id')).toBe('some-very-l…')
  })

  test('internal tool names are never shown', () => {
    expect(meaningfulTool('SubagentHandback')).toBeNull()
    expect(meaningfulTool('StructuredOutput')).toBeNull()
    expect(meaningfulTool('mcp__stipulate__stip_status')).toBeNull()
    expect(meaningfulTool('mcp__github__create_issue')).toBe('create_issue')
    expect(meaningfulTool('Bash')).toBe('Bash')
  })

  test('the plan is in execution order, grouped by phase', () => {
    const task = (id: string, phase: string, dependsOn: string[] = []) =>
      ({ id, role: 'backend', phase, objective: '', criteria: [], dependsOn, writePaths: [], ready: false, awaitingReview: false, awaitingIntegration: false, latest: null })
    const groups = planGroups([task('docs', 'docs', ['verify']), task('verify', 'check', ['wire', 'api']), task('wire', 'apply', ['api']), task('api', 'apply')])
    expect(groups.map(g => g.title)).toEqual(['Apply', 'Check', 'Docs'])
    expect(groups[0]!.tasks.map(t => t.id)).toEqual(['api', 'wire'])
  })

  test('rows show the running tool but not internal ones; group headings; criteria results from evidence', async ($, on) => {
    const { w } = world(on)
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-1: passed — ok.\n- AC-2: failed — no.\n')
    await start($)
    await delegate($, 'core')
    await $.tool.call({ tool: 'Bash', command: 'npm test', agentId: 'agent-1' } as never)
    await tool($, 'stip_status')
    const ui = await pane($, 'terminal')
    expect(await rowText(ui, 'core')).toMatch(/running · Bash$/)
    expect((await ui.find({ key: 'group-apply' }))?.text).toMatch(/^Apply/)
    expect((await ui.find({ key: 'group-check' }))?.text).toMatch(/^Check/)
    expect((await ui.find({ key: 'criteria' }))?.text).toContain('2 · 1 verified · 1 failed')
    await ui.press({ key: 'criteria-toggle' })
    expect((await ui.find({ key: 'ac-AC-1' }))?.text).toMatch(/^✓ AC-1/)
    expect((await ui.find({ key: 'ac-AC-2' }))?.text).toMatch(/^✗ AC-2/)
    await $.tool.call({ tool: 'SubagentHandback', agentId: 'agent-1' } as never)
    await tool($, 'stip_status')
    expect(await rowText(ui, 'core')).toMatch(/running$/)
    expect(JSON.stringify(await ui.drawn())).not.toContain('SubagentHandback')
    await ui.unmount()
  })

  test('narrow and mobile panes put a row\'s buttons below it', async ($, on) => {
    world(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    for (const [surface, columns] of [['mobile', 60], ['terminal', 60]] as const) {
      const ui = await $.ui.mount({ plugin: 'stipulate', surface, component: 'Pane', requestId: 'stipulate', props: { ...PANE_PROPS, bodyColumns: columns }, viewport: VIEWPORT })
      expect(await rowText(ui, 'core')).toMatch(/^◆ core\s+claude-test\s+(0s\s+)?awaiting review$/)
      expect(await ui.find({ key: 'accept:core' })).toBeDefined()
      await ui.unmount()
    }
  })
})

describe('band layout (live review redesign)', () => {
  const mount = ($: any, columns: number) =>
    $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: columns }, viewport: VIEWPORT })
  const widthOf = async (ui: any) => {
    const tree = JSON.stringify(await ui.drawn())
    const text = (await ui.find({ key: 'band-text' }))?.text ?? ''
    const labels = (await ui.findAll({ type: 'Button' })).map((b: any) => String(b.props.label))
    return { text, total: text.length + labels.reduce((n: number, l: string) => n + l.length + 5, 0), tree }
  }

  for (const columns of [110, 80, 60])
    test(`never wider than the band and never cut mid-word (${columns} columns)`, async ($, on) => {
      world(on)
      await start($)
      await delegate($, 'core')
      await delegate($, 'ui')
      await finish($, 'agent-1', 'answer')
      const ui = await mount($, columns)
      const { text, total } = await widthOf(ui)
      expect(total).toBeLessThanOrEqual(columns)
      expect(text.startsWith('◆ Stip  demo')).toBe(true)
      expect(text).not.toMatch(/\w…$/)
      if (columns === 110) expect(text).toBe('◆ Stip  demo  Apply ▸ 0/3  ✓ approved  1 running  1 to review')
      if (columns === 60) expect(text).toMatch(/▶1  ◆1$/)
      await ui.unmount()
    })

  test('zero counts are hidden; a long change name is shortened with … only when it must be', async ($, on) => {
    world(on)
    await start($)
    const wide = await mount($, 110)
    expect((await wide.find({ key: 'band-text' }))?.text).toBe('◆ Stip  demo  Apply ▸ 0/3  ✓ approved')
    await wide.unmount()
  })

  test('a long change name is shortened with … only when nothing else is left to drop', () => {
    const base = emptySnapshot([], 0, 'presigned-uploads-quotas')
    const snap = {
      ...base,
      phase: 'applying' as const,
      approval: { current: true, digest: '38f287d1'.padEnd(64, '0'), by: 'user', adopted: false },
      tasks: Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, role: 'backend', phase: 'apply', objective: '', criteria: [], dependsOn: [], writePaths: [], ready: false, awaitingReview: false, awaitingIntegration: false, latest: null })),
      workers: [{ status: 'running' } as never],
      awaitingReview: ['t1'],
    }
    expect(bandLine(bandSegments(snap, 0, 90))).toBe('◆ Stip  presigned-uploads-quotas  Apply ▸ 0/5  ✓ approved  1 running  1 to review')
    expect(bandLine(bandSegments(snap, 0, 60))).toBe('◆ Stip  presigned-uploads-quotas  Apply  ✓ approved  ▶1  ◆1')
    const narrow = bandLine(bandSegments(snap, 0, 40))
    expect(narrow.length).toBeLessThanOrEqual(40)
    expect(narrow).toMatch(/^◆ Stip  presigned-u.*…/)
    expect(narrow).toMatch(/▶1  ◆1$/)
  })

  test('Approve is shown only while approvable', async ($, on) => {
    world(on, w => {
      w.phase = 'draft'
      w.approvalCurrent = false
    })
    await start($)
    const ui = await mount($, 70)
    expect(await ui.find({ type: 'Button', text: /Approve/ })).toBeDefined()
    expect((await ui.find({ key: 'settings' }))?.props.label).toBe('S')
    expect((await widthOf(ui)).total).toBeLessThanOrEqual(70)
    await ui.unmount()
  })
})

describe('attempt 9: live review items', () => {
  const SPEC = ['# Demo', '', '## Acceptance criteria', '', ...Array.from({ length: 10 }, (_, i) => `- AC-${i + 1}: Criterion number ${i + 1} holds.`), '- AC-11: The README documents:', '  - install', '  - use', ''].join('\n')
  const withSpec = (w: World) => {
    w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, SPEC)
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-10: passed — checked by verify.\n- AC-2: failed — missing case.\n')
  }

  test('effort indicators and model names', () => {
    expect(effortLabel('high')).toBe('◑ high')
    expect(effortLabel('low')).toBe('○ low')
    expect(effortLabel('inherit')).toBeNull()
    expect(modelEffort('claude-opus-5-5', 'xhigh')).toBe('Opus 5.5 ◕ xhigh')
    expect(modelEffort('claude-haiku-5-5', 'inherit')).toBe('Haiku 5.5')
    expect(shortPath('/Users/u/Documents/Projects/nimbus/.workflow/config.json', '/Users/u')).toBe('~/…/.workflow/config.json')
    expect(shortPath('/Users/u/.claude/stipulate.json', '/Users/u')).toBe('~/.claude/stipulate.json')
    expect(decodeUi(encodeUi({ task: 'core', criteria: true, criterion: 'AC-2', picker: false, helper: null, retired: false }))).toEqual({ task: 'core', criteria: true, criterion: 'AC-2', picker: false, helper: null, retired: false })
    expect(decodeUi('core').task).toBe('core')
  })

  for (const surface of SURFACES)
    test(`task rows show the recorded model and effort (${surface})`, async ($, on) => {
      world(on, w => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { roles: { backend: { model: 'claude-opus-5-5', effort: 'high' } } } } } })))
      await start($)
      await delegate($, 'core')
      const ui = await pane($, surface)
      expect(await rowText(ui, 'core')).toMatch(/^▶ core\s+claude-test\s+◑ high\s+0s\s+running$/)
      await ui.unmount()
    })

  for (const [surface, columns] of [['terminal', 105], ['desktop', 105], ['terminal', 70], ['desktop', 70]] as const)
    test(`criteria: one line each with aligned ids, openable, independent of task Details (${surface}, ${columns})`, async ($, on) => {
      world(on, withSpec)
      await start($)
      const ui = await pane($, surface, 'plan', columns)
      expect((await ui.find({ key: 'criteria' }))?.text).toContain('11 · 1 verified · 1 failed')
      await ui.press({ key: 'details-core' })
      await ui.press({ key: 'criteria-toggle' })
      expect(await ui.find({ key: 'details-box-core' })).toBeDefined()
      const one = await ui.find({ key: 'ac-AC-1' })
      const ten = await ui.find({ key: 'ac-AC-10' })
      expect(one?.text.startsWith('○ AC-1 ')).toBe(true)
      expect(ten?.text.startsWith('✓ AC-10 ')).toBe(true)
      expect((await ui.find({ key: 'ac-AC-2' }))?.text.startsWith('✗ AC-2 ')).toBe(true)
      const idWidth = (b: any) => (b.children[1] as { props: { width: number } }).props.width
      expect(idWidth(one)).toBe(idWidth(ten))
      expect(await ui.find({ key: 'ac-full-AC-11' })).toBeUndefined()
      await ui.press({ key: 'open-AC-11' })
      const full = await ui.find({ key: 'ac-full-AC-11' })
      expect(full?.text).toContain('The README documents:')
      expect(full?.text).toContain('- install')
      expect(full?.text).toContain('not checked yet')
      await ui.press({ key: 'open-AC-10' })
      expect((await ui.find({ key: 'ac-full-AC-10' }))?.text).toContain('passed: checked by verify.')
      await ui.unmount()
    })

  test('the change picker lists in-flight changes first and binds the one chosen', async ($, on) => {
    const { w } = world(on, w => {
      w.files.set(`${ROOT}/.workflow/changes/other/state.json`, JSON.stringify({ schema_version: 2, id: 'other', phase: 'draft' }))
      w.files.set(`${ROOT}/.workflow/changes/other/proposal.md`, '# Other things\n')
    })
    await start($)
    await tool($, 'stip_status', { change_id: 'demo' })
    await delegate($, 'core')
    const ui = await pane($, 'terminal')
    expect((await ui.find({ key: 'picker' }))?.props.label).toBe('demo ▾')
    await ui.press({ key: 'picker' })
    const listed = (await ui.findAll({ type: 'Button' })).map((b: any) => String(b.key)).filter((k: string) => k.startsWith('bind:'))
    expect(listed).toEqual(['bind:demo', 'bind:other'])
    expect((await ui.find({ key: 'pick-demo' }))?.text).toMatch(/1 running/)
    await ui.press({ key: 'bind:other' })
    expect(w.calls.some(c => c[0] === 'status' && c[1] === 'other')).toBe(true)
    expect(await ui.find({ key: 'pick-demo' })).toBeUndefined()
    await ui.unmount()
  })

  test('the pane tab header switches between Plan and Settings and closes on the shown tab', async ($, on) => {
    const { seen } = world(on)
    await start($)
    await command($, 'stip')
    const plan = await pane($, 'terminal')
    expect((await plan.find({ key: 'tab-plan' }))?.props.label).toBe('Plan ▾')
    await plan.press({ key: 'tab-settings' })
    expect(seen.open.get('stipulate')).toBe(SETTINGS)
    await plan.unmount()
    const settings = await pane($, 'terminal', 'settings')
    expect((await settings.find({ key: 'tab-settings' }))?.props.label).toBe('Settings ▾')
    await settings.press({ key: 'tab-plan' })
    expect(seen.open.get('stipulate')).toBe('Stip')
    await settings.press({ key: 'tab-settings' })
    expect(seen.open.has('stipulate')).toBe(false)
    await settings.unmount()
  })

  test('band at 140 columns with nothing running still draws every button', async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: 140 }, viewport: VIEWPORT })
    expect((await ui.find({ key: 'band-text' }))?.text).toBe('◆ Stip  demo  Apply ▸ 0/3  ✓ approved')
    for (const key of ['panel', 'settings', 'collapse']) expect(await ui.find({ key }), key).toBeDefined()
    const textBox = await ui.find({ key: 'band-text' })
    expect(textBox?.props.flexShrink).toBe(1)
    expect(textBox?.props.width).toBeUndefined()
    await ui.unmount()
  })

  test('desktop, docked narrow: actions stay on the row, columns are fixed-width boxes, stages wrap, helper titles whole', async ($, on) => {
    world(on)
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    const r = JSON.parse(String((await tool($, 'stip_research', { question: 'How do presigned URLs expire across the storage and CLI layers?', change_id: 'demo' })).result))
    await launch($, r)
    await tool($, 'stip_status')
    for (const columns of [45, 105]) {
      const ui = await pane($, 'desktop', 'plan', columns)
      const task = await ui.find({ key: 'task-core' })
      const line = task?.children[0] as { props: { flexDirection: string }; children: { props: { key?: string } }[] }
      expect(line.props.flexDirection).toBe('row')
      expect(await ui.find({ key: 'details-core' })).toBeDefined()
      expect((await ui.find({ key: 'details-core' }))?.props.label).toBe('›')
      const row = await ui.find({ key: 'row-core' })
      expect(row?.text).not.toMatch(/ {2}/)
      const widths = (b: any) => (b.children as any[]).slice(0, 2).map(c => c.props.width)
      expect(widths(row)).toEqual(widths(await ui.find({ key: 'row-ui' })))
      expect((await ui.find({ key: 'stages' }))?.props.flexWrap).toBe('wrap')
      const helperRow = (await ui.findAll({ type: 'Box' })).find((b: any) => String(b.key ?? '').startsWith('hrow-'))
      expect(helperRow?.text).not.toContain('…')
      await ui.unmount()
    }
  })

  for (const [surface, columns] of [['terminal', 70], ['desktop', 70], ['mobile', 40]] as const)
    test(`plan and settings render at narrow widths (${surface}, ${columns})`, async ($, on) => {
      world(on)
      await start($)
      await delegate($, 'core')
      const p = await pane($, surface, 'plan', columns)
      expect(await rowText(p, 'core')).toMatch(/^▶ core/)
      await p.unmount()
      const s = await pane($, surface, 'settings', columns)
      expect(await s.find({ key: 'srow-role:backend' })).toBeDefined()
      expect(await s.find({ key: 'table-head' })).toBeUndefined()
      await s.unmount()
    })
})

describe('attempt 10: compact terminal pane under 60 columns', () => {
  test('state words are whole, or abbreviated, never cut', () => {
    expect(compactWords('integrated', 20)).toBe('integrated')
    expect(compactWords('integrated', 6)).toBe('done')
    expect(compactWords('cancelled · attempt 2', 12)).toBe('cancelled')
    expect(compactWords('cancelled · attempt 2', 8)).toBe('cancel.')
    expect(compactWords('awaiting review', 10)).toBe('review')
    expect(compactWords('ready to launch — press Enter in your prompt', 12)).toBe('launch')
    expect(compactWords('running · Bash', 14)).toBe('running · Bash')
    expect(compactWords('running · Bash', 9)).toBe('running')
  })

  for (const columns of [50, 40])
    test(`one short row per task, › on the row, actions only on actionable rows (terminal, ${columns})`, async ($, on) => {
      world(on, w => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { model: 'claude-opus-5-5', effort: 'high' } } } } })))
      await start($)
      await delegate($, 'core')
      await delegate($, 'ui')
      await finish($, 'agent-1', 'answer')
      const r = JSON.parse(String((await tool($, 'stip_research', { question: 'How do Amazon S3 SigV4 presigned URLs expire?', change_id: 'demo' })).result))
      await launch($, r)
      await tool($, 'stip_status')
      const ui = await pane($, 'terminal', 'plan', columns)
      const core = (await rowText(ui, 'core'))!
      expect(core).toMatch(/^◆ core\s+claude-test\s+◑\s+(awaiting review|review)$/)
      expect(core).not.toContain('…')
      expect(core).not.toContain('0s')
      expect(core).not.toContain('high')
      const line = (await ui.find({ key: 'task-core' }))!.children[0] as { props: { flexDirection: string } }
      expect(line.props.flexDirection).toBe('row')
      expect((await ui.find({ key: 'details-core' }))?.props.label).toBe('›')
      expect(await ui.find({ key: 'accept:core' })).toBeDefined()
      expect(await ui.find({ key: 'cancel:ui' })).toBeDefined()
      expect(await ui.find({ key: 'rb-verify' })).toBeDefined()
      expect(await ui.find({ type: 'Button', text: /^Details$/ })).toBeUndefined()
      // Helper: two clean lines; model and effort in its Details.
      const hrow = (await ui.findAll({ type: 'Box' })).find((b: any) => String(b.key ?? '').startsWith('hrow-'))
      expect(hrow?.text).toMatch(/^▶ research · running · 0s$/)
      const title = (await ui.findAll({ type: 'Box' })).find((b: any) => String(b.key ?? '').startsWith('htitle-'))
      expect(title?.text.length).toBeGreaterThan(3)
      expect((await ui.find({ key: 'picker' }))?.props.label).toBe('demo ▾')
      await ui.unmount()
    })

  test('the band keeps Settings as [ S ] and shortens "approved (adopted)" when narrow', async ($, on) => {
    world(on, w => {
      w.baselined = false
      w.userDigest = null
    })
    await start($)
    const wide = await band($, 'terminal')
    expect((await wide.find({ key: 'band-text' }))?.text).toContain('✓ approved (adopted)')
    await wide.unmount()
    for (const columns of [70, 50]) {
      const ui = await $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: columns }, viewport: VIEWPORT })
      expect((await ui.find({ key: 'settings' }))?.props.label).toBe('S')
      expect((await ui.find({ key: 'band-text' }))?.text).not.toContain('(adopted)')
      await ui.unmount()
    }
  })

  test('wide terminal and desktop layouts are unchanged', async ($, on) => {
    world(on)
    await start($)
    await delegate($, 'core')
    const wide = await pane($, 'terminal')
    expect(await rowText(wide, 'core')).toMatch(/^▶ core\s+claude-test\s+0s\s+running$/)
    expect((await wide.find({ key: 'details-core' }))?.props.label).toBe('Details')
    await wide.unmount()
    const desk = await pane($, 'desktop', 'plan', 50)
    expect((await desk.find({ key: 'details-core' }))?.props.label).toBe('›')
    await desk.unmount()
  })
})

describe('attempt 11: registry rebase', () => {
  for (const [surface, columns] of [['terminal', 105], ['terminal', 50], ['desktop', 105]] as const)
    test(`an outdated registry shows a row with Rebase; pressing rebases it (${surface}, ${columns})`, async ($, on) => {
      const { w, seen } = world(on, w => (w.registryDigest = 'f'.repeat(64)))
      await start($)
      expect(seen.status.every(t => t === undefined || !/^stip:/.test(t))).toBe(true)
      const ui = await pane($, surface, 'plan', columns)
      const row = await ui.find({ key: 'rebase-row' })
      expect(row?.text).toContain(columns < 70 ? '! Registry outdated' : '! Registry tied to the previous contract')
      const b = await band($, 'terminal')
      expect((await b.find({ key: 'band-text' }))?.text).toContain('! rebase needed')
      await b.unmount()
      await ui.press({ key: 'rebase' })
      expect(w.rebases).toHaveLength(1)
      expect(w.toasts.at(-1)).toBe('Registry rebased')
      expect(await ui.find({ key: 'rebase-row' })).toBeUndefined()
      await ui.unmount()
    })

  test('a refused rebase says so in a short toast and keeps the row', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'core')
    w.registryDigest = 'f'.repeat(64)
    w.syncChange()
    await tool($, 'stip_status')
    const ui = await pane($, 'terminal')
    await ui.press({ key: 'rebase' })
    expect(w.rebases).toHaveLength(0)
    expect(w.toasts.at(-1)).toMatch(/^Rebase refused · /)
    expect(w.toasts.at(-1)!.length).toBeLessThanOrEqual(60)
    expect(await ui.find({ key: 'rebase-row' })).toBeDefined()
    await ui.unmount()
  })
})

describe('attempt 12: plan changes and rebase outcome', () => {
  const revise = async ($: any, w: World) => {
    await delegate($, 'core')
    await finish($, 'agent-1', 'answer')
    await tool($, 'stip_contribution', { change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'Checked the core work.' })
    await delegate($, 'ui')
    await finish($, 'agent-2', 'answer')
    // The revised contract drops `ui` and changes `core`.
    w.tasks = w.tasks.filter(t => t.id !== 'ui')
    w.changedTasks.add('core')
    w.syncChange()
    await tool($, 'stip_status')
  }

  for (const [surface, columns] of [['terminal', 105], ['terminal', 50], ['desktop', 105]] as const)
    test(`removed tasks are named in the registry row; after the rebase, redo and retired rows (${surface}, ${columns})`, async ($, on) => {
      const { w } = world(on)
      await start($)
      await revise($, w)
      const ui = await pane($, surface, 'plan', columns)
      expect((await ui.find({ key: 'rebase-row' }))?.text).toContain(columns < 70 ? '! Plan changed · 1 removed' : '! Plan changed · 1 task removed')
      const b = await band($, 'terminal')
      expect((await b.find({ key: 'band-text' }))?.text).toContain('! rebase needed')
      await b.unmount()
      const before = w.toasts.length
      await ui.press({ key: 'rebase' })
      const added = w.toasts.slice(before)
      expect(added).toEqual(['Registry rebased · 1 task to redo'])
      expect(await ui.find({ key: 'rebase-row' })).toBeUndefined()
      expect(await rowText(ui, 'core')).toMatch(columns < 60 ? /^↻ core.*redo/ : /^↻ core.*redo · contract changed$/)
      expect(await ui.find({ key: 'redo:core' })).toBeDefined()
      expect((await ui.find({ key: 'retired' }))?.text).toMatch(/^Retired \(1\)/)
      await ui.press({ key: 'retired-toggle' })
      expect((await ui.find({ key: 'retired-full' }))?.text).toContain('ui · removed from the plan')
      const reserves = w.engineCalls('reserve').length
      await ui.press({ key: 'redo:core' })
      const reserve = w.engineCalls('reserve').at(-1)!
      expect(w.engineCalls('reserve').length).toBe(reserves + 1)
      expect(reserve).toContain('--correction')
      await ui.unmount()
    })
})

describe('attempt 13: roles and the orchestrator in settings', () => {
  const BUILTIN = ['backend', 'api', 'frontend', 'architecture', 'design', 'database', 'cloud', 'security', 'delivery', 'verification', 'documentation', 'research', 'communication']
  const roleKeys = async (ui: any) =>
    (await ui.findAll({ type: 'Box' })).map((b: any) => String(b.key ?? '')).filter((k: string) => k.startsWith('srow-role:')).map((k: string) => k.slice('srow-role:'.length))
  const withCustom = (w: World) => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { roles: { reviewer: { model: 'haiku' } } } } } }))

  for (const surface of SURFACES)
    test(`every built-in role is listed, plan roles first and marked, then custom ones (${surface}, 105)`, async ($, on) => {
      on('session.model', () => ({ value: 'claude-opus-5-5' }) as never)
      world(on, withCustom)
      await start($)
      const ui = await pane($, surface, 'settings')
      const roles = await roleKeys(ui)
      expect(roles.slice(0, 3)).toEqual(['backend', 'frontend', 'verification'])
      for (const role of BUILTIN) expect(roles).toContain(role)
      expect(roles.at(-1)).toBe('reviewer')
      expect((await ui.find({ key: 'sname-role:backend' }))?.text).toContain('in plan')
      expect((await ui.find({ key: 'sname-role:cloud' }))?.text).not.toContain('in plan')
      // The orchestrator is this session: informational, not editable.
      const orch = await ui.find({ key: 'orchestrator' })
      expect(orch?.text).toMatch(/^Orchestrator\s*all\s*Opus 5\.5\s*· this session — change with \/model and \/effort$/)
      expect(JSON.stringify(orch)).not.toContain('"Select"')
      await ui.unmount()
    })

  test('the orchestrator row shows the effort of the session\'s last model request', async ($, on) => {
    on('session.model', () => ({ value: 'claude-opus-5-5' }) as never)
    on('turn.step', async function* () {
      return { turnId: 't', index: 0, answer: '', toolUses: [] }
    } as never)
    world(on)
    await start($)
    for await (const _ of ($ as any).turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: 'xhigh', messageCount: 1 })) void _
    const ui = await pane($, 'terminal', 'settings')
    expect((await ui.find({ key: 'orchestrator' }))?.text).toContain('Opus 5.5 ◕ xhigh')
    await ui.unmount()
  })

  for (const [surface, columns] of [['terminal', 105], ['terminal', 50], ['desktop', 45]] as const)
    test(`Add role… validates the name and lists the new role (${surface}, ${columns})`, async ($, on) => {
      const { w } = world(on)
      await start($)
      const ui = await pane($, surface, 'settings', columns)
      const status = async () => (await ui.find({ key: 'status' }))?.text ?? ''
      await ui.input({ key: 'add-role-name', text: 'Bad Name' })
      expect(await status()).toMatch(/^Role not added: Role names are lowercase/)
      await ui.input({ key: 'add-role-name', text: 'discovery' })
      expect(await status()).toMatch(/discovery stays with the orchestrator/)
      await ui.input({ key: 'add-role-name', text: 'backend' })
      expect(await status()).toMatch(/backend is already listed/)
      await ui.input({ key: 'add-role-name', text: 'qa-lead' })
      expect(await ui.find({ key: 'srow-role:qa-lead' })).toBeDefined()
      await ui.select({ key: 'm:role:qa-lead', value: 'claude-haiku-5-5' })
      await ui.press({ key: 'settings-save' })
      const saved = JSON.parse(w.files.get(`${ROOT}/.workflow/config.json`)!)
      expect(saved.orchestration.clients['claude-code'].roles['qa-lead']).toEqual({ model: 'claude-haiku-5-5' })
      await ui.unmount()
    })

  test('mobile says adding a role needs another surface', async ($, on) => {
    world(on)
    await start($)
    const ui = await pane($, 'mobile', 'settings')
    expect(await ui.find({ key: 'add-role-name' })).toBeUndefined()
    expect((await ui.find({ key: 'add-row' }))?.text).toContain('Adding a role needs the terminal or desktop.')
    await ui.unmount()
  })

  for (const [surface, columns] of [['terminal', 50], ['desktop', 45]] as const)
    test(`narrow: roles neither in the plan nor configured fold under Other roles (${surface}, ${columns})`, async ($, on) => {
      world(on, withCustom)
      await start($)
      const ui = await pane($, surface, 'settings', columns)
      const shown = await roleKeys(ui)
      expect(shown).toEqual(['backend', 'frontend', 'verification', 'reviewer'])
      const others = BUILTIN.filter(r => !['backend', 'frontend', 'verification'].includes(r))
      expect((await ui.find({ key: 'other-roles' }))?.text).toContain(`Other roles (${others.length})`)
      await ui.press({ key: 'other-roles-toggle' })
      expect(await roleKeys(ui)).toContain('cloud')
      await ui.unmount()
    })

  test('wide: nothing is folded', async ($, on) => {
    world(on)
    await start($)
    const ui = await pane($, 'terminal', 'settings')
    expect(await ui.find({ key: 'other-roles' })).toBeUndefined()
    expect(await roleKeys(ui)).toContain('communication')
    await ui.unmount()
  })
})

describe('action rows', () => {
  test('a /stip-action output row draws as one short line', async ($, on) => {
    world(on)
    await start($)
    const rows: [string, string, string][] = [
      ['{"action":"accept","change_id":"demo","task_id":"core"}', '{"ok":false,"error":"Only a returned native contribution can be reviewed."}', 'stip: refused — Only a returned native contribution can be reviewed.'],
      ['{"action":"approve","change_id":"demo","digest":"38f287d1aaaa"}', '{"ok":true,"action":"approve","value":{"phase":"approved","approval":{"contract_digest":"38f287d1","by":"user","recorded_at":"2026-10-08T10:00:00Z"}}}', 'stip: approved 38f287d1'],
      ['{"action":"accept","change_id":"demo","task_id":"core"}', 'stipulate: {"ok":true,"action":"accept","value":{}}', 'stip: accept core done'],
      ['{"action":"refresh"}', '{"ok":true,"action":"refresh","value":{"changeId":"demo"', 'stip: refreshed'],
    ]
    for (const surface of SURFACES)
      for (const [args, text, expected] of rows) {
        const ui = await $.ui.mount({ plugin: 'stipulate', surface, component: 'CommandOutput', props: { command: 'stip-action', args, text, isErrored: false } })
        expect((await ui.drawn()) as unknown).toMatchObject({ type: 'Text', children: [expected] })
        await ui.unmount()
      }
  })
})

describe('refresh (AC-21)', () => {
  test('drawing the band and panes runs no engine process', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'core')
    const before = w.calls.length
    for (const surface of SURFACES) {
      const b = await band($, surface)
      await b.redraw()
      await b.redraw()
      const p = await pane($, surface)
      await p.redraw()
      await p.unmount()
      const s = await pane($, surface, 'settings')
      await s.redraw()
      await b.unmount()
      await s.unmount()
    }
    expect(w.calls.length).toBe(before)
  })
})
