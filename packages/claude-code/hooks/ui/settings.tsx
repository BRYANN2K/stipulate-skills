// AC-20: the Settings tab of the one Stip pane: "who runs what". Scope switch, a table of
// Defaults, the roles in use and phase overrides (Role · Phase · Model · Effort · Isolation), every
// cell editable, inherited values marked; limits; Save / Discard with a status line; the effective
// resolution per role. Validated before save, saved with the optimistic revision (actions.ts).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { APPLY_GATES, EFFORTS, PHASES, SCOPES, resolveProfile } from '../core/settings.ts'
import type { StipEffectiveSettings, StipScope } from '../../types'
import {
  CUSTOM_MODEL,
  EFFORT_GLYPH,
  MODEL_CHOICES,
  PANE_ID,
  PLAN_TITLE,
  SETTINGS_TITLE,
  asDraft,
  cell,
  draftFrom,
  fit,
  friendlyModel,
  phaseForRole,
  previewOf,
  roleNameError,
  profileAt,
  setApplyGate,
  setField,
  shortPath,
  tableRows,
  viaHook,
  type Draft,
  type ProfileKey,
  type TableRow,
  type Target,
} from './model.ts'

const snapshotAtom = atom({ plugin: 'stipulate', key: 'snapshot' } as const, null)
const settingsAtom = atom({ plugin: 'stipulate', key: 'settings' } as const, null)
const draftAtom = atom({ plugin: 'stipulate', key: 'settingsDraft' } as const, null)

const UNSET = '@inherited'
const LAYER: Record<Target['kind'], string> = { defaults: 'defaults', role: 'role', phase: 'phase', 'phase-role': 'phase-role' }
const SCOPE_LABEL: Record<StipScope, string> = { personal: 'Personal', project: 'Project', local: 'Local' }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** The orchestrator's (this session's) effort, as its last model request carried it; null before one. */
const orchestratorEffort: { value: string | null } = { value: null }

/** The held draft, or a fresh one over the settings view (never written while drawing). */
async function currentDraft($: EngineInterface): Promise<Draft> {
  return asDraft(await read($, draftAtom)) ?? draftFrom(await read($, settingsAtom), 'project')
}

async function editDraft($: EngineInterface, fn: (d: Draft) => Draft) {
  const base = await currentDraft($)
  await update($, draftAtom, raw => fn(asDraft(raw) ?? base))
}

const effortWord = (e: string) => (EFFORT_GLYPH[e] ? `${EFFORT_GLYPH[e]} ${e}` : e)
const modelWord = (m: string) => friendlyModel(m) ?? 'inherit'
const isolationWord = (v: boolean) => (v ? 'own worktree' : 'shared')

/** What a row resolves to (its own layer included) and which layers set it. */
function resolved(eff: StipEffectiveSettings | null, row: TableRow, s: Parameters<typeof phaseForRole>[0]) {
  if (!eff) return null
  try {
    if (row.target.kind === 'defaults') {
      const d = eff.client.defaults ?? {}
      return { model: d.model ?? 'inherit', effort: d.effort ?? 'inherit', isolate: d.isolate ?? eff.limits.max_shared_writers > 1, sources: {} as Record<string, string> }
    }
    const role = row.target.kind === 'phase' ? 'any' : row.target.role
    const phase = row.target.kind === 'role' ? phaseForRole(s, row.target.role) : row.target.phase
    return resolveProfile(eff, role, phase, { writing: true })
  } catch {
    return null
  }
}

