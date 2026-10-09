// Stipulate interface: band (AC-16), /stip pane (AC-17), status line and toasts (AC-18),
// context section (AC-19) and /stip-settings (AC-20). It reads PluginState['stipulate'] and acts
// only through the core's `request` state (actions.ts); it never runs the engine itself while drawing (AC-21).
import { atom, read } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StipBinding, StipSnapshot } from '../../types'

import { registerActions } from './actions.ts'
import { registerBand } from './band.tsx'
import * as motion from './motion.ts'
import { SECTION_ID, fitStatus, uiToast, contextText, statusText, statusUpdate, transitions, viewWidth, waitingTransitions } from './model.ts'
import { registerPane } from './pane.tsx'
import { registerSettings } from './settings.tsx'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)

/** The commands of a project that uses Stip (in a project without .workflow/ the core registers a read-only /stip). */
async function registerCommands($: EngineInterface) {
  await $.command.register({ name: 'stip', description: 'Open the Stipulate pane: stages, criteria, plan, workers and helpers' })
  await $.command.register({ name: 'stip-settings', description: 'Edit Stipulate worker profiles for Claude Code (models, effort, isolation, limits, motion)' })
}

export const registerUi: Register = (on, options) => {
  registerActions(on, options)
  registerBand(on, options)
  registerPane(on, options)
  registerSettings(on, options)

  // AC-18: every snapshot the core publishes goes through here; the previous value is the
  // host's (`e.previous`), so transitions survive a hot reload of this module.
  on('state.set', { plugin: 'stipulate', key: 'snapshot' }, async ($, e, next) => {
    // AC-36: the one-shots this transition starts, read before the write lands so the redraw it
    // causes already draws their first frame.
    const before = (e.previous ?? null) as StipSnapshot | null
    const after = (e.value ?? null) as StipSnapshot | null
    motion.observe(before, after, await $.clock.now())
    const done = await next(e)
    // A refused or missed write changed nothing (the result may arrive wrapped as `{ value }`).
    const result = (done as { value?: unknown }).value ?? done
    const missed = 'deny' in done || (result as { isSet?: boolean }).isSet === false
    if (!missed) {
      const prev = (e.previous ?? null) as StipSnapshot | null
      const snap = (e.value ?? null) as StipSnapshot | null
      const line = statusUpdate(prev, snap)
      if (line !== null) $.ui.status(fitStatus(line, viewWidth.columns))
      // Set up during the session (.workflow/ created): the commands of a project that uses Stip.
      if (prev?.setup && snap && !snap.setup) await registerCommands($).catch(() => undefined)
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
    motion.reset()
    const started = await next(e)
    try {
      const root = await $.session.root()
      if (await $.fs.exists(`${root}/.workflow`)) await registerCommands($)
      $.ui.status(fitStatus(statusText(await read($, snapshotAtom)), viewWidth.columns))
    } catch {}
    return started
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
