// Stipulate interface: pure derivations from the shared snapshot (no `$`, no I/O).
// Everything the band, pane, status line, toasts and context section show is computed here.
import type {
  StipArchiveSummary,
  StipBinding,
  StipMotion,
  StipTamper,
  StipTicket,
  StipClientSettings,
  StipHelper,
  StipJobStatus,
  StipProfile,
  StipScope,
  StipSettingsView,
  StipSnapshot,
  StipTask,
  StipWorker,
} from '../../types'
import { coalesce, type CoalesceState } from '../core/notify.ts'
import { effective, validateClient } from '../core/settings.ts'

export const PANE_ID = 'stipulate'
export const SETTINGS_PANE_ID = 'stip-settings'
export const ACTIVE_STATUSES: readonly StipJobStatus[] = ['queued', 'starting', 'running', 'waiting', 'unknown', 'correction']

// --- Approval and stages ---

export type ApprovalState =
  | 'approved'
  | 'approved (adopted)'
  | 'awaiting approval'
  | 'stale'
  | 'not confirmed'
  | 'not validated'
  | 'archived'
  | 'unknown'

const APPLY_OR_LATER = ['approved', 'applying', 'checked', 'documented']

/**
 * approved (by the person through Stip, or adopted at the mod's first activation) / awaiting
 * approval / stale (approved once, contract changed since) / not confirmed (an engine approval the
 * person did not give through Stip: revoked, and treated as unapproved meanwhile) / not validated.
 */
export function approvalState(s: StipSnapshot): ApprovalState {
  if (!s.changeId || !s.phase) return 'unknown'
  if (s.phase === 'archived') return 'archived'
  if (s.approval.current) return s.approval.adopted ? 'approved (adopted)' : 'approved'
  if (s.approvalUnconfirmed) return 'not confirmed'
  if (s.phase === 'draft') return 'awaiting approval'
  if (s.approval.by !== null || APPLY_OR_LATER.includes(s.phase)) return 'stale'
  return 'not validated'
}

/** How a state reads on screen. */
export function approvalLabel(state: ApprovalState): string {
  return state === 'not confirmed' ? 'approval not confirmed by you, revoked' : state === 'stale' ? 'approval stale' : state
}

/**
 * True when the person can approve the current contract from the interface: whenever it is not
 * already current and theirs (the core refuses that), including back in draft after a revocation.
 */
export function canApprove(s: StipSnapshot): boolean {
  const state = approvalState(s)
  return s.approval.digest !== null && (state === 'awaiting approval' || state === 'stale' || state === 'not confirmed')
}

export const STAGES = ['Bootstrap', 'Explore', 'Validate', 'Apply', 'Check', 'Docs', 'Archive'] as const
export type StageMark = '✓' | '▶' | '!' | '○'
export type Stage = { name: (typeof STAGES)[number]; mark: StageMark }

const CURRENT_STAGE: Record<string, number> = {
  exploring: 1,
  draft: 2,
  approved: 3,
  applying: 3,
  checked: 5,
  documented: 6,
  archived: 7,
}

/** Bootstrap…Archive with ✓ done, ▶ current, ! needs attention, ○ not reached. */
export function stagesOf(s: StipSnapshot): Stage[] {
  const current = s.phase ? (CURRENT_STAGE[s.phase] ?? 0) : 0
  const state = approvalState(s)
  const failed = s.workers.some(w => w.status === 'failed' || w.status === 'unknown')
  return STAGES.map((name, i) => {
    let mark: StageMark = i < current ? '✓' : i === current ? '▶' : '○'
    if (name === 'Validate' && (state === 'stale' || state === 'not confirmed')) mark = '!'
    if (i === current && (failed || (s.error !== null && s.changeId !== null))) mark = '!'
    return { name, mark }
  })
}

// --- Counts and lines ---

export const isActive = (status: StipJobStatus) => ACTIVE_STATUSES.includes(status)

export function counts(s: StipSnapshot) {
  return {
    running: s.workers.filter(w => isActive(w.status)).length,
    review: s.awaitingReview.length,
    waiting: s.workers.filter(w => w.status === 'waiting').length,
    helpers: s.helpers.filter(x => isActive(x.status)).length,
  }
}

/** The status line entry, or undefined (cleared) when nothing is bound. */
export function statusText(s: StipSnapshot | null): string | undefined {
  if (!s?.changeId) return undefined
  const c = counts(s)
  const state = approvalState(s)
  // The host already prefixes the plugin's name.
  const parts = [`${s.changeId}`, s.phase ?? 'unknown']
  if (state === 'awaiting approval' || state === 'stale' || state === 'not confirmed') parts.push(state === 'not confirmed' ? 'approval not confirmed' : approvalLabel(state))
  if (c.running) parts.push(`${c.running} running`)
  if (c.waiting) parts.push(`${c.waiting} waiting`)
  if (c.review) parts.push(`${c.review} review`)
  return parts.join(' · ')
}

/**
 * The terminal's width as the band last drew it (the status line API takes no width). Module
 * state on purpose: a cache for the next status, lost harmlessly on a reload.
 */
export const viewWidth: { columns: number | null } = { columns: null }

/** Cells the host draws before the plugin's status text: indent, icon and `stipulate: `. */
export const STATUS_PREFIX = 17

/**
 * The status text fitted to `columns`: whole ` · ` parts from the start while they fit, the first
 * one shortened at a word boundary if it must; never cut mid-word (the host would cut it there).
 */
export function fitStatus(text: string | undefined, columns: number | null): string | undefined {
  if (text === undefined || !columns) return text
  const room = Math.max(8, columns - STATUS_PREFIX)
  if (text.length <= room) return text
  const parts = text.split(' · ')
  let out = parts[0]!.length <= room ? parts[0]! : shortenWords(parts[0]!, room)
  for (const part of parts.slice(1)) {
    if (`${out} · ${part}`.length > room) break
    out = `${out} · ${part}`
  }
  return out
}

/** The band's summary text (one line, before the buttons). */
export function bandText(s: StipSnapshot, toLaunch = 0): string {
  const c = counts(s)
  const state = approvalState(s)
  const approval =
    (state === 'approved' || state === 'approved (adopted)') && s.approval.digest
      ? `${state} ${s.approval.digest.slice(0, 8)}`
      : approvalLabel(state)
  const parts = [`Stip ${s.changeId}`, s.phase ?? 'unknown', approval, `${c.running} running`, `${c.review} awaiting review`]
  if (c.helpers) parts.push(`${c.helpers} helper${c.helpers === 1 ? '' : 's'}`)
  if (toLaunch) parts.push(`${toLaunch} ready to launch`)
  const tampered = (s.tampered ?? []).length
  if (tampered) parts.push(`${tampered} tampered, inspect git diff`)
  if (c.waiting) parts.push(`${c.waiting} waiting on permission`)
  if (s.error) parts.push('error')
  return parts.join(' · ')
}

/** Shortens a text to `width` cells with an ellipsis. */
export function fit(text: string, width: number): string {
  const w = Math.max(1, Math.floor(width))
  return text.length <= w ? text : w <= 1 ? '…' : `${text.slice(0, w - 1)}…`
}

