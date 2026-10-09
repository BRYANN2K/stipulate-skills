// The Ledger's pane states (AC-35): pure readers of the workflow files the snapshot shows in each
// state (Setup, New change, Explore, Validate, Check, Archive). No `$` here: index.ts reads the files.
import type {
  StipAcceptedSpec,
  StipArchiveSummary,
  StipContractDiff,
  StipDecision,
  StipExplore,
  StipFinding,
  StipFollowUp,
  StipMotion,
  StipProof,
  StipSetup,
  StipStep,
} from '../../types'
import { fallbackLabel, parseCriteria, parseEvidence } from './criteria.ts'

export const MOTIONS: readonly StipMotion[] = ['auto', 'calm', 'off']
export const STEP_LIMIT = 6

// --- Markdown sections ---

type Section = { title: string; level: number; lines: string[] }

/** The `##`+ sections of a markdown document, each with its lines up to the next heading of any level. */
export function sections(md: string): Section[] {
  const out: Section[] = []
  let cur: Section | null = null
  let fence = false
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const h = fence ? null : /^(#{2,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (h) {
      cur = { title: h[2]!.trim(), level: h[1]!.length, lines: [] }
      out.push(cur)
    } else if (cur) cur.lines.push(line)
  }
  return out
}

/** A section's lines with its subsections' (deeper headings) folded in, headings kept as `#` lines. */
function withSubsections(all: Section[], i: number): string[] {
  const head = all[i]!
  const lines = [...head.lines]
  for (let j = i + 1; j < all.length && all[j]!.level > head.level; j++) lines.push(`${'#'.repeat(all[j]!.level)} ${all[j]!.title}`, ...all[j]!.lines)
  return lines
}

/** Plain text from inline markdown: code ticks, emphasis, link and image syntax removed, whitespace collapsed. */
export function plain(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<(https?:[^>\s]+)>/g, '$1')
    .replace(/(`+)\s?([^`]*?)\s?\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Top-level list items (`-`, `*`, `+`, `1.`, `1)`) with their indented continuation lines. */
export function listItems(lines: string[]): { marker: string; text: string; body: string[] }[] {
  const out: { marker: string; text: string; body: string[] }[] = []
  let cur: { marker: string; text: string; body: string[] } | null = null
  for (const line of lines) {
    const m = /^(?: {0,1})([-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (m) {
      cur = { marker: m[1]!, text: m[2]!.trim(), body: [] }
      out.push(cur)
    } else if (cur && /^\s+\S/.test(line)) cur.body.push(line.trim())
    else if (!line.trim()) continue
    else cur = null
  }
  return out
}

// --- Explore: proposal.md ---

const CLASSES: Record<string, StipFinding['source']> = {
  established: 'established',
  inferred: 'inferred',
  incomplete: 'incomplete',
  missing: 'missing',
}
const KIND: Record<StipFinding['source'], StipFinding['kind']> = { established: 'Confirmed', inferred: 'Likely', incomplete: 'Open', missing: 'Open' }

const cap = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)

/**
 * The "Problem" section as plain text: its first paragraph, or, when it opens with a list (or a
 * lead line then a list), the list's items (at most 6). `text` is the paragraph, the lead line, or
 * the items joined with "; ". Markdown (code ticks, emphasis, links, list markers) is stripped.
 */
export function problemSection(md: string): { text: string; items: string[] } | null {
  const s = sections(md).find(x => /^problem\b/i.test(x.title))
  if (!s) return null
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of s.lines) {
    if (!line.trim()) {
      if (cur.length) blocks.push(cur), (cur = [])
      continue
    }
    cur.push(line)
  }
  if (cur.length) blocks.push(cur)
  const first = blocks[0]
  if (!first) return null
  const isItem = (l: string) => /^\s{0,3}(?:[-*+]|\d+[.)])\s+/.test(l)
  const at = first.findIndex(isItem)
  // A lead line ending with ":" may stand alone, its list in the next block.
  const listLines = at >= 0 ? first.slice(at) : /:\s*$/.test(first.at(-1) ?? '') && blocks[1]?.some(isItem) ? blocks[1]! : []
  const lead = plain((at >= 0 ? first.slice(0, at) : first).join(' '))
  // Items may be indented as a block: strip the item lines' common indent from every line.
  const indent = Math.min(3, ...listLines.filter(isItem).map(l => /^\s*/.exec(l)![0].length))
  const items = listItems(listLines.map(l => l.slice(Math.min(indent, /^\s*/.exec(l)![0].length))))
    .map(i => cap(plain([i.text, ...i.body].join(' ')), 200))
    .filter(Boolean)
    .slice(0, 6)
  const text = cap(lead.replace(/:\s*$/, items.length ? ':' : '') || items.join('; '), 600)
  return text || items.length ? { text: text || items.join('; '), items } : null
}

