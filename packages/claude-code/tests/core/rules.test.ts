import { describe, expect, test } from 'claude-code/testing'

import { criteriaText, parseDescription, describeTask } from '../../hooks/core/brief.ts'
import { applyGate, helperBash, inside, mainBash, normalize, protectedState, workerBash, workerWrite } from '../../hooks/core/guards.ts'

describe('pure guard rules', () => {
  test('paths normalize and stay inside their base', () => {
    expect(normalize('/a/./b//c/../d')).toBe('/a/b/d')
    expect(inside('/proj', '/proj/src/a')).toBe('src/a')
    expect(inside('/proj', '/project/a')).toBeNull()
    expect(inside('/proj', '/proj/../etc')).toBeNull()
  })

  test('worker writes', () => {
    expect(workerWrite('/proj/src/core/a.ts', '/proj', ['src/core'])).toBeNull()
    expect(workerWrite('/proj/src/core', '/proj', ['src/core'])).toBeNull()
    expect(workerWrite('/proj/src/corex/a.ts', '/proj', ['src/core'])).toMatch(/outside the task write_paths/)
    expect(workerWrite('/proj/.Workflow/x', '/proj', ['.Workflow'])).toMatch(/managed workflow/)
    expect(workerWrite('/proj/src/a', '/proj', [])).toMatch(/read-only/)
    expect(workerWrite(null, '/proj', ['src'])).toMatch(/cannot be resolved/)
  })

  test('bash filters', () => {
    expect(workerBash('npm test && git diff')).toBeNull()
    expect(workerBash('git log --oneline')).toBeNull()
    expect(workerBash('git --no-pager -c x=y reset --hard')).toMatch(/git reset/)
    expect(workerBash('git checkout -- src')).toMatch(/git checkout/)
    expect(mainBash('python3 scripts/workflow.py status demo')).toBeNull()
    expect(mainBash('python3 scripts/workflow.py start demo')).toBeNull()
    expect(mainBash('python3 scripts/workflow.py approve demo --by x')).toMatch(/approval guard/)
    expect(helperBash('rg -n cache src | head -20')).toBeNull()
    expect(helperBash('git log -5 && ls src')).toBeNull()
    expect(helperBash('echo x > file')).toMatch(/redirection/)
    expect(helperBash('rm -rf src')).toMatch(/rm is not an inspection command/)
    expect(helperBash('find . -name x -delete')).toMatch(/may not execute or delete/)
    expect(helperBash('sed -i s/a/b/ f')).toMatch(/sed -i/)
    expect(helperBash('git commit -m x')).toMatch(/not read-only/)
    expect(helperBash('ls; npm install')).toMatch(/npm is not/)
  })

  test('protected lifecycle state', () => {
    expect(protectedState('.workflow/changes/demo/state.json')).toMatch(/lifecycle state/)
    expect(protectedState('.workflow/.runtime/demo/results/x.md')).toMatch(/engine state/)
    expect(protectedState('.workflow/.lock')).toMatch(/engine state/)
    expect(protectedState('.workflow/changes/demo/spec.md')).toBeNull()
    expect(protectedState('src/state.json')).toBeNull()
  })

  test('apply gate verdicts', () => {
    const base = { rel: 'src/a.ts', changeId: 'demo', phase: 'draft' as const, approvalCurrent: false }
    expect(applyGate({ ...base, mode: 'block' }).verdict).toBe('block')
    expect(applyGate({ ...base, mode: 'warn' }).verdict).toBe('warn')
    expect(applyGate({ ...base, mode: 'off' }).verdict).toBe('allow')
    expect(applyGate({ ...base, rel: '.workflow/changes/demo/proposal.md', mode: 'block' }).verdict).toBe('allow')
    expect(applyGate({ ...base, rel: '.workflow/changes/other/proposal.md', mode: 'block' }).verdict).toBe('block')
    expect(applyGate({ ...base, phase: 'approved', approvalCurrent: true, mode: 'block' }).verdict).toBe('allow')
    // A stale approval in apply is not an approval.
    expect(applyGate({ ...base, phase: 'applying', approvalCurrent: false, mode: 'block' }).verdict).toBe('block')
    expect(applyGate({ ...base, changeId: null, mode: 'block' }).verdict).toBe('allow')
  })
})

