// Ledger states and motion (AC-35..AC-38): every pane state as ledger-states.html draws it, on the
// terminal and the desktop; the motion setting (auto, calm, off), one-shots once per event, the
// running clock and review pulse, the typing hold; + New; plain titles, the glyph ruler, no em dash.
import { describe, expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellsColor, cellsText, DEFAULT_COLOR, DIM_COLOR } from '../../hooks/ui/motion.ts'
import { MARK_GLYPH, paneView, rulerMarks, rulerRows } from '../../hooks/ui/model.ts'
import { emptySnapshot } from '../../hooks/core/snapshot.ts'
import { DIGEST, ROOT, TASKS, World, install, launch } from '../core/harness.ts'
import { tailPath } from '../../hooks/ui/pane.tsx'
import { paint } from './paint.ts'

const P = 'mcp__stipulate__'
const VIEWPORT = { columns: 200, rows: 60, isFullscreen: true }
const SURFACES = ['terminal', 'desktop'] as const
const SETTINGS = 'Stip · Settings'

type Seen = { blits: { key: string; cells: string }[]; open: Map<string, string> }

function world(on: On, setup?: (w: World) => void) {
  const w = new World()
  // Jobs start at the mock clock's time, so running clocks count from 0.
  w.jobStamp = new Date(1_000_000).toISOString()
  setup?.(w)
  const seen: Seen = { blits: [], open: new Map() }
  const clock = install(on, w)
  on('ui.status', () => ({ value: undefined }) as never)
  on('ui.open', ($, e) => (seen.open.set(e.id, e.title ?? e.id), { value: { isPlaced: true } }) as never)
  on('ui.close', ($, e) => (seen.open.delete(e.id), { value: undefined }) as never)
  on('ui.panes', () => ({ value: [...seen.open].map(([id, title]) => ({ id, title, isShown: true, isFocused: false, isPlaced: true })) }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  on('ui.blit', ($, e) => (seen.blits.push({ key: String((e as { key: string }).key), cells: String((e as { cells?: string }).cells ?? '') }), { value: {} }) as never)
  on('classic.PermissionRequest', () => ({}) as never)
  return { w, clock, seen }
}

const start = ($: any) => $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
const tool = ($: any, name: string, args: Record<string, unknown> = {}) => $.tool.call({ tool: P + name, ...args } as never)
const delegate = async ($: any, task: string) => launch($, JSON.parse(String((await tool($, 'stip_delegate', { change_id: 'demo', task_id: task })).result)))
const finish = ($: any, agentId: string, answer = 'Done; tests pass.') => $.turn.complete({ answer, durationMs: 5, isAborted: false, turnId: 't', agentId, reason: 'answer' } as never)
const accept = ($: any, task: string) => tool($, 'stip_contribution', { change_id: 'demo', task_id: task, decision: 'accepted', reason: 'Checked the work myself.' })
const refresh = ($: any) => $.command.run({ command: 'stip-action', args: JSON.stringify({ action: 'refresh' }), origin: { kind: 'plugin', name: 'stipulate' } } as never)
/** A lifecycle step the coordinator runs (a Bash call, as a session does). */
const step = async ($: any, w: World, change: () => void) => {
  w.bashEffect = change
  await $.tool.call({ tool: 'Bash', command: 'python3 workflow.py step demo' } as never)
  w.bashEffect = null
}
const edit = ($: any, text: string, inputText: string) =>
  ($ as any).prompt.edit({ origin: { kind: 'composer' }, text, cursor: text.length, start: text.length, end: text.length, inputText } as never)
const pane = ($: any, surface: string, columns: number, title = 'Stip') =>
  $.ui.mount({ plugin: 'stipulate', surface, component: 'Pane', requestId: 'stipulate', props: { title, isFocused: true, bodyColumns: columns, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} }, viewport: VIEWPORT })
const text = async (p: any, key: string) => (await p.find({ key }))?.text as string | undefined
const lines = async (p: any, columns: number) => paint(await p.drawn(), columns).lines
const withMotion = (motion: 'auto' | 'calm' | 'off') => (w: World) =>
  w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ schema_version: 1, extensions: {}, orchestration: { clients: { 'claude-code': { ui: { motion } } } } }))

const PROPOSAL = `# Upload read timeout

## Problem

A stalled upload holds its bucket's write lock until the client disconnects, blocking other writes to that bucket.

## Findings (classified)

- **established**: No socket timeout in nimbus/api.py.
- **established**: The bucket lock is held for the whole body read.
- **incomplete**: Default timeout of the standard library server.

## Decisions and open questions

- D1 Read timeout per request. Recommended: 30 s, configurable.
- D2 Reply when it fires. Recommended: 408 and release the lock.
- Q1 Limit concurrent uploads per bucket? Recommended: out of scope for now.
`

// --- Worlds for each state, driven through the core as a session would ---

