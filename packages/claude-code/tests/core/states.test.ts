// The Ledger's pane states (AC-35, AC-36, AC-37): what the core puts in the snapshot for Setup,
// New change, Explore, Validate, Apply, Check and Archive, the motion setting and the typing flag.
import { describe, expect, test } from 'claude-code/testing'

import { stepPhrase } from '../../hooks/core/snapshot.ts'
import {
  archiveSummary,
  exploreTitle,
  problemSection,
  contractDiff,
  approvedContract,
  criterionIn,
  decisionsOf,
  findingsOf,
  followUpsOf,
  problemOf,
  pushStep,
  setupSummary,
  withProof,
} from '../../hooks/core/ledger.ts'
import { effective, validateClient } from '../../hooks/core/settings.ts'
import { ROOT, TASKS, World, delegateAndLaunch, install, interfaceOf, parse } from './harness.ts'

const P = 'mcp__stipulate__'
const start = async ($: any) => $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
const call = ($: any, tool: string, args: Record<string, unknown> = {}) => $.tool.call({ tool, ...args } as never)
const status = async ($: any) => parse(await call($, P + 'stip_status'))
type Press = ReturnType<typeof interfaceOf>
/** The snapshot after the pane's Refresh (a forced refresh, served through `request`). */
const snapshotOf = async ($: any, press: Press) => (await press($, 'refresh'))!.value
const edit = ($: any, text: string, inputText: string) =>
  $.prompt.edit({ origin: { kind: 'composer' }, text, cursor: text.length, start: text.length, end: text.length, inputText } as never)

const PROPOSAL = `# Upload read timeout

## Problem

A stalled upload holds its bucket's **write lock** until the client
disconnects, blocking other writes.

Second paragraph is not part of it.

## Findings (classified)

- **established**: No socket timeout in nimbus/api.py.
- **inferred**: The lock is held for the whole body read
  while the request streams.
- **incomplete**: Default timeout of the standard library server.
- **missing**: No load test.
- **not-applicable**: Accessibility.
- An unclassified note.

## Decisions and open questions

- D1 Read timeout per request. Recommended: 30 s, configurable.
- D2 Reply when it fires
  Recommended: 408 and release the lock
- Q1 Limit concurrent uploads per bucket?

## Follow-ups

- Upload read timeout: stalled uploads hold the bucket lock.
- JSON errors for over-long requests — 414 and 431 come back as plain pages.
- None.
`

