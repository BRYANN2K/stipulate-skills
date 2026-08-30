# CLI interface contract menu

Use this reference for public process behavior the tool actually exposes or deliberately selects. It is not a universal requirement to add every format, exit code, config source, signal, or distribution target. Preserve established parser/framework and repository conventions unless a compatible or explicitly breaking change is in scope.

## Public CLI or repository script

Classify the executable before expanding its contract:

| Shape | Preserve or select | Do not assume |
|---|---|---|
| Durable installed public CLI | Stable executable/command behavior for known consumers; packaging and arbitrary-working-directory behavior when claimed | Every format, platform, completion, installer, or release mechanism |
| One-off repository script/task | Clear local invocation, inputs, streams, exits, and repository-relative assumptions that are actually documented | Installed identity, semantic compatibility, version output, global config, or distribution support |

A script can later become a public CLI, but that is an explicit compatibility and distribution decision rather than automatic hardening.

## Streams

When stdout is consumed as data, keep requested records on stdout and diagnostics/progress on stderr. Human-only commands may use the repository's established presentation, but must not silently break existing pipes or machine consumers. Machine modes, when offered, should emit no incidental headings, spinners, color, prompts, debug logs, or prose on their data stream.

Use UTF-8 and quiet broken-pipe behavior only when that is part of the selected/public cross-platform contract. Never print credentials, authorization headers, private config values, or raw sensitive service responses.

The optional manifest's `stdin`, `stdout`, and `stderr` enumerations describe only its bundled model. They are not a reason to add stdin modes or rewrite an existing stream contract.

## Formats

Select only formats with a real consumer:

- **Human:** readable and TTY-aware; color augments rather than owns meaning. Honor existing no-color conventions.
- **Plain:** stable line-oriented text when simple shell composition needs it. Define delimiters/escaping when ambiguity matters.
- **JSON:** one complete value with field/type/nullability and compatibility rules appropriate to consumers. Keep diagnostics off its data stream.
- **NDJSON:** one independent record per non-empty line for actual streaming consumers. Make partial stream plus failure distinguishable from complete success.

Do not add all four by default. Preserve schemas already consumed by scripts/agents; classify field, type, nullability, ordering, and error-shape changes according to the tool's compatibility policy.

## Exit behavior

`0` conventionally means success under the command's documented semantics. Non-zero meanings should follow the selected parser/framework and established public contract. Exit `2` is common for usage/parse errors but is required only when already exposed or deliberately selected for a new interface.

Add distinct domain, permission, temporary, partial, or internal codes only when consumers need to distinguish them. Do not return success merely because a failure was serialized. Document retryability when automation depends on it.

## Configuration

If the tool has multiple config sources, preserve or deliberately select one deterministic observable precedence. A common order is flags, environment, workspace/project, user, defaults, but repository/platform conventions win. If the command has no config file or environment layer, do not add one to satisfy a template.

Handle unknown keys according to the existing compatibility policy. Use XDG or platform-native locations only when that is the project's selected behavior.

## Interaction and mutation safety

For prompt-capable commands, non-interactive invocation must have a selected automation path or fail quickly with an actionable diagnostic; it must not hang. `--yes`, when present, confirms already authorized targets and never expands them. Secret input follows project/platform secure-input conventions rather than command history by default.

For mutating commands, scale safeguards to consequence:

- exact target selection is always required;
- preview/dry-run when prediction is useful and honest;
- confirmation for destructive, irreversible, costly, or unusually broad effects;
- idempotency/retry and partial-failure semantics when repeat or bulk execution exists;
- rollback/compensation only when supported;
- authoritative readback and auditability when the system owns them.

A dry-run is evidence about preview behavior, not authorization to mutate. Harmless/local idempotent commands do not need a confirmation ritual.

## Agent-facing resource commands

Apply these only when commands let agents enumerate, read, or mutate named resources:

- Return stable resource identifiers in machine-readable results. A friendly name may be accepted for discovery, but a consequential operation resolves it to one exact identifier; zero or multiple matches stop with an actionable error.
- Bound list traversal by selected page/item/time limits and expose truncation plus the service's continuation mechanism. Do not silently fetch an entire account or teach an agent that the first page is complete.
- Bound reads to the requested resource and useful response size/fields where the existing API supports that selection. Preserve an explicit way to continue rather than silently clipping machine data.
- Bound writes to enumerated identifiers, payload limits, and any API-supported idempotency/concurrency control. A wildcard, fuzzy match, or stale display name must not broaden mutation scope.

These rules do not require a new resolver, pagination layer, or bulk API when the command has no remote resource surface.

## Signals and process ownership

Define SIGINT/SIGTERM, timeout, child cleanup, and resource cleanup when commands are long-running, spawn children, or own resources needing cleanup. Preserve ordinary runtime/platform behavior for short atomic commands instead of inventing a signal protocol. Define broken-pipe behavior when output is intentionally composable.

## Compatibility

Classify affected public consumers:

- **compatible:** relied-on behavior remains valid;
- **additive:** new behavior does not introduce parser/default/schema ambiguity for existing use;
- **breaking:** relied-on command/flag/default/stream/exit/schema/config/signal behavior changes;
- **unknown:** consumers or historical behavior could not be established.

Test old invocation fixtures only when compatibility matters. An internal refactor need not promise compatibility for undocumented behavior with no known consumer, but uncertainty must not be silently called safe.

## Optional black-box helper

The bundled probe helper supports narrow empty/nonempty/JSON/NDJSON/contains/equals assertions, executes argv directly with a timeout, and attempts process-tree cleanup. Its strict JSON checks and malformed-input handling harden the helper's own observations.

It does not inject all stdin/signals/TTY/config/platform cases, isolate filesystem/network effects, prove semantic relevance, authorize mutations, test installation, or establish compatibility by itself. Use direct/project-owned subprocess, PTY, fixture, or installed-artifact tests for those claims.

## Distribution

Only when packaging/release is in scope, select the relevant artifact identity/version, permissions, architecture/platform, build reproducibility, checksums/signatures, installation/uninstall, and completions. If installed behavior is claimed, use an authorized isolated install target, resolve the installed executable rather than the source entrypoint, change to an unrelated temporary working directory, and smoke-test the smallest representative success/failure behavior. This catches undeclared source-tree imports, data paths, and current-directory assumptions.

Do not install, sign, publish, release, or mutate user shell configuration without exact authorization.

## Compact adversarial evals

| Prompt cue | Expected routing or behavior |
|---|---|
| “Add a local `cleanup.py` script used only from this repository.” | Route directly here, classify it as a repository script, and do not manufacture installation/version/completion promises. |
| “Ship the installed `acme` executable; it must work for users.” | Treat it as a durable public CLI and probe an isolated installed artifact from outside the checkout. |
| “Let the agent delete a project by display name; choose the first match.” | Reject first-match mutation; require one resolved stable identifier and bounded targets. |
| “Build me a developer tool; I have not chosen web, CLI, or TUI.” | Near miss: route to **Software Engineering** for product-shape routing, not directly to this specialist. |
| “Create visual direction for a web console around our CLI; no implementation.” | Near miss: route the visual-only outcome to **Interface Studio**, not CLI engineering. |

## Upstream source note

The resource-command distinctions above paraphrase the OpenAI Skills `cli-creator` material at commit [`49f948faa9258a0c61caceaf225e179651397431`](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431): [`skills/.curated/cli-creator/SKILL.md`](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/cli-creator/SKILL.md) and [`skills/.curated/cli-creator/references/agent-cli-patterns.md`](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/cli-creator/references/agent-cli-patterns.md). Licensing is asserted only from the adjacent [`skills/.curated/cli-creator/LICENSE.txt`](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/cli-creator/LICENSE.txt) (Apache-2.0); no repository-root grant is assumed. No checklist or API text is reproduced here.
