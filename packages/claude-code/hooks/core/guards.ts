// Pure guard rules. Each returns null when the call may proceed, or the reason it is refused.
// Paths reaching these functions are already resolved (symbolic links and `..` removed).
import type { StipApplyGate, StipPhase } from '../../types'

export const PLUGIN = 'stipulate'
export const TOOL_PREFIX = `mcp__${PLUGIN}__`
export const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit'] as const
/** Tools a worker never runs: delegation, worktree moves, workflows, Stip's own tools. */
export const WORKER_FORBIDDEN_TOOLS = ['Agent', 'Task', 'Workflow', 'EnterWorktree', 'ExitWorktree', 'TeamCreate', 'TeamDelete']
const APPROVED_PHASES: readonly string[] = ['approved', 'applying', 'checked', 'documented']

export const deny = (rule: string, why: string) => `${PLUGIN}: ${rule} guard: ${why}`

/** Collapses `.`, `..` and repeated separators of an absolute POSIX path. */
export function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return '/' + out.join('/')
}

/** Joins a possibly relative path onto a base directory and normalizes it. */
export function absolute(base: string, path: string): string {
  return normalize(path.startsWith('/') ? path : `${base}/${path}`)
}

/** The path relative to `base`, or null when it lies outside. */
export function inside(base: string, path: string): string | null {
  const b = normalize(base)
  const p = normalize(path)
  if (p === b) return ''
  return p.startsWith(b === '/' ? '/' : b + '/') ? p.slice(b === '/' ? 1 : b.length + 1) : null
}

const head = (rel: string) => rel.split('/')[0]!.toLowerCase()

export function owned(rel: string, writePaths: readonly string[]): boolean {
  return writePaths.some(w => {
    const prefix = w.replace(/\/+$/, '')
    return rel === prefix || rel.startsWith(prefix + '/')
  })
}

/** AC-11: a worker writes only inside its cwd, within write_paths, never under .workflow or .git. */
export function workerWrite(real: string | null, cwd: string, writePaths: readonly string[]): string | null {
  if (real === null) return deny('ownership', 'the target path cannot be resolved')
  const rel = inside(cwd, real)
  if (rel === null) return deny('ownership', `${real} is outside this worker's checkout ${cwd}`)
  if (rel === '') return deny('ownership', 'the checkout root itself is not writable')
  if (head(rel) === '.workflow' || head(rel) === '.git') return deny('ownership', `${rel} is managed workflow or git state`)
  if (!writePaths.length) return deny('ownership', 'this task is read-only (no write_paths)')
  if (!owned(rel, writePaths)) return deny('ownership', `${rel} is outside the task write_paths (${writePaths.join(', ')})`)
  return null
}

/**
 * A shell command with its quoting removed, so spellings like work''flow.py, "approve",
 * \a\pprove or $'\x61pprove' are read as the shell would run them (best effort).
 */
