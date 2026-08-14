# Software development skills

Product-engineering workflows that preserve repository conventions, define observable interface contracts, and require evidence from the real browser, terminal, or process boundary.

## Taxonomy and dispatch

- **Foundation:** `software-project-bootstrap` initializes, adopts, or diagnoses repository readiness, then stops before product implementation.
- **Primary surfaces:** website, web application, terminal UI, and command-line tool engineering.
- **Web-application specialization:** `dashboard-application-engineering` adds source, metric, dense-data, privileged-operation, partial-failure, and reconciliation contracts.

Classify the **unit of work**, not the whole repository or framework. One repository may use website engineering for a public pricing route, web-application engineering for an account flow, the dashboard specialization for an operations route, and CLI/TUI skills for separate executable modes. Load the dashboard specialization only when at least two dashboard-specific dimensions are first-class: metric/source semantics, dense query-and-drill-down behavior, privileged mutations, or independently failing and reconciling data regions.

Cross-cutting ownership remains separate: `agents-md-authoring` owns evidence-backed repository instructions across domains; `verified-completion` governs claims and evidence; `delivery-pipeline-engineering` owns CI/CD, packaging, release, and deployment; documentation skills own durable docs, ADRs, and diagrams; infrastructure skills own runtime and platform provisioning.

| Skill | Focus |
|---|---|
| [software-project-bootstrap](software-project-bootstrap) | Constraint-first, non-destructive initialization and adoption of software repositories |
| [website-production-engineering](website-production-engineering) | Public websites, content and conversion paths, SEO continuity, accessibility, and browser evidence |
| [web-application-engineering](web-application-engineering) | Stateful browser applications, routes, permissions, state ownership, mutations, and E2E behavior |
| [dashboard-application-engineering](dashboard-application-engineering) | Web-application specialization for analytical and operational dashboards with source, metric, resource, role, action, partial-failure, and reconciliation contracts |
| [terminal-ui-engineering](terminal-ui-engineering) | Full-screen terminal applications, lifecycle, focus, async work, compatibility, and PTY testing |
| [command-line-tool-engineering](command-line-tool-engineering) | Scriptable CLIs with stable streams, formats, exit codes, config, safety, and black-box probes |