/** The first paragraph under "Problem" as plain text (see problemSection), or null. */
export function problemOf(md: string): string | null {
  return problemSection(md)?.text ?? null
}

/**
 * Classified findings: list items under a "Findings" heading that lead with a class
 * (`- **established**: …`, `- Inferred — …`), or items under a class subheading (`### Established`).
 * `not-applicable` and unclassified items are left out.
 */
export function findingsOf(md: string): StipFinding[] {
  const all = sections(md)
  const out: StipFinding[] = []
  all.forEach((s, i) => {
    if (!/^findings\b/i.test(s.title)) return
    let under: StipFinding['source'] | null = null
    const lines = withSubsections(all, i)
    let item: StipFinding | null = null
    for (const line of lines) {
      const h = /^#{2,6}\s+(.+)$/.exec(line)
      if (h) {
        under = CLASSES[plain(h[1]!).toLowerCase().replace(/[^a-z]/g, '')] ?? null
        item = null
        continue
      }
      const li = /^ {0,1}(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line)
      if (li) {
        const lead = /^(?:\*\*|__|\*|_)?\s*(established|inferred|incomplete|missing|not[- ]applicable)\s*(?:\*\*|__|\*|_)?\s*(?::|—|–|-)\s*(.+)$/i.exec(li[1]!.trim())
        const cls = lead ? CLASSES[lead[1]!.toLowerCase()] : under
        const text = plain(lead ? lead[2]! : li[1]!)
        item = cls && text ? { kind: KIND[cls], source: cls, text } : null
        if (item) out.push(item)
        continue
      }
      if (item && /^\s+\S/.test(line)) item.text = plain(`${item.text} ${line}`)
      else if (line.trim()) item = null
    }
  })
  return out
}

/**
 * Decisions and open questions: items of a heading naming decisions or open questions, numbered
 * (`D1`, `Q1`, `1.`) or listed, each with its "Recommended:" text when it gives one.
 */
export function decisionsOf(md: string): StipDecision[] {
  const all = sections(md)
  const out: StipDecision[] = []
  all.forEach((s, i) => {
    if (!/decision|open questions?/i.test(s.title) || /^findings\b/i.test(s.title)) return
    // A subsection of a decisions section is read with its parent.
    const parent = all.slice(0, i).reverse().find(p => p.level < s.level)
    if (parent && /decision|open questions?/i.test(parent.title)) return
    const openSection = /open questions?/i.test(s.title) && !/decision/i.test(s.title)
    for (const item of listItems(withSubsections(all, i))) {
      const whole = [item.text, ...item.body].join('\n')
      const rec = /(?:^|\n|\s)(?:\*\*|_)?Recommended(?:\*\*|_)?\s*:\s*(?:\*\*|_)?\s*(.+)$/im.exec(whole)
      const textPart = rec ? whole.slice(0, rec.index).trim() : whole
      let text = plain(textPart.replace(/\n/g, ' '))
      const tag = /^(?:\*\*)?([DQ]\d+)(?:\*\*)?\s*[:.)—–-]?\s*/.exec(text)
      const id = tag ? tag[1]! : /^\d+[.)]$/.test(item.marker) ? item.marker.slice(0, -1) : null
      if (tag) text = text.slice(tag[0].length).trim()
      if (!text) continue
      out.push({
        id,
        text,
        recommended: rec ? plain(rec[1]!) || null : null,
        open: id?.startsWith('Q') === true || openSection,
      })
    }
  })
  return out
}

