---
name: command-line-tool-engineering
description: "Use when building or changing a line-oriented command-line tool intended for humans, scripts, automation, or agents. Defines command, stream, format, exit-code, configuration, non-interactive, mutation-safety, signal, completion, and distribution contracts; implements stable behavior; and verifies it through black-box subprocess probes."
license: Apache-2.0
compatibility: Works with any CLI language or framework and Agent Skills-compatible client. The deterministic contract validator and probe harness require Python 3.10 or newer and use only the standard library.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: software-development
  tags: cli, command-line, unix, automation, json, black-box-testing
---

# Command-Line Tool Engineering

## Overview

Build command-line tools as stable process contracts, not merely terminal-shaped user interfaces. Humans need discoverable help and actionable errors; scripts and agents need non-interactive operation, clean streams, stable machine formats, meaningful exit codes, bounded execution, and safe repeated use.

<HARD-GATE>
Never hide destructive behavior behind an ordinary-looking command, prompt when stdin is not interactive, place diagnostics in machine-readable stdout, execute shell strings assembled from input, or silently change configuration precedence or output schemas. Real mutations, credential access, installation, publishing, release signing, and deployment require explicit authorization and bounded targets.
</HARD-GATE>

## When to use

- Build a new executable, subcommand, UNIX-style tool, automation client, or agent-facing CLI.
- Add flags, arguments, stdin/stdout behavior, JSON/NDJSON, exit codes, configuration, completions, signals, progress, confirmation, dry-run, or packaging.
- Stabilize a CLI for shell pipelines, CI, scripts, or AI agents.
- Audit backwards compatibility, non-interactive behavior, errors, or distribution.

Do not use this skill for a full-screen stateful terminal application. Use `terminal-ui-engineering` when frames, focus, resize, and raw terminal modes are core behavior.

## Workflow

### 1. Inspect the public process boundary

Read repository instructions, executable entrypoint, parser/command tree, business/service layer, configuration, output rendering, error mapping, signal handling, tests, packaging, release configuration, and Git status. Exercise existing `--help` and `--version` only when safe. Capture current command names, formats, exit codes, defaults, and compatibility obligations before changing them.

**Complete when:** scope names users, automation consumers, commands, mutations, streams, formats, exit semantics, configuration precedence, supported platforms, and repository-native checks.

### 2. Define the CLI contract

Copy `templates/cli-contract.json` to a temporary path. Record:

- application identity and help/version flags;
- each command's interaction, non-interactive path, mutation, idempotency, dry-run/confirmation, and streams;
- human/plain/JSON/NDJSON formats and no-color behavior;
- exit-code taxonomy;
- configuration precedence and locations;
- SIGINT, SIGTERM, and broken-pipe behavior;
- platform, completion, build, and black-box probes.

Use the template's structured stream ownership values rather than prose:

- `stdin`: `none`, `data`, or `secret`;
- `stdout`: `data` or `data-or-human`;
- `stderr`: `diagnostics` or `diagnostics-and-progress`.

Exit code `0` uses meaning `success`; exit code `2` uses meaning `usage-error`. Both are non-retryable. Add other stable domain codes separately.

Validate read-only:

```bash
python3 <skill-directory>/scripts/cli_contract.py check \
  --manifest /tmp/cli-contract.json \
  --json
```

Load [the CLI interface contract](references/cli-interface-contract.md) when adding mutations, machine formats, configuration, or distribution.

**Complete when:** commands and codes are unique, stdout/stderr ownership is explicit, machine output is stable, configuration precedence is deterministic, interactive commands have non-interactive paths, and each mutating command has a substantive dry-run or confirmation contract rather than deferred placeholders. Standalone or label-affixed `TODO`, `TBD`, or `placeholder` work markers (including `_label` and numeric affixes) are vacuous even inside longer or bounded ASCII-encoded text; `defer` or `deferred` is likewise vacuous as a directive at field start or after a label separator. Bounded future-work phrases such as `will be implemented later`, `not yet defined`, `future work`, `define ... after implementation`, explicit `plan`/`plans` for a later phase (including `plans on`, `plan is to`, and a bounded comma-delimited incidental clause before `to`), postponement until implementation, `intend`/`intends` to specify eventually, or any subject that `remain`/`remains` to be decided are also vacuous; the latter two forms likewise allow one bounded comma-delimited incidental clause before `to` or `to be`. A domain sentence beginning with `Pending` or `Later` remains valid when it defines concrete preview or confirmation behavior. This bounded syntax guard does not prove the safety path works; contract `PASS` still requires human review and black-box mutation evidence for the declared behavior.

### 3. Design commands around tasks and composition

Use predictable command nouns/verbs consistent with the existing tool. Avoid near-synonyms and mode ambiguity. Each command must define:

- required and optional inputs;
- stdin behavior and TTY assumptions;
- output records and ordering;
- diagnostics and progress channel;
- success, usage, domain, temporary, and partial-failure exit behavior;
- idempotency and retry semantics;
- destructive scope, preview, confirmation, and automation override;
- compatibility impact of adding, removing, or renaming fields and flags.

Defaults must be safe. `--yes` bypasses a prompt, not authorization. `--dry-run` must avoid mutations and say what it can and cannot predict.

### 4. Implement through a testable core

Write a failing black-box or public-interface test before changed behavior. Keep parsing/rendering at the boundary and business logic in a testable core. Parse structured input instead of shell-evaluating it. Validate before side effects. Centralize error-to-exit mapping and output serialization.

