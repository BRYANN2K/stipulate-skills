// Acceptance criteria and evidence of a change, and short display labels (pure).

export type ParsedCriterion = { id: string; text: string }
export type CriterionStatus = 'passed' | 'failed' | 'unverified' | 'pending'

const START = /^- (AC-[1-9][0-9]*):\s*(.*)$/

/**
 * Every `- AC-n: ...` item of spec.md with its FULL text: wrapped continuation lines and nested
 * lists (e.g. "The README documents:" followed by indented items) belong to the criterion until the
 * next criterion, a heading, or a blank line followed by unindented prose.
 */
export function parseCriteria(spec: string): ParsedCriterion[] {
  const lines = spec.replace(/\r\n?/g, '\n').split('\n')
  const out: ParsedCriterion[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = START.exec(lines[i]!)
    if (!m) continue
    const body = [m[2]!.trimEnd()]
    let inList = false
    let j = i + 1
    for (; j < lines.length; j++) {
      const line = lines[j]!
      if (START.test(line) || /^#{1,6}\s/.test(line)) break
      if (!line.trim()) {
        // A blank line ends the item unless the next non-blank line is still part of it (indented).
        let k = j + 1
        while (k < lines.length && !lines[k]!.trim()) k++
        if (k >= lines.length || !/^\s+\S/.test(lines[k]!)) break
        body.push('')
        continue
      }
      // An unindented list right after "...:" (or after such an item) belongs to the criterion.
      const listItem = /^(?:[-*+]|\d+[.)])\s+\S/.test(line)
      const prev = body[body.length - 1] ?? ''
      if (!/^\s/.test(line)) {
        if (listItem && (/:\s*$/.test(prev) || inList)) {
          inList = true
          body.push(line.trimEnd())
          continue
        }
        break
      }
      body.push(line.replace(/^\s{2}/, '').trimEnd())
    }
    out.push({ id: m[1]!, text: body.join('\n').trim() })
    i = j - 1
  }
  return out
}

/** evidence.md lines written by `check`: `- AC-n: <status> — <evidence>`. */
export function parseEvidence(md: string): Record<string, { status: CriterionStatus; evidence: string }> {
  const out: Record<string, { status: CriterionStatus; evidence: string }> = {}
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^- (AC-[1-9][0-9]*):\s*([a-z_-]+)\s*(?:—|--|-)\s*(.*)$/.exec(line)
    if (!m) continue
    const raw = m[2]!.toLowerCase()
    const status: CriterionStatus = raw === 'passed' || raw === 'pass' ? 'passed' : raw === 'failed' || raw === 'fail' ? 'failed' : 'unverified'
    out[m[1]!] = { status, evidence: m[3]!.trim() }
  }
  return out
}

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'that', 'this', 'is', 'are', 'be', 'it', 'its', 'when', 'each', 'every'])

/** A label from the first meaningful words (≤32 characters), shown until the model's is ready. */
export function fallbackLabel(text: string, max = 32): string {
  const words = text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_#>[\]()]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
  const meaningful = words.filter((w, i) => i === 0 || !STOP.has(w.toLowerCase()))
  let out = ''
  for (const w of meaningful) {
    const next = out ? `${out} ${w}` : w
    if (next.length > max) break
    out = next
    if (out.split(' ').length >= 5) break
  }
  if (!out) out = (words[0] ?? text).slice(0, max)
  return out.charAt(0).toUpperCase() + out.slice(1)
}

/** Validates a model's label: 2-5 words, ≤40 characters, no trailing punctuation; null when unusable. */
export function cleanLabel(raw: string): string | null {
  let s = raw.trim().split('\n')[0]!.trim()
  s = s.replace(/^(label|title)\s*:\s*/i, '').replace(/^["'`“”‘’*]+|["'`“”‘’*]+$/g, '').trim()
  s = s.replace(/[.,;:!?…]+$/u, '').trim()
  const words = s.split(/\s+/).filter(Boolean)
  if (!s || s.length > 40 || words.length < 2 || words.length > 5) return null
  return s
}

export const LABEL_PROMPT = (kind: 'requirement' | 'question', text: string) =>
  `Write a short label for this ${kind}: 2 to 5 words that describe the ${kind}, no punctuation at the end, ` +
  `no quotes, no explanation. Reply with the label only.\n\n${text.slice(0, 4000)}`