export function elapsed(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return ''
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

/** Elapsed time of a worker as of `now` while it runs; as recorded once it finished. */
export function workerElapsed(w: StipWorker | StipHelper, now: number): string {
  if (w.startedAt === null) return elapsed('elapsedMs' in w ? w.elapsedMs : null)
  return elapsed((w.finishedAt ?? now) - w.startedAt)
}

export const TASK_MARK: Record<string, string> = {
  accepted: '✓',
  rejected: '✗',
  returned: '◆',
  failed: '!',
  cancelled: '✗',
  unknown: '?',
  waiting: '…',
}

/** One word for the task's state: ready, blocked, running, returned, accepted, ... */
export function taskState(t: StipTask): { mark: string; label: string } {
  const w = t.latest
  if (!w) return t.ready ? { mark: '○', label: 'ready' } : { mark: '·', label: 'blocked' }
  if (w.acceptance === 'accepted')
    return { mark: '✓', label: t.awaitingIntegration ? 'accepted, not integrated' : w.isolated && w.integrated ? 'accepted, integrated' : 'accepted' }
  if (w.acceptance === 'rejected') return { mark: '✗', label: t.ready ? 'rejected, correction ready' : 'rejected' }
  if (w.status === 'returned') return { mark: '◆', label: 'returned, awaiting review' }
  if (isActive(w.status)) return { mark: '▶', label: w.status }
  return { mark: TASK_MARK[w.status] ?? '·', label: w.status }
}

// --- Criteria (from spec.md text) ---

export type Criterion = { id: string; text: string }

/** `- AC-n: text` lines of a spec. */
export function parseCriteria(spec: string): Criterion[] {
  const out: Criterion[] = []
  for (const line of spec.split('\n')) {
    const m = /^\s*[-*]\s+\**(AC-\d+[a-z]?)\**\s*[:.—-]\s*(.+)$/.exec(line)
    if (m) out.push({ id: m[1]!, text: m[2]!.trim() })
  }
  return out
}

/** The criteria the plan covers, with the tasks covering each and a coverage mark. */
export function criteriaCoverage(s: StipSnapshot, spec: Criterion[]): { id: string; text: string; tasks: string[]; mark: string }[] {
  const ids = spec.length ? spec.map(c => c.id) : [...new Set(s.tasks.flatMap(t => t.criteria))].sort(byCriterion)
  return ids.map(id => {
    const tasks = s.tasks.filter(t => t.criteria.includes(id))
    const accepted = tasks.length > 0 && tasks.every(t => t.latest?.acceptance === 'accepted')
    const started = tasks.some(t => t.latest !== null)
    return {
      id,
      text: spec.find(c => c.id === id)?.text ?? '',
      tasks: tasks.map(t => t.id),
      mark: accepted ? '✓' : started ? '▶' : '○',
    }
  })
}

function byCriterion(a: string, b: string) {
  const n = (x: string) => Number(/\d+/.exec(x)?.[0] ?? 0)
  return n(a) - n(b) || a.localeCompare(b)
}

// --- Transitions (status line and toasts) ---

/** Toast texts for what changed between two snapshots of the same bound change. */
export function transitions(prev: StipSnapshot | null | undefined, next: StipSnapshot | null | undefined): string[] {
  if (!prev || !next || !next.changeId || prev.changeId !== next.changeId) return []
  const out: string[] = []
  const id = next.changeId
  if (prev.approval.current && !next.approval.current && next.phase !== 'draft' && !next.approvalUnconfirmed)
    out.push(`Approval of ${id} stale · contract changed`)
  const before = new Map(prev.workers.map(w => [`${w.taskId}#${w.attempt}`, w.status]))
  for (const w of next.workers) {
    const was = before.get(`${w.taskId}#${w.attempt}`)
    if (was === w.status) continue
    if (w.status === 'returned') out.push(`${w.taskId} returned · review it`)
    else if (w.status === 'failed') out.push(`${w.taskId} failed${w.error ? ` · ${w.error}` : ''}`)
  }
  const helpers = new Map(prev.helpers.map(x => [x.helperId, x.status]))
  for (const helper of next.helpers) {
    const was = helpers.get(helper.helperId)
    if (was === helper.status) continue
    if (helper.status === 'returned') out.push(`Research answered · ${helper.title || helper.role}`)
    else if (helper.status === 'failed') out.push(`Research failed · ${helper.title || helper.role}`)
  }
  return out
}

/**
 * Permission waits, read off the core's live worker bindings (written the moment the ask is
 * seen; the snapshot follows on its next refresh).
 */
export function waitingTransitions(prev: Record<string, StipBinding> | null | undefined, next: Record<string, StipBinding> | null | undefined): string[] {
  if (!next) return []
  const out: string[] = []
  for (const [id, b] of Object.entries(next)) {
    if (b.status !== 'waiting' || prev?.[id]?.status === 'waiting') continue
    out.push(`${b.kind === 'helper' ? 'Research helper' : `${b.taskId}#${b.attempt}`} waiting on permission`)
  }
  return out
}

// --- Band (AC-16 redesign): segments that always fit, dropped by priority ---

export type BandTone = 'mark' | 'change' | 'plain' | 'dim' | 'success' | 'warning' | 'error' | 'accent'
export type BandSegment = { text: string; tone: BandTone }

/** The approval badge: ✓ approved, ● awaiting approval, ! approval revoked (only when it is). */
function badge(s: StipSnapshot, short: boolean, iconOnly = false): BandSegment {
  const state = approvalState(s)
  if (iconOnly) {
    const b = badge(s, true)
    return { ...b, text: b.text.split(' ')[0]! }
  }
  if (state === 'approved') return { text: '✓ approved', tone: 'success' }
  if (state === 'approved (adopted)') return { text: short ? '✓ approved' : '✓ approved (adopted)', tone: 'success' }
  if (state === 'awaiting approval') return { text: short ? '● approve' : '● awaiting approval', tone: 'warning' }
  if (state === 'not confirmed') return { text: short ? '! revoked' : '! approval revoked', tone: 'error' }
  if (state === 'stale') return { text: short ? '! stale' : '! approval stale', tone: 'warning' }
  if (state === 'archived') return { text: '✓ archived', tone: 'success' }
  return { text: short ? '○ draft' : '○ not validated', tone: 'dim' }
}

/**
 * Shortens text to `room` cells at a word boundary (spaces, and `-`, `_`, `.`, `/` inside ids),
 * ending in …; never cuts inside a word. A first word longer than `room` is kept whole: the
 * caller drops something else instead (`fits` says whether it did fit).
 */
export function shortenWords(text: string, room: number): string {
  if (text.length <= room) return text
  const parts = text.match(/[^\s\-_./]+[\s\-_./]*/g) ?? [text]
  let out = ''
  for (const part of parts) {
    const next = out + part
    if (next.trimEnd().replace(/[-_./]+$/, '').length + 1 > room) break
    out = next
  }
  out = out.trimEnd().replace(/[-_./]+$/, '')
  return out ? `${out}…` : `${parts[0]!.trimEnd().replace(/[-_./]+$/, '')}…`
}

/**
 * The band's left text for `room` cells: `◆ Stip  change  Stage ▸ done/total  badge  counts`, with
 * only non-zero counts. Narrower, in order: counts become numbers, the stage loses its fraction, the
 * change name is shortened at a word boundary with …, the badge shortens, the stage goes, the badge
 * keeps its icon only. Never cut mid-word.
 */
export function bandSegments(s: StipSnapshot, toLaunch: number, room: number): BandSegment[] {
  const c = counts(s)
  const stage = stagesOf(s).find(x => x.mark === '▶' || x.mark === '!')?.name ?? (s.phase === 'archived' ? 'Archived' : 'Bootstrap')
  const done = s.tasks.filter(t => t.latest?.acceptance === 'accepted').length
  const total = s.tasks.length
  const tampered = (s.tampered ?? []).length
  const tally: [number, string, string, BandTone][] = [
    [c.running, 'running', '▶', 'accent'],
    [c.review, 'to review', '◆', 'warning'],
    [toLaunch, 'ready to launch', '◇', 'warning'],
    [c.helpers, c.helpers === 1 ? 'helper' : 'helpers', '◎', 'dim'],
    [tampered, 'tampered', '!', 'error'],
  ]
  const build = (level: number, changeRoom: number | null): BandSegment[] => {
    const out: BandSegment[] = [{ text: '◆ Stip', tone: 'mark' }]
    const change = s.changeId ?? ''
    out.push({ text: changeRoom === null ? change : shortenWords(change, Math.max(4, changeRoom)), tone: 'change' })
    if (level < 5) out.push({ text: level < 2 && total ? `${stage} ▸ ${done}/${total}` : stage, tone: 'plain' })
    // "(adopted)" only while nothing else had to give way.
    out.push((level >= 1 || room < 60) && approvalState(s) === 'approved (adopted)' ? { text: '✓ approved', tone: 'success' } : badge(s, level >= 4, level >= 6))
    if (s.registryCurrent === false || (s.orphanTasks ?? []).length) out.push({ text: level >= 4 ? '! rebase' : '! rebase needed', tone: 'error' })
    if ((s.restoreHeld ?? []).length) out.push({ text: level >= 4 ? '! resync' : '! resync needed', tone: 'error' })
    for (const [n, word, icon, tone] of tally) if (n) out.push({ text: level < 1 ? `${n} ${word}` : `${icon}${n}`, tone })
    return out
  }
  const width = (segs: BandSegment[]) => segs.reduce((n, x) => n + x.text.length, 0) + 2 * (segs.length - 1)
  for (let level = 0; level <= 6; level++) {
    const full = build(level, null)
    if (width(full) <= room) return full
    if (level >= 3) {
      // Shorten the change name (at a word boundary) to what is left.
      const others = width(full) - (s.changeId ?? '').length
      const left = room - others
      if (left >= 6) {
        const shortened = build(level, left)
        if (width(shortened) <= room) return shortened
      }
    }
  }
  const tight = build(6, Math.max(4, room - 12))
  while (width(tight) > room && tight.length > 2) tight.splice(tight.length > 3 ? tight.length - 1 : 2, 1)
  return tight
}

/** Plain text of the band segments (tests and logs). */
export const bandLine = (segs: BandSegment[]) => segs.map(x => x.text).join('  ')

/**
 * The status line after a snapshot write, or null to leave the line as it stands (unchanged
 * text, so a line the core set, such as a revocation notice, is not overwritten for nothing).
 */
export function statusUpdate(prev: StipSnapshot | null | undefined, next: StipSnapshot | null | undefined): string | undefined | null {
  const text = statusText(next ?? null)
  if (prev && text === statusText(prev)) return null
  // Only an approval that existed (the person's, or one the core is revoking) can be revoked;
  // a change entering draft from exploration was never approved.
  const hadApproval = prev ? prev.approval.current || prev.approvalUnconfirmed || APPLY_OR_LATER.includes(prev.phase ?? '') : false
  const revoked =
    prev && next && next.changeId && prev.changeId === next.changeId && next.phase === 'draft' && prev.phase !== 'draft' && hadApproval && !next.approval.current
  return revoked ? `${next.changeId} · draft · approval revoked, approve again` : text
}

/** What an accepted-but-not-integrated reply says, for a toast and a transcript notice; else null. */
export function integrationFeedback(value: unknown): { toast: string; notice: string } | null {
  const v = value as { task_id?: string; integration?: Record<string, unknown> | null } | null
  const i = v?.integration
  if (!i || i.integrated !== false) return null
  const task = v?.task_id ?? 'task'
  const conflicts = Array.isArray(i.conflicts) ? (i.conflicts as { path?: string; reason?: string; untracked?: boolean }[]) : []
  const paths = conflicts.map(c => c.path).filter(Boolean).join(', ')
  const untracked = i.only_untracked === true
  const toast = untracked ? `${task} accepted, not integrated · stray files` : `${task} accepted, not integrated · conflicts`
  const notice = [
    `Stip: ${task} accepted but NOT integrated${untracked ? ' (only untracked stray files)' : ''}`,
    typeof i.error === 'string' ? i.error : '',
    ...conflicts.map(c => `- ${c.path ?? '?'}${c.untracked ? ' (untracked)' : ''}: ${c.reason ?? ''}`),
    typeof i.guidance === 'string' ? `\n${i.guidance}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return { toast, notice }
}

/** The integrity watch's flag on one attempt, if any (cleared by the core once it is reviewed). */
export function tamperOf(s: StipSnapshot, taskId: string, attempt: number): StipTamper | null {
  return (s.tampered ?? []).find(t => t.taskId === taskId && t.attempt === attempt) ?? null
}

// --- Launch tickets (reserved, waiting for the coordinator's Agent call) ---

export const ticketKey = (changeId: string, taskId: string, attempt: number) => `stip ${changeId}/${taskId}#${attempt}`

/** The bound change's reserved-but-not-launched workers and helpers, oldest first. */
export function pendingTickets(s: StipSnapshot | null, tickets: Record<string, StipTicket> | null | undefined): StipTicket[] {
  if (!s?.changeId || !tickets) return []
  return Object.values(tickets)
    .filter(t => t.changeId === s.changeId || (t.kind === 'helper' && t.changeId === null))
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** What the person is told after a Delegate (or correction) press: the prompt box holds the launch. */
export function launchFeedback(value: unknown, taskId: string, what = 'start'): { toast: string; notice: string | null } {
  const v = (value ?? {}) as { prompt_filled?: boolean; send_this?: string; status?: string }
  if (v.prompt_filled === true)
    return { toast: `${taskId}: ${what === 'start' ? 'launch' : 'correction'} in your prompt · press Enter`, notice: null }
  if (typeof v.send_this === 'string')
    return {
      toast: `${taskId} reserved · send the launch in the notice`,
      notice: `Stip: send this to launch ${taskId}:\n\n${v.send_this}`,
    }
  return { toast: `${taskId} ${v.status === 'reserved' ? 'reserved · ask Claude to launch it' : 'delegated'}`, notice: null }
}

// --- Context section (prompt.compose) ---

export const SECTION_ID = 'stipulate:change'

/** A short session section for the bound change; null when nothing is bound. */
export function contextText(s: StipSnapshot | null): string | null {
  if (!s?.changeId) return null
  const state = approvalState(s)
  const digest = s.approval.digest ? ` (contract ${s.approval.digest.slice(0, 12)})` : ''
  const lines = [`Stipulate: this session is bound to change \`${s.changeId}\`, phase ${s.phase ?? 'unknown'}, approval ${approvalLabel(state)}${digest}.`]
  const running = s.workers.filter(w => isActive(w.status)).map(w => w.taskId)
  const list = (xs: string[]) => (xs.length > 12 ? `${xs.slice(0, 12).join(', ')} (+${xs.length - 12})` : xs.join(', '))
  if (s.ready.length) lines.push(`Ready tasks: ${list(s.ready)}.`)
  if (running.length) lines.push(`Running: ${list(running)}.`)
  if (s.awaitingReview.length) lines.push(`Awaiting your review: ${list(s.awaitingReview)}.`)
  lines.push('Approval is the user\'s action (band Approve or /stip-approve), never yours. Use stip_status for details.')
  return lines.join('\n')
}

// --- Settings draft ---

export type Target =
  | { kind: 'defaults' }
  | { kind: 'role'; role: string }
  | { kind: 'phase'; phase: string }
  | { kind: 'phase-role'; phase: string; role: string }

export type Draft = {
  scope: StipScope
  target: Target
  value: StipClientSettings
  revision: string
  error: string | null
  notice: string | null
  /** The table row whose model cell takes a typed full id. */
  customFor?: string | null
  /** The role chosen for a new phase override (then its phase is picked). */
  addRole?: string | null
  /** Override rows added but not yet given a value (shown until saved or discarded). */
  pending?: string[]
  /** Roles neither in the plan nor configured are shown. */
  showOther?: boolean
  /** The settings row whose details (effective resolution, phase overrides) are open; `inherited` opens the group. */
  open?: string | null
}

/** Differences between a stored scope section and the draft, counted by leaf setting. */
export function changeCount(stored: unknown, draft: unknown): number {
  const leaves = (v: unknown, at: string, out: Map<string, string>) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v as Record<string, unknown>)) leaves(x, `${at}/${k}`, out)
    else out.set(at, JSON.stringify(v))
    return out
  }
  const a = leaves(stored ?? {}, '', new Map())
  const b = leaves(draft ?? {}, '', new Map())
  let n = 0
  for (const k of new Set([...a.keys(), ...b.keys()])) if (a.get(k) !== b.get(k)) n++
  return n
}

export const targetKey = (t: Target): string =>
  t.kind === 'defaults' ? 'defaults' : t.kind === 'role' ? `role:${t.role}` : t.kind === 'phase' ? `phase:${t.phase}` : `phase-role:${t.phase}:${t.role}`

export function parseTarget(key: string): Target {
  const [kind, a, b] = key.split(':')
  if (kind === 'role' && a) return { kind: 'role', role: a }
  if (kind === 'phase' && a) return { kind: 'phase', phase: a }
  if (kind === 'phase-role' && a && b) return { kind: 'phase-role', phase: a, role: b }
  return { kind: 'defaults' }
}

/** A draft over one scope's stored section of the settings view. */
export function draftFrom(view: StipSettingsView | null, scope: StipScope, target: Target = { kind: 'defaults' }): Draft {
  return {
    scope,
    target,
    value: structuredClone(view?.byScope[scope] ?? {}),
    revision: view?.revision ?? '',
    error: view?.error ?? null,
    notice: null,
  }
}

/** Reads the draft out of `settingsDraft` (typed unknown in the shared contract). */
export function asDraft(raw: unknown): Draft | null {
  if (typeof raw !== 'object' || raw === null) return null
  const d = raw as Partial<Draft>
  if (!d.scope || !d.target || typeof d.value !== 'object' || d.value === null || typeof d.revision !== 'string') return null
  return d as Draft
}

export type ProfileKey = 'model' | 'effort' | 'isolate' | 'agent' | 'max_workers' | 'max_shared_writers'

export function profileAt(value: StipClientSettings, t: Target): (StipProfile & { max_workers?: number; max_shared_writers?: number }) | undefined {
  if (t.kind === 'defaults') return value.defaults
  if (t.kind === 'role') return value.roles?.[t.role]
  if (t.kind === 'phase') return value.phases?.[t.phase]
  return value.phase_roles?.[t.phase]?.[t.role]
}

const prune = <T extends Record<string, unknown>>(o: T | undefined): T | undefined => (o && Object.keys(o).length ? o : undefined)

/** Sets (or, with undefined, removes) one field of the target's profile; empty sections are dropped. */
export function setField(value: StipClientSettings, t: Target, key: ProfileKey, v: string | number | boolean | undefined): StipClientSettings {
  const next: StipClientSettings = structuredClone(value)
  const edit = (p: Record<string, unknown> | undefined) => {
    const out = { ...(p ?? {}) }
    if (v === undefined) delete out[key]
    else out[key] = v
    return prune(out)
  }
  if (t.kind === 'defaults') {
    next.defaults = edit(next.defaults) as StipClientSettings['defaults']
    if (!next.defaults) delete next.defaults
  } else if (t.kind === 'role') {
    const roles = { ...(next.roles ?? {}) }
    const p = edit(roles[t.role])
    if (p) roles[t.role] = p
    else delete roles[t.role]
    next.roles = prune(roles)
    if (!next.roles) delete next.roles
  } else if (t.kind === 'phase') {
    const phases = { ...(next.phases ?? {}) }
    const p = edit(phases[t.phase])
    if (p) phases[t.phase] = p
    else delete phases[t.phase]
    next.phases = prune(phases)
    if (!next.phases) delete next.phases
  } else {
    const all = { ...(next.phase_roles ?? {}) }
    const roles = { ...(all[t.phase] ?? {}) }
    const p = edit(roles[t.role])
    if (p) roles[t.role] = p
    else delete roles[t.role]
    if (Object.keys(roles).length) all[t.phase] = roles
    else delete all[t.phase]
    next.phase_roles = prune(all)
    if (!next.phase_roles) delete next.phase_roles
  }
  return next
}

export function setApplyGate(value: StipClientSettings, gate: string | undefined): StipClientSettings {
  const next: StipClientSettings = structuredClone(value)
  const enforcement = { ...(next.enforcement ?? {}) } as Record<string, unknown>
  if (gate === undefined) delete enforcement.apply_gate
  else enforcement.apply_gate = gate
  if (Object.keys(enforcement).length) next.enforcement = enforcement as StipClientSettings['enforcement']
  else delete next.enforcement
  return next
}

/** The roles worth showing: the plan's, the configured ones and the research helper's. */
export function knownRoles(s: StipSnapshot | null, value: StipClientSettings, view: StipSettingsView | null): string[] {
  const roles = new Set<string>(['research'])
  for (const t of s?.tasks ?? []) roles.add(t.role)
  for (const r of Object.keys(value.roles ?? {})) roles.add(r)
  for (const scope of ['personal', 'project', 'local'] as const) for (const r of Object.keys(view?.byScope[scope]?.roles ?? {})) roles.add(r)
  for (const roles2 of Object.values(value.phase_roles ?? {})) for (const r of Object.keys(roles2)) roles.add(r)
  return [...roles].filter(r => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r) && r !== 'discovery' && r !== 'coordinator').sort()
}

/** Short form of a resolved profile for the effective table. */
export function profileLine(p: { model: string; effort: string; agent: string | null; isolate: boolean }): string {
  return [`model ${p.model}`, `effort ${p.effort}`, ...(p.agent ? [`agent ${p.agent}`] : []), p.isolate ? 'isolated' : 'shared checkout'].join(' · ')
}

/** The scopes as they would stand with `draft` saved, merged and checked as the core checks them. */
export function previewOf(view: StipSettingsView | null, draft: Draft): { error: string | null; eff: ReturnType<typeof effective> | null } {
  try {
    validateClient(draft.value)
    const byScope = { ...(view?.byScope ?? { personal: {}, project: {}, local: {} }), [draft.scope]: draft.value }
    return { error: null, eff: effective(byScope) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), eff: null }
  }
}

