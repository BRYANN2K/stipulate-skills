// The Ledger's task graph (AC-27), pure: box-drawing text for the terminal, an SVG document for
// the desktop, and an indented dependency list when the box drawing cannot fit the pane.
// Columns come from the core's `graph.depth`; within a column, tasks are ordered by the mean row of
// their dependencies (plan order breaking ties) so edges cross as little as they can.
import type { StipGraph, StipGraphNode, StipNodeState } from '../../types'

/** A run of characters drawn in one style. */
export type GraphSeg = { text: string; color?: string; dim?: boolean; bold?: boolean }
export type GraphLine = GraphSeg[]

/** Theme colors (terminal) per node state; `pending`, `ready` and `blocked` stay neutral. */
export const NODE_COLOR: Record<StipNodeState, { color?: string; dim?: boolean }> = {
  integrated: { color: 'success' },
  running: { color: 'suggestion' },
  correction: { color: 'warning' },
  failed: { color: 'error' },
  pending: {},
  ready: {},
  blocked: { dim: true },
}

/** One mark per state for the dependency list. */
export const NODE_MARK: Record<StipNodeState, string> = {
  integrated: '✓',
  running: '▶',
  correction: '↻',
  failed: '✗',
  pending: '◆',
  ready: '○',
  blocked: '·',
}

/** Legend entries: the three states the preview names, plus failed when a node is failed. */
export function legendOf(graph: StipGraph): { label: string; state: StipNodeState }[] {
  const out: { label: string; state: StipNodeState }[] = [
    { label: 'integrated', state: 'integrated' },
    { label: 'running', state: 'running' },
    { label: 'correction', state: 'correction' },
  ]
  if (graph.nodes.some(n => n.state === 'failed')) out.push({ label: 'failed', state: 'failed' })
  return out
}

// --- Shared column layout ---

type Slot = { id: string; node: StipGraphNode | null; edge?: { from: string; to: string } }

/**
 * Columns of slots by depth: real nodes, and one pass-through slot per column an edge skips.
 * Ordered by the barycenter of each slot's predecessors in the previous column.
 */
function columnsOf(graph: StipGraph): { columns: Slot[][]; preds: Map<string, string[]>; chains: { from: string; to: string; slots: string[] }[] } {
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]))
  const maxDepth = Math.max(0, ...graph.nodes.map(n => n.depth))
  const columns: Slot[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const n of graph.nodes) columns[n.depth]!.push({ id: n.id, node: n })
  const preds = new Map<string, string[]>()
  const chains: { from: string; to: string; slots: string[] }[] = []
  for (const e of graph.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b || b.depth <= a.depth) continue
    const slots = [a.id]
    for (let d = a.depth + 1; d < b.depth; d++) {
      const id = `~${e.from}>${e.to}@${d}`
      columns[d]!.push({ id, node: null, edge: { from: e.from, to: e.to } })
      slots.push(id)
    }
    slots.push(b.id)
    for (let i = 1; i < slots.length; i++) preds.set(slots[i]!, [...(preds.get(slots[i]!) ?? []), slots[i - 1]!])
    chains.push({ from: e.from, to: e.to, slots })
  }
  const rank = (s: Slot) => order.get(s.node?.id ?? s.edge!.from) ?? 0
  columns[0]!.sort((x, y) => rank(x) - rank(y))
  for (let d = 1; d < columns.length; d++) {
    const prev = new Map(columns[d - 1]!.map((s, i) => [s.id, i]))
    const center = (s: Slot) => {
      const p = (preds.get(s.id) ?? []).map(id => prev.get(id)).filter((x): x is number => x !== undefined)
      return p.length ? p.reduce((a, b) => a + b, 0) / p.length : Number.POSITIVE_INFINITY
    }
    columns[d]!.sort((x, y) => center(x) - center(y) || rank(x) - rank(y))
  }
  return { columns, preds, chains }
}

const EDGE_RANK = { dim: 0, done: 1, correction: 2, running: 3 } as const
type EdgeKind = keyof typeof EDGE_RANK

function edgeKind(graph: StipGraph, from: string, to: string): EdgeKind {
  const target = graph.nodes.find(n => n.id === to)?.state
  if (target === 'running') return 'running'
  if (target === 'correction') return 'correction'
  return graph.edges.find(e => e.from === from && e.to === to)?.done ? 'done' : 'dim'
}

const EDGE_STYLE: Record<EdgeKind, { color?: string; dim?: boolean }> = {
  dim: { dim: true },
  done: { color: 'success' },
  correction: { color: 'warning' },
  running: { color: 'suggestion' },
}

// --- Terminal: box drawing on a character canvas ---

