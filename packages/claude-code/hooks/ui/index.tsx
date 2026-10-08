// Stipulate interface: band (AC-16), /stip pane (AC-17), status line and toasts (AC-18),
// context section (AC-19) and /stip-settings (AC-20). It reads PluginState['stipulate'] and acts
// only through the core's /stip-action command; it never runs the engine itself while drawing (AC-21).
import { atom, read } from 'claude-code'
import type { Register } from 'claude-code'

import type { StipBinding, StipSnapshot } from '../../types'

import { registerActions } from './actions.ts'
import { registerBand } from './band.tsx'
import { SECTION_ID, uiToast, compactReply, contextText, statusText, statusUpdate, transitions, waitingTransitions } from './model.ts'
import { registerPane } from './pane.tsx'
import { registerSettings } from './settings.tsx'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)

export const registerUi: Register = (on, options) => {
  registerActions(on, options)
  registerBand(on, options)
  registerPane(on, options)
  registerSettings(on, options)

  // AC-18: every snapshot the core publishes goes through here; the previous value is the
  // host's (`e.previous`), so transitions survive a hot reload of this module.
  on('state.set', { plugin: 'stipulate', key: 'snapshot' }, async ($, e, next) => {
    const done = await next(e)
    // A refused or missed write changed nothing (the result may arrive wrapped as `{ value }`).
    const result = (done as { value?: unknown }).value ?? done
    const missed = 'deny' in done || (result as { isSet?: boolean }).isSet === false
    if (!missed) {
      const prev = (e.previous ?? null) as StipSnapshot | null
      const snap = (e.value ?? null) as StipSnapshot | null
      const line = statusUpdate(prev, snap)
      if (line !== null) $.ui.status(line)
      const now = await $.clock.now()
      for (const text of transitions(prev, snap)) $.ui.toast(uiToast(text.split(' ')[0]!, text, now))
    }
    return done
  }).catch(($, e, next) => next(e))

  on('state.set', { plugin: 'stipulate', key: 'workers' }, async ($, e, next) => {
    const done = await next(e)
    if (!('deny' in done)) {
      const now = await $.clock.now()
      for (const text of waitingTransitions(e.previous as Record<string, StipBinding> | undefined, e.value as Record<string, StipBinding>)) $.ui.toast(uiToast(`wait:${text}`, text, now))
    }
    return done
  }).catch(($, e, next) => next(e))

  // The commands where the project uses Stip, and after a (re)load the status line from the
  // snapshot held. (The matcher takes every session: one session.start without one is the core's.)
  on('session.start', { isInteractive: [true, false] }, async ($, e, next) => {
    const started = await next(e)
    try {
      const root = await $.session.root()
      if (await $.fs.exists(`${root}/.workflow`)) {
        await $.command.register({ name: 'stip', description: 'Open the Stipulate pane: stages, criteria, plan, workers and helpers' })
        await $.command.register({ name: 'stip-settings', description: 'Edit Stipulate worker profiles for Claude Code (models, effort, isolation, limits)' })
      }
      $.ui.status(statusText(await read($, snapshotAtom)))
    } catch {}
    return started
  })

  // The interface's /stip-action rows draw as one short line instead of the JSON reply, as the
  // plugin's own tree (a rewritten text could still be drawn whole by a surface).
  on('ui.render', { component: 'CommandOutput', props: { command: 'stip-action' } }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    const text = compactReply(e.props.args, e.props.text)
    return (
      <Text dimColor={!/refused/.test(text)} color={/refused/.test(text) ? 'error' : undefined} wrap="truncate-end">
        {text}
      </Text>
    )
  })

  // AC-19: one short session section, last, only while a change is bound.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = contextText(await read($, snapshotAtom))
    if (text === null) return composed
    const sections = composed.sections.filter(s => s.id !== SECTION_ID)
    return { ...composed, sections: [...sections, { id: SECTION_ID, text, scope: 'session' as const }] }
  })
}