Rules:

- stdout contains requested data or chosen human presentation;
- stderr contains diagnostics and progress;
- machine modes suppress decoration, spinners, prompts, and incidental logs;
- JSON/NDJSON schemas are versioned or compatibility-governed;
- commands that can prompt also work non-interactively or fail fast with an actionable diagnostic;
- mutating commands expose safe scope, confirmation/preview as appropriate, and partial-failure details;
- SIGINT/SIGTERM cancel, clean up, and return predictably;
- broken pipes exit quietly without traceback noise.

**Complete when:** focused tests are GREEN and the command does not rely on an interactive shell for correctness.

### 5. Exercise the executable black-box

Run the real built/interpreted executable as an argv array, never through a shell string. Test:

The contract validator rejects credential-like assignments after bounded ASCII canonicalization, including repeated-quote serialized assignments, bounded-punctuation Basic/Bearer wrappers, dot- or space-separated credential names, and compact identifiers in any case with environment or version prefixes/suffixes, without reflecting the rejected value. This conservative filter does not prove arbitrary text secret-free.

Malformed manifests, including numeric literals beyond the runtime's bounded integer conversion, fail with a controlled generic JSON diagnostic rather than a traceback.

- root and subcommand help;
- version output;
- valid human, plain, JSON, and NDJSON modes;
- malformed input and unknown flags;
- stdin from pipe/file and stdout redirection;
- non-TTY execution with no prompt or control sequences;
- stdout/stderr separation;
- documented exit codes;
- config precedence and unknown keys;
- dry-run, confirmation, `--yes`, idempotent retry, and partial failure;
- SIGINT, SIGTERM, timeout, broken pipe, and child cleanup;
- paths and Unicode across supported platforms.

For manifest probes:

```bash
python3 <skill-directory>/scripts/cli_contract.py probe \
  --manifest /tmp/cli-contract.json \
  --timeout 10 \
  --json \
  -- <executable> <fixed-prefix-args>
```

The harness executes directly with `shell=False` and evaluates configured exit and stream assertions. It requires UTF-8 streams and reports invalid encoding without reflecting raw bytes. Its `json` and `ndjson` assertions require strict syntax, finite numbers—including finite-looking exponents that overflow to non-finite runtime values—unique object keys, numeric literals within the runtime's bounded integer conversion, and no empty NDJSON records; malformed output produces a structured `FAIL` without reflecting the raw stream. Each probe runs in a contained process tree; timeout terminates and reaps that tree using a POSIX session or Windows Job Object. This remains a bounded harness, not filesystem or network isolation, and the bundled regression exercises the POSIX path only. It does not prove semantic relevance, absence of all side effects, signal behavior, packaging, or compatibility; add project tests for those claims.

### 6. Verify distribution separately

Build from a clean environment using the repository's pinned toolchain. Verify artifact identity, executable permissions, target architecture, `--version`, checksums/signatures when owned by the project, installation and uninstall paths, and generated completions. Test the installed artifact rather than only the source command.

Do not publish a package, create a release, sign an artifact, or modify user shell configuration unless explicitly authorized. A local package is not a published release.

### 7. Report the exact contract achieved

Run focused and relevant full suites, lint/type/build checks, black-box probes, and platform checks after the final mutation. Inspect the final diff. State compatibility changes and skipped platforms. Separate implemented, executed, verified, packaged, and published states.

## Output contract

```text
CLI: IMPLEMENTED | VERIFIED | PARTIAL | BLOCKED
Commands: <scope>
Compatibility: compatible | additive | breaking | unknown

Contract
- Streams/formats: <summary>
- Exit/config/safety: <summary>
- Platforms/distribution: <summary>

Evidence
- Contract: PASS | FAIL
- Unit/integration: <commands/results>
- Black-box probes: <argv/result>
- Non-TTY/pipes/signals: <result>
- Installed artifact/platforms: <result or unavailable>

Gaps / not performed
- <real mutations, untested platforms, install, signing, release, publication>
```

## Common pitfalls

- Designing only for the interactive happy path.
- Mixing diagnostics or progress into JSON stdout.
- Returning exit `0` with an error object.
- Prompting in CI or when stdin is not a TTY.
- Treating `--yes` as permission for destructive scope.
- Calling a command idempotent without retry evidence.
- Changing field names or exit codes as an internal refactor.
- Using `shell=True` or interpolated shell strings for convenience.
- Testing source invocation but not the packaged executable.
- Publishing merely because local package checks pass.

## Verification checklist

- [ ] Existing commands, streams, formats, codes, config, signals, tests, packaging, and compatibility were inspected.
- [ ] The CLI contract passes after its final edit.
- [ ] New behavior began with a failing public-interface test where possible.
- [ ] Every interactive command has a deterministic non-interactive path or fail-fast diagnostic.
- [ ] Stdout, stderr, machine formats, exit codes, and configuration precedence are stable and tested.
- [ ] Mutating commands define scope, idempotency, dry-run/confirmation, partial failure, and retry behavior.
- [ ] The real executable was probed without a shell under TTY and non-TTY/pipeline conditions.
- [ ] Signals, timeout, broken pipe, cleanup, Unicode, paths, and supported platforms were checked proportionately.
- [ ] The installed/package artifact was tested when distribution is claimed.
- [ ] Real mutations, installation, signing, release, and publication were not performed implicitly.
