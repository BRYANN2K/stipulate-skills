// Stip Ledger interface tests (AC-27..AC-30, AC-33): the pane and band at terminal widths 40-140
// and on desktop, Tasks grouping, the task graph on both surfaces, Claude Code's effort
// marks, stale presses, and drawing from the snapshot alone.
import { describe, expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { StipGraph } from '../../types'
import { bandButtons, bandLayout } from '../../hooks/ui/band.tsx'
import { dependencyList, graphPlain, graphSvg, graphText } from '../../hooks/ui/graph.ts'
import { EFFORT_GLYPH, bandSegments, fitMeta, fitStatus, metaWidth, shortenWords, taskEntries, type TaskRow } from '../../hooks/ui/model.ts'
import { isStaleHandle } from '../../hooks/ui/actions.ts'
import { emptySnapshot } from '../../hooks/core/snapshot.ts'
import { DIGEST, ROOT, TASKS, World, install, launch } from '../core/harness.ts'
import { paint, rowIssues } from './paint.ts'

const P = 'mcp__stipulate__'
const VIEWPORT = { columns: 200, rows: 60, isFullscreen: true }
const TERMINAL_WIDTHS = [40, 50, 80, 105, 140]
const DESKTOP_WIDTHS = [45, 105]
const SETTINGS = 'Stip · Settings'
const REG = `${ROOT}/.workflow/.runtime/demo/state.json`

function world(on: On, setup?: (w: World) => void) {
  const w = new World()
  setup?.(w)
  const open = new Map<string, string>()
  const status: (string | undefined)[] = []
  const clock = install(on, w)
  on('ui.status', ($, e) => (status.push(e.text), { value: undefined }) as never)
  on('ui.open', ($, e) => (open.set(e.id, e.title ?? e.id), { value: { isPlaced: true } }) as never)
  on('ui.close', ($, e) => (open.delete(e.id), { value: undefined }) as never)
  on('ui.panes', () => ({ value: [...open].map(([id, title]) => ({ id, title, isShown: true, isFocused: false, isPlaced: true })) }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('classic.PermissionRequest', () => ({}) as never)
  return { w, open, clock, status }
}

const start = ($: any) => $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
const tool = ($: any, name: string, args: Record<string, unknown> = {}) => $.tool.call({ tool: P + name, ...args } as never)
const delegate = async ($: any, task: string) => launch($, JSON.parse(String((await tool($, 'stip_delegate', { change_id: 'demo', task_id: task })).result)))
const finish = ($: any, agentId: string, answer = 'Done; tests pass.') => $.turn.complete({ answer, durationMs: 5, isAborted: false, turnId: 't', agentId, reason: 'answer' } as never)
const accept = ($: any, task: string) => tool($, 'stip_contribution', { change_id: 'demo', task_id: task, decision: 'accepted', reason: 'Checked the work myself.' })
const pane = ($: any, surface: string, columns: number, title = 'Stip') =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'Pane', requestId: 'stipulate', props: { title, isFocused: true, bodyColumns: columns, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} }, viewport: VIEWPORT })
const band = ($: any, surface: string, columns: number) =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: columns, scroll: { offset: 0, bodyRows: 5 }, view: {} }, viewport: VIEWPORT })
/** Sets what the host reported for a job (the launch model) and refreshes the snapshot. */
const reported = async ($: any, w: World, task: string, fields: Record<string, unknown>) => {
  Object.assign(w.latest(task)!, fields)
  w.syncChange()
  await tool($, 'stip_status')
}
const CONFIG = {
  orchestration: {
    clients: {
      'claude-code': {
        roles: {
          backend: { model: 'claude-opus-5-5', effort: 'high' },
          frontend: { model: 'claude-sonnet-5-5', effort: 'medium' },
          verification: { model: 'claude-fable-5-1', effort: 'medium' },
          documentation: { model: 'claude-haiku-5-5', effort: 'high' },
          research: { model: 'claude-sonnet-5-5', effort: 'low' },
        },
      },
    },
  },
}
const withConfig = (w: World) => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify(CONFIG))

// --- Scenarios, each driven through the core as a session would ---

type Scenario = { name: string; order: string[]; setup?: (w: World) => void; run: ($: any, w: World, clock: any) => Promise<void> }