/** Does nothing: the interface's actions run in its `ui.press` hook, keyed by the element. */
export const viaHook = () => {}

// --- Pane rows (AC-17 redesign: one aligned row per task, execution order) ---

const FAMILIES: Record<string, string> = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', fable: 'Fable' }

/** `claude-opus-5-5` → "Opus 5.5", `sonnet` → "Sonnet", inherit/none → null, unknown → shortened id. */
export function friendlyModel(model: string | null | undefined): string | null {
  if (!model || model === 'inherit') return null
  const id = model.replace(/\[1m\]$/, '').replace(/^(?:[a-z]+\.)?anthropic\./, '')
  if (FAMILIES[id]) return FAMILIES[id]!
  const m = /(?:^|[-/])claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(?:-v\d+(?::\d+)?)?$/.exec(id) ?? /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?/.exec(id)
  if (m) return `${FAMILIES[m[1]!]} ${m[2]}${m[3] !== undefined ? `.${m[3]}` : ''}`
  return fit(id, 12)
}

/** Tool names that say nothing to the person (the host's and the mod's own plumbing). */
const INTERNAL_TOOLS = /^(SubagentHandback|StructuredOutput|ToolSearch|TodoWrite|TodoRead|TaskOutput|ExitPlanMode|EnterPlanMode|SendMessage)$/

