// The interface's actions. A plugin's `$.command.run` reaches its own `command.run` hooks only
// from a hook frame, never from a Button's onPress closure or a timer, so every action runs here,
// in `ui.press` / `ui.input` hooks keyed by the element pressed. Each goes through the core's
// /stip-action command (the tools' engine paths).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StipAction, StipActionReply, StipScope, StipSettingsView } from '../../types'
import { SCOPES } from '../core/settings.ts'
import { asDraft, draftFrom, integrationFeedback, launchFeedback, patchUi, tamperOf, uiToast, previewOf, type Draft, type Target } from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const settingsAtom = atom({ plugin: 'stipulate', key: 'settings' } as const, null)
const draftAtom = atom({ plugin: 'stipulate', key: 'settingsDraft' } as const, null)
const selectedTaskAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)

export const ACCEPT_REASON = 'Accepted by the user from the Stip pane after review.'
export const CANCEL_REASON = 'Cancelled by the user from the Stip pane.'
export const FIXED_CORRECTION = 'Correction requested by the user from the Stip pane; re-check the review notes and the acceptance criteria.'

/**
 * A short toast (≤60 chars, coalesced ×N, the core's rules); when the text had to be cut, the
 * whole of it goes to a transcript notice the model does not read.
 */
async function toast($: EngineInterface, key: string, text: string, details?: string) {
  const shown = uiToast(key, text, await $.clock.now())
  $.ui.toast(shown, { timeoutMs: 10_000 })
  const full = details ?? (shown.replace(/ ×\d+$/, '').endsWith('…') ? text : null)
  if (full) await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: `Stip — ${full}` }] } }).catch(() => undefined)
}

/** Runs one interface action through the core's /stip-action command; refusals are toasted. */
async function act($: EngineInterface, action: StipAction, quiet = false): Promise<StipActionReply> {
  let reply: StipActionReply
  try {
    const ran = await $.command.run({ command: 'stip-action', args: JSON.stringify(action) })
    reply = JSON.parse(ran.text ?? '') as StipActionReply
  } catch (e) {
    reply = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  if (!reply.ok && !quiet) {
    const conflicts = reply.conflicts?.length ? ` (${reply.conflicts.map(c => c.path).join(', ')})` : ''
    await toast($, `refused:${action.action}`, `Refused · ${reply.error}${conflicts}`)
  }
  return reply
}

/** Rejects a returned attempt (when still pending) with the reason, then starts its correction. */
async function requestCorrection($: EngineInterface, changeId: string, taskId: string, reason: string) {
  const text = reason.trim()
  if (text.length < 8) {
    await toast($, 'reason', 'Correction needs a reason (8+ characters)')
    return
  }
  const latest = (await read($, snapshotAtom))?.tasks.find(t => t.id === taskId)?.latest ?? null
  if (latest && latest.status === 'returned' && latest.acceptance === 'pending') {
    const rejected = await act($, { action: 'reject', change_id: changeId, task_id: taskId, reason: text })
    if (!rejected.ok) return
  }
  const started = await act($, { action: 'delegate', change_id: changeId, task_id: taskId, instructions: `Correction requested: ${text}`, correction: true })
  if (started.ok) {
    await tellLaunch($, launchFeedback(started.value, taskId, 'start the correction of'))
    await update($, selectedTaskAtom, raw => patchUi(raw, { task: null }))
  }
}

/** After a reservation: the toast, and the instruction as a notice when the prompt could not be filled. */
async function tellLaunch($: EngineInterface, feedback: { toast: string; notice: string | null }) {
  await toast($, 'launch', feedback.toast)
  if (feedback.notice)
    await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: feedback.notice }] } }).catch(() => undefined)
}

/** Shows a captured answer as a transcript notice (the model does not read notices). */
async function showResult($: EngineInterface, action: StipAction & { action: 'result' }, label: string) {
  const reply = await act($, action)
  if (!reply.ok) return
  const value = reply.value as { result?: string | null }
  const text = typeof value?.result === 'string' && value.result.trim() ? value.result : null
  if (text === null) {
    await toast($, 'no-answer', `${label}: no answer yet`)
    return
  }
  await $.session
    .append({ message: { type: 'system', content: [{ type: 'text', text: `Stip result — ${label}\n\n${text}` }] } })
    .catch(() => toast($, 'no-show', `${label}: answer could not be shown`))
}

