// Motion (AC-36), pure: which one-shot animations are playing, which frame each is on, and when the
// pane needs its next frame. One-shots play once per event (phase change, approval seal, verdict,
// hand-off, unblocked task, changed criteria, archive fold, outdated evidence, entering lines);
// only the running clock and the criterion under review repeat. `calm` drops in-between frames
// (one-shots jump to their end), `off` shows final states and stops the repeating ones too. While
// the person types, one-shots that have not started wait, and nothing repeats; they play after.
//
// Module state on purpose: what plays is a property of this module instance's drawing (a hot reload
// starts clean), never data the drawing reads from `$.state`. The files that hold `$` arm the
// timers (`$.clock.after`) and redraw (`$.ui.invalidate`, `$.ui.blit` for the terminal's Rasters);
// this file only says when.
import type { StipMotion, StipSnapshot } from '../../types'
import { MARK_GLYPH, elapsed, markTone, outdatedProofs, paneView, railIndex } from './model.ts'

/** One frame of a one-shot: 10 a second, within the terminal's 30 and the desktop's 10. */
export const FRAME_MS = 100

export type MotionKind = 'seal' | 'phase' | 'verdict' | 'unblock' | 'settle' | 'fold' | 'handoff' | 'outdated' | 'enter' | 'scan' | 'step'

/** How long each one-shot lasts (ms), its frames included. */
export const LENGTH: Record<MotionKind, number> = {
  // [ approve ] → [ · ] → ⟦ ⟧ → sealed, held, then the rail sews into Apply.
  seal: 700,
  // The seam fills (3 frames), then the next stage lights.
  phase: 400,
  // The mark lands: · → ∙ → glyph bold → glyph.
  verdict: 400,
  // A task that became ready lights up, then settles.
  unblock: 600,
  // Changed criteria: bright, then bold, then plain (the ± stays).
  settle: 1200,
  // The card shows, its lines fold one by one, the one line with its commit, then the summary.
  fold: 1900,
  // ✎ the command typed into the prompt; the marker then stays a while.
  handoff: 8000,
  // Proof recorded before the contract changed dims.
  outdated: 300,
  // A line that appears comes in dim for two frames.
  enter: 200,
  // Setup: the found items come in one by one (length set per scan).
  scan: 1200,
  // The newest step of a trail comes in bold.
  step: 200,
}

/** Kinds whose in-between frames need a redraw each frame (the others only start and end). */
const FRAMED: ReadonlySet<MotionKind> = new Set(['seal', 'phase', 'verdict', 'unblock', 'settle', 'fold', 'handoff', 'outdated', 'enter', 'scan', 'step'])

/** The hand-off marker types its command at this pace, then stays put. */
export const TYPE_MS_PER_CHAR = 25

type Event = { id: string; kind: MotionKind; key: string; at: number | null; delay: number; length: number; data: Record<string, unknown> }

/** A cell grid the terminal pane drew, repainted by `$.ui.blit` between redraws. */
export type LiveRaster = { key: string; columns: number; cells: (now: number) => string }

type State = {
  events: Map<string, Event>
  /** Every one-shot begun in this session: an event plays once, even when drawn again later. */
  played: Set<string>
  mode: StipMotion
  typing: boolean
  /** The pending wake-up: its due time and token (a later arm with an earlier due supersedes it). */
  armed: { due: number; token: number } | null
  token: number
  /** What the last pane drawing holds that repeats: on which surface, its Rasters, a desktop tick. */
  live: { surface: string | null; rasters: LiveRaster[]; clock: boolean; pulse: boolean }
}

const state: State = { events: new Map(), played: new Set(), mode: 'auto', typing: false, armed: null, token: 0, live: { surface: null, rasters: [], clock: false, pulse: false } }

/** Forgets everything (a new session, a test). */
export function reset() {
  state.events.clear()
  state.played.clear()
  state.mode = 'auto'
  state.typing = false
  state.armed = null
  state.live = { surface: null, rasters: [], clock: false, pulse: false }
}

export const mode = () => state.mode
export const typing = () => state.typing

