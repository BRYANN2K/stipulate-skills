// A small painter for the tests: lays a drawn tree out as terminal text, as Ink's flexbox would
// for the props the interface uses (rows, columns, fixed widths, padding, round borders, gaps,
// justify/align, wrap), and records every place where a text had to wrap or be cut. It is an
// approximation of the terminal's paint, enough to check widths (AC-30) and to show the result.
import { cellsText } from '../../hooks/ui/motion.ts'

type El = { type: string; props?: Record<string, any>; children?: (El | string)[] }
export type Issue = { kind: 'wrapped' | 'split' | 'cut' | 'overflow'; key: string; text: string }
export type Painted = { lines: string[]; issues: Issue[] }

const BORDER: Record<string, string[]> = { round: ['╭', '─', '╮', '│', '╰', '╯'], single: ['┌', '─', '┐', '│', '└', '┘'] }

const textOf = (n: El | string): string => (typeof n === 'string' ? n : (n.children ?? []).map(textOf).join(''))

function labelOf(n: El): string {
  const label = String(n.props?.label ?? textOf(n))
  return n.props?.plain ? label : `[ ${label} ]`
}

const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - [...s].length))
const len = (s: string) => [...s].length

function frame(n: El) {
  const p = n.props ?? {}
  const b = p.borderStyle && BORDER[p.borderStyle] ? 1 : 0
  const px = p.paddingX ?? p.padding ?? 0
  const left = (p.paddingLeft ?? px) + b
  const right = (p.paddingRight ?? px) + b
  return { b, left, right }
}

/** Width the element takes on one line when nothing constrains it. */
function natural(n: El | string): number {
  if (typeof n === 'string') return len(n)
  const p = n.props ?? {}
  if (p.display === 'none') return 0
  if (n.type === 'Text') return Math.max(0, ...textOf(n).split('\n').map(len))
  if (n.type === 'Button') return len(labelOf(n))
  if (n.type === 'Svg') return 12
  if (n.type === 'Raster') return Number(p.columns ?? 0)
  if (n.type === 'Input') return 30
  if (n.type === 'Select') return 20
  if (typeof p.width === 'number') return p.width
  const { left, right } = frame(n)
  const kids = (n.children ?? []).filter(k => typeof k === 'string' || k.props?.display !== 'none')
  const gap = p.columnGap ?? p.gap ?? 0
  const inner =
    p.flexDirection === 'row'
      ? kids.reduce((s: number, k) => s + natural(k), 0) + gap * Math.max(0, kids.length - 1)
      : Math.max(0, ...kids.map(natural))
  return inner + left + right
}