/** The last tool worth showing, or null: internal names hidden, MCP names shortened. */
export function meaningfulTool(tool: string | null | undefined): string | null {
  if (!tool || INTERNAL_TOOLS.test(tool) || tool.startsWith('mcp__stipulate__')) return null
  const mcp = /^mcp__[^_]+(?:_[^_]+)*__(.+)$/.exec(tool)
  return mcp ? mcp[1]! : tool
}

const PHASE_ORDER = ['explore', 'validate', 'apply', 'check', 'docs']

/** Tasks in execution order (dependencies first, plan order breaking ties), grouped by phase. */
export function planGroups(tasks: StipTask[]): { phase: string; title: string; tasks: StipTask[] }[] {
  const ids = new Set(tasks.map(t => t.id))
  const done = new Set<string>()
  const order: StipTask[] = []
  let left = [...tasks]
  while (left.length) {
    const next = left.find(t => t.dependsOn.every(d => done.has(d) || !ids.has(d))) ?? left[0]!
    order.push(next)
    done.add(next.id)
    left = left.filter(t => t !== next)
  }
  const phases = [...new Set(order.map(t => t.phase))].sort((a, b) => rank(a) - rank(b))
  return phases.map(phase => ({ phase, title: phase.charAt(0).toUpperCase() + phase.slice(1), tasks: order.filter(t => t.phase === phase) }))
}