const SCENARIOS: Scenario[] = [
  {
    name: 'awaiting approval',
    order: ['head', 'stages', 'approval', 'graph'],
    setup: w => {
      w.phase = 'draft'
      w.approvalCurrent = false
    },
    run: async () => {},
  },
  {
    name: 'apply with running and review',
    order: ['head', 'stages', 'waiting', 'who', 'graph', 'criteria', 'helpers'],
    setup: withConfig,
    run: async ($, w) => {
      await delegate($, 'core')
      await delegate($, 'ui')
      await finish($, 'agent-1')
      await $.tool.call({ tool: 'Bash', command: 'npm test -- --watch=false', agentId: 'agent-2' } as never)
      const r = JSON.parse(String((await tool($, 'stip_research', { question: 'How do Amazon S3 SigV4 presigned URLs expire across the storage and CLI layers?', change_id: 'demo' })).result))
      await launch($, r)
      Object.assign(w.helpers[0]!, { actual_model: 'claude-sonnet-5-5' })
      await reported($, w, 'core', { actual_model: 'claude-opus-5-5' })
      await reported($, w, 'ui', { actual_model: 'claude-sonnet-5-5' })
    },
  },
  {
    name: 'pending-docs',
    order: ['head', 'stages', 'docs', 'criteria'],
    setup: w => {
      withConfig(w)
      w.tasks = [...TASKS.map(t => ({ ...t })), { id: 'docs', role: 'documentation', phase: 'docs', objective: 'Write the README', criteria: ['AC-3'], depends_on: ['verify'], write_paths: ['README.md'], read_paths: [] }]
      w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, '# Demo\n\n## Acceptance criteria\n\n- AC-1: The core works.\n- AC-2: The UI shows it.\n- AC-3: The README documents presigned URLs and quotas.\n')
      w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-1: passed — checked.\n- AC-2: passed — checked.\n- AC-3: pending-docs — the README is written by the docs task.\n')
    },
    run: async ($, w) => {
      let agent = 1
      for (const task of ['core', 'ui', 'verify']) {
        await delegate($, task)
        await finish($, `agent-${agent++}`)
        await accept($, task)
      }
      w.phase = 'checked'
      w.syncChange()
      await delegate($, 'docs')
      await reported($, w, 'docs', { actual_model: 'claude-haiku-5-5' })
    },
  },
  {
    name: 'rebase needed',
    order: ['head', 'stages', 'rebase-row', 'who', 'graph', 'criteria'],
    setup: w => (w.registryDigest = 'f'.repeat(64)),
    run: async () => {},
  },
  {
    name: 'tampered',
    order: ['head', 'stages', 'waiting', 'who', 'graph', 'criteria'],
    run: async ($, w, clock) => {
      await delegate($, 'core')
      await finish($, 'agent-1')
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
    },
  },
]

describe('widths (AC-30): no header, task row or helper row wraps mid-word or splits a model name', () => {
  for (const sc of SCENARIOS)
    test(`pane and band, terminal ${TERMINAL_WIDTHS.join('/')} and desktop ${DESKTOP_WIDTHS.join('/')}: ${sc.name}`, async ($, on) => {
      const { w, clock } = world(on, sc.setup)
      await start($)
      await sc.run($, w, clock)
      const runs = [...TERMINAL_WIDTHS.map(n => ['terminal', n] as const), ...DESKTOP_WIDTHS.map(n => ['desktop', n] as const)]
      for (const [surface, columns] of runs) {
        const where = `${sc.name} · ${surface} ${columns}`
        const p = await pane($, surface, columns)
        const painted = paint(await p.drawn(), columns)
        expect(rowIssues(painted), where).toEqual([])
        if (surface === 'terminal') expect(painted.lines.filter(l => [...l].length > columns), where).toEqual([])
        // A model name is whole wherever it shows.
        for (const l of painted.lines) expect(/\b(Opus|Sonnet|Haiku|Fable)\b(?! \d)/.test(l), `${where}: ${l}`).toBe(false)
        // The order the validated preview gives this state (ledger-states.html).
        const tree = JSON.stringify(await p.drawn())
        const at = sc.order.map(k => tree.indexOf(`"key":"${k}"`))
        expect(at.every(i => i >= 0), `${where}: ${sc.order.join(', ')} → ${at.join(', ')}`).toBe(true)
        expect([...at].sort((a, b) => a - b), where).toEqual(at)
        await p.unmount()

        const b = await band($, surface, columns)
        const bp = paint(await b.drawn(), columns)
        expect(rowIssues(bp), `band ${where}`).toEqual([])
        if (surface === 'terminal') expect(bp.lines.filter(l => [...l].length > columns), `band ${where}`).toEqual([])
        for (const key of ['plan', 'settings']) expect(await b.find({ key }), `band ${where} ${key}`).toBeDefined()
        // The host draws its own collapse mark beside the band: none of the mod's.
        expect(await b.find({ key: 'collapse' })).toBeUndefined()
        await b.unmount()
      }
    })

  test('fitMeta gives way by priority: time, effort word, state words, effort mark, model; never splits a model', () => {
    const full = fitMeta('Sonnet 5.5', 'low', 'running npm test -- --watch=false', '1m02s', 200)
    expect(full.map(p => p.text)).toEqual(['Sonnet 5.5', '○ low', 'running npm test -- --watch=false', '1m02s'])
    for (let room = 4; room <= 60; room++) {
      const parts = fitMeta('Sonnet 5.5', 'low', 'running npm test -- --watch=false', '1m02s', room)
      expect(metaWidth(parts), `room ${room}`).toBeLessThanOrEqual(Math.max(room, parts.find(p => p.kind === 'state')!.text.length))
      const model = parts.find(p => p.kind === 'model')
      if (model) expect(model.text).toBe('Sonnet 5.5')
    }
    expect(fitMeta('Sonnet 5.5', 'low', 'running', '1m02s', 28).map(p => p.text)).toEqual(['Sonnet 5.5', '○ low', 'running'])
    expect(fitMeta('Sonnet 5.5', 'low', 'running', '1m02s', 24).map(p => p.text)).toEqual(['Sonnet 5.5', '○', 'running'])
    expect(fitMeta('Sonnet 5.5', 'low', 'running', '1m02s', 20).map(p => p.text)).toEqual(['Sonnet 5.5', 'running'])
    expect(fitMeta('Sonnet 5.5', 'low', 'running', '1m02s', 9).map(p => p.text)).toEqual(['running'])
  })

  test('shortenWords cuts at word boundaries only', () => {
    expect(shortenWords('presigned-uploads-quotas', 24)).toBe('presigned-uploads-quotas')
    expect(shortenWords('presigned-uploads-quotas', 20)).toBe('presigned-uploads…')
    expect(shortenWords('presigned-uploads-quotas', 12)).toBe('presigned…')
    expect(shortenWords('How do presigned URLs expire', 18)).toBe('How do presigned…')
  })
})

