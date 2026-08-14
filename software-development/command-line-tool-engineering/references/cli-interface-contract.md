# CLI interface contract

## Streams

- **stdout**: requested records or selected human presentation.
- **stderr**: diagnostics and progress.
- Portable text and machine-readable modes use UTF-8; invalid byte sequences are contract failures.
- Machine modes emit no headings, spinners, color, prompts, debug logs, or explanatory prose on stdout.
- Broken pipes terminate quietly according to platform convention.
- Never print credentials, authorization headers, private config values, or raw service responses containing them.

In the bundled manifest, declare command ownership with structured values:

- `stdin`: `none`, `data`, or `secret`;
- `stdout`: `data` or `data-or-human`;
- `stderr`: `diagnostics` or `diagnostics-and-progress`.

These values describe channel ownership, not probe assertions or schemas. Product-specific tests still prove actual stream contents.

## Formats

### Human

Readable, concise, and TTY-aware. Color augments meaning but never owns it. Honor `NO_COLOR` and an existing project-specific no-color flag.

### Plain

Stable line-oriented text for simple composition. Document delimiter and escaping rules if fields can contain whitespace or newlines.

### JSON

One complete JSON value. Define field names, types, nullability, ordering guarantees if any, errors, and compatibility policy. Strict assertions reject duplicate keys, non-finite values—including finite-looking exponents that overflow to non-finite runtime values—and numeric literals beyond the runtime's bounded integer conversion without reflecting raw output. Diagnostics remain on stderr.

### NDJSON

One independent JSON value per contiguous non-empty line, useful for streaming. Each record uses the same strict key, finite-number—including overflowed exponents—and bounded-integer rules as JSON. A single ordinary terminal newline may follow the last record, but an interior blank record is invalid. A partial stream plus non-zero exit must be distinguishable from complete success. Do not wrap records in an array.

## Exit-code taxonomy

At minimum define:

- `0`: requested operation succeeded under its documented semantics;
- `2`: usage or parse error;
- non-zero domain, permission, unavailable/temporary, partial, and internal failure classes as needed.

Keep codes stable. Do not return `0` merely because an error was serialized as JSON. Document retryability separately from numeric meaning.

The bundled manifest encodes these core meanings as `success` and `usage-error`; both must set `retryable` to `false`. Other code meanings remain product-defined.

## Configuration precedence

A common portable order is:

1. command-line flags;
2. environment variables;
3. project/workspace config;
4. user config;
5. defaults.

Use repository conventions when they differ, but make one deterministic order observable. Prefer XDG locations on systems that use them; preserve platform-native conventions where established. Unknown keys should error or warn according to an explicit compatibility policy.

## Interaction and automation

- Detect TTY before prompting.
- Every prompt-capable command has a non-interactive path or fails fast with an actionable diagnostic.
- `--yes` confirms already-authorized scope; it does not broaden target selection.
- Passwords/secrets come from secure stdin, environment, files, or platform facilities defined by the project—never command history by default.
- Progress belongs on stderr and disables or becomes plain when not interactive.
- Timeouts and cancellation must be bounded and observable.

## Mutation safety

For mutating commands define:

- exact target selection;
- preview/dry-run limitations;
- confirmation rule;
- idempotency and retry semantics;
- partial-failure representation;
- rollback/compensation when supported;
- authoritative readback;
- auditability where the system owns it.

At least one of preview/dry-run or confirmation must be substantive. Whole-field placeholders such as `eventually`, `unspecified`, or `later` do not satisfy either safety path. Standalone or label-affixed `TODO`, `TBD`, or `placeholder` work markers (including `_label` and numeric affixes) remain vacuous inside longer or bounded ASCII-encoded text; `defer` or `deferred` is also vacuous as a directive at field start or after a label separator. Bounded future-work phrases include `plan`/`plans` for a later phase (`plans on`, `plan is to`, or one bounded comma-delimited incidental clause before `to`), postponement until implementation, `intend`/`intends` to specify eventually, and any subject that `remain`/`remains` to be decided; the latter two forms also allow one bounded comma-delimited incidental clause before `to` or `to be`. The same class includes `will be implemented later`, `not yet defined`, `future work`, or `define ... after implementation`. This structural rule still allows ordinary domain sentences using words such as `Pending` or `Later` when they define concrete safety behavior. It does not prove arbitrary prose substantive or the implementation safe; use human review and black-box mutation tests for those claims.

A dry-run is evidence about the preview implementation, not authorization to mutate.

## Compatibility

Classify changes:

- **compatible**: behavior and documented contracts unchanged;
- **additive**: new command/flag/field with safe defaults and no parser ambiguity;
- **breaking**: removed/renamed command, changed default, stream ownership, exit code, field type/name, ordering guarantee, config precedence, or signal behavior;
- **unknown**: consumers or historical contract could not be established.

Test old invocation fixtures when compatibility matters.

## Black-box probe assertions

The bundled harness supports:

- `empty`;
- `nonempty`;
- `json`;
- `ndjson`;
- `contains:<text>`;
- `equals:<text>`.

It executes an argv array with `shell=False` and a bounded timeout. Each probe is assigned to a POSIX session or Windows Job Object so timeout terminates and reaps the process tree. It requires UTF-8 streams and reports invalid encoding without reflecting raw bytes. The bundled process-tree regression executes on POSIX; Windows Job Object behavior still needs a Windows runtime check before claiming platform evidence. It does not inject stdin, signals, TTYs, environment matrices, or filesystem isolation; add project-owned tests for those boundaries.
