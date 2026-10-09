// Extensions in the pane and Settings (AC-44..AC-49): the bound change's selected extensions as
// header chips in every bound view, on the terminal and the desktop, never cut and collapsed to +n;
// a chip lighting once as it joins (motion auto, calm, off); selection changes from the pane while
// exploring through the engine's select; the project's Extensions card in Settings, writing only
// `extensions.<id>.enabled` (and `path`), refusing to disable one a live change selects; and all of
// it from a person's press only, never from a model tool call.
import { describe, expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { EXTENSION_KEYS, NOT_PERSON, isPersonPress } from '../../hooks/ui/actions.ts'
import { chipsFit } from '../../hooks/ui/model.ts'
import { disableRefusal, projectExtensionsOf } from '../../hooks/core/settings.ts'
import { ROOT, World, install } from '../core/harness.ts'
import { paint } from './paint.ts'

const P = 'mcp__stipulate__'
const VIEWPORT = { columns: 200, rows: 60, isFullscreen: true }
const SURFACES = ['terminal', 'desktop'] as const
const SETTINGS = 'Stip · Settings'
const CONFIG = `${ROOT}/.workflow/config.json`

function world(on: On, setup?: (w: World) => void) {
  const w = new World()
  setup?.(w)
  const open = new Map<string, string>()
  const clock = install(on, w)
  on('ui.status', () => ({ value: undefined }) as never)
  on('ui.open', ($, e) => (open.set(e.id, e.title ?? e.id), { value: { isPlaced: true } }) as never)
  on('ui.close', ($, e) => (open.delete(e.id), { value: undefined }) as never)
  on('ui.panes', () => ({ value: [...open].map(([id, title]) => ({ id, title, isShown: true, isFocused: false, isPlaced: true })) }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('ui.blit', () => ({ value: {} }) as never)
  on('classic.PermissionRequest', () => ({}) as never)
  return { w, clock }
}

const start = ($: any) => $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
const pane = ($: any, surface: string, columns: number, title = 'Stip') =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'Pane', requestId: 'stipulate', props: { title, isFocused: true, bodyColumns: columns, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} }, viewport: VIEWPORT })
/** The pane's Refresh, pressed on a surface the test holds no pane on. */
const refresh = async ($: any) => {
  for (const surface of ['mobile', 'desktop', 'terminal']) {
    const p = await pane($, surface, 105).catch(() => null)
    if (!p) continue
    await p.press({ key: 'refresh' })
    await p.unmount()
    return
  }
  throw new Error('no surface free to press Refresh on')
}
/** A lifecycle step the coordinator runs (a Bash call, as a session does). */
const step = async ($: any, w: World, change: () => void) => {
  w.bashEffect = change
  await $.tool.call({ tool: 'Bash', command: 'python3 workflow.py step demo' } as never)
  w.bashEffect = null
}
const held = async ($: any) => JSON.parse(String((await $.tool.call({ tool: P + 'stip_status' } as never)).result)).snapshot
const doc = (w: World) => JSON.parse(w.files.get(CONFIG)!)

/** A project with four extensions in .workflow/extensions/: three enabled, one only present. */
function catalog(w: World) {
  w.files.set(
    CONFIG,
    JSON.stringify({ schema_version: 1, extensions: {}, settings: { require_user_approval: true }, orchestration: { clients: { 'claude-code': { ui: { motion: 'auto' } } } }, custom: { keep: [1, 2] } }, null, 2) + '\n',
  )
  w.addExtension('cli-tooling', 'Build a stable command-line interface for people and automation.', true)
  w.addExtension('security-engineering', 'Threat-model and protect what the change touches.', true)
  w.addExtension('backend-engineering', 'Ensure consistent server behavior across success and failure.', true)
  w.addExtension('ai-engineering', 'Scope and evaluate a model capability.', null)
}
/** The bound change exploring, with `selected` chosen. */
const exploring = (selected: string[]) => (w: World) => {
  catalog(w)
  w.phase = 'exploring'
  w.approvalCurrent = false
  w.extensions = selected
  w.syncChange()
}
const withMotion = (motion: 'auto' | 'calm' | 'off') => (w: World) => {
  const d = JSON.parse(w.files.get(CONFIG)!)
  d.orchestration.clients['claude-code'].ui.motion = motion
  w.files.set(CONFIG, JSON.stringify(d, null, 2) + '\n')
}

/** The bound views and the lifecycle phase each is drawn for (Check is covered by states.test.ts). */
const VIEWS = [
  { name: 'Explore', phase: 'exploring', approved: false },
  { name: 'Validate', phase: 'draft', approved: false },
  { name: 'Apply', phase: 'applying', approved: true },
  { name: 'Docs', phase: 'checked', approved: true },
] as const