describe('band (AC-28)', () => {
  const snap = (id: string, approvable: boolean) => {
    const base = emptySnapshot([], 0, id)
    return {
      ...base,
      phase: (approvable ? 'draft' : 'applying') as 'draft' | 'applying',
      approval: { current: !approvable, digest: '38f287d1'.padEnd(64, '0'), by: approvable ? null : 'user', adopted: false },
      tasks: Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, role: 'backend', phase: 'apply', objective: '', criteria: [], dependsOn: [], writePaths: [], ready: false, awaitingReview: false, awaitingIntegration: false, latest: i < 4 ? ({ acceptance: 'accepted' } as never) : null })),
      workers: [{ status: 'running' } as never],
      awaitingReview: ['t1'],
    }
  }

  for (const approvable of [false, true])
    for (const width of [60, 80, 110, 140])
      test(`keeps every button at ${width} columns, Approve the only primary (${approvable ? 'approvable' : 'approved'})`, () => {
        const id = 'presigned-uploads-quotas'
        const s = snap(id, approvable)
        const approve = approvable ? '38f287d10000' : null
        const layout = bandLayout(room => bandSegments(s, 0, room), id, level => bandButtons(approve, true, false, level), width)
        const buttons = bandButtons(approve, true, false, layout.level)
        expect(buttons.map(b => b.key)).toEqual([...(approvable ? ['approve:38f287d10000'] : []), 'plan', 'settings'])
        expect(buttons.filter(b => b.primary).map(b => b.label)).toEqual(approvable ? ['Approve'] : [])
        expect(buttons.map(b => b.hotkey).filter(Boolean)).toEqual([...(approvable ? ['a'] : []), 'p', 's'])
        const text = layout.segs.map(x => x.text).join('  ')
        expect(text.startsWith('◆ Stip  ')).toBe(true)
        const change = layout.segs[1]!.text
        expect(change === id || ['presigned…', 'presigned-uploads…'].includes(change), change).toBe(true)
        // Inline: text, a space, then the buttons, within the width.
        if (layout.inline) expect(text.length + 1 + buttons.reduce((n, b) => n + b.label.length + 4, 0) + buttons.length - 1).toBeLessThanOrEqual(width)
        // On the terminal the hotkey letter leads each label.
        expect(bandButtons(approve, true, false, 0, true).map(b => b.label)).toEqual([...(approvable ? ['a Approve'] : []), 'p Plan ▾', 's Settings'])
        expect(layout.inline).toBe(true)
        // From 80 columns the stage stays (the text gives way around it first).
        if (width >= 80) expect(text).toContain(approvable ? '  Validate' : '  Apply')
        if (width === 140) expect(text).toContain(approvable ? 'Validate ▸ 4/5' : 'Apply ▸ 4/5')
      })

  for (const approvable of [false, true])
    test(`a narrow transcript column (46) keeps one line with the compact buttons (${approvable ? 'approvable' : 'approved'})`, () => {
      const id = 'greet-users'
      const s = snap(id, approvable)
      const approve = approvable ? '38f287d10000' : null
      const layout = bandLayout(room => bandSegments(s, 0, room), id, level => bandButtons(approve, true, false, level), 46)
      expect(layout.inline).toBe(true)
      expect(layout.level).toBe(2)
      expect(bandButtons(approve, true, false, layout.level).map(b => b.label)).toEqual([...(approvable ? ['Approve'] : []), 'P ▾', 'S'])
      const text = layout.segs.map(x => x.text).join('  ')
      expect(text.startsWith('◆ Stip  greet')).toBe(true)
      expect(['greet-users', 'greet…']).toContain(layout.segs[1]!.text)
    })

  test('reads ◆ Stip <change> <Stage> ▸ n/m <approval> with only non-zero counts', async ($, on) => {
    world(on)
    await start($)
    await delegate($, 'core')
    const b = await band($, 'terminal', 110)
    expect((await b.find({ key: 'band-text' }))?.text).toBe('◆ Stip  demo  Apply ▸ 0/3  ✓ approved  1 running')
    expect((await b.findAll({ type: 'Button' })).map((x: any) => x.props.label)).toEqual(['p Plan', 's Settings'])
    await b.unmount()
  })
})

