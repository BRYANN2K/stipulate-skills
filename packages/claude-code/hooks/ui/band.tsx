// AC-28: the band above the prompt (terminal and desktop):
//   ◆ Stip  <change>  <Stage> ▸ n/m  <approval>  <non-zero counts>      [ a Approve ] [ p Plan ▾ ] [ s Settings ]
// Approve is the single primary action, shown only while approvable. Narrower, the text gives way
// first (counts to numbers, fraction, change name at a word boundary, badge, stage), then the buttons
// shorten to [ S ] / [ P ]; only when even those leave no room for the text do they go below it. Never cut
// mid-word. Every press runs in actions.ts by key (AC-33).
import { atom, read } from 'claude-code'
import type { Register } from 'claude-code'

import * as motion from './motion.ts'
import { PANE_ID, SETTINGS_TITLE, viewWidth, bandSegments, buttonsCells, canApprove, pendingTickets, viaHook, type BandSegment, type BandTone } from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const ticketsAtom = atom({ plugin: 'stipulate', key: 'tickets' } as const, {})
// The band collapsed to its mark by the person (session state; the key predates the redesign).
const collapsedAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)

const TONES: Record<BandTone, { color?: string; dimColor?: boolean; bold?: boolean }> = {
  mark: { color: 'claude', bold: true },
  change: { bold: true },
  plain: { color: 'suggestion' },
  dim: { dimColor: true },
  success: { color: 'success' },
  warning: { color: 'warning' },
  error: { color: 'error' },
  accent: { color: 'suggestion' },
}

export type BandButton = { key: string; label: string; hotkey?: string; primary?: boolean; dim?: boolean }

/**
 * The band's buttons at a compaction level: 0 full, 1 Settings as its letter, 2 Plan as its letter
 * too. On the terminal the hotkey letter leads the label (`[ p Plan ▾ ]`, as the preview draws it);
 * a desktop draws its own hotkey hint. The host draws its own collapse mark beside the band, so the
 * band has none of its own.
 */
export function bandButtons(approve: string | null, planShown: boolean, settingsShown: boolean, level: number, letters = false): BandButton[] {
  const mark = (shown: boolean) => (shown ? ' ▾' : '')
  const plan = level >= 2 ? (letters ? 'p' : 'P') : `${letters ? 'p ' : ''}Plan`
  const settings = level >= 1 ? (letters ? 's' : 'S') : `${letters ? 's ' : ''}Settings`
  return [
    ...(approve ? [{ key: `approve:${approve}`, label: `${letters ? 'a ' : ''}Approve`, hotkey: 'a', primary: true }] : []),
    { key: 'plan', label: `${plan}${mark(planShown)}`, hotkey: 'p', dim: !planShown },
    { key: 'settings', label: `${settings}${mark(settingsShown)}`, hotkey: 's', dim: !settingsShown },
  ]
}

const textWidth = (segs: BandSegment[]) => segs.reduce((n, x) => n + x.text.length, 0) + 2 * Math.max(0, segs.length - 1)

/**
 * The layout for `width` cells: the first button level at which the text keeps the change name
 * whole and the stage, else the most compact buttons on the same line with the text fitted to what
 * is left; only below 14 cells of text room do the buttons go on their own line under it.
 */
export function bandLayout(segsFor: (room: number) => BandSegment[], changeId: string, buttonsFor: (level: number) => BandButton[], width: number) {
  for (let level = 0; level <= 2; level++) {
    const room = width - buttonsCells(buttonsFor(level)) - 1
    if (room < 24) continue
    const segs = segsFor(room)
    // The change name whole and the stage kept (shortening the rest of the text first).
    if (segs[1]?.text === changeId && segs[2]?.tone === 'plain' && textWidth(segs) <= room) return { level, inline: true, segs }
  }
  // Narrow (a transcript column beside a docked pane): the compact buttons on the same line,
  // the text fitted to what is left, while the mark and a few letters of the change still fit.
  const room = width - buttonsCells(buttonsFor(2)) - 1
  if (room >= 14) return { level: 2, inline: true, segs: segsFor(room) }
  return { level: width - buttonsCells(buttonsFor(0)) >= 0 ? 0 : 2, inline: false, segs: segsFor(width) }
}

export const registerBand: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    // The status line has no width of its own: remember the terminal's for it.
    if (e.surface === 'terminal' && e.viewport?.columns) viewWidth.columns = e.viewport.columns
    if (e.props.hasSurvey) return next(e)
    const snapshot = await read($, snapshotAtom)
    if (!snapshot?.changeId) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const width = Math.max(12, e.props.bodyColumns)
    const digest = snapshot.approval.digest
    const approve = canApprove(snapshot) && digest !== null ? digest.slice(0, 12) : null

    if (await read($, collapsedAtom)) {
      return (
        <Box key="stip-band" flexDirection="row" gap={1} width={width}>
          <Box key="band-text">
            <Text color="claude" bold>
              ◆ Stip
            </Text>
            {approve ? <Text color="warning"> ●</Text> : null}
          </Box>
          <Button key="expand" label="+" dimColor onPress={viaHook} />
        </Box>
      )
    }

    const shown = (await $.ui.panes().catch(() => [])).find(p => p.id === PANE_ID)?.title ?? null
    const planShown = shown !== null && shown !== SETTINGS_TITLE
    const settingsShown = shown === SETTINGS_TITLE
    const toLaunch = pendingTickets(snapshot, await read($, ticketsAtom)).length
    const buttonsFor = (level: number) => bandButtons(approve, planShown, settingsShown, level, e.surface === 'terminal')
    const layout = bandLayout(room => bandSegments(snapshot, toLaunch, room), snapshot.changeId, buttonsFor, width)

    return (
      <Box key="stip-band" flexDirection={layout.inline ? 'row' : 'column'} width={width} {...(layout.inline ? { justifyContent: 'space-between' as const } : {})}>
        <Box key="band-text" flexDirection="row" flexShrink={1}>
          {layout.segs.map((s, i) => (
            <Text {...TONES[s.tone]}>{`${i ? '  ' : ''}${s.text}`}</Text>
          ))}
        </Box>
        <Box key="band-buttons" flexDirection="row" gap={1} flexShrink={0}>
          {buttonsFor(layout.level).map(b => (
            <Button
              key={b.key}
              label={b.label}
              {...(b.hotkey ? { hotkey: b.hotkey } : {})}
              {...(b.primary ? { variant: 'primary' as const } : {})}
              {...(b.dim ? { dimColor: true } : {})}
              onPress={viaHook}
            />
          ))}
        </Box>
      </Box>
    )
  })

  // The person closing the pane (its mark, Esc, ctrl+x x): the band's tab buttons follow.
  on('ui.close', async ($, e, next) => {
    const closed = await next(e)
    if (e.id === PANE_ID) {
      // Nothing of a closed pane repeats (its clocks and the review pulse stop).
      motion.closed()
      $.ui.invalidate('ui.render')
    }
    return closed
  })
}