/** A project without .workflow/ yet. */
function bare(w: World) {
  for (const f of [...w.files.keys()]) if (f.startsWith(`${ROOT}/.workflow`)) w.files.delete(f)
  w.syncChange = () => {}
  w.files.set(`${ROOT}/pyproject.toml`, '[tool.pytest.ini_options]\n')
  w.files.set(`${ROOT}/AGENTS.md`, '# rules')
}

/** Archived history: follow-ups and an accepted spec. */
function history(w: World) {
  w.files.set(
    `${ROOT}/.workflow/archive/presigned-uploads-quotas/proposal.md`,
    '# Presigned uploads\n\n## Follow-ups\n\n- Upload read timeout: stalled uploads hold the bucket lock.\n- JSON errors for over-long requests: 414 and 431 come back as plain pages.\n',
  )
  w.files.set(`${ROOT}/.workflow/archive/presigned-uploads-quotas/execution-summary.json`, JSON.stringify({ archived_at: '2026-10-08T15:45:33+00:00', tasks: [] }))
  w.files.set(`${ROOT}/.workflow/specs/presigned-uploads-quotas.md`, '# Q\n\n- AC-1: a\n- AC-2: b\n')
  w.commits['.workflow/archive/presigned-uploads-quotas'] = 'c0e4c6c'
}

/** No change open (New change). */
function unbound(w: World) {
  history(w)
  w.hasChange = false
  w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
  w.files.delete(`${ROOT}/.workflow/changes/demo/spec.md`)
}

const SIX = '# Demo\n\n## Acceptance criteria\n\n' + Array.from({ length: 6 }, (_, i) => `- AC-${i + 1}: Criterion number ${i + 1} holds.`).join('\n') + '\n'

async function toExplore($: any, w: World) {
  w.phase = 'exploring'
  w.approvalCurrent = false
  w.files.set(`${ROOT}/.workflow/changes/demo/proposal.md`, PROPOSAL)
  w.syncChange()
  await start($)
  const r = JSON.parse(String((await tool($, 'stip_research', { question: 'How do other servers time out slow clients?', change_id: 'demo', title: 'Slow-client timeouts' })).result))
  await launch($, r)
  await refresh($)
}

async function toValidate($: any, w: World) {
  w.userDigest = null
  w.approvalCurrent = false
  w.phase = 'draft'
  w.syncChange()
  await start($)
}

