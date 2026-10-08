import { describe, expect, test } from 'claude-code/testing'

import {
  agentTypeName,
  effective,
  resolveProfile,
  validateClient,
  viewOf,
  withClient,
} from '../../hooks/core/settings.ts'
import { ROOT, World, install } from './harness.ts'

const settings = (client: Record<string, unknown>, shared = {}) => effective({ project: client }, shared)

describe('resolution (AC-7)', () => {
  test('defaults -> phase -> role -> phase-role, each layer overriding the last', () => {
    const eff = settings({
      defaults: { model: 'sonnet', effort: 'medium' },
      phases: { check: { effort: 'high' } },
      roles: { backend: { effort: 'low' } },
      phase_roles: { check: { backend: { effort: 'max' } } },
    })
    expect(resolveProfile(eff, 'frontend', 'apply', { writing: true })).toMatchObject({ model: 'sonnet', effort: 'medium' })
    expect(resolveProfile(eff, 'frontend', 'check', { writing: false })).toMatchObject({ effort: 'high', sources: { effort: 'phase' } })
    expect(resolveProfile(eff, 'backend', 'apply', { writing: true })).toMatchObject({ effort: 'low', sources: { effort: 'role' } })
    expect(resolveProfile(eff, 'backend', 'check', { writing: false })).toMatchObject({ effort: 'max', sources: { effort: 'phase-role' } })
  })

  test('unassigned options inherit the coordinator', () => {
    expect(resolveProfile(settings({}), 'backend', 'apply', { writing: true })).toMatchObject({ model: 'inherit', effort: 'inherit', agent: null, isolate: false })
  })

  test('a model change resets an effort no later layer sets', () => {
    const eff = settings({ defaults: { model: 'sonnet', effort: 'high' }, roles: { backend: { model: 'opus' }, frontend: { model: 'opus', effort: 'low' } } })
    expect(resolveProfile(eff, 'backend', 'apply', { writing: true })).toMatchObject({ model: 'opus', effort: 'inherit', sources: { effort: 'role' } })
    expect(resolveProfile(eff, 'frontend', 'apply', { writing: true })).toMatchObject({ model: 'opus', effort: 'low' })
    // The same model again is no change.
    const same = settings({ defaults: { model: 'sonnet', effort: 'high' }, roles: { backend: { model: 'sonnet' } } })
    expect(resolveProfile(same, 'backend', 'apply', { writing: true }).effort).toBe('high')
  })

  test('scopes merge personal <- project <- local', () => {
    const eff = effective({
      personal: { defaults: { model: 'haiku', effort: 'low' }, roles: { backend: { model: 'opus' } } },
      project: { defaults: { model: 'sonnet' } },
      local: { roles: { backend: { effort: 'xhigh' } } },
    })
    expect(resolveProfile(eff, 'backend', 'apply', { writing: true })).toMatchObject({ model: 'opus', effort: 'xhigh' })
    expect(resolveProfile(eff, 'docs', 'docs', { writing: true })).toMatchObject({ model: 'sonnet', effort: 'low' })
  })

  test('isolation defaults on for writers when parallel writers are allowed', () => {
    const eff = settings({ defaults: { max_workers: 4, max_shared_writers: 2 } })
    expect(resolveProfile(eff, 'backend', 'apply', { writing: true }).isolate).toBe(true)
    expect(resolveProfile(eff, 'verification', 'check', { writing: false }).isolate).toBe(false)
    const forced = settings({ roles: { backend: { isolate: true } } })
    expect(resolveProfile(forced, 'backend', 'apply', { writing: true }).isolate).toBe(true)
  })

  test('limits fall back to the shared orchestration defaults, then the engine defaults', () => {
    expect(settings({}).limits).toEqual({ max_workers: 2, max_shared_writers: 1 })
    expect(settings({}, { max_workers: 5 }).limits).toEqual({ max_workers: 5, max_shared_writers: 1 })
    expect(settings({ defaults: { max_workers: 3 } }, { max_workers: 5 }).limits.max_workers).toBe(3)
    expect(settings({}).applyGate).toBe('block')
  })

  test('agent type names follow the layers in use', () => {
    const eff = settings({ phases: { check: { model: 'opus' } }, phase_roles: { apply: { frontend: { effort: 'high' } } } })
    expect(agentTypeName(eff, 'backend', 'apply')).toBe('backend')
    expect(agentTypeName(eff, 'frontend', 'apply')).toBe('apply-frontend')
    expect(agentTypeName(eff, 'backend', 'check')).toBe('check-backend')
  })
})