export function normalizeCommand(command: string): string {
  return command
    .replace(/\$'((?:[^'\\]|\\.)*)'/g, (_, body: string) =>
      body.replace(/\\x([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, '$1'),
    )
    .replace(/\\\n/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/["']/g, '')
}

const ENGINE = /workflow\.py\b/
/** The engine run as a module (`python3 -m scripts.workflow …`). */
const ENGINE_MODULE = /(^|\s)-m\s+[\w.]*\bworkflow(\s|$)/
/** An engine file name assembled from pieces inside inline code (`'work' + 'flow.py'`, `'workflow' + '.py'`). */
const SPLIT_ENGINE = /\+\s*flow\.py|work\s*\+\s*flow|workflow\s*\+\s*\.py|\bflow\.py\b/
/** A token naming the lifecycle engine: a path ending in workflow.py, or its module form. Not the `.workflow/` folder. */
export const isEngine = (normalized: string) => ENGINE.test(normalized) || ENGINE_MODULE.test(normalized)

/** True when a shell word with glob characters could expand to `target` (e.g. approv[e], work?low.py). */
export function globCouldMatch(word: string, target: string): boolean {
  if (!/[?*[]/.test(word)) return false
  let re = ''
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!
    if (c === '?') re += '.'
    else if (c === '*') re += '.*'
    else if (c === '[') {
      const end = word.indexOf(']', i + 1)
      if (end < 0) re += '\\['
      else {
        re += '[' + word.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\') + ']'
        i = end
      }
    } else re += c.replace(/[.+^${}()|\\/]/g, m => '\\' + m)
  }
  try {
    const base = target.split('/').pop()!
    return new RegExp(`(^|/)${re}$`).test(target) || new RegExp(`^${re}$`).test(base)
  } catch {
    return true
  }
}

const words = (c: string) => c.split(/[\s;&|()<>]+/).filter(Boolean)
/** A glob that could name the engine or the approve subcommand. */
const globbedEngine = (c: string) =>
  words(c).some(w => {
    const name = w.replace(/^.*\//, '')
    // Only a glob that shares a literal fragment with the name is suspicious (not `*` or `*.py`).
    const near = (stem: string) => name.split(/[?*]|\[[^\]]*\]/).some(part => part.length >= 3 && stem.includes(part.toLowerCase()))
    return (globCouldMatch(name, 'workflow.py') && near('workflow')) || (globCouldMatch(name, 'approve') && near('approve'))
  })
/** Inline code or encoded payloads that can assemble a command no filter reads. */
const ASSEMBLED = /(^|[\s;&|(])python[0-9.]*\s+(-[A-Za-z]*c\b|-\s*<<)|\bbase64\s+(-d|--decode)\b|\bxxd\s+-r\b/
/** Paths of the plugin store (approval records). */
export const STORE_PATH = /plugins\/store\b|stipulate_[A-Za-z0-9_-]*\.json/
/** Shell features that can assemble an engine call this filter cannot read. */
const INDIRECTION = /\$\{?[A-Za-z_@*0-9!#?-]|\$\(|`|(^|[\s;&|(])(eval|source|exec|xargs)(\s|$)|(^|[\s;&|(])\.\s+\S|\benv\s+(-[a-zA-Z]*[iu]|--unset|--ignore-environment)|\bunset\b|\bexport\s+-n\b/
const APPROVE = /(^|[\s;&|(=])approve(\s|$|[;&|)])/
const ACK = /(^|\s)--ack/
const PYTHON = /(^|[\s;&|(/])(python[0-9.]*|py)(\s|$)|\.py\b/
const GIT_FORBIDDEN = /\bgit\b(?:\s+(?:-[A-Za-z]\s+\S+|--?[A-Za-z][\w-]*(?:=\S+)?))*\s+(commit|push|worktree|reset|checkout|stash|switch|rebase|clean)\b/

/**
 * AC-11: worker Bash may not drive the lifecycle engine, rewrite git history/checkouts, or
 * shed the STIP_WORKER marker the mod exports (which makes the engine refuse every mutation).
 */
export function workerBash(command: string): string | null {
  const c = normalizeCommand(command)
  if (isEngine(c) || SPLIT_ENGINE.test(c) || ACK.test(c))
    return deny('lifecycle', 'workers cannot run the workflow engine; report to the coordinator instead')
  if (/STIP_WORKER\s*=|export\s+-n|declare\s+[-+]x/.test(c) || /\benv\s+(-[a-zA-Z]*[iu]|--unset|--ignore-environment)/.test(c) || /\bunset\b|environ\b|putenv|unsetenv/.test(c))
    return deny('lifecycle', 'workers cannot change the environment the mod sets (STIP_WORKER)')
  if (globbedEngine(c)) return deny('lifecycle', 'globs that could name the workflow engine are refused')
  if (STORE_PATH.test(c)) return deny('approval', 'the plugin store is not for workers')
  if (/\bgit\b[^;&|]*\s-c\s+alias\./.test(c) || /\bgit\b(?:\s+-[A-Za-z]\s+\S+|\s+--?[A-Za-z][\w-]*(?:=\S+)?)*\s+\$/.test(c))
    return deny('lifecycle', 'git aliases and variable subcommands are refused for workers')
  const git = GIT_FORBIDDEN.exec(c)
  if (git) return deny('lifecycle', `workers cannot run git ${git[1]}; the coordinator integrates and commits`)
  return null
}

/** The prefix every worker Bash command runs under (engine refusal marker, no Python caches). */
export function workerEnvPrefix(taskId: string, attempt: number): string {
  const tag = `${taskId}#${attempt}`.replace(/[^A-Za-z0-9._#-]/g, '_')
  return `export STIP_WORKER='${tag}' PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS="-p no:cacheprovider"; `
}
const READ_ONLY_COMMANDS = new Set([
  'ls', 'cat', 'head', 'tail', 'grep', 'egrep', 'fgrep', 'rg', 'find', 'wc', 'sort', 'uniq', 'cut', 'tr', 'file',
  'stat', 'pwd', 'echo', 'printf', 'tree', 'du', 'diff', 'cmp', 'basename', 'dirname', 'realpath', 'which', 'jq',
  'sed', 'awk', 'git', 'true', 'test', 'column', 'nl', 'less', 'more',
])
const READ_ONLY_GIT = new Set(['log', 'show', 'diff', 'status', 'blame', 'ls-files', 'grep', 'rev-parse', 'branch', 'tag', 'describe', 'shortlog', 'cat-file', 'ls-tree'])

/** Research helpers are read-only: Bash runs only a conservative allow-list of inspection commands. */
export function helperBash(command: string): string | null {
  const refuse = (why: string) => deny('read-only helper', why)
  if (/[`]|\$\(|>|<\(|\btee\b/.test(command)) return refuse('substitution and redirection are not allowed')
  if (ENGINE.test(normalizeCommand(command))) return refuse('helpers cannot run the workflow engine')
  for (const segment of command.split(/&&|\|\||[|;&\n]/)) {
    const words = segment.trim().split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let i = 0
    while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]!)) i++
    const name = words[i]?.replace(/^.*\//, '')
    if (!name) continue
    if (!READ_ONLY_COMMANDS.has(name)) return refuse(`${name} is not an inspection command`)
    const rest = words.slice(i + 1)
    if (name === 'find' && rest.some(w => /^-(exec|execdir|ok|okdir|delete|fprint|fprintf|fls)$/.test(w)))
      return refuse('find may not execute or delete')
    if (name === 'sed' && rest.some(w => /^-(i|-in-place)/.test(w) || /^-[a-zA-Z]*i/.test(w))) return refuse('sed -i writes files')
    if (name === 'awk' && /system\s*\(|print\s*>|getline/.test(segment)) return refuse('awk may not write or execute')
    if (name === 'git') {
      const sub = rest.find(w => !w.startsWith('-'))
      if (!sub || !READ_ONLY_GIT.has(sub)) return refuse(`git ${sub ?? ''} is not read-only`)
      if (sub === 'branch' || sub === 'tag') {
        if (rest.some(w => /^-(d|D|m|M|c|C|f)$|^--(delete|move|copy|force)/.test(w)) || rest.filter(w => !w.startsWith('-')).length > 1)
          return refuse(`git ${sub} may only list`)
      }
    }
  }
  return null
}

/**
 * AC-14 (pre-hoc, best effort): the model never records approval itself. The post-hoc
 * provenance check is the backstop for spellings this cannot read.
 */
export function mainBash(command: string): string | null {
  const c = normalizeCommand(command)
  const why = deny('approval', 'approval is a user action: the person runs /stip-approve or presses Approve')
  if (ACK.test(c)) return why
  const engine = isEngine(c)
  if (APPROVE.test(c) && (engine || PYTHON.test(c))) return why
  if (globbedEngine(c)) return deny('approval', 'globs that could name the engine or approve are refused; spell the command out')
  if (STORE_PATH.test(c)) return deny('approval', 'the plugin store holds the person\'s approvals; it is not for the model')
  if (/(^|[\s/])approv[^\s/]*\.(sh|py|bash|zsh)\b/.test(c)) return why
  // Inline or decoded code is refused only next to the engine (or a name built to become it), an
  // approval token, or a substitution/pipe that could assemble one. The `.workflow/` folder is not it.
  const decoded = /\bbase64\s+(-d|--decode)\b|\bxxd\s+-r\b/.test(c) && /\|\s*((ba|z)?sh\b|python)/.test(c)
  if (ASSEMBLED.test(c) && (engine || SPLIT_ENGINE.test(c) || /approv|(^|\s|['"])--ack/i.test(c) || /\$\(/.test(c) || decoded))
    return deny('approval', 'inline or decoded code around the engine is refused; run the engine command literally')
  if (engine && /(^|\s)runtime\s/.test(c) && !/(^|\s)runtime\s+show\b/.test(c))
    return deny('registry', 'worker registry changes go through the stip_* tools (stip_delegate, stip_contribution, stip_interrupt), not the engine CLI')
  if (engine && INDIRECTION.test(c))
    return deny('approval', 'engine calls built from variables, eval, source, substitution or a stripped environment are refused; run the engine command literally')
  return null
}

/** Edits of the plugin store (the person's approval records) are refused to every agent. */
export function storeWrite(real: string | null): string | null {
  return real !== null && STORE_PATH.test(real) ? deny('approval', 'the plugin store holds the person\'s approvals; it is not editable by agents') : null
}

/** AC-14: lifecycle and registry files change only through the engine. */
export function protectedState(rel: string): string | null {
  const parts = rel.split('/').map(p => p.toLowerCase())
  if (parts[0] !== '.workflow') return null
  if (parts[1] === '.runtime' || (parts[1] === '.lock' && parts.length === 2))
    return deny('approval', `${rel} is engine state; use the stip_* tools`)
  if ((parts[1] === 'changes' || parts[1] === 'archive') && parts.length === 4 && parts[3] === 'state.json')
    return deny('approval', `${rel} is lifecycle state; it changes only through the engine`)
  return null
}

export type GateInput = {
  rel: string | null
  changeId: string | null
  phase: StipPhase | null
  approvalCurrent: boolean
  mode: StipApplyGate
}

/** True when the bound change has a current approval and has reached apply. */
export function isApproved(phase: string | null, approvalCurrent: boolean): boolean {
  return approvalCurrent && phase !== null && APPROVED_PHASES.includes(phase)
}

/**
 * AC-13: with a bound, unapproved change, main-session edits inside the project are
 * refused (block), allowed with a warning (warn) or untouched (off); the change's own
 * documents under .workflow/changes/<id>/ stay editable. `rel` null = outside the project.
 */
export function applyGate(input: GateInput): { verdict: 'allow' | 'warn' | 'block'; reason?: string } {
  if (input.mode === 'off' || !input.changeId || input.rel === null) return { verdict: 'allow' }
  if (isApproved(input.phase, input.approvalCurrent)) return { verdict: 'allow' }
  if (input.rel.startsWith(`.workflow/changes/${input.changeId}/`)) return { verdict: 'allow' }
  const reason = deny(
    'apply gate',
    `change ${input.changeId} is ${input.phase ?? 'unknown'}${input.approvalCurrent ? '' : ' without a current approval'}; ` +
      `edit its documents under .workflow/changes/${input.changeId}/ and have the user approve before editing ${input.rel || 'the project'}`,
  )
  return { verdict: input.mode === 'warn' ? 'warn' : 'block', reason }
}

/** The file a write tool targets, or null for other tools. */
export function writeTarget(e: { tool: string } & Record<string, unknown>): string | null {
  if (e.tool === 'Edit' || e.tool === 'Write') return typeof e.file_path === 'string' ? e.file_path : ''
  if (e.tool === 'NotebookEdit') return typeof e.notebook_path === 'string' ? e.notebook_path : ''
  return null
}

/** The minimum a re-entry verdict needs to know about a worker (kept in module memory). */
export type WorkerMirror = {
  kind: 'task' | 'helper'
  taskId: string
  attempt: number
  cwd: string
  writePaths: readonly string[]
  cancelled: boolean
}

/**
 * The worker rules decided synchronously from memory alone, for a call where the host raises the
 * hook's `.catch` in its place (re-entry: its own `$` calls reject). Paths are checked lexically.
 */
export function reentryVerdict(w: WorkerMirror, e: { tool: string } & Record<string, unknown>): string | null {
  if (w.cancelled) return deny('cancellation', `task ${w.taskId} was cancelled; stop now`)
  if (WORKER_FORBIDDEN_TOOLS.includes(e.tool) || e.tool.startsWith(TOOL_PREFIX))
    return deny('worker', `${e.tool} is not available to workers (no delegation, no lifecycle tools)`)
  const target = writeTarget(e)
  if (target !== null) {
    if (w.kind === 'helper') return deny('read-only helper', 'helpers do not edit files')
    const path = absolute(w.cwd, target)
    return storeWrite(path) ?? workerWrite(target ? path : null, w.cwd, w.writePaths)
  }
  if (e.tool === 'Bash' && typeof e.command === 'string')
    return workerBash(e.command) ?? (w.kind === 'helper' ? helperBash(e.command) : null)
  return null
}
