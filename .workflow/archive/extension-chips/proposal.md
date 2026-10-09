# Show and enable extensions in the Stip mod

## Problem

The engine fully supports domain extensions, but the Claude Code mod barely shows them. A person cannot see at a glance which domains guide the current change, and cannot turn a project extension on or off without editing `.workflow/config.json` by hand. The launch film shows extension chips lighting up during Explore; the mod should match it.

Findings (classified per the security-engineering explore guidance):

- **Established.** The engine reads enabled extensions from `.workflow/config.json` (`scripts/workflow.py` 244-296), records the change's selection at `explore`/`select` (591-613), and invalidates approval when the selection changes (559). Workers receive each selected extension's `apply.md` in their brief (`packages/claude-code/hooks/core/brief.ts:129`). The approval text names the extensions (`hooks/core/index.ts:3176`).
- **Established.** The pane shows the selection only as one dim line, `Extensions: a, b`, at the bottom of the Explore view (`hooks/ui/pane.tsx:1104`). The header, Validate and Apply views do not show it.
- **Missing.** The Settings view (`hooks/ui/settings.tsx`, `hooks/core/settings.ts`) has no control for project extensions.
- **Missing.** `docs/claude-code-plugin.md` does not mention extensions.

## Scope

- Pane header: the bound change's selected extensions as chips, on terminal and desktop, in every bound view.
- Motion: a chip lights up once when an extension joins the selection (honours the `motion` setting).
- Settings: a project extensions card listing what `.workflow/extensions/` and the config hold, with an on/off control per extension.
- Docs: the mod guide explains what the chips mean and how enabling differs from selecting; the README gets new screenshots (D6).

Out of scope: changing the engine's extension model, the selection rules, or the extension catalog.

## Decisions and open questions

- D1 (security-engineering). Enabling or disabling a project extension changes what future workers may be told to follow. The Settings control acts only on a person's press, never from a model tool call, like approval (AC-14). It edits only the project config's `extensions.<id>.enabled` field and keeps the file's other content.
- D2. Enabling is not selecting. Turning an extension on in Settings does not add it to any change; selection stays with `explore`/`select`, which already invalidates approval.
- D3 (person, Q1). Header chips show only the change's selected extensions.
- D4 (person, Q2). While the change is exploring, the person can change the selection from the pane: pressing a chip removes that extension, and a `+ extension` control lists the project's enabled extensions not yet selected so one press adds it (assumption reconciling D3 with one-press adding; revisable at validation). Outside exploring the chips are read-only. Each change runs the engine's `select`, which already invalidates approval; only a person's press counts (D1).
- D5 (person, Q3). Disabling a project extension that a change not yet archived has selected is refused, and the refusal names that change.
- D6 (person). The README gets new screenshots of the real pane (terminal and desktop) with the chips and the Settings card, taken at the docs step from the built mod.