const LONG = ['security-engineering', 'backend-engineering', 'cli-tooling', 'ai-engineering']

describe('header chips (AC-44)', () => {
  for (const v of VIEWS)
    for (const surface of SURFACES)
      test(`${v.name} (${surface}): one chip per selected extension under the header, nothing when none`, async ($, on) => {
        const { w } = world(on, x => {
          catalog(x)
          x.phase = v.phase
          x.approvalCurrent = v.approved
          x.extensions = ['cli-tooling', 'security-engineering']
          x.syncChange()
        })
        await start($)
        let p = await pane($, surface, 105)
        const tree = JSON.stringify(await p.drawn())
        // Under the header line, before the rail.
        expect(tree.indexOf('"key":"head"')).toBeLessThan(tree.indexOf('"key":"ext-chips"'))
        expect(tree.indexOf('"key":"ext-chips"')).toBeLessThan(tree.indexOf('"key":"stages"'))
        const chips = (await p.find({ key: 'ext-chips' }))!.text as string
        for (const id of ['cli-tooling', 'security-engineering']) expect(chips.split(id).length - 1).toBe(1)
        expect(chips).not.toMatch(/backend-engineering|ai-engineering/)
        // The old dim line is gone in every view.
        expect(paint(await p.drawn(), 105).lines.join('\n')).not.toMatch(/Extensions:/)
        await p.unmount()
        await step($, w, () => {
          w.extensions = []
          w.syncChange()
        })
        await refresh($)
        p = await pane($, surface, 105)
        const after = await p.find({ key: 'ext-chips' })
        if (v.phase === 'exploring') {
          // Exploring with nothing selected: only the `+ extension` control, no chip.
          expect(after?.text).toBe('+ extension')
        } else expect(after).toBeUndefined()
        expect(JSON.stringify(await p.drawn())).not.toMatch(/"key":"ext-(remove:|cli-tooling|security-engineering)/)
        await p.unmount()
      })

  const WIDTHS = [
    { surface: 'terminal', columns: 40 },
    { surface: 'terminal', columns: 80 },
    { surface: 'terminal', columns: 140 },
    { surface: 'desktop', columns: 45 },
    { surface: 'desktop', columns: 140 },
  ] as const
  for (const phase of ['exploring', 'applying'] as const)
    for (const { surface, columns } of WIDTHS)
      test(`${phase}, ${surface} ${columns}: chips whole, never wrapped mid-word, the rest as +n`, async ($, on) => {
        world(on, x => {
          catalog(x)
          x.phase = phase
          x.approvalCurrent = phase === 'applying'
          x.extensions = LONG
          x.syncChange()
        })
        await start($)
        const p = await pane($, surface, columns)
        const row = (await p.find({ key: 'ext-chips' }))!
        const painted = paint(row as never, columns)
        expect(painted.issues, `${surface} ${columns}`).toEqual([])
        expect(painted.lines.filter(l => [...l].length > columns)).toEqual([])
        // The chips' own line: whole chips, then +n for those that did not fit.
        const line = painted.lines[0]!.trim()
        const shown = LONG.filter(id => line.includes(`◇ ${id}`))
        expect(shown).toEqual(LONG.slice(0, shown.length))
        const more = /\+(\d+)/.exec(line.replace('+ extension', ''))
        expect(shown.length + (more ? Number(more[1]) : 0)).toBe(LONG.length)
        if (columns >= 140) expect(more).toBeNull()
        if (columns <= 45) expect(more).not.toBeNull()
        // The whole pane stays whole at this width too.
        const all = paint(await p.drawn(), columns)
        expect(all.issues.filter(i => i.kind === 'split' || i.kind === 'overflow')).toEqual([])
        await p.unmount()
      })

  test('chipsFit keeps chips whole and collapses the rest into +n', () => {
    expect(chipsFit([10, 10, 10], 40)).toEqual({ shown: 3, more: null, tailBelow: false })
    expect(chipsFit([10, 10, 10], 25)).toEqual({ shown: 2, more: '+1', tailBelow: false })
    expect(chipsFit([10, 10, 10], 15)).toEqual({ shown: 1, more: '+2', tailBelow: false })
    expect(chipsFit([30], 24)).toEqual({ shown: 0, more: '+1', tailBelow: false })
    // The control beside the chips while it fits, else on the next line.
    expect(chipsFit([10, 10], 40, 15)).toEqual({ shown: 2, more: null, tailBelow: false })
    expect(chipsFit([10, 10], 30, 15)).toEqual({ shown: 1, more: '+1', tailBelow: false })
    expect(chipsFit([20], 30, 15)).toEqual({ shown: 1, more: null, tailBelow: true })
    expect(chipsFit([], 30, 15)).toEqual({ shown: 0, more: null, tailBelow: false })
  })
})

describe('a chip lights up once as it joins (AC-45)', () => {
  test('auto: the new chip alone lights, then settles; again only when it joins again', async ($, on) => {
    const { clock } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105)
    const lit = async (id: string) => JSON.stringify(await p.find({ key: `ext-remove:${id}` })).includes('"bold":true')
    expect(await lit('cli-tooling')).toBe(false)
    await p.press({ key: 'ext-add' })
    await p.press({ key: 'ext-pick:security-engineering' })
    expect(await lit('security-engineering')).toBe(true)
    // Nothing else in the header animates for it.
    expect(await lit('cli-tooling')).toBe(false)
    expect(JSON.stringify(await p.find({ key: 'head' }))).not.toContain('"bold":true,"color":"suggestion"')
    await clock.advance(700)
    expect(await lit('security-engineering')).toBe(false)
    // Removed, then added again: it lights again.
    await p.press({ key: 'ext-remove:security-engineering' })
    await p.press({ key: 'ext-add' })
    await p.press({ key: 'ext-pick:security-engineering' })
    expect(await lit('security-engineering')).toBe(true)
    await p.unmount()
  })

  test('auto: a selection the coordinator makes lights the chip too', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105)
    await step($, w, () => {
      w.extensions = ['cli-tooling', 'backend-engineering']
      w.syncChange()
    })
    await refresh($)
    expect(JSON.stringify(await p.find({ key: 'ext-remove:backend-engineering' }))).toContain('"bold":true')
    await p.unmount()
  })

  for (const motion of ['calm', 'off'] as const)
    test(`${motion}: the chip is drawn settled at once`, async ($, on) => {
      world(on, w => (exploring(['cli-tooling'])(w), withMotion(motion)(w)))
      await start($)
      const p = await pane($, 'terminal', 105)
      await p.press({ key: 'ext-add' })
      await p.press({ key: 'ext-pick:backend-engineering' })
      const chip = JSON.stringify(await p.find({ key: 'ext-remove:backend-engineering' }))
      expect(chip).toContain('backend-engineering')
      expect(chip).not.toContain('"bold":true')
      await p.unmount()
    })
})

