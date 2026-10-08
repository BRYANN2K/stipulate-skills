// Toast and status wording and coalescing (pure; the interface may import it too).
// Rules: no "stipulate:" prefix (the toast already names the plugin), at most 60 characters, plain
// words without paths or full digests. Details belong in a transcript notice or the snapshot.

export const TOAST_MAX = 60
export const COALESCE_MS = 30_000

/** Short, plain toast text: prefix removed, paths and digests elided, cut to 60 characters. */
export function toastText(text: string, max = TOAST_MAX): string {
  let s = text
    .replace(/^\s*stip(?:ulate)?\s*[:·-]\s*/i, '')
    .replace(/(?:\.{0,2}\/)?(?:[\w.-]+\/)+[\w.-]+/g, m => (m.includes('/') ? m.split('/').pop()! : m))
    .replace(/\b[0-9a-f]{16,}\b/gi, m => m.slice(0, 8))
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
  return s
}

export type CoalesceState = Record<string, { count: number; at: number }>

/**
 * Decides whether a toast under `key` is shown: the first within 30 s shows; a repeat within the
 * window shows again as "text ×N" (a plugin's toast replaces its own, so one stays visible).
 */
export function coalesce(state: CoalesceState, key: string, text: string, now: number, windowMs = COALESCE_MS): { text: string; state: CoalesceState } {
  const prev = state[key]
  const count = prev && now - prev.at < windowMs ? prev.count + 1 : 1
  const next = { ...state, [key]: { count, at: now } }
  for (const [k, v] of Object.entries(next)) if (now - v.at >= windowMs * 4) delete next[k]
  if (count === 1) return { text: toastText(text), state: next }
  const suffix = ` ×${count}`
  return { text: toastText(text, TOAST_MAX - suffix.length) + suffix, state: next }
}

/** The core's toast messages (short) by event. */
export const TOASTS = {
  registryRestored: (cancelled: number) => `Registry restored · outside change undone${cancelled ? ` · ${cancelled} cancelled` : ''}`,
  lifecycleRestored: () => 'Lifecycle restored · outside change undone',
  tampered: (jobs: string[]) => `Tampered ${jobs.join(', ')} · check git diff`,
  approvalRevoked: () => 'Approval revoked · not given by you',
  recordsDiscarded: () => 'Approval record discarded · changed outside',
  workerCancelled: (job: string) => `${job} cancelled · tampering detected`,
  applyGate: (change: string) => `Apply gate · ${change} not approved yet`,
} as const
