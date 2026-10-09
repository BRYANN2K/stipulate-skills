// AC-20 / AC-27: the Settings tab of the one Stip pane, in the Ledger look (ledger-preview-v3.html):
// header (change picker, Plan/Settings tabs), scope chips and the scope file's path; a "Models by
// role" card (the orchestrator, read-only; Defaults; one row per role in use with Model · Effort ·
// Isolation pickers; roles that inherit everything on one dimmed row; other roles and Add role); a
// "Limits and guards" card with the motion setting (AC-36); a save bar. A row's › opens its effective resolution and phase
// overrides. Validated before save, saved with the optimistic revision (actions.ts). Then the project's
// "Extensions" card (AC-47, AC-48): each extension of .workflow/extensions/ with its description and an
// On/Off button that saves `extensions.<id>.enabled` at once, the person's press only (AC-49).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { APPLY_GATES, EFFORTS, PHASES, SCOPES, resolveProfile } from '../core/settings.ts'
import type { StipEffectiveSettings, StipMotion, StipProjectExtension, StipScope, StipSnapshot } from '../../types'
import { MOTIONS } from '../core/ledger.ts'
import { namesFit } from './graph.ts'
import {
  CUSTOM_MODEL,
  EFFORT_GLYPH,
  MODEL_CHOICES,
  PANE_ID,
  SETTINGS_TITLE,
  asDraft,
  buttonsCells,
  changeCount,
  chipId,
  chipsFit,
  decodeUi,
  draftFrom,
  friendlyModel,
  phaseForRole,
  previewOf,
  profileAt,
  roleNameError,
  setApplyGate,
  setMotion,
  setField,
  shortPath,
  shortenWords,
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
// The pane's UI state (the Plan tab's): whether `+n` lists every chip.
const uiAtom = atom({ plugin: 'stipulate', key: 'selectedTask' } as const, null)

const UNSET = '@inherited'
const LAYER: Record<Target['kind'], string> = { defaults: 'defaults', role: 'role', phase: 'phase', 'phase-role': 'phase-role' }
const SCOPE_LABEL: Record<StipScope, string> = { personal: 'Personal', project: 'Project', local: 'Local' }
/** The row key of the group of roles that inherit everything. */
const INHERITED = 'inherited'

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
function resolved(eff: StipEffectiveSettings | null, row: TableRow, s: StipSnapshot | null) {
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
    const terminal = e.surface === 'terminal'
    const width = Math.max(24, e.props.bodyColumns)
    const inner = width - 4
    const view = await read($, settingsAtom)
    const snapshot = await read($, snapshotAtom)
    const draft = asDraft(await read($, draftAtom)) ?? draftFrom(view, 'project')
    const checked = previewOf(view, draft)
    const eff = checked.eff ?? view?.effective ?? null
    const stored = view?.byScope[draft.scope] ?? {}
    const changes = changeCount(stored, draft.value)
    const home = (await $.env.get('HOME').catch(() => undefined)) ?? null

    const edit = (fn: (d: Draft) => Draft) => void editDraft($, d => ({ ...fn(d), error: null, notice: null }))
    const set = (target: Target, key: ProfileKey, v: string | number | boolean | undefined) => edit(d => ({ ...d, value: setField(d.value, target, key, v) }))

    // --- Rows: Defaults, the roles in use, phase overrides (and pending new ones) ---
    const addedRoles = (draft.pending ?? []).filter(k => k.startsWith('role:')).map(k => k.slice(5))
    const rows = tableRows(snapshot, draft.value, addedRoles)
    for (const key of draft.pending ?? []) {
      if (rows.some(r => r.key === key)) continue
      const [, a, b] = key.split(':')
      if (key.startsWith('pr:') && a && b) rows.push({ key, target: { kind: 'phase-role', phase: a, role: b }, role: b, phase: a, label: `${b} in ${a}` })
      else if (key.startsWith('phase:') && a) rows.push({ key, target: { kind: 'phase', phase: a }, role: 'all roles', phase: a, label: `all roles in ${a}` })
    }
    const own = (r: TableRow) => profileAt(draft.value, r.target) ?? {}
    const hasOwn = (r: TableRow) => ['model', 'effort', 'isolate', 'agent'].some(k => k in own(r))
    const roleRows = rows.filter(r => r.target.kind === 'role')
    // In use: the plan's roles, research (helpers), configured and newly added ones.
    const inUse = roleRows.filter(r => r.inPlan || r.role === 'research' || r.configured || hasOwn(r))
    const others = roleRows.filter(r => !inUse.includes(r))
    // Roles that set nothing of their own share one row (when there are several).
    const bare = inUse.filter(r => !hasOwn(r) && !addedRoles.includes(r.role))
    const grouped = bare.length > 1 ? bare : []
    const single = inUse.filter(r => !grouped.includes(r))
    const overrides = rows.filter(r => r.target.kind === 'phase' || r.target.kind === 'phase-role')
    const planCount = roleRows.filter(r => r.inPlan).length

    // The orchestrator is this session: its model (and effort once a turn has run) as the host reports them.
    const sessionModel = await $.session.model().catch(() => null)
    const orchModel = friendlyModel(sessionModel) ?? sessionModel ?? 'unknown'
    const orchEffort = orchestratorEffort.value && EFFORT_GLYPH[orchestratorEffort.value] ? effortWord(orchestratorEffort.value) : null

    /** A cell: a Select where the surface has one, else a button cycling through the options. */
    const picker = (key: string, options: { value: string; label: string }[], value: string, apply: (v: string) => void) => {
      const current = options.find(o => o.value === value) ?? options[0]!
      if (Select)
        return (
          <Box key={`cell-${key}`} flexShrink={0}>
            <Select key={key} options={options} value={current.value} onSelect={v => apply(v)} />
          </Box>
        )
      const at = options.indexOf(current)
      const following = options[(at + 1) % options.length]!
      return (
        <Box key={`cell-${key}`} flexShrink={0}>
          <Button key={key} label={current.label} plain onPress={() => apply(following.value)} />
        </Box>
      )
    }

    const card = (key: string, title: string, right: string | null, body: unknown[]) => (
      <Box key={key} flexDirection="column" borderStyle="round" borderDimColor paddingX={1} width={width} flexShrink={0}>
        <Box key={`${key}-hd`} flexDirection="row" justifyContent="space-between">
          <Text dimColor>{title}</Text>
          {right && title.length + right.length + 2 <= inner ? <Text dimColor>{right}</Text> : null}
        </Box>
        {body as never}
      </Box>
    )

    /** A row's first line: name (bold) and subtitle (dim), the › button on the right. */
    const headLine = (key: string, name: string, subtitle: string, open: boolean | null, tone: { dimColor?: boolean } = {}) => {
      const btn = open === null ? 0 : buttonsCells([{ label: '›', plain: true }]) + 1
      const room = inner - btn
      const shownName = name.length <= room ? name : shortenWords(name, room)
      const sub = subtitle && shownName.length + 3 + subtitle.length <= room ? subtitle : ''
      return (
        <Box key={`sname-${key}`} flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" flexShrink={1}>
            <Text bold {...tone} wrap="truncate-end">
              {shownName}
            </Text>
            {sub ? <Text dimColor>{` · ${sub}`}</Text> : null}
          </Box>
          {open === null ? null : <Button key={`sopen:${key}`} label={open ? '▾' : '›'} plain dimColor onPress={viaHook} />}
        </Box>
      )
    }

    /** The three pickers of a row; an inherited value reads `(value)`. */
    const cells = (row: TableRow) => {
      const mine = own(row)
      const r = resolved(eff, row, snapshot)
      const modelOwn = typeof mine.model === 'string' ? mine.model : undefined
      const modelOptions = [
        { value: UNSET, label: `(${modelWord(r?.model ?? 'inherit')})` },
        ...MODEL_CHOICES,
        ...(modelOwn && !MODEL_CHOICES.some(c => c.value === modelOwn) ? [{ value: modelOwn, label: friendlyModel(modelOwn) ?? modelOwn }] : []),
        ...(Input ? [{ value: CUSTOM_MODEL, label: 'Custom id…' }] : []),
      ]
      const effortOptions = [{ value: UNSET, label: `(${effortWord(r?.effort ?? 'inherit')})` }, ...EFFORTS.map(x => ({ value: x, label: effortWord(x) }))]
      const isoOptions = [
        { value: UNSET, label: `(${isolationWord(Boolean(r?.isolate))})` },
        { value: 'true', label: 'own worktree' },
        { value: 'false', label: 'shared' },
      ]
      return (
        <Box key={`sval-${row.key}`} flexDirection="row" flexWrap="wrap" columnGap={1}>
          {picker(`m:${row.key}`, modelOptions, modelOwn ?? UNSET, v => (v === CUSTOM_MODEL ? edit(d => ({ ...d, customFor: row.key })) : set(row.target, 'model', v === UNSET ? undefined : v)))}
          {picker(`e:${row.key}`, effortOptions, typeof mine.effort === 'string' ? mine.effort : UNSET, v => set(row.target, 'effort', v === UNSET ? undefined : v))}
          {picker(`i:${row.key}`, isoOptions, mine.isolate === undefined ? UNSET : String(mine.isolate), v => set(row.target, 'isolate', v === UNSET ? undefined : v === 'true'))}
        </Box>
      )
    }

    // --- Effective resolution (in a row's details) ---
    const effOf = (r: TableRow) => {
      const phase = phaseForRole(snapshot, r.role)
      try {
        const p = eff ? resolveProfile(eff, r.role, phase, { writing: r.role !== 'research' }) : null
        return { label: `${r.role}/${phase}`, model: p ? modelWord(p.model) : 'unknown', effort: p ? effortWord(p.effort) : '', iso: p ? isolationWord(p.isolate) : '' }
      } catch (err) {
        return { label: `${r.role}/${phase}`, model: message(err), effort: '', iso: '' }
      }
    }
    const effLine = (r: ReturnType<typeof effOf>) => (
      <Box key={`eff-${r.label}`} flexDirection="row" flexWrap="wrap" columnGap={1}>
        <Text dimColor>{r.label}</Text>
        <Text>{r.model}</Text>
        {r.effort ? <Text color="claude">{r.effort}</Text> : null}
        <Text dimColor>{r.iso}</Text>
      </Box>
    )

    const details = (row: TableRow) => {
      const body: unknown[] = []
      if (row.target.kind === 'defaults') {
        body.push(
          <Text dimColor>{checked.eff && changes ? 'Resolves to, with this draft:' : 'Resolves to:'}</Text>,
          ...roleRows.map(r => effLine(effOf(r))),
          ...(eff ? [<Text dimColor wrap="wrap">{`limits: ${eff.limits.max_workers} workers · ${eff.limits.max_shared_writers} parallel writers · apply gate ${eff.applyGate}`}</Text>] : []),
        )
        // A phase override for all roles or one role: role, then phase.
        const roleNames = roleRows.map(r => r.role)
        body.push(
          <Box key="add-override" flexDirection="row" flexWrap="wrap" columnGap={1}>
            {draft.addRole
              ? picker(
                  'add-phase',
                  [{ value: UNSET, label: `${draft.addRole === '*' ? 'all roles' : draft.addRole} in… (pick a phase)` }, ...PHASES.map(p => ({ value: p, label: p }))],
                  UNSET,
                  v => {
                    if (v === UNSET) return
                    const key = draft.addRole === '*' ? `phase:${v}` : `pr:${v}:${draft.addRole}`
                    edit(x => ({ ...x, addRole: null, pending: [...new Set([...(x.pending ?? []), key])] }))
                  },
                )
              : picker('add-role', [{ value: UNSET, label: 'Add phase override…' }, { value: '*', label: 'all roles' }, ...roleNames.map(r => ({ value: r, label: r }))], UNSET, v => v !== UNSET && edit(x => ({ ...x, addRole: v })))}
          </Box>,
        )
      } else if (row.target.kind === 'role') {
        const role = row.target.role
        body.push(effLine(effOf(row)))
        body.push(
          picker(`add-phase-for:${role}`, [{ value: UNSET, label: `Override ${role} in a phase…` }, ...PHASES.map(p => ({ value: p, label: p }))], UNSET, v => {
            if (v !== UNSET) edit(x => ({ ...x, pending: [...new Set([...(x.pending ?? []), `pr:${v}:${role}`])] }))
          }),
        )
      } else {
        body.push(<Text dimColor wrap="wrap">{`Applies to ${row.target.kind === 'phase' ? 'every role' : row.target.role} while the task's phase is ${row.target.phase}.`}</Text>)
      }
      return (
        <Box key={`sdet-${row.key}`} flexDirection="column" paddingLeft={2}>
          {body as never}
        </Box>
      )
    }

    const settingRow = (row: TableRow, subtitle: string) => {
      const open = draft.open === row.key
      const name = row.target.kind === 'defaults' ? 'Defaults' : row.target.kind === 'role' ? row.role : row.label
      return (
        <Box key={`srow-${row.key}`} flexDirection="column">
          {headLine(row.key, name, subtitle, open)}
          {cells(row)}
          {draft.customFor === row.key && Input ? (
            <Box key={`custom-box-${row.key}`} paddingLeft={2}>
              <Input key={`custom:${row.key}`} label="Model id" placeholder="claude-…" onSubmit={v => edit(d => ({ ...d, customFor: null, value: setField(d.value, row.target, 'model', v.trim() || undefined) }))} />
            </Box>
          ) : null}
          {open ? details(row) : null}
        </Box>
      )
    }
    const subtitleOf = (r: TableRow) => (r.inPlan ? 'in plan' : r.role === 'research' ? 'helpers' : addedRoles.includes(r.role) ? 'new' : 'configured')

    // The group of roles that inherit everything: their names, what they resolve to, dimmed.
    const groupOpen = draft.open === INHERITED
    const groupView = grouped.length ? (
      <Box key={`srow-${INHERITED}`} flexDirection="column">
        {headLine(INHERITED, namesFit(grouped.map(r => r.role), inner - 2, ' · '), grouped.some(r => r.inPlan) ? 'in plan · inherited' : 'inherited', groupOpen, { dimColor: true })}
        {(() => {
          const r = resolved(eff, grouped[0]!, snapshot)
          const text = r ? [modelWord(r.model), effortWord(r.effort), isolationWord(Boolean(r.isolate)), 'inherited'].join(' · ') : 'inherited'
          return (
            <Box key="sval-inherited">
              <Text dimColor wrap="truncate-end">
                {shortenWords(text, inner)}
              </Text>
            </Box>
          )
        })()}
        {groupOpen ? (
          <Box key="inherited-members" flexDirection="column" paddingLeft={2}>
            {grouped.map(r => settingRow(r, subtitleOf(r)))}
          </Box>
        ) : null}
      </Box>
    ) : null

    // --- Header: change picker, tabs ---
    const changeId = snapshot?.changeId ?? null
    const tabs = [
      { key: 'tab-plan', label: 'Plan' },
      { key: 'tab-settings', label: width < 40 ? 'S ▾' : 'Settings ▾' },
    ]
    const pickerRoom = width - buttonsCells(tabs) - 1 - 6
    const pickerLabel = `${changeId ? shortenWords(changeId, Math.max(4, pickerRoom)) : 'no change'} ▾`

    // --- The bound change's extension chips (AC-44), read-only here: they change on the Plan tab ---
    // Never wider than the pane (a long id shortened); `+n` lists them all, `▴` folds them back.
    const selected = changeId ? (snapshot?.extensions ?? []) : []
    const allChips = decodeUi(await read($, uiAtom)).extAll
    const chipLabel = (id: string) => chipId(id, width - 2)
    const chipFit = chipsFit(selected.map(id => `◇ ${chipLabel(id)}`.length), width)
    const chipView = (id: string) => (
      <Box key={`ext-${id}`} flexShrink={0}>
        <Text>
          <Text color="claude">{'◇ '}</Text>
          <Text>{chipLabel(id)}</Text>
        </Text>
      </Box>
    )
    const moreBtn = (label: string) => <Button key="ext-more" label={label} plain dimColor onPress={viaHook} />
    const extChips = !selected.length ? null : allChips ? (
      <Box key="ext-chips" flexDirection="row" flexWrap="wrap" columnGap={1} width={width}>
        {selected.map(chipView)}
        {moreBtn('▴')}
      </Box>
    ) : (
      <Box key="ext-chips" flexDirection="row" gap={1} width={width}>
        {selected.slice(0, chipFit.shown).map(chipView)}
        {chipFit.more ? moreBtn(chipFit.more) : null}
      </Box>
    )

    // --- Scope chips and path ---
    const path = view?.paths[draft.scope] ?? ''
    const chipsW = SCOPES.reduce((n, sc) => n + SCOPE_LABEL[sc].length + 2, 0) + 2
    const pathRoom = width - chipsW - 1
    const scopeChips = SCOPES.map(sc => {
      const current = sc === draft.scope
      if (terminal && current)
        return (
          <Text backgroundColor="suggestion" color="inverseText" bold>
            {` ${SCOPE_LABEL[sc]} `}
          </Text>
        )
      return <Button key={`scope:${sc}`} label={SCOPE_LABEL[sc]} {...(terminal ? { plain: true as const, dimColor: true } : current ? { variant: 'primary' as const } : {})} onPress={viaHook} />
    })

    // --- Limits ---
    const d = draft.value.defaults ?? {}
    const stepper = (key: 'max_workers' | 'max_shared_writers', label: string) => {
      const v = d[key]
      const shown = v ?? eff?.limits[key] ?? (key === 'max_workers' ? 2 : 1)
      return (
        <Box key={key} flexDirection="row" gap={1}>
          <Text>{label}</Text>
          <Button key={`${key}-dec`} label="−" dimColor onPress={() => set({ kind: 'defaults' }, key, Math.max(1, shown - 1))} />
          <Text bold={v !== undefined} dimColor={v === undefined}>
            {String(shown)}
          </Text>
          <Button key={`${key}-inc`} label="+" dimColor onPress={() => set({ kind: 'defaults' }, key, Math.min(8, shown + 1))} />
        </Box>
      )
    }
    const gateOwn = draft.value.enforcement?.apply_gate
    const gateSetElsewhere = SCOPES.some(sc => sc !== draft.scope && view?.byScope[sc]?.enforcement?.apply_gate !== undefined)
    const gateOptions = [{ value: UNSET, label: `(${eff?.applyGate ?? 'block'})` }, ...APPLY_GATES.map(g => ({ value: g, label: g }))]
    // AC-36: Auto plays every frame, Calm keeps state changes without in-between frames, Off shows final states.
    const motionOwn = draft.value.ui?.motion
    const motionSetElsewhere = SCOPES.some(sc => sc !== draft.scope && view?.byScope[sc]?.ui?.motion !== undefined)
    const MOTION_LABEL = { auto: 'Auto', calm: 'Calm', off: 'Off' } as const
    const motionOptions = [{ value: UNSET, label: `(${MOTION_LABEL[eff?.motion ?? 'auto']})` }, ...MOTIONS.map(m => ({ value: m, label: MOTION_LABEL[m] }))]

    const status = checked.error
      ? { text: `Not valid: ${checked.error}`, color: 'error' }
      : draft.error
        ? { text: draft.error, color: 'error' }
        : draft.notice
          ? { text: draft.notice, color: 'success' }
          : changes
            ? { text: `Unsaved · ${changes} change${changes === 1 ? '' : 's'}`, color: 'warning' }
            : { text: 'Saved', dimColor: true }

    // --- Project extensions (AC-47, AC-48): enabling offers one to changes; a change selects its own ---
    const exts = view?.extensions ?? []
    const extRow = (x: StipProjectExtension) => {
      const btn = { label: x.enabled ? 'On' : 'Off' }
      const room = inner - buttonsCells([btn]) - 1
      const notes = [x.description ?? (x.present ? 'No description.' : 'No folder in .workflow/extensions/.'), x.selectedBy.length ? `Selected by ${x.selectedBy.join(', ')}.` : null].filter(Boolean).join(' ')
      return (
        <Box key={`ext-row-${x.id}`} flexDirection="column">
          <Box key={`ext-line-${x.id}`} flexDirection="row" justifyContent="space-between">
            <Box flexShrink={1}>
              <Text bold {...(x.enabled ? {} : { dimColor: true })} wrap="truncate-end">
                {shortenWords(x.id, Math.max(4, room))}
              </Text>
            </Box>
            <Button key={`ext-toggle:${x.id}`} label={btn.label} {...(x.enabled ? { variant: 'primary' as const } : { dimColor: true })} onPress={viaHook} />
          </Box>
          <Text dimColor wrap="wrap">
            {notes}
          </Text>
        </Box>
      )
    }
    const extStatus = draft.extError ? { text: draft.extError, color: 'error' } : draft.extNotice ? { text: draft.extNotice, color: 'success' } : null
    const extensionsCard = card('extensions', 'Extensions', exts.length ? `project · ${exts.filter(x => x.enabled).length} of ${exts.length} on` : 'project', [
      ...(exts.length ? exts.map(extRow) : [<Text dimColor wrap="wrap">No extension in .workflow/extensions/ yet.</Text>]),
      <Box key="ext-hint">
        <Text dimColor wrap="wrap">
          On makes an extension available to changes; each change selects its own while exploring. Saved on press.
        </Text>
      </Box>,
      ...(extStatus
        ? [
            <Box key="ext-status">
              <Text color={extStatus.color} wrap="wrap">
                {extStatus.text}
              </Text>
            </Box>,
          ]
        : []),
    ])

    const defaultsRow = rows.find(r => r.target.kind === 'defaults')!
    return (
      <Box flexDirection="column" width={width}>
        <Box key="head" flexDirection="row" justifyContent="space-between" width={width}>
          <Button key="settings-picker" label={pickerLabel} onPress={viaHook} />
          <Box key="tabs" flexDirection="row" gap={1} flexShrink={0}>
            {tabs.map(t => (
              <Button key={t.key} label={t.label} {...(t.key === 'tab-plan' ? { dimColor: true } : {})} onPress={viaHook} />
            ))}
          </Box>
        </Box>
        {extChips}
        <Box key="scopes" flexDirection="row" flexWrap="wrap" columnGap={1}>
          {scopeChips}
          {pathRoom >= 12 ? (
            <Box key="path">
              <Text dimColor wrap="truncate-middle">
                {shortenPath(shortPath(path, home), pathRoom)}
              </Text>
            </Box>
          ) : null}
        </Box>
        {pathRoom < 12 ? (
          <Box key="path">
            <Text dimColor wrap="truncate-middle">
              {shortenPath(shortPath(path, home), width)}
            </Text>
          </Box>
        ) : null}

        {card('roles', 'Models by role', planCount ? `${planCount} role${planCount === 1 ? '' : 's'} in plan` : null, [
          <Box key="orchestrator" flexDirection="column">
            <Box key="orch-line" flexDirection="row" justifyContent="space-between">
              <Text bold>Orchestrator</Text>
              {inner >= 30 ? <Text dimColor>/model · /effort</Text> : null}
            </Box>
            <Box key="orch-meta" flexDirection="row">
              <Text dimColor>{orchModel}</Text>
              {orchEffort ? <Text dimColor>{' · '}</Text> : null}
              {orchEffort ? <Text color="claude">{orchEffort}</Text> : null}
              <Text dimColor>
                {(() => {
                  const used = orchModel.length + (orchEffort ? orchEffort.length + 3 : 0)
                  const long = ' · this session · change with /model and /effort'
                  return used + long.length <= inner ? long : used + 15 <= inner ? ' · this session' : ''
                })()}
              </Text>
            </Box>
          </Box>,
          settingRow(defaultsRow, 'every role unless set'),
          groupView,
          ...single.map(r => settingRow(r, subtitleOf(r))),
          ...overrides.map(r => settingRow(r, r.target.kind === 'phase' ? 'override' : 'phase override')),
          ...(draft.showOther ? others.map(r => settingRow(r, 'not used')) : []),
          <Box key="other-roles" flexDirection="row" flexWrap="wrap" columnGap={1}>
            {others.length ? <Text dimColor>{`Other roles (${others.length})`}</Text> : null}
            {others.length ? <Button key="other-roles-toggle" label={draft.showOther ? 'Hide' : 'Show'} dimColor onPress={viaHook} /> : null}
          </Box>,
          <Box key="add-row" flexDirection="row" flexWrap="wrap" columnGap={1}>
            {Input ? (
              <Input
                key="add-role-name"
                label="+ Add role"
                placeholder="role-name"
                submitLabel="Add"
                onSubmit={v => {
                  const name = v.trim()
                  const why = roleNameError(name, roleRows.map(r => r.role))
                  void editDraft($, x =>
                    why
                      ? { ...x, error: `Role not added: ${why}`, notice: null }
                      : { ...x, error: null, notice: `Role ${name} added · give it a model or effort, then Save`, pending: [...new Set([...(x.pending ?? []), `role:${name}`])] },
                  )
                }}
              />
            ) : (
              <Text dimColor>Adding a role needs the terminal or desktop.</Text>
            )}
          </Box>,
        ])}

        {card('limits', 'Limits and guards', null, [
          <Box key="limits-steppers" flexDirection="row" flexWrap="wrap" columnGap={3}>
            {stepper('max_workers', 'Workers')}
            {stepper('max_shared_writers', 'Parallel writers')}
          </Box>,
          <Box key="gate-row" flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text>Apply gate</Text>
            {picker('apply-gate', gateOptions, gateOwn ?? UNSET, v => edit(x => ({ ...x, value: setApplyGate(x.value, v === UNSET ? undefined : v) })))}
            {gateOwn === undefined ? <Text dimColor>{gateSetElsewhere ? 'inherited' : 'default'}</Text> : null}
          </Box>,
          <Box key="motion-row" flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text>Motion</Text>
            {picker('motion', motionOptions, motionOwn ?? UNSET, v => edit(x => ({ ...x, value: setMotion(x.value, v === UNSET ? undefined : (v as StipMotion)) })))}
            {motionOwn === undefined ? <Text dimColor>{motionSetElsewhere ? 'inherited' : 'default'}</Text> : null}
          </Box>,
        ])}

        <Box key="actions" flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Button key="settings-save" label="Save" variant="primary" onPress={viaHook} />
          <Button key="settings-discard" label="Discard" onPress={viaHook} />
          <Box key="status" flexShrink={1}>
            <Text {...(status.color ? { color: status.color } : { dimColor: true })} wrap="wrap">
              {status.text}
            </Text>
          </Box>
        </Box>
        <Box key="running-note">
          <Text dimColor wrap="wrap">
            Running workers keep the model and effort recorded when they started; changes apply to the next delegation.
          </Text>
        </Box>
        {extensionsCard}
      </Box>
    )
  })
}

/** A path shortened from its middle at a `/` so it fits `room`; never cut inside a name. */
function shortenPath(path: string, room: number): string {
  if (path.length <= room) return path
  const parts = path.split('/')
  const last = parts.slice(-2).join('/')
  if (`…/${last}`.length <= room) return `…/${last}`
  return `…/${parts[parts.length - 1]}`
}