describe('changing the selection from the pane (AC-46)', () => {
  for (const surface of SURFACES)
    test(`exploring (${surface}): a chip press removes it, + extension adds one; each runs select with the whole selection`, async ($, on) => {
      const { w } = world(on, exploring(['cli-tooling', 'security-engineering']))
      await start($)
      const p = await pane($, surface, 105)
      await p.press({ key: 'ext-remove:cli-tooling' })
      expect(w.engineCalls('select').at(-1)).toEqual(['select', 'demo', '--extension', 'security-engineering'])
      expect(w.extensions).toEqual(['security-engineering'])
      expect((await p.find({ key: 'ext-reply' }))?.text).toBe('Engine: demo selects security-engineering; any approval is withdrawn.')
      expect(await p.find({ key: 'ext-remove:cli-tooling' })).toBeUndefined()
      // + extension lists the enabled ones not selected; a disabled (present only) one is not offered.
      await p.press({ key: 'ext-add' })
      const offered = (await p.findAll({ type: 'Button' })).map((b: any) => b.props.key ?? b.key).filter((k: string) => /^ext-pick:/.test(k))
      expect(offered.sort()).toEqual(['ext-pick:backend-engineering', 'ext-pick:cli-tooling'])
      await p.press({ key: 'ext-pick:backend-engineering' })
      expect(w.engineCalls('select').at(-1)).toEqual(['select', 'demo', '--extension', 'security-engineering', '--extension', 'backend-engineering'])
      expect((await held($)).extensions).toEqual(['security-engineering', 'backend-engineering'])
      expect(await p.find({ key: 'ext-pick' })).toBeUndefined()
      await p.unmount()
    })

  test('the engine\'s refusal is shown under the chips and toasted', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'ext-add' })
    // Disabled by hand after the pane was drawn: the engine refuses the selection.
    const d = doc(w)
    d.extensions['backend-engineering'].enabled = false
    w.files.set(CONFIG, JSON.stringify(d))
    await p.press({ key: 'ext-pick:backend-engineering' })
    expect((await p.find({ key: 'ext-reply' }))?.text).toBe('Engine refused: Extension not enabled: backend-engineering')
    expect(w.toasts.some(t => /^Refused · Extension not enabled/.test(t))).toBe(true)
    expect(w.extensions).toEqual(['cli-tooling'])
    await p.unmount()
  })

  for (const surface of SURFACES)
    test(`outside exploring (${surface}): chips are read-only text, with nothing to press`, async ($, on) => {
      const { w } = world(on, exploring(['cli-tooling']))
      await start($)
      const p = await pane($, surface, 105)
      expect(await p.find({ key: 'ext-remove:cli-tooling' })).toBeDefined()
      await step($, w, () => {
        w.phase = 'draft'
        w.syncChange()
      })
      await refresh($)
      // Redrawn for Validate: the chip is text and there is no control; a press on it reaches nothing.
      expect((await p.find({ key: 'ext-chips' }))?.text).toBe('◇ cli-tooling')
      expect(await p.find({ key: 'ext-cli-tooling' })).toBeDefined()
      expect(await p.find({ key: 'ext-remove:cli-tooling' })).toBeUndefined()
      expect(await p.find({ key: 'ext-add' })).toBeUndefined()
      await expect(p.press({ key: 'ext-remove:cli-tooling' })).rejects.toThrow(/no Button/)
      expect(w.engineCalls('select')).toEqual([])
      expect(w.extensions).toEqual(['cli-tooling'])
      await p.unmount()
    })

  test('a press that reaches the core after the change left exploring is refused there; select never runs', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105)
    // The engine moved on (another terminal) before this session's snapshot saw it.
    w.phase = 'draft'
    w.syncChange()
    await p.press({ key: 'ext-remove:cli-tooling' })
    expect(w.engineCalls('select')).toEqual([])
    expect(w.extensions).toEqual(['cli-tooling'])
    expect(w.toasts.some(t => /^Refused · demo is draft/.test(t))).toBe(true)
    await p.unmount()
  })
})