const rank = (phase: string) => {
  const i = PHASE_ORDER.indexOf(phase)
  return i < 0 ? PHASE_ORDER.length : i
}

export type RowTone = 'done' | 'running' | 'attention' | 'review' | 'ready' | 'blocked' | 'launch'
export type RowAction = 'cancel' | 'review' | 'delegate' | 'launch' | 'redo' | 'none'
export type TaskRow = { icon: string; tone: RowTone; words: string; action: RowAction; model: string | null; duration: string }

const SETTLED_BAD = ['failed', 'cancelled']

/** The one-line state of a task in plain words, its icon, tone and the action its row offers. */
export function taskRow(
  s: StipSnapshot,
  t: StipTask,
  now: number,
  opts: { unlaunched: boolean; tampered: boolean; reopened?: boolean },
): TaskRow {
  const w = t.latest
  const model = friendlyModel(w?.model)
  const duration = w && !opts.unlaunched ? workerElapsed(w, now) : ''
  const again = w && w.attempt > 1 ? ` · attempt ${w.attempt}` : ''
  const row = (icon: string, tone: RowTone, words: string, action: RowAction = 'none'): TaskRow => ({ icon, tone, words, action, model, duration })
  if (opts.tampered) return row('!', 'attention', `tampered, inspect git diff${again}`, w?.status === 'returned' && w.acceptance === 'pending' ? 'review' : 'none')
  if (!w) {
    // The engine's readiness is authoritative (dependencies accepted, phase compatible).
    if (t.ready && s.approval.current) return row('○', 'ready', 'ready', 'delegate')
    const byId = (id: string) => s.tasks.find(x => x.id === id)
    const bad = t.dependsOn.filter(d => {
      const l = byId(d)?.latest
      return l && (SETTLED_BAD.includes(l.status) || l.acceptance === 'rejected')
    })
    if (bad.length) return row('·', 'blocked', `blocked by ${bad.join(', ')}`)
    const open = t.dependsOn.filter(d => byId(d)?.latest?.acceptance !== 'accepted')
    if (open.length && !t.ready) return row('·', 'blocked', `waiting on ${open.join(', ')}`)
    if (!s.approval.current) return row('○', 'ready', 'ready once approved')
    if (!t.ready) return row('·', 'blocked', 'not ready yet')
    return row('○', 'ready', 'ready', 'delegate')
  }
  if (opts.unlaunched) return row('◇', 'launch', `ready to launch, press Enter in your prompt${again}`, 'launch')
  if (w.acceptance === 'accepted') {
    if (t.awaitingIntegration) return row('!', 'attention', `accepted, not integrated${again}`, 'review')
    return row('✓', 'done', `${w.isolated ? 'integrated' : 'accepted'}${again}`)
  }
  // Reopened by a registry rebase: the contract changed under accepted work, which is to be redone.
  if (opts.reopened && w.acceptance === 'rejected' && !isActive(w.status)) return row('↻', 'review', `redo · contract changed${again}`, 'redo')
  if (w.acceptance === 'rejected') return row('!', 'attention', `rejected${t.ready ? ', correction ready' : ''}${again}`, 'review')
  if (w.status === 'returned') return row('◆', 'review', `awaiting review${again}`, 'review')
  if (w.status === 'waiting') return row('!', 'attention', `waiting on permission${again}`, 'cancel')
  if (w.status === 'unknown') return row('!', 'attention', `launch unconfirmed${again}`, 'cancel')
  if (isActive(w.status)) {
    const tool = meaningfulTool(w.lastTool)
    const label = w.status === 'running' ? 'running' : w.status === 'correction' ? 'correcting' : w.status
    return row('▶', 'running', `${label}${tool ? ` · ${tool}` : ''}${again}`, 'cancel')
  }
  if (w.status === 'failed') return row('!', 'attention', `failed${again}`)
  if (w.status === 'cancelled') return row('!', 'attention', `cancelled${again}`)
  return row('·', 'blocked', `${w.status}${again}`)
}

/** Pads or cuts a cell to exactly `n` columns. */
export function cell(text: string, n: number): string {
  const t = fit(text, n)
  return t + ' '.repeat(Math.max(0, n - t.length))
}

/** Per-criterion results from evidence.md (`- AC-1: passed — …`), when a check recorded them. */
export function parseEvidence(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = /^\s*-\s+(AC-\d+[a-z]?):\s*(passed|failed|unverified|not-applicable)\b/.exec(line)
    if (m) out[m[1]!] = m[2]!
  }
  return out
}

export const CRITERIA_OPEN = '@criteria'

// --- Effort indicator (AC-29): Claude Code's own marks ---

/**
 * The marks Claude Code draws beside an effort level (its effort indicator, read off build 2.1.294:
 * low ○, medium ◐, high ●, xhigh ◉, max ◈), so the mod reads as the host does.
 */
export const EFFORT_GLYPH: Record<string, string> = { low: '○', medium: '◐', high: '●', xhigh: '◉', max: '◈' }

