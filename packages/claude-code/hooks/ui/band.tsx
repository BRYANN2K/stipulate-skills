// AC-16: the band above the prompt (terminal and desktop): `◆ Stip  change  Stage ▸ done/total
// badge  counts` (only non-zero counts, dropped by priority to fit), and Approve (the person's
// action, run in actions.ts), a Panel toggle for /stip, Settings, and – to collapse to one mark.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { PANE_ID, PLAN_TITLE, SETTINGS_TITLE, bandSegments, canApprove, pendingTickets, viaHook, type BandTone } from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const ticketsAtom = atom({ plugin: 'stipulate', key: 'tickets' } as const, {})
// The band collapsed to its mark by the person (session state; the key predates the redesign).
const collapsedAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)

const TONES: Record<BandTone, { color?: string; dimColor?: boolean; bold?: boolean }> = {
  mark: { color: 'claude', bold: true },
  change: { bold: true },
  plain: {},
  dim: { dimColor: true },
  success: { color: 'success' },
  warning: { color: 'warning' },
  error: { color: 'error' },
  accent: { color: 'suggestion' },
}

/**
 * Panel and Settings are tabs of the one Stip pane: pressing the shown tab closes the pane, the other
 * opens it (or switches it) to that tab. The band redraws to say which tab is shown.
 */
async function showTab($: EngineInterface, title: string) {
  const pane = (await $.ui.panes()).find(p => p.id === PANE_ID)
  if (pane && pane.title === title) await $.ui.close({ id: PANE_ID })
  else await $.ui.open({ id: PANE_ID, title })
  $.ui.invalidate('ui.render')
}

/** Terminal cells a button takes: `[ label ]` and one gap. */
const cells = (label: string) => label.length + 5

export const registerBand: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    if (e.props.hasSurvey) return next(e)
    const snapshot = await read($, snapshotAtom)
    if (!snapshot?.changeId) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const width = Math.max(12, e.props.bodyColumns)
    const approvable = canApprove(snapshot)
    const digest = snapshot.approval.digest

    if (await read($, collapsedAtom)) {
      return (
        <Box key="stip-band" flexDirection="row" gap={1} width={width}>
          <Box key="band-text">
            <Text color="claude" bold>
              ◆ Stip
            </Text>
            {approvable ? <Text color="warning"> ●</Text> : null}
          </Box>
          <Button key="expand" label="+" dimColor onPress={() => void update($, collapsedAtom, () => false)} />
        </Box>
      )
    }

    const shown = (await $.ui.panes().catch(() => [])).find(p => p.id === PANE_ID)?.title ?? null
    const planShown = shown !== null && shown !== SETTINGS_TITLE
    const settingsShown = shown === SETTINGS_TITLE
    const panelLabel = planShown ? 'Panel ▾' : 'Panel'
    // Below 80 columns Settings keeps its place as a one-letter button.
    const narrow = width < 80
    const settingsLabel = `${narrow ? 'S' : 'Settings'}${settingsShown ? ' ▾' : ''}`
    const withSettings = true
    const labels = [...(approvable && digest !== null ? ['Approve'] : []), panelLabel, ...(withSettings ? [settingsLabel] : []), '–']
    const buttons = labels.reduce((n, l) => n + cells(l), 0)
    const inline = width - buttons >= 24
    const room = inline ? width - buttons : width
    const segments = bandSegments(snapshot, pendingTickets(snapshot, await read($, ticketsAtom)).length, room)

    return (
      <Box key="stip-band" flexDirection={inline ? 'row' : 'column'} width={width}>
        <Box key="band-text" flexDirection="row" flexGrow={1} flexShrink={1}>
          {segments.map((s, i) => (
            <Text {...TONES[s.tone]}>{`${i ? '  ' : ''}${s.text}`}</Text>
          ))}
        </Box>
        <Box key="band-buttons" flexDirection="row" gap={1} flexShrink={0}>
          {approvable && digest !== null ? (
            <Button key={`approve:${digest.slice(0, 12)}`} label="Approve" hotkey="a" variant="primary" onPress={viaHook} />
          ) : null}
          <Button key="panel" label={panelLabel} hotkey="p" {...(planShown ? { variant: 'primary' as const } : {})} onPress={() => void showTab($, PLAN_TITLE)} />
          {withSettings ? (
            <Button key="settings" label={settingsLabel} hotkey="s" {...(settingsShown ? { variant: 'primary' as const } : { dimColor: true })} onPress={() => void showTab($, SETTINGS_TITLE)} />
          ) : null}
          <Button key="collapse" label="–" dimColor onPress={() => void update($, collapsedAtom, () => true)} />
        </Box>
      </Box>
    )
  })

  // The person closing the pane (its mark, Esc, ctrl+x x): the band's Panel button follows.
  on('ui.close', async ($, e, next) => {
    const closed = await next(e)
    if (e.id === PANE_ID) $.ui.invalidate('ui.render')
    return closed
  })
}