describe('the Extensions card in Settings (AC-47, AC-48)', () => {
  for (const surface of SURFACES)
    test(`lists every extension of .workflow/extensions/ with its description and On/Off (${surface})`, async ($, on) => {
      world(on, exploring(['cli-tooling']))
      await start($)
      for (const columns of surface === 'terminal' ? [40, 105] : [45, 105]) {
        const p = await pane($, surface, columns, SETTINGS)
        const card = (await p.find({ key: 'extensions' }))!
        for (const id of ['ai-engineering', 'backend-engineering', 'cli-tooling', 'security-engineering']) expect(await p.find({ key: `ext-toggle:${id}` })).toBeDefined()
        expect((await p.find({ key: 'ext-toggle:ai-engineering' }))!.props.label).toBe('Off')
        expect((await p.find({ key: 'ext-toggle:cli-tooling' }))!.props.label).toBe('On')
        const text = paint(card as never, columns).lines.join('\n')
        if (columns >= 100) {
          expect(text).toMatch(/Scope and evaluate a model capability\./)
          expect(text).toMatch(/Selected by demo\./)
        }
        const painted = paint(await p.drawn(), columns)
        expect(painted.issues.filter(i => i.kind === 'split' || i.kind === 'overflow'), `${surface} ${columns}`).toEqual([])
        await p.unmount()
      }
    })

  test('On writes extensions.<id>.enabled and its path, nothing else; Off flips only enabled', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const before = doc(w)
    const p = await pane($, 'terminal', 105, SETTINGS)
    await p.press({ key: 'ext-toggle:ai-engineering' })
    const after = doc(w)
    expect(after.extensions['ai-engineering']).toEqual({ enabled: true, path: '.workflow/extensions/ai-engineering' })
    delete after.extensions['ai-engineering']
    expect(after).toEqual(before)
    expect(Object.keys(doc(w))).toEqual(Object.keys(before))
    expect((await p.find({ key: 'ext-toggle:ai-engineering' }))!.props.label).toBe('On')
    expect(paint((await p.find({ key: 'extensions' })) as never, 105).lines.join('\n')).toMatch(/ai-engineering enabled in \.workflow\/config\.json\./)
    // Enabling is not selecting: the change's selection is untouched, the pane now offers it.
    expect(w.extensions).toEqual(['cli-tooling'])
    expect(w.engineCalls('select')).toEqual([])
    expect((await held($)).enabledExtensions).toEqual(['ai-engineering', 'backend-engineering', 'cli-tooling', 'security-engineering'])
    // Off on one no change selects: only its flag changes (its path and every other key kept).
    const mid = doc(w)
    await p.press({ key: 'ext-toggle:backend-engineering' })
    const off = doc(w)
    expect(off.extensions['backend-engineering']).toEqual({ enabled: false, path: '.workflow/extensions/backend-engineering' })
    off.extensions['backend-engineering'].enabled = true
    expect(off).toEqual(mid)
    await p.unmount()
  })

  test('disabling one a change not yet archived selects is refused before anything is written, naming the change', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    // Another open change selects security-engineering too.
    w.files.set(`${ROOT}/.workflow/changes/other-change/state.json`, JSON.stringify({ schema_version: 2, id: 'other-change', phase: 'applying', extensions: ['security-engineering', 'cli-tooling'] }))
    // An archived one does not count.
    w.files.set(`${ROOT}/.workflow/changes/old-change/state.json`, JSON.stringify({ schema_version: 2, id: 'old-change', phase: 'archived', extensions: ['backend-engineering'] }))
    await start($)
    const text = w.files.get(CONFIG)
    const p = await pane($, 'terminal', 105, SETTINGS)
    await p.press({ key: 'ext-toggle:cli-tooling' })
    expect(w.files.get(CONFIG)).toBe(text)
    expect(w.ran).not.toContain('set-extension')
    const status = paint((await p.find({ key: 'ext-status' })) as never, 105).lines.join(' ')
    expect(status).toMatch(/Not saved: cli-tooling stays enabled: changes demo, other-change select it/)
    expect((await p.find({ key: 'ext-toggle:cli-tooling' }))!.props.label).toBe('On')
    await p.press({ key: 'ext-toggle:security-engineering' })
    expect(w.files.get(CONFIG)).toBe(text)
    expect(paint((await p.find({ key: 'ext-status' })) as never, 105).lines.join(' ')).toMatch(/security-engineering stays enabled: change other-change selects it/)
    // Not selected by any live change (only an archived one): disabling goes through.
    await p.press({ key: 'ext-toggle:backend-engineering' })
    expect(doc(w).extensions['backend-engineering'].enabled).toBe(false)
    await p.unmount()
  })

  test('a change that selects it while the press is on its way: refused under the lock, nothing written', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    w.beforeExtensionSave = () => w.files.set(`${ROOT}/.workflow/changes/late-change/state.json`, JSON.stringify({ id: 'late-change', phase: 'exploring', extensions: ['backend-engineering'] }))
    const text = w.files.get(CONFIG)
    const p = await pane($, 'terminal', 105, SETTINGS)
    await p.press({ key: 'ext-toggle:backend-engineering' })
    expect(w.ran).toContain('set-extension')
    expect(w.files.get(CONFIG)).toBe(text)
    expect(paint((await p.find({ key: 'ext-status' })) as never, 105).lines.join(' ')).toMatch(/backend-engineering stays enabled: change late-change selects it/)
    await p.unmount()
  })

  test('a config edited elsewhere since it was drawn is not overwritten', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105, SETTINGS)
    const d = doc(w)
    d.custom = { keep: [3] }
    w.files.set(CONFIG, JSON.stringify(d))
    const text = w.files.get(CONFIG)
    await p.press({ key: 'ext-toggle:ai-engineering' })
    expect(w.files.get(CONFIG)).toBe(text)
    expect(paint((await p.find({ key: 'ext-status' })) as never, 105).lines.join(' ')).toMatch(/changed elsewhere; reload/)
    await p.unmount()
  })

  test('the list and the refusal, pure', () => {
    const list = projectExtensionsOf(
      { extensions: { a: { enabled: true }, gone: { enabled: true }, 'Bad Id': { enabled: true } } },
      { a: { id: 'a', description: ' A thing. ' }, b: { id: 'b' }, c: { id: 'not-c' } },
      { a: ['x', 'w'] },
    )
    expect(list).toEqual([
      { id: 'a', description: 'A thing.', enabled: true, present: true, selectedBy: ['w', 'x'] },
      { id: 'b', description: null, enabled: false, present: true, selectedBy: [] },
      { id: 'gone', description: null, enabled: true, present: false, selectedBy: [] },
    ])
    expect(disableRefusal('a', [])).toBeNull()
    expect(disableRefusal('a', ['z'])).toMatch(/^a stays enabled: change z selects it\./)
    expect(disableRefusal('a', ['z', 'y'])).toMatch(/^a stays enabled: changes y, z select it\./)
  })
})

