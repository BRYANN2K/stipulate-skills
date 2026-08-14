# AGENTS.md evidence and pattern reference

Use this reference to derive repository instructions without copying another project's rules. External examples establish useful patterns; only the target repository and user establish target-project facts.

## Standard and precedence

| Source | Observed contract | Authoring consequence |
|---|---|---|
| [agents.md](https://agents.md/) | `AGENTS.md` is ordinary Markdown with no required fields. The closest file to the edited code wins, and explicit user instructions remain higher priority. | Keep root rules global. Add a nested file only for a real local difference. Do not impose proprietary frontmatter or a universal section schema. |
| [OpenAI Codex guide](https://developers.openai.com/codex/guides/agents-md/) | Codex walks from the project root toward the current directory, loading at most one applicable instruction file per directory; closer instructions are appended later and take precedence. | Treat nesting as scoped override, not duplication. Verify which directory an agent starts from when diagnosing instruction loading. |

The open standard and one client's discovery algorithm are related but not identical. Do not promise that every client implements overrides, aliases, size limits, or fallback filenames exactly like Codex.

## Production examples reviewed

| Example | Strong pattern | What not to copy blindly |
|---|---|---|
| [Kubernetes](https://github.com/kubernetes/kubernetes/blob/master/AGENTS.md) | A concise root file with exact commands, generated-file constraints, source-of-truth paths, and repository-specific Go rules. | Communication tone, staging layout, generators, and commit conventions are Kubernetes-specific. |
| [Sentry](https://github.com/getsentry/sentry/blob/master/AGENTS.md) | Global commands and boundaries at root; backend, test, and frontend rules delegated to scoped `AGENTS.md` files; long workflows delegated to skills. | Virtualenv, devservices, feature-flag, customer-data, and split-PR rules depend on Sentry's architecture and operations. |
| [OpenAI Codex](https://github.com/openai/codex/blob/main/AGENTS.md) | Detailed commands, test selection, generated schema steps, review rules, and crate-specific conventions grounded in a large Rust monorepo. | Its length, sandbox environment variables, Ratatui conventions, and crate boundaries are not a generic template. |
| [Next.js](https://github.com/vercel/next.js/blob/canary/AGENTS.md) | Explicit mode-specific build and test commands, fast local workflow, generated-test path, and bundler distinctions. | A large command matrix is justified by Next.js; most repositories should remain much shorter. |
| [Apache Airflow](https://github.com/apache/airflow/blob/main/AGENTS.md) | Exact environment wrapper, package-specific test commands, generated command regions, architecture and security boundaries. | Breeze, provider layout, selective CI, and PR policy are local infrastructure. |
| [OpenAI Agents Python](https://github.com/openai/openai-agents-python/blob/main/AGENTS.md) | Explicit scope discipline, compatibility contracts, verification tiers, and delegation to repository skills. | Mandatory skills, release workflow, and extensive process policy require matching local tooling and ownership. |
| [OpenTofu](https://github.com/opentofu/opentofu/blob/main/AGENTS.md) | A short, high-authority contribution boundary tied to licensing and the project's explicit AI-assisted contribution policy. | The prohibition on LLM-generated contributions is specific to OpenTofu's legal policy; never generalize it to another infrastructure project. |
| [Flux](https://github.com/fluxcd/flux2/blob/main/AGENTS.md) | Exact generated-manifest ownership, static/unit/e2e command separation, live-cluster prerequisites, secret-output boundaries, and explicit compatibility commitments. | Its DCO trailers, controller topology, SSA workflow, cloud integration tests, and mandatory backward compatibility are repository-specific. |
| [Helm](https://github.com/helm/helm/blob/main/AGENTS.md) | Public SDK/CLI compatibility tied to a named policy, exact build/test targets, branch-specific support, and Kubernetes storage boundaries. | Helm's release branches, DCO workflow, chart generations, and package layout are not generic infrastructure defaults. |
| [Ansible](https://github.com/ansible/ansible/blob/devel/AGENTS.md) | Licensing is linked to authoritative context, automated sanity checks are separated from human review, and specialized test commands are delegated to detailed docs. | Its accepted-license set, Azure Pipelines workflow, agent attribution, and `ansible-test` container rules apply only to Ansible. |

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

Before drafting, keep a temporary worksheet outside the repository:

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

A candidate is ready only when its wording, scope, and source agree. A detected framework or file extension is not enough to infer commands, style, architecture, or support policy.

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

## Objective validator boundary

`validate_agents_md.py` can establish that files are regular UTF-8 Markdown, local links resolve within the repository, fences balance, template markers are gone, and obvious credential assignments are absent.

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