describe('pane (AC-27)', () => {
  test('header: change picker, approval badge with the short digest, Plan/Settings tabs; stage chips', async ($, on) => {
    world(on)
    await start($)
    for (const surface of ['terminal', 'desktop'] as const) {
      const p = await pane($, surface, 105)
      expect((await p.find({ key: 'picker' }))?.props.label).toBe('demo ▾')
      expect((await p.find({ key: 'title' }))?.text).toContain(`✓ approved ${DIGEST.slice(0, 8)}`)
      expect((await p.find({ key: 'tab-plan' }))?.props.label).toBe('Plan ▾')
      expect((await p.find({ key: 'tab-settings' }))?.props.label).toBe('Settings')
      const chips = (await p.find({ key: 'stages' }))!
      const texts = paint(chips, 105).lines.join('\n')
      for (const name of ['✓ Explore', '✓ Validate', 'Apply', 'Check', 'Docs', 'Archive']) expect(texts).toContain(name)
      expect(texts).not.toContain('Bootstrap')
      const all = JSON.stringify(chips)
      if (surface === 'terminal') {
        // Current stage filled; later ones dim.
        expect(all).toMatch(/"backgroundColor":"suggestion"[^}]*\}?[^\]]*Apply/)
      } else {
        // AC-40: plain text on the desktop, no chip: ✓ green, ● the current one bold in the accent, later ones dim.
        expect(all).not.toContain('backgroundColor')
        expect(all).not.toContain('borderStyle')
        expect(texts).toContain('● Apply')
        expect(JSON.stringify(await p.find({ key: 'stage-Validate' }))).toContain('{"color":"success"},"children":["✓ Validate"]')
        expect(JSON.stringify(await p.find({ key: 'stage-Apply' }))).toContain('{"color":"suggestion","bold":true},"children":["● Apply"]')
        expect(JSON.stringify(await p.find({ key: 'stage-Check' }))).toContain('{"dimColor":true},"children":["Check"]')
      }
      await p.unmount()
    }
  })

  test('Tasks: one row per task, or one per group sharing model, effort and state; › lists a group', async ($, on) => {
    const { w } = world(on, w => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { model: 'claude-opus-5-5', effort: 'low' } } } } })))
    await start($)
    await delegate($, 'core')
    await delegate($, 'ui')
    await finish($, 'agent-1')
    await finish($, 'agent-2')
    await accept($, 'core')
    await accept($, 'ui')
    await reported($, w, 'core', { actual_model: 'claude-opus-5-5' })
    await reported($, w, 'ui', { actual_model: 'claude-opus-5-5' })
    for (const surface of ['terminal', 'desktop'] as const) {
      const p = await pane($, surface, 80)
      // verify (ready, its own row with Delegate) first; the two accepted tasks are one row, latest first.
      expect(await p.find({ key: 'task-verify' })).toBeDefined()
      expect(await p.find({ key: 'task-core' })).toBeUndefined()
      const group = paint((await p.find({ key: 'row-ui' }))!, 80).lines.map(l => l.trim())
      expect(group).toEqual(['ui · core', 'Opus 5.5 · ○ low · accepted · 0s'])
      expect((await p.find({ key: 'gtoggle:ui' }))?.props.label).toBe('›')
      expect(await p.find({ key: 'accept:ui' })).toBeUndefined()
      await p.press({ key: 'gtoggle:ui' })
      expect(await p.find({ key: 'member-core' })).toBeDefined()
      await p.press({ key: 'details:core' })
      expect(await p.find({ key: 'details-box-core' })).toBeDefined()
      await p.press({ key: 'details:core' })
      await p.press({ key: 'gtoggle:ui' })
      expect(await p.find({ key: 'member-core' })).toBeUndefined()
      await p.unmount()
    }
  })

  test('taskEntries never groups rows that ask for the person or run', () => {
    const s = emptySnapshot([], 0, 'demo')
    const task = (id: string) => ({ id, role: 'backend', phase: 'apply', objective: '', criteria: [], dependsOn: [], writePaths: [], ready: false, awaitingReview: false, awaitingIntegration: false, latest: null })
    const snap = { ...s, tasks: ['a', 'b', 'c', 'd'].map(task) }
    const row = (tone: TaskRow['tone'], action: TaskRow['action'], words: string): TaskRow => ({ icon: '', tone, words, action, model: null, duration: '' })
    const rows = new Map<string, TaskRow>([
      ['a', row('review', 'review', 'awaiting review')],
      ['b', row('review', 'review', 'awaiting review')],
      ['c', row('done', 'none', 'integrated')],
      ['d', row('done', 'none', 'integrated')],
    ])
    expect(taskEntries(snap, rows, new Set()).map(e => e.ids)).toEqual([['a'], ['b'], ['d', 'c']])
    expect(taskEntries(snap, rows, new Set(['c'])).map(e => e.ids)).toEqual([['a'], ['b'], ['d'], ['c']])
  })

  test('criteria ruler (AC-38): one glyph per criterion over its AC label, n of m, the open one named (waiting on docs)', async ($, on) => {
    const sc = SCENARIOS.find(x => x.name === 'pending-docs')!
    const { w, clock } = world(on, sc.setup)
    await start($)
    await sc.run($, w, clock)
    for (const surface of ['terminal', 'desktop'] as const) {
      const p = await pane($, surface, 105)
      expect((await p.find({ key: 'criteria-hd' }))?.text).toBe('Criteria2 of 3')
      expect(paint((await p.find({ key: 'crit-strip' }))!, 101).lines).toEqual([' ✓    ✓    ◌', 'AC-1 AC-2 AC-3'])
      expect((await p.find({ key: 'crit-foot' }))?.text).toMatch(/^AC-3: The README documents.*, waiting on docs/)
      // Glyphs, not colored cells: ✓ green, ◌ the pending-docs violet; no Svg strip. AC-3, which the
      // running docs task works on, pulses: a one-cell Raster on the terminal, toggled text on the desktop.
      const strip = JSON.stringify(await p.find({ key: 'crit-strip' }))
      expect(strip).toContain('"color":"success"')
      if (surface === 'terminal') expect(strip).toContain('"key":"pulse:AC-3"')
      else expect(strip).toMatch(/"color":"permission"|"dimColor":true/)
      expect(strip).not.toContain('backgroundColor')
      expect((await p.findAll({ type: 'Svg' })).filter((x: any) => /criteria/.test(String(x.props.alt)))).toEqual([])
      // Open/details per criterion stay reachable.
      await p.press({ key: 'criteria-toggle' })
      await p.press({ key: 'open:AC-3' })
      expect((await p.find({ key: 'ac-AC-3' }))?.text).toMatch(/^◌ AC-3/)
      expect((await p.find({ key: 'ac-full-AC-3' }))?.text).toContain('pending-docs: the README is written by the docs task.')
      await p.press({ key: 'open:AC-3' })
      await p.press({ key: 'criteria-toggle' })
      await p.unmount()
    }
  })

  test('retired tasks name the integrated paths that remain in the checkout (AC-34)', async ($, on) => {
    world(on, w => {
      w.rebases = [{ from: 'x'.repeat(64), to: DIGEST, at: '2026-02-02T00:00:00+00:00', reason: null, kept: [], reopened: [], retired: ['old'], retired_integrated_paths: { old: ['src/old/a.ts', 'src/old/b.ts'] } }]
    })
    await start($)
    const p = await pane($, 'terminal', 80)
    expect((await p.find({ key: 'retired' }))?.text).toContain('Retired (1)')
    await p.press({ key: 'retired-toggle' })
    expect((await p.find({ key: 'retired-full' }))?.text).toBe('old · removed from the plan; its integrated work remains in the checkout: src/old/a.ts, src/old/b.ts')
    await p.unmount()
  })

  test('a held restore shows the resync row and hint; the band says resync', async ($, on) => {
    const { w, clock } = world(on)
    await start($)
    const LIFE = `${ROOT}/.workflow/changes/demo/state.json`
    const theirs = JSON.stringify({ ...JSON.parse(w.files.get(LIFE)!), note: 'written by another process' })
    for (let i = 0; i < 8; i++) {
      w.files.set(LIFE, theirs)
      await clock.advance(3_000)
      await clock.advance(3_000)
    }
    await tool($, 'stip_status')
    const p = await pane($, 'terminal', 105)
    const row = (await p.find({ key: 'resync-row' }))?.text ?? ''
    expect(row).toContain('.workflow/changes/demo/state.json')
    expect(row).toContain('/stip-resync confirm adopts them')
    await p.unmount()
    const b = await band($, 'terminal', 110)
    expect((await b.find({ key: 'band-text' }))?.text).toContain('! resync needed')
    await b.unmount()
  })

  test('the settings tab in the Ledger look: header, scope chips, cards, save bar', async ($, on) => {
    world(on)
    await start($)
    for (const surface of ['terminal', 'desktop'] as const) {
      const s = await pane($, surface, 105, SETTINGS)
      expect((await s.find({ key: 'settings-picker' }))?.props.label).toBe('demo ▾')
      expect((await s.find({ key: 'tab-settings' }))?.props.label).toBe('Settings ▾')
      expect((await s.find({ key: 'tab-plan' }))?.props.dimColor).toBe(true)
      for (const key of ['roles', 'limits']) expect((await s.find({ key }))?.props.borderStyle, key).toBe('round')
      expect((await s.find({ key: 'roles-hd' }))?.text).toContain('Models by role')
      expect((await s.find({ key: 'limits-hd' }))?.text).toBe('Limits and guards')
      expect((await s.find({ key: 'settings-save' }))?.props.variant).toBe('primary')
      expect((await s.find({ key: 'status' }))?.text).toBe('Saved')
      await s.unmount()
    }
  })

  test('the settings header picker opens the Plan tab with the change picker', async ($, on) => {
    const { open } = world(on)
    await start($)
    const s = await pane($, 'terminal', 105, SETTINGS)
    open.set('stipulate', SETTINGS)
    await s.press({ key: 'settings-picker' })
    expect(open.get('stipulate')).toBe('Stip')
    await s.unmount()
    const p = await pane($, 'terminal', 105)
    expect(await p.find({ key: 'picker-list' })).toBeDefined()
    await p.unmount()
  })

  test('settings widths: no row wraps mid-word at 40-140 columns and on desktop', async ($, on) => {
    world(on, withConfig)
    await start($)
    for (const [surface, columns] of [...TERMINAL_WIDTHS.map(n => ['terminal', n] as const), ...DESKTOP_WIDTHS.map(n => ['desktop', n] as const)]) {
      const s = await pane($, surface, columns, SETTINGS)
      await s.press({ key: 'sopen:defaults' })
      const painted = paint(await s.drawn(), columns)
      expect(painted.issues.filter(i => /^(head|tabs|scopes|path|sname-|sval-|orch-|roles-hd|limits-hd|limits-steppers|gate-row|other-roles|eff-)/.test(i.key)), `${surface} ${columns}`).toEqual([])
      if (surface === 'terminal') expect(painted.lines.filter(l => [...l].length > columns), `${surface} ${columns}`).toEqual([])
      await s.press({ key: 'sopen:defaults' })
      await s.unmount()
    }
  })
})