describe('briefs', () => {
  test('criteria text comes from spec.md', () => {
    const spec = '- AC-1: First.\n  continues here.\n- AC-10: Tenth.\n'
    expect(criteriaText(spec, ['AC-1', 'AC-10', 'AC-9'])).toEqual(['AC-1: First.\ncontinues here.', 'AC-10: Tenth.', 'AC-9: (not found in spec.md; read the contract)'])
  })

  test('spawn descriptions round-trip', () => {
    expect(parseDescription(describeTask('demo', 'core', 3))).toEqual({ kind: 'task', changeId: 'demo', taskId: 'core', attempt: 3 })
    expect(parseDescription('explore the code')).toBeNull()
  })
})

import { legalTransition, verifyRegistry } from '../../hooks/core/integrity.ts'

describe('registry verification (pure)', () => {
  const job = (over: Record<string, unknown> = {}) => ({ task_id: 'core', attempt: 1, status: 'running', acceptance: 'pending', session_id: 'a1', ...over })
  const reg = (...jobs: Record<string, unknown>[]) => ({ version: 1, change_id: 'demo', jobs })

  test('the mod\'s own write is accepted when only its action\'s fields changed', () => {
    const after = job({ status: 'returned', result_path: 'r.md', updated_at: 'x' })
    expect(verifyRegistry(reg(job()), reg(after), after, false, 'settle').ok).toBe(true)
  })

  test('foreign fields riding on the mod\'s own write are tampering, restored to known', () => {
    const after = job({ status: 'returned', acceptance: 'accepted', integrated: true })
    const v = verifyRegistry(reg(job()), reg(after), after, false, 'settle')
    expect(v.ok).toBe(false)
    expect(v.tampered).toEqual(['core#1'])
    expect(v.integrated).toEqual(['core#1'])
    expect(v.restored!.jobs[0]).toMatchObject({ status: 'returned', acceptance: 'pending' })
    expect(v.restored!.jobs[0]!.integrated).toBeUndefined()
  })

  test('any change without a mod write is tampering; a deleted job too', () => {
    expect(verifyRegistry(reg(job()), reg(job({ acceptance: 'accepted' }))).tampered).toEqual(['core#1'])
    expect(verifyRegistry(reg(job()), reg()).ok).toBe(false)
    expect(verifyRegistry(reg(job()), reg(job(), job({ task_id: 'ui' }))).tampered).toEqual(['ui#1'])
  })

  test('a correction reserve may reject earlier attempts and drop their worktree, nothing else', () => {
    const old = job({ status: 'returned', acceptance: 'accepted' })
    const fresh = job({ attempt: 2, status: 'starting', session_id: null })
    expect(verifyRegistry(reg(old), reg({ ...old, acceptance: 'rejected', worktree_removed: true }, fresh), fresh, true, 'reserve').ok).toBe(true)
    expect(verifyRegistry(reg(old), reg({ ...old, acceptance: 'rejected', integrated: true }, fresh), fresh, true, 'reserve').ok).toBe(false)
    expect(verifyRegistry(reg(old), reg({ ...old, acceptance: 'rejected' }, fresh), fresh, false, 'reserve').ok).toBe(false)
  })

  test('legal lifecycle moves', () => {
    expect(legalTransition('applying', 'checked')).toBe(true)
    expect(legalTransition('checked', 'draft')).toBe(true)
    expect(legalTransition('applying', 'archived')).toBe(false)
    expect(legalTransition('draft', 'applying')).toBe(false)
  })
})

import { hmac, sha256Sync } from '../../hooks/core/integrity.ts'

describe('synchronous SHA-256 and HMAC (journal signatures)', () => {
  test('match the standard vectors', () => {
    expect(sha256Sync('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Sync('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Sync('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3')
    expect(hmac(new TextEncoder().encode('key'), 'msg')).toBe('2d93cbc1be167bcb1637a4a23cbff01a7878f0c50ee833954ea5221bb1b8c628')
  })
})