const U = 1
const D = 2
const L = 4
const R = 8
const JOIN: Record<number, string> = {
  [L]: '─', [R]: '─', [L | R]: '─', [U]: '│', [D]: '│', [U | D]: '│',
  [R | D]: '╭', [L | D]: '╮', [R | U]: '╰', [L | U]: '╯',
  [L | R | D]: '┬', [L | R | U]: '┴', [U | D | R]: '├', [U | D | L]: '┤', [U | D | L | R]: '┼',
}

type Cell = { ch: string; flags: number; kind: EdgeKind | null; dashed: boolean; style: { color?: string; dim?: boolean; bold?: boolean } | null }

/** Most slots a column may hold before the box drawing gets too tall for a pane. */
export const MAX_COLUMN_SLOTS = 6

/**
 * The graph as box-drawing lines no wider than `width`, or null when it cannot fit (too wide,
 * or a column too tall): the caller then draws `dependencyList`.
 */
export function graphText(graph: StipGraph, width: number, lit: ReadonlySet<string> = new Set()): GraphLine[] | null {
  if (!graph.nodes.length) return []
  const { columns, preds } = columnsOf(graph)
  if (columns.some(c => c.length > MAX_COLUMN_SLOTS)) return null
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const colW = columns.map(c => Math.max(5, ...c.filter(s => s.node).map(s => s.id.length + 4)))
  // Rows: each slot is three rows tall with one blank row between slots; columns centered.
  const height = Math.max(...columns.map(c => 4 * c.length - 1))
  const row = new Map<string, number>()
  columns.forEach(c => {
    const top = Math.floor((height - (4 * c.length - 1)) / 2)
    c.forEach((s, i) => row.set(s.id, top + 4 * i + 1))
  })
  // Gaps: per target in the next column, a vertical bus unless its one source sits on its row.
  const gaps = columns.slice(1).map(c => {
    const buses: string[] = []
    for (const s of c) {
      const p = preds.get(s.id) ?? []
      if (p.length > 1 || (p.length === 1 && row.get(p[0]!) !== row.get(s.id))) buses.push(s.id)
    }
    return { buses, width: 3 + buses.length }
  })
  const x: number[] = []
  let at = 0
  columns.forEach((_, d) => {
    x.push(at)
    at += colW[d]! + (d < gaps.length ? gaps[d]!.width : 0)
  })
  const total = at
  if (total > width) return null

  const grid: Cell[][] = Array.from({ length: height }, () => Array.from({ length: total }, () => ({ ch: ' ', flags: 0, kind: null, dashed: false, style: null })))
  const put = (y: number, xx: number, ch: string, style: Cell['style']) => {
    const cell = grid[y]?.[xx]
    if (cell) Object.assign(cell, { ch, style })
  }
  const link = (y: number, xx: number, flags: number, kind: EdgeKind, dashed = false) => {
    const cell = grid[y]?.[xx]
    if (!cell) return
    cell.flags |= flags
    if (cell.kind === null || EDGE_RANK[kind] > EDGE_RANK[cell.kind]) cell.kind = kind
    if (dashed) cell.dashed = true
  }
  const hline = (y: number, x1: number, x2: number, kind: EdgeKind, dashed = false) => {
    for (let xx = Math.min(x1, x2); xx <= Math.max(x1, x2); xx++)
      link(y, xx, (xx > Math.min(x1, x2) ? L : 0) | (xx < Math.max(x1, x2) ? R : 0) | (x1 === x2 ? L | R : 0), kind, dashed)
  }
  const vline = (xx: number, y1: number, y2: number, kind: EdgeKind) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) link(y, xx, (y > Math.min(y1, y2) ? U : 0) | (y < Math.max(y1, y2) ? D : 0), kind)
  }

  // Boxes, and pass-through lines for the slots an edge skips.
  columns.forEach((c, d) => {
    for (const s of c) {
      const y = row.get(s.id)!
      const w = colW[d]!
      if (!s.node) {
        hline(y, x[d]!, x[d]! + w - 1, edgeKind(graph, s.edge!.from, s.edge!.to))
        continue
      }
      // A task that just became ready lights up (AC-36): bold, in the running color.
      const look = lit.has(s.node.id) ? { color: 'suggestion' } : NODE_COLOR[s.node.state]
      const style = { ...(look.color ? { color: look.color } : {}), ...('dim' in look && look.dim ? { dim: true } : {}), ...(lit.has(s.node.id) ? { bold: true } : {}) }
      const inner = w - 2
      const label = s.id
      const left = Math.floor((inner - label.length) / 2)
      const text = ' '.repeat(left) + label + ' '.repeat(inner - left - label.length)
      put(y - 1, x[d]!, '╭', style)
      put(y + 1, x[d]!, '╰', style)
      put(y - 1, x[d]! + w - 1, '╮', style)
      put(y + 1, x[d]! + w - 1, '╯', style)
      for (let i = 1; i < w - 1; i++) {
        put(y - 1, x[d]! + i, '─', style)
        put(y + 1, x[d]! + i, '─', style)
        put(y, x[d]! + i, text[i - 1]!, { ...style, bold: s.node.state === 'running' || lit.has(s.node.id) })
      }
      put(y, x[d]!, '│', style)
      put(y, x[d]! + w - 1, '│', style)
    }
  })

  // Edges, gap by gap: source stub, bus, then into the target (an arrow for a task).
  columns.slice(1).forEach((c, i) => {
    const d = i + 1
    const gap = gaps[i]!
    const x0 = x[i]! + colW[i]!
    const into = x[d]! - 1
    for (const s of c) {
      const sources = preds.get(s.id) ?? []
      if (!sources.length) continue
      const target = s.node ? s.id : s.edge!.to
      const yt = row.get(s.id)!
      const bus = gap.buses.indexOf(s.id)
      for (const src of sources) {
        const from = byId.get(src)?.id ?? src.slice(1).split('>')[0]!
        const kind = edgeKind(graph, from, target)
        const ys = row.get(src)!
        const dashed = kind === 'running'
        if (bus < 0) {
          hline(ys, x0, into, kind, dashed)
          continue
        }
        const xb = x0 + 1 + bus
        hline(ys, x0, xb, kind)
        vline(xb, ys, yt, kind)
        hline(yt, xb, into, kind, dashed)
      }
      if (s.node) put(yt, into, '▶', EDGE_STYLE[edgeKind(graph, sources.map(p => byId.get(p)?.id ?? p.slice(1).split('>')[0]!)[0]!, target)])
    }
  })

  // Flags to glyphs; then runs of one style per line.
  const lines: GraphLine[] = []
  for (const cells of grid) {
    const segs: GraphLine = []
    for (const cell of cells) {
      let ch = cell.ch
      let style = cell.style
      if (cell.flags && style === null) {
        ch = JOIN[cell.flags] ?? '┼'
        if (cell.dashed && ch === '─') ch = '┄'
        style = EDGE_STYLE[cell.kind ?? 'dim']
      }
      const seg: GraphSeg = { text: ch, ...(style ?? {}) }
      const last = segs[segs.length - 1]
      if (last && last.color === seg.color && last.dim === seg.dim && last.bold === seg.bold) last.text += ch
      else segs.push(seg)
    }
    // Trailing blanks carry nothing.
    const tail = segs[segs.length - 1]
    if (tail && !tail.color && !tail.dim && !tail.bold) tail.text = tail.text.replace(/ +$/, '')
    lines.push(segs.filter(s => s.text.length))
  }
  return lines
}

