// The interface's actions. They run here, in `ui.press` / `ui.input` hooks keyed by the element
// pressed (a hook frame, never a Button's onPress closure or a timer). Each goes to the core as a
// `request` state write served by the tools' engine paths: no slash command, no transcript row.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StipAction, StipActionReply, StipScope, StipSettingsView } from '../../types'
import { SCOPES } from '../core/settings.ts'
import * as motion from './motion.ts'
import { PANE_ID, PLAN_TITLE, SETTINGS_TITLE, asDraft, decodeUi, draftFrom, integrationFeedback, launchFeedback, patchUi, tamperOf, uiToast, previewOf, type Draft, type PaneUi, type Target } from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const settingsAtom = atom({ plugin: 'stipulate', key: 'settings' } as const, null)
const draftAtom = atom({ plugin: 'stipulate', key: 'settingsDraft' } as const, null)
const selectedTaskAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)
const bandHiddenAtom = atom({ plugin: 'stipulate', key: 'bandHidden' } as const, false)
// The core's action path without a slash command: a request in, its reply out (same reply shape).
const requestAtom = atom({ plugin: 'stipulate', key: 'request' } as const, null)
const replyAtom = atom({ plugin: 'stipulate', key: 'reply' } as const, null)

/** The engine's words when a press, input or pick reaches a handler released by a redraw (AC-33). */
export const STALE_HANDLE = /no handler is held under handle/

/**
 * True when `err` is the engine's refusal of a released handle, in whatever shape it crossed the
 * worker boundary: an Error, a HooksError, a plain object (`message`, `name`, `kind`, `error`,
 * `cause`, nested), or a string.
 */
export function isStaleHandle(err: unknown): boolean {
  const texts: string[] = []
  const seen = new Set<unknown>()
  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v === null || v === undefined || seen.has(v)) return
    if (typeof v === 'string') return void texts.push(v)
    if (typeof v !== 'object' && typeof v !== 'function') return void texts.push(String(v))
    seen.add(v)
    for (const k of ['message', 'name', 'kind', 'error', 'cause', 'reason', 'text', 'why', 'detail']) {
      try {
        walk((v as Record<string, unknown>)[k], depth + 1)
      } catch {}
    }
    try {
      texts.push(String(v))
    } catch {}
    try {
      texts.push(JSON.stringify(v))
    } catch {}
  }
  walk(err, 0)
  return texts.some(t => STALE_HANDLE.test(t))
}

/** Patches the pane's UI state (carried in `selectedTask`). */
const setUi = ($: EngineInterface, fn: (ui: PaneUi) => Partial<PaneUi>) => update($, selectedTaskAtom, raw => patchUi(raw, fn(decodeUi(raw))))

/**
 * Plan and Settings are tabs of the one Stip pane: pressing the shown tab closes the pane, the
 * other opens it (or switches it) to that tab. The band and the pane redraw to say which is shown.
 */
async function showTab($: EngineInterface, title: string) {
  const pane = (await $.ui.panes().catch(() => [])).find(p => p.id === PANE_ID)
  if (pane && pane.title === title) await $.ui.close({ id: PANE_ID })
  else await $.ui.open({ id: PANE_ID, title })
  $.ui.invalidate('ui.render')
}

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
  if (full) await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: `Stip: ${full}` }] } }).catch(() => undefined)
}

/** Request ids of this module instance (with the clock, unique across reloads). */
let requestSeq = 0

/**
 * Runs one interface action through the core without a transcript row: the `request` state written
 * here (from a ui.press / ui.input / ui.select hook) is served by the core before the write resolves,
 * and its outcome is read back from `reply` under the same id. Refusals are toasted.
 */
async function act($: EngineInterface, action: StipAction, quiet = false): Promise<StipActionReply> {
  let reply: StipActionReply
  try {
    const id = `ui-${await $.clock.now()}-${++requestSeq}`
    await update($, requestAtom, () => ({ id, action }))
    const got = await read($, replyAtom)
    reply = got && got.id === id ? got.reply : { ok: false, error: 'The Stipulate core did not answer this action (is Stip active in this project?).' }
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
    await tellLaunch($, launchFeedback(started.value, taskId, 'start the correction of'), started.value, taskId)
    await update($, selectedTaskAtom, raw => patchUi(raw, { task: null }))
  }
}

