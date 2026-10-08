// Integrity of the worker registry and lifecycle state (pure). The registry's known-good state
// comes only from the mod's own engine calls: each call returns the job it wrote, and every
// other job must be exactly what the mod knew before. Anything else is tampering.

/** Stable JSON text (sorted keys) for comparing parsed documents. */
export function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canon((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(value)
}

export type Registry = { jobs: Record<string, any>[] } & Record<string, unknown>

export const registryKey = (job: Record<string, any>) =>
  typeof job.helper_id === 'string' ? job.helper_id : `${job.task_id}#${job.attempt}`

export function parseRegistry(text: string): Registry | null {
  if (!text.trim()) return null
  try {
    const value = JSON.parse(text)
    return value && Array.isArray(value.jobs) ? value : null
  } catch {
    return null
  }
}

/** The fields each engine action writes on its own job; every other field must be as known. */
export const ACTION_FIELDS: Record<string, readonly string[]> = {
  confirm: ['session_id', 'launch_confirmed', 'status', 'confirmed_at', 'updated_at', 'actual_model', 'error'],
  settle: ['status', 'updated_at', 'last_activity_at', 'finished_at', 'stop_confirmed', 'last_tool', 'error', 'result_path', 'result_bytes', 'result_truncated'],
  review: ['acceptance', 'review', 'updated_at', 'worktree_removed'],
  cancel: ['status', 'acceptance', 'stop_confirmed', 'finished_at', 'cancellation', 'updated_at', 'worktree_removed'],
  integrate: ['integrated', 'integrated_at', 'updated_at', 'integration', 'worktree_removed'],
}

/** Fields `reserve --correction` legitimately changes on other attempts. */
const CORRECTION_FIELDS: Record<string, (v: unknown) => boolean> = {
  acceptance: v => v === 'rejected',
  worktree_removed: v => v === true,
}

export type Verdict = {
  ok: boolean
  /** The registry to keep: the disk content when ok, else known-good with the returned job applied. */
  restored: Registry | null
  /** Jobs whose content differs from what the mod knew (registry keys). */
  tampered: string[]
  /** Tampered jobs that the disk shows integrated while the known-good state does not. */
  integrated: string[]
}

/**
 * Compares the registry on disk with the known-good one. `returned` is the job the mod's own engine
 * call reports having written (it may differ from known-good); `correction` allows what a correction
 * reserve changes on earlier attempts.
 */
export function verifyRegistry(
  known: Registry | null,
  disk: Registry | null,
  returned?: Record<string, any> | null,
  correction = false,
  action?: string,
): Verdict {
  const prev = new Map((known?.jobs ?? []).map(j => [registryKey(j), j]))
  const now = new Map((disk?.jobs ?? []).map(j => [registryKey(j), j]))
  const own = returned ? registryKey(returned) : null
  const tampered: string[] = []
  const integrated: string[] = []
  const allowed = (before: Record<string, any>, after: Record<string, any>) => {
    // A reserve drops the previous attempt's worktree; a correction also rejects earlier attempts.
    if (!correction && action !== 'reserve') return false
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const k of keys) {
      if (k === 'updated_at' || canon(before[k]) === canon(after[k])) continue
      if (!correction && k !== 'worktree_removed') return false
      if (!CORRECTION_FIELDS[k]?.(after[k])) return false
    }
    return true
  }
  for (const [key, job] of now) {
    if (key === own) {
      // The engine reports what it read plus its own change: only the action's fields may differ from known.
      const before = prev.get(key)
      const fields = action ? ACTION_FIELDS[action] : undefined
      const foreign =
        before && fields
          ? [...new Set([...Object.keys(before), ...Object.keys(job)])].some(k => !fields.includes(k) && canon(before[k]) !== canon(job[k]))
          : false
      if (canon(job) !== canon(returned) || foreign) tampered.push(key)
      continue
    }
    const before = prev.get(key)
    if (!before || (canon(before) !== canon(job) && !allowed(before, job))) tampered.push(key)
  }
  for (const key of prev.keys()) if (!now.has(key) && key !== own) tampered.push(key)
  if (own && !now.has(own)) tampered.push(own)
  const header = (r: Registry | null) => (r ? canon({ ...r, jobs: undefined }) : null)
  const headerOk = !known || !disk || header(known) === header(disk)
  for (const key of tampered) if (now.get(key)?.integrated === true && prev.get(key)?.integrated !== true) integrated.push(key)
  const ok = tampered.length === 0 && headerOk && !(known && !disk)
  if (ok) return { ok, restored: disk, tampered, integrated }
  // Known-good, with the mod's own returned job and the allowed correction changes applied.
  const base: Registry = known ? { ...known, jobs: [...known.jobs] } : { ...(disk ?? {}), jobs: [] }
  const jobs = base.jobs.map(j => {
    const key = registryKey(j)
    if (key === own) {
      const fields = action ? ACTION_FIELDS[action] : undefined
      if (!fields) return returned!
      const merged: Record<string, any> = { ...j }
      for (const f of fields) if (f in returned!) merged[f] = returned![f]
      else delete merged[f]
      return merged
    }
    const d = now.get(key)
    return d && allowed(j, d) ? d : j
  })
  if (own && !prev.has(own)) jobs.push(returned!)
  return { ok, restored: { ...base, jobs }, tampered: [...new Set(tampered)], integrated }
}

