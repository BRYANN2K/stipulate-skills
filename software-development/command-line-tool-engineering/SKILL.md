---
name: command-line-tool-engineering
description: "Use when building or changing a line-oriented command-line tool intended for humans, scripts, automation, or agents. Preserves the process contracts the tool actually exposes, selects new stream, format, exit, config, signal, and distribution behavior deliberately, and scales optional manifests and black-box probes to compatibility and release claims."
license: Apache-2.0
compatibility: Works with any CLI language or framework and Agent Skills-compatible client. The optional contract/probe helper requires Python 3.10 or newer and uses only the standard library.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: software-development
  tags: cli, command-line, unix, automation, json, black-box-testing
---

# Command-Line Tool Engineering

## Overview

Build and change CLIs through their actual public process boundary. Inherit established command names, parser conventions, streams, exit meanings, config sources, signals, packaging, and compatibility policy. For a new tool, select only the interfaces its real human or automation consumers need; do not manufacture JSON, NDJSON, config layers, signal contracts, completions, or platform promises.

A clear request to change a bounded local command authorizes the necessary local source writes and safe local probes. It does not require a manifest, all output modes, exit code `2`, a distribution matrix, or separate implementation approval.

<HARD-GATE>
Never conceal destructive behavior behind an ordinary-looking command, prompt when the active non-interactive contract cannot answer, leak credentials/private responses, place diagnostics into a declared machine-data stream, execute shell strings assembled from untrusted input, or silently break a public process contract. Real resource mutation, credential access, dependency installation or changes, user-level installation/config mutation, signing, publishing, release, and deployment require explicit authorization and bounded targets.
</HARD-GATE>

## When to use

- Build a new executable, subcommand, line-oriented tool, automation client, or agent-facing CLI.
- Change flags, arguments, stdin/stdout/stderr, machine output, exit behavior, configuration, signals, progress, confirmation, dry-run, or packaging.
- Stabilize an exposed interface for pipelines, CI, scripts, agents, or human operators.
- Audit compatibility, non-interactive behavior, error actionability, or distribution.

Use `terminal-ui-engineering` when the program owns full-screen frames, focus, resize, and terminal modes.

## Task modes

| Mode | Default path | Evidence target |
|---|---|---|
| Bounded edit | Inspect the affected command and public consumers, edit directly, preserve exposed behavior | Focused unit/public-interface or subprocess probe |
| New behavior or surface | Define one user task and the minimum selected process contract; implement one independently useful command slice | Happy/failure subprocess behavior for the interfaces actually introduced |
| Complex contract or migration | Change several commands, automation schemas, config precedence, exit mappings, or compatibility | Consumer/evidence map, optional manifest lint and configured probes |
| Release or live effect | Separate source readiness from install, signing, package publication, release, mutation, or deployment | Exact authorization, built/installed artifact and target readback |

## Workflow

### 1. Inspect the exposed boundary

First classify the target as either a durable installed public CLI or a one-off repository script/task. An installed CLI may owe consumers stable executable identity, invocation from arbitrary working directories, compatibility, packaging, and install behavior. A repository script may still need clear argv, stream, and exit behavior, but it does not acquire version, completion, multi-platform, or installation promises merely because it is command-line code.

Read applicable instructions, executable entrypoint, parser/command tree, business/service layer, configuration, rendering/error mapping, signal handling, tests, packaging/release configuration, and Git status only as far as the slice needs. Exercise existing help/version safely when useful.

Identify the actual consumers and which command names, flags, positional syntax, streams, formats, exit values, configuration sources, signals, and platforms are public or relied upon. Ask only when missing intent materially changes compatibility, automation, mutation safety, or distribution.

### 2. Preserve or select the contract deliberately

Existing public behavior wins unless a breaking change is explicitly in scope. For a new interface, choose the smallest coherent contract:

- separate requested data from diagnostics when stdout is consumed by pipes or machine readers;
- add plain/JSON/NDJSON only for a real consumer and define the stability it needs;
- use the parser/framework's established usage-error code; select exit `2` only when that is the existing or chosen public convention;
- define precedence only for configuration sources the tool actually supports;
- define SIGINT/SIGTERM/child cleanup only for long-running work or resources that need it; preserve ordinary platform behavior otherwise;
- define broken-pipe behavior when output is pipeline-oriented;
- design completions, multi-platform artifacts, checksums/signing, install/uninstall, and reproducibility only when distribution is in scope.

For complex machine-facing or multi-command work, optionally use `templates/cli-contract.json` as scratch memory and run:

```bash
python3 <skill-directory>/scripts/cli_contract.py check --manifest /tmp/cli-contract.json --json
```

The bundled template is a **hardened example**, not a list of universal requirements: its four formats, exit `2`, config order, signals, platforms, completions, and probes are optional selections. Adapt or omit the artifact if it does not match the public contract; never change the CLI merely to make the template pass. A validator pass proves only internal structure of that optional manifest, not behavior, safety, compatibility, or quality. Load [the CLI interface contract](references/cli-interface-contract.md) as a conditional menu for machine formats, multiple config sources, mutations, long-running processes, or distribution.

### 3. Implement one command slice

Prefer one independently useful task across parse → validate → core operation → render/error over horizontal parser/core/docs/test phases. Keep parsing and presentation at the boundary and reuse the repository's core/service abstractions. Pass argv arrays directly; parse structured input instead of shell-evaluating it; validate before side effects; keep error-to-exit and serialization behavior consistent with existing conventions.