describe('effort marks (AC-29): Claude Code\'s glyphs', () => {
  test('low ○, medium ◐, high ●, xhigh ◉, max ◈', () => {
    expect(EFFORT_GLYPH).toEqual({ low: '○', medium: '◐', high: '●', xhigh: '◉', max: '◈' })
  })

  test('the same marks in rows, helpers and the settings pickers, in the claude color', async ($, on) => {
    const sc = SCENARIOS.find(x => x.name === 'apply with running and review')!
    const { w, clock } = world(on, sc.setup)
    await start($)
    await sc.run($, w, clock)
    const p = await pane($, 'terminal', 105)
    const marks = (await p.findAll({ type: 'Text' })).filter((t: any) => /^[○◐●◉◈]( |$)/.test(t.text))
    expect([...new Set(marks.map((t: any) => t.text))].sort()).toEqual(['○ low', '◐ medium', '● high'].sort())
    expect(marks.every((t: any) => t.props.color === 'claude')).toBe(true)
    await p.unmount()
    const s = await pane($, 'terminal', 105, SETTINGS)
    const labels = ((await s.find({ key: 'e:defaults' }))?.props.options as { label: string }[]).map(o => o.label)
    for (const l of ['○ low', '◐ medium', '● high', '◉ xhigh', '◈ max']) expect(labels).toContain(l)
    await s.unmount()
  })
})