async function toApply($: any, w: World) {
  w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ schema_version: 1, extensions: {}, orchestration: { clients: { 'claude-code': { roles: { backend: { model: 'claude-opus-5-5', effort: 'low' }, frontend: { model: 'claude-opus-5-5', effort: 'low' } } } } } }))
  await start($)
  await delegate($, 'core')
  await delegate($, 'ui')
  await finish($, 'agent-2')
  for (const f of ['api.py', 'storage.py']) await $.tool.call({ tool: 'Read', file_path: `${ROOT}/src/core/${f}`, agentId: 'agent-1' } as never)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/core/api.py`, old_string: 'a', new_string: 'b', agentId: 'agent-1' } as never)
  await refresh($)
}

async function toCheck($: any, w: World) {
  w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, SIX)
  w.tasks = [
    { ...TASKS[0]!, criteria: ['AC-1', 'AC-2'] },
    { ...TASKS[1]!, criteria: ['AC-3', 'AC-4'] },
    { ...TASKS[2]!, criteria: ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5'] },
    { id: 'docs', role: 'documentation', phase: 'docs', objective: 'Document it', criteria: ['AC-6'], depends_on: ['verify'], write_paths: ['README.md'], read_paths: [] },
  ]
  w.syncChange()
  await start($)
  let n = 1
  for (const task of ['core', 'ui']) {
    await delegate($, task)
    await finish($, `agent-${n++}`)
    await accept($, task)
  }
  await delegate($, 'verify')
  await $.tool.call({ tool: 'Bash', command: 'pytest -k "AC-2" tests/', agentId: 'agent-3' } as never)
  await step($, w, () => w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-1: passed — slow client got 408 after 30.0 s\n- AC-6: pending-docs — README documents it\n'))
  await refresh($)
}

async function toDocs($: any, w: World) {
  await toCheck($, w)
  await finish($, 'agent-3')
  await accept($, 'verify')
  await step($, w, () => {
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n' + [1, 2, 3, 4, 5].map(i => `- AC-${i}: passed — checked`).join('\n') + '\n- AC-6: pending-docs — README documents it\n')
    w.phase = 'checked'
    w.syncChange()
  })
  await delegate($, 'docs')
  await refresh($)
}

/** The bound change archived in this session (the engine moved it under archive/ and committed). */
async function toArchive($: any, w: World) {
  history(w)
  await start($)
  const dir = `${ROOT}/.workflow/archive/demo`
  w.files.set(`${dir}/state.json`, JSON.stringify({ id: 'demo', phase: 'archived', created_at: '2026-10-08T10:00:00+00:00', updated_at: '2026-10-08T10:38:00+00:00' }))
  w.files.set(
    `${dir}/execution-summary.json`,
    JSON.stringify({
      archived_at: '2026-10-08T10:38:00+00:00',
      tasks: [
        { task_id: 'core', attempt: 1, actual_model: 'claude-opus-5-5', effort: 'low' },
        { task_id: 'ui', attempt: 2, actual_model: 'claude-opus-5-5', effort: 'low' },
        { task_id: 'verify', attempt: 1, actual_model: 'claude-fable-5-1', effort: 'medium' },
      ],
    }),
  )
  w.files.set(`${dir}/spec.md`, '- AC-1: a\n- AC-2: b\n')
  w.files.set(`${dir}/evidence.md`, '- AC-1: passed — x\n- AC-2: passed — y\n')
  w.files.set(`${dir}/proposal.md`, '# Demo change\n\n## Follow-ups\n\n- Limit concurrent uploads per bucket\n- TLS before other teams use the API\n')
  w.commits['.workflow/archive/demo'] = '4f2a9c1'
  w.hasChange = false
  w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
  w.files.delete(`${ROOT}/.workflow/changes/demo/spec.md`)
  await refresh($)
}

type State = { name: string; setup?: (w: World) => void; to: ($: any, w: World) => Promise<void>; order: string[]; has: RegExp[] }

const STATES: State[] = [
  { name: 'Setup', setup: bare, to: start, order: ['head', 'setup', 'found'], has: [/Stip isn't set up here yet/, /Set up Stip/, /starts \/stip-bootstrap in your prompt/, /Python, tests with pytest/, /AGENTS\.md is kept as it is/] },
  { name: 'New change', setup: unbound, to: start, order: ['head', 'start', 'followups', 'specs'], has: [/Start a change/, /Describe a change/, /Follow-ups from earlier reviews/, /Upload read timeout/, /Accepted specs/, /presigned-uploads-quotas/, /commit c0e4c6c/] },
  { name: 'Explore', to: toExplore, order: ['head', 'stages', 'problem', 'findings', 'helpers', 'decisions'], has: [/Problem/, /A stalled upload holds/, /Confirmed/, /Open/, /Research/, /Slow-client timeouts/, /Decisions for you/, /Recommended: 30 s, configurable/, /Answer in your prompt\./] },
  { name: 'Validate', to: toValidate, order: ['head', 'stages', 'approval', 'graph'], has: [/Ready for your approval/, /Approve/, /2 criteria and 3 tasks/, /Plan and assignees/] },
  { name: 'Apply', to: toApply, order: ['head', 'stages', 'waiting', 'who', 'graph', 'criteria'], has: [/Waiting for you/, /Tasks/, /claude-test · ○ low · editing api\.py/, /Reading api\.py · Reading storage\.py · Editing api\.py/, /Plan/, /Criteria/] },
  { name: 'Check', to: toCheck, order: ['head', 'stages', 'review', 'criteria'], has: [/Independent review/, /AC-1 ✓/, /slow client got 408 after 30\.0 s/, /AC-6 ◌/, /waiting on docs/] },
  { name: 'Docs', to: toDocs, order: ['head', 'stages', 'docs', 'criteria'], has: [/Documentation/, /Edits README\.md/, /5 of 6/, /AC-6: Criterion number 6 holds, waiting on docs/] },
  { name: 'Archive', to: toArchive, order: ['head', 'stages', 'archived-line', 'archived', 'models', 'archive-followups', 'archive-cta'], has: [/✓ demo/, /archived, commit 4f2a9c1/, /2 of 2 passed/, /3, one needed a correction/, /38 min from explore to archive/, /Models used/, /Fable 5\.1/, /Limit concurrent uploads per bucket/, /Start next change/] },
]

// The em dash and the retired section titles (built from words, so this file does not hold them).
const FORBIDDEN = [/—/, new RegExp(['Who', 'runs', 'what'].join(' ')), new RegExp(['Who', 'ran', 'what'].join(' '))]

describe('every state as the preview draws it (AC-35)', () => {
  for (const st of STATES)
    for (const surface of SURFACES)
      test(`${st.name} (${surface}): content in the validated order, whole at every width, no em dash or old title`, async ($, on) => {
        const { w, clock } = world(on, st.setup)
        await st.to($, w)
        // One-shots of the way there are over (the Setup scan plays the first time the pane shows).
        const first = await pane($, surface, 80)
        await clock.advance(3_000)
        await first.unmount()
        const widths = surface === 'terminal' ? [40, 50, 80, 105, 140] : [45, 105]
        for (const columns of widths) {
          const p = await pane($, surface, columns)
          const tree = JSON.stringify(await p.drawn())
          const at = st.order.map(k => tree.indexOf(`"key":"${k}"`))
          expect(at.every(i => i >= 0), `${st.name} ${surface} ${columns}: ${st.order.join(', ')} → ${at.join(', ')}`).toBe(true)
          expect([...at].sort((a, b) => a - b)).toEqual(at)
          const painted = paint(await p.drawn(), columns)
          const all = painted.lines.join('\n')
          if (columns >= 80) for (const re of st.has) expect(all, `${st.name} ${surface} ${columns}`).toMatch(re)
          for (const re of FORBIDDEN) expect(all).not.toMatch(re)
          expect(painted.issues.filter(i => i.kind === 'split' || i.kind === 'overflow'), `${st.name} ${surface} ${columns}`).toEqual([])
          if (surface === 'terminal') expect(painted.lines.filter(l => [...l].length > columns), `${st.name} ${columns}`).toEqual([])
          await p.unmount()
        }
      })

  test('Setup: no band, no tools; Set up puts /stip-bootstrap in the prompt with the ✎ marker', async ($, on) => {
    const { w, clock } = world(on, bare)
    await start($)
    expect(w.registeredCommands.sort()).toEqual(['stip', 'stip-action'])
    const band = await $.ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 110, scroll: { offset: 0, bodyRows: 5 }, view: {} }, viewport: VIEWPORT })
    expect(await band.find({ key: 'stip-band' })).toBeUndefined()
    await band.unmount()
    const p = await pane($, 'terminal', 80)
    // The found items come in one by one.
    expect(await text(p, 'found-hd')).toContain('scanning')
    await clock.advance(1_500)
    expect(await text(p, 'found-hd')).toBe('Found in this project4 found')
    await p.press({ key: 'setup' })
    expect(w.prompts).toEqual(['/stip-bootstrap'])
    await clock.advance(1_000)
    expect(await text(p, 'setup-cta-handoff')).toBe('✎ /stip-bootstrap  in your prompt, press Enter')
    await p.unmount()
  })

  test('/stip-settings is registered once .workflow/ appears during the session', async ($, on) => {
    const { w } = world(on, bare)
    await start($)
    expect(w.registeredCommands).not.toContain('stip-settings')
    w.bashEffect = () => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ schema_version: 1, extensions: {} }))
    await $.tool.call({ tool: 'Bash', command: 'python3 workflow.py init' } as never)
    await refresh($)
    expect(w.registeredCommands).toContain('stip-settings')
  })

  test('the state follows the lifecycle', () => {
    const base = { ...emptySnapshot([], 0, 'demo'), phase: 'applying' as const }
    expect(paneView({ ...emptySnapshot([], 0), setup: { project: '~/p', code: null, tests: null, git: { repo: false, branch: null, clean: null }, rules: [], ci: null } })).toBe('setup')
    expect(paneView(emptySnapshot([], 0))).toBe('start')
    expect(paneView({ ...base, phase: 'exploring' })).toBe('explore')
    expect(paneView({ ...base, phase: 'draft' })).toBe('validate')
    expect(paneView(base)).toBe('apply')
    expect(paneView({ ...base, check: { reviewer: 'verify', criterion: null, reportAt: null } })).toBe('check')
    expect(paneView({ ...base, phase: 'checked' })).toBe('docs')
    expect(paneView({ ...emptySnapshot([], 0), archived: { changeId: 'x' } as never })).toBe('archive')
  })
})

describe('+ New (AC-37)', () => {
  for (const surface of SURFACES)
    test(`next to the picker (hotkey n), puts /stip-explore in the prompt and keeps the change open (${surface})`, async ($, on) => {
      const { w, clock } = world(on)
      await start($)
      const p = await pane($, surface, 105)
      const btn = await p.find({ key: 'new' })
      expect(btn?.props.label).toBe('+ New')
      expect(btn?.props.hotkey).toBe('n')
      // Beside the change picker, in the header's left group.
      const title = JSON.stringify(await p.find({ key: 'title' }))
      expect(title.indexOf('"key":"picker"')).toBeLessThan(title.indexOf('"key":"new"'))
      await p.press({ key: 'new' })
      expect(w.prompts.at(-1)).toBe('/stip-explore ')
      expect((await refresh($)).text).toContain('"changeId":"demo"')
      await clock.advance(1_000)
      expect(await text(p, 'handoff')).toBe('✎ /stip-explore  in your prompt, press Enter')
      // The marker goes after a while.
      await clock.advance(8_000)
      expect(await p.find({ key: 'handoff' })).toBeUndefined()
      await p.unmount()
    })

  test('a draft in the prompt is kept: the command goes to a notice, the marker says so', async ($, on) => {
    const { w, clock } = world(on)
    await start($)
    w.draft = 'half a thought'
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'new' })
    expect(w.draft).toBe('half a thought')
    expect(w.notices().at(-1)).toContain('/stip-explore')
    await clock.advance(1_000)
    expect(await text(p, 'handoff')).toContain('not put in your prompt')
    await p.unmount()
  })

  test('New change: Describe a change and a follow-up\'s Start change; Archive: Start next change', async ($, on) => {
    const { w } = world(on, unbound)
    await start($)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'new-from:Upload read timeout' })
    expect(w.prompts.at(-1)).toBe('/stip-explore Upload read timeout')
    w.draft = ''
    await p.press({ key: 'new' })
    expect(w.prompts.at(-1)).toBe('/stip-explore ')
    await p.unmount()
  })
})

describe('titles and the criteria ruler (AC-38)', () => {
  test('Tasks, Models used and Models by role; no em dash in the settings tab either', async ($, on) => {
    const { w } = world(on)
    await start($)
    await delegate($, 'core')
    for (const surface of SURFACES) {
      const p = await pane($, surface, 105)
      expect(await text(p, 'who-hd')).toMatch(/^Tasks/)
      await p.unmount()
      const s = await pane($, surface, 105, SETTINGS)
      expect(await text(s, 'roles-hd')).toMatch(/^Models by role/)
      const all = paint(await s.drawn(), 105).lines.join('\n')
      for (const re of FORBIDDEN) expect(all).not.toMatch(re)
      await s.unmount()
    }
    void w
  })

  test('glyphs ✓ ✗ ◌ · over AC labels, wrapped by whole marks', () => {
    const crit = (id: string, status: string, pendingDocs = false) => ({ id, title: id, titleSource: 'fallback', text: '', status, pendingDocs, proof: null }) as never
    const marks = rulerMarks([crit('AC-1', 'passed'), crit('AC-2', 'failed'), crit('AC-3', 'unverified', true), crit('AC-4', 'pending'), crit('AC-10', 'unverified')])
    expect(marks.map(m => m.glyph).join('')).toBe('✓✗◌··')
    expect(MARK_GLYPH).toEqual({ passed: '✓', failed: '✗', docs: '◌', open: '·' })
    const { cell, rows } = rulerRows(marks, 20)
    expect(cell).toBe(6)
    expect(rows.map(r => r.map(m => m.id))).toEqual([['AC-1', 'AC-2', 'AC-3'], ['AC-4', 'AC-10']])
  })
})

describe('motion (AC-36)', () => {
  test('auto: Approve seals the contract frame by frame, then the seam fills into Apply', async ($, on) => {
    const { w, clock } = world(on)
    await toValidate($, w)
    const p = await pane($, 'terminal', 105)
    const d8 = DIGEST.slice(0, 8)
    await p.press({ key: `approve:${DIGEST.slice(0, 12)}` })
    expect(w.approvalCurrent).toBe(true)
    const frames: string[] = [(await text(p, 'seal'))!]
    for (let i = 0; i < 3; i++) {
      await clock.advance(100)
      frames.push((await text(p, 'seal'))!)
    }
    expect(frames).toEqual([`[ approve ${d8} ]`, `[  ·  ${d8}  ]`, `⟦ ${d8} ⟧`, `⟦${d8}⟧ sealedapproved by you`])
    // Still the Validate state while the seal holds; then Apply, its seam filling before the stage lights.
    expect(await p.find({ key: 'approval' })).toBeDefined()
    await clock.advance(400)
    expect(await p.find({ key: 'approval' })).toBeUndefined()
    const stage = async () => JSON.stringify(await p.find({ key: 'stage-Apply' }))
    expect(await stage()).toContain('┄┄')
    expect(await stage()).not.toContain('backgroundColor')
    await clock.advance(100)
    expect(await stage()).toMatch(/"─".*"┄"/)
    await clock.advance(300)
    expect(await stage()).toContain('──')
    expect(await stage()).toContain('"backgroundColor":"suggestion"')
    await p.unmount()
  })

  for (const motion of ['calm', 'off'] as const)
    test(`${motion}: no in-between frames; Approve lands on Apply at once`, async ($, on) => {
      const { w } = world(on, withMotion(motion))
      await toValidate($, w)
      const p = await pane($, 'terminal', 105)
      await p.press({ key: `approve:${DIGEST.slice(0, 12)}` })
      expect(await p.find({ key: 'seal' })).toBeUndefined()
      expect(await p.find({ key: 'approval' })).toBeUndefined()
      const stage = JSON.stringify(await p.find({ key: 'stage-Apply' }))
      expect(stage).toContain('──')
      expect(stage).toContain('"backgroundColor":"suggestion"')
      await p.unmount()
    })

  test('auto: the archived change folds into one line with its commit, then the summary', async ($, on) => {
    const { w, clock } = world(on, history)
    await start($)
    const p = await pane($, 'terminal', 80)
    const dir = `${ROOT}/.workflow/archive/demo`
    w.files.set(`${dir}/state.json`, JSON.stringify({ id: 'demo', phase: 'archived', created_at: '2026-10-08T10:00:00+00:00', updated_at: '2026-10-08T10:38:00+00:00' }))
    w.files.set(`${dir}/execution-summary.json`, JSON.stringify({ archived_at: '2026-10-08T10:38:00+00:00', tasks: [{ task_id: 'core', attempt: 1, actual_model: 'claude-opus-5-5', effort: 'low' }] }))
    w.files.set(`${dir}/spec.md`, '- AC-1: a\n')
    w.files.set(`${dir}/evidence.md`, '- AC-1: passed — x\n')
    w.files.set(`${dir}/proposal.md`, '# Demo\n')
    w.commits['.workflow/archive/demo'] = '4f2a9c1'
    w.hasChange = false
    w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
    await refresh($)
    const seen: string[] = []
    const shot = async () => {
      const fold = await p.find({ key: 'fold' })
      const kept = fold ? (await p.findAll({ type: 'Text' })).filter((t: any) => /criteria passed|tasks,|Opus/.test(t.text)).length : -1
      seen.push(fold ? `card ${kept}` : (await p.find({ key: 'archived' })) ? 'summary' : (await p.find({ key: 'archived-line' })) ? 'line' : '?')
    }
    await shot()
    for (const ms of [900, 100, 100, 100, 300, 500]) {
      await clock.advance(ms)
      await shot()
    }
    expect(seen).toEqual(['card 3', 'card 2', 'card 1', 'card 0', 'line', 'line', 'summary'])
    expect(await text(p, 'archived-line')).toBe('✓ demoarchived, commit 4f2a9c1')
    await p.unmount()
  })

  test('auto: a verdict lands on the ruler (· → • → ✓ bold → ✓) once', async ($, on) => {
    const { w, clock } = world(on)
    await toCheck($, w)
    await clock.advance(3_000)
    const p = await pane($, 'terminal', 105)
    const mark = async () => {
      const m = await p.find({ key: 'mark-AC-3' })
      return `${(m?.text ?? '').trim()}${JSON.stringify(m).includes('"bold":true') ? '!' : ''}`
    }
    expect(await mark()).toBe('·')
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, w.files.get(`${ROOT}/.workflow/changes/demo/evidence.md`)! + '- AC-3: passed — 200 uploads, no timeouts\n')
    await refresh($)
    const frames = [await mark()]
    for (let i = 0; i < 4; i++) {
      await clock.advance(100)
      frames.push(await mark())
    }
    expect(frames).toEqual(['·', '•', '✓!', '✓', '✓'])
    // The proof line came in.
    expect(await text(p, 'ev-AC-3')).toContain('200 uploads, no timeouts')
    await p.unmount()
  })

  test('terminal: running clocks and the review pulse repaint through $.ui.blit, not redraws', async ($, on) => {
    const { w, clock, seen } = world(on)
    await toCheck($, w)
    await clock.advance(3_000)
    const p = await pane($, 'terminal', 105)
    const drawn = JSON.stringify(await p.drawn())
    expect(drawn).toContain('"key":"clock:verify"')
    expect(drawn).toContain('"key":"pulse:AC-2"')
    seen.blits.length = 0
    await clock.advance(1_000)
    const clocks = seen.blits.filter(b => b.key === 'clock:verify').map(b => cellsText(b.cells).trim())
    expect(clocks.length).toBeGreaterThan(0)
    expect(clocks.at(-1)).toBe('4s')
    const pulses = seen.blits.filter(b => b.key === 'pulse:AC-2').map(b => cellsColor(b.cells))
    expect(new Set(pulses)).toEqual(new Set([DEFAULT_COLOR, DIM_COLOR]))
    expect(cellsText(seen.blits.find(b => b.key === 'pulse:AC-2')!.cells)).toBe('·')
    await p.unmount()
  })

  test('desktop: the clock is text redrawn each second; the pulse toggles at 1 Hz', async ($, on) => {
    const { w, clock } = world(on)
    await toCheck($, w)
    await clock.advance(3_000)
    const p = await pane($, 'desktop', 105)
    expect(JSON.stringify(await p.drawn())).not.toContain('"type":"Raster"')
    const meta = async () => text(p, 'meta-verify')
    const before = await meta()
    expect(before).toMatch(/· 3s$/)
    const dims: boolean[] = []
    for (let i = 0; i < 4; i++) {
      dims.push(JSON.stringify(await p.find({ key: 'mark-AC-2' })).includes('"dimColor":true'))
      await clock.advance(500)
    }
    expect(await meta()).not.toBe(before)
    expect(new Set(dims)).toEqual(new Set([true, false]))
    await p.unmount()
  })

  test('off: final states only; the clock does not tick and nothing pulses', async ($, on) => {
    const { w, clock, seen } = world(on, withMotion('off'))
    await toCheck($, w)
    const p = await pane($, 'terminal', 105)
    const drawn = JSON.stringify(await p.drawn())
    expect(drawn).not.toContain('"type":"Raster"')
    seen.blits.length = 0
    await clock.advance(2_000)
    expect(seen.blits).toEqual([])
    await p.unmount()
  })

  test('typing: one-shots wait while the person types, then play; nothing repeats meanwhile', async ($, on) => {
    const { w, clock, seen } = world(on)
    await toValidate($, w)
    const p = await pane($, 'terminal', 105)
    await edit($, '', 'h')
    await p.press({ key: `approve:${DIGEST.slice(0, 12)}` })
    const d8 = DIGEST.slice(0, 8)
    expect(await text(p, 'seal')).toBe(`[ approve ${d8} ]`)
    await clock.advance(1_000)
    // Held on its first frame while typing.
    expect(await text(p, 'seal')).toBe(`[ approve ${d8} ]`)
    seen.blits.length = 0
    // The typing pause ends (1.5 s after the last edit): the seal plays.
    await clock.advance(600)
    const after = await text(p, 'seal')
    await clock.advance(100)
    expect([after, await text(p, 'seal')]).toContain(`[  ·  ${d8}  ]`)
    await clock.advance(1_500)
    expect(await p.find({ key: 'approval' })).toBeUndefined()
    await p.unmount()
  })

  test('a task whose last dependency is accepted lights up once, in its row and the graph', async ($, on) => {
    const { w, clock } = world(on)
    await start($)
    await delegate($, 'core')
    await delegate($, 'ui')
    await finish($, 'agent-1')
    await finish($, 'agent-2')
    await accept($, 'core')
    const p = await pane($, 'terminal', 105)
    await accept($, 'ui')
    const name = async () => JSON.stringify((await p.find({ key: 'row-verify' })) ?? null)
    expect(await name()).toContain('"color":"suggestion"')
    const node = async () => (await p.findAll({ type: 'Text' })).some((t: any) => /│ verify │/.test(t.text) && t.props?.bold === true)
    expect(await node()).toBe(true)
    await clock.advance(700)
    expect(await name()).not.toContain('"color":"suggestion"')
    expect(await node()).toBe(false)
    await p.unmount()
  })

  test('changed criteria settle once (bright, bold, plain), the ± kept', async ($, on) => {
    const { w, clock } = world(on)
    await toValidate($, w)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: `approve:${DIGEST.slice(0, 12)}` })
    await clock.advance(2_000)
    // The coordinator revises the contract: AC-2 reworded, ui removed; the approval no longer holds.
    await step($, w, () => {
      w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, '# Demo\n\n## Acceptance criteria\n\n- AC-1: The core works.\n- AC-2: The UI shows it clearly.\n')
      w.tasks = w.tasks.filter(t => t.id !== 'ui')
      w.contractDigest = 'ff'.padEnd(64, '1')
      w.approvalCurrent = false
      w.phase = 'draft'
      w.syncChange()
    })
    await refresh($)
    const look = async () => {
      const t = await p.find({ key: 'diff-AC-2' })
      const j = JSON.stringify(t)
      return `${t?.text}|${j.includes('"bold":true') ? 'bold' : ''}${j.includes('"color":"suggestion"') ? '+bright' : ''}`
    }
    const seen = [await look()]
    for (const ms of [400, 400, 400]) {
      await clock.advance(ms)
      seen.push(await look())
    }
    expect(seen.map(x => x.split('|')[1])).toEqual(['bold+bright', 'bold', '', ''])
    expect(seen.every(x => x.startsWith('± AC-2 '))).toBe(true)
    expect(await text(p, 'diff-t-ui')).toBe('− task ui, now out of the plan')
    await p.unmount()
  })

  test('typing pauses the clock and the pulse; they resume after', async ($, on) => {
    const { w, clock, seen } = world(on)
    await toCheck($, w)
    await clock.advance(3_000)
    const p = await pane($, 'terminal', 105)
    await edit($, '', 'h')
    seen.blits.length = 0
    await clock.advance(1_000)
    expect(seen.blits).toEqual([])
    await clock.advance(2_000)
    expect(seen.blits.some(b => b.key === 'clock:verify')).toBe(true)
    await p.unmount()
  })

  test('settings: Motion picker (Auto, Calm, Off) kept in the draft and saved', async ($, on) => {
    const { w } = world(on)
    await start($)
    for (const surface of SURFACES) {
      const s = await pane($, surface, 105, SETTINGS)
      const picker = await s.find({ key: 'motion' })
      expect((picker?.props.options as { label: string }[]).map(o => o.label)).toEqual(['(Auto)', 'Auto', 'Calm', 'Off'])
      await s.unmount()
    }
    const s = await pane($, 'terminal', 105, SETTINGS)
    await s.select({ key: 'motion', value: 'calm' })
    expect(await text(s, 'status')).toBe('Unsaved · 1 change')
    await s.press({ key: 'settings-save' })
    expect(JSON.parse(w.files.get(`${ROOT}/.workflow/config.json`)!).orchestration.clients['claude-code'].ui).toEqual({ motion: 'calm' })
    expect((await refresh($)).text).toContain('"motion":"calm"')
    await s.unmount()
  })

  test('a launch put in the prompt gets the ✎ marker too', async ($, on) => {
    const { w, clock } = world(on)
    await start($)
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'delegate:core' })
    expect(w.prompts.at(-1)).toMatch(/^Launch the reserved Stipulate worker/)
    await clock.advance(1_000)
    expect(await text(p, 'handoff')).toBe('✎ launch core  in your prompt, press Enter')
    await p.unmount()
  })
})

describe('ASCII renders at 80 columns (terminal)', () => {
  for (const name of ['Explore', 'Apply', 'Archive'])
    test(name, async ($, on) => {
      const st = STATES.find(s => s.name === name)!
      const { w, clock } = world(on, st.setup)
      await st.to($, w)
      await clock.advance(3_000)
      const p = await pane($, 'terminal', 80)
      ;(globalThis as { console?: { log: (s: string) => void } }).console?.log(`\n----- ${name} (terminal, 80) -----\n${(await lines(p, 80)).join('\n')}\n-----`)
      await p.unmount()
    })
})

describe('attempt 2: actions without transcript, step phrases, problem items, setup header', () => {
  test('presses act through the core\'s request state, not a slash command; a typed /stip-action still works', async ($, on) => {
    const { w } = world(on)
    const requests: string[] = []
    on('state.set', { plugin: 'stipulate', key: 'request' }, ($, e: any, next) => (requests.push(String(e.value?.action?.action)), next(e)))
    const commands: string[] = []
    on('command.run', ($, e: any) => (commands.push(e.command), { text: '' }) as never)
    await start($)
    await delegate($, 'core')
    await delegate($, 'ui')
    await finish($, 'agent-1')
    await finish($, 'agent-2')
    const p = await pane($, 'terminal', 105)
    await p.press({ key: 'accept:core' })
    expect(w.latest('core')!.acceptance).toBe('accepted')
    expect(requests).toContain('accept')
    expect(commands.filter(c => c === 'stip-action')).toEqual([])
    // A refusal comes back with the same reply shape (toasted).
    w.failOn = 'review'
    await p.press({ key: 'accept:ui' })
    expect(w.said().some(t => /^Refused · /.test(t))).toBe(true)
    await p.unmount()
    const typed = await $.command.run({ command: 'stip-action', args: JSON.stringify({ action: 'refresh' }), origin: { kind: 'composer' } } as never)
    expect(JSON.parse(String(typed.text)).ok).toBe(true)
  })

  test('the trail reads as phrases, older ones dropped first, never cut mid-word', async ($, on) => {
    const { w, clock } = world(on)
    await toApply($, w)
    await clock.advance(3_000)
    for (const columns of [40, 50, 80, 140]) {
      const p = await pane($, 'terminal', columns)
      const trail = paint((await p.find({ key: 'trail-core' }))!, columns - 4)
      expect(trail.issues.filter(i => i.kind === 'split' || i.kind === 'overflow' || i.kind === 'cut')).toEqual([])
      const shown = trail.lines.join(' ')
      expect(shown).toMatch(/Editing api\.py$/)
      if (columns >= 80) expect(shown).toBe('Reading api.py · Reading storage.py · Editing api.py')
      if (columns === 40) expect(shown).not.toContain('Reading api.py')
      await p.unmount()
    }
  })

  test('a Problem section that opens with a list draws its lead line and the items', async ($, on) => {
    const { w, clock } = world(on)
    w.phase = 'exploring'
    w.approvalCurrent = false
    w.files.set(`${ROOT}/.workflow/changes/demo/proposal.md`, '# T\n\n## Problem\n\nUploads stall in three ways:\n\n- the bucket lock is held\n- no read timeout\n- no reply when it fires\n')
    w.syncChange()
    await start($)
    await clock.advance(1_000)
    for (const surface of SURFACES) {
      const p = await pane($, surface, 80)
      const problem = await text(p, 'problem')
      expect(problem).toContain('no read timeout')
      expect(await p.find({ key: 'problem-item-2' })).toBeDefined()
      expect(await p.find({ key: 'problem-text' })).toBeUndefined()
      await p.unmount()
    }
  })

  test('Setup: a long project path keeps ◆ Stip together and shortens with …/ at segment boundaries', async ($, on) => {
    const long = '~/Documents/Projects/clients/very-long-client-name/monorepo/services/upload-gateway-v2/api-and-workers'
    expect(long.length).toBeGreaterThan(95)
    expect(tailPath(long, 40)).toBe('…/upload-gateway-v2/api-and-workers')
    expect(tailPath(long, 73)).toBe('…/monorepo/services/upload-gateway-v2/api-and-workers')
    expect(tailPath(long, 200)).toBe(long)
    expect(tailPath('/a/an-extremely-long-final-segment-name', 20)).toBe('…/an-extremely-long…')
    // The pane's header: the mark never shrinks, the path takes what is left on the one line.
    const { clock } = world(on, bare)
    await start($)
    await clock.advance(2_000)
    for (const columns of [24, 40]) {
      const p = await pane($, 'terminal', columns)
      const head = await p.find({ key: 'head' })
      expect(JSON.stringify(head)).toContain('"key":"mark","flexShrink":0')
      expect(paint(head!, columns).lines).toEqual([`◆ Stip ${ROOT}`])
      await p.unmount()
    }
  })
})

