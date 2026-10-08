// Worker briefs, agent-type definitions and spawn descriptions (pure).
import { PLUGIN, TOOL_PREFIX, WORKER_FORBIDDEN_TOOLS } from './guards.ts'
import { parseCriteria } from './criteria.ts'
import type { ResolvedProfile } from './settings.ts'

export const TOOL_NAMES = [
  'stip_status',
  'stip_research',
  'stip_plan',
  'stip_delegate',
  'stip_interrupt',
  'stip_contribution',
  'stip_result',
] as const

const STIP_TOOLS = TOOL_NAMES.map(n => TOOL_PREFIX + n)

export type PlanTask = {
  id: string
  role: string
  phase: string
  objective: string
  criteria: string[]
  depends_on: string[]
  write_paths: string[]
  read_paths: string[]
  expected_output?: string
}

/** The spawn description that identifies an attempt in `$.agent.list()` (unique per attempt). */
export const describeTask = (change: string, task: string, attempt: number) => `stip ${change}/${task}#${attempt}`
export const describeHelper = (helperId: string) => `stip helper ${helperId}`

export function parseDescription(text: string):
  | { kind: 'task'; changeId: string; taskId: string; attempt: number }
  | { kind: 'helper'; helperId: string }
  | null {
  const task = /^stip ([a-z0-9-]+)\/([A-Za-z0-9._-]+)#(\d+)$/.exec(text)
  if (task) return { kind: 'task', changeId: task[1]!, taskId: task[2]!, attempt: Number(task[3]) }
  const helper = /^stip helper (helper-[0-9a-f-]{36})$/.exec(text)
  if (helper) return { kind: 'helper', helperId: helper[1]! }
  return null
}

/** The full text of each requested criterion from spec.md (continuation lines and nested lists kept). */
export function criteriaText(spec: string, ids: readonly string[]): string[] {
  const all = new Map(parseCriteria(spec).map(c => [c.id, c.text]))
  return ids.map(id => {
    const text = all.get(id)
    return text === undefined ? `${id}: (not found in spec.md; read the contract)` : `${id}: ${text}`
  })
}

export const WORKER_RULES = [
  'You are a Stipulate worker. Work only on the task in your brief.',
  'Preserve changes made by other people and workers; never revert files you do not own.',
  'Write only inside the write ownership your brief lists; everything else is read-only. Edits outside it are refused.',
  'Do not delegate or spawn agents. Do not approve, check, document or archive the change.',
  'Do not edit .workflow lifecycle or registry files and do not run the workflow engine.',
  'Do not commit, push, stash, reset, switch branches or manage worktrees; the coordinator integrates your work.',
  'Finish with a report: the paths you changed, the checks you ran with their results, and the gaps or risks that remain. Never claim your contribution is accepted.',
].join('\n')

export const HELPER_RULES = [
  'You are a read-only Stipulate research helper. Answer the one bounded question you are given.',
  'Do not edit files, run state-changing commands, delegate or touch the workflow. Bash runs inspection commands only.',
  'Return concise findings with the evidence (paths, lines, sources) and the uncertainty that remains.',
].join('\n')

/** The `$.agent.register` spec of a worker type. */
export function workerAgentSpec(profile: ResolvedProfile, role: string, phase: string) {
  return {
    name: profile.agentType,
    description: `Stipulate ${role} worker${profile.agentType.includes('-') && profile.agentType !== role ? ` (${phase})` : ''}: runs one approved task; dispatched by stip_delegate only.`,
    prompt: `${WORKER_RULES}\n\nYour role: ${role}. Your lifecycle phase: ${phase}.`,
    disallowedTools: [...WORKER_FORBIDDEN_TOOLS, ...STIP_TOOLS],
    ...(profile.model !== 'inherit' ? { model: profile.model } : { model: 'inherit' }),
    ...(profile.effort !== 'inherit' ? { effort: profile.effort } : {}),
  }
}