export function paint(root: El, width: number): Painted {
  const issues: Issue[] = []
  const lay = (n: El | string, avail: number, key: string): string[] => {
    if (typeof n === 'string') return layText({ type: 'Text', children: [n] }, avail, key)
    const p = n.props ?? {}
    const k = typeof p.key === 'string' ? p.key : key
    if (p.display === 'none') return []
    if (n.type === 'Text') return layText(n, avail, k)
    if (n.type === 'Button') {
      const s = labelOf(n)
      if (len(s) > avail) issues.push({ kind: 'overflow', key: k, text: s })
      return [s]
    }
    if (n.type === 'Raster') return [cellsText(String(p.cells ?? '')).slice(0, avail)]
    if (n.type === 'Svg') return [`[svg ${p.width ?? '?'}×${p.height ?? '?'}: ${String(p.alt).slice(0, Math.max(0, avail - 16))}]`.slice(0, avail)]
    if (n.type === 'Input') return [pad(`[${p.label ?? ''}: ${p.placeholder ?? ''}]`, 0).slice(0, avail)]
    if (n.type === 'Select') return [`[${(p.options ?? []).find((o: any) => o.value === p.value)?.label ?? ''} ▾]`.slice(0, avail)]
    return layBox(n, avail, k)
  }

  const layText = (n: El, avail: number, key: string): string[] => {
    const text = textOf(n)
    const mode = n.props?.wrap ?? 'wrap'
    const out: string[] = []
    for (const raw of text.split('\n')) {
      if (len(raw) <= avail) {
        out.push(raw)
        continue
      }
      if (String(mode).startsWith('truncate')) {
        issues.push({ kind: 'cut', key, text: raw })
        out.push([...raw].slice(0, Math.max(0, avail - 1)).join('') + '…')
        continue
      }
      issues.push({ kind: 'wrapped', key, text: raw })
      let lineText = ''
      for (const word of raw.split(/(?<= )/)) {
        if (len(lineText + word.trimEnd()) <= avail) lineText += word
        else if (len(word.trimEnd()) > avail) {
          issues.push({ kind: 'split', key, text: word })
          let rest = lineText + word
          while (len(rest) > avail) {
            out.push([...rest].slice(0, avail).join(''))
            rest = [...rest].slice(avail).join('')
          }
          lineText = rest
        } else {
          out.push(lineText.trimEnd())
          lineText = word
        }
      }
      out.push(lineText.trimEnd())
    }
    return out
  }

  const layBox = (n: El, avail: number, key: string): string[] => {
    const p = n.props ?? {}
    const outer = typeof p.width === 'number' ? p.width : avail
    if (typeof p.width === 'number' && p.width > avail) issues.push({ kind: 'overflow', key, text: `width ${p.width} > ${avail}` })
    const { b, left, right } = frame(n)
    const inner = Math.max(1, outer - left - right)
    const kids = (n.children ?? []).filter(k => typeof k === 'string' || k.props?.display !== 'none')
    let body: string[] = []
    if (p.flexDirection === 'row') body = layRow(kids, inner, p, key)
    else {
      const gap = p.rowGap ?? p.gap ?? 0
      kids.forEach((k, i) => {
        const mt = typeof k === 'string' ? 0 : (k.props?.marginTop ?? 0)
        if (i && gap) body.push(...Array(gap).fill(''))
        body.push(...Array(mt).fill(''))
        body.push(...lay(k, inner, key))
      })
    }
    const padL = ' '.repeat(left - b)
    const padR = right - b
    let lines = body.map(l => padL + pad(l, inner) + ' '.repeat(padR))
    if (b) {
      const [tl, h, tr, v, bl, br] = BORDER[p.borderStyle]! as [string, string, string, string, string, string]
      const w = inner + left + right - 2
      lines = [tl + h.repeat(w) + tr, ...lines.map(l => v + l + v), bl + h.repeat(w) + br]
    }
    // A column Box with no width in a row takes its content's width; trailing blanks are dropped.
    return lines.map(l => (typeof p.width === 'number' || b ? l : l.replace(/ +$/, '')))
  }

  const layRow = (kids: (El | string)[], avail: number, p: Record<string, any>, key: string): string[] => {
    const gap = p.columnGap ?? p.gap ?? 0
    if (p.flexWrap === 'wrap') {
      // Greedy lines of whole items.
      const rows: (El | string)[][] = [[]]
      let used = 0
      for (const k of kids) {
        const w = natural(k)
        const row = rows[rows.length - 1]!
        if (row.length && used + gap + w > avail) {
          rows.push([k])
          used = w
        } else {
          row.push(k)
          used += (row.length > 1 ? gap : 0) + w
        }
      }
      return rows.flatMap(r => layRow(r, avail, { ...p, flexWrap: 'nowrap' }, key))
    }
    const widths = kids.map(k => Math.min(natural(k), avail))
    const fixed = kids.map(k => typeof k !== 'string' && (k.props?.flexShrink === 0 || typeof k.props?.width === 'number' || k.type === 'Button'))
    let total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, kids.length - 1)
    // Shrink what may shrink, widest first.
    while (total > avail) {
      let at = -1
      widths.forEach((w, i) => {
        if (!fixed[i] && w > 1 && (at < 0 || w > widths[at]!)) at = i
      })
      if (at < 0) {
        issues.push({ kind: 'overflow', key, text: `row of ${total} in ${avail}` })
        break
      }
      const cut = Math.min(widths[at]! - 1, total - avail)
      widths[at]! -= cut
      total -= cut
    }
    let free = avail - total
    const grow = kids.map(k => (typeof k === 'string' ? 0 : (k.props?.flexGrow ?? 0)))
    const growSum = grow.reduce((s, g) => s + g, 0)
    if (growSum && free > 0) {
      kids.forEach((_, i) => (widths[i]! += Math.floor((free * grow[i]!) / growSum)))
      free = 0
    }
    const blocks = kids.map((k, i) => lay(k, widths[i]!, key))
    const height = Math.max(0, ...blocks.map(b => b.length))
    const spaces = kids.map((_, i) => (i ? gap : 0))
    if (p.justifyContent === 'space-between' && kids.length > 1 && free > 0) spaces[kids.length - 1]! += free
    else if (p.justifyContent === 'flex-end' && free > 0) spaces[0]! += free
    const out: string[] = []
    for (let y = 0; y < height; y++) {
      let s = ''
      blocks.forEach((b, i) => {
        const k = kids[i]
        const center = typeof k !== 'string' && k?.props?.alignSelf === 'center'
        const off = center ? Math.floor((height - b.length) / 2) : 0
        s += ' '.repeat(spaces[i]!) + pad(b[y - off] ?? '', widths[i]!)
      })
      out.push(s)
    }
    return out
  }

  const lines = lay(root, width, 'root').map(l => l.replace(/ +$/, ''))
  return { lines, issues }
}

/** Issues on the keyed rows AC-30 names: header, band, task and helper rows. */
export const rowIssues = (painted: Painted) =>
  painted.issues.filter(i => /^(head|title|tabs|badge-line|stip-band|band-|task-|row-|line-|meta-|rb-|name-|mline-|crit-foot|crit-line|ac-|g-|strip-|ruler-|mark-|label-|trail-|stages|stage-|who-hd|waiting-hd|review-hd|docs-hd|graph-hd|criteria-hd|helpers-hd|archived-line|mu-|handoff)/.test(i.key))