describe('Ledger readers (pure)', () => {
  test('Explore reads problem, classified findings and decisions from proposal.md', () => {
    expect(problemOf(PROPOSAL)).toBe("A stalled upload holds its bucket's write lock until the client disconnects, blocking other writes.")
    expect(findingsOf(PROPOSAL)).toEqual([
      { kind: 'Confirmed', source: 'established', text: 'No socket timeout in nimbus/api.py.' },
      { kind: 'Likely', source: 'inferred', text: 'The lock is held for the whole body read while the request streams.' },
      { kind: 'Open', source: 'incomplete', text: 'Default timeout of the standard library server.' },
      { kind: 'Open', source: 'missing', text: 'No load test.' },
    ])
    expect(decisionsOf(PROPOSAL)).toEqual([
      { id: 'D1', text: 'Read timeout per request.', recommended: '30 s, configurable.', open: false },
      { id: 'D2', text: 'Reply when it fires', recommended: '408 and release the lock', open: false },
      { id: 'Q1', text: 'Limit concurrent uploads per bucket?', recommended: null, open: true },
    ])
    // Numbered decisions under a heading, and findings under class subheadings.
    const other = '## Decisions for you\n\n1. Keep the name\n2. Ship it\n   Recommended: yes\n\n## Findings\n\n### Established\n\n- A fact.\n\n### Inferred\n\n- A guess.\n'
    expect(decisionsOf(other)).toEqual([
      { id: '1', text: 'Keep the name', recommended: null, open: false },
      { id: '2', text: 'Ship it', recommended: 'yes', open: false },
    ])
    expect(findingsOf(other).map(f => [f.kind, f.text])).toEqual([['Confirmed', 'A fact.'], ['Likely', 'A guess.']])
    expect(problemOf('# T\n\nNo sections.')).toBe(null)
  })

  test('the problem is plain text: ticks, emphasis and links stripped; a list comes back as items', () => {
    expect(problemOf('## Problem\n\n`greet` and **`add`** are [wrong](docs/x.md).\n')).toBe('greet and add are wrong.')
    expect(problemSection('## Problem\n\n- `greet` returns `None`\n- **add** fails on\n  negative numbers\n\nMore.\n')).toEqual({
      text: 'greet returns None; add fails on negative numbers',
      items: ['greet returns None', 'add fails on negative numbers'],
    })
    expect(problemSection('## Problem\n\nTwo defects:\n\n1. `greet` is wrong\n2. `add` is wrong\n')).toEqual({ text: 'Two defects:', items: ['greet is wrong', 'add is wrong'] })
    expect(problemSection('## Problem\n\nOne line, `code_id` kept.\n')).toEqual({ text: 'One line, code_id kept.', items: [] })
  })

  test('each trail step reads as a short human phrase, never a bare tool name', () => {
    expect(stepPhrase('Read', { file_path: '/p/nimbus/api.py' })).toBe('Reading api.py')
    expect(stepPhrase('Edit', { file_path: '/p/cli.py' })).toBe('Editing cli.py')
    expect(stepPhrase('Bash', { command: 'cd /p && python3 -m pytest -q' })).toBe('Running tests')
    expect(stepPhrase('Bash', { command: 'npm run test' })).toBe('Running tests')
    expect(stepPhrase('Bash', { command: 'git diff --stat' })).toBe('Running git diff')
    expect(stepPhrase('Grep', { pattern: 'x' })).toBe('Searching the code')
    expect(stepPhrase('WebFetch', { url: 'https://www.nginx.org/en/docs' })).toBe('Reading nginx.org')
    expect(stepPhrase('ToolSearch')).toBe('Loading tools')
    expect(stepPhrase('mcp__github__create_issue')).toBe('Using github')
    expect(stepPhrase('NewThing')).toBe('Using new thing')
    expect(stepPhrase('Read')).toBe('Reading')
  })

  test('follow-ups come only from Follow-ups or Known limitations sections, with their source', () => {
    expect(followUpsOf(PROPOSAL, 'old-change')).toEqual([
      { title: 'Upload read timeout', detail: 'stalled uploads hold the bucket lock.', source: 'old-change' },
      { title: 'JSON errors for over-long requests', detail: '414 and 431 come back as plain pages.', source: 'old-change' },
    ])
    expect(followUpsOf('## Running and follow-up\n\n- not one\n\n## Known limitations\n\n- Bash is not sandboxed\n', 'x')).toEqual([
      { title: 'Bash is not sandboxed', detail: null, source: 'x' },
    ])
  })

  test('the contract diff names added, changed and removed criteria and tasks by id', () => {
    const spec = '## Acceptance criteria\n\n- AC-1: Stalled upload released.\n- AC-2: 408 reply.\n- AC-3: Old one.\n'
    const before = approvedContract('d1', '2026-10-08T00:00:00.000Z', spec, TASKS)
    const now = [
      { id: 'AC-1', text: 'Stalled upload released.', title: 'Stalled upload' },
      { id: 'AC-2', text: '408 reply and lock released.', title: '408 reply' },
      { id: 'AC-4', text: 'Logged once.', title: 'Logged once' },
    ]
    const tasks = [{ ...TASKS[0]!, objective: 'Build the core, revised' }, TASKS[2]!, { ...TASKS[1]!, id: 'docs' }]
    expect(contractDiff(before, now, tasks)).toEqual({
      since: 'd1',
      approvedAt: '2026-10-08T00:00:00.000Z',
      criteria: [
        { id: 'AC-2', change: 'changed', title: '408 reply' },
        { id: 'AC-3', change: 'removed', title: 'Old one' },
        { id: 'AC-4', change: 'added', title: 'Logged once' },
      ],
      addedTasks: ['docs'],
      changedTasks: ['core'],
      removedTasks: ['ui'],
    })
    expect(contractDiff(null, now, tasks)).toBe(null)
  })

  test('proof comes from the check report first, and pending-docs gives way to a later passed line', () => {
    const report = { 'AC-1': { status: 'passed' as const, text: 'slow client: 408 after 30 s', source: 'check' as const }, 'AC-2': { status: 'pending-docs' as const, text: 'README', source: 'check' as const } }
    const cs = [{ id: 'AC-1' }, { id: 'AC-2' }, { id: 'AC-3' }, { id: 'AC-4' }]
    let out = withProof(cs, report, '- AC-3: failed — no reply\n')
    expect(out.map(c => [c.id, c.proof?.status ?? null, c.proof?.source ?? null, c.pendingDocs])).toEqual([
      ['AC-1', 'passed', 'check', false],
      ['AC-2', 'pending-docs', 'check', true],
      ['AC-3', 'failed', 'evidence', false],
      ['AC-4', null, null, false],
    ])
    out = withProof(cs, report, '- AC-2: passed — README documents it\n')
    expect(out[1]).toMatchObject({ pendingDocs: false, proof: { status: 'passed', text: 'README documents it', source: 'evidence' } })
  })

  test('steps keep the last six; the criterion is named only when one AC id appears', () => {
    let steps = pushStep(undefined, { tool: 'Read', activity: 'reading a', at: 1 })
    for (let i = 2; i <= 8; i++) steps = pushStep(steps, { tool: 'Bash', activity: `running ${i}`, at: i })
    expect(steps.map(s => s.at)).toEqual([3, 4, 5, 6, 7, 8])
    expect(criterionIn({ command: 'pytest -k AC-3 tests/' })).toBe('AC-3')
    expect(criterionIn({ command: 'echo AC-3 AC-4' })).toBe(null)
    expect(criterionIn({ command: 'ls' })).toBe(null)
  })

  test('setup summary from manifests, git status and rule files', () => {
    const s = setupSummary({
      project: '/home/u/atlas',
      home: '/home/u',
      present: new Set(['pyproject.toml', 'conftest.py', 'AGENTS.md', '.github/workflows']),
      pyproject: '[project]\nrequires-python = ">=3.12"\n',
      gitStatus: '## main...origin/main\n',
    })
    expect(s).toEqual({ project: '~/atlas', code: 'Python 3.12', tests: 'pytest', git: { repo: true, branch: 'main', clean: true }, rules: ['AGENTS.md'], ci: '.github/workflows' })
    const js = setupSummary({ project: '/w', home: null, present: new Set(['package.json', 'tsconfig.json']), packageJson: '{"devDependencies":{"vitest":"1"}}', gitStatus: '## dev\n M a.ts\n' })
    expect(js).toMatchObject({ code: 'TypeScript', tests: 'vitest', git: { repo: true, branch: 'dev', clean: false }, rules: [], ci: null })
    expect(setupSummary({ project: '/w', home: null, present: new Set(), gitStatus: null })).toMatchObject({ code: null, tests: null, git: { repo: false, branch: null, clean: null } })
  })

  test('archive summary: criteria, tasks and corrections, duration, models, follow-ups', () => {
    const s = archiveSummary({
      id: 'upload-read-timeout',
      state: { created_at: '2026-10-08T10:00:00+00:00', phase: 'archived', updated_at: '2026-10-08T10:40:00+00:00' },
      summary: {
        archived_at: '2026-10-08T10:38:00+00:00',
        tasks: [
          { task_id: 'read-timeout', attempt: 1, actual_model: 'claude-opus-5-5', effort: 'low' },
          { task_id: 'wiring', attempt: 2, actual_model: null, requested_model: null, effort: null },
        ],
      },
      registry: { jobs: [{ task_id: 'wiring', attempt: 2, profile: { model: 'opus', effort: 'low' } }] },
      spec: '- AC-1: one\n- AC-2: two\n',
      evidence: '- AC-1: passed — ok\n- AC-2: pending-docs — README\n',
      proposal: '# Upload read timeout\n\n## Follow-ups\n\n- TLS before other teams use the API\n',
      commit: '4f2a9c1',
    })
    expect(s).toEqual({
      changeId: 'upload-read-timeout',
      title: 'Upload read timeout',
      commit: '4f2a9c1',
      createdAt: '2026-10-08T10:00:00+00:00',
      archivedAt: '2026-10-08T10:38:00+00:00',
      durationMs: 38 * 60_000,
      criteria: { passed: 1, total: 2 },
      tasks: { total: 2, corrections: 1, corrected: ['wiring'] },
      models: [
        { taskId: 'read-timeout', model: 'claude-opus-5-5', effort: 'low', attempts: 1 },
        { taskId: 'wiring', model: 'opus', effort: 'low', attempts: 2 },
      ],
      followUps: [{ title: 'TLS before other teams use the API', detail: null, source: 'upload-read-timeout' }],
    })
  })

  test('ui.motion is validated and defaults to auto (AC-36)', () => {
    expect(effective({}).motion).toBe('auto')
    expect(effective({ project: { ui: { motion: 'calm' } }, local: { ui: { motion: 'off' } } }).motion).toBe('off')
    expect(() => validateClient({ ui: { motion: 'fast' } })).toThrow(/ui.motion must be auto, calm or off/)
    expect(() => validateClient({ ui: { theme: 'x' } })).toThrow(/ui: unknown field theme/)
  })
})