/** Whole names that fit `room` cells joined by `, `, with `+N` for the rest. */
export function namesFit(names: string[], room: number, sep = ', '): string {
  let out = ''
  for (let i = 0; i < names.length; i++) {
    const rest = names.length - i - 1
    const next = (out ? out + sep : '') + names[i]
    const suffix = rest ? ` +${rest}` : ''
    if (next.length + suffix.length > room) return out ? `${out} +${names.length - i}` : `+${names.length}`
    out = next
  }
  return out
}

/**
 * The fallback: one line per task in depth order, indented by depth (capped), marked by state,
 * with its dependencies named when it has several or they are not the line above.
 */
export function dependencyList(graph: StipGraph, width: number): GraphLine[] {
  const nodes = [...graph.nodes].sort((a, b) => a.depth - b.depth || graph.nodes.indexOf(a) - graph.nodes.indexOf(b))
  const indentCap = Math.max(0, Math.min(4, Math.floor((width - 16) / 4)))
  return nodes.map((n, i) => {
    const look = NODE_COLOR[n.state]
    const style = { ...(look.color ? { color: look.color } : {}), ...(look.dim ? { dim: true } : {}) }
    const indent = '  '.repeat(Math.min(n.depth, indentCap))
    const lead = `${indent}${n.depth ? '└▶ ' : ''}`
    const head = `${NODE_MARK[n.state]} ${n.id}`
    const prev = nodes[i - 1]
    const deps = n.dependsOn.filter(d => graph.nodes.some(x => x.id === d))
    const named = deps.length > 1 || (deps.length === 1 && prev?.id !== deps[0])
    const room = width - lead.length - head.length - 3
    // Named while at least one whole name fits (a bare "+N" says nothing).
    const names = named && room >= 4 ? namesFit(deps, room) : ''
    const tail = names && !names.startsWith('+') ? ` ← ${names}` : ''
    return [
      ...(lead ? [{ text: lead, dim: true }] : []),
      { text: head, ...style, bold: n.state === 'running' },
      ...(tail ? [{ text: tail, dim: true }] : []),
    ]
  })
}