/** The `$.agent.register` spec of a read-only research helper type. */
export function helperAgentSpec(profile: ResolvedProfile, role: string) {
  return {
    name: `helper-${role}`,
    description: `Stipulate read-only ${role} helper: answers one bounded research question; dispatched by stip_research only.`,
    prompt: `${HELPER_RULES}\n\nYour role: ${role}.`,
    tools: ['Read', 'Glob', 'Grep', 'Bash', 'LSP', 'WebFetch', 'WebSearch', 'ToolSearch'],
    disallowedTools: ['Edit', 'Write', 'NotebookEdit', ...WORKER_FORBIDDEN_TOOLS, ...STIP_TOOLS],
    ...(profile.model !== 'inherit' ? { model: profile.model } : { model: 'inherit' }),
    ...(profile.effort !== 'inherit' ? { effort: profile.effort } : {}),
  }
}

export const agentTypeOf = (name: string) => `${PLUGIN}:${name}`

export type BriefInput = {
  changeId: string
  task: PlanTask
  attempt: number
  root: string
  cwd: string
  isolated: boolean
  criteria: string[]
  extensions: string[]
  instructions?: string
  correction?: { reason: string | null } | null
  /** Whether the worker runs as an existing agent type (rules are then only in the brief). */
  foreignType: boolean
}

export function buildBrief(b: BriefInput): string {
  const t = b.task
  const docs = `${b.root}/.workflow/changes/${b.changeId}`
  const sections = [
    `# Stipulate task ${t.id} (attempt ${b.attempt}) of change ${b.changeId}`,
    `Role: ${t.role}. Phase: ${t.phase}.`,
    `## Objective\n${t.objective}`,
    `## Acceptance criteria you serve\n${b.criteria.map(c => `- ${c}`).join('\n') || '- (none listed)'}`,
    `## Contract\nRead ${docs}/spec.md and ${docs}/proposal.md before working. They are the approved contract; do not change them.`,
    `## Write ownership\n${t.write_paths.length ? t.write_paths.map(p => `- ${p}`).join('\n') : 'READ ONLY: report findings; do not edit files.'}` +
      (t.read_paths.length ? `\n\nRead context: ${t.read_paths.join(', ')}` : ''),
    `## Working directory\n${b.cwd}\n` +
      (b.isolated
        ? `This is your own git worktree, a snapshot of the main checkout. Edit files only here (paths relative to it). The coordinator integrates accepted work into ${b.root}; edits elsewhere are refused.`
        : `This is the shared main checkout. Other workers may be reading it; touch nothing outside your ownership.`),
    `## Dependencies\n${t.depends_on.length ? `Accepted before you started: ${t.depends_on.join(', ')}.` : 'None.'}`,
  ]
  if (b.extensions.length)
    sections.push(
      `## Domain procedures\nFollow, where relevant to your task:\n${b.extensions.map(x => `- ${b.root}/.workflow/extensions/${x}/apply.md`).join('\n')}`,
    )
  if (b.correction)
    sections.push(
      `## Correction\nThis is a correction of an earlier attempt${b.correction.reason ? `, reviewed as: ${b.correction.reason}` : ''}. Fix what the review names within the same objective.`,
    )
  if (b.instructions?.trim()) sections.push(`## Coordinator notes\n${b.instructions.trim()}`)
  sections.push(
    `## Expected output\n${t.expected_output ?? 'Return: the paths you changed; the checks you ran and their results; remaining gaps and risks. Do not claim acceptance.'}`,
  )
  if (b.foreignType) sections.push(`## Rules\n${WORKER_RULES}`)
  return sections.join('\n\n')
}

export function buildHelperBrief(question: string, role: string, phase: string, changeId: string | null, root: string): string {
  return [
    `# Stipulate research question (${role}, ${phase})`,
    changeId ? `Context: change ${changeId} at ${root}/.workflow/changes/${changeId}/ (proposal.md, spec.md).` : `Project: ${root}.`,
    `## Question\n${question.trim()}`,
    `## Expected output\nFindings with evidence (paths, lines, sources), the uncertainty that remains, and nothing else. You are read-only.`,
  ].join('\n\n')
}