/** An inline plugin that writes Stip's `request` state when its command runs (probing who may write it). */
const PROBE = {
  name: 'probe',
  register: ((on: any) => {
    on('session.start', async ($: any, e: any, next: any) => {
      await $.command.register({ name: 'probe-request', description: 'probe' })
      return next(e)
    })
    on('command.run', { command: 'probe-request' }, async ($: any, e: any) => {
      try {
        await $.state.set({ plugin: 'stipulate', key: 'request' }, JSON.parse(e.args))
        const got = await $.state.get({ plugin: 'stipulate', key: 'reply' })
        return { text: JSON.stringify(got.value ?? null) }
      } catch (err) {
        return { text: JSON.stringify({ refused: String((err as Error).message ?? err) }) }
      }
    })
  }) as never,
}
const probe = async ($: any, req: unknown) => JSON.parse(String((await $.command.run({ command: 'probe-request', args: JSON.stringify(req), origin: { kind: 'composer' } } as never)).text))

/** A world whose project has no .workflow/ yet. */
function bare(w: World) {
  for (const f of [...w.files.keys()]) if (f.startsWith(`${ROOT}/.workflow`)) w.files.delete(f)
  w.syncChange = () => {}
  return w
}

describe('Setup state (AC-35)', () => {
  test('without .workflow/: a read-only /stip, a setup summary, no tools, guards or engine calls', async ($, on) => {
    const w = bare(new World())
    w.baselined = false
    w.userDigest = null
    w.files.set(`${ROOT}/pyproject.toml`, '[tool.pytest.ini_options]\n')
    w.files.set(`${ROOT}/AGENTS.md`, '# rules')
    w.files.set(`${ROOT}/.github/workflows/ci.yml`, 'on: push')
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect(w.registeredCommands.sort()).toEqual(['stip'])
    expect(w.registeredTools).toEqual([])
    const snap = await snapshotOf($, press)
    expect(snap.changeId).toBe(null)
    expect(snap.setup).toEqual({ project: ROOT, code: 'Python', tests: 'pytest', git: { repo: true, branch: 'main', clean: true }, rules: ['AGENTS.md'], ci: '.github/workflows' })
    // No guard: an edit anywhere goes through.
    expect((await call($, 'Write', { file_path: `${ROOT}/src/a.py`, content: 'x' })).deny).toBeUndefined()
    // Set up fills /stip-bootstrap; nothing runs the engine.
    expect((await press($, 'setup'))!.value).toMatchObject({ prompt_filled: true })
    expect(w.prompts).toEqual(['/stip-bootstrap'])
    expect(w.calls).toEqual([])
    // No provenance baseline is taken before Stip is set up.
    expect(w.store.baselines).toBeUndefined()
  })

  test('a Bash call that creates .workflow/ activates Stip in the session', async ($, on) => {
    const w = bare(new World())
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect(w.registeredTools).toEqual([])
    w.bashEffect = () => w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ schema_version: 1, extensions: {} }))
    await call($, 'Bash', { command: 'python3 workflow.py init' })
    expect(w.registeredTools).toContain('stip_status')
    expect((await snapshotOf($, press)).setup).toBe(null)
  })
})