/** Takes the setting and the typing flag; one-shots held while typing start when it ends. */
export function configure(motion: StipMotion | undefined, isTyping: boolean | undefined, now: number) {
  state.mode = motion === 'calm' || motion === 'off' ? motion : 'auto'
  const typingNow = isTyping === true
  if (state.typing && !typingNow) for (const e of state.events.values()) if (e.at === null) e.at = now
  state.typing = typingNow
  if (state.mode !== 'auto') for (const [id, e] of state.events) if (e.kind !== 'handoff') state.events.delete(id)
}

/**
 * Starts a one-shot unless the same event already played or plays (once per event). Under `calm` and
 * `off` nothing is recorded: the drawing shows the end state at once. The hand-off marker is kept
 * under every setting (it says where the command went); only its typing is motion.
 */
export function begin(kind: MotionKind, key: string, now: number, opts: { delay?: number; length?: number; data?: Record<string, unknown> } = {}) {
  const id = `${kind}:${key}`
  if (state.events.has(id) || state.played.has(id)) return
  state.played.add(id)
  if (state.mode !== 'auto' && kind !== 'handoff') return
  const held = state.typing && kind !== 'handoff'
  state.events.set(id, { id, kind, key, at: held ? null : now, delay: opts.delay ?? 0, length: opts.length ?? LENGTH[kind], data: opts.data ?? {} })
}

/** Where a one-shot stands: `t` ms into it (0 while held or delayed), or null once over (or never begun). */
export function at(kind: MotionKind, key: string, now: number): { t: number; held: boolean; data: Record<string, unknown> } | null {
  const e = state.events.get(`${kind}:${key}`)
  if (!e) return null
  if (e.at === null) return { t: 0, held: true, data: e.data }
  const t = now - e.at - e.delay
  if (t >= e.length) return null
  return { t: Math.max(0, t), held: false, data: e.data }
}

/** The frame number `t` falls in. */
export const frame = (t: number) => Math.floor(t / FRAME_MS)

/** The keys of a kind's events still playing (or held). */
export function keys(kind: MotionKind, now: number): string[] {
  const out: string[] = []
  for (const e of state.events.values()) if (e.kind === kind && at(kind, e.key, now) !== null) out.push(e.key)
  return out
}

// --- Hand-off (✎): a command put in the person's prompt ---

/** Records a hand-off; a newer one replaces it. `filled` false: the prompt held a draft, kept as it was. */
export function handoff(text: string, filled: boolean, now: number) {
  for (const [id, e] of state.events) if (e.kind === 'handoff') state.events.delete(id)
  state.played.delete('handoff:prompt')
  begin('handoff', 'prompt', now, { data: { text, filled } })
}

/** The marker as it reads now: the command typed so far (auto), whole otherwise; null once it went. */
export function handoffNow(now: number): { text: string; shown: string; filled: boolean; typing: boolean } | null {
  const h = at('handoff', 'prompt', now)
  if (!h) return null
  const text = String(h.data.text ?? '')
  const filled = h.data.filled !== false
  if (state.mode !== 'auto') return { text, shown: text, filled, typing: false }
  const n = Math.min(text.length, Math.floor(h.t / TYPE_MS_PER_CHAR) + 1)
  return { text, shown: text.slice(0, n), filled, typing: n < text.length }
}

// --- Events read off snapshot transitions ---

type Snap = StipSnapshot

const findingKey = (change: string, text: string) => `${change}:${text}`
const toneOf = (c: Snap['criteria'][number]) => markTone(c)

/**
 * The one-shots a snapshot transition starts (the core's every write passes through here): stage
 * changes, the approval seal, verdicts, unblocked tasks, a changed contract, outdated proof, new
 * findings and proofs, new trail steps, and the archive fold.
 */
