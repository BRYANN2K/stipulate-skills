// AC-17: the /stip pane, Plan tab. One pane (`stipulate`) carries two tabs, Plan and Settings; its
// title says which (settings.tsx draws the Settings tab). Header: tabs, a change picker, phase and
// approval, stage stepper, one summary line. Plan: one aligned row per task in execution order with
// model + effort as recorded at launch. Criteria: one summary line, one line each when shown, each
// openable. Research helpers by title. Every action runs in actions.ts (ui.press keyed by element).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StipCriterion, StipSnapshot, StipTask } from '../../types'
import {
  EFFORT_GLYPH,
  PANE_ID,
  PLAN_TITLE,
  SETTINGS_TITLE,
  approvalLabel,
  approvalState,
  canApprove,
  cell,
  compactWords,
  counts,
  decodeUi,
  elapsed,
  fit,
  friendlyModel,
  isActive,
  meaningfulTool,
  patchUi,
  pendingTickets,
  planGroups,
  recordedProfiles,
  stagesOf,
  tamperOf,
  taskRow,
  ticketKey,
  viaHook,
  workerElapsed,
  type PaneUi,
  type Recorded,
  type RowAction,
  type RowTone,
} from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const bandHiddenAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)
const ticketsAtom = atom({ plugin: 'stipulate', key: 'tickets' } as const, {})
// The pane's UI state (open Details, criteria, picker), encoded by model.ts decodeUi/encodeUi.
const uiAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)

/** Where the person adopts changes they made outside this session (the core's person-only command). */
const RESYNC_HINT = 'Made this change yourself in another terminal? /stip-resync lists the differences; /stip-resync confirm adopts them.'

const setUi = ($: EngineInterface, fn: (ui: PaneUi) => Partial<PaneUi>) => void update($, uiAtom, raw => patchUi(raw, fn(decodeUi(raw))))

/** Switches the one pane to a tab; pressing the shown tab closes the pane. */
async function showTab($: EngineInterface, title: string, current: string) {
  if (title === current) await $.ui.close({ id: PANE_ID })
  else await $.ui.open({ id: PANE_ID, title })
  $.ui.invalidate('ui.render')
}

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
const CRITERION: Record<StipCriterion['status'], { icon: string; tone: Tone }> = {
  passed: { icon: '✓', tone: { color: 'success' } },
  failed: { icon: '✗', tone: { color: 'error' } },
  unverified: { icon: '○', tone: { dimColor: true } },
  pending: { icon: '○', tone: { dimColor: true } },
}

/** Terminal cells a button takes: `[ label ]` and one gap. */
const BUTTON = (label: string) => label.length + 5
const ACTION_LABELS: Record<RowAction, string[]> = {
  cancel: ['Cancel'],
  review: ['View result', 'Accept', 'Correct'],
  delegate: ['Delegate'],
  launch: ['Launch'],
  redo: ['Redo'],
  none: [],
}