describe('task graph (AC-27)', () => {
  const node = (id: string, depth: number, state: any, dependsOn: string[] = []) => ({ id, role: 'backend', phase: 'apply', state, attempt: 1, depth, dependsOn })
  const PREVIEW: StipGraph = {
    nodes: [node('signed-urls', 0, 'integrated'), node('quotas', 0, 'integrated'), node('wiring', 1, 'integrated', ['signed-urls', 'quotas']), node('verify', 2, 'integrated', ['wiring']), node('docs', 3, 'running', ['verify'])],
    edges: [
      { from: 'signed-urls', to: 'wiring', done: true },
      { from: 'quotas', to: 'wiring', done: true },
      { from: 'wiring', to: 'verify', done: true },
      { from: 'verify', to: 'docs', done: true },
    ],
  }

  test('terminal: box drawing by depth columns, the running edge dashed', () => {
    const lines = graphText(PREVIEW, 80)!
    expect(graphPlain(lines).split('\n')).toEqual([
      '╭─────────────╮',
      '│ signed-urls │─╮',
      '╰─────────────╯ │  ╭────────╮   ╭────────╮   ╭──────╮',
      '                ├─▶│ wiring │──▶│ verify │┄┄▶│ docs │',
      '╭─────────────╮ │  ╰────────╯   ╰────────╯   ╰──────╯',
      '│   quotas    │─╯',
      '╰─────────────╯',
    ])
    // Color carries the state: integrated green, running blue (bold label).
    const docs = lines[3]!.find(s => s.text.includes('docs'))!
    expect(docs.color).toBe('suggestion')
    expect(lines[1]!.find(s => s.text.includes('signed-urls'))!.color).toBe('success')
    expect(lines[3]!.find(s => s.text.includes('┄'))!.color).toBe('suggestion')
  })

  test('terminal: an edge that skips a column passes through it; too wide falls back to the dependency list', () => {
    const g: StipGraph = {
      nodes: [node('a', 0, 'integrated'), node('b', 1, 'correction', ['a']), node('c', 2, 'blocked', ['a', 'b'])],
      edges: [
        { from: 'a', to: 'b', done: true },
        { from: 'a', to: 'c', done: true },
        { from: 'b', to: 'c', done: false },
      ],
    }
    const text = graphPlain(graphText(g, 60)!)
    for (const id of ['│ a │', '│ b │', '│ c │']) expect(text).toContain(id)
    expect(text.split('\n').every(l => [...l].length <= 60)).toBe(true)
    expect(graphText(PREVIEW, 40)).toBeNull()
    expect(graphPlain(dependencyList(PREVIEW, 36)).split('\n')).toEqual(['✓ signed-urls', '✓ quotas', '  └▶ ✓ wiring ← signed-urls, quotas', '    └▶ ✓ verify', '      └▶ ▶ docs'])
  })

  test('the pane draws the graph from the snapshot on both surfaces', async ($, on) => {
    world(on)
    await start($)
    await delegate($, 'core')
    const t = await pane($, 'terminal', 80)
    const drawn = paint((await t.find({ key: 'graph' }))!, 80).lines.join('\n')
    expect(drawn).toContain('│ core │─╮')
    expect(drawn).toContain('├─▶│ verify │')
    expect(drawn).toContain('■ integrated  ■ running  ■ correction')
    await t.unmount()
    const narrow = await pane($, 'terminal', 24)
    expect(paint((await narrow.find({ key: 'graph' }))!, 24).lines.join('\n')).toContain('│   └▶ ○ verify   ')
    await narrow.unmount()
    const d = await pane($, 'desktop', 80)
    const svg = (await d.findAll({ type: 'Svg' })).find((x: any) => /^Task dependencies/.test(String(x.props.alt)))
    expect(svg?.props.alt).toBe('Task dependencies: core (running); ui (ready); verify (ready) after core, ui')
    await d.unmount()
  })

  test('desktop: rounded nodes, curved edges, state colors, dashed into a running task', () => {
    const { source, width, height } = graphSvg(PREVIEW)
    expect(source.match(/<rect /g)).toHaveLength(5)
    expect(source.match(/rx="6"/g)).toHaveLength(5)
    expect(source.match(/<path d="M[^"]+ C/g)).toHaveLength(4)
    expect(source).toContain('stroke="#6fbf73"')
    expect(source).toContain('stroke="#8fb3ff" stroke-dasharray="4 4"')
    expect(source).toContain('>signed-urls</text>')
    expect(width).toBeGreaterThan(200)
    expect(height).toBeGreaterThan(40)
    const correction = graphSvg({ nodes: [node('a', 0, 'integrated'), node('b', 1, 'correction', ['a']), node('x', 0, 'failed')], edges: [{ from: 'a', to: 'b', done: true }] }).source
    expect(correction).toContain('stroke="#e3b55b"')
    expect(correction).toContain('stroke="#e06c6c"')
  })
})

