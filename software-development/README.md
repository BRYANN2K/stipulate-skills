# Software development skills

Freedom-first product-engineering workflows: take the shortest safe path that satisfies the requested outcome, inherit the repository's conventions, constrain only real protocol and safety boundaries, and match evidence to the claim.

## Taxonomy and dispatch

Use `software-engineering` only when the request is broad or crosses specialties. A focused request should invoke its owning specialist directly.

- **Foundation:** `software-project-bootstrap` can scaffold directly or use an optional deterministic helper for complex adoption.
- **Primary surfaces:** website, web application, terminal UI, and command-line tool engineering.
- **Web-application specialization:** `dashboard-application-engineering` adds source, metric, dense-data, privileged-operation, partial-failure, and reconciliation discipline when those concerns are material.

Classify the **unit of work**, not the whole repository or framework. A repository may use website engineering for a public pricing route, web-application engineering for an account flow, dashboard engineering for an operations route, and CLI/TUI skills for separate executable modes. Load the dashboard specialization only when dashboard semantics materially change the work; do not force this pack's vocabulary onto a repository that already has an authorization, state, process, or terminal model.

## Shared operating contract

A clear request to change a bounded local surface authorizes the local file writes needed for that surface. Do not turn an ordinary edit into a proposal/manifest/approval train. Ask only when an unresolved choice would materially change product behavior, ownership, compatibility, risk, or an effect outside the requested boundary.

Use four task modes:

| Mode | Default path | Evidence |
|---|---|---|
| Bounded edit | Inspect the affected neighborhood, edit directly, inspect the diff | Smallest check that can falsify the changed claim |
| New behavior or surface | Define one observable outcome and deliver one independently useful vertical slice | Focused behavior plus the real user boundary when claimed |
| Complex contract or migration | Map interacting routes, states, permissions, consumers, or compatibility; retain memory only when it reduces error | Targeted matrix, integration evidence, and optional structural lint |
| Release or live effect | Separate implementation from installation, publication, deployment, destructive action, or production access | Exact authorization, bounded target, and independent readback |

Instruction precision should follow consequence. Leave implementation choices open when several local solutions are safe; be exact around public protocols, server authorization, terminal restoration, irreversible effects, and production boundaries. Templates and manifests are optional working memory or hardened profiles—not admission tickets. Validators prove only the narrow structure they check. Output formats are semantic contracts: report outcome, scope, evidence, and gaps, but a presentation adapter may reorder or relabel those fields without losing meaning.

Cross-cutting ownership remains separate. `interface-studio` owns the lightweight browser-interface loop: choose the applicable surface profile, select a prototype or direction, implement one bounded local vertical slice, capture real screenshots when appearance is claimed, and run bounded critique and revision. Website work starts from product truth, story, copy, inspiration, and directions; application and dashboard work start from the user task, data, permissions, and states rather than a forced marketing funnel. The human selects unless they explicitly delegated visual judgment; delegated selection may proceed without a second approval gate. Reuse established design conventions and extract shared rules only after observed reuse or explicit system scope.

Local build authority does not cover invented claims or metrics, unauthorized data access, authentication changes or permission grants, destructive or live mutations, dependency installation or changes, deployment, or publication. `agents-md-authoring` owns richer repository instructions; `verified-completion` governs completion claims; `delivery-pipeline-engineering` owns delivery and deployment; documentation and infrastructure skills retain their own domains.

| Skill | Focus |
|---|---|
| [software-engineering](software-engineering) | Route broad software outcomes to the smallest website, web app, dashboard, CLI, TUI, or bootstrap specialist and coordinate Interface Studio only when visual direction is open |
| [software-project-bootstrap](software-project-bootstrap) | Direct, convention-preserving scaffolding with an optional deterministic adoption profile |
| [website-production-engineering](website-production-engineering) | Public websites, content and conversion paths, SEO continuity, accessibility, and claim-scoped browser evidence |
| [web-application-engineering](web-application-engineering) | Stateful browser applications, server authorization, state and mutation behavior, and proportional journey evidence |
| [dashboard-application-engineering](dashboard-application-engineering) | Analytical and operational surfaces with source-backed facts, permission-aware actions, and reconciliation |
| [terminal-ui-engineering](terminal-ui-engineering) | Full-screen terminal applications, framework-native architecture, lifecycle restoration, and claim-scoped terminal evidence |
| [command-line-tool-engineering](command-line-tool-engineering) | Human and scriptable CLIs whose actually exposed process contracts remain compatible and testable |