export function exploreOf(proposal: string, extensions: string[]): StipExplore {
  const problem = problemSection(proposal)
  return { problem: problem?.text ?? null, problemItems: problem?.items ?? [], findings: findingsOf(proposal), decisions: decisionsOf(proposal), extensions: [...extensions] }
}

/** The proposal's first heading, else null. */
export function titleOf(md: string): string | null {
  return /^#\s+(.+?)\s*$/m.exec(md)?.[1]?.trim() ?? null
}

// --- New change: follow-ups and accepted specs ---

const FOLLOW_UP = /^(?:open\s+|remaining\s+)?(?:follow[- ]?ups?|known limitations|limitations)\b/i

/** Splits an item into a short title (its lead clause) and the rest. */
function titled(text: string): { title: string; detail: string | null } {
  const m = /^(.{3,90}?)(?::\s|\s[—–]\s|\s-\s|\.\s)(.+)$/.exec(text)
  let title = (m ? m[1]! : text).replace(/[.:;]+$/, '').trim()
  const detail = m ? m[2]!.trim() || null : null
  if (title.length > 90) title = `${title.slice(0, 89)}…`
  return { title, detail }
}

/**
 * Follow-ups of an archived proposal: only the items of a "Follow-ups" / "Known limitations"
 * section (conservative: no other heading counts), at most 10 per change.
 */
export function followUpsOf(md: string, source: string): StipFollowUp[] {
  const out: StipFollowUp[] = []
  const all = sections(md)
  all.forEach((s, i) => {
    if (!FOLLOW_UP.test(s.title)) return
    for (const item of listItems(withSubsections(all, i))) {
      const text = plain([item.text, ...item.body].join(' '))
      if (!text || /^(none|n\/a|nothing)\.?$/i.test(text)) continue
      out.push({ ...titled(text), source })
    }
  })
  return out.slice(0, 10)
}

export function acceptedSpec(id: string, spec: string, archivedAt: string | null, commit: string | null): StipAcceptedSpec {
  return { id, criteria: parseCriteria(spec).length, archivedAt, commit }
}

// --- Validate: the contract the person last approved ---

/** What is recorded per change when the person approves (plugin store `contracts[root][id]`). */
export type ApprovedContract = {
  digest: string
  at: string
  /** Criterion id -> its full text. */
  criteria: Record<string, string>
  /** Task id -> a canonical text of its definition. */
  tasks: Record<string, string>
}

export type TaskLike = { id: string; role: string; phase: string; objective: string; criteria: string[]; depends_on?: string[]; dependsOn?: string[]; write_paths?: string[]; writePaths?: string[] }

/** A task's definition as compared between versions (fields a revision changes). */
export function taskKey(t: TaskLike): string {
  return JSON.stringify({
    role: t.role,
    phase: t.phase,
    objective: t.objective,
    criteria: [...(t.criteria ?? [])].sort(),
    depends_on: [...(t.depends_on ?? t.dependsOn ?? [])].sort(),
    write_paths: [...(t.write_paths ?? t.writePaths ?? [])].sort(),
  })
}

export function approvedContract(digest: string, at: string, spec: string, tasks: TaskLike[]): ApprovedContract {
  return {
    digest,
    at,
    criteria: Object.fromEntries(parseCriteria(spec).map(c => [c.id, c.text])),
    tasks: Object.fromEntries(tasks.map(t => [t.id, taskKey(t)])),
  }
}