describe('a person\'s press only (AC-49)', () => {
  const ATTEMPT = { change_id: 'demo', extensions: ['backend-engineering'], extension: 'backend-engineering', id: 'ai-engineering', enabled: false, action: 'extension-set' }

  test('a model-originated selection change: no mod tool selects, whatever it is asked', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    expect(w.registeredTools.length).toBeGreaterThan(0)
    expect(w.registeredTools.filter(t => /select|extension|config|enable/i.test(t))).toEqual([])
    for (const name of [...w.registeredTools, 'stip_select', 'stip_extensions', 'stip_extension_set'])
      await $.tool.call({ tool: P + name, ...ATTEMPT, action: 'extensions-select' } as never).catch(() => undefined)
    expect(w.engineCalls('select')).toEqual([])
    expect(w.extensions).toEqual(['cli-tooling'])
    expect((await held($)).extensions).toEqual(['cli-tooling'])
  })

  test('a model-originated enable or disable: no mod tool writes the project config', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const text = w.files.get(CONFIG)
    for (const name of [...w.registeredTools, 'stip_extension_set', 'stip_settings'])
      for (const enabled of [true, false]) await $.tool.call({ tool: P + name, ...ATTEMPT, enabled } as never).catch(() => undefined)
    expect(w.files.get(CONFIG)).toBe(text)
    expect(w.ran).not.toContain('set-extension')
  })

  test('a press another plugin or a surface module raised is not the person\'s', () => {
    expect(isPersonPress({ plugin: 'engine', tier: 'core' })).toBe(true)
    expect(isPersonPress({ plugin: 'other-mod', tier: 'user' })).toBe(false)
    expect(isPersonPress({ plugin: 'other-mod', tier: 'prepend' })).toBe(false)
    expect(isPersonPress({ plugin: 'client', tier: 'user' })).toBe(false)
    expect(isPersonPress({ plugin: 'engine', tier: 'user' })).toBe(false)
    expect(isPersonPress(undefined)).toBe(false)
    for (const key of ['ext-add', 'ext-remove:a', 'ext-pick:a', 'ext-toggle:a']) expect(EXTENSION_KEYS.test(key)).toBe(true)
    for (const key of ['approve:x', 'ext-chips', 'extensions', 'ext-reply']) expect(EXTENSION_KEYS.test(key)).toBe(false)
    expect(NOT_PERSON.length).toBeLessThanOrEqual(60)
  })

  test('the person\'s own press (raised by the engine) is the one that acts', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'desktop', 105)
    await p.press({ key: 'ext-remove:cli-tooling' })
    expect(w.engineCalls('select')).toEqual([['select', 'demo']])
    expect(w.toasts).not.toContain(NOT_PERSON)
    await p.unmount()
  })
})