describe('New change state (AC-35, AC-37)', () => {
  const archive = (w: World) => {
    w.files.set(`${ROOT}/.workflow/archive/old-change/proposal.md`, PROPOSAL)
    w.files.set(`${ROOT}/.workflow/archive/old-change/execution-summary.json`, JSON.stringify({ archived_at: '2026-10-08T15:45:33+00:00', tasks: [] }))
    w.files.set(`${ROOT}/.workflow/specs/old-change.md`, '# Old\n\n## Acceptance criteria\n\n- AC-1: a\n- AC-2: b\n')
    w.files.set(`${ROOT}/.workflow/specs/core.md`, '# Core\n\n- AC-1: c\n')
    w.commits['.workflow/archive/old-change'] = 'c0e4c6c'
  }

  test('follow-ups and accepted specs are in the snapshot; new and new-from fill /stip-explore', async ($, on) => {
    const w = new World()
    archive(w)
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    const snap = (await status($)).snapshot
    expect(snap.start.followUps).toEqual([
      { title: 'Upload read timeout', detail: 'stalled uploads hold the bucket lock.', source: 'old-change' },
      { title: 'JSON errors for over-long requests', detail: '414 and 431 come back as plain pages.', source: 'old-change' },
    ])
    expect(snap.start.specs).toEqual([
      { id: 'old-change', criteria: 2, archivedAt: '2026-10-08T15:45:33+00:00', commit: 'c0e4c6c' },
      { id: 'core', criteria: 1, archivedAt: null, commit: null },
    ])
    // AC-37: safe while a change is open; the binding stays.
    expect((await press($, 'new'))!.value).toMatchObject({ prompt_filled: true })
    expect(w.prompts.at(-1)).toBe('/stip-explore ')
    expect((await status($)).bound).toBe('demo')
    // No change open: the follow-ups are offered (Start change fills /stip-explore <title>).
    w.hasChange = false
    w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
    w.files.delete(`${ROOT}/.workflow/changes/demo/spec.md`)
    expect((await snapshotOf($, press)).changeId).toBe(null)
    // A draft in the prompt is never overwritten.
    w.draft = 'half a thought'
    expect((await press($, 'new-from:Upload read timeout'))!.value).toMatchObject({ prompt_filled: false, send_this: '/stip-explore Upload read timeout' })
    w.draft = ''
    await press($, 'new-from:Upload read timeout')
    expect(w.prompts.at(-1)).toBe('/stip-explore Upload read timeout')
    // A title is taken on one line; an empty one is refused.
    expect(exploreTitle('  Upload  read\ntimeout ')).toBe('Upload read timeout')
    expect(() => exploreTitle('')).toThrow(/title is required/)
  })
})