/** `● high`, or null for inherit / unknown / none. */
export function effortLabel(effort: string | null | undefined): string | null {
  if (!effort || effort === 'inherit' || !EFFORT_GLYPH[effort]) return null
  return `${EFFORT_GLYPH[effort]} ${effort}`
}

/** `Opus 5.5 ● high`, `Opus 5.5`, `● high` or ''. */
export function modelEffort(model: string | null | undefined, effort: string | null | undefined): string {
  return [friendlyModel(model), effortLabel(effort)].filter(Boolean).join(' ')
}

// --- Model choices for the settings table ---

/** Picker entries: label → stored value. "Custom id…" opens an Input. */
export const MODEL_CHOICES: { label: string; value: string }[] = [
  { label: 'inherit', value: 'inherit' },
  { label: 'Opus 5.5', value: 'claude-opus-5-5' },
  { label: 'Fable 5.1', value: 'claude-fable-5-1' },
  { label: 'Sonnet 5.5', value: 'claude-sonnet-5-5' },
  { label: 'Haiku 5.5', value: 'claude-haiku-5-5' },
  { label: 'opus (alias)', value: 'opus' },
  { label: 'sonnet (alias)', value: 'sonnet' },
  { label: 'haiku (alias)', value: 'haiku' },
  { label: 'fable (alias)', value: 'fable' },
]
export const CUSTOM_MODEL = '@custom'

// --- Pane UI state, carried in the `selectedTask` string (no other key exists for it) ---

/** `group`: the first member of the Tasks group whose members are listed. */
export type PaneUi = { task: string | null; criteria: boolean; criterion: string | null; picker: boolean; helper: string | null; retired: boolean; group: string | null }
const EMPTY_UI: PaneUi = { task: null, criteria: false, criterion: null, picker: false, helper: null, retired: false, group: null }

/** Reads the pane's UI state; a plain task id (older form) is that task's open Details. */
export function decodeUi(raw: string | null | undefined): PaneUi {
  if (!raw) return { ...EMPTY_UI }
  if (raw === CRITERIA_OPEN) return { ...EMPTY_UI, criteria: true }
  if (!raw.startsWith('{')) return { ...EMPTY_UI, task: raw }
  try {
    const v = JSON.parse(raw) as Partial<PaneUi>
    return {
      task: typeof v.task === 'string' ? v.task : null,
      criteria: v.criteria === true,
      criterion: typeof v.criterion === 'string' ? v.criterion : null,
      picker: v.picker === true,
      helper: typeof v.helper === 'string' ? v.helper : null,
      retired: v.retired === true,
      group: typeof v.group === 'string' ? v.group : null,
    }
  } catch {
    return { ...EMPTY_UI }
  }
}

export function encodeUi(ui: PaneUi): string | null {
  const parts = Object.entries(ui).filter(([, v]) => v !== null && v !== false)
  return parts.length ? JSON.stringify(Object.fromEntries(parts)) : null
}

/** Applies `patch` to the encoded state. */
export const patchUi = (raw: string | null | undefined, patch: Partial<PaneUi>) => encodeUi({ ...decodeUi(raw), ...patch })

// --- Tabs of the one pane (the pane's title says which view it shows) ---

export const PLAN_TITLE = 'Stip'
export const SETTINGS_TITLE = 'Stip · Settings'

// --- Toasts the interface raises: the core's rules (≤60 chars, no prefix or paths, ×N) ---


const toastState: { value: CoalesceState } = { value: {} }

/** The text to show for a UI toast under `key` (coalesced within 30 s). */
export function uiToast(key: string, text: string, now: number): string {
  const r = coalesce(toastState.value, key, text, now)
  toastState.value = r.state
  return r.text
}

// --- Settings table ---

export type TableRow = { key: string; target: Target; role: string; phase: string; label: string; inPlan?: boolean; configured?: boolean }

/** Every built-in Stip role (custom roles in the config are listed after them). */
export const BUILTIN_ROLES = ['backend', 'api', 'frontend', 'architecture', 'design', 'database', 'cloud', 'security', 'delivery', 'verification', 'documentation', 'research', 'communication']
export const COMMON_ROLES = BUILTIN_ROLES

/** Why a new role name is refused, or null when it can be added. */
export function roleNameError(name: string, existing: string[]): string | null {
  if (!/^[a-z][a-z0-9-]{0,47}$/.test(name)) return 'Role names are lowercase letters, digits and dashes (start with a letter, at most 48).'
  if (name === 'discovery' || name === 'coordinator') return `${name} stays with the orchestrator (this session); it is not a worker role.`
  if (existing.includes(name)) return `${name} is already listed.`
  return null
}

/**
 * Defaults, then the roles the bound plan uses ("in plan"), then the other built-in roles, then
 * custom roles of the config, then phase overrides.
 */
export function tableRows(s: StipSnapshot | null, value: StipClientSettings, extraRoles: string[] = []): TableRow[] {
  const planRoles = [...new Set((s?.tasks ?? []).map(t => t.role))]
  const configured = new Set(Object.keys(value.roles ?? {}))
  const roles = [...new Set([...planRoles, ...BUILTIN_ROLES, ...configured, ...extraRoles])].filter(r => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r))
  const rows: TableRow[] = [{ key: 'defaults', target: { kind: 'defaults' }, role: 'Defaults', phase: 'all', label: 'Defaults' }]
  for (const role of roles)
    rows.push({ key: `role:${role}`, target: { kind: 'role', role }, role, phase: 'all', label: role, inPlan: planRoles.includes(role), configured: configured.has(role) || extraRoles.includes(role) })
  for (const phase of Object.keys(value.phases ?? {}))
    rows.push({ key: `phase:${phase}`, target: { kind: 'phase', phase }, role: 'all roles', phase, label: `all roles in ${phase}` })
  for (const [phase, rs] of Object.entries(value.phase_roles ?? {}))
    for (const role of Object.keys(rs)) rows.push({ key: `pr:${phase}:${role}`, target: { kind: 'phase-role', phase, role }, role, phase, label: `${role} in ${phase}` })
  return rows
}

/** The phase a role is shown resolving in (its plan task's, else a sensible default). */
export function phaseForRole(s: StipSnapshot | null, role: string): string {
  return s?.tasks.find(t => t.role === role)?.phase ?? (role === 'research' ? 'explore' : role === 'verification' ? 'check' : role === 'documentation' ? 'docs' : 'apply')
}

/** `~/…/.workflow/config.json`: home as ~, long paths keep their last two parts. */
export function shortPath(path: string, home: string | null | undefined): string {
  const p = home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path
  const parts = p.split('/')
  return parts.length <= 4 ? p : `${parts[0]}/…/${parts.slice(-2).join('/')}`
}

// --- Compact terminal rows (docked pane under ~60 columns) ---

const SHORT_WORDS: [RegExp, string][] = [
  [/^integrated\b.*/, 'done'],
  [/^accepted, not integrated\b.*/, 'not integr.'],
  [/^accepted\b.*/, 'done'],
  [/^cancelled\b.*/, 'cancel.'],
  [/^awaiting review\b.*/, 'review'],
  [/^ready to launch\b.*/, 'launch'],
  [/^ready once approved$/, 'ready'],
  [/^waiting on permission\b.*/, 'permission'],
  [/^waiting on\b.*/, 'waiting'],
  [/^blocked by\b.*/, 'blocked'],
  [/^tampered\b.*/, 'tampered'],
  [/^rejected\b.*/, 'rejected'],
  [/^redo\b.*/, 'redo'],
  [/^launch unconfirmed\b.*/, 'unconfirmed'],
  [/^(running|correcting|starting)\b.*/, '$1'],
  [/^not ready yet$/, 'not ready'],
]