/** After a reservation: the toast, and the instruction as a notice when the prompt could not be filled. */
async function tellLaunch($: EngineInterface, feedback: { toast: string; notice: string | null }, value?: unknown, taskId?: string) {
  // ✎ where the launch went (AC-36): the prompt, or a notice when the prompt held a draft.
  const v = (value ?? {}) as { prompt_filled?: boolean; send_this?: unknown }
  if (taskId && (v.prompt_filled === true || typeof v.send_this === 'string')) {
    motion.handoff(`launch ${taskId}`, v.prompt_filled === true, await $.clock.now())
    $.ui.invalidate('ui.render')
  }
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
    .append({ message: { type: 'system', content: [{ type: 'text', text: `Stip result: ${label}\n\n${text}` }] } })
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

/**
 * Puts a command in the person's prompt through the core (Set up, + New, a follow-up, Start next
 * change) and marks where it went (✎, AC-36). A draft in the prompt is never overwritten: the
 * command then goes to a notice for the person to send.
 */
async function handOff($: EngineInterface, action: StipAction & { action: 'setup' | 'new' | 'new-from' }, text: string) {
  const reply = await act($, action)
  if (!reply.ok) return
  const v = (reply.value ?? {}) as { prompt_filled?: boolean; send_this?: string }
  const filled = v.prompt_filled === true
  const command = (typeof v.send_this === 'string' ? v.send_this : text).trim()
  motion.handoff(command, filled, await $.clock.now())
  if (!filled) {
    await toast($, 'handoff', 'Your prompt holds a draft · command in the notice')
    await $.session
      .append({ message: { type: 'system', content: [{ type: 'text', text: `Stip: your prompt holds a draft, left as it is. Send this when ready:\n\n${command}` }] } })
      .catch(() => undefined)
  }
  $.ui.invalidate('ui.render')
}

/** Runs what an element key names; true when the key was one of the interface's actions. */
async function onPress($: EngineInterface, key: string, surface: string): Promise<boolean> {
  const snapshot = await read($, snapshotAtom)
  const changeId = snapshot?.changeId ?? null
  const [verb, ...rest] = key.split(':')
  const arg = rest.join(':')
  const latestOf = (taskId: string) => snapshot?.tasks.find(t => t.id === taskId)?.latest ?? null
  switch (verb) {
    // --- The interface's own state: pane tabs, band, toggles (keys are stable across redraws) ---
    case 'tab-plan':
    case 'plan':
      await showTab($, PLAN_TITLE)
      return true
    case 'tab-settings':
    case 'settings':
      await showTab($, SETTINGS_TITLE)
      return true
    case 'collapse':
      await update($, bandHiddenAtom, () => true)
      return true
    case 'expand':
    case 'show-band':
      await update($, bandHiddenAtom, () => false)
      return true
    case 'picker':
      await setUi($, u => ({ picker: !u.picker }))
      return true
    case 'settings-picker':
      // The change picker lives on the Plan tab: open it there.
      await setUi($, () => ({ picker: true }))
      await showTab($, PLAN_TITLE)
      return true
    case 'sopen': {
      const d = await currentDraft($)
      await update($, draftAtom, raw => ({ ...(asDraft(raw) ?? d), open: (asDraft(raw) ?? d).open === arg ? null : arg }))
      return true
    }
    case 'other-roles-toggle': {
      const d = await currentDraft($)
      await update($, draftAtom, raw => ({ ...(asDraft(raw) ?? d), showOther: !(asDraft(raw) ?? d).showOther }))
      return true
    }
    case 'details':
      if (arg) await setUi($, u => ({ task: u.task === arg ? null : arg }))
      return true
    case 'gtoggle':
      if (arg) await setUi($, u => ({ group: u.group === arg ? null : arg }))
      return true
    case 'hdetails':
      if (arg) await setUi($, u => ({ helper: u.helper === arg ? null : arg }))
      return true
    case 'open':
      if (arg) await setUi($, u => ({ criterion: u.criterion === arg ? null : arg }))
      return true
    case 'criteria-toggle':
      await setUi($, u => ({ criteria: !u.criteria, criterion: null }))
      return true
    case 'retired-toggle':
      await setUi($, u => ({ retired: !u.retired }))
      return true
    case 'approve':
      // The digest shown is the one approved; the core refuses it when the contract moved since.
      if (changeId && arg) await act($, { action: 'approve', change_id: changeId, digest: arg })
      return true
    case 'refresh':
      await act($, { action: 'refresh' })
      return true
    // AC-35, AC-37: the command goes to the person's prompt; the bound change stays open.
    case 'setup':
      await handOff($, { action: 'setup' }, '/stip-bootstrap')
      return true
    case 'new':
    case 'start-next':
      await handOff($, { action: 'new' }, '/stip-explore')
      return true
    case 'new-from':
      if (arg) await handOff($, { action: 'new-from', title: arg }, `/stip-explore ${arg}`)
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
        if (reply.ok) await tellLaunch($, launchFeedback(reply.value, arg), reply.value, arg)
      }
      return true
    case 'delegate':
    case 'relaunch':
      // A reserved, unlaunched attempt hands back the same ticket, so this also re-fills the prompt.
      if (changeId && arg) {
        const reply = await act($, { action: 'delegate', change_id: changeId, task_id: arg })
        if (reply.ok) await tellLaunch($, launchFeedback(reply.value, arg), reply.value, arg)
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
            .append({ message: { type: 'system', content: [{ type: 'text', text: `Stip: ${arg} accepted although flagged tampered\n\n${warning}` }] } })
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
  // Every press on the interface's band and pane runs here, by key. A key the interface answers
  // (its own actions and toggles, whose element closures do nothing) is answered here without
  // reaching the element's closure, so a press that arrives after a redraw released that closure
  // never asks the engine for the released handle (AC-33). Other presses (settings steppers and
  // cycling cells) go on to their closure; a released handle there is ignored the same way.
  on('ui.press', { plugin: 'stipulate' }, async ($, e, next) => {
    if (e.component === 'Pane' || e.component === 'AbovePrompt') {
      let answered = false
      try {
        answered = await onPress($, e.element, e.surface)
      } catch (err) {
        answered = true
        await toast($, 'error', err instanceof Error ? err.message : String(err)).catch(() => undefined)
      }
      if (answered) return { element: e.element }
    }
    try {
      return await next(e)
    } catch (err) {
      if (isStaleHandle(err)) return { element: e.element }
      throw err
    }
  }).catch(async ($, e, next) => {
    try {
      return await next(e)
    } catch {
      return { element: e.element }
    }
  })

  // A correction reason typed in the pane's task details (`reason:<task>`), on Enter: answered here.
  on('ui.input', { plugin: 'stipulate' }, async ($, e, next) => {
    if (e.kind === 'submit' && e.element.startsWith('reason:')) {
      const changeId = (await read($, snapshotAtom))?.changeId
      if (changeId) await requestCorrection($, changeId, e.element.slice('reason:'.length), e.value).catch(() => undefined)
      return { element: e.element, value: e.value }
    }
    try {
      return await next(e)
    } catch (err) {
      if (isStaleHandle(err)) return { element: e.element, value: e.value }
      throw err
    }
  }).catch(async ($, e, next) => {
    try {
      return await next(e)
    } catch {
      return { element: e.element, value: e.value }
    }
  })

  // The settings tab's pickers: a pick on a released handle is dropped quietly (pick again).
  on('ui.select', { plugin: 'stipulate' }, async ($, e, next) => {
    try {
      return await next(e)
    } catch (err) {
      if (isStaleHandle(err)) return { element: e.element, value: e.value }
      throw err
    }
  }).catch(async ($, e, next) => {
    try {
      return await next(e)
    } catch {
      return { element: e.element, value: e.value }
    }
  })
}