describe('stale presses (AC-33)', () => {
  const STALE = 'ui.press/ui.input/ui.select: no handler is held under handle 7'

  test('a press for a handle no longer held still acts by key and raises no error', async ($, on) => {
    const { w } = world(on)
    // Beneath the plugin, as the engine does once a redraw released the closure's handle.
    on('ui.press', () => {
      throw new Error(STALE)
    })
    on('ui.input', () => {
      throw new Error(STALE)
    })
    await start($)
    await delegate($, 'core')
    await finish($, 'agent-1')
    const p = await pane($, 'terminal', 105)
    const before = w.said().length
    await expect(p.press({ key: 'details:core' })).resolves.toEqual({ element: 'details:core' })
    expect(await p.find({ key: 'details-box-core' })).toBeDefined()
    await expect(p.press({ key: 'accept:core' })).resolves.toEqual({ element: 'accept:core' })
    expect(w.latest('core')!.acceptance).toBe('accepted')
    expect(w.said().slice(before).filter(t => /handler|handle/.test(t))).toEqual([])
    await p.unmount()
    const b = await band($, 'terminal', 110)
    await expect(b.press({ key: 'plan' })).resolves.toEqual({ element: 'plan' })
    await b.unmount()
  })

  test('a pick on a released handle in the settings tab is dropped quietly', async ($, on) => {
    const { w } = world(on)
    on('ui.select', () => {
      throw new Error(STALE)
    })
    await start($)
    const s = await pane($, 'terminal', 105, SETTINGS)
    await expect(s.select({ key: 'e:defaults', value: 'high' })).resolves.toEqual({ element: 'e:defaults', value: 'high' })
    expect(w.said().filter(t => /handle/.test(t))).toEqual([])
    await s.unmount()
  })
})