/** Lifecycle phase moves the engine itself makes (validate may send any later phase back to draft). */
const NEXT: Record<string, string[]> = {
  exploring: ['draft'],
  draft: ['approved', 'exploring'],
  approved: ['applying', 'draft'],
  applying: ['checked', 'draft'],
  checked: ['documented', 'applying', 'draft'],
  documented: ['archived', 'applying', 'checked', 'draft'],
}

export function legalTransition(from: string | null, to: string | null): boolean {
  if (from === to) return true
  if (!from || !to) return false
  // `approve` is valid from any phase; whether the person gave it is the provenance check's call.
  if (to === 'approved' && from !== 'archived') return true
  return NEXT[from]?.includes(to) ?? false
}

// --- SHA-256 and HMAC-SHA256, synchronous (no host round trip, deterministic timing) ---

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** SHA-256 of bytes. */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const bitLen = data.length * 8
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6)
  padded.set(data)
  padded[data.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, bitLen >>> 0)
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  const w = new Uint32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!, b = w[i - 2]!
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!]
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
      const t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K256[i]! + w[i]!) >>> 0
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0; h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0; h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0
  }
  const out = new Uint8Array(32)
  const ov = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i]!)
  return out
}

const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('')

/** SHA-256 of a string (UTF-8), hex. */
export function sha256Sync(text: string): string {
  return hex(sha256Bytes(new TextEncoder().encode(text)))
}

/** HMAC-SHA256 (RFC 2104), hex. */
export function hmac(key: Uint8Array, message: string): string {
  const block = 64
  const k = key.length > block ? sha256Bytes(key) : key
  const msg = new TextEncoder().encode(message)
  const inner = new Uint8Array(block + msg.length)
  const outer = new Uint8Array(block + 32)
  for (let i = 0; i < block; i++) {
    const kb = k[i] ?? 0
    inner[i] = kb ^ 0x36
    outer[i] = kb ^ 0x5c
  }
  inner.set(msg, block)
  outer.set(sha256Bytes(inner), block)
  return hex(sha256Bytes(outer))
}

/** What `runtime rebase` reports having done. */
export type RebaseReport = {
  contract_digest?: string
  changed?: boolean
  kept?: string[]
  reopened?: string[]
  retired?: string[]
  rebase?: Record<string, unknown>
}

const REOPEN_FIELDS = ['acceptance', 'review', 'superseded_review', 'updated_at']

/**
 * Verifies that a registry changed exactly as the engine's rebase reports: retired tasks' jobs moved
 * to `retired_jobs`, the latest attempt of each reopened task rejected (review recorded), every other
 * job untouched, and the header moved to the new contract with the reported rebase entry appended.
 */
export function verifyRebase(known: Registry | null, disk: Registry | null, report: RebaseReport): boolean {
  if (!known || !disk) return false
  if (report.changed === false) return canon(known) === canon(disk)
  const retired = new Set(report.retired ?? [])
  const reopened = new Set(report.reopened ?? [])
  const latestAttempt = new Map<string, number>()
  for (const j of known.jobs) if (!retired.has(j.task_id)) latestAttempt.set(j.task_id, Math.max(latestAttempt.get(j.task_id) ?? 0, j.attempt))
  const expectJobs = known.jobs.filter(j => !retired.has(j.task_id))
  const now = new Map(disk.jobs.map(j => [registryKey(j), j]))
  if (now.size !== expectJobs.length) return false
  for (const before of expectJobs) {
    const after = now.get(registryKey(before))
    if (!after) return false
    const mayChange = reopened.has(before.task_id) && latestAttempt.get(before.task_id) === before.attempt
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (canon(before[k]) === canon(after[k])) continue
      if (!mayChange || !REOPEN_FIELDS.includes(k)) return false
    }
    if (mayChange && after.acceptance !== 'rejected') return false
  }
  // Retired jobs: the known ones, each with its retirement stamp (and its worktree removed).
  const retiredBefore = ((known as any).retired_jobs ?? []) as Record<string, any>[]
  const retiredNow = ((disk as any).retired_jobs ?? []) as Record<string, any>[]
  const moved = known.jobs.filter(j => retired.has(j.task_id))
  if (retiredNow.length !== retiredBefore.length + moved.length) return false
  for (let i = 0; i < retiredBefore.length; i++) if (canon(retiredBefore[i]) !== canon(retiredNow[i])) return false
  for (const [i, job] of moved.entries()) {
    const after = retiredNow[retiredBefore.length + i]!
    for (const k of new Set([...Object.keys(job), ...Object.keys(after)]))
      if (canon(job[k]) !== canon(after[k]) && !['retired_reason', 'retired_at', 'worktree_removed'].includes(k)) return false
  }
  // Header: new digest, the reported rebase entry appended, nothing else changed.
  const rebasesBefore = ((known as any).rebases ?? []) as unknown[]
  const rebasesNow = ((disk as any).rebases ?? []) as unknown[]
  if (disk.contract_digest !== report.contract_digest) return false
  if (rebasesNow.length !== rebasesBefore.length + 1 || canon(rebasesNow.at(-1)) !== canon(report.rebase)) return false
  const header = (r: Registry) => canon({ ...r, jobs: undefined, retired_jobs: undefined, rebases: undefined, contract_digest: undefined })
  return header(known) === header(disk)
}
