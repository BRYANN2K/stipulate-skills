# Native OpenCode qualification

This records local qualification on macOS on September 9–10, 2026. It is evidence for the tested build and host version, not a claim that every provider or future OpenCode beta has been exercised.

## Environment and installation

- OpenCode CLI: `0.0.0-beta-19296`.
- Native plugin SDK: the same pinned beta; OpenTUI 0.5.10 and Solid 1.9.12.
- Workflow: Python 3.10+ compatible; the full local suite ran on Python 3.14.
- A packed local distribution was installed with `npx` into a new Git project. It installed all seven skills, seven slash wrappers and the native plugin without editing OpenCode configuration files.
- Updating that managed installation preserved the project's extension configuration and model profile saved through `/stip-settings`. The update was also exercised with Node.js 22.20.0.
- The distribution excludes nested `node_modules`, Python bytecode and temporary test projects. Plugin dependencies are installed separately from the lockfile.

The terminal test used private OpenCode backends and separate data/state/cache directories. It did not start a web UI, deploy a service, launch Codex/Claude executables or publish anything.

## Complete lifecycle

The `add-greeting` change implemented a dependency-free Python `greet(name)` function. It trims surrounding whitespace, returns a greeting and raises `ValueError` for blank input. The backend-engineering extension was enabled and selected; unrelated domains were not made mandatory.

Bootstrap and exploration established the fixture and its domain constraints. The authorized fixture contract was approved with a schema-v2 execution plan. The main OpenCode agent then delegated implementation, independently verified the integrated candidate in another native session, delegated documentation, and reviewed each returned contribution. An outer Python harness independently exercised five input cases before recording the check.

| Role | Native child session | Runtime-confirmed model | Outcome |
| --- | --- | --- | --- |
| Backend | `ses_f77e04fb5ffeMGvt9BllTYJiyL` | `opencode/muse-spark-1.3-contributor-free#default` | Returned, then accepted after inspection and execution |
| Verification | `ses_f77ddafb2ffefR1GSz42cVNIGU` | `opencode/muse-spark-1.3-contributor-free#default` | Independent read-only checks, then accepted |
| Documentation | `ses_f77dafae7ffedpTUzR1GCkQaQx` | `opencode/muse-spark-1.3-contributor-free#low` | Guide examples executed, then accepted |

The first two roles inherited the coordinator's effective model. The Documentation model and `low` effort were selected and saved through the real terminal settings menu before dispatch. The native session confirmed the selected variant.

The fixture reached `archived` and created scoped local commit `d93088b459cde6dc063454a44c9cae5d990abc3f`. Its archive contains the accepted specification, evidence, execution plan and the engine-generated bounded execution summary for all three native sessions. The private registry was not committed. Subsequent installer/settings housekeeping is separate from that scoped feature commit.

An earlier fault-injection fixture exercised an interrupted native run and a scoped retry in the same worker session. Restart reconciliation retained uncertain work instead of duplicating it.

## Research before implementation approval

An explicit `stip_research` call asked a backend helper to inspect the existing function and guide, with no active implementation plan or `change_id`. Native child `ses_f77c6a4b1ffeMANE0FVg4Ip9T5` returned findings to the coordinator using `opencode/muse-spark-1.3-contributor-free#minimal`. The exploration phase's effort override selected `minimal` while the model was inherited. The helper had empty write ownership, created no contract/approval, and left the entire workflow source snapshot unchanged. Its private helper record remained separate from the archived implementation contributions.

This test caught an OpenCode boundary: a resumed session serializes its unset model variant as `default`, although the catalog need not contain a variant with that ID. Resolution now recognizes that host default while still rejecting other unknown variants. A regression test covers inheritance and effort selection from this session state.

## Visual checks

The native CLI was operated and inspected in Ghostty, with screenshots captured from the actual window:

- Stipulate's lifecycle and selected backend extension appeared below the MCP section.
- Returned work appeared as awaiting review before contribution acceptance.
- `/stip-settings` opened the native model catalog and advertised effort choices. Saving a Documentation profile persisted only the intended configuration layer.
- Fast was absent for the selected model because its catalog did not advertise a supported Fast option.
- `/stip-status` opened worker details, including selected and runtime-confirmed model/effort and owned paths.
- A single pointer click on Settings and a worker row opened a persistent dialog after button release. Sidebar actions now run on release; opening a dialog on button-down had allowed that same release to dismiss or select it immediately.
- Open native session navigated to the real worker conversation and its tool results.
- After archive, all seven lifecycle stages appeared complete; zero workers were running.

The host controls whether the sidebar is visible in narrow terminals and native child views. `/stip-status` provides the keyboard-accessible alternative.

On September 10, the user also confirmed operation inside Orca and supplied the four screenshots used in the README. They show a change awaiting approval, the active/archive selector, specialist settings and the model picker. These captures document the UI in that host; they do not claim a completed delegated implementation there. The installer now respects Orca's `OPENCODE_CONFIG_DIR` override for global plugin and command destinations; 12 installer tests and four launcher tests passed for that follow-up.

## Automated checks and boundaries

The initial native integration qualification passed **101 Python tests and 92 JavaScript tests**, TypeScript, and validation of all seven skill packages and 28 extension packages. The installer follow-up is recorded above. The [GitHub validation workflow](https://github.com/BRYANN2K/stipulate-skills/actions/workflows/validate.yml) runs the Python matrix and JavaScript/plugin checks on subsequent commits; consult that run for the current hosted result.

The Python suite covers legacy lifecycle behavior, v2 plan semantics and migrations, evidence invalidation, native configuration projection, scoped archive behavior and bounded provenance exports. The JavaScript suite covers native-host orchestration through a controlled test host, settings/capability resolution, race and failure cases, installation preservation and npm distribution contents. TypeScript checks the pinned public plugin/TUI/RPC API. Skill and extension validators verify all seven packages and 28 domain packages; editorial extension validation is not a behavioral certification.

Live provider calls used Muse Spark because it was available in the isolated OpenCode catalog. GPT Astra and Claude model calls were not exercised here. Codex/Claude native configuration files were qualified through file-generation tests; their runtimes were not launched. Fast combinations, unavailable-model handling and several race/permission failures were exercised through controlled tests rather than paid live provider calls.

The plugin serializes writes in a shared checkout. Ownership checks and native permission hooks are coordination controls, not an operating-system sandbox for arbitrary shell commands. Preserve the host's normal permission policy.

Reproduce the automated checks from the repository root:

```sh
python3 scripts/validate_skills.py
python3 scripts/validate_extensions.py
python3 -m unittest discover -s tests
npm ci --ignore-scripts --prefix packages/opencode
npm run typecheck --prefix packages/opencode
node --test packages/opencode/tests/*.test.mjs tests/*.mjs
```

For a live one-shot CLI test, use `opencode2 run --standalone` and `background:false` in delegation so the private backend remains alive until the worker returns. In the interactive TUI, background delegation was exercised with the native completion notification. Keep the fixture isolated and review actual files/results before accepting contributions.