/** The state words whole when they fit `room`, else the short word; cut only as a last resort. */
export function compactWords(words: string, room: number): string {
  if (words.length <= room) return words
  const head = words.split(' · ')[0]!
  if (head.length <= room) return head
  for (const [re, short] of SHORT_WORDS) if (re.test(head)) return shortenWords(head.replace(re, short), room)
  return shortenWords(head, room)
}

// --- Ledger (AC-27, AC-38): the Tasks rows, the criteria ruler, width-safe lines (AC-30) ---

/** Terminal cells of a Button: a plain one draws its label alone, another `[ label ]`. */
export const buttonCells = (label: string, plain = false) => (plain ? label.length : label.length + 4)

/** Cells of a row of buttons with a gap of one. */
export const buttonsCells = (buttons: { label: string; plain?: boolean }[]) =>
  buttons.reduce((n, b) => n + buttonCells(b.label, b.plain), 0) + Math.max(0, buttons.length - 1)

export type MetaKind = 'model' | 'effort' | 'state' | 'time'
export type MetaPart = { kind: MetaKind; text: string }

export const metaWidth = (parts: MetaPart[]) => parts.reduce((n, p) => n + p.text.length, 0) + 3 * Math.max(0, parts.length - 1)

/**
 * A row's second line, `Model · ● effort · state · time`, fitted to `room` by priority: the time
 * goes first, then the effort word (its mark stays), then the state shortens at a word boundary,
 * then the effort mark, then the model. A model name is never split.
 */
export function fitMeta(model: string | null, effort: string | null | undefined, state: string, time: string | null, room: number): MetaPart[] {
  const eff = effortLabel(effort)
  const mark = eff ? eff.split(' ')[0]! : null
  const build = (m: string | null, e: string | null, st: string, t: string | null): MetaPart[] =>
    [
      m ? { kind: 'model' as const, text: m } : null,
      e ? { kind: 'effort' as const, text: e } : null,
      st ? { kind: 'state' as const, text: st } : null,
      t ? { kind: 'time' as const, text: t } : null,
    ].filter((p): p is MetaPart => p !== null)
  for (const parts of [build(model, eff, state, time), build(model, eff, state, null), build(model, mark, state, null)]) if (metaWidth(parts) <= room) return parts
  for (const [m, e] of [[model, mark], [model, null], [null, null]] as const) {
    const fixed = metaWidth(build(m, e, 'x', null)) - 1
    const st = compactWords(state, Math.max(1, room - fixed))
    const parts = build(m, e, st, null)
    if (metaWidth(parts) <= room) return parts
  }
  return build(null, null, compactWords(state, Math.max(2, room)), null)
}

/**
 * An activity worth showing: a phrase ("writing README.md") as is; a bare tool name only when it
 * says something to the person (internal names hidden, MCP names shortened); else null.
 */
export function activityText(activity: string | null | undefined): string | null {
  if (!activity) return null
  if (/\s/.test(activity)) return activity
  return meaningfulTool(activity)
}

/** Sort tier of a row: what asks for the person first, then running, ready, blocked, done. */
export function rowTier(r: TaskRow): number {
  if (r.action === 'review' || r.action === 'launch' || r.action === 'redo' || r.tone === 'attention') return 0
  if (r.tone === 'running') return 1
  if (r.tone === 'ready') return 2
  if (r.tone === 'blocked') return 3
  return 4
}

/** One Tasks entry: a task, or a group of tasks sharing model, effort and state. */
export type TaskEntry = {
  /** First member: the entry's address (`task-<id>`, `group-<id>`). */
  id: string
  ids: string[]
  row: TaskRow
  model: string | null
  effort: string | null
  /** What the row says after model and effort: the activity while running, else the state words. */
  state: string
}

/**
 * The entries in reading order: rows that ask for the person, running, ready, blocked (execution
 * order), then finished ones (latest first). Settled rows with no action of their own and the same
 * model, effort and state words are one entry.
 */
export function taskEntries(s: StipSnapshot, rows: Map<string, TaskRow>, tampered: Set<string>): TaskEntry[] {
  const order = planGroups(s.tasks).flatMap(g => g.tasks)
  const entries = order.map((t, i) => {
    const r = rows.get(t.id)!
    const w = t.latest
    const running = r.tone === 'running' && w !== null
    const again = w && w.attempt > 1 ? ` · attempt ${w.attempt}` : ''
    const state = running ? `${activityText(w!.activity) ?? r.words.split(' · ')[0]}${again}` : r.words
    // Launched: what the attempt runs with. Not launched yet: what the settings resolve for it.
    const model = w ? w.model : (t.planned?.model ?? null)
    const effort = w ? w.effort : (t.planned?.effort ?? null)
    return { i, entry: { id: t.id, ids: [t.id], row: r, model: friendlyModel(model), effort, state } }
  })
  entries.sort((a, b) => {
    const ta = rowTier(a.entry.row)
    const tb = rowTier(b.entry.row)
    return ta - tb || (ta === 4 ? b.i - a.i : a.i - b.i)
  })
  const out: TaskEntry[] = []
  const groups = new Map<string, TaskEntry>()
  for (const { entry } of entries) {
    const groupable = entry.row.action === 'none' && !tampered.has(entry.id) && rowTier(entry.row) >= 2
    const key = `${entry.model}|${entry.effort}|${entry.state}|${entry.row.tone}`
    const group = groupable ? groups.get(key) : undefined
    if (group) {
      group.ids.push(entry.id)
      continue
    }
    const copy = { ...entry, ids: [...entry.ids] }
    if (groupable) groups.set(key, copy)
    out.push(copy)
  }
  return out
}

export type MarkTone = 'passed' | 'failed' | 'docs' | 'open'
export type CriterionMark = { id: string; glyph: string; tone: MarkTone }

/** The ruler's glyph per tone (AC-38): ✓ passed, ✗ failed, ◌ pending-docs, · open. */
export const MARK_GLYPH: Record<MarkTone, string> = { passed: '✓', failed: '✗', docs: '◌', open: '·' }

/** A criterion's tone on the ruler. */
export function markTone(c: Pick<StipSnapshot['criteria'][number], 'status'> & { pendingDocs?: boolean }): MarkTone {
  if (c.status === 'passed') return 'passed'
  if (c.status === 'failed') return 'failed'
  return c.pendingDocs ? 'docs' : 'open'
}

/** One glyph per criterion, in spec order, for the ruler (AC-38). */
export function rulerMarks(criteria: StipSnapshot['criteria']): CriterionMark[] {
  return criteria.map(c => {
    const tone = markTone(c)
    return { id: c.id, glyph: MARK_GLYPH[tone], tone }
  })
}

/**
 * The ruler laid out in rows no wider than `room`: each mark is a column as wide as the longest AC
 * label plus one, its glyph centered over its label.
 */
export function rulerRows(marks: CriterionMark[], room: number): { cell: number; rows: CriterionMark[][] } {
  const cell = Math.max(2, ...marks.map(m => m.id.length)) + 1
  const per = Math.max(1, Math.floor((room + 1) / cell))
  const rows: CriterionMark[][] = []
  for (let i = 0; i < marks.length; i += per) rows.push(marks.slice(i, i + per))
  return { cell, rows }
}

