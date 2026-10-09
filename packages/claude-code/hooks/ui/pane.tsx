// AC-27, AC-35..AC-38: the /stip pane's Plan tab, "Stip Ledger", one state per lifecycle moment as
// the validated ledger-states.html draws it: Setup (no .workflow/ yet), New change, Explore,
// Validate, Apply, Check, Docs and Archive (Settings is settings.tsx). Every bound state opens with
// the header (change picker, + New, approval badge, Plan/Settings tabs) and the lifecycle rail; the
// alerts (approve, rebase, resync) and a "Waiting for you" group for returned work follow wherever
// they apply, so every action stays reachable.
// Everything is drawn from the snapshot (no file read, no engine process: AC-21); every press runs
// in actions.ts by element key, so a press that outlives its drawing still lands (AC-33).
// Widths (AC-30): every line is fitted to the cells it has, by priority, never cut mid-word.
// Motion (AC-36): motion.ts says which frame each one-shot is on; this file draws it and arms the
// next frame, repainting the terminal's clocks and the review pulse with `$.ui.blit` in between.
// Extensions (AC-44..AC-46): the bound change's selected extensions as chips under the header.
import { atom, read } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StipArchiveSummary, StipCriterion, StipHelper, StipSnapshot, StipTask } from '../../types'
import { NODE_COLOR, SVG_LEGEND, dependencyList, graphAlt, graphSvg, graphText, legendOf, namesFit, type GraphLine } from './graph.ts'
import * as motion from './motion.ts'
import {
  MARK_GLYPH,
  PANE_ID,
  PLAN_TITLE,
  RAIL,
  SETTINGS_TITLE,
  activityText,
  approvalState,
  archiveFacts,
  buttonCells,
  buttonsCells,
  canApprove,
  chipId,
  chipsFit,
  counts,
  criterionUnderReview,
  decodeUi,
  effortLabel,
  elapsed,
  firstOpen,
  fitMeta,
  friendlyModel,
  headerBadge,
  isActive,
  markTone,
  meaningfulTool,
  metaWidth,
  modelsUsed,
  noEmDash,
  openLine,
  outdatedProofs,
  paneView,
  pendingTickets,
  plannedModels,
  railIndex,
  rowTier,
  rulerMarks,
  rulerRows,
  shortenWords,
  stagesOf,
  taskEntries,
  taskRow,
  tamperOf,
  ticketKey,
  viaHook,
  workerElapsed,
  type BandTone,
  type CriterionMark,
  type MarkTone,
  type MetaPart,
  type PaneView,
  type RowTone,
  type TaskEntry,
  type TaskRow,
} from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const bandHiddenAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)
const ticketsAtom = atom({ plugin: 'stipulate', key: 'tickets' } as const, {})
// The pane's UI state (open Details, criteria, picker, group), encoded by model.ts decodeUi/encodeUi.
const uiAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)

/** Where the person adopts changes they made outside this session (the core's person-only command). */
export const RESYNC_HINT = 'Made this change yourself in another terminal? /stip-resync lists the differences; /stip-resync confirm adopts them.'

type Tone = { color?: string; dimColor?: boolean; bold?: boolean }
const TONE: Record<RowTone, Tone> = {
  done: { color: 'success' },
  running: { color: 'suggestion' },
  attention: { color: 'error' },
  review: { color: 'warning' },
  launch: { color: 'warning' },
  ready: {},
  blocked: { dimColor: true },
}
const BAND_TONE: Record<BandTone, Tone> = {
  mark: { color: 'claude', bold: true },
  change: { bold: true },
  plain: {},
  dim: { dimColor: true },
  success: { color: 'success' },
  warning: { color: 'warning' },
  error: { color: 'error' },
  accent: { color: 'suggestion' },
}
/** The ruler's colors (AC-38): green passed, red failed, the permission violet for pending-docs, dim open. */
const MARK_TONE: Record<MarkTone, Tone> = { passed: { color: 'success' }, failed: { color: 'error' }, docs: { color: 'permission' }, open: { dimColor: true } }
/** The criteria list's look per recorded status (kept per status; pending-docs reads from the flag). */
const CRITERION: Record<StipCriterion['status'], Tone> = { passed: MARK_TONE.passed, failed: MARK_TONE.failed, unverified: MARK_TONE.open, pending: MARK_TONE.open }

/** A button as the pane draws it, before it becomes an element. */
type Btn = { key: string; label: string; plain?: boolean; primary?: boolean; dim?: boolean; hotkey?: string }

/** Arms the pane's next frame (motion.ts says when): a redraw for one-shots, a blit for the terminal's clocks. */
function pump($: EngineInterface, now: number) {
  const delay = motion.nextDelay(now)
  if (delay === null) return
  const token = motion.arm(now + delay)
  if (token === null) return
  $.clock.after(delay, () => {
    void (async () => {
      if (!motion.fired(token)) return
      const t = await $.clock.now()
      if (motion.needsRedraw(t)) $.ui.invalidate('ui.render')
      else if (motion.repeating()) for (const r of motion.rasters()) await $.ui.blit({ requestId: PANE_ID, key: r.key, cells: r.cells(t) }).catch(() => undefined)
      pump($, t)
    })().catch(() => undefined)
  })
}