export const registerPane: Register = on => {
  on('command.run', { command: 'stip' }, async $ => {
    const opened = await $.ui.open({ id: PANE_ID, title: PLAN_TITLE })
    $.ui.invalidate('ui.render')
    return { text: opened.isPlaced ? 'Stip pane opened.' : `Stip pane not placed: ${opened.reason}` }
  })

  on('ui.render', { component: 'Pane', requestId: 'stipulate' }, async ($, e, next) => {
    if (e.props.title === SETTINGS_TITLE) return next(e)
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    // Mobile draws no field yet (its table may still name one): buttons and fixed choices there.
    const Input = e.surface !== 'mobile' && 'Input' in els ? els.Input : null
    const width = Math.max(24, e.props.bodyColumns)
    // Narrow or mobile: a row's buttons go on the line below it. Proportional surfaces (desktop,
    // vscode) never pad with spaces: columns are fixed-width Boxes and actions stay on the row.
    const stacked = e.surface === 'mobile' || (e.surface === 'terminal' && width < 72)
    const proportional = e.surface !== 'terminal'
    // A docked terminal pane under 60 columns: one short row per task, glyph-only effort, no duration.
    const compact = e.surface === 'terminal' && width < 60
    const slim = proportional && width < 64
    const snapshot = await read($, snapshotAtom)
    const ui = decodeUi(await read($, uiAtom))
    const hidden = await read($, bandHiddenAtom)
    const now = await $.clock.now()
    const line = (key: string, text: string, props: Tone = {}) => (
      <Box key={key}>
        <Text wrap="truncate-end" {...props}>
          {fit(text, width)}
        </Text>
      </Box>
    )
    const refresh = <Button key="refresh" label="Refresh" dimColor onPress={viaHook} />
    const tabs = (
      <Box key="tabs" flexDirection="row" gap={1} flexShrink={0}>
        <Button key="tab-plan" label="Plan ▾" variant="primary" onPress={() => void showTab($, PLAN_TITLE, PLAN_TITLE)} />
        <Button key="tab-settings" label="Settings" dimColor onPress={() => void showTab($, SETTINGS_TITLE, PLAN_TITLE)} />
      </Box>
    )

    if (!snapshot) {
      return (
        <Box flexDirection="column" width={width}>
          {tabs}
          {line('loading', 'No Stip snapshot yet.', { dimColor: true })}
          {refresh}
        </Box>
      )
    }

    // --- Change picker: in-flight first, then the others, then finished, then the archived count ---
    const picker = (s: StipSnapshot) => {
      const order = [...s.changes].sort((a, b) => Number(b.inFlight) - Number(a.inFlight) || Number(a.finished) - Number(b.finished) || a.id.localeCompare(b.id))
      const approvalWord = (a: string) => (a === 'approved' || a === 'recorded' ? '✓ approved' : a === 'stale' ? '! stale' : '○ not approved')
      return (
        <Box key="picker" flexDirection="column" paddingLeft={2}>
          {order.map(c => (
            <Box key={`pick-${c.id}`} flexDirection="row" gap={1}>
              <Button
                key={`bind:${c.id}`}
                label={`${c.id === s.changeId ? '●' : '○'} ${c.id}`}
                plain
                {...(c.id === s.changeId ? {} : { dimColor: true })}
                onPress={viaHook}
              />
              <Text dimColor wrap="truncate-end">
                {fit(
                  [c.phase, approvalWord(c.approval), c.activeWorkers ? `${c.activeWorkers} running` : null, c.finished ? 'finished' : null, c.title && c.title !== c.id ? c.title : null]
                    .filter(Boolean)
                    .join(' · '),
                  Math.max(10, width - c.id.length - 8),
                )}
              </Text>
            </Box>
          ))}
          {s.archivedCount ? line('archived', `${s.archivedCount} archived`, { dimColor: true }) : null}
        </Box>
      )
    }

    const changeId = snapshot.changeId
    if (!changeId) {
      return (
        <Box flexDirection="column" width={width}>
          {tabs}
          {line('unbound', snapshot.changes.length ? 'No change is bound to this session. Pick one:' : 'No open Stip change in this project.')}
          {snapshot.changes.length ? picker(snapshot) : null}
          {line('hint', 'Or bind with /stip-bind <change-id>.', { dimColor: true })}
          {refresh}
        </Box>
      )
    }

    // --- Data (file reads only; no engine process while drawing) ---
    const state = approvalState(snapshot)
    const c = counts(snapshot)
    const digest = snapshot.approval.digest
    const root = await $.session.root().catch(() => '')
    const readJson = async (path: string): Promise<unknown> => {
      const text = root ? await $.fs.read(`${root}/${path}`).catch(() => '') : ''
      try {
        return typeof text === 'string' && text ? JSON.parse(text) : null
      } catch {
        return null
      }
    }
    const recorded = recordedProfiles(await readJson(`.workflow/.runtime/${changeId}/state.json`), await readJson('.workflow/.runtime/engine-helpers.json'))
    const criteria = snapshot.criteria ?? []
    const tickets = pendingTickets(snapshot, await read($, ticketsAtom))
    const toLaunch = new Set(tickets.map(t => t.description))
    const rows = new Map(
      snapshot.tasks.map(t => {
        const w = t.latest
        const unlaunched = w !== null && toLaunch.has(ticketKey(w.changeId, w.taskId, w.attempt))
        const tampered = w !== null && tamperOf(snapshot, t.id, w.attempt) !== null
        const reopened = (snapshot.lastRebase?.reopened ?? []).includes(t.id)
        return [t.id, taskRow(snapshot, t, now, { unlaunched, tampered, reopened })] as const
      }),
    )
    const profileOf = (t: StipTask): Recorded | null => {
      const w = t.latest
      if (!w) return null
      const r = recorded.jobs[`${t.id}#${w.attempt}`]
      return { model: w.model ?? r?.model ?? null, effort: r?.effort ?? null }
    }
    const modelText = (r: Recorded | null) => friendlyModel(r?.model) ?? ''
    const effortText = (r: Recorded | null) => (r?.effort && EFFORT_GLYPH[r.effort] ? `${EFFORT_GLYPH[r.effort]} ${r.effort}` : '')
    const actionsOf = (t: StipTask): RowAction => {
      const a = rows.get(t.id)!.action
      return a === 'delegate' && !snapshot.approval.current ? 'none' : a
    }

    // --- Column layout, from bodyColumns ---
    const idWidth = Math.min(24, Math.max(4, ...snapshot.tasks.map(t => t.id.length))) + 2
    const profiles = snapshot.tasks.map(profileOf)
    const modelWidth = Math.max(0, ...profiles.map(p => modelText(p).length))
    const effortWidth = Math.max(0, ...profiles.map(p => effortText(p).length))
    const modelCol = modelWidth ? modelWidth + 1 : 0
    const effortCol = slim ? 0 : effortWidth ? effortWidth + 2 : modelCol ? 1 : 0
    const durCol = slim ? 0 : [...rows.values()].some(r => r.duration) ? 7 : 0
    const fixed = 2 + idWidth + modelCol + effortCol + durCol
    const detailsLabel = (open: boolean) => (proportional ? (open ? '▾' : '›') : open ? 'Hide' : 'Details')
    const buttonsOf = (t: StipTask) =>
      ACTION_LABELS[actionsOf(t)].filter(l => l !== 'View result' || t.latest?.hasResult).reduce((n, l) => n + BUTTON(l), 0) + BUTTON(detailsLabel(false))
    /** A row keeps its buttons beside it while its state words fit whole (up to 30 cells); else below it. */
    const layoutOf = (t: StipTask) => {
      const beside = !stacked && (proportional || width - buttonsOf(t) - fixed >= Math.min(30, Math.max(10, rows.get(t.id)!.words.length)))
      const textWidth = beside ? width - buttonsOf(t) : width
      return { beside, textWidth, stateWidth: Math.max(6, textWidth - fixed) }
    }

    // --- Header ---
    const approval =
      (state === 'approved' || state === 'approved (adopted)') && digest ? `${state} ${digest.slice(0, 8)}` : approvalLabel(state)
    const summary = [
      c.running ? `${c.running} running` : null,
      c.review ? `${c.review} awaiting review` : null,
      snapshot.ready.length ? `${snapshot.ready.length} ready` : null,
      tickets.length ? `${tickets.length} ready to launch` : null,
      c.helpers ? `${c.helpers} helper${c.helpers === 1 ? '' : 's'}` : null,
      snapshot.tampered?.length ? `${snapshot.tampered.length} tampered` : null,
    ].filter(Boolean)
    const approvalTone: Tone =
      state === 'not confirmed' ? { color: 'error' } : state === 'stale' || state === 'awaiting approval' ? { color: 'warning' } : state.startsWith('approved') ? { color: 'success' } : {}

    // --- Rows ---
    const rowButtons = (t: StipTask) => {
      const w = t.latest
      const action = actionsOf(t)
      const tampered = w !== null && tamperOf(snapshot, t.id, w.attempt) !== null
      return (
        <Box key={`rb-${t.id}`} flexDirection="row" gap={1} flexShrink={0} {...(layoutOf(t).beside ? {} : { paddingLeft: 2 })}>
          {action === 'cancel' ? <Button key={`cancel:${t.id}`} label="Cancel" onPress={viaHook} /> : null}
          {action === 'review' && w?.hasResult ? <Button key={`result:${t.id}`} label="View result" dimColor onPress={viaHook} /> : null}
          {action === 'review' && w?.status === 'returned' && w.acceptance === 'pending' ? (
            <Button key={tampered ? `accept-check:${t.id}` : `accept:${t.id}`} label={tampered ? 'Accept…' : 'Accept'} variant="primary" onPress={viaHook} />
          ) : null}
          {action === 'review' ? <Button key={`correct:${t.id}`} label="Correct" onPress={viaHook} /> : null}
          {action === 'delegate' ? <Button key={`delegate:${t.id}`} label="Delegate" variant="primary" onPress={viaHook} /> : null}
          {action === 'launch' ? <Button key={`relaunch:${t.id}`} label="Launch" variant="primary" onPress={viaHook} /> : null}
          {action === 'redo' ? <Button key={`redo:${t.id}`} label="Redo" variant="primary" onPress={viaHook} /> : null}
          <Button
            key={`details-${t.id}`}
            label={detailsLabel(ui.task === t.id)}
            dimColor
            {...(proportional ? { plain: true as const } : {})}
            onPress={() => setUi($, u => ({ task: u.task === t.id ? null : t.id }))}
          />
        </Box>
      )
    }

    const details = (t: StipTask) => {
      const w = t.latest
      const tamper = w ? tamperOf(snapshot, t.id, w.attempt) : null
      const p = profileOf(t)
      const covered = t.criteria.map(id => {
        const cr = criteria.find(x => x.id === id)
        return `${id}${cr ? ` ${cr.title}` : ''}`
      })
      const tool = w ? meaningfulTool(w.lastTool) : null
      const facts = [
        t.objective,
        `depends on ${t.dependsOn.join(', ') || 'nothing'} · writes ${t.writePaths.join(', ') || 'nothing (read-only)'}`,
        ...(covered.length ? [`covers ${covered.join(', ')}`] : []),
        ...(w
          ? [
              `attempt ${w.attempt}${w.attempt > 1 ? ` (earlier: ${Array.from({ length: w.attempt - 1 }, (_, i) => `#${i + 1}`).join(', ')})` : ''} · ${w.status}${w.acceptance !== 'pending' ? `, ${w.acceptance}` : ''}${w.isolated ? ` · own worktree${w.integrated ? ', integrated' : ''}` : ''}`,
              `${p?.model ? `model ${p.model}` : 'model inherited'}${p?.effort && p.effort !== 'inherit' ? ` · effort ${p.effort}` : ''} · ${workerElapsed(w, now)}${tool ? ` · last ${tool}` : ''}${w.agentId ? ` · agent ${w.agentId}` : ''}`,
              ...(w.error ? [`why: ${w.error}`] : []),
              ...(w.status === 'cancelled' && w.error && /changed outside/.test(w.error) ? [RESYNC_HINT] : []),
              ...(w.reviewReason ? [`review: ${w.reviewReason}`] : []),
              ...(t.awaitingIntegration ? ['not integrated: request a correction (the integration notice lists the files and what to do)'] : []),
            ]
          : []),
      ]
      const correctable = w !== null && ((w.status === 'returned' && w.acceptance === 'pending') || w.acceptance === 'rejected' || t.awaitingIntegration)
      return (
        <Box key={`details-box-${t.id}`} flexDirection="column" paddingLeft={4}>
          {tamper ? (
            <Box key={`tamper-${t.id}`} flexDirection="column">
              <Text color="error" bold wrap="wrap">
                {`⚠ tampered — inspect git diff${tamper.integratedClaim ? ' (the record claimed an integration)' : ''}`}
              </Text>
              <Text color="error" wrap="wrap">
                {tamper.paths.length ? `paths: ${tamper.paths.join(', ')}` : 'paths: none changed under its write paths'}
              </Text>
              <Text dimColor wrap="wrap">
                {tamper.note}
              </Text>
              <Text dimColor wrap="wrap">
                {RESYNC_HINT}
              </Text>
              {w && w.status === 'returned' && w.acceptance === 'pending' ? (
                <Button key={`accept:${t.id}`} label="Accept anyway (I inspected git diff)" onPress={viaHook} />
              ) : null}
            </Box>
          ) : null}
          {facts.map(f => (
            <Text dimColor wrap="wrap">
              {f}
            </Text>
          ))}
          {correctable && Input ? (
            <Input
              key={`reason:${t.id}`}
              label="Correction reason"
              placeholder="What must change (8+ characters)"
              submitLabel="Request correction"
              onSubmit={viaHook}
            />
          ) : null}
          {correctable && !Input ? line(`reason-hint-${t.id}`, 'Correct sends a fixed reason; type /stip-action for your own.', { dimColor: true }) : null}
        </Box>
      )
    }

    const compactLine = (t: StipTask) => {
      const r = rows.get(t.id)!
      const tone = TONE[r.tone]
      const p = profileOf(t)
      const glyph = p?.effort && EFFORT_GLYPH[p.effort] ? EFFORT_GLYPH[p.effort]! : ''
      const idW = Math.min(16, Math.max(4, ...snapshot.tasks.map(x => x.id.length))) + 2
      const modelW = Math.max(0, ...profiles.map(x => modelText(x).length)) + (profiles.some(x => modelText(x)) ? 1 : 0)
      const glyphW = profiles.some(x => x?.effort && EFFORT_GLYPH[x.effort]) ? 2 : 0
      const room = Math.max(4, width - 2 - idW - modelW - glyphW - 2)
      const action = actionsOf(t)
      return (
        <Box key={`task-${t.id}`} flexDirection="column">
          <Box flexDirection="row">
            <Box key={`row-${t.id}`} flexDirection="row" flexGrow={1} flexShrink={1}>
              <Box width={2} flexShrink={0}>
                <Text {...tone} bold>{`${r.icon} `}</Text>
              </Box>
              <Box width={idW} flexShrink={0}>
                <Text bold={ui.task === t.id} dimColor={r.tone === 'blocked'} wrap="truncate-end">{`${t.id} `}</Text>
              </Box>
              {modelW ? (
                <Box width={modelW} flexShrink={0}>
                  <Text dimColor={!p}>{modelText(p) ? `${modelText(p)} ` : ''}</Text>
                </Box>
              ) : null}
              {glyphW ? (
                <Box width={glyphW} flexShrink={0}>
                  <Text color="claude">{glyph ? `${glyph} ` : ''}</Text>
                </Box>
              ) : null}
              <Text {...tone}>{compactWords(r.words, room)}</Text>
            </Box>
            <Button key={`details-${t.id}`} label={ui.task === t.id ? '▾' : '›'} plain dimColor onPress={() => setUi($, u => ({ task: u.task === t.id ? null : t.id }))} />
          </Box>
          {action !== 'none' ? (
            <Box key={`rb-${t.id}`} flexDirection="row" gap={1} paddingLeft={2}>
              {action === 'cancel' ? <Button key={`cancel:${t.id}`} label="Cancel" onPress={viaHook} /> : null}
              {action === 'review' && t.latest?.hasResult ? <Button key={`result:${t.id}`} label="Result" dimColor onPress={viaHook} /> : null}
              {action === 'review' && t.latest?.status === 'returned' && t.latest.acceptance === 'pending' ? (
                <Button
                  key={tamperOf(snapshot, t.id, t.latest.attempt) ? `accept-check:${t.id}` : `accept:${t.id}`}
                  label="Accept"
                  variant="primary"
                  onPress={viaHook}
                />
              ) : null}
              {action === 'review' ? <Button key={`correct:${t.id}`} label="Correct" onPress={viaHook} /> : null}
              {action === 'delegate' ? <Button key={`delegate:${t.id}`} label="Delegate" variant="primary" onPress={viaHook} /> : null}
              {action === 'launch' ? <Button key={`relaunch:${t.id}`} label="Launch" variant="primary" onPress={viaHook} /> : null}
              {action === 'redo' ? <Button key={`redo:${t.id}`} label="Redo" variant="primary" onPress={viaHook} /> : null}
            </Box>
          ) : null}
          {ui.task === t.id ? details(t) : null}
        </Box>
      )
    }

    const taskLine = (t: StipTask) => {
      if (compact) return compactLine(t)
      const r = rows.get(t.id)!
      const tone = TONE[r.tone]
      const dim = r.tone === 'blocked'
      const p = profileOf(t)
      const { beside, textWidth, stateWidth } = layoutOf(t)
      return (
        <Box key={`task-${t.id}`} flexDirection="column">
          <Box flexDirection={beside ? 'row' : 'column'}>
            <Box key={`row-${t.id}`} flexDirection="row" {...(proportional ? { flexGrow: 1, flexShrink: 1 } : { width: textWidth, flexShrink: 1 })}>
              <Box width={2} flexShrink={0}>
                <Text {...tone} bold>{`${r.icon} `}</Text>
              </Box>
              <Box width={idWidth} flexShrink={0}>
                <Text bold={ui.task === t.id} dimColor={dim} wrap="truncate-end">{`${t.id} `}</Text>
              </Box>
              {modelCol ? (
                <Box width={modelCol} flexShrink={0}>
                  <Text dimColor={!p} wrap="truncate-end">{modelText(p) ? `${modelText(p)} ` : ''}</Text>
                </Box>
              ) : null}
              {effortCol ? (
                <Box width={effortCol} flexShrink={0}>
                  <Text color="claude" wrap="truncate-end">{effortText(p) ? `${effortText(p)} ` : ''}</Text>
                </Box>
              ) : null}
              {durCol ? (
                <Box width={durCol} flexShrink={0}>
                  <Text dimColor>{r.duration ? `${r.duration} ` : ''}</Text>
                </Box>
              ) : null}
              <Box flexGrow={1} flexShrink={1}>
                <Text {...tone} wrap="truncate-end">{proportional ? r.words : fit(r.words, stateWidth)}</Text>
              </Box>
            </Box>
            {rowButtons(t)}
          </Box>
          {ui.task === t.id ? details(t) : null}
        </Box>
      )
    }

    // --- Criteria: summary; when shown one line each, each openable ---
    const verified = criteria.filter(cr => cr.status === 'passed').length
    const failed = criteria.filter(cr => cr.status === 'failed').length
    const acWidth = Math.max(4, ...criteria.map(cr => cr.id.length)) + 2
    const criterionLine = (cr: StipCriterion) => {
      const look = CRITERION[cr.status] ?? CRITERION.pending
      const open = ui.criterion === cr.id
      const titleRoom = Math.max(8, width - 2 - acWidth - BUTTON(open ? 'Close' : 'Open') - 1)
      const covering = snapshot.tasks.filter(t => t.criteria.includes(cr.id)).map(t => t.id)
      return (
        <Box key={`crit-${cr.id}`} flexDirection="column">
          <Box flexDirection="row">
            <Box key={`ac-${cr.id}`} flexDirection="row" width={width - BUTTON(open ? 'Close' : 'Open')} flexShrink={1}>
              <Box width={2} flexShrink={0}>
                <Text {...look.tone}>{`${look.icon} `}</Text>
              </Box>
              <Box width={acWidth} flexShrink={0}>
                <Text dimColor>{`${cr.id} `}</Text>
              </Box>
              <Box flexShrink={1}>
                <Text wrap="truncate-end">{proportional ? cr.title || '—' : fit(cr.title || '—', titleRoom)}</Text>
              </Box>
            </Box>
            <Button key={`open-${cr.id}`} label={open ? 'Close' : 'Open'} dimColor onPress={() => setUi($, u => ({ criterion: u.criterion === cr.id ? null : cr.id }))} />
          </Box>
          {open ? (
            <Box key={`ac-full-${cr.id}`} flexDirection="column" paddingLeft={2 + acWidth}>
              {cr.text.split('\n').map(l => (
                <Text wrap="wrap">{l || ' '}</Text>
              ))}
              <Text {...look.tone} wrap="wrap">
                {cr.evidence ? `${cr.status}: ${cr.evidence}` : `${cr.status === 'pending' ? 'not checked yet' : cr.status}`}
              </Text>
              <Text dimColor wrap="wrap">
                {covering.length ? `covered by ${covering.join(', ')}` : 'no plan task names it'}
              </Text>
            </Box>
          ) : null}
        </Box>
      )
    }

    const helpers = snapshot.helpers.slice(0, 10)
    const groups = planGroups(snapshot.tasks)
    const orphans = snapshot.orphanTasks ?? []
    const retired = (snapshot.lastRebase?.retired ?? []).filter(id => !snapshot.tasks.some(t => t.id === id))

    return (
      <Box flexDirection="column" width={width}>
        <Box key="head" flexDirection={stacked ? 'column' : 'row'} justifyContent="space-between">
          {compact ? (
            <Box key="title" flexDirection="column">
              <Button key="picker" label={`${fit(changeId, Math.max(8, width - 6))} ${ui.picker ? '▴' : '▾'}`} onPress={() => setUi($, u => ({ picker: !u.picker }))} />
              <Box flexDirection="row" gap={1}>
                <Text dimColor>{snapshot.phase ?? 'unknown'}</Text>
                <Text bold {...approvalTone}>{state === 'approved (adopted)' ? 'approved' : approval.replace(/ [0-9a-f]{8}$/, '')}</Text>
              </Box>
            </Box>
          ) : (
          <Box key="title" flexDirection="row" gap={1} flexShrink={1}>
            <Button key="picker" label={`${changeId} ${ui.picker ? '▴' : '▾'}`} onPress={() => setUi($, u => ({ picker: !u.picker }))} />
            <Text dimColor>{snapshot.phase ?? 'unknown'}</Text>
            <Text bold {...approvalTone}>{approval}</Text>
          </Box>
          )}
          {tabs}
        </Box>
        {ui.picker ? picker(snapshot) : null}
        <Box key="stages" flexDirection="row" flexWrap="wrap" columnGap={1}>
          {stagesOf(snapshot).map((s, i) => (
            <Text {...(s.mark === '✓' ? { color: 'success' } : s.mark === '▶' ? { color: 'suggestion', bold: true } : s.mark === '!' ? { color: 'error' } : { dimColor: true })}>
              {`${s.mark} ${s.name}${width >= 90 && i < 6 ? ' ›' : ''}`}
            </Text>
          ))}
        </Box>
        {line('counts', summary.length ? summary.join(' · ') : 'nothing running', { dimColor: true })}
        {state === 'not confirmed'
          ? line('unconfirmed', 'The engine records an approval you did not give through Stip; it is treated as unapproved. Approve here to make it yours.', { color: 'error' })
          : null}
        {snapshot.error ? line('error', `error: ${snapshot.error}`, { color: 'error' }) : null}
        {snapshot.registryCurrent === false || orphans.length ? (
          <Box key="rebase-row" flexDirection="row" gap={1} flexWrap="wrap">
            <Text color="error" bold>
              {orphans.length
                ? compact || width < 70
                  ? `! Plan changed · ${orphans.length} removed`
                  : `! Plan changed · ${orphans.length} task${orphans.length === 1 ? '' : 's'} removed`
                : compact || width < 70
                  ? '! Registry outdated'
                  : '! Registry tied to the previous contract'}
            </Text>
            <Button key="rebase" label={compact ? 'Rebase' : 'Rebase registry'} variant="primary" onPress={viaHook} />
          </Box>
        ) : null}
        {canApprove(snapshot) && digest !== null ? (
          <Box key="approve-row" flexDirection="row" gap={1}>
            <Button key={`approve:${digest.slice(0, 12)}`} label={`Approve contract ${digest.slice(0, 12)}`} variant="primary" onPress={viaHook} />
            <Text dimColor>{fit('Your approval of exactly this contract.', Math.max(8, width - 32))}</Text>
          </Box>
        ) : null}

        {snapshot.schemaVersion !== 2 ? line('no-plan', 'No execution plan (schema v1): workers are unavailable.', { dimColor: true }) : null}
        {groups.map(g => (
          <Box key={`group-${g.phase}`} flexDirection="column" marginTop={1}>
            <Text bold>{g.title}</Text>
            {g.tasks.map(taskLine)}
          </Box>
        ))}

        {retired.length ? (
          <Box key="retired" flexDirection="column" marginTop={1}>
            <Box flexDirection="row" gap={1}>
              <Text dimColor>{`Retired (${retired.length})`}</Text>
              <Button key="retired-toggle" label={compact ? (ui.retired ? '▾' : '›') : detailsLabel(ui.retired)} dimColor {...(proportional || compact ? { plain: true as const } : {})} onPress={() => setUi($, u => ({ retired: !u.retired }))} />
            </Box>
            {ui.retired ? (
              <Box key="retired-full" flexDirection="column" paddingLeft={2}>
                {retired.map(id => (
                  <Text dimColor wrap="wrap">{`${id} · removed from the plan in the revised contract; its jobs are kept as retired`}</Text>
                ))}
              </Box>
            ) : null}
          </Box>
        ) : null}

        <Box key="criteria" flexDirection="row" gap={1} marginTop={1}>
          <Text bold>Criteria</Text>
          <Text dimColor>{`${criteria.length} · ${verified} verified · ${failed} failed`}</Text>
          {criteria.length ? <Button key="criteria-toggle" label={ui.criteria ? 'Hide' : 'Show'} dimColor onPress={() => setUi($, u => ({ criteria: !u.criteria, criterion: null }))} /> : null}
        </Box>
        {ui.criteria ? criteria.map(criterionLine) : null}

        <Box key="h-helpers" flexDirection="column" marginTop={1}>
          <Text bold>{`Research helpers (${snapshot.helpers.length})`}</Text>
        </Box>
        {helpers.length === 0 && !tickets.some(t => t.kind === 'helper') ? line('no-helpers', 'None.', { dimColor: true }) : null}
        {tickets
          .filter(t => t.kind === 'helper')
          .map(t => line(`ht-${t.description}`, `◇ ${t.subagentType} · ready to launch — ask Claude to launch it`, { color: 'warning' }))}
        {helpers.map(helper => {
          const active = isActive(helper.status)
          const icon = active ? '▶' : helper.status === 'returned' ? '◆' : helper.status === 'failed' ? '!' : '·'
          const tone: Tone = active ? { color: 'suggestion' } : helper.status === 'returned' ? { color: 'success' } : helper.status === 'failed' ? { color: 'error' } : { dimColor: true }
          const r = recorded.helpers[helper.helperId] ?? null
          const model = modelText(r)
          const effort = effortText(r)
          const open = ui.helper === helper.helperId
          const rest = ` · ${helper.role} · ${active ? helper.status : helper.status === 'returned' ? 'answered' : helper.status} · ${workerElapsed(helper, now)} · ${helper.title || helper.question}`
          const toggleHelper = () => setUi($, u => ({ helper: u.helper === helper.helperId ? null : helper.helperId }))
          const fullBox = open ? (
            <Box key={`hfull-${helper.helperId}`} flexDirection="column" paddingLeft={compact ? 2 : 4}>
              <Text wrap="wrap">{helper.question}</Text>
              {r?.model ? (
                <Text dimColor>{compact ? `${[model, effort].filter(Boolean).join(' ')}` : `model ${r.model}${r.effort ? ` · effort ${r.effort}` : ''}`}</Text>
              ) : null}
              {helper.error ? <Text color="error" wrap="wrap">{`why: ${helper.error}`}</Text> : null}
              {compact && (active || helper.hasResult) ? (
                <Box flexDirection="row" gap={1}>
                  {active ? <Button key={`hcancel:${helper.helperId}`} label="Cancel" onPress={viaHook} /> : null}
                  {helper.hasResult ? <Button key={`hresult:${helper.helperId}`} label="View result" dimColor onPress={viaHook} /> : null}
                </Box>
              ) : null}
            </Box>
          ) : null
          if (compact)
            return (
              <Box key={`helper-${helper.helperId}`} flexDirection="column">
                <Box flexDirection="row">
                  <Box key={`hrow-${helper.helperId}`} flexDirection="row" flexGrow={1} flexShrink={1}>
                    <Text {...tone}>{`${icon} `}</Text>
                    <Text>{`${helper.role} · ${active ? helper.status : helper.status === 'returned' ? 'answered' : helper.status} · ${workerElapsed(helper, now)}`}</Text>
                  </Box>
                  <Button key={`hdetails-${helper.helperId}`} label={open ? '▾' : '›'} plain dimColor onPress={toggleHelper} />
                </Box>
                <Box key={`htitle-${helper.helperId}`} paddingLeft={2}>
                  <Text wrap="wrap">{helper.title || helper.question}</Text>
                </Box>
                {fullBox}
              </Box>
            )
          return (
            <Box key={`helper-${helper.helperId}`} flexDirection="column">
              <Box flexDirection={stacked ? 'column' : 'row'} gap={stacked ? 0 : 1}>
                <Box key={`hrow-${helper.helperId}`} flexDirection="row" flexGrow={1} flexShrink={1}>
                  <Text {...tone}>{`${icon} `}</Text>
                  {model ? <Text>{`${model} `}</Text> : null}
                  {effort ? <Text color="claude">{`${effort} `}</Text> : null}
                  <Box flexShrink={1}>
                    <Text wrap="wrap">{rest.replace(/^ · /, model || effort ? '· ' : '')}</Text>
                  </Box>
                </Box>
                <Box flexDirection="row" gap={1} flexShrink={0}>
                  {active ? <Button key={`hcancel:${helper.helperId}`} label="Cancel" onPress={viaHook} /> : null}
                  {helper.hasResult ? <Button key={`hresult:${helper.helperId}`} label="View result" dimColor onPress={viaHook} /> : null}
                  <Button key={`hdetails-${helper.helperId}`} label={detailsLabel(open)} dimColor {...(proportional ? { plain: true as const } : {})} onPress={toggleHelper} />
                </Box>
              </Box>
              {fullBox}
            </Box>
          )
        })}

        <Box key="footer" flexDirection="row" gap={1} marginTop={1}>
          <Text dimColor>{`refreshed ${elapsed(now - snapshot.refreshedAt)} ago`}</Text>
          {refresh}
          {hidden ? <Button key="show-band" label="Expand band" dimColor onPress={() => void update($, bandHiddenAtom, () => false)} /> : null}
        </Box>
      </Box>
    )
  })
}
