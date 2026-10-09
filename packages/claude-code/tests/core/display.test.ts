// Attempt 7: display data for the interface (labels, criteria, helpers, change picker), /stip-resync
// top-level diffs, and short coalesced toasts.
import { describe, expect, test } from 'claude-code/testing'

import { cleanLabel, fallbackLabel, parseCriteria, parseEvidence } from '../../hooks/core/criteria.ts'
import { COALESCE_MS, TOAST_MAX, coalesce, toastText } from '../../hooks/core/notify.ts'
import { ROOT, World, install, interfaceOf, launch, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const status = async ($: any) => parse(await call($, P + 'stip_status')).snapshot

describe('criteria parsing (pure)', () => {
  test('keeps continuation lines and nested lists, indented or right after a colon', () => {
    const spec = [
      '## Acceptance criteria',
      '',
      '- AC-1: Short one.',
      '- AC-15: The README documents:',
      '  - install',
      '  - use, with',
      '    a wrapped line',
      '- AC-16: Docs cover:',
      '- the settings',
      '- the limits',
      '',
      'Unrelated prose.',
      '- AC-17: Last',
      '  continued.',
      '',
      '## Notes',
    ].join('\n')
    const parsed = parseCriteria(spec)
    expect(parsed.map(c => c.id)).toEqual(['AC-1', 'AC-15', 'AC-16', 'AC-17'])
    expect(parsed[1]!.text).toBe('The README documents:\n- install\n- use, with\n  a wrapped line')
    expect(parsed[2]!.text).toBe('Docs cover:\n- the settings\n- the limits')
    expect(parsed[3]!.text).toBe('Last\ncontinued.')
  })

  test('evidence lines give each criterion a status', () => {
    const ev = parseEvidence('# Evidence\n\n- AC-1: passed — tests/test_x.py green\n- AC-2: failed — no output\n- AC-3: unverified — needs a human\n')
    expect(ev['AC-1']).toEqual({ status: 'passed', evidence: 'tests/test_x.py green' })
    expect(ev['AC-2']!.status).toBe('failed')
    expect(ev['AC-3']!.status).toBe('unverified')
  })

  test('labels: heuristic fallback and model output validation', () => {
    expect(fallbackLabel('`workflow.py runtime` provides reserve, confirm, settle and show')).toBe('Workflow.py runtime provides')
    expect(fallbackLabel('The README documents the install and the use of the mod').length).toBeLessThanOrEqual(32)
    expect(cleanLabel('"Runtime subcommands with JSON."')).toBe('Runtime subcommands with JSON')
    expect(cleanLabel('Label: Approval by person')).toBe('Approval by person')
    expect(cleanLabel('One')).toBeNull()
    expect(cleanLabel('This label has far too many words in it')).toBeNull()
    expect(cleanLabel('A'.repeat(41) + ' b')).toBeNull()
  })
})

describe('criteria and labels in the snapshot', () => {
  test('full text, evidence status, fallback labels until the model labels arrive; each text labelled once', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, '# Demo\n\n## Acceptance criteria\n\n- AC-1: The core works.\n- AC-2: The UI shows:\n  - tasks\n  - workers\n')
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-1: passed — unit tests green\n')
    const clock = install(on, w)
    await start($)
    let snap = await status($)
    expect(snap.criteria).toHaveLength(2)
    expect(snap.criteria[1]).toMatchObject({ id: 'AC-2', text: 'The UI shows:\n- tasks\n- workers', status: 'pending', titleSource: 'fallback' })
    expect(snap.criteria[0]).toMatchObject({ id: 'AC-1', status: 'passed', evidence: 'unit tests green' })
    expect(snap.criteria[0].title.length).toBeLessThanOrEqual(32)
    await clock.advance(3_000)
    expect(w.completions).toHaveLength(2) // two criteria, at most two at a time
    snap = await status($)
    expect(snap.criteria[0]).toMatchObject({ title: 'Core works label', titleSource: 'model' })
    // Further refreshes and ticks never ask again for the same text.
    await clock.advance(3_000)
    await status($)
    await clock.advance(3_000)
    expect(w.completions).toHaveLength(2)
  })

  test('a rejected model label is retried once, then the fallback is kept for good', async ($, on) => {
    const w = new World()
    w.labelReply = () => 'this answer is far too long to be a label at all'
    const clock = install(on, w)
    await start($)
    await status($)
    await clock.advance(3_000)
    await clock.advance(3_000)
    const asked = w.completions.length
    await clock.advance(3_000)
    await status($)
    await clock.advance(3_000)
    expect(w.completions.length).toBe(asked)
    expect((await status($)).criteria[0].titleSource).toBe('model') // the stored fallback, never asked again
  })

  test('helpers carry the coordinator\'s title, else a generated label', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const titled = parse(await call($, P + 'stip_research', { question: 'Where is the cache configured?', title: 'Cache location', change_id: 'demo' }))
    await launch($, titled)
    const plain = parse(await call($, P + 'stip_research', { question: 'Which tests cover quotas?', change_id: 'demo' }))
    await launch($, plain)
    let helpers = (await status($)).helpers
    expect(helpers.find((h: any) => h.helperId === titled.helper_id)).toMatchObject({ title: 'Cache location', titleSource: 'explicit' })
    expect(helpers.find((h: any) => h.helperId === plain.helper_id).titleSource).toBe('fallback')
    // Two labels per tick: the two criteria first, then the helper's question.
    await clock.advance(3_000)
    await clock.advance(3_000)
    helpers = (await status($)).helpers
    expect(helpers.find((h: any) => h.helperId === plain.helper_id)).toMatchObject({ title: 'Cache location question', titleSource: 'model' })
    const bad = await call($, P + 'stip_research', { question: 'q?', title: 'x'.repeat(41) })
    expect(String(bad.deny)).toMatch(/title must be 2 to 40 characters/)
  })
})