const byAc = (a: string, b: string) => (Number(a.replace(/\D/g, '')) || 0) - (Number(b.replace(/\D/g, '')) || 0) || a.localeCompare(b)

/** The difference by id between the approved contract and the current criteria and plan. */
export function contractDiff(approved: ApprovedContract | null | undefined, criteria: { id: string; text: string; title?: string }[], tasks: TaskLike[]): StipContractDiff | null {
  if (!approved || typeof approved.digest !== 'string' || !approved.criteria || !approved.tasks) return null
  const now = new Map(criteria.map(c => [c.id, c]))
  const changes: StipContractDiff['criteria'] = []
  for (const c of criteria) {
    const before = approved.criteria[c.id]
    if (before === undefined) changes.push({ id: c.id, change: 'added', title: c.title ?? fallbackLabel(c.text) })
    else if (before.trim() !== c.text.trim()) changes.push({ id: c.id, change: 'changed', title: c.title ?? fallbackLabel(c.text) })
  }
  for (const [id, text] of Object.entries(approved.criteria)) if (!now.has(id)) changes.push({ id, change: 'removed', title: fallbackLabel(text) })
  changes.sort((a, b) => byAc(a.id, b.id))
  const current = new Map(tasks.map(t => [t.id, taskKey(t)]))
  return {
    since: approved.digest,
    approvedAt: approved.at,
    criteria: changes,
    addedTasks: [...current.keys()].filter(id => !(id in approved.tasks)),
    changedTasks: [...current].filter(([id, key]) => id in approved.tasks && approved.tasks[id] !== key).map(([id]) => id),
    removedTasks: Object.keys(approved.tasks).filter(id => !current.has(id)),
  }
}

// --- Check: recorded proof per criterion ---

type ReportEntry = { id?: unknown; status?: unknown; evidence?: unknown }

/** The check report's criteria (state.json `check.report.criteria`), by id. */
export function reportOf(state: Record<string, any> | null | undefined): Record<string, StipProof> {
  const out: Record<string, StipProof> = {}
  const list: ReportEntry[] = Array.isArray(state?.check?.report?.criteria) ? state!.check.report.criteria : []
  for (const e of list) {
    if (typeof e?.id !== 'string') continue
    const raw = String(e.status ?? '').toLowerCase()
    const status: StipProof['status'] = raw === 'passed' ? 'passed' : raw === 'failed' ? 'failed' : raw === 'pending-docs' ? 'pending-docs' : 'unverified'
    out[e.id] = { status, text: typeof e.evidence === 'string' ? e.evidence.trim() : '', source: 'check' }
  }
  return out
}

/**
 * Adds the recorded proof to each criterion: the check report's entry, else evidence.md's line. A
 * `pending-docs` entry gives way to a later `passed` line in evidence.md (docs recorded it).
 */
export function withProof<C extends { id: string }>(criteria: C[], report: Record<string, StipProof>, evidenceMd: string): (C & { pendingDocs: boolean; proof: StipProof | null })[] {
  const evidence = parseEvidence(evidenceMd)
  const raw = (id: string) => new RegExp(`^- ${id}:\\s*([a-z_-]+)`, 'mi').exec(evidenceMd)?.[1]?.toLowerCase() ?? null
  return criteria.map(c => {
    const ev = evidence[c.id]
    const line: StipProof | null = ev
      ? { status: /^pending[-_]docs$/.test(raw(c.id) ?? '') ? 'pending-docs' : ev.status === 'passed' ? 'passed' : ev.status === 'failed' ? 'failed' : 'unverified', text: ev.evidence, source: 'evidence' }
      : null
    let proof = report[c.id] ?? line
    if (proof?.status === 'pending-docs' && line?.status === 'passed') proof = line
    return { ...c, pendingDocs: proof?.status === 'pending-docs', proof }
  })
}