describe('attempt 2 corrections', () => {
  test('D1: Settings Save after an extension On/Off press is not refused and keeps the unsaved draft', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105, SETTINGS)
    // An unsaved edit first (Workers 2 → 3), then the toggle that rewrites config.json.
    await p.press({ key: 'max_workers-inc' })
    await p.press({ key: 'ext-toggle:ai-engineering' })
    expect(doc(w).extensions['ai-engineering'].enabled).toBe(true)
    expect(paint(await p.drawn(), 105).lines.join('\n')).toMatch(/Unsaved · 1 change/)
    await p.press({ key: 'settings-save' })
    const lines = paint(await p.drawn(), 105).lines.join('\n')
    expect(lines).not.toMatch(/changed elsewhere|Not saved/)
    expect(lines).toMatch(/Saved the project scope\./)
    const after = doc(w)
    expect(after.orchestration.clients['claude-code'].defaults.max_workers).toBe(3)
    expect(after.extensions['ai-engineering']).toEqual({ enabled: true, path: '.workflow/extensions/ai-engineering' })
    await p.unmount()
  })

  test('D1: the harness save refuses a revision that no longer matches the files, as the real save does', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105, SETTINGS)
    await p.press({ key: 'max_workers-inc' })
    // Someone else edits the project config after the tab was drawn.
    w.files.set(CONFIG, w.files.get(CONFIG)!.replace('"keep"', '"kept"'))
    await p.press({ key: 'settings-save' })
    expect(paint(await p.drawn(), 105).lines.join('\n')).toMatch(/Not saved: Settings changed elsewhere/)
    expect(doc(w).custom).toEqual({ kept: [1, 2] })
    await p.unmount()
  })

  for (const surface of SURFACES)
    test(`D2: the bound Settings tab shows the chips under its header too (${surface})`, async ($, on) => {
      world(on, x => {
        catalog(x)
        x.extensions = LONG
        x.syncChange()
      })
      await start($)
      for (const columns of surface === 'terminal' ? [40, 80, 140] : [45, 140]) {
        const p = await pane($, surface, columns, SETTINGS)
        const tree = JSON.stringify(await p.drawn())
        expect(tree.indexOf('"key":"head"')).toBeLessThan(tree.indexOf('"key":"ext-chips"'))
        expect(tree.indexOf('"key":"ext-chips"')).toBeLessThan(tree.indexOf('"key":"scopes"'))
        const painted = paint((await p.find({ key: 'ext-chips' })) as never, columns)
        expect(painted.issues).toEqual([])
        const line = painted.lines[0]!.trim()
        const shown = LONG.filter(id => line.includes(`◇ ${id}`))
        const more = /\+(\d+)/.exec(line)
        expect(shown.length + (more ? Number(more[1]) : 0)).toBe(LONG.length)
        if (columns >= 140) expect(more).toBeNull()
        await p.unmount()
      }
    })

  for (const surface of SURFACES)
    test(`D3: while exploring, +n lists every chip so a hidden one can be removed (${surface})`, async ($, on) => {
      const { w } = world(on, exploring(LONG))
      await start($)
      const columns = surface === 'terminal' ? 40 : 45
      const p = await pane($, surface, columns)
      const last = LONG.at(-1)!
      // At this width the last chip is collapsed into +n.
      expect(await p.find({ key: `ext-remove:${last}` })).toBeUndefined()
      await p.press({ key: 'ext-more' })
      for (const id of LONG) expect(await p.find({ key: `ext-remove:${id}` })).toBeDefined()
      const painted = paint((await p.find({ key: 'ext-chips' })) as never, columns)
      expect(painted.issues).toEqual([])
      await p.press({ key: `ext-remove:${last}` })
      expect(w.engineCalls('select').at(-1)).toEqual(['select', 'demo', ...LONG.slice(0, -1).flatMap(id => ['--extension', id])])
      // ▴ folds them back.
      await p.press({ key: 'ext-more' })
      expect(await p.find({ key: `ext-remove:${LONG.at(-2)!}` })).toBeUndefined()
      await p.unmount()
    })

  test('D3/A: outside exploring the +n expands a read-only list (no remove buttons)', async ($, on) => {
    world(on, x => {
      catalog(x)
      x.extensions = LONG
      x.syncChange()
    })
    await start($)
    const p = await pane($, 'terminal', 40)
    expect((await p.find({ key: 'ext-more' }))?.type).toBe('Button')
    await p.press({ key: 'ext-more' })
    for (const id of LONG) expect(await p.find({ key: `ext-${id}` })).toBeDefined()
    expect(JSON.stringify(await p.drawn())).not.toContain('"key":"ext-remove:')
    expect(paint((await p.find({ key: 'ext-chips' })) as never, 40).issues).toEqual([])
    await p.unmount()
  })

  test('D7: the engine reply is dropped when the change leaves exploring; it does not come back', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling', 'security-engineering']))
    await start($)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'ext-add' })
    await p.press({ key: 'ext-remove:cli-tooling' })
    expect(await p.find({ key: 'ext-reply' })).toBeDefined()
    await step($, w, () => ((w.phase = 'draft'), w.syncChange()))
    await refresh($)
    await step($, w, () => ((w.phase = 'exploring'), w.syncChange()))
    await refresh($)
    expect(await p.find({ key: 'ext-chips' })).toBeDefined()
    expect(await p.find({ key: 'ext-reply' })).toBeUndefined()
    expect(await p.find({ key: 'ext-pick' })).toBeUndefined()
    await p.unmount()
  })

  test('D8: + extension lists long ids whole, one per line, when they do not fit on one', async ($, on) => {
    const LONGID = 'observability-and-incident-response'
    world(on, x => {
      catalog(x)
      x.addExtension(LONGID, 'Long one.', true)
      x.phase = 'exploring'
      x.approvalCurrent = false
      x.extensions = ['cli-tooling']
      x.syncChange()
    })
    await start($)
    for (const [surface, columns] of [['terminal', 40], ['desktop', 45], ['terminal', 140]] as const) {
      const p = await pane($, surface, columns)
      // The list stays open across drawings (pane UI state): open it once.
      if (!(await p.find({ key: 'ext-pick' }))) await p.press({ key: 'ext-add' })
      const painted = paint((await p.find({ key: 'ext-pick' })) as never, columns)
      expect(painted.issues).toEqual([])
      expect(painted.lines.join('\n')).not.toContain('…')
      expect(painted.lines.join('\n')).toContain(`+ ${LONGID}`)
      expect(painted.lines.length).toBe(columns >= 140 ? 1 : 3)
      await p.unmount()
    }
  })

  // A plugin loaded beside the mod that tries to press Stip's buttons from one of its hooks (it runs
  // in its own environment: what happened comes back as the tool's result).
  const PRESSER = {
    name: 'presser',
    register: ((o: any) => {
      o('tool.call', { tool: 'PressProbe' }, async ($$: any) => {
        try {
          await $$.ui.press({ plugin: 'stipulate', key: 'ext-remove:cli-tooling' })
          return { result: 'pressed' }
        } catch (err) {
          return { result: String(err) }
        }
      })
    }) as never,
  }
  test('AC-49: another plugin cannot raise a press on Stip\'s buttons; the selection is unchanged', { plugins: [PRESSER] } as never, (async ($: any, on: On) => {
    const { w } = world(on, exploring(['cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 105)
    const r = await $.tool.call({ tool: 'PressProbe' } as never)
    expect(String(r.result)).not.toBe('pressed')
    expect(String(r.result)).toMatch(/press/)
    expect(w.engineCalls('select')).toEqual([])
    expect(w.extensions).toEqual(['cli-tooling'])
    await p.unmount()
  }) as never)

  // --- Attempt 3 (A, B) ---
  const HUGE = 'observability-incident-response-and-reliability-x'
  const HUGE_WORD = 'a'.repeat(60)
  const huge = (phase: string, selected: string[]) => (x: World) => {
    catalog(x)
    x.addExtension(HUGE, 'Long.', true)
    x.addExtension(HUGE_WORD, 'Longer.', true)
    x.phase = phase
    x.approvalCurrent = phase !== 'exploring'
    x.extensions = selected
    x.syncChange()
  }
  for (const [surface, columns] of [['terminal', 40], ['desktop', 45], ['terminal', 24]] as const)
    test(`A: a long id never makes a chip wider than the pane, collapsed or expanded (${surface} ${columns})`, async ($, on) => {
      const { w } = world(on, huge('exploring', [HUGE, 'cli-tooling', HUGE_WORD]))
      await start($)
      const p = await pane($, surface, columns)
      const check = async () => {
        const painted = paint((await p.find({ key: 'ext-chips' })) as never, columns)
        expect(painted.issues).toEqual([])
        expect(painted.lines.filter(l => [...l].length > columns)).toEqual([])
        // The whole pane too (24 is below the header's own floor, which predates the chips).
        if (columns >= 40) expect(paint(await p.drawn(), columns).issues.filter(i => i.kind === 'overflow' || i.kind === 'split')).toEqual([])
      }
      await check()
      await p.press({ key: 'ext-more' })
      await check()
      // Shortened, the chip still removes the whole id.
      expect((await p.find({ key: `ext-remove:${HUGE}` }))?.text).toMatch(/^◇ observability\S*… ✕$/)
      await p.press({ key: `ext-remove:${HUGE}` })
      expect(w.engineCalls('select').at(-1)).toEqual(['select', 'demo', '--extension', 'cli-tooling', '--extension', HUGE_WORD])
      await p.unmount()
    })

  for (const surface of SURFACES)
    test(`A: read-only, a lone long id shows as a shortened chip, not +1 (${surface}), and in Settings`, async ($, on) => {
      world(on, huge('applying', [HUGE]))
      await start($)
      const columns = surface === 'terminal' ? 40 : 45
      for (const title of ['Stip', SETTINGS]) {
        const p = await pane($, surface, columns, title)
        const chips = (await p.find({ key: 'ext-chips' }))!.text as string
        expect(chips).toMatch(/^◇ observability-.*…$/)
        expect(chips).not.toMatch(/\+1/)
        expect(paint((await p.find({ key: 'ext-chips' })) as never, columns).issues).toEqual([])
        await p.unmount()
      }
    })

  test('A: in Settings, +n expands the read-only list too', async ($, on) => {
    world(on, huge('applying', [HUGE, HUGE_WORD, 'cli-tooling']))
    await start($)
    const p = await pane($, 'terminal', 40, SETTINGS)
    expect(await p.find({ key: 'ext-cli-tooling' })).toBeUndefined()
    await p.press({ key: 'ext-more' })
    for (const id of [HUGE, HUGE_WORD, 'cli-tooling']) expect(await p.find({ key: `ext-${id}` })).toBeDefined()
    expect(paint((await p.find({ key: 'ext-chips' })) as never, 40).issues).toEqual([])
    await p.unmount()
  })

  test('B: the engine reply is hidden once the selection is no longer the one it was about', async ($, on) => {
    const { w } = world(on, exploring(['cli-tooling', 'security-engineering']))
    await start($)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'ext-remove:cli-tooling' })
    expect((await p.find({ key: 'ext-reply' }))?.text).toMatch(/selects security-engineering/)
    // The coordinator selects again while the change still explores.
    await step($, w, () => {
      w.extensions = ['security-engineering', 'backend-engineering']
      w.syncChange()
    })
    await refresh($)
    expect(await p.find({ key: 'ext-remove:backend-engineering' })).toBeDefined()
    expect(await p.find({ key: 'ext-reply' })).toBeUndefined()
    // A refusal is about the selection that stayed: shown while it stays.
    const d = doc(w)
    d.extensions['cli-tooling'].enabled = false
    w.files.set(CONFIG, JSON.stringify(d))
    await p.press({ key: 'ext-add' })
    await p.press({ key: 'ext-pick:cli-tooling' })
    expect((await p.find({ key: 'ext-reply' }))?.text).toMatch(/^Engine refused: Extension not enabled: cli-tooling/)
    await p.unmount()
  })
})
