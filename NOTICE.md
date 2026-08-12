# Notices and design lineage

Copyright 2026 BRYANN2K.

This repository contains original skills written as a synthesis of public engineering workflows and standards. No upstream repository is vendored. The links below acknowledge the projects whose public patterns materially informed the design.

## Agent skill architecture

- [Agent Skills specification](https://agentskills.io) — open skill format and progressive disclosure.
- [anthropics/skills](https://github.com/anthropics/skills) — self-contained skill packaging and resource layout.
- [obra/superpowers](https://github.com/obra/superpowers) — composable workflows, hard gates, and verification before completion.

## Infrastructure and DevOps

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