describe('validation (AC-20)', () => {
  const refuses = (value: unknown, reason: RegExp) => expect(() => validateClient(value)).toThrow(reason)
  test('refuses invalid values and combinations with a reason', () => {
    refuses({ defaults: { model: 'gpt 5' } }, /model must be/)
    refuses({ roles: { backend: { effort: 'ultra' } } }, /effort must be one of/)
    refuses({ roles: { backend: { agent: 'Explore', effort: 'high' } } }, /effort cannot be applied to an existing agent type/)
    refuses({ roles: { discovery: { model: 'opus' } } }, /discovery stays with the coordinator/)
    refuses({ phases: { deploy: {} } }, /invalid phase/)
    refuses({ defaults: { max_workers: 9 } }, /between 1 and 8/)
    refuses({ roles: { backend: { max_workers: 2 } } }, /unknown field max_workers/)
    refuses({ enforcement: { apply_gate: 'maybe' } }, /off, warn or block/)
    refuses({ extra: true }, /unknown section/)
    expect(() => settings({ defaults: { max_workers: 2, max_shared_writers: 3 } })).toThrow(/cannot exceed max_workers/)
    expect(() => settings({ defaults: { max_workers: 3, max_shared_writers: 2 }, roles: { backend: { isolate: false } } })).toThrow(/need isolated worktrees/)
  })

  test('accepts aliases, full ids and inherit', () => {
    for (const model of ['inherit', 'haiku', 'sonnet', 'opus', 'fable', 'claude-opus-4-5', 'claude-sonnet-4-5[1m]', 'us.anthropic.claude-opus-4-5-v1:0'])
      expect(() => validateClient({ defaults: { model } })).not.toThrow()
  })

  test('a bad scope yields the strictest gate and reports the error', async () => {
    const view = await viewOf({ personal: '', project: '{"orchestration":{"clients":{"claude-code":{"defaults":{"effort":"x"}}}}}', local: '' }, { personal: 'p', project: 'c', local: 'l' })
    expect(view.error).toMatch(/effort/)
    expect(view.effective.applyGate).toBe('block')
  })

  test('saving replaces only clients["claude-code"], keeping OpenCode and the rest', () => {
    const doc = { schema_version: 1, extensions: { x: { enabled: true } }, orchestration: { defaults: { max_workers: 2 }, clients: { opencode: { roles: { backend: { model: 'a/b' } } } } } }
    const out = withClient(doc, 'project', { roles: { backend: { model: 'opus' } } }) as any
    expect(out.extensions).toEqual(doc.extensions)
    expect(out.orchestration.defaults).toEqual({ max_workers: 2 })
    expect(out.orchestration.clients.opencode).toEqual(doc.orchestration.clients.opencode)
    expect(out.orchestration.clients['claude-code']).toEqual({ roles: { backend: { model: 'opus' } } })
  })
})

describe('settings through the interface action', () => {
  test('saves a scope with the current revision and refuses a stale one or an invalid value', async ($, on) => {
    const w = new World()
    install(on, w)
    await $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
    const act = async (a: unknown) => JSON.parse((await $.command.run({ command: 'stip-action', args: JSON.stringify(a), origin: { kind: 'plugin', name: 'stipulate' } } as never)).text!)
    const loaded = await act({ action: 'settings-load' })
    expect(loaded.ok).toBe(true)
    expect(loaded.value.paths.personal).toBe('/home/u/.claude/stipulate.json')
    const bad = await act({ action: 'settings-save', scope: 'local', value: { roles: { backend: { effort: 'huge' } } }, revision: loaded.value.revision })
    expect(bad.ok).toBe(false)
    expect(bad.error).toMatch(/effort must be/)
    const stale = await act({ action: 'settings-save', scope: 'local', value: {}, revision: 'stale' })
    expect(stale.error).toMatch(/changed elsewhere/)
    const saved = await act({ action: 'settings-save', scope: 'local', value: { roles: { backend: { model: 'opus' } } }, revision: loaded.value.revision })
    expect(saved.ok).toBe(true)
    expect(JSON.parse(w.files.get(`${ROOT}/.workflow/local.json`)!).orchestration.clients['claude-code'].roles.backend.model).toBe('opus')
    expect(saved.value.effective.client.roles.backend.model).toBe('opus')
    // Agent types are re-registered with the new profile.
    expect(w.registeredAgents.filter(a => a.name === 'backend').at(-1)!.model).toBe('opus')
  })
})