/** The first criterion not passed (failed ones first) and why, or null when every one passed. */
export function firstOpen(s: StipSnapshot): { id: string; title: string; why: string } | null {
  const criteria = s.criteria ?? []
  const open = criteria.find(c => c.status === 'failed') ?? criteria.find(c => c.status !== 'passed')
  if (!open) return null
  const covering = s.tasks.filter(t => t.criteria.includes(open.id))
  const docsOnly = covering.length > 0 && covering.every(t => t.phase === 'docs')
  const why =
    open.status === 'failed'
      ? 'failed'
      : docsOnly || open.pendingDocs
        ? 'waiting on docs'
        : open.status === 'unverified'
          ? 'unverified'
          : covering.length
            ? 'not checked yet'
            : 'no task covers it'
  return { id: open.id, title: open.title || open.text, why }
}

/** `AC-14 · README documents quotas · waiting on docs`, fitted to `room` at word boundaries. */
export function openLine(o: { id: string; title: string; why: string }, room: number): string {
  const full = `${o.id} · ${o.title} · ${o.why}`
  if (full.length <= room) return full
  const fixed = o.id.length + o.why.length + 6
  if (room - fixed >= 6) return `${o.id} · ${shortenWords(o.title, room - fixed)} · ${o.why}`
  if (`${o.id} · ${o.why}`.length <= room) return `${o.id} · ${o.why}`
  return shortenWords(`${o.id} ${o.why}`, room)
}

/** The approval badge for the pane header: icon, words, and the short digest when approved. */
export function headerBadge(s: StipSnapshot, level: number): { text: string; tone: BandTone } {
  const state = approvalState(s)
  const digest = s.approval.digest ? s.approval.digest.slice(0, 8) : ''
  if (state === 'approved' || state === 'approved (adopted)') {
    const adopted = state === 'approved (adopted)' && level === 0 ? ' (adopted)' : ''
    return { text: level <= 1 && digest ? `✓ approved${adopted} ${digest}` : level <= 2 ? '✓ approved' : '✓', tone: 'success' }
  }
  const b = badge(s, level >= 1, level >= 3)
  return { text: state === 'not confirmed' && level === 0 ? '! approval not confirmed by you, revoked' : b.text, tone: b.tone }
}

// --- Pane states (AC-35) ---

/** The state the Plan tab draws, one per lifecycle moment (ledger-states.html). */
export type PaneView = 'setup' | 'start' | 'explore' | 'validate' | 'apply' | 'check' | 'docs' | 'archive'

/** The lifecycle rail of the pane: Bootstrap is implied, Archive last. */
export const RAIL = ['Explore', 'Validate', 'Apply', 'Check', 'Docs', 'Archive'] as const
const RAIL_AT: Record<PaneView, number> = { setup: -1, start: -1, explore: 0, validate: 1, apply: 2, check: 3, docs: 4, archive: 5 }

/** The rail's current index for a state (-1: no rail). */
export const railIndex = (v: PaneView) => RAIL_AT[v]

/**
 * The independent review is under way: every apply task is accepted (and integrated) and a check
 * task has started (or the core names a reviewer). Until then the Apply state keeps every task in view.
 */
export function inCheck(s: StipSnapshot): boolean {
  const applied = s.tasks.filter(t => t.phase === 'apply').every(t => t.latest?.acceptance === 'accepted' && !t.awaitingIntegration)
  if (!applied) return false
  return Boolean(s.check?.reviewer) || s.tasks.some(t => t.phase === 'check' && t.latest !== null)
}

/** Which state the pane shows for a snapshot. */
export function paneView(s: StipSnapshot): PaneView {
  if (s.setup) return 'setup'
  if (!s.changeId) return s.archived ? 'archive' : 'start'
  switch (s.phase) {
    case 'exploring':
      return 'explore'
    case 'draft':
      return 'validate'
    case 'checked':
    case 'documented':
    case 'archived':
      return 'docs'
    default:
      return inCheck(s) ? 'check' : 'apply'
  }
}

/** The criterion the running work is on (it pulses, AC-36): the reviewer's, else a docs task's open one. */
export function criterionUnderReview(s: StipSnapshot): string | null {
  const criteria = s.criteria ?? []
  const open = (id: string) => criteria.some(c => c.id === id && c.status !== 'passed')
  if (s.check?.criterion && open(s.check.criterion)) return s.check.criterion
  const running = s.tasks.filter(t => t.latest && isActive(t.latest.status))
  for (const phase of ['check', 'docs'])
    for (const t of running.filter(x => x.phase === phase)) {
      const id = t.criteria.find(c => open(c) && (phase === 'check' || criteria.find(x => x.id === c)?.pendingDocs))
      if (id) return id
    }
  return null
}

/**
 * Criteria whose recorded proof predates the contract now approved: the check report was taken
 * before the last approval, or the criterion changed since that approval.
 */
export function outdatedProofs(s: StipSnapshot): string[] {
  const diff = s.contractDiff
  if (!diff) return []
  const changed = new Set(diff.criteria.filter(c => c.change !== 'removed').map(c => c.id))
  const reportOld = s.check?.reportAt && diff.approvedAt ? Date.parse(s.check.reportAt) < Date.parse(diff.approvedAt) : false
  return (s.criteria ?? []).filter(c => c.proof && (changed.has(c.id) || (reportOld && c.proof.source === 'check'))).map(c => c.id)
}

/** `Opus 5.5 ○ low, Fable 5.1 ◐ medium`: the distinct models and efforts the plan will run with. */
export function plannedModels(s: StipSnapshot): string {
  const seen = new Set<string>()
  for (const t of s.tasks) {
    const model = t.latest ? t.latest.model : (t.planned?.model ?? null)
    const effort = t.latest ? t.latest.effort : (t.planned?.effort ?? null)
    const text = modelEffort(model, effort)
    if (text) seen.add(text)
  }
  return [...seen].join(', ')
}

/** `38 min`, `1 h 05 min`, `under a minute`. */
export function duration(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'under a minute'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`
}

/** The archive summary's lines (AC-35): criteria, tasks, time. */
export function archiveFacts(a: StipArchiveSummary): { criteria: string; tasks: string; time: string | null } {
  const corrected = a.tasks.corrected.length
  const tasks =
    corrected === 0
      ? `${a.tasks.total}, none needed a correction`
      : corrected === 1
        ? `${a.tasks.total}, one needed a correction`
        : `${a.tasks.total}, ${corrected} needed a correction`
  const time = duration(a.durationMs)
  return { criteria: `${a.criteria.passed} of ${a.criteria.total} passed`, tasks, time: time ? `${time} from explore to archive` : null }
}

/** The models an archived change ran on, once each, in task order. */
export function modelsUsed(a: StipArchiveSummary): string {
  return [...new Set(a.models.map(m => friendlyModel(m.model)).filter((x): x is string => x !== null))].join(', ')
}

/** Sets (or, with undefined, removes) `ui.motion` in a scope's section (AC-36). */
export function setMotion(value: StipClientSettings, motion: StipMotion | undefined): StipClientSettings {
  const next: StipClientSettings = structuredClone(value)
  const ui = { ...(next.ui ?? {}) }
  if (motion === undefined) delete ui.motion
  else ui.motion = motion
  if (Object.keys(ui).length) next.ui = ui
  else delete next.ui
  return next
}

/** The copy's dashes (AC-38): an em dash in data shown as UI copy reads as a comma. */
export const noEmDash = (text: string) => text.replace(/\s*—\s*/g, ', ')