describe('change picker', () => {
  test('lists the project\'s changes with title, approval, activity and archived count; bind switches at once', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/changes/demo/proposal.md`, '# Demo feature\n\n## Problem\n')
    w.files.set(`${ROOT}/.workflow/changes/other/state.json`, JSON.stringify({ schema_version: 2, id: 'other', phase: 'draft' }))
    w.files.set(`${ROOT}/.workflow/changes/other/proposal.md`, '# Other work\n')
    w.files.set(`${ROOT}/.workflow/archive/old-one/state.json`, JSON.stringify({ phase: 'archived' }))
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    await $.command.run({ command: 'stip-bind', args: 'demo', origin: { kind: 'composer' } } as never)
    let snap = await status($)
    expect(snap.archivedCount).toBe(1)
    expect(snap.changes).toEqual([
      { id: 'demo', phase: 'applying', title: 'Demo feature', approval: 'approved', activeWorkers: 0, inFlight: false, finished: false, bound: true },
      { id: 'other', phase: 'draft', title: 'Other work', approval: 'none', activeWorkers: 0, inFlight: false, finished: false, bound: false },
    ])
    // The pane's change picker: open it, pick the change.
    await press($, 'picker')
    expect((await press($, 'bind:other'))!.value.changeId).toBe('other')
    snap = parse(await call($, P + 'stip_status')).snapshot
    expect(snap.changeId).toBe('other')
    expect(snap.changes.find((c: any) => c.id === 'other').bound).toBe(true)
  })
})

describe('/stip-resync lists top-level registry changes', () => {
  test('a contract_digest change is shown (shortened), not "(formatting only)"', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
    const r = JSON.parse(w.files.get(REG)!)
    r.contract_digest = 'f9aeff0c' + '1'.repeat(56)
    w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
    await clock.advance(10_000)
    const shown = await $.command.run({ command: 'stip-resync', args: '', origin: { kind: 'composer' } } as never)
    expect(shown.text).toContain('contract_digest: ab12cd34 -> f9aeff0c')
    expect(shown.text).not.toContain('formatting only')
  })
})

describe('toasts', () => {
  test('short, unprefixed, no paths or digests, at most 60 characters', () => {
    const t = toastText('stipulate: .workflow/.runtime/presigned-uploads-quotas/state.json was changed outside this Claude Code session; restored the last good state abc123def4567890abc')
    expect(t.startsWith('stipulate')).toBe(false)
    expect(t).not.toContain('/')
    expect(t.length).toBeLessThanOrEqual(TOAST_MAX)
  })

  test('identical toasts within 30 s coalesce into one with ×N', () => {
    let s = coalesce({}, 'registry', 'Registry restored · outside change undone', 0)
    expect(s.text).toBe('Registry restored · outside change undone')
    s = coalesce(s.state, 'registry', 'Registry restored · outside change undone', 10_000)
    expect(s.text).toBe('Registry restored · outside change undone ×2')
    s = coalesce(s.state, 'registry', 'Registry restored · outside change undone', 20_000)
    expect(s.text).toBe('Registry restored · outside change undone ×3')
    s = coalesce(s.state, 'registry', 'Registry restored · outside change undone', 20_000 + COALESCE_MS)
    expect(s.text).toBe('Registry restored · outside change undone')
    expect(coalesce({}, 'k', 'x'.repeat(100), 0).text.length).toBeLessThanOrEqual(TOAST_MAX)
  })

  test('the core\'s toasts are short; the details go to a transcript notice', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    await start($)
    const REG = `${ROOT}/.workflow/.runtime/demo/state.json`
    for (let i = 0; i < 3; i++) {
      const r = JSON.parse(w.files.get(REG)!)
      r.note = `edit ${i}`
      w.files.set(REG, JSON.stringify(r, null, 2) + '\n')
      await clock.advance(10_000)
    }
    expect(w.toasts.every(t => t.length <= 60 && !t.startsWith('stipulate') && !t.includes('/'))).toBe(true)
    expect(w.toasts.at(-1)).toMatch(/^Registry restored · outside change undone ×3$/)
    expect(w.notices().some(n => n.includes('.workflow/.runtime/demo/state.json') && n.includes('/stip-resync'))).toBe(true)
  })
})