async function currentDraft($: EngineInterface): Promise<Draft> {
  return asDraft(await read($, draftAtom)) ?? draftFrom(await read($, settingsAtom), 'project')
}

/** Reloads the scopes from disk and resets the draft to the stored section of `scope`. */
async function reloadSettings($: EngineInterface, scope: StipScope, target: Target, notice: string | null) {
  const reply = await act($, { action: 'settings-load' }, true)
  const view = reply.ok ? (reply.value as StipSettingsView) : await read($, settingsAtom)
  await update($, draftAtom, () => ({ ...draftFrom(view, scope, target), notice, ...(reply.ok ? {} : { error: reply.error }) }))
}

/** Validates the draft as the core will, then saves its scope with the revision it was read at. */
async function saveSettings($: EngineInterface) {
  const draft = await currentDraft($)
  const checked = previewOf(await read($, settingsAtom), draft)
  if (checked.error) {
    await update($, draftAtom, raw => ({ ...(asDraft(raw) ?? draft), error: `Not saved: ${checked.error}`, notice: null }))
    return
  }
  const reply = await act($, { action: 'settings-save', scope: draft.scope, value: draft.value, revision: draft.revision }, true)
  if (!reply.ok) {
    await update($, draftAtom, raw => ({ ...(asDraft(raw) ?? draft), error: `Not saved: ${reply.error}`, notice: null }))
    return
  }
  await update($, draftAtom, () => ({ ...draftFrom(reply.value as StipSettingsView, draft.scope, draft.target), notice: `Saved the ${draft.scope} scope.` }))
}