describe('Explore, Validate, Apply and Check states (AC-35)', () => {
  test('Explore follows proposal.md', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/changes/demo/proposal.md`, PROPOSAL)
    install(on, w)
    await start($)
    const explore = (await status($)).snapshot.explore
    expect(explore.problem).toMatch(/^A stalled upload holds/)
    expect(explore.findings.map((f: any) => f.kind)).toEqual(['Confirmed', 'Likely', 'Open', 'Open'])
    expect(explore.decisions.filter((d: any) => d.open).map((d: any) => d.id)).toEqual(['Q1'])
    expect(explore.extensions).toEqual(['cli-tooling'])
  })

  test('approval records the contract; a revision shows what changed since', async ($, on) => {
    const w = new World()
    w.userDigest = null
    w.approvalCurrent = false
    w.phase = 'draft'
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect((await status($)).snapshot.contractDiff).toBe(null)
    expect((await press($, `approve:${w.contractDigest.slice(0, 12)}`))!.ok).toBe(true)
    let diff = (await status($)).snapshot.contractDiff
    expect(diff).toMatchObject({ since: w.contractDigest, criteria: [], addedTasks: [], changedTasks: [], removedTasks: [] })
    // Revised contract: AC-2 reworded, AC-3 added, task ui removed.
    w.files.set(`${ROOT}/.workflow/changes/demo/spec.md`, '# Demo\n\n## Acceptance criteria\n\n- AC-1: The core works.\n- AC-2: The UI shows it clearly.\n- AC-3: Logged.\n')
    w.tasks = w.tasks.filter(t => t.id !== 'ui')
    w.contractDigest = 'ff'.padEnd(64, '1')
    w.syncChange()
    diff = (await status($)).snapshot.contractDiff
    expect(diff.criteria.map((c: any) => [c.id, c.change])).toEqual([['AC-2', 'changed'], ['AC-3', 'added']])
    expect(diff.removedTasks).toEqual(['ui'])
  })

  test('Apply: each worker keeps a trail of its last six steps; Check: the criterion under review and the proof', async ($, on) => {
    const w = new World()
    w.tasks = w.tasks.map(t => (t.id === 'verify' ? { ...t, depends_on: [] } : t))
    w.syncChange()
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    for (let i = 1; i <= 7; i++) await call($, 'Read', { file_path: `${ROOT}/src/core/f${i}.ts`, agentId: agent })
    let snap = (await status($)).snapshot
    const core = snap.workers.find((x: any) => x.taskId === 'core')
    expect(core.steps.map((s: any) => s.activity)).toEqual(['Reading f2.ts', 'Reading f3.ts', 'Reading f4.ts', 'Reading f5.ts', 'Reading f6.ts', 'Reading f7.ts'])
    expect(core.steps.every((s: any) => s.tool === 'Read' && typeof s.at === 'number')).toBe(true)
    // The published snapshot follows each call without a refresh.
    await call($, 'Bash', { command: 'pytest -q', agentId: agent })
    const held = await snapshotOf($, press)
    expect(held.workers.find((x: any) => x.taskId === 'core').steps.at(-1)).toMatchObject({ tool: 'Bash', activity: 'Running tests' })

    // Check: the verify worker names one criterion at a time.
    const verifier = (await delegateAndLaunch($, w, 'verify')).agent_id as string
    expect((await status($)).snapshot.check).toMatchObject({ reviewer: 'verify', criterion: null })
    await call($, 'Bash', { command: 'pytest -k "AC-2" tests/', agentId: verifier })
    expect((await snapshotOf($, press)).check).toMatchObject({ reviewer: 'verify', criterion: 'AC-2' })
    // Recorded proof: the check report in state.json, else evidence.md.
    w.lifecycleExtra = { check: { at: '2026-10-08T12:00:00+00:00', report: { criteria: [{ id: 'AC-1', status: 'passed', evidence: 'core tests pass' }, { id: 'AC-2', status: 'pending-docs', evidence: 'README' }] } } }
    w.files.set(`${ROOT}/.workflow/changes/demo/evidence.md`, '# Evidence\n\n- AC-1: passed — core tests pass\n')
    w.syncChange()
    snap = (await status($)).snapshot
    expect(snap.check.reportAt).toBe('2026-10-08T12:00:00+00:00')
    expect(snap.criteria.map((c: any) => [c.id, c.proof?.status, c.pendingDocs])).toEqual([
      ['AC-1', 'passed', false],
      ['AC-2', 'pending-docs', true],
    ])
  })
})

describe('Archive state (AC-35)', () => {
  test('the bound change just archived gets a summary; auto-binding waits for a new change', async ($, on) => {
    const w = new World()
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect((await status($)).bound).toBe('demo')
    // The engine archives demo: its folder moves under archive/ and the commit lands.
    const dir = `${ROOT}/.workflow/archive/demo`
    w.files.set(`${dir}/state.json`, JSON.stringify({ id: 'demo', phase: 'archived', created_at: '2026-10-08T10:00:00+00:00', updated_at: '2026-10-08T10:30:00+00:00' }))
    w.files.set(`${dir}/execution-summary.json`, JSON.stringify({ archived_at: '2026-10-08T10:30:00+00:00', tasks: [{ task_id: 'core', attempt: 2, actual_model: 'claude-test', effort: 'high' }] }))
    w.files.set(`${dir}/spec.md`, '- AC-1: a\n- AC-2: b\n')
    w.files.set(`${dir}/evidence.md`, '- AC-1: passed — x\n- AC-2: passed — y\n')
    w.files.set(`${dir}/proposal.md`, '# Demo change\n\n## Follow-ups\n\n- Next thing\n')
    w.commits['.workflow/archive/demo'] = '95ae40d'
    w.hasChange = false
    w.files.delete(`${ROOT}/.workflow/changes/demo/state.json`)
    w.files.delete(`${ROOT}/.workflow/changes/demo/spec.md`)
    let snap = await snapshotOf($, press)
    expect(snap.changeId).toBe(null)
    expect(snap.archived).toMatchObject({
      changeId: 'demo',
      title: 'Demo change',
      commit: '95ae40d',
      durationMs: 30 * 60_000,
      criteria: { passed: 2, total: 2 },
      tasks: { total: 1, corrections: 1, corrected: ['core'] },
      models: [{ taskId: 'core', model: 'claude-test', effort: 'high', attempts: 2 }],
      followUps: [{ title: 'Next thing', detail: null, source: 'demo' }],
    })
    // A change opened after the archive is auto-bound, and the summary gives way.
    w.files.set(`${ROOT}/.workflow/changes/next-one/state.json`, JSON.stringify({ schema_version: 2, id: 'next-one', phase: 'exploring' }))
    snap = await snapshotOf($, press)
    expect(snap.changeId).toBe('next-one')
    expect(snap.archived).toBe(null)
  })
})

describe('Motion and typing (AC-36)', () => {
  test('the snapshot carries ui.motion from settings and follows a save', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { ui: { motion: 'calm' } } } } }))
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect((await status($)).snapshot.ui).toEqual({ motion: 'calm', typing: false })
    // The settings tab's Motion picker, saved (settings-load, then settings-save through `request`).
    const tab = await ($ as any).ui.mount({ plugin: 'stipulate', surface: 'terminal', component: 'Pane', requestId: 'stipulate', props: { title: 'Stip · Settings', isFocused: true, bodyColumns: 105, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} }, viewport: { columns: 200, rows: 60, isFullscreen: true } })
    await tab.select({ key: 'motion', value: 'off' })
    await tab.press({ key: 'settings-save' })
    await tab.unmount()
    expect((await snapshotOf($, press)).ui.motion).toBe('off')
  })

  test('typing is true while the person edits the prompt, false after a pause or an empty box', async ($, on) => {
    const w = new World()
    const clock = install(on, w)
    const press = interfaceOf(on)
    await start($)
    await edit($, '', 'h')
    expect((await snapshotOf($, press)).ui.typing).toBe(true)
    await clock.advance(1_000)
    await edit($, 'h', 'i')
    await clock.advance(1_000)
    // 1 s after the last edit: still typing.
    expect((await snapshotOf($, press)).ui.typing).toBe(true)
    await clock.advance(1_000)
    expect((await snapshotOf($, press)).ui.typing).toBe(false)
    await edit($, '', 'x')
    expect((await snapshotOf($, press)).ui.typing).toBe(true)
    await ($ as any).prompt.edit({ origin: { kind: 'composer' }, text: 'x', cursor: 1, start: 0, end: 1, inputText: '' } as never)
    expect((await snapshotOf($, press)).ui.typing).toBe(false)
  })
})

describe('Interface actions without a transcript row', () => {
  test('an action runs through the request state: the reply is kept under its id', async ($, on) => {
    const w = new World()
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    expect(await press($, 'new')).toMatchObject({ ok: true, action: 'new', value: { prompt_filled: true } })
    expect(w.prompts.at(-1)).toBe('/stip-explore ')
  })

  test('another plugin cannot write the request state (only Stip itself sends actions)', { plugins: [PROBE] }, async ($, on) => {
    const w = new World()
    install(on, w)
    await start($)
    expect(await probe($, { id: 'x', action: { action: 'approve', change_id: 'demo', digest: 'ab12cd34' } })).toMatchObject({ refused: expect.stringMatching(/only its owner writes it/) })
    expect(w.engineCalls('approve')).toEqual([])
  })

  test('in Setup only setup and refresh are offered and served', async ($, on) => {
    const w = bare(new World())
    install(on, w)
    const press = interfaceOf(on)
    await start($)
    // The Setup pane offers no engine action to press (the core would refuse one: not set up).
    await expect(press($, 'new')).rejects.toThrow(/no Button/)
    expect(await press($, 'refresh')).toMatchObject({ ok: true })
    expect(await press($, 'setup')).toMatchObject({ ok: true })
    expect(w.prompts).toEqual(['/stip-bootstrap'])
  })
})