Apply only relevant rules:

- non-interactive invocation must not hang on an unanswered prompt;
- machine modes, when exposed, suppress incidental decoration and keep their declared stream clean;
- mutations identify bounded targets and use confirmation, preview/dry-run, or another safeguard proportional to consequence;
- `--yes`, if present, confirms already authorized scope and never broadens it;
- dry-run, if present, states its prediction limits and performs no declared mutation;
- partial failures and retry/idempotency are explicit only when commands can encounter them;
- signal cancellation and child cleanup are implemented only where the selected contract owns them.

For an agent-facing command over remote resources, resolve a human name to an explicit, unique stable identifier before a consequential read or write; ambiguity is an error, never an arbitrary first match. Bound collection pagination and output, surface truncation or a continuation token, and require writes to carry an enumerated target set rather than an implicit unbounded match. Preserve repository/API limits instead of inventing a parallel resource model.

Add a regression/public-interface test when behavior or compatibility changed and a suitable harness exists. A failing-first test is useful for new parsing/error logic but not mandatory ceremony for help text or another change better checked directly.

### 4. Probe the real executable proportionately

Use direct argv subprocess execution, not an interpolated shell string. Select cases that can falsify the claim:

- help/version only when changed or relied upon;
- valid and malformed input for changed parsing;
- stdout/stderr and redirected/non-TTY behavior for stream claims;
- JSON/NDJSON syntax and schema for formats actually exposed;
- documented exit values for changed error classes;
- precedence/unknown keys for config sources actually involved;
- confirmation/dry-run/partial failure/idempotent retry for affected mutations;
- timeout, SIGINT/SIGTERM, broken pipe, and child cleanup for processes that claim those behaviors;
- paths, Unicode, and platforms actually supported by the change.

The optional helper can run configured manifest probes:

```bash
python3 <skill-directory>/scripts/cli_contract.py probe --manifest /tmp/cli-contract.json --timeout 10 --json -- <executable> <fixed-prefix-args>
```

It executes without a shell, applies bounded timeouts/process-tree cleanup, and performs narrow stream assertions. It does not provide filesystem/network isolation or prove semantic relevance, mutation safety, signal behavior, packaging, compatibility, or platforms not exercised. Use project tests or direct observation for those claims.

### 5. Separate distribution and live effects

Build or inspect an artifact only when the task claims packaging/distribution. When installed behavior is claimed, install the built artifact into an authorized isolated target and smoke-test the resolved installed executable from an unrelated working directory, so source-tree imports and relative paths cannot create a false pass. Test target architecture, permissions, identity/version, install/uninstall, completions, and signatures only to the extent selected by that public distribution contract.

Do not install into user scope, mutate shell configuration, access real credentials/resources, sign, publish, release, or deploy without exact authorization. A source invocation or local package is not an installed or published release. After the final mutation, run focused/relevant checks, inspect the diff, and distinguish untested consumers/platforms from compatible ones.

## Output contract

Report these semantics, in any order or adapter-specific presentation:

- outcome, commands, consumers, and compatibility classification;
- changed process contract: only relevant streams/formats/exits/config/signals/safety/distribution;
- fresh unit/public-interface/subprocess/artifact evidence actually obtained;
- untested consumers/platforms and mutations/install/release effects not performed.

An optional manifest need not appear when unused. Do not claim an installed, compatible, signal-safe, or published CLI from a source-level test.

## Common pitfalls

- Requiring JSON, NDJSON, exit `2`, a five-layer config order, all signals, completions, or every platform for every CLI.
- Designing only for an interactive happy path when automation is an actual consumer.
- Mixing diagnostics into a declared machine-data stream or returning success for failure.
- Prompting indefinitely in a non-interactive invocation.
- Treating `--yes` as authorization or dry-run as permission to mutate.
- Changing fields, defaults, flags, streams, exits, or precedence as an internal refactor.
- Using `shell=True` or interpolated shell strings for convenience.
- Testing source invocation while claiming installed artifact or release behavior.

## Verification checklist

- [ ] Task mode, consumers, bounded local scope, existing parser/process conventions, and exposed compatibility surface are clear.
- [ ] Durable installed CLI versus one-off repository script was classified before adding public/distribution obligations.
- [ ] Bounded requested writes proceeded without mandatory artifacts or redundant approval.
- [ ] Only actually exposed or deliberately selected stream, format, exit, config, signal, and distribution contracts were constrained.
- [ ] Optional manifest/template use, if any, is described as a hardened complex-contract aid rather than universal policy.
- [ ] Parsing, rendering, errors, and core operation follow the repository's architecture and avoid shell injection.
- [ ] Non-interactive and mutation safeguards are present only as needed and preserve authorization boundaries.
- [ ] Agent-facing resource commands, when present, use unambiguous stable targets and bounded collection/read/write behavior.
- [ ] Direct subprocess and other evidence is fresh and proportional to the process claims made; installed behavior, when claimed, was probed from outside the source tree.
- [ ] Public compatibility changes and untested consumers/platforms are reported honestly.
- [ ] Real mutations, credentials, dependencies, user installation/config, signing, release, publication, and deployment remained separately authorized and verified.