export const registerPane: Register = on => {
  on('command.run', { command: 'stip' }, async $ => {
    const opened = await $.ui.open({ id: 'stipulate', title: PLAN_TITLE })
    $.ui.invalidate('ui.render')
    return { text: opened.isPlaced ? 'Stip pane opened.' : `Stip pane not placed: ${opened.reason}` }
  })

  on('ui.render', { component: 'Pane', requestId: 'stipulate' }, async ($, e, next) => {
    if (e.props.title === SETTINGS_TITLE) return next(e)
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : null
    const Raster = e.surface === 'terminal' && 'Raster' in els ? els.Raster : null
    // Mobile draws no field yet: correction reasons fall back to a fixed one there.
    const Input = e.surface !== 'mobile' && 'Input' in els ? els.Input : null
    const terminal = e.surface === 'terminal'
    const width = Math.max(24, e.props.bodyColumns)
    // A card: a rounded border and one cell of padding on each side.
    const inner = width - 4
    const snapshot = await read($, snapshotAtom)
    const ui = decodeUi(await read($, uiAtom))
    const hidden = await read($, bandHiddenAtom)
    const now = await $.clock.now()
    motion.drawing(e.surface)
    if (snapshot) motion.configure(snapshot.ui?.motion, snapshot.ui?.typing, now)
    const animating = motion.mode() === 'auto'

    const button = (b: Btn) => (
      <Button
        key={b.key}
        label={b.label}
        {...(b.plain ? { plain: true as const } : {})}
        {...(b.primary ? { variant: 'primary' as const } : {})}
        {...(b.dim ? { dimColor: true } : {})}
        {...(b.hotkey ? { hotkey: b.hotkey } : {})}
        onPress={viaHook}
      />
    )
    const buttons = (key: string, list: Btn[], extra: Record<string, unknown> = {}) => (
      <Box key={key} flexDirection="row" gap={1} flexShrink={0} {...extra}>
        {list.map(button)}
      </Box>
    )
    const line = (key: string, text: string, props: Tone = {}, wrap: 'wrap' | 'truncate-end' = 'truncate-end') => (
      <Box key={key}>
        <Text wrap={wrap} {...props}>
          {wrap === 'wrap' ? text : shortenWords(text, width)}
        </Text>
      </Box>
    )
    /** A card: title (and a right-hand note) over its body; `attention` draws its border in the warning color. */
    const card = (key: string, title: string, right: string | null, body: unknown[], look: 'plain' | 'attention' | 'focus' = 'plain') => (
      <Box
        key={key}
        flexDirection="column"
        borderStyle="round"
        {...(look === 'attention' ? { borderColor: 'warning' } : look === 'focus' ? {} : { borderDimColor: true })}
        paddingX={1}
        width={width}
        flexShrink={0}
      >
        <Box key={`${key}-hd`} flexDirection="row" justifyContent="space-between">
          <Text {...(look === 'plain' ? { dimColor: true } : { bold: true })}>{title}</Text>
          {right && title.length + right.length + 2 <= inner ? <Text dimColor>{right}</Text> : null}
        </Box>
        {body as never}
      </Box>
    )
    /** `k  value` lines (findings, decisions, proof): a fixed label column, the value wrapping beside it. */
    const kv = (key: string, k: string, kTone: Tone, value: string, valueTone: Tone = {}, small: string | null = null, kWidth = 10) => (
      <Box key={key} flexDirection="row">
        <Box key={`${key}-k`} width={Math.min(kWidth, Math.max(4, inner - 12))} flexShrink={0}>
          <Text {...kTone} wrap="truncate-end">
            {k}
          </Text>
        </Box>
        <Box key={`${key}-v`} flexDirection="column" flexShrink={1}>
          <Text {...valueTone} wrap="wrap">
            {value}
          </Text>
          {small ? (
            <Text dimColor wrap="wrap">
              {small}
            </Text>
          ) : null}
        </Box>
      </Box>
    )
    const tabsFor = (compact: boolean): Btn[] => [
      { key: 'tab-plan', label: 'Plan ▾' },
      { key: 'tab-settings', label: compact ? 'S' : 'Settings', dim: true },
    ]
    const refresh = button({ key: 'refresh', label: 'Refresh', dim: true })

    /** ✎ where a command went: typed into the prompt (auto), then left there a while (AC-36). */
    const handoffLine = (key = 'handoff') => {
      // (Not `h`: that name is the JSX factory.)
      const ho = motion.handoffNow(now)
      if (!ho) return null
      const after = ho.typing ? '' : ho.filled ? '  in your prompt, press Enter' : '  not put in your prompt: it holds a draft (see the notice)'
      return (
        <Box key={key} flexDirection="row">
          <Text color="claude">{'✎ '}</Text>
          <Text bold wrap="truncate-end">
            {shortenWords(ho.shown, Math.max(8, width - 2))}
          </Text>
          {after && ho.shown.length + 2 + after.length <= width ? <Text dimColor>{after}</Text> : null}
        </Box>
      )
    }
    /** A primary action that puts a command in the prompt, with the hint (or the marker once pressed). */
    const promptAction = (key: string, btn: Btn, hint: string) => {
      const marker = handoffLine(`${key}-handoff`)
      return (
        <Box key={key} flexDirection="column">
          <Box key={`${key}-row`} flexDirection="row" flexWrap="wrap" columnGap={1}>
            {button(btn)}
            {marker ? null : <Text dimColor>{hint}</Text>}
          </Box>
          {marker}
        </Box>
      )
    }
    const footer = (bound: boolean) => (
      <Box key="footer" flexDirection="row" gap={1}>
        <Text dimColor>{snapshot ? `refreshed ${elapsed(now - snapshot.refreshedAt) || '0s'} ago` : 'not loaded'}</Text>
        {refresh}
        {bound && hidden ? button({ key: 'show-band', label: 'Expand band', dim: true }) : null}
      </Box>
    )
    const finish = (tree: unknown) => {
      pump($, now)
      return tree as never
    }

    if (!snapshot) {
      return finish(
        <Box flexDirection="column" width={width}>
          {buttons('tabs', tabsFor(width < 40))}
          {line('loading', 'No Stip snapshot yet.', { dimColor: true })}
          {refresh}
        </Box>,
      )
    }

    // --- Setup: a project without .workflow/ (read-only; Set up puts /stip-bootstrap in the prompt) ---
    if (snapshot.setup) {
      const s = snapshot.setup
      const found: [string, string][] = [
        ['Code', s.code ? `${s.code}${s.tests ? `, tests with ${s.tests}` : ''}` : s.tests ? `tests with ${s.tests}` : 'none detected'],
        ['Git', s.git.repo ? `${s.git.clean === false ? 'uncommitted changes' : 'clean working tree'}${s.git.branch ? `, branch ${s.git.branch}` : ''}` : 'not a git repository'],
        ['Rules', s.rules.length ? `${s.rules.join(', ')} ${s.rules.length === 1 ? 'is kept as it is' : 'are kept as they are'}` : 'none found'],
        ['CI', s.ci ?? 'none found'],
      ]
      // The found items come in one by one, as if scanned, the first time the state is drawn.
      motion.begin('scan', s.project, now, { length: 250 + found.length * 220 + 200 })
      const scan = motion.at('scan', s.project, now)
      const shown = scan ? found.filter((_, i) => scan.t >= 250 + i * 220).length : found.length
      const entering = (i: number) => scan !== null && scan.t < 250 + i * 220 + motion.FRAME_MS
      return finish(
        <Box flexDirection="column" width={width}>
          <Box key="head" flexDirection="row" gap={1} width={width}>
            <Box key="mark" flexShrink={0}>
              <Text color="claude" bold>
                ◆ Stip
              </Text>
            </Box>
            <Text dimColor wrap="truncate-end">
              {tailPath(s.project, width - '◆ Stip'.length - 1)}
            </Text>
          </Box>
          {card(
            'setup',
            "Stip isn't set up here yet",
            null,
            [
              <Box key="setup-text">
                <Text wrap="wrap">Set up writes a .workflow/ folder: a short project map, your settings, and room for changes and accepted specs. Nothing else in the project is touched.</Text>
              </Box>,
              promptAction('setup-cta', { key: 'setup', label: 'Set up Stip', primary: true }, 'starts /stip-bootstrap in your prompt'),
            ],
            'focus',
          )}
          {card(
            'found',
            'Found in this project',
            shown < found.length ? 'scanning' : `${found.length} found`,
            found.slice(0, shown).map(([k, v], i) => kv(`found-${k}`, k, { dimColor: true }, v, entering(i) ? { dimColor: true } : {}, null, 7)),
          )}
          {footer(false)}
        </Box>,
      )
    }

    // --- Change picker: in-flight first, then the others, then finished, then the archived count ---
    const pickerList = (s: StipSnapshot) => {
      const order = [...s.changes].sort((a, b) => Number(b.inFlight) - Number(a.inFlight) || Number(a.finished) - Number(b.finished) || a.id.localeCompare(b.id))
      const approvalWord = (a: string) => (a === 'approved' || a === 'recorded' ? '✓ approved' : a === 'stale' ? '! stale' : '○ not approved')
      return (
        <Box key="picker-list" flexDirection="column" paddingLeft={2}>
          {order.map(c => {
            const label = `${c.id === s.changeId ? '●' : '○'} ${c.id}`
            const facts = [c.phase, approvalWord(c.approval), c.activeWorkers ? `${c.activeWorkers} running` : null, c.finished ? 'finished' : null, c.title && c.title !== c.id ? c.title : null]
              .filter(Boolean)
              .join(' · ')
            return (
              <Box key={`pick-${c.id}`} flexDirection="row" gap={1}>
                {button({ key: `bind:${c.id}`, label, plain: true, dim: c.id !== s.changeId })}
                <Text dimColor wrap="truncate-end">
                  {shortenWords(facts, Math.max(8, width - label.length - 3))}
                </Text>
              </Box>
            )
          })}
          {s.archivedCount ? line('archived', `${s.archivedCount} archived`, { dimColor: true }) : null}
        </Box>
      )
    }

    const changeId = snapshot.changeId
    const view: PaneView = paneView(snapshot)
    const archived = view === 'archive' ? snapshot.archived : null

    // --- New change: no change bound (and none just archived) ---
    if (view === 'start') {
      const start = snapshot.start ?? { followUps: [], specs: [] }
      const titles = [...new Set(start.followUps.map(f => f.title))]
      const today = new Date(now).toISOString().slice(0, 10)
      const when = (iso: string | null) => (iso ? (iso.slice(0, 10) === today ? 'archived today' : `archived ${iso.slice(0, 10)}`) : null)
      return finish(
        <Box flexDirection="column" width={width}>
          <Box key="head" flexDirection="row" justifyContent="space-between" width={width}>
            <Box key="title" flexDirection="row" gap={1} flexShrink={1}>
              <Text color="claude" bold>
                ◆ Stip
              </Text>
              {width >= 50 ? <Text dimColor>no change open</Text> : null}
            </Box>
            {buttons('tabs', tabsFor(width < 40))}
          </Box>
          {card(
            'start',
            'Start a change',
            null,
            [
              <Box key="start-text">
                <Text dimColor wrap="wrap">
                  Describe the change in your prompt, or pick a follow-up.
                </Text>
              </Box>,
              promptAction('start-cta', { key: 'new', label: 'Describe a change', primary: true, hotkey: 'n' }, 'starts /stip-explore in your prompt'),
            ],
            'focus',
          )}
          {titles.length
            ? card(
                'followups',
                'Follow-ups from earlier reviews',
                String(titles.length),
                titles.map(title => {
                  const f = start.followUps.find(x => x.title === title)!
                  const btn: Btn = { key: `new-from:${title}`, label: 'Start change' }
                  const room = inner - buttonsCells([btn]) - 1
                  const sub = noEmDash(`from ${f.source}${f.detail ? `: ${f.detail}` : ''}`)
                  // Beside the button only while no word of the text is wider than what is left.
                  const beside = room >= Math.max(16, ...`${title} ${sub}`.split(/\s+/).map(x => x.length))
                  return (
                    <Box key={`fu-${title}`} flexDirection={beside ? 'row' : 'column'} justifyContent="space-between">
                      <Box key={`fu-text-${title}`} flexDirection="column" flexShrink={1}>
                        <Text bold wrap="wrap">
                          {noEmDash(title)}
                        </Text>
                        <Text dimColor wrap="wrap">
                          {sub}
                        </Text>
                      </Box>
                      {buttons(`fu-btn-${title}`, [btn], beside ? { alignSelf: 'center' } : {})}
                    </Box>
                  )
                }),
              )
            : null}
          {start.specs.length
            ? card(
                'specs',
                'Accepted specs',
                String(start.specs.length),
                start.specs.map(sp => (
                  <Box key={`spec-${sp.id}`} flexDirection="column">
                    <Text bold wrap="truncate-end">
                      {shortenWords(sp.id, inner)}
                    </Text>
                    <Text dimColor wrap="wrap">
                      {[`${sp.criteria} criteria`, when(sp.archivedAt), sp.commit ? `commit ${sp.commit}` : null].filter(Boolean).join(', ')}
                    </Text>
                  </Box>
                )),
              )
            : null}
          {snapshot.changes.length
            ? card('changes', 'Open changes', String(snapshot.changes.length), [
                line('unbound', 'No change is bound to this session. Pick one:', { dimColor: true }, 'wrap'),
                pickerList(snapshot),
                line('hint', 'Or bind with /stip-bind <change-id>.', { dimColor: true }),
              ])
            : snapshot.archivedCount
              ? line('archived', `${snapshot.archivedCount} archived`, { dimColor: true })
              : null}
          {snapshot.error ? line('error', `error: ${snapshot.error}`, { color: 'error' }, 'wrap') : null}
          {footer(false)}
        </Box>,
      )
    }

    // --- Data: the snapshot alone ---
    const state = approvalState(snapshot)
    const c = counts(snapshot)
    const digest = snapshot.approval.digest
    const criteria = snapshot.criteria ?? []
    const tickets = pendingTickets(snapshot, await read($, ticketsAtom))
    const toLaunch = new Set(tickets.map(t => t.description))
    const tamperedIds = new Set(snapshot.tasks.filter(t => t.latest && tamperOf(snapshot, t.id, t.latest.attempt)).map(t => t.id))
    const rows = new Map<string, TaskRow>(
      snapshot.tasks.map(t => {
        const w = t.latest
        const unlaunched = w !== null && toLaunch.has(ticketKey(w.changeId, w.taskId, w.attempt))
        const reopened = (snapshot.lastRebase?.reopened ?? []).includes(t.id)
        const row = taskRow(snapshot, t, now, { unlaunched, tampered: tamperedIds.has(t.id), reopened })
        // Delegating needs a current approval.
        return [t.id, row.action === 'delegate' && !snapshot.approval.current ? { ...row, action: 'none' as const } : row]
      }),
    )
    const byId = new Map(snapshot.tasks.map(t => [t.id, t]))
    const key = changeId ?? archived?.changeId ?? ''

    // The approval seal plays on the Validate state before the rail moves to Apply (AC-36).
    const seal = changeId && digest ? motion.at('seal', `${changeId}:${digest}`, now) : null
    const shownView: PaneView = seal && view !== 'validate' ? 'validate' : view
    const railAt = railIndex(shownView)

    // --- Header: picker, + New, badge, tabs on one line while they fit; then shorter forms ---
    const arrow = ui.picker ? '▴' : '▾'
    const pickerName = changeId ?? archived?.changeId ?? 'no change'
    const header = (() => {
      const badgeAt = (level: number) => (archived ? { text: level >= 3 ? '✓' : '✓ archived', tone: 'success' as BandTone } : headerBadge(snapshot, level))
      for (const newLabel of ['+ New', '+']) {
        const newW = buttonCells(newLabel)
        for (const compact of [false, true]) {
          const tabsW = buttonsCells(tabsFor(compact))
          for (let level = 0; level <= 3; level++) {
            const badge = badgeAt(level)
            if (buttonCells(`${pickerName} ${arrow}`) + 1 + newW + 1 + badge.text.length + 1 + tabsW <= width) return { pickerId: pickerName, newLabel, compact, badge, badgeBelow: false }
          }
        }
      }
      // The badge on its own line; the change name shortened at a word boundary only if it must.
      const tabsW = buttonsCells(tabsFor(true))
      const room = width - tabsW - 1 - 6 - buttonCells('+') - 1
      const pickerId = pickerName.length > room ? shortenWords(pickerName, Math.max(4, room)) : pickerName
      return { pickerId, newLabel: '+', compact: true, badge: badgeAt(width < 40 ? 2 : 1), badgeBelow: true }
    })()
    const badgeText = <Text bold {...BAND_TONE[header.badge.tone]}>{header.badge.text}</Text>
    const head = (
      <Box key="head" flexDirection="row" justifyContent="space-between" width={width}>
        <Box key="title" flexDirection="row" gap={1} flexShrink={1}>
          {button({ key: 'picker', label: `${header.pickerId} ${arrow}` })}
          {button({ key: 'new', label: header.newLabel, hotkey: 'n' })}
          {header.badgeBelow ? null : badgeText}
        </Box>
        {buttons('tabs', tabsFor(header.compact))}
      </Box>
    )

    // --- Extension chips (AC-44..AC-46): the bound change's selection, under the header line ---
    // While the change explores, a chip is a button that removes it and `+ extension` lists the
    // enabled ones not selected (one press adds it); otherwise the chips are text. Chips are whole or
    // collapsed into `+n`, never cut. One that just joined the selection lights up once (AC-45).
    const exploring = changeId !== null && snapshot.phase === 'exploring'
    const selected = changeId ? snapshot.extensions : []
    const candidates = exploring ? (snapshot.enabledExtensions ?? []).filter(id => !selected.includes(id)) : []
    // No chip is wider than the pane: a long id is shortened (the key keeps it whole).
    const chipLabel = (id: string) => chipId(id, width - (exploring ? 4 : 2))
    const chipText = (id: string) => `◇ ${chipLabel(id)}${exploring ? ' ✕' : ''}`
    const addBtn: Btn = { key: 'ext-add', label: ui.extAdd ? '+ extension ▴' : '+ extension', dim: true }
    const chipFit = chipsFit(selected.map(id => chipText(id).length), width, candidates.length ? buttonCells(addBtn.label) : 0)
    const chip = (id: string) => {
      const lit = motion.at('chip', `${changeId}:${id}`, now) !== null
      const parts = [
        <Text {...(lit ? { color: 'suggestion', bold: true } : { color: 'claude' })}>{lit ? '◆ ' : '◇ '}</Text>,
        <Text {...(lit ? { color: 'suggestion', bold: true } : {})}>{chipLabel(id)}</Text>,
        ...(exploring ? [<Text dimColor>{' ✕'}</Text>] : []),
      ]
      if (exploring)
        return (
          <Button key={`ext-remove:${id}`} plain onPress={viaHook}>
            {parts}
          </Button>
        )
      return (
        <Box key={`ext-${id}`} flexShrink={0}>
          <Text>{parts}</Text>
        </Box>
      )
    }
    // `+n` is the person's way to the chips that did not fit: pressed, every chip is listed, wrapping
    // between whole chips (removable while exploring, to read otherwise); `▴` folds them back.
    const more = (text: string) => button({ key: 'ext-more', label: text, plain: true, dim: true })
    const showAll = ui.extAll && selected.length > 0
    // The ids to add, whole: on one line while they all fit, else one per line (an id wider than the
    // pane itself is the only one shortened).
    const picks = candidates.map(id => ({ key: `ext-pick:${id}`, label: `+ ${id}`.length <= width ? `+ ${id}` : shortenWords(`+ ${id}`, width), plain: true as const }))
    const chipsRow =
      selected.length || candidates.length ? (
        <Box key="ext-chips" flexDirection="column" width={width}>
          {showAll ? (
            <Box key="ext-row" flexDirection="row" flexWrap="wrap" columnGap={1}>
              {selected.map(chip)}
              {more('▴')}
              {candidates.length ? button(addBtn) : null}
            </Box>
          ) : (
            <Box key="ext-row" flexDirection="row" gap={1}>
              {selected.slice(0, chipFit.shown).map(chip)}
              {chipFit.more ? more(chipFit.more) : null}
              {candidates.length && !chipFit.tailBelow ? button(addBtn) : null}
            </Box>
          )}
          {!showAll && candidates.length && chipFit.tailBelow ? <Box key="ext-add-row">{button(addBtn)}</Box> : null}
          {candidates.length && ui.extAdd ? (
            <Box key="ext-pick" flexDirection={buttonsCells(picks) <= width ? 'row' : 'column'} columnGap={1}>
              {picks.map(button)}
            </Box>
          ) : null}
          {exploring && ui.extReply && ui.extReplyFor === JSON.stringify(selected) ? line('ext-reply', noEmDash(ui.extReply), { dimColor: true }, 'wrap') : null}
        </Box>
      ) : null

    // --- The rail: done green, current lit (filled on the terminal), the rest dim; a seam fills as a stage is reached ---
    const marks = changeId ? stagesOf(snapshot) : []
    const markOf = (name: string) => marks.find(m => m.name === name)?.mark ?? '○'
    const phaseEv = changeId ? motion.at('phase', `${changeId}:${railAt}`, now) : null
    // While the seam into the current stage fills, that stage is not lit yet (frames 0-2).
    const seamFrame = phaseEv ? motion.frame(phaseEv.t) : 3
    const rail = (
      <Box key="stages" flexDirection="row" flexWrap="wrap" columnGap={1} {...(terminal ? {} : { alignItems: 'center' as const })}>
        {RAIL.map((name, i) => {
          const reached = i < railAt || (i === railAt && seamFrame >= 3)
          const current = i === railAt && seamFrame >= 3
          const attention = markOf(name) === '!' && (i === railAt || name === 'Validate')
          const look: Tone & { backgroundColor?: string } = current
            ? { backgroundColor: attention ? 'error' : 'suggestion', color: 'inverseText', bold: true }
            : i < railAt
              ? attention
                ? { color: 'error' }
                : { color: 'success' }
              : { dimColor: true }
          const text = current ? ` ${name} ` : i < railAt ? `${attention ? '!' : '✓'} ${name}` : name
          const seam =
            i === 0
              ? null
              : i === railAt && seamFrame < 3
                ? seamFrame === 0
                  ? [{ text: '┄┄', tone: { dimColor: true } }]
                  : seamFrame === 1
                    ? [{ text: '─', tone: { color: 'success' } }, { text: '┄', tone: { dimColor: true } }]
                    : [{ text: '──', tone: { color: 'success' } }]
                : reached
                  ? [{ text: '──', tone: { color: 'success' } }]
                  : [{ text: '┄┄', tone: { dimColor: true } }]
          const seamEl = seam ? (
            <Text>
              {seam.map(sg => (
                <Text {...sg.tone}>{sg.text}</Text>
              ))}
            </Text>
          ) : null
          if (terminal)
            return (
              <Box key={`stage-${name}`} flexDirection="row" gap={1}>
                {seamEl}
                <Text {...look}>{text}</Text>
              </Box>
            )
          // AC-40: off the terminal, plain text marks a position (a filled chip read as a selected button).
          const plain: Tone = current ? { color: attention ? 'error' : 'suggestion', bold: true } : look
          return (
            <Box key={`stage-${name}`} flexDirection="row" gap={1} alignItems="center">
              {seamEl}
              <Text {...plain}>{current ? `● ${name}` : text}</Text>
            </Box>
          )
        })}
      </Box>
    )

    // --- Task rows ---
    const entries = taskEntries(snapshot, rows, tamperedIds)
    const taskButtons = (t: StipTask, r: TaskRow): Btn[] => {
      const w = t.latest
      const out: Btn[] = []
      if (r.action === 'review' && w?.status === 'returned' && w.acceptance === 'pending')
        out.push(tamperedIds.has(t.id) ? { key: `accept-check:${t.id}`, label: 'Accept…', primary: true } : { key: `accept:${t.id}`, label: 'Accept', primary: true })
      if (r.action === 'review') out.push({ key: `correct:${t.id}`, label: 'Correct' })
      if (r.action === 'delegate') out.push({ key: `delegate:${t.id}`, label: 'Delegate', primary: true })
      if (r.action === 'launch') out.push({ key: `relaunch:${t.id}`, label: 'Launch', primary: true })
      if (r.action === 'redo') out.push({ key: `redo:${t.id}`, label: 'Redo', primary: true })
      if (r.action === 'cancel') out.push({ key: `cancel:${t.id}`, label: '✕', plain: true })
      if (w?.hasResult) out.push({ key: `result:${t.id}`, label: '▤', plain: true })
      out.push({ key: `details:${t.id}`, label: ui.task === t.id ? '▾' : '›', plain: true, dim: true })
      return out
    }
    /** A running clock: a Raster the terminal repaints each second (`$.ui.blit`), else text redrawn. */
    type Clock = { key: string; since: number }
    const metaParts = (parts: MetaPart[], tone: Tone, clock: Clock | null) => {
      const out: unknown[] = []
      parts.forEach((p, i) => {
        if (i) out.push(<Text dimColor>{' · '}</Text>)
        if (p.kind === 'time' && clock && Raster && motion.mode() !== 'off') {
          const cells = (t: number) => motion.textCells(motion.clockText(clock.since, t), motion.CLOCK_CELLS)
          motion.liveClock({ key: clock.key, columns: motion.CLOCK_CELLS, cells })
          out.push(<Raster key={clock.key} columns={motion.CLOCK_CELLS} rows={1} cells={cells(now)} />)
          return
        }
        if (p.kind === 'time' && clock) motion.liveClock(null)
        out.push(
          <Text {...(p.kind === 'effort' ? { color: 'claude' } : p.kind === 'state' ? (tone.color ? { color: tone.color } : { dimColor: true }) : { dimColor: true })}>{p.text}</Text>,
        )
      })
      return out
    }
    /**
     * The last steps a worker took as phrases ("Reading api.py", "Running tests"), oldest dimmest, the
     * newest coming in bold (AC-35, AC-36). Older steps give way first; a newest one too long for the
     * row is shortened at a word boundary.
     */
    const trail = (key: string, steps: { tool: string; activity?: string | null; at: number }[] | undefined, stepKey: string) => {
      const phrase = (x: { tool: string; activity?: string | null }) => {
        const text = noEmDash((x.activity ?? '').trim() || x.tool)
        return text.charAt(0).toUpperCase() + text.slice(1)
      }
      const list = (steps ?? []).filter(x => phrase(x).length > 0)
      if (!list.length) return null
      const SEP = ' · '
      let shown = list.slice(-6)
      while (shown.length > 1 && shown.map(phrase).join(SEP).length > inner) shown = shown.slice(1)
      const newest = shown[shown.length - 1]!
      const entering = motion.at('step', `${stepKey}:${newest.at}`, now) !== null
      return (
        <Box key={`trail-${key}`} flexDirection="row">
          {shown.map((x, i) => (
            <Text {...(i === shown.length - 1 ? (entering ? { bold: true, color: 'suggestion' } : {}) : { dimColor: true })} wrap="truncate-end">
              {`${i ? SEP : ''}${shown.length === 1 ? shortenWords(phrase(x), inner) : phrase(x)}`}
            </Text>
          ))}
        </Box>
      )
    }
    /**
     * Name over meta on the left, the row's buttons on the right centered on the two lines (the
     * preview's grid); when the name or a useful meta cannot sit beside them, the buttons go below.
     */
    const rowView = (key: string, name: string, nameTone: Tone, meta: (room: number) => MetaPart[], tone: Tone, btns: Btn[], below: unknown[] = [], clock: Clock | null = null) => {
      const btnW = buttonsCells(btns)
      const left = inner - btnW - 1
      const full = metaWidth(meta(10_000))
      const beside = left >= Math.min(name.length, 12) && left >= Math.min(full, 24)
      const room = beside ? left : inner
      const shown = name.length <= room ? name : shortenWords(name, room)
      return (
        <Box key={`task-${key}`} flexDirection="column">
          <Box key={`line-${key}`} flexDirection="row" justifyContent="space-between">
            <Box key={`row-${key}`} flexDirection="column" flexShrink={1} {...(terminal ? { width: room } : { flexGrow: 1 })}>
              <Text bold {...nameTone} wrap="truncate-end">
                {shown}
              </Text>
              <Box key={`meta-${key}`} flexDirection="row">
                {metaParts(meta(room), tone, clock) as never}
              </Box>
            </Box>
            {beside ? buttons(`rb-${key}`, btns, { alignSelf: 'center' }) : null}
          </Box>
          {beside ? null : buttons(`rb-${key}`, btns)}
          {below as never}
        </Box>
      )
    }

    const details = (t: StipTask) => {
      const w = t.latest
      const tamper = w ? tamperOf(snapshot, t.id, w.attempt) : null
      const covered = t.criteria.map(id => {
        const cr = criteria.find(x => x.id === id)
        return `${id}${cr ? ` ${cr.title}` : ''}`
      })
      const tool = w ? meaningfulTool(w.lastTool) : null
      const time = w ? workerElapsed(w, now) : ''
      const facts = [
        t.objective,
        `depends on ${t.dependsOn.join(', ') || 'nothing'} · writes ${t.writePaths.join(', ') || 'nothing (read-only)'}`,
        ...(covered.length ? [`covers ${covered.join(', ')}`] : []),
        ...(w
          ? [
              `attempt ${w.attempt}${w.attempt > 1 ? ` (earlier: ${Array.from({ length: w.attempt - 1 }, (_, i) => `#${i + 1}`).join(', ')})` : ''} · ${w.status}${w.acceptance !== 'pending' ? `, ${w.acceptance}` : ''}${w.isolated ? ` · own worktree${w.integrated ? ', integrated' : ''}` : ''}`,
              [w.model ? `model ${w.model}` : 'model inherited', effortLabel(w.effort) ? `effort ${effortLabel(w.effort)}` : null, time || null, tool ? `last ${tool}` : null, w.agentId ? `agent ${w.agentId}` : null].filter(Boolean).join(' · '),
              ...(w.error ? [`why: ${noEmDash(w.error)}`] : []),
              ...(w.status === 'cancelled' && w.error && /changed outside/.test(w.error) ? [RESYNC_HINT] : []),
              ...(w.reviewReason ? [`review: ${noEmDash(w.reviewReason)}`] : []),
              ...(t.awaitingIntegration ? ['not integrated: request a correction (the integration notice lists the files and what to do)'] : []),
            ]
          : []),
      ]
      const correctable = w !== null && ((w.status === 'returned' && w.acceptance === 'pending') || w.acceptance === 'rejected' || t.awaitingIntegration)
      return (
        <Box key={`details-box-${t.id}`} flexDirection="column" paddingLeft={2}>
          {tamper ? (
            <Box key={`tamper-${t.id}`} flexDirection="column">
              <Text color="error" bold wrap="wrap">
                {`⚠ tampered: inspect git diff${tamper.integratedClaim ? ' (the record claimed an integration)' : ''}`}
              </Text>
              <Text color="error" wrap="wrap">
                {tamper.paths.length ? `paths: ${tamper.paths.join(', ')}` : 'paths: none changed under its write paths'}
              </Text>
              <Text dimColor wrap="wrap">
                {noEmDash(tamper.note)}
              </Text>
              <Text dimColor wrap="wrap">
                {RESYNC_HINT}
              </Text>
              {w && w.status === 'returned' && w.acceptance === 'pending' ? button({ key: `accept:${t.id}`, label: 'Accept anyway (I inspected git diff)' }) : null}
            </Box>
          ) : null}
          {facts.map(f => (
            <Text dimColor wrap="wrap">
              {f}
            </Text>
          ))}
          {correctable && Input ? (
            <Input key={`reason:${t.id}`} label="Correction reason" placeholder="What must change (8+ characters)" submitLabel="Request correction" onSubmit={viaHook} />
          ) : null}
          {correctable && !Input ? line(`reason-hint-${t.id}`, 'Correct sends a fixed reason; type /stip-correct <task> <reason> for your own.', { dimColor: true }, 'wrap') : null}
        </Box>
      )
    }

    const entryView = (en: TaskEntry) => {
      const r = en.row
      const tone = TONE[r.tone]
      // A task that just became ready lights up, then settles (AC-36).
      const lit = en.ids.some(id => motion.at('unblock', `${key}:${id}`, now) !== null)
      const nameTone: Tone = lit ? { color: 'suggestion' } : r.tone === 'blocked' ? { dimColor: true } : {}
      if (en.ids.length === 1) {
        const t = byId.get(en.id)!
        const w = t.latest
        const running = r.tone === 'running' && w !== null && w.startedAt !== null && isActive(w.status)
        const clock = running ? { key: `clock:${t.id}`, since: w!.startedAt! } : null
        const time = clock && Raster && motion.mode() !== 'off' ? motion.clockText(clock.since, now) : r.duration || null
        const meta = (room: number) => fitMeta(en.model, en.effort, en.state, time, room)
        const below = [...(running ? [trail(t.id, w!.steps, `${w!.taskId}#${w!.attempt}`)] : []), ...(ui.task === en.id ? [details(t)] : [])].filter(Boolean)
        return rowView(en.id, en.id, nameTone, meta, tone, taskButtons(t, r), below, clock)
      }
      // A group: its members by name; › lists them, each with its own details.
      const meta = (room: number) => fitMeta(en.model, en.effort, en.state, r.duration || null, room)
      const open = ui.group === en.id
      const btns: Btn[] = [{ key: `gtoggle:${en.id}`, label: open ? '▾' : '›', plain: true, dim: true }]
      const room = inner - buttonsCells(btns) - 1
      const names = namesFit(en.ids, room, ' · ')
      const members = open
        ? [
            <Box key={`members-${en.id}`} flexDirection="column" paddingLeft={2}>
              {en.ids.map(id => {
                const t = byId.get(id)!
                const mr = rows.get(id)!
                const label = ui.task === id ? '▾' : '›'
                return (
                  <Box key={`member-${id}`} flexDirection="column">
                    <Box key={`mline-${id}`} flexDirection="row" justifyContent="space-between">
                      <Text dimColor={mr.tone === 'blocked'} wrap="truncate-end">
                        {shortenWords([id, mr.duration].filter(Boolean).join(' · '), inner - 4)}
                      </Text>
                      {buttons(`mb-${id}`, [...(t.latest?.hasResult ? [{ key: `result:${id}`, label: '▤', plain: true as const }] : []), { key: `details:${id}`, label, plain: true, dim: true }])}
                    </Box>
                    {ui.task === id ? details(t) : null}
                  </Box>
                )
              })}
            </Box>,
          ]
        : []
      return rowView(en.id, names, nameTone, meta, tone, btns, members)
    }

    const orphans = snapshot.orphanTasks ?? []
    const retired = (snapshot.lastRebase?.retired ?? []).filter(id => !snapshot.tasks.some(t => t.id === id))
    const retiredPaths = snapshot.lastRebase?.retiredIntegratedPaths ?? {}
    const retiredView = retired.length ? (
      <Box key="retired" flexDirection="column">
        <Box key="retired-line" flexDirection="row" gap={1}>
          <Text dimColor>{`Retired (${retired.length})`}</Text>
          {button({ key: 'retired-toggle', label: ui.retired ? '▾' : '›', plain: true, dim: true })}
        </Box>
        {ui.retired ? (
          <Box key="retired-full" flexDirection="column" paddingLeft={2}>
            {retired.map(id => {
              const paths = retiredPaths[id] ?? []
              return (
                <Text dimColor wrap="wrap">
                  {`${id} · removed from the plan; ${paths.length ? `its integrated work remains in the checkout: ${paths.join(', ')}` : 'nothing it integrated remains in the checkout'}`}
                </Text>
              )
            })}
          </Box>
        ) : null}
      </Box>
    ) : null

    // --- Task graph ---
    const graph = snapshot.graph ?? { nodes: [], edges: [] }
    const lit = new Set(graph.nodes.filter(n => motion.at('unblock', `${key}:${n.id}`, now) !== null).map(n => n.id))
    const graphLines: GraphLine[] = terminal ? (graphText(graph, inner, lit) ?? dependencyList(graph, inner)) : []
    const segText = (lineKey: string, segs: GraphLine) => (
      <Box key={lineKey}>
        <Text wrap="truncate-end">
          {segs.map(sg => (
            <Text {...(sg.color ? { color: sg.color } : {})} {...(sg.dim ? { dimColor: true } : {})} {...(sg.bold ? { bold: true } : {})}>
              {sg.text}
            </Text>
          ))}
        </Text>
      </Box>
    )
    const legend = (
      <Box key="legend" flexDirection="row" flexWrap="wrap" columnGap={2}>
        {legendOf(graph).map(l => (
          <Text>
            <Text {...(terminal ? (NODE_COLOR[l.state].color ? { color: NODE_COLOR[l.state].color } : {}) : { color: SVG_LEGEND[l.state] })}>■</Text>
            <Text dimColor>{` ${l.label}`}</Text>
          </Text>
        ))}
      </Box>
    )
    const graphBody = (extra: unknown[] = []) => {
      const svg = !terminal && Svg && graph.nodes.length ? graphSvg(graph, lit) : null
      return [
        ...(svg && Svg
          ? [<Svg source={svg.source} alt={`Task dependencies: ${graphAlt(graph)}`} width={svg.width} height={svg.height} />]
          : graphLines.map((l, i) => segText(`g-${i}`, l))),
        legend,
        ...extra,
      ]
    }

    // --- Criteria: the glyph ruler (AC-38), the open one named, the full list on demand ---
    const outdated = new Set(outdatedProofs(snapshot))
    const passed = criteria.filter(cr => cr.status === 'passed').length
    const open = firstOpen(snapshot)
    const live = criterionUnderReview(snapshot)
    const markLook = (m: CriterionMark): { glyph: string; tone: Tone } => {
      const v = changeId ? motion.at('verdict', `${changeId}:${m.id}:${m.tone}`, now) : null
      if (v) {
        // The mark lands: · → • → glyph bold → glyph.
        const f = motion.frame(v.t)
        if (f === 0) return { glyph: '·', tone: MARK_TONE.open }
        if (f === 1) return { glyph: '•', tone: MARK_TONE[m.tone] }
        if (f === 2) return { glyph: m.glyph, tone: { ...MARK_TONE[m.tone], bold: true } }
      }
      const dimmed = outdated.has(m.id) && (!changeId || motion.at('outdated', `${changeId}:${m.id}`, now) === null)
      return { glyph: m.glyph, tone: dimmed ? { dimColor: true } : MARK_TONE[m.tone] }
    }
    const ruler = () => {
      const all = rulerMarks(criteria)
      const { cell, rows: lines } = rulerRows(all, inner)
      return (
        <Box key="crit-strip" flexDirection="column">
          {lines.map((row, r) => (
            <Box key={`ruler-${r}`} flexDirection="column">
              <Box key={`ruler-g-${r}`} flexDirection="row">
                {row.map(m => {
                  const look = markLook(m)
                  const pad = Math.floor((m.id.length - 1) / 2)
                  const pulsing = live === m.id && motion.mode() !== 'off'
                  if (pulsing && Raster) {
                    const cells = (t: number) => motion.textCells(look.glyph, 1, motion.pulseOn(t) ? motion.TONE_COLOR[m.tone] : motion.DIM_COLOR)
                    motion.livePulse({ key: `pulse:${m.id}`, columns: 1, cells })
                    return (
                      <Box key={`mark-${m.id}`} width={cell} flexShrink={0} flexDirection="row">
                        <Text>{' '.repeat(pad)}</Text>
                        <Raster key={`pulse:${m.id}`} columns={1} rows={1} cells={cells(now)} />
                      </Box>
                    )
                  }
                  if (pulsing) motion.livePulse(null)
                  // The criterion under review breathes: bright (bold) half a second, dim the next.
                  const tone = pulsing ? (motion.pulseOn(now) ? { ...(m.tone === 'open' ? {} : look.tone), bold: true } : { dimColor: true }) : look.tone
                  return (
                    <Box key={`mark-${m.id}`} width={cell} flexShrink={0}>
                      <Text {...tone}>{`${' '.repeat(pad)}${look.glyph}`}</Text>
                    </Box>
                  )
                })}
              </Box>
              <Box key={`ruler-l-${r}`} flexDirection="row">
                {row.map(m => (
                  <Box key={`label-${m.id}`} width={cell} flexShrink={0}>
                    <Text dimColor>{m.id}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )
    }
    const acWidth = Math.max(4, ...criteria.map(cr => cr.id.length)) + 1
    const criterionLine = (cr: StipCriterion) => {
      const tone = markTone(cr)
      const look = CRITERION[cr.status] ?? MARK_TONE.open
      const isOpen = ui.criterion === cr.id
      const toggle: Btn = { key: `open:${cr.id}`, label: isOpen ? '▾' : '›', plain: true, dim: true }
      const titleRoom = Math.max(6, inner - 2 - acWidth - buttonsCells([toggle]) - 1)
      const covering = snapshot.tasks.filter(t => t.criteria.includes(cr.id)).map(t => t.id)
      const proof = cr.proof ? `${cr.proof.status}: ${noEmDash(cr.proof.text)}` : cr.evidence ? `${cr.status}: ${noEmDash(cr.evidence)}` : cr.status === 'pending' ? 'not checked yet' : cr.status
      return (
        <Box key={`crit-${cr.id}`} flexDirection="column">
          <Box key={`crit-line-${cr.id}`} flexDirection="row" justifyContent="space-between">
            <Box key={`ac-${cr.id}`} flexDirection="row" flexShrink={1}>
              <Box width={2} flexShrink={0}>
                <Text {...(tone === 'docs' ? MARK_TONE.docs : look)}>{`${MARK_GLYPH[tone]} `}</Text>
              </Box>
              <Box width={acWidth} flexShrink={0}>
                <Text dimColor>{`${cr.id} `}</Text>
              </Box>
              <Text wrap="truncate-end">{shortenWords(cr.title || cr.id, titleRoom)}</Text>
            </Box>
            {button(toggle)}
          </Box>
          {isOpen ? (
            <Box key={`ac-full-${cr.id}`} flexDirection="column" paddingLeft={2 + acWidth}>
              {cr.text.split('\n').map(l => (
                <Text wrap="wrap">{l || ' '}</Text>
              ))}
              <Text {...(tone === 'docs' ? MARK_TONE.docs : look)} wrap="wrap">
                {proof}
              </Text>
              <Text dimColor wrap="wrap">
                {covering.length ? `covered by ${covering.join(', ')}` : 'no plan task names it'}
              </Text>
            </Box>
          ) : null}
        </Box>
      )
    }
    /** The recorded proof per criterion (Check): `AC-1 ✓  proof`, pending-docs waiting on docs. */
    const proofLines = () =>
      criteria
        .filter(cr => cr.proof || cr.status === 'passed' || cr.status === 'failed')
        .map(cr => {
          const tone = markTone(cr)
          const entering = changeId ? motion.at('enter', `proof:${changeId}:${cr.id}`, now) !== null : false
          const old = outdated.has(cr.id)
          const text = noEmDash(cr.proof?.text || cr.evidence || cr.title || '')
          return kv(
            `ev-${cr.id}`,
            `${cr.id} ${MARK_GLYPH[tone]}`,
            old ? { dimColor: true } : MARK_TONE[tone],
            text,
            entering || old ? { dimColor: true } : {},
            tone === 'docs' ? 'waiting on docs' : old ? 'recorded before the last approval' : null,
            acWidth + 2,
          )
        })
    const criteriaCard = (extra: unknown[] = [], foot: string | null = null) =>
      criteria.length
        ? card('criteria', 'Criteria', `${passed} of ${criteria.length}`, [
            ruler(),
            ...extra,
            <Box key="crit-foot" flexDirection="row" justifyContent="space-between">
              <Text {...(open?.why === 'failed' ? { color: 'error' } : { dimColor: true })} wrap="truncate-end">
                {foot ?? (open ? openLine(open, inner - buttonCells(ui.criteria ? 'Hide' : 'All') - 1) : 'All criteria passed.')}
              </Text>
              {button({ key: 'criteria-toggle', label: ui.criteria ? 'Hide' : 'All', dim: true })}
            </Box>,
            ...(ui.criteria ? criteria.map(criterionLine) : []),
          ])
        : null

    // --- Research helpers ---
    const helpers = snapshot.helpers.slice(0, 10)
    const helperTickets = tickets.filter(t => t.kind === 'helper')
    const helperView = (hp: StipHelper) => {
      const active = isActive(hp.status)
      const tone: Tone = active ? { color: 'suggestion' } : hp.status === 'returned' ? { color: 'success' } : hp.status === 'failed' ? { color: 'error' } : { dimColor: true }
      const word = active ? (activityText(hp.activity) ?? hp.status) : hp.status === 'returned' ? 'answered' : hp.status
      const isOpen = ui.helper === hp.helperId
      const btns: Btn[] = [
        ...(active ? [{ key: `hcancel:${hp.helperId}`, label: '✕', plain: true as const }] : []),
        ...(hp.hasResult ? [{ key: `hresult:${hp.helperId}`, label: '▤', plain: true as const }] : []),
        { key: `hdetails:${hp.helperId}`, label: isOpen ? '▾' : '›', plain: true, dim: true },
      ]
      const full = isOpen ? (
        <Box key={`hfull-${hp.helperId}`} flexDirection="column" paddingLeft={2}>
          <Text wrap="wrap">{hp.question}</Text>
          <Text dimColor wrap="wrap">
            {[hp.role, hp.model ? `model ${hp.model}` : 'model inherited', effortLabel(hp.effort) ? `effort ${effortLabel(hp.effort)}` : null, workerElapsed(hp, now) || null].filter(Boolean).join(' · ')}
          </Text>
          {hp.error ? (
            <Text color="error" wrap="wrap">
              {`why: ${noEmDash(hp.error)}`}
            </Text>
          ) : null}
        </Box>
      ) : null
      const clock = active && hp.startedAt !== null ? { key: `hclock:${hp.helperId}`, since: hp.startedAt } : null
      const time = clock && Raster && motion.mode() !== 'off' ? motion.clockText(clock.since, now) : workerElapsed(hp, now) || null
      const below = [...(active ? [trail(`h-${hp.helperId}`, hp.steps, `h:${hp.helperId}`)] : []), full].filter(Boolean)
      return (
        <Box key={`helper-${hp.helperId}`} flexDirection="column">
          {rowView(`h-${hp.helperId}`, hp.title || hp.question || hp.role, {}, room => fitMeta(friendlyModel(hp.model), hp.effort, word, time, room), tone, btns, below, clock)}
        </Box>
      )
    }
    const helpersCard = (title: string) =>
      helpers.length || helperTickets.length
        ? card(
            'helpers',
            title,
            (() => {
              const running = helpers.filter(h => isActive(h.status)).length
              const answered = helpers.filter(h => h.status === 'returned').length
              return [running ? `${running} running` : null, answered ? `${answered} answered` : null].filter(Boolean).join(', ') || String(snapshot.helpers.length)
            })(),
            [...helperTickets.map(t => line(`ht-${t.description}`, `◇ ${t.subagentType} · ready to launch, ask Claude to launch it`, { color: 'warning' }, 'wrap')), ...helpers.map(helperView)],
          )
        : null

    // --- Alerts (bound states): unconfirmed approval, errors, held restores, rebase, approve ---
    const alerts = (approveRow: boolean) =>
      [
        state === 'not confirmed'
          ? line('unconfirmed', 'The engine records an approval you did not give through Stip; it is treated as unapproved. Approve here to make it yours.', { color: 'error' }, 'wrap')
          : null,
        snapshot.error ? line('error', `error: ${noEmDash(snapshot.error)}`, { color: 'error' }, 'wrap') : null,
        (snapshot.restoreHeld ?? []).length ? (
          <Box key="resync-row" flexDirection="column">
            <Text color="error" bold wrap="wrap">
              {`! ${snapshot.restoreHeld.length} workflow file${snapshot.restoreHeld.length === 1 ? '' : 's'} kept changing outside Stip: ${snapshot.restoreHeld.join(', ')}`}
            </Text>
            <Text dimColor wrap="wrap">
              {RESYNC_HINT}
            </Text>
          </Box>
        ) : null,
        snapshot.registryCurrent === false || orphans.length ? (
          <Box key="rebase-row" flexDirection="row" gap={1} flexWrap="wrap">
            <Text color="error" bold>
              {orphans.length
                ? width < 70
                  ? `! Plan changed · ${orphans.length} removed`
                  : `! Plan changed · ${orphans.length} task${orphans.length === 1 ? '' : 's'} removed (${namesFit(orphans, 24)})`
                : width < 70
                  ? '! Registry outdated'
                  : '! Registry tied to the previous contract'}
            </Text>
            {button({ key: 'rebase', label: width < 70 ? 'Rebase' : 'Rebase registry', primary: true })}
          </Box>
        ) : null,
        approveRow && canApprove(snapshot) && digest !== null ? (
          <Box key="approve-row" flexDirection="row" gap={1} flexWrap="wrap">
            {button({ key: `approve:${digest.slice(0, 12)}`, label: width < 50 ? `Approve ${digest.slice(0, 8)}` : `Approve contract ${digest.slice(0, 12)}`, primary: true })}
            {width >= 70 ? <Text dimColor>Your approval of exactly this contract.</Text> : null}
          </Box>
        ) : null,
      ].filter(Boolean)

    // "Waiting for you": what asks for the person (returned work, launches, redos, problems).
    const waiting = entries.filter(en => rowTier(en.row) === 0)
    const others = entries.filter(en => rowTier(en.row) !== 0)
    const waitingCard = waiting.length ? card('waiting', 'Waiting for you', String(waiting.length), waiting.map(entryView), 'attention') : null
    const tally = [c.running ? `${c.running} running` : null, snapshot.ready.length ? `${snapshot.ready.length} ready` : null, tickets.length ? `${tickets.length} to launch` : null].filter((x): x is string => x !== null)
    const tallyFit = (title: string) => {
      const room = inner - title.length - 2
      let out = ''
      for (const part of tally) {
        const joined = out ? `${out} · ${part}` : part
        if (joined.length > room) break
        out = joined
      }
      return out || null
    }
    const phaseEntries = (phase: string) => others.filter(en => en.ids.some(id => byId.get(id)?.phase === phase))
    const noPlan = snapshot.schemaVersion !== 2 && snapshot.schemaVersion !== null ? line('no-plan', 'No execution plan (schema v1): workers are unavailable.', { dimColor: true }) : null

    // --- The states ---
    const body: unknown[] = []
    if (shownView === 'explore') {
      const ex = snapshot.explore
      const entering = (text: string) => motion.at('enter', `explore:${key}:${text}`, now) !== null
      body.push(
        ...alerts(true),
        card('problem', 'Problem', 'proposal.md', [
          // A Problem section that opens with a list: its lead line, then the items (AC-35).
          ...(ex && ex.problemItems?.length
            ? [
                ...(ex.problem && !ex.problem.includes('; ') ? [line('problem-lead', noEmDash(ex.problem), {}, 'wrap')] : []),
                ...ex.problemItems.map((item, i) => kv(`problem-item-${i}`, '•', { dimColor: true }, noEmDash(item), {}, null, 2)),
              ]
            : [
                <Box key="problem-text">
                  <Text wrap="wrap" {...(ex?.problem ? {} : { dimColor: true })}>
                    {ex?.problem ? noEmDash(ex.problem) : 'No problem statement yet: the coordinator writes proposal.md as you explore.'}
                  </Text>
                </Box>,
              ]),
        ]),
        ex && ex.findings.length
          ? card(
              'findings',
              'Findings',
              String(ex.findings.length),
              ex.findings.map((f, i) =>
                kv(`finding-${i}`, f.kind, f.kind === 'Confirmed' ? { color: 'success' } : f.kind === 'Open' ? { color: 'warning' } : { dimColor: true }, noEmDash(f.text), entering(f.text) ? { dimColor: true } : {}),
              ),
            )
          : null,
        helpersCard('Research'),
        ex && ex.decisions.length
          ? (() => {
              const openN = ex.decisions.filter(d => d.open).length
              const list = [...ex.decisions.filter(d => d.open), ...ex.decisions.filter(d => !d.open)]
              return card(
                'decisions',
                openN ? 'Decisions for you' : 'Decisions',
                openN ? `${openN} open` : `${ex.decisions.length}`,
                [
                  ...list.map((d, i) =>
                    kv(`decision-${i}`, d.id ?? String(i + 1), d.open ? { color: 'warning', bold: true } : { dimColor: true }, noEmDash(d.text), entering(d.text) ? { dimColor: true } : {}, d.recommended ? `Recommended: ${noEmDash(d.recommended)}` : null, 5),
                  ),
                  ...(openN ? [line('decisions-hint', 'Answer in your prompt.', { dimColor: true })] : []),
                ],
                openN ? 'attention' : 'plain',
              )
            })()
          : null,
      )
    } else if (shownView === 'validate') {
      const d8 = digest ? digest.slice(0, 8) : null
      const workers = snapshot.limits.max_workers
      const sealFrame = seal ? motion.frame(seal.t) : null
      const sealText =
        sealFrame === null
          ? null
          : sealFrame === 0
            ? { text: `[ approve ${d8} ]`, tone: {} }
            : sealFrame === 1
              ? { text: `[  ·  ${d8}  ]`, tone: { dimColor: true } }
              : sealFrame === 2
                ? { text: `⟦ ${d8} ⟧`, tone: { color: 'success' } }
                : { text: `⟦${d8}⟧ sealed`, tone: { color: 'success', bold: true } }
      const approvable = canApprove(snapshot) && digest !== null
      body.push(
        ...alerts(false),
        card(
          'approval',
          approvable || seal ? 'Ready for your approval' : 'Contract',
          d8,
          [
            <Box key="approval-text">
              <Text wrap="wrap">
                {`${criteria.length} criteri${criteria.length === 1 ? 'on' : 'a'} and ${snapshot.tasks.length} task${snapshot.tasks.length === 1 ? '' : 's'}. ${workers === 1 ? 'One worker runs' : `${workers} workers can run`} at a time.`}
              </Text>
            </Box>,
            sealText ? (
              <Box key="seal" flexDirection="row" gap={1}>
                <Text {...sealText.tone}>{sealText.text}</Text>
                {sealFrame !== null && sealFrame >= 3 ? <Text dimColor>approved by you</Text> : null}
              </Box>
            ) : approvable ? (
              <Box key="approval-cta" flexDirection="row" flexWrap="wrap" columnGap={1}>
                {button({ key: `approve:${digest!.slice(0, 12)}`, label: width < 50 ? `Approve ${d8}` : 'Approve contract', primary: true })}
                {width >= 60 ? <Text dimColor>Your approval of exactly this contract.</Text> : null}
              </Box>
            ) : (
              line('approval-wait', digest ? 'Approved.' : 'Not validated yet: /stip-validate checks the contract.', { dimColor: true }, 'wrap')
            ),
          ],
          'focus',
        ),
      )
      const diff = snapshot.contractDiff
      if (diff && (diff.criteria.length || diff.addedTasks.length || diff.changedTasks.length || diff.removedTasks.length)) {
        const settle = changeId ? motion.at('settle', `${changeId}:${JSON.stringify([diff.since, diff.criteria, diff.addedTasks, diff.changedTasks, diff.removedTasks])}`, now) : null
        // Changed lines arrive bright and bold, then settle; the ± stays (AC-36).
        const f = settle ? Math.floor(settle.t / 400) : 3
        const changedTone: Tone = f === 0 ? { bold: true, color: 'suggestion' } : f === 1 ? { bold: true } : {}
        const sign = { added: '+', changed: '±', removed: '−' } as const
        const lines = [
          ...diff.criteria.map(cr => ({ key: `diff-${cr.id}`, text: `${sign[cr.change]} ${cr.id} ${noEmDash(cr.title)}`, tone: cr.change === 'removed' ? { dimColor: true } : changedTone })),
          ...diff.addedTasks.map(t => ({ key: `diff-t-${t}`, text: `+ task ${t}`, tone: changedTone })),
          ...diff.changedTasks.map(t => ({ key: `diff-t-${t}`, text: `± task ${t}`, tone: changedTone })),
          ...diff.removedTasks.map(t => ({ key: `diff-t-${t}`, text: `− task ${t}, now out of the plan`, tone: { dimColor: true } })),
        ]
        body.push(card('diff', 'Changed since the last version', `approved ${diff.since.slice(0, 8)}`, lines.map(l => line(l.key, l.text, l.tone))))
      }
      const models = plannedModels(snapshot)
      body.push(
        graph.nodes.length || retired.length
          ? card('graph', 'Plan and assignees', null, [
              ...(graph.nodes.length ? graphBody() : []),
              ...(models ? [line('planned-models', models, { dimColor: true }, 'wrap')] : []),
              ...(retiredView ? [retiredView] : []),
            ])
          : null,
      )
    } else if (shownView === 'apply') {
      body.push(
        ...alerts(true),
        noPlan,
        waitingCard,
        others.length || retired.length ? card('who', 'Tasks', tallyFit('Tasks'), [...others.map(entryView), retiredView]) : null,
        graph.nodes.length ? card('graph', 'Plan', null, graphBody()) : null,
        criteriaCard(),
        helpersCard(`Research helpers (${snapshot.helpers.length})`),
      )
    } else if (shownView === 'check') {
      const reviewers = phaseEntries('check')
      body.push(
        ...alerts(true),
        waitingCard,
        card('review', 'Independent review', snapshot.check?.criterion ? `on ${snapshot.check.criterion}` : null, [
          ...(reviewers.length ? reviewers.map(entryView) : [line('review-none', 'The review starts when its task is delegated.', { dimColor: true })]),
          ...(retiredView ? [retiredView] : []),
        ]),
        criteriaCard(proofLines()),
        helpersCard(`Research helpers (${snapshot.helpers.length})`),
      )
    } else if (shownView === 'docs') {
      const docs = phaseEntries('docs')
      const paths = [...new Set(snapshot.tasks.filter(t => t.phase === 'docs').flatMap(t => t.writePaths))]
      const pending = criteria.filter(cr => cr.status !== 'passed')
      const foot =
        pending.length === 0
          ? 'All criteria passed.'
          : (() => {
              const cr = pending.find(x => x.pendingDocs) ?? pending[0]!
              const why = cr.pendingDocs ? 'waiting on docs' : (open?.why ?? 'open')
              return shortenWords(`${cr.id}: ${noEmDash(cr.title || cr.text)}, ${why}`, inner - buttonCells(ui.criteria ? 'Hide' : 'All') - 1)
            })()
      body.push(
        ...alerts(true),
        waitingCard,
        card('docs', 'Documentation', null, [
          ...(docs.length ? docs.map(entryView) : [line('docs-none', snapshot.phase === 'documented' ? 'Documented. /stip-archive closes the change.' : 'No docs task in the plan.', { dimColor: true })]),
          ...(paths.length ? [line('docs-paths', `Edits ${paths.join(' and ')}`, { dimColor: true }, 'wrap')] : []),
          ...(retiredView ? [retiredView] : []),
        ]),
        criteriaCard([], foot),
        helpersCard(`Research helpers (${snapshot.helpers.length})`),
      )
    } else if (shownView === 'archive' && archived) {
      body.push(...archiveBody(archived))
    }

    function archiveBody(a: StipArchiveSummary): unknown[] {
      const facts = archiveFacts(a)
      const used = modelsUsed(a)
      const fold = motion.at('fold', a.changeId, now)
      const t = fold ? fold.t : Number.POSITIVE_INFINITY
      const cardLines = [`${a.criteria.passed} of ${a.criteria.total} criteria passed`, `${a.tasks.total} tasks, ${facts.tasks.split(', ').slice(1).join(', ')}`, ...(used ? [used] : [])]
      // 0-900 ms the card as it stood; then its lines fold one per frame; then the one line; the summary after.
      if (t < 900 + cardLines.length * motion.FRAME_MS) {
        const kept = t < 900 ? cardLines.length : cardLines.length - 1 - Math.floor((t - 900) / motion.FRAME_MS)
        return [card('fold', a.changeId, 'Archive', cardLines.slice(0, Math.max(0, kept)).map((l, i) => line(`fold-${i}`, l, { dimColor: true })))]
      }
      const oneLine = (
        <Box key="archived-line" flexDirection="column">
          <Text color="success" bold wrap="truncate-end">
            {shortenWords(`✓ ${a.changeId}`, width)}
          </Text>
          <Text dimColor>{a.commit ? `archived, commit ${a.commit}` : 'archived'}</Text>
        </Box>
      )
      const summaryAt = 900 + cardLines.length * motion.FRAME_MS + 500
      if (t < summaryAt) return [oneLine]
      const entering = t < summaryAt + 2 * motion.FRAME_MS
      const defs: [string, string][] = [
        ['Criteria', facts.criteria],
        ['Tasks', facts.tasks],
        ...(facts.time ? [['Time', facts.time] as [string, string]] : []),
      ]
      const tw = Math.max(4, ...a.models.map(m => m.taskId.length))
      const mw = Math.max(5, ...a.models.map(m => (friendlyModel(m.model) ?? 'inherited').length))
      const ew = Math.max(6, ...a.models.map(m => (effortLabel(m.effort) ?? '').length))
      const row = (cells: string[]) => cells.map((x, i) => x.padEnd([tw, mw, ew, 8][i]!)).join('  ').trimEnd()
      const table = [row(['Task', 'Model', 'Effort', 'Attempts']), ...a.models.map(m => row([m.taskId, friendlyModel(m.model) ?? 'inherited', effortLabel(m.effort) ?? '', String(m.attempts)]))]
      const tableFits = table.every(l => l.length <= inner)
      const dim: Tone = entering ? { dimColor: true } : {}
      return [
        oneLine,
        card('archived', 'Archived', a.commit ? `commit ${a.commit}` : null, defs.map(([k, v]) => kv(`def-${k}`, k, { dimColor: true }, v, dim, null, 9))),
        a.models.length
          ? card(
              'models',
              'Models used',
              null,
              tableFits
                ? table.map((l, i) =>
                    i === 0 ? line('mu-head', l, { dimColor: true }) : line(`mu-${a.models[i - 1]!.taskId}`, l, dim),
                  )
                : a.models.map(m => line(`mu-${m.taskId}`, [m.taskId, friendlyModel(m.model), effortLabel(m.effort)?.split(' ')[0], m.attempts > 1 ? `×${m.attempts}` : null].filter(Boolean).join(' '), dim)),
            )
          : null,
        a.followUps.length
          ? card(
              'archive-followups',
              'Follow-ups',
              'from the review',
              a.followUps.map((f, i) => kv(`afu-${i}`, String(i + 1), { dimColor: true }, noEmDash(f.title), dim, f.detail ? noEmDash(f.detail) : null, 3)),
            )
          : null,
        <Box key="archive-cta" flexDirection="column">
          {promptAction('archive-next', { key: 'start-next', label: 'Start next change', primary: true }, `the archive is in .workflow/archive/${a.changeId}/`)}
        </Box>,
      ]
    }

    const handoffTop = shownView === 'archive' ? null : handoffLine()
    return finish(
      <Box flexDirection="column" width={width} rowGap={0}>
        {head}
        {header.badgeBelow ? <Box key="badge-line">{badgeText}</Box> : null}
        {chipsRow}
        {ui.picker ? pickerList(snapshot) : null}
        {handoffTop}
        {rail}
        {body.filter(Boolean) as never}
        {footer(changeId !== null)}
      </Box>,
    )
  })
}

/**
 * A path fitted to `room` from its end: whole trailing segments after `…/` (`…/Projects/atlas`);
 * the last segment alone, shortened at a word boundary, when even that does not fit.
 */
export function tailPath(path: string, room: number): string {
  if (path.length <= room) return path
  const parts = path.split('/').filter(Boolean)
  let out = ''
  for (let i = parts.length - 1; i >= 0; i--) {
    const next = out ? `${parts[i]}/${out}` : parts[i]!
    if (`…/${next}`.length > room) break
    out = next
  }
  return out ? `…/${out}` : shortenWords(`…/${parts[parts.length - 1] ?? path}`, Math.max(4, room))
}