export function observe(prev: Snap | null | undefined, next: Snap | null | undefined, now: number) {
  if (next) configure(next.ui?.motion, next.ui?.typing, now)
  if (!prev || !next || prev.setup || next.setup) return
  // The bound change archived in this session: it folds into one line.
  if (prev.changeId && !next.changeId && next.archived?.changeId === prev.changeId) {
    begin('fold', prev.changeId, now)
    return
  }
  const change = next.changeId
  if (!change || prev.changeId !== change) return
  let sealing = false
  if (!prev.approval.current && next.approval.current && next.approval.digest) {
    begin('seal', `${change}:${next.approval.digest}`, now, { data: { digest: next.approval.digest } })
    sealing = true
  }
  const from = railIndex(paneView(prev))
  const to = railIndex(paneView(next))
  if (to > from && from >= 0) begin('phase', `${change}:${to}`, now, { delay: sealing ? LENGTH.seal : 0, data: { from, to } })

  const before = new Map((prev.criteria ?? []).map(c => [c.id, toneOf(c)]))
  for (const c of next.criteria ?? []) {
    const tone = toneOf(c)
    if (tone !== 'open' && before.has(c.id) && before.get(c.id) !== tone) begin('verdict', `${change}:${c.id}:${tone}`, now, { data: { id: c.id, glyph: MARK_GLYPH[tone] } })
    const had = (prev.criteria ?? []).find(x => x.id === c.id)
    if (c.proof && had && !had.proof) begin('enter', `proof:${change}:${c.id}`, now)
  }

  // A task whose last dependency was just accepted: it lights up once.
  const depsDone = (s: Snap, id: string) => {
    const t = s.tasks.find(x => x.id === id)
    return t !== undefined && t.dependsOn.length > 0 && t.dependsOn.every(d => s.tasks.find(x => x.id === d)?.latest?.acceptance === 'accepted')
  }
  for (const t of next.tasks) if (!t.latest && prev.tasks.some(x => x.id === t.id) && depsDone(next, t.id) && !depsDone(prev, t.id)) begin('unblock', `${change}:${t.id}`, now)

  const sig = (d: Snap['contractDiff']) => (d ? JSON.stringify([d.since, d.criteria, d.addedTasks, d.changedTasks, d.removedTasks]) : '')
  if (next.contractDiff && sig(next.contractDiff) !== sig(prev.contractDiff)) begin('settle', `${change}:${sig(next.contractDiff)}`, now)

  const old = new Set(outdatedProofs(prev))
  for (const id of outdatedProofs(next)) if (!old.has(id)) begin('outdated', `${change}:${id}`, now)

  if (prev.explore && next.explore) {
    const seen = new Set([...prev.explore.findings.map(f => f.text), ...prev.explore.decisions.map(d => d.text)])
    for (const f of [...next.explore.findings, ...next.explore.decisions]) if (!seen.has(f.text)) begin('enter', `explore:${findingKey(change, f.text)}`, now)
  }

  const lastStep = new Map(prev.workers.map(w => [`${w.taskId}#${w.attempt}`, w.steps?.at(-1)?.at ?? 0]))
  for (const w of next.workers) {
    const last = w.steps?.at(-1)
    if (last && last.at !== lastStep.get(`${w.taskId}#${w.attempt}`)) begin('step', `${w.taskId}#${w.attempt}:${last.at}`, now)
  }
}

// --- What repeats, and when the next frame is due ---

/** Begins a pane drawing: its Rasters and repeating parts are listed afresh as it draws. */
export function drawing(surface: string) {
  state.live = { surface, rasters: [], clock: false, pulse: false }
}

/** The pane shows a running clock (repaints every second while work runs). */
export function liveClock(r: LiveRaster | null) {
  state.live.clock = true
  if (r) state.live.rasters.push(r)
}

/** The pane shows the criterion under review (pulses at 1 Hz). */
export function livePulse(r: LiveRaster | null) {
  state.live.pulse = true
  if (r) state.live.rasters.push(r)
}

/** The pane closed: nothing of it repeats. */
export function closed() {
  state.live = { surface: null, rasters: [], clock: false, pulse: false }
}

/** True while the clock and the pulse move: not typing, motion not off, the pane showing them. */
export const repeating = () => state.mode !== 'off' && !state.typing && (state.live.clock || state.live.pulse)

/** The pulse's phase: on for half a second, off for the next. */
export const pulseOn = (now: number) => state.mode === 'off' || state.typing || Math.floor(now / 500) % 2 === 0

/** The Rasters to repaint on a tick. */
export const rasters = () => state.live.rasters