/** The one acceptance criterion a tool call's input names (null when none or several). */
export function criterionIn(input: Record<string, unknown>): string | null {
  let text = ''
  try {
    text = JSON.stringify(input) ?? ''
  } catch {
    return null
  }
  const ids = new Set((text.match(/\bAC-[1-9][0-9]*\b/g) ?? []).map(s => s))
  return ids.size === 1 ? [...ids][0]! : null
}

/** Appends one observed step, keeping the last STEP_LIMIT. */
export function pushStep(steps: StipStep[] | undefined, step: StipStep): StipStep[] {
  return [...(steps ?? []), step].slice(-STEP_LIMIT)
}

// --- Archive: the summary of a change just archived ---

const ms = (iso: unknown): number | null => {
  if (typeof iso !== 'string') return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

export function archiveSummary(input: {
  id: string
  state: Record<string, any> | null
  /** execution-summary.json, or null. */
  summary: Record<string, any> | null
  /** The change's worker registry if it is still there (models when the summary records none). */
  registry: Record<string, any> | null
  spec: string
  evidence: string
  proposal: string
  commit: string | null
}): StipArchiveSummary {
  const { id, state, summary, registry } = input
  const criteria = parseCriteria(input.spec)
  const report = reportOf(state)
  const evidence = parseEvidence(input.evidence)
  const passed = criteria.filter(c => evidence[c.id]?.status === 'passed' || (!evidence[c.id] && report[c.id]?.status === 'passed')).length
  const tasks: Record<string, any>[] = Array.isArray(summary?.tasks) ? summary!.tasks : []
  const jobs: Record<string, any>[] = Array.isArray(registry?.jobs) ? registry!.jobs : []
  const latestJob = (taskId: string) => jobs.filter(j => j.task_id === taskId).sort((a, b) => (b.attempt ?? 0) - (a.attempt ?? 0))[0]
  const models = tasks
    .filter(t => typeof t.task_id === 'string')
    .map(t => {
      const job = latestJob(t.task_id)
      const profile = job?.profile && typeof job.profile === 'object' ? job.profile : {}
      const pick = (...v: unknown[]) => (v.find(x => typeof x === 'string' && x && x !== 'inherit') as string | undefined) ?? null
      return {
        taskId: String(t.task_id),
        model: pick(t.actual_model, t.requested_model, job?.actual_model, profile.model),
        effort: pick(t.effort, profile.effort),
        attempts: Number.isInteger(t.attempt) && t.attempt > 0 ? (t.attempt as number) : 1,
      }
    })
  const corrected = models.filter(m => m.attempts > 1).map(m => m.taskId)
  const createdAt = typeof state?.created_at === 'string' ? state.created_at : null
  const archivedAt = typeof summary?.archived_at === 'string' ? summary.archived_at : state?.phase === 'archived' && typeof state?.updated_at === 'string' ? state.updated_at : null
  const a = ms(createdAt)
  const b = ms(archivedAt)
  return {
    changeId: id,
    title: titleOf(input.proposal) ?? id,
    commit: input.commit,
    createdAt,
    archivedAt,
    durationMs: a !== null && b !== null && b >= a ? b - a : null,
    criteria: { passed, total: criteria.length },
    tasks: { total: models.length, corrections: models.reduce((n, m) => n + m.attempts - 1, 0), corrected },
    models,
    followUps: followUpsOf(input.proposal, id),
  }
}

// --- Setup: a project without .workflow/ ---

export const SETUP_FILES = [
  'pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt', 'pytest.ini', 'tox.ini', 'conftest.py', '.python-version',
  'package.json', 'tsconfig.json', 'deno.json', 'Cargo.toml', 'go.mod', 'Gemfile', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'mix.exs', 'composer.json', 'Package.swift',
  'AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md',
  '.github/workflows', '.gitlab-ci.yml', '.circleci', 'azure-pipelines.yml', 'Jenkinsfile', '.buildkite',
] as const

/**
 * What Setup shows, from which of SETUP_FILES exist, the text of pyproject.toml / package.json
 * when present, and `git status --porcelain=v1 -b` (null outside a repository).
 */
export function setupSummary(input: {
  project: string
  home: string | null
  present: Set<string>
  pyproject?: string
  packageJson?: string
  gitStatus: string | null
}): StipSetup {
  const has = (f: string) => input.present.has(f)
  const langs: string[] = []
  let tests: string | null = null
  const py = has('pyproject.toml') || has('setup.py') || has('setup.cfg') || has('requirements.txt')
  if (py) {
    const version = /requires-python\s*=\s*["'][^0-9]*([0-9]+\.[0-9]+)/.exec(input.pyproject ?? '')?.[1]
    langs.push(version ? `Python ${version}` : 'Python')
    if (has('pytest.ini') || has('conftest.py') || /\bpytest\b/.test(input.pyproject ?? '')) tests = 'pytest'
    else if (has('tox.ini')) tests = 'tox'
  }
  if (has('package.json')) {
    let pkg: Record<string, any> = {}
    try {
      pkg = JSON.parse(input.packageJson ?? '{}')
    } catch {}
    langs.push(has('tsconfig.json') || pkg.devDependencies?.typescript || pkg.dependencies?.typescript ? 'TypeScript' : 'JavaScript')
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    const script = typeof pkg.scripts?.test === 'string' ? pkg.scripts.test : ''
    tests ??= ['vitest', 'jest', 'mocha', 'ava', 'playwright'].find(t => t in deps || new RegExp(`\\b${t}\\b`).test(script)) ?? (/bun test/.test(script) ? 'bun test' : /node --test/.test(script) ? 'node --test' : script && !/no test specified/.test(script) ? 'npm test' : null)
  } else if (has('deno.json')) langs.push('TypeScript (Deno)')
  if (has('Cargo.toml')) (langs.push('Rust'), (tests ??= 'cargo test'))
  if (has('go.mod')) (langs.push('Go'), (tests ??= 'go test'))
  if (has('Gemfile')) langs.push('Ruby')
  if (has('pom.xml') || has('build.gradle') || has('build.gradle.kts')) langs.push(has('build.gradle.kts') ? 'Kotlin/Java' : 'Java')
  if (has('mix.exs')) (langs.push('Elixir'), (tests ??= 'mix test'))
  if (has('composer.json')) langs.push('PHP')
  if (has('Package.swift')) (langs.push('Swift'), (tests ??= 'swift test'))
  let git: StipSetup['git'] = { repo: false, branch: null, clean: null }
  if (input.gitStatus !== null) {
    const lines = input.gitStatus.split('\n').filter(Boolean)
    const head = lines[0]?.startsWith('## ') ? lines[0].slice(3) : ''
    const branch = /^No commits yet on (.+)$/.exec(head)?.[1] ?? (/^HEAD \(no branch\)/.test(head) ? null : head.split('...')[0]?.split(' ')[0] || null)
    git = { repo: true, branch, clean: lines.filter(l => !l.startsWith('## ')).length === 0 }
  }
  const home = input.home?.replace(/\/+$/, '')
  return {
    project: home && (input.project === home || input.project.startsWith(`${home}/`)) ? `~${input.project.slice(home.length)}` : input.project,
    code: langs.length ? langs.join(', ') : null,
    tests,
    git,
    rules: ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md'].filter(has),
    ci: ['.github/workflows', '.gitlab-ci.yml', '.circleci', 'azure-pipelines.yml', 'Jenkinsfile', '.buildkite'].find(has) ?? null,
  }
}

// --- Prompt fills ---

/** One line, at most 200 characters: a follow-up title as `/stip-explore` takes it. */
export function exploreTitle(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (!t) throw new Error('title is required')
  return t.length > 200 ? t.slice(0, 200).trim() : t
}