export const registerSettings: Register = on => {
  // Opens the Settings tab from the scopes as last read (the core reads them at start and after
  // every save); Discard re-reads them from disk.
  on('command.run', { command: 'stip-settings' }, async $ => {
    const held = asDraft(await read($, draftAtom))
    const view = await read($, settingsAtom)
    await update($, draftAtom, () => draftFrom(view, held?.scope ?? 'project', held?.target ?? { kind: 'defaults' }))
    const opened = await $.ui.open({ id: PANE_ID, title: SETTINGS_TITLE })
    $.ui.invalidate('ui.render')
    return { text: opened.isPlaced ? 'Stip settings opened.' : `Stip settings not placed: ${opened.reason}` }
  })

  // The host exposes the session's effort only on its model requests: note it from the main loop's.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && typeof e.effort === 'string') orchestratorEffort.value = e.effort
    return yield* next(e)
  })

  on('ui.render', { component: 'Pane', requestId: 'stipulate' }, async ($, e, next) => {
    if (e.props.title !== SETTINGS_TITLE) return next(e)
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    // Mobile draws no field yet (its table may still name one): buttons that cycle there.
    const Input = e.surface !== 'mobile' && 'Input' in els ? els.Input : null
    const Select = e.surface !== 'mobile' && 'Select' in els ? els.Select : null
    const width = Math.max(24, e.props.bodyColumns)
    const view = await read($, settingsAtom)
    const snapshot = await read($, snapshotAtom)
    const draft = asDraft(await read($, draftAtom)) ?? draftFrom(view, 'project')
    const checked = previewOf(view, draft)
    const eff = checked.eff ?? view?.effective ?? null
    const dirty = JSON.stringify(view?.byScope[draft.scope] ?? {}) !== JSON.stringify(draft.value)
    const home = (await $.env.get('HOME').catch(() => undefined)) ?? null

    const edit = (fn: (d: Draft) => Draft) => void editDraft($, d => ({ ...fn(d), error: null, notice: null }))
    const set = (target: Target, key: ProfileKey, v: string | number | boolean | undefined) => edit(d => ({ ...d, value: setField(d.value, target, key, v) }))

    // --- Rows: Defaults, roles in use and common ones, then overrides (and pending new ones) ---
    const addedRoles = (draft.pending ?? []).filter(k => k.startsWith('role:')).map(k => k.slice(5))
    const rows = tableRows(snapshot, draft.value, addedRoles)
    for (const key of draft.pending ?? []) {
      if (rows.some(r => r.key === key)) continue
      const [, a, b] = key.split(':')
      if (key.startsWith('pr:') && a && b) rows.push({ key, target: { kind: 'phase-role', phase: a, role: b }, role: b, phase: a, label: `${b} in ${a}` })
      else if (key.startsWith('phase:') && a) rows.push({ key, target: { kind: 'phase', phase: a }, role: 'all roles', phase: a, label: `all roles in ${a}` })
    }
    const PLAN_MARK = ' · in plan'
    const W = { role: Math.min(26, Math.max(9, ...rows.map(r => r.role.length + (r.inPlan ? PLAN_MARK.length : 0))) + 2), phase: 9, model: 28, effort: 22 }
    // Narrow (a docked desktop pane is ~45 cells) or mobile: one card per row instead of a table.
    const stacked = e.surface === 'mobile' || width < 90
    // Narrow: roles neither in the plan nor configured fold under "Other roles (N)".
    const others = rows.filter(r => r.target.kind === 'role' && !r.inPlan && !r.configured && !('model' in (profileAt(draft.value, r.target) ?? {})))
    const folded = stacked && !draft.showOther ? new Set(others.map(r => r.key)) : new Set<string>()
    // The orchestrator is this session: its model (and effort once a turn has run) as the host reports them.
    const sessionModel = await $.session.model().catch(() => null)
    const orchestrator = [friendlyModel(sessionModel) ?? sessionModel ?? 'unknown', orchestratorEffort.value && EFFORT_GLYPH[orchestratorEffort.value] ? `${EFFORT_GLYPH[orchestratorEffort.value]} ${orchestratorEffort.value}` : null]
      .filter(Boolean)
      .join(' ')

    /** A cell: a Select where the surface has one, else a button cycling through the options. */
    const picker = (key: string, options: { value: string; label: string }[], value: string, apply: (v: string) => void, w: number) => {
      const current = options.find(o => o.value === value) ?? options[0]!
      if (Select)
        return (
          <Box key={`cell-${key}`} {...(stacked ? {} : { width: w })} flexShrink={0}>
            <Select key={key} options={options} value={current.value} onSelect={v => apply(v)} />
          </Box>
        )
      const at = options.indexOf(current)
      const following = options[(at + 1) % options.length]!
      return (
        <Box key={`cell-${key}`} {...(stacked ? {} : { width: w })} flexShrink={0}>
          <Button key={key} label={current.label} plain onPress={() => apply(following.value)} />
        </Box>
      )
    }

    const tableRow = (row: TableRow) => {
      const own = profileAt(draft.value, row.target) ?? {}
      const r = resolved(eff, row, snapshot)
      const inherited = (k: 'model' | 'effort' | 'isolate') => !(k in own) && r !== null && (row.target.kind === 'defaults' || r.sources?.[k] !== LAYER[row.target.kind])
      const modelOwn = typeof own.model === 'string' ? own.model : undefined
      // The Defaults row inherits nothing from Stip: what it leaves unset is the host's default.
      const from = row.target.kind === 'defaults' ? '(default)' : '(inherited)'
      const modelOptions = [
        { value: UNSET, label: `${modelWord(r?.model ?? 'inherit')} ${from}` },
        ...MODEL_CHOICES,
        ...(modelOwn && !MODEL_CHOICES.some(c => c.value === modelOwn) ? [{ value: modelOwn, label: friendlyModel(modelOwn) ?? modelOwn }] : []),
        ...(Input ? [{ value: CUSTOM_MODEL, label: 'Custom id…' }] : []),
      ]
      const effortOptions = [
        { value: UNSET, label: `${effortWord(r?.effort ?? 'inherit')} ${from}` },
        ...EFFORTS.map(x => ({ value: x, label: effortWord(x) })),
      ]
      const isoOptions = [
        { value: UNSET, label: `${isolationWord(Boolean(r?.isolate))} ${from}` },
        { value: 'true', label: 'own worktree' },
        { value: 'false', label: 'shared' },
      ]
      const cells = (
        <>
          {picker(`m:${row.key}`, modelOptions, modelOwn ?? UNSET, v => (v === CUSTOM_MODEL ? edit(d => ({ ...d, customFor: row.key })) : set(row.target, 'model', v === UNSET ? undefined : v)), W.model)}
          {picker(`e:${row.key}`, effortOptions, typeof own.effort === 'string' ? own.effort : UNSET, v => set(row.target, 'effort', v === UNSET ? undefined : v), W.effort)}
          {picker(`i:${row.key}`, isoOptions, own.isolate === undefined ? UNSET : String(own.isolate), v => set(row.target, 'isolate', v === UNSET ? undefined : v === 'true'), 16)}
        </>
      )
      return (
        <Box key={`srow-${row.key}`} flexDirection="column">
          <Box flexDirection={stacked ? 'column' : 'row'} {...(stacked ? { marginTop: 1 } : {})}>
            {stacked ? (
              <Box key={`sname-${row.key}`} flexDirection="row" gap={1}>
                <Text bold>{row.target.kind === 'defaults' ? 'Defaults' : row.role}</Text>
                {row.inPlan ? <Text color="suggestion">in plan</Text> : null}
                <Text dimColor>{row.phase === 'all' ? 'all phases' : `in ${row.phase}`}</Text>
              </Box>
            ) : (
              <Box key={`sname-${row.key}`} flexDirection="row" flexShrink={0}>
                <Box width={W.role} flexShrink={0}>
                  <Text bold={row.target.kind === 'defaults'}>{row.role}</Text>
                  {row.inPlan ? <Text color="suggestion">{PLAN_MARK}</Text> : null}
                </Box>
                <Box width={W.phase} flexShrink={0}>
                  <Text dimColor>{`${row.phase} `}</Text>
                </Box>
              </Box>
            )}
            <Box flexDirection="row" flexWrap="wrap" {...(stacked ? { columnGap: 1 } : {})}>
              {cells}
            </Box>
          </Box>
          {draft.customFor === row.key && Input ? (
            <Box paddingLeft={W.role + W.phase}>
              <Input key={`custom:${row.key}`} label="Model id" placeholder="claude-…" onSubmit={v => edit(d => ({ ...d, customFor: null, value: setField(d.value, row.target, 'model', v.trim() || undefined) }))} />
            </Box>
          ) : null}
        </Box>
      )
    }

    // --- Limits row ---
    const d = draft.value.defaults ?? {}
    const stepper = (key: 'max_workers' | 'max_shared_writers', label: string) => {
      const v = d[key]
      const shown = v ?? eff?.limits[key] ?? (key === 'max_workers' ? 2 : 1)
      return (
        <Box key={key} flexDirection="row" gap={1}>
          <Text>{label}</Text>
          <Button key={`${key}-dec`} label="−" dimColor onPress={() => set({ kind: 'defaults' }, key, Math.max(1, shown - 1))} />
          <Text bold={v !== undefined} dimColor={v === undefined}>{String(shown)}</Text>
          <Button key={`${key}-inc`} label="+" dimColor onPress={() => set({ kind: 'defaults' }, key, Math.min(8, shown + 1))} />
        </Box>
      )
    }
    const gateOwn = draft.value.enforcement?.apply_gate
    const gateSetElsewhere = SCOPES.some(sc => sc !== draft.scope && view?.byScope[sc]?.enforcement?.apply_gate !== undefined)
    const gateOptions = [
      { value: UNSET, label: `${eff?.applyGate ?? 'block'} (${gateSetElsewhere ? 'inherited' : 'default'})` },
      ...APPLY_GATES.map(g => ({ value: g, label: g })),
    ]

    // --- Add a phase override: role (or all roles), then phase ---
    const roleNames = [...new Set(rows.filter(r => r.target.kind === 'role').map(r => r.role))]
    const addOverride = draft.addRole ? (
      picker(
        'add-phase',
        [{ value: UNSET, label: `${draft.addRole === '*' ? 'all roles' : draft.addRole} in… (pick a phase)` }, ...PHASES.map(p => ({ value: p, label: p }))],
        UNSET,
        v => {
          if (v === UNSET) return
          const key = draft.addRole === '*' ? `phase:${v}` : `pr:${v}:${draft.addRole}`
          edit(x => ({ ...x, addRole: null, pending: [...new Set([...(x.pending ?? []), key])] }))
        },
        36,
      )
    ) : (
      picker(
        'add-role',
        [{ value: UNSET, label: 'Add phase override…' }, { value: '*', label: 'all roles' }, ...roleNames.map(r => ({ value: r, label: r }))],
        UNSET,
        v => v !== UNSET && edit(x => ({ ...x, addRole: v })),
        30,
      )
    )

    // --- Effective resolution, aligned ---
    const effRows = rows
      .filter(r => r.target.kind === 'role')
      .map(r => {
        const phase = phaseForRole(snapshot, r.role)
        try {
          const p = eff ? resolveProfile(eff, r.role, phase, { writing: r.role !== 'research' }) : null
          return { label: `${r.role}/${phase}`, model: p ? modelWord(p.model) : '—', effort: p ? effortWord(p.effort) : '', iso: p ? isolationWord(p.isolate) : '' }
        } catch (err) {
          return { label: `${r.role}/${phase}`, model: message(err), effort: '', iso: '' }
        }
      })
    const labelW = Math.max(...effRows.map(r => r.label.length), 8) + 2
    const modelW = Math.max(...effRows.map(r => r.model.length), 6) + 2
    const effortW = Math.max(...effRows.map(r => r.effort.length), 6) + 2

    const status = checked.error
      ? { text: `Not valid: ${checked.error}`, color: 'error' }
      : draft.error
        ? { text: draft.error, color: 'error' }
        : draft.notice
          ? { text: draft.notice, color: 'success' }
          : dirty
            ? { text: 'Unsaved changes', color: 'warning' }
            : { text: 'Saved · matches the file', dimColor: true }
    const path = view?.paths[draft.scope] ?? ''

    return (
      <Box flexDirection="column" width={width}>
        <Box key="head" flexDirection={width < 70 ? 'column' : 'row'} justifyContent="space-between">
          <Box key="scopes" flexDirection="row" gap={1} flexWrap="wrap">
            <Text bold>Stip settings ·</Text>
            {SCOPES.map(scope => (
              <Button key={`scope:${scope}`} label={`${SCOPE_LABEL[scope]}${scope === draft.scope ? '●' : ''}`} variant={scope === draft.scope ? 'primary' : 'secondary'} onPress={viaHook} />
            ))}
          </Box>
          <Box key="tabs" flexDirection="row" gap={1} flexShrink={0}>
            <Button key="tab-plan" label="Plan" dimColor onPress={() => void ($.ui.open({ id: PANE_ID, title: PLAN_TITLE }).then(() => $.ui.invalidate('ui.render')))} />
            <Button key="tab-settings" label="Settings ▾" variant="primary" onPress={() => void $.ui.close({ id: PANE_ID }).then(() => $.ui.invalidate('ui.render'))} />
          </Box>
        </Box>
        <Box key="path">
          <Text dimColor wrap="truncate-middle">{fit(shortPath(path, home), width)}</Text>
        </Box>

        <Box key="orchestrator" flexDirection={stacked ? 'column' : 'row'} marginTop={1}>
          <Box flexDirection="row" {...(stacked ? { gap: 1 } : {})}>
            <Box {...(stacked ? {} : { width: W.role })} flexShrink={0}>
              <Text bold>Orchestrator</Text>
            </Box>
            <Box {...(stacked ? {} : { width: W.phase })} flexShrink={0}>
              <Text dimColor>{stacked ? 'all phases' : 'all'}</Text>
            </Box>
          </Box>
          <Box flexDirection="row" gap={1} flexWrap="wrap" {...(stacked ? {} : { flexShrink: 1 })}>
            <Text color="claude">{orchestrator}</Text>
            <Text dimColor>· this session — change with /model and /effort</Text>
          </Box>
        </Box>

        {stacked ? null : (
          <Box key="table-head" flexDirection="row" marginTop={1}>
            {(
              [
                ['Role', W.role],
                ['Phase', W.phase],
                ['Model', W.model],
                ['Effort', W.effort],
                ['Isolation', 16],
              ] as const
            ).map(([title, w]) => (
              <Box width={w} flexShrink={0}>
                <Text dimColor>{title}</Text>
              </Box>
            ))}
          </Box>
        )}
        {rows.filter(r => !folded.has(r.key)).map(tableRow)}
        {stacked && others.length ? (
          <Box key="other-roles" flexDirection="row" gap={1} marginTop={1}>
            <Text dimColor>{`Other roles (${others.length})`}</Text>
            <Button key="other-roles-toggle" label={draft.showOther ? 'Hide' : 'Show'} dimColor onPress={() => void editDraft($, d => ({ ...d, showOther: !d.showOther }))} />
          </Box>
        ) : null}
        <Box key="add-row" flexDirection="row" flexWrap="wrap" gap={1} marginTop={stacked ? 1 : 0}>
          {addOverride}
          {Input ? (
            <Input
              key="add-role-name"
              label="Add role…"
              placeholder="role-name"
              submitLabel="Add"
              onSubmit={v => {
                const name = v.trim()
                const why = roleNameError(name, rows.filter(r => r.target.kind === 'role').map(r => r.role))
                void editDraft($, d =>
                  why
                    ? { ...d, error: `Role not added: ${why}`, notice: null }
                    : { ...d, error: null, notice: `Role ${name} added · give it a model or effort, then Save`, pending: [...new Set([...(d.pending ?? []), `role:${name}`])] },
                )
              }}
            />
          ) : (
            <Text dimColor>Adding a role needs the terminal or desktop.</Text>
          )}
        </Box>

        <Box key="limits" flexDirection="row" flexWrap="wrap" gap={1} marginTop={1}>
          {stepper('max_workers', 'Workers')}
          <Text dimColor>·</Text>
          {stepper('max_shared_writers', 'Parallel writers')}
          <Text dimColor>·</Text>
          <Text>Apply gate</Text>
          {picker('apply-gate', gateOptions, gateOwn ?? UNSET, v => edit(x => ({ ...x, value: setApplyGate(x.value, v === UNSET ? undefined : v) })), 22)}
        </Box>

        <Box key="actions" flexDirection="row" gap={1} marginTop={1}>
          <Button key="settings-save" label="Save" variant="primary" onPress={viaHook} />
          <Button key="settings-discard" label="Discard" onPress={viaHook} />
          <Box key="status" flexShrink={1}>
            <Text {...(status.color ? { color: status.color } : { dimColor: true })} wrap="wrap">
              {status.text}
            </Text>
          </Box>
        </Box>

        <Box key="h-effective" marginTop={1}>
          <Text bold>{checked.eff ? 'Who runs what (with this draft)' : 'Who runs what (saved)'}</Text>
        </Box>
        {effRows.map(r => (
          <Box key={`eff-${r.label}`} flexDirection="row" flexWrap="wrap" {...(stacked ? { columnGap: 1 } : {})}>
            <Box {...(stacked ? {} : { width: labelW })} flexShrink={0}>
              <Text dimColor>{`${r.label}${stacked ? '' : ' '}`}</Text>
            </Box>
            <Box {...(stacked ? {} : { width: modelW })} flexShrink={0}>
              <Text>{`${r.model}${stacked ? '' : ' '}`}</Text>
            </Box>
            <Box {...(stacked ? {} : { width: effortW })} flexShrink={0}>
              <Text color="claude">{`${r.effort}${stacked ? '' : ' '}`}</Text>
            </Box>
            <Text dimColor>{r.iso}</Text>
          </Box>
        ))}
        {eff ? (
          <Box key="limits-eff">
            <Text dimColor wrap="wrap">{`limits: ${eff.limits.max_workers} workers · ${eff.limits.max_shared_writers} parallel writers · apply gate ${eff.applyGate}`}</Text>
          </Box>
        ) : null}
        <Box key="running-note" marginTop={1}>
          <Text dimColor wrap="wrap">
            Running workers keep the model and effort recorded when they started; changes apply to the next delegation.
          </Text>
        </Box>
      </Box>
    )
  })
}