describe('stale presses across the worker boundary (AC-33, live finding)', () => {
  const STALE = 'ui.press/ui.input/ui.select: no handler is held under handle 34'
  // What the engine's rejection looks like once it has crossed into the hooks worker.
  const crossed = { name: 'HooksError', message: STALE, kind: 'throw' }

  test('the stale-handle refusal is recognised in every shape', () => {
    expect(isStaleHandle(new Error(STALE))).toBe(true)
    expect(isStaleHandle(STALE)).toBe(true)
    expect(isStaleHandle(crossed)).toBe(true)
    expect(isStaleHandle({ kind: 'throw', error: { message: STALE } })).toBe(true)
    expect(isStaleHandle({ cause: { cause: STALE } })).toBe(true)
    expect(isStaleHandle(new Error('something else'))).toBe(false)
    expect(isStaleHandle(null)).toBe(false)
  })

  test('the band\'s Approve is answered by key and never asks for the released handle', async ($, on) => {
    const { w } = world(on, w => {
      w.phase = 'draft'
      w.approvalCurrent = false
    })
    let reached = 0
    on('ui.press', () => {
      reached++
      throw crossed
    })
    await start($)
    const b = await band($, 'terminal', 110)
    const before = w.said().length
    await expect(b.press({ key: `approve:${DIGEST.slice(0, 12)}` })).resolves.toEqual({ element: `approve:${DIGEST.slice(0, 12)}` })
    expect(w.approvalCurrent).toBe(true)
    expect(reached).toBe(0)
    // Pressing again on the redrawn band (the old element is gone): still nothing reaches the closure.
    await expect(b.press({ key: 'plan' })).resolves.toEqual({ element: 'plan' })
    expect(reached).toBe(0)
    expect(w.said().slice(before).filter(t => /handle|skipped/.test(t))).toEqual([])
    await b.unmount()
  })

  test('a press that does go on to its closure (a settings stepper) swallows a crossed stale rejection', async ($, on) => {
    const { w } = world(on)
    let reached = 0
    on('ui.press', () => {
      reached++
      throw crossed
    })
    on('ui.select', () => {
      throw { ...crossed }
    })
    await start($)
    const s = await pane($, 'terminal', 105, SETTINGS)
    await expect(s.press({ key: 'max_workers-inc' })).resolves.toEqual({ element: 'max_workers-inc' })
    expect(reached).toBe(1)
    await expect(s.select({ key: 'e:defaults', value: 'low' })).resolves.toEqual({ element: 'e:defaults', value: 'low' })
    expect(w.said().filter(t => /handle/.test(t))).toEqual([])
    await s.unmount()
  })
})

describe('live review, attempt 3', () => {
  test('a band in the transcript column beside a docked pane (~31 cells) stays on one line', () => {
    const base = emptySnapshot([], 0, 'greet-and-add')
    const s = { ...base, phase: 'applying' as const, approval: { current: true, digest: 'a'.repeat(64), by: 'user', adopted: false }, workers: [{ status: 'running' } as never, { status: 'running' } as never] }
    const layout = bandLayout(room => bandSegments(s, 0, room), 'greet-and-add', level => bandButtons(null, true, false, level, true), 31)
    expect(layout.inline).toBe(true)
    expect(bandButtons(null, true, false, layout.level, true).map(b => b.label)).toEqual(['p ▾', 's'])
    expect(layout.segs.map(x => x.text).join('  ')).toMatch(/^◆ Stip  greet…/)
  })

  test('rows of tasks not launched yet show the model and effort they will run with', async ($, on) => {
    world(on, withConfig)
    await start($)
    const p = await pane($, 'terminal', 105)
    const verify = paint((await p.find({ key: 'row-verify' }))!, 105).lines.join(' | ')
    expect(verify).toContain('Fable 5.1 · ◐ medium')
    await p.unmount()
  })

  test('the status line is fitted to the terminal at whole words', async ($, on) => {
    const { status: seen } = world(on)
    await start($)
    expect(fitStatus('greet-and-add · applying · 2 running', 40)).toBe('greet-and-add')
    expect(fitStatus('greet-and-add · applying · 2 running', 60)).toBe('greet-and-add · applying · 2 running')
    expect(fitStatus('presigned-uploads-quotas · applying', 30)).toBe('presigned…')
    // The band tells the status line how wide the terminal is.
    const b = await $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 30, scroll: { offset: 0, bodyRows: 5 }, view: {} }, viewport: { columns: 40, rows: 40, isFullscreen: true } })
    await delegate($, 'core')
    expect(seen.at(-1)).toBe('demo · applying')
    await b.unmount()
  })
})

describe('drawing reads the snapshot alone (AC-21, AC-27)', () => {
  test('no registry file is read while the pane and band draw', async ($, on) => {
    const { w } = world(on, withConfig)
    await start($)
    await delegate($, 'core')
    await reported($, w, 'core', { actual_model: 'claude-opus-5-5' })
    const reads: string[] = []
    class Spy extends Map<string, string> {
      override get(k: string) {
        reads.push(k)
        return super.get(k)
      }
    }
    w.files = new Spy(w.files)
    for (const surface of ['terminal', 'desktop'] as const) {
      const p = await pane($, surface, 105)
      await p.redraw()
      expect(paint((await p.find({ key: 'row-core' }))!, 105).lines.join(' | ')).toContain('Opus 5.5 · ● high')
      await p.unmount()
      const b = await band($, surface, 110)
      await b.unmount()
    }
    expect(reads.filter(r => r.includes('/.workflow/.runtime/'))).toEqual([])
  })
})