/** Plain text of graph lines (tests, logs). */
export const graphPlain = (lines: GraphLine[]) => lines.map(l => l.map(s => s.text).join('')).join('\n')

// --- Desktop: SVG ---

const SVG_LOOK: Record<StipNodeState, { fill: string; stroke: string; text: string; dash?: string }> = {
  integrated: { fill: '#1f2b20', stroke: '#6fbf73', text: '#cfe9d0' },
  running: { fill: '#1d2433', stroke: '#8fb3ff', text: '#dbe5ff' },
  correction: { fill: '#2e2817', stroke: '#e3b55b', text: '#f3e2bd' },
  failed: { fill: '#2e1d1d', stroke: '#e06c6c', text: '#f4cccc' },
  pending: { fill: '#24252a', stroke: '#9a9ca5', text: '#e8e6e1' },
  ready: { fill: '#1e1f23', stroke: '#8b8d96', text: '#e8e6e1' },
  blocked: { fill: '#1e1f23', stroke: '#4a4b52', text: '#8b8d96', dash: '3 3' },
}
const SVG_EDGE: Record<EdgeKind, string> = { dim: '#6b6d75', done: '#6fbf73', correction: '#e3b55b', running: '#8fb3ff' }
export const SVG_LEGEND: Record<StipNodeState, string> = Object.fromEntries(Object.entries(SVG_LOOK).map(([k, v]) => [k, v.stroke])) as Record<StipNodeState, string>

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The graph as an SVG document: rounded nodes in depth columns, curved edges (dashed into a
 * running task). Each node carries its own fill, so it reads on a light or a dark page.
 */
export function graphSvg(graph: StipGraph, lit: ReadonlySet<string> = new Set()): { source: string; width: number; height: number } {
  const { columns } = columnsOf(graph)
  const real = columns.map(c => c.filter(s => s.node))
  const CH = 6.7
  const H = 24
  const PITCH = 36
  const GAP = 34
  const PAD = 6
  const colW = real.map(c => Math.max(40, ...c.map(s => Math.ceil(s.id.length * CH) + 18)))
  const tallest = Math.max(1, ...real.map(c => c.length))
  const height = PAD * 2 + H + (tallest - 1) * PITCH
  const pos = new Map<string, { x: number; y: number; w: number }>()
  let x = PAD
  real.forEach((c, d) => {
    const top = PAD + ((tallest - c.length) * PITCH) / 2
    c.forEach((s, i) => pos.set(s.id, { x, y: top + i * PITCH, w: colW[d]! }))
    x += colW[d]! + GAP
  })
  const width = Math.max(PAD * 2, x - GAP + PAD)
  const edges = graph.edges
    .filter(e => pos.has(e.from) && pos.has(e.to))
    .map(e => {
      const a = pos.get(e.from)!
      const b = pos.get(e.to)!
      const kind = edgeKind(graph, e.from, e.to)
      const x1 = a.x + a.w
      const y1 = a.y + H / 2
      const x2 = b.x
      const y2 = b.y + H / 2
      const bend = Math.max(12, (x2 - x1) / 2)
      const dash = kind === 'running' ? ' stroke-dasharray="4 4"' : ''
      return `<path d="M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}" stroke="${SVG_EDGE[kind]}"${dash}/>`
    })
  const nodes = graph.nodes
    .filter(n => pos.has(n.id))
    .map(n => {
      const p = pos.get(n.id)!
      const look = lit.has(n.id) ? { ...SVG_LOOK.running, dash: undefined } : SVG_LOOK[n.state]
      const dash = look.dash ? ` stroke-dasharray="${look.dash}"` : ''
      const stroke = lit.has(n.id) ? ' stroke-width="2.6"' : ''
      return (
        `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${H}" rx="6" fill="${look.fill}" stroke="${look.stroke}"${dash}${stroke}/>` +
        `<text x="${p.x + p.w / 2}" y="${p.y + 16}" text-anchor="middle" fill="${look.text}"${n.state === 'running' ? ' font-weight="700"' : ''}>${esc(n.id)}</text>`
      )
    })
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<g fill="none" stroke-width="1.6">${edges.join('')}</g>` +
    `<g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11">${nodes.join('')}</g></svg>`
  return { source, width, height }
}

/** What the SVG shows, for a reader that cannot see it. */
export function graphAlt(graph: StipGraph): string {
  if (!graph.nodes.length) return 'No tasks in the plan.'
  return graph.nodes
    .map(n => {
      const deps = n.dependsOn.filter(d => graph.nodes.some(x => x.id === d))
      return `${n.id} (${n.state})${deps.length ? ` after ${deps.join(', ')}` : ''}`
    })
    .join('; ')
}
