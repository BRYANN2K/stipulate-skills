# AGENTS.md evidence and pattern reference

Load this reference when repository authority, nested scope, infrastructure semantics, or client behavior is unclear. For a narrow change with obvious sources, direct inspection is enough. External examples establish possible patterns; only the target repository and user establish target-project facts.

## Standard and precedence

| Source | Observed contract | Authoring consequence |
|---|---|---|
| [agentsmd/agents.md at `6ae2272`](https://github.com/agentsmd/agents.md/tree/6ae22720966e9cca6b2c2dd0780fb7265a87a46c) (MIT) | `AGENTS.md` is ordinary Markdown without a required universal section schema, and nested files can narrow local guidance. | Keep root rules global and add a nested file only for a real local difference. Verify the target client's exact precedence behavior. |
| [OpenAI Codex guide](https://developers.openai.com/codex/guides/agents-md/) | Codex walks from the project root toward the current directory, loading at most one applicable instruction file per directory; closer instructions are appended later and take precedence. | Treat nesting as scoped override, not duplication. Verify which directory an agent starts from when diagnosing instruction loading. |

The open standard and one client's discovery algorithm are related but not identical. Do not promise that every client implements overrides, aliases, size limits, or fallback filenames exactly like Codex.

## Production examples reviewed

| Example | Strong pattern | What not to copy blindly |
|---|---|---|
| [Kubernetes at `e72c271`](https://github.com/kubernetes/kubernetes/blob/e72c2715ade37738aa5c029e8de5285cbe1c9441/AGENTS.md) (Apache-2.0) | A concise root file with exact commands, generated-file constraints, source-of-truth paths, and repository-specific Go rules. | Communication tone, staging layout, generators, and commit conventions are Kubernetes-specific. |
| [OpenAI Codex at `b8c8637`](https://github.com/openai/codex/blob/b8c86376a258e55efc8e5ecfbabc21c16c07d814/AGENTS.md) (Apache-2.0) | Detailed commands, test selection, generated schema steps, review rules, and crate-specific conventions grounded in a large Rust monorepo. | Its length, sandbox environment variables, Ratatui conventions, and crate boundaries are not a generic template. |
| [Next.js at `2fe6f96`](https://github.com/vercel/next.js/blob/2fe6f962a1982594bdda96a7de16c594677266d2/AGENTS.md) (MIT) | Explicit mode-specific build and test commands, fast local workflow, generated-test path, and bundler distinctions. | A large command matrix is justified by Next.js; most repositories should remain much shorter. |
| [Apache Airflow at `14397bc`](https://github.com/apache/airflow/blob/14397bc547c828b0598bb60cc6a991b922964bd2/AGENTS.md) (Apache-2.0) | Exact environment wrapper, package-specific test commands, generated command regions, architecture and security boundaries. | Breeze, provider layout, selective CI, and PR policy are local infrastructure. |
| [OpenAI Agents Python at `89c02c8`](https://github.com/openai/openai-agents-python/tree/89c02c828ee8510fe9a84ee6675608193aa13b02) (MIT) | Explicit scope discipline, compatibility contracts, proportional verification, and delegation to repository skills. | Mandatory skills, release workflow, and extensive process policy require matching local tooling and ownership. |
| [OpenTofu at `1d92053`](https://github.com/opentofu/opentofu/blob/1d920536abf6162e3f336e751c336bcef788c64d/AGENTS.md) (MPL-2.0) | A short, high-authority contribution boundary tied to licensing and the project's explicit AI-assisted contribution policy. | The prohibition on LLM-generated contributions is specific to OpenTofu's legal policy; never generalize it to another infrastructure project. |
| [Flux at `da2d22d`](https://github.com/fluxcd/flux2/blob/da2d22d3690191a315822612085f424e4133b06a/AGENTS.md) (Apache-2.0) | Exact generated-manifest ownership, static/unit/e2e command separation, live-cluster prerequisites, secret-output boundaries, and explicit compatibility commitments. | Its DCO trailers, controller topology, SSA workflow, cloud integration tests, and mandatory backward compatibility are repository-specific. |
| [Helm at `d2de64e`](https://github.com/helm/helm/blob/d2de64e64bc64cbef584a0ccb13eb8cb0c96bded/AGENTS.md) (Apache-2.0) | Public SDK/CLI compatibility tied to a named policy, exact build/test targets, branch-specific support, and Kubernetes storage boundaries. | Helm's release branches, DCO workflow, chart generations, and package layout are not generic infrastructure defaults. |

## Empirical guidance with a scope caveat

GitHub's [analysis of more than 2,500 agent instruction files](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) emphasizes exact commands, concrete examples, boundaries, stack detail, tests, structure, style, and Git workflow.

The article primarily demonstrates specialized custom agents under `.github/agents/*.md`, not only the root `AGENTS.md` open format. Reuse the evidence about specificity and boundaries, but do not import persona frontmatter or task-agent structure into a root repository instruction file by default.

## Rule acceptance matrix

| Candidate rule | Default classification | Reason |
|---|---|---|
| Use exact repository-native commands | Include when verified | High-value and directly executable, but command scope and side effects must be inspected. |
| Choose the simplest implementation that meets the current requirement | Conditional default | Useful complexity guard unless a stronger architecture or compliance contract requires more. |
| Build through working end-to-end slices | Conditional default | Preserves feedback and working behavior; adapt for migrations or changes that cannot ship incrementally. |
| Keep components modular and concerns separated | Conditional default | Useful only at real project boundaries; do not manufacture modules or layers. |
| Check existing dependencies, docs, and types first | Include | Prevents unnecessary packages and reimplementation without selecting a specific dependency. |
| Prefer mature libraries | Conditional | Include only when maintenance, license, security, footprint, and reliability fit the project. |
| Never preserve backward compatibility | Reject as universal | Compatibility depends on released APIs, durable formats, state, and explicit support policy. |
| Always preserve backward compatibility | Reject as universal | Internal or explicitly breaking projects may remove obsolete paths; unsupported behavior is not automatically a contract. |
| Never accept a temporary solution | Reject as universal | A visible, bounded, reversible workaround may be rational; hidden indefinite workarounds are the real failure. |
| Research established products before every design | Reject as universal | Causes unnecessary browsing and cargo cult. Trigger external research only for unfamiliar, consequential, or hard-to-reverse decisions. |
| Do not edit generated files directly | Include when verified | Requires a known generator and source-of-truth path. |
| Never commit secrets | Include | State without examples containing secret-shaped literals. |
| Commit, push, publish, or deploy automatically | Reject | Those are separate side effects requiring explicit authorization and target scope. |
| Treat plan/preview output as apply authorization | Reject | Plans may access credentials, refresh or lock state, contact live systems, expose sensitive diffs, or run hooks; review evidence is not mutation authority. |
| Infer live state from checked-in configuration | Reject | Desired configuration cannot prove current resources, drift, health, rollout, backend contents, or out-of-band changes. |
| Read local state or kubeconfig to complete instructions | Reject | State and kubeconfigs can contain secrets and operational access; derive durable guidance from repository configuration and explicit ownership instead. |

## Evidence worksheet

For a broad or disputed edit, a temporary worksheet outside the repository can keep provenance visible. It is optional when the source-to-rule mapping is already obvious:

```text
Candidate: Run `pnpm test --filter api`
Scope: packages/api
Source: package.json:scripts.test and packages/api/package.json
Status: verified

Candidate: Never edit generated client files directly
Scope: packages/client
Source: packages/client/README.md § Regeneration
Status: verified

Candidate: Breaking changes are acceptable
Scope: root
Source: none
Status: unknown — omit or ask

Candidate: Run `tofu apply` after a successful plan
Scope: environments/prod
Source: none; `Makefile` only declares `plan`
Status: unsupported mutation — reject

Candidate: Production uses remote state with locking
Scope: environments/prod
Source: environments/prod/backend.tf and the operations runbook
Status: verified configuration; current backend health remains unknown
```

Include a candidate only when its wording, scope, and source agree. A detected framework or file extension is not enough to infer commands, style, architecture, or support policy.

## Root versus nested decision

Keep a rule at root when it governs almost every task: global source-of-truth files, universal safety boundaries, common focused checks, repository-wide generated-file policy, and completion expectations.

Move a rule to a nested `AGENTS.md` when one subtree has a different:

- language or framework convention;
- setup, test, lint, build, or generator command;
- architecture or ownership boundary;
- generated-file source of truth;
- public compatibility contract;
- credential, data, infrastructure, or deployment risk.

Do not create nested files merely because packages exist. Do not restate root rules locally. Link to durable documentation rather than embedding long explanations.

## Client compatibility diagnosis

Portable authoring uses ordinary root and nested `AGENTS.md` files. When a runtime appears not to follow them, diagnose that runtime instead of adding speculative duplicate instructions:

1. identify the client/version, working directory, logical root, and instruction-source paths it reports loading;
2. reproduce the disputed behavior with the smallest safe fixture;
3. distinguish primary files from client-specific override or configured fallback names;
4. test precedence, truncation/shared byte budget, invalid or non-file candidates, and symlink/logical-root behavior only when implicated;
5. label the result as client-specific and keep portable rules in ordinary `AGENTS.md`.

OpenAI Codex provides implementation evidence at [`codex-rs/core/src/agents_md.rs`](https://github.com/openai/codex/blob/b8c86376a258e55efc8e5ecfbabc21c16c07d814/codex-rs/core/src/agents_md.rs), [`agents_md_tests.rs`](https://github.com/openai/codex/blob/b8c86376a258e55efc8e5ecfbabc21c16c07d814/codex-rs/core/src/agents_md_tests.rs), and [`core/tests/suite/agents_md.rs`](https://github.com/openai/codex/blob/b8c86376a258e55efc8e5ecfbabc21c16c07d814/codex-rs/core/tests/suite/agents_md.rs), revision `b8c86376a258e55efc8e5ecfbabc21c16c07d814`, Apache-2.0. Its root-to-cwd composition, `AGENTS.override.md`, configured fallback names, shared default byte budget, and symlink/root behavior are not additions to the AGENTS.md open format.

### Compact evaluation cases

- Client provenance shows `AGENTS.override.md`, not the neighboring primary file: report the loaded source; do not rewrite the primary as though it was active.
- A parent file consumes the active client's shared budget before a deeper rule: report the client/budget behavior rather than deleting the nested rule as “unused.”
- A configured fallback loads only when the primary name is absent: do not document both as portable peers.
- A symlink or assumed repository root works in one client and fails in another: record the observed logical root and loaded paths; keep a regular file as the portable default.

## Objective validator boundary

The optional `validate_agents_md.py` helper can establish that files are regular UTF-8 Markdown, local links resolve within the repository, fences balance, template markers are gone, and obvious credential assignments are absent. Use it when those risks are material; a direct final readback may be enough for a small prose edit.

It cannot prove:

- a shell command is safe, correct, fast, or authorized;
- prose instructions are mutually consistent;
- an external example is compatible with the target architecture or license;
- a stated convention matches neighboring code;
- validation commands have been executed;
- the project builds or tests pass.

Those claims require source inspection, safe execution where applicable, diff review, and honest reporting.

## Infrastructure-specific derivation

For infrastructure repositories, keep four distinctions explicit:

1. **Desired versus observed:** HCL, YAML, charts, playbooks, policies, and pipelines show intended configuration. Only authorized live readback can establish current resources, drift, health, or rollout state.
2. **Static versus connected checks:** formatting, schema validation, rendering, and policy checks may be offline; plan, preview, diff, refresh, integration, and end-to-end commands may require credentials or contact live systems. Inspect the actual command before classifying it.
3. **Review versus mutation:** a successful plan, preview, render, diff, or dry-run is evidence for review. It is never authorization to apply, deploy, reconcile, destroy, import, unlock, rotate, or migrate.
4. **Configuration versus sensitive operational material:** backend declarations, provider locks, module sources, overlays, and generator sources are valid evidence. Local state, kubeconfigs, secret manifests, credentials, sensitive plan files, and cache directories are not authoring inputs.

Useful root instructions may identify the supported IaC tools, immutable sources, generated outputs, static checks, environment directory convention, and mutation approval boundary. Put provider-, environment-, cluster-, workspace-, or state-owner-specific differences in the narrowest applicable nested `AGENTS.md` only when those differences are evidenced and material.


## Structural source note

This skill uses progressive disclosure—keeping the common path in `SKILL.md` and conditional depth here—and compact behavioral cases after reviewing Agent Skills' [`best-practices.mdx`](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/docs/skill-creation/best-practices.mdx) and [`evaluating-skills.mdx`](https://github.com/agentskills/agentskills/blob/69ef37e9424c0a7ea9dd2293b559e43ec8176379/docs/skill-creation/evaluating-skills.mdx) at revision `69ef37e9424c0a7ea9dd2293b559e43ec8176379` (Apache-2.0 code and CC-BY documentation). The wording and repository workflow here are independently written.