/** Runs what an element key names; true when the key was one of the interface's actions. */
async function onPress($: EngineInterface, key: string, surface: string): Promise<boolean> {
  const snapshot = await read($, snapshotAtom)
  const changeId = snapshot?.changeId ?? null
  const [verb, ...rest] = key.split(':')
  const arg = rest.join(':')
  const latestOf = (taskId: string) => snapshot?.tasks.find(t => t.id === taskId)?.latest ?? null
  switch (verb) {
    case 'approve':
      // The digest shown is the one approved; the core refuses it when the contract moved since.
      if (changeId && arg) await act($, { action: 'approve', change_id: changeId, digest: arg })
      return true
    case 'refresh':
      await act($, { action: 'refresh' })
      return true
    case 'rebase':
      // Re-ties the worker registry to the approved contract (refused while workers are active).
      if (changeId) {
        const reply = await act($, { action: 'rebase', change_id: changeId }, true)
        if (!reply.ok) await toast($, 'rebase', `Rebase refused · ${reply.error}`, reply.error)
        else {
          // A done rebase is announced by the core ("Registry rebased · N tasks to redo").
          const v = (reply.value ?? {}) as { needed?: boolean; done?: boolean }
          if (!v.done) await toast($, 'rebase', v.needed === false ? 'Registry already current' : 'Registry not rebased')
        }
      }
      return true
    case 'bind':
      if (arg) {
        await act($, { action: 'bind', change_id: arg })
        await update($, selectedTaskAtom, raw => patchUi(raw, { picker: false, task: null, criterion: null }))
      }
      return true
    case 'redo':
      // A task a rebase reopened: a new attempt against the revised contract.
      if (changeId && arg) {
        const reply = await act($, { action: 'delegate', change_id: changeId, task_id: arg, correction: true, instructions: 'The contract changed and this task was reopened: redo it against the revised contract.' })
        if (reply.ok) await tellLaunch($, launchFeedback(reply.value, arg))
      }
      return true
    case 'delegate':
    case 'relaunch':
      // A reserved, unlaunched attempt hands back the same ticket, so this also re-fills the prompt.
      if (changeId && arg) {
        const reply = await act($, { action: 'delegate', change_id: changeId, task_id: arg })
        if (reply.ok) await tellLaunch($, launchFeedback(reply.value, arg))
      }
      return true
    case 'accept':
      if (changeId && arg) {
        const reply = await act($, { action: 'accept', change_id: changeId, task_id: arg, reason: ACCEPT_REASON })
        // An accepted isolated attempt the engine could not integrate: say so and what to do.
        const feedback = reply.ok ? integrationFeedback(reply.value) : null
        if (feedback) {
          await toast($, 'integration', feedback.toast)
          await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: feedback.notice }] } }).catch(() => undefined)
        }
        // Accepting an attempt the integrity watch flagged: the core's warning, kept in the transcript.
        const warning = reply.ok ? (reply.value as { warning?: unknown } | null)?.warning : undefined
        if (typeof warning === 'string' && warning) {
          await toast($, 'tamper-warning', `${arg} accepted · tamper warning (see notice)`)
          await $.session
            .append({ message: { type: 'system', content: [{ type: 'text', text: `Stip — ${arg} accepted although flagged tampered\n\n${warning}` }] } })
            .catch(() => undefined)
        }
      }
      return true
    case 'accept-check': {
      // First press on a tampered attempt: open its details, where the second press accepts.
      const w = latestOf(arg)
      const tamper = snapshot && w ? tamperOf(snapshot, arg, w.attempt) : null
      if (tamper) {
        await update($, selectedTaskAtom, raw => patchUi(raw, { task: arg }))
        await toast($, 'tamper-check', `${arg} flagged tampered · check git diff first`)
      }
      return true
    }
    case 'cancel':
      if (changeId && arg) await act($, { action: 'cancel', change_id: changeId, task_id: arg, reason: CANCEL_REASON })
      return true
    case 'correct':
      // Where the surface has an Input the reason is typed in the details; elsewhere a fixed one is sent.
      if (changeId && arg) {
        if (surface === 'mobile') await requestCorrection($, changeId, arg, FIXED_CORRECTION)
        else await update($, selectedTaskAtom, raw => patchUi(raw, { task: arg }))
      }
      return true
    case 'result': {
      const w = latestOf(arg)
      if (changeId && w) await showResult($, { action: 'result', change_id: changeId, task_id: arg, attempt: w.attempt }, `${arg}#${w.attempt}`)
      return true
    }
    case 'hcancel':
      if (arg) await act($, { action: 'cancel', helper_id: arg, reason: CANCEL_REASON })
      return true
    case 'hresult': {
      const helper = snapshot?.helpers.find(x => x.helperId === arg)
      if (helper) await showResult($, { action: 'result', helper_id: arg }, `helper ${helper.role}`)
      return true
    }
    case 'settings-save':
      await saveSettings($)
      return true
    case 'settings-discard': {
      const d = await currentDraft($)
      await reloadSettings($, d.scope, d.target, 'Discarded unsaved changes.')
      return true
    }
    case 'scope':
      if ((SCOPES as readonly string[]).includes(arg)) await reloadSettings($, arg as StipScope, (await currentDraft($)).target, null)
      return true
  }
  return false
}

export const registerActions: Register = on => {
  on('ui.press', async ($, e, next) => {
    if (e.plugin === 'stipulate' && (e.component === 'Pane' || e.component === 'AbovePrompt')) {
      try {
        await onPress($, e.element, e.surface)
      } catch (err) {
        await toast($, 'error', err instanceof Error ? err.message : String(err))
      }
    }
    return next(e)
  })

  // A correction reason typed in the pane's task details (`reason:<task>`), on Enter.
  on('ui.input', async ($, e, next) => {
    if (e.plugin === 'stipulate' && e.kind === 'submit' && e.element.startsWith('reason:')) {
      const changeId = (await read($, snapshotAtom))?.changeId
      if (changeId) await requestCorrection($, changeId, e.element.slice('reason:'.length), e.value).catch(() => undefined)
    }
    return next(e)
  })
}
