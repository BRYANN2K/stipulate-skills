# Notices and design lineage

Copyright 2026 BRYANN2K.

This repository contains original skills written as a synthesis of public engineering workflows and standards. No upstream repository is vendored. The links below acknowledge the projects whose public patterns materially informed the design.

## Agent skill architecture

- [Agent Skills specification](https://agentskills.io) — open skill format and progressive disclosure.
- [anthropics/skills](https://github.com/anthropics/skills) — self-contained skill packaging and resource layout.
- [obra/superpowers](https://github.com/obra/superpowers) — composable workflows, hard gates, and verification before completion.

## Agent execution and completion

- [obra/superpowers — verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion), MIT — fresh evidence before completion claims. The workflow here extends that principle with requirement-level proof, a cumulative implementation-to-publication ladder, remote readback, and a deterministic consistency guard.
- [SLSA provenance](https://slsa.dev/provenance/) — verifiable statements that tie an artifact to how and where it was produced. This repository adapts only the general provenance principle, not the SLSA predicate format.

## Infrastructure and DevOps

- BRYANN2K's earlier Cloud Engineering Handbook and infrastructure repository workflows — discussion-first project discovery, minimal agent instructions, optional specification depth, preflight diagnosis, and separation of planning from mutation. `infrastructure-project-bootstrap` is a new provider-neutral implementation; it does not vendor the handbook, Cursor artifacts, private paths, or provider-specific defaults.
- [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec), MIT — optional specification-driven project workflow. The bootstrap records OpenSpec as an explicit user choice but does not install, initialize, or vendor it.
- [antonbabenko/terraform-skill](https://github.com/antonbabenko/terraform-skill), Apache-2.0 — Terraform/OpenTofu engineering, testing, state, and CI patterns. The material here is substantially reorganized, shortened, and extended with change-risk gates.
- [LukasNiessen/kubernetes-skill](https://github.com/LukasNiessen/kubernetes-skill), MIT — failure-mode-first Kubernetes review and conditional reference loading.
- [fluxcd/agent-skills](https://github.com/fluxcd/agent-skills), Apache-2.0 — static GitOps audits, dependency tracing, schema validation, and read-only live diagnosis.
- [grafana/skills](https://github.com/grafana/skills), Apache-2.0 — PromQL discipline, observability workflows, and cardinality-safe incident investigation.
- [aws-samples/sample-aws-resilience-skill](https://github.com/aws-samples/sample-aws-resilience-skill), MIT-0 — Well-Architected, resilience, and controlled-change review patterns.
- [NotHarshhaa/devops-skills](https://github.com/NotHarshhaa/devops-skills), MIT — concise incident investigation and evidence-oriented reporting.
- [culiops/culiops-agent](https://github.com/culiops/culiops-agent), MIT — production pre-flight risk assessment patterns.

## Developer documentation

- [Diátaxis](https://diataxis.fr) — separation of tutorials, how-to guides, reference, and explanation.
- [MADR](https://adr.github.io/madr/) — Architecture Decision Record structure.
- [joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) — ADR catalog and lifecycle patterns.
- [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) — diagram syntax and rendering model.
- [C4 model](https://c4model.com) — hierarchical software architecture communication.
- [tractorjuice/arc-kit](https://github.com/tractorjuice/arc-kit) — governed ADR and architecture-diagram workflow ideas.
- [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) — developer-documentation quality gates and docs-as-code practices.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — API reference contracts.
- [Google developer documentation style guide](https://developers.google.com/style) — clear, reader-centered technical prose.

## Software and product engineering

- BRYANN2K's earlier Anvil software handbook — project-type discovery, discussion-first planning, explicit verification phases, and interface-specific checklists. The software-development skills are new agent-agnostic implementations; they exclude private paths, editor adapters, automatic commits, mutating diagnosis, stack-imposed scaffolds, and personal defaults.
- [AGENTS.md open format](https://agents.md/) — portable repository instructions, ordinary Markdown, and nearest-file scope precedence.
- [OpenAI Codex — custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) — root-to-working-directory discovery, scoped overrides, and instruction-source diagnosis.
- [kubernetes/kubernetes `AGENTS.md`](https://github.com/kubernetes/kubernetes/blob/master/AGENTS.md) — concise repository-specific commands, generated-file constraints, and source-of-truth boundaries.
- [getsentry/sentry `AGENTS.md`](https://github.com/getsentry/sentry/blob/master/AGENTS.md) — global commands at root, scoped backend/test/frontend instructions, and delegation of longer workflows to skills.
- [openai/openai-agents-python `AGENTS.md`](https://github.com/openai/openai-agents-python/blob/main/AGENTS.md) — scope discipline, explicit compatibility contracts, verification tiers, and skill delegation.
- [opentofu/opentofu `AGENTS.md`](https://github.com/opentofu/opentofu/blob/main/AGENTS.md) — concise, high-authority contribution and licensing boundaries; its project-specific prohibition on LLM-generated contributions is not generalized.
- [fluxcd/flux2 `AGENTS.md`](https://github.com/fluxcd/flux2/blob/main/AGENTS.md) — generated-manifest ownership, live-cluster test boundaries, secret-safe output, and explicit compatibility contracts.
- [helm/helm `AGENTS.md`](https://github.com/helm/helm/blob/main/AGENTS.md) — public SDK/CLI compatibility, exact build/test targets, and branch-aware support policy.
- [ansible/ansible `AGENTS.md`](https://github.com/ansible/ansible/blob/devel/AGENTS.md) — authoritative licensing context, specialized test guidance, and separation of automated sanity checks from human review.
- [GitHub analysis of 2,500+ agent instruction files](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) — evidence for exact commands, examples, boundaries, project structure, tests, style, and Git guidance. Its custom-agent examples are treated separately from the root `AGENTS.md` format.
- [mhattingpete/claude-skills-marketplace — project-bootstrapper](https://github.com/mhattingpete/claude-skills-marketplace/tree/b5b34bcf4c920bb72cee1c391b54a33cb5353c12), Apache-2.0 — discovery, plan, approval, and new-versus-existing project distinctions.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/tree/be42637c5af93fdc8526b68ec2f2651b930f316c), MIT — frontend architecture, browser-runtime verification, measurement-first performance, and web security boundaries.
- [ibelick/ui-skills](https://github.com/ibelick/ui-skills/tree/146fcd0b34fca2d80333b120d67f5009ccf58b28), MIT — design-system preservation, accessibility, metadata, responsive UI, and motion-performance constraints.
- [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/78761e1b57f97dce65b983d640c70a68f39e8163), MIT — responsive interaction and reduced-motion principles.
- [flitzrrr/frontend-design-skills](https://github.com/flitzrrr/frontend-design-skills/tree/d607ba305bf606605de9382609864a69ad92699b), MIT — website audit, content migration, conversion, redirect, SEO-continuity, and post-launch evidence patterns.
- [openai/role-specific-plugins — build-dashboard](https://github.com/openai/role-specific-plugins/tree/fe5608d2512a7d6a7b9821ce8a88c48464ecd6e4), MIT — source discovery, grain, freshness, metric families, reconciliation, and source-backed dashboard QA.
- [product-on-purpose/pm-skills — measure-dashboard-requirements](https://github.com/product-on-purpose/pm-skills/tree/422dcb4d2014e45e82ba4ab861e9470add09a122/skills/measure-dashboard-requirements), Apache-2.0 — dashboard decision questions, metric definitions, filters, permissions, alerts, and acceptance criteria.
- [ancoleman/ai-design-components](https://github.com/ancoleman/ai-design-components/tree/76551b7b19ebc667764ec75da14990d0aef8b6e5), MIT — coordinated dashboard widgets, data-volume-aware tables, responsive data displays, and cross-language CLI implementation patterns.
- [josiahsiegel/claude-plugin-marketplace — tui-master](https://github.com/josiahsiegel/claude-plugin-marketplace/tree/5a1b1123b9e50aa9a66a61005ca6fe012cc7442d), MIT — terminal UI state/update/view boundaries, lifecycle, input, resize, compatibility, snapshots, virtual terminals, and PTY/ConPTY testing.
- [NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell/tree/0f8fad23c4712afc1d4a7b07a06d635b030e9521), Apache-2.0 — production TUI lessons for asynchronous work, loading/error states, log-follow behavior, key hints, confirmation, and CLI parity; project-specific architecture and branding are excluded.
- [pproenca/dot-skills](https://github.com/pproenca/dot-skills/tree/c9228d2d0c1391190168845824ceb4e33bb844fb), root MIT — reviewed as evidence of TUI/CLI demand and rule prioritization. Because its metadata identifies the material as a distillation, the shipped contracts are independently grounded in primary terminal/process standards, repository evidence, and black-box tests rather than copied from its wording or structure.
- [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills/tree/882ef55e377dbf9a4dbe496bb41ac6ccd0e555cf), MIT — command-tree design, non-interactive fallbacks, TTY/signal behavior, completions, and distribution across CLI ecosystems.
- [Command Line Interface Guidelines](https://clig.dev), [POSIX](https://pubs.opengroup.org/onlinepubs/9799919799/), [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/), and [NO_COLOR](https://no-color.org) — primary conventions for portable process, stream, configuration, and color behavior.
- [`citypaul/dotfiles` `cli-design` at `9e6f756`](https://github.com/citypaul/dotfiles/tree/9e6f75630fded850db9efecc8f260c51b3c97e26/claude/.claude/skills/cli-design) was reviewed only as evidence and excluded from derivation because its nested license is CC BY-SA 4.0. [`nimrodfisher/data-analytics-skills` at `88498848`](https://github.com/nimrodfisher/data-analytics-skills/tree/88498848c174ef162eba31fe5b6071faf02f8dc2) was excluded from derivation because no license was detected at the reviewed revision. No wording, examples, templates, resources, or distinctive structure from either source are included.

## Creator workflows

- [vindicatenyc/build-in-public-plugin](https://github.com/vindicatenyc/build-in-public-plugin), MIT — session-aware development activity capture. Its post-generation behavior is intentionally excluded here.
- [GauravRatnawat/journal-recorder-agent](https://github.com/GauravRatnawat/journal-recorder-agent), MIT — capture at natural session boundaries and journal deduplication patterns.
- [toddlevy/tl-agent-skills](https://github.com/toddlevy/tl-agent-skills), MIT — project-local, Git-ignored development journal mode.
- [jonocbell/agent-decision-log](https://github.com/jonocbell/agent-decision-log), Apache-2.0 — in-the-moment decision capture, alternatives, rationale, and supersession.
- [Keep a Changelog](https://keepachangelog.com) — notable-change filtering rather than raw commit dumps.
- [Google SRE postmortem culture](https://sre.google/sre-book/postmortem-culture/) — significance thresholds, evidence, and reusable learning from failures.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) — data minimization, sanitization, and sensitive-data exclusions.
- [Git documentation for gitignore](https://git-scm.com/docs/gitignore) — ignore semantics and the tracked-file boundary.
- [LinkedIn Sharing Guide](https://content.linkedin.com/content/dam/help/linkedin/en-us/LinkedIn-Sharing-Guide.pdf) and [IndieWeb POSSE](https://indieweb.org/POSSE) — platform-purpose and owned-canonical-content distinctions.

Upstream project names and trademarks belong to their respective owners. Inclusion here does not imply endorsement.