/** True when the next tick redraws the pane (a one-shot plays or ended, or the desktop repeats). */
export function needsRedraw(now: number): boolean {
  for (const e of state.events.values()) if (e.at !== null && e.at + e.delay <= now) return true
  return repeating() && state.live.surface !== 'terminal'
}

/** Milliseconds until the pane needs its next frame, or null; prunes the events that are over. */
export function nextDelay(now: number): number | null {
  let best: number | null = null
  const take = (ms: number) => (best = best === null ? Math.max(1, ms) : Math.min(best, Math.max(1, ms)))
  for (const [id, e] of state.events) {
    if (e.at === null) continue
    const start = e.at + e.delay
    const end = start + e.length
    if (now >= end) {
      state.events.delete(id)
      continue
    }
    if (now < start) {
      take(start - now)
      continue
    }
    const framed = state.mode === 'auto' && FRAMED.has(e.kind)
    const typingEnds = e.kind === 'handoff' ? start + String(e.data.text ?? '').length * TYPE_MS_PER_CHAR : end
    if (framed && now < typingEnds) take(Math.min(FRAME_MS - ((now - start) % FRAME_MS), typingEnds - now))
    else take(end - now)
  }
  if (repeating()) take(state.live.pulse ? 500 - (now % 500) : 1000 - (now % 1000))
  return best
}

/** Arms the wake-up due at `due` unless one is armed sooner; the token a timer brings back. */
export function arm(due: number): number | null {
  if (state.armed && state.armed.due <= due) return null
  state.token += 1
  state.armed = { due, token: state.token }
  return state.token
}

/** A timer fired: true when it is the armed one (a superseded timer does nothing). */
export function fired(token: number): boolean {
  if (!state.armed || state.armed.token !== token) return false
  state.armed = null
  return true
}

// --- Terminal Raster cells (RasterProps.cells): base64 of [codePoint, fg, bg] u32 triplets ---

/** The terminal's default color. */
export const DEFAULT_COLOR = 0x01000000
/** A dim gray for the pulse's off half. */
export const DIM_COLOR = 0x6b6d75
/** The ruler's tones as cell colors (the preview's palette; open in the terminal's own color). */
export const TONE_COLOR = { passed: 0x6fbf73, failed: 0xe06c6c, docs: 0x9a8cff, open: DEFAULT_COLOR } as const

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: number[]): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!
    out += c === undefined ? '=' : B64[c & 63]!
  }
  return out
}

/** Cells for one row of text, padded with blanks to `columns`, all in `fg`. */
export function textCells(text: string, columns: number, fg = DEFAULT_COLOR): string {
  const chars = [...text.padEnd(columns)].slice(0, columns)
  const bytes: number[] = []
  const word = (n: number) => bytes.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff)
  for (const ch of chars) {
    word(ch.codePointAt(0) ?? 32)
    word(fg)
    word(DEFAULT_COLOR)
  }
  return base64(bytes)
}

function decode(cells: string): number[] {
  const clean = cells.replace(/=+$/, '')
  const bin: number[] = []
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map(k => (i + k < clean.length ? B64.indexOf(clean[i + k]!) : 0))
    bin.push((n[0]! << 2) | (n[1]! >> 4), ((n[1]! & 15) << 4) | (n[2]! >> 2), ((n[2]! & 3) << 6) | n[3]!)
  }
  return bin.slice(0, Math.floor((clean.length * 3) / 4))
}

const u32 = (b: number[], i: number) => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0

/** Reads cells back to text (tests, the paint approximation). */
export function cellsText(cells: string): string {
  const b = decode(cells)
  let out = ''
  for (let i = 0; i + 12 <= b.length; i += 12) out += String.fromCodePoint(u32(b, i))
  return out
}

/** The foreground of the first cell (tests: the pulse's phase). */
export const cellsColor = (cells: string): number => u32(decode(cells), 4)

/** A running clock's text, fixed to six cells (`59m59s`, `1h02m`). */
export const CLOCK_CELLS = 6
export const clockText = (since: number, now: number) => elapsed(now - since).padEnd(CLOCK_CELLS).slice(0, CLOCK_CELLS)
