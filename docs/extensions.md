# Domain extensions — interface v1 and local catalog

The repository ships 28 packages separate from the core. The seven core skills remain the only Codex/Orca skill discovery entries; extensions are neither 28 additional skills nor executable plugins. Bootstrap and the core skill installer do not install domain packages.

Bootstrap maps existing foundations. **Selection for a change happens during stip-explore**, based on affected behavior and material unknowns. An available extension is not automatically selected; a cloud-only change does not activate UX/design. Every domain contributes to the same approved contract.

## Install only the packages you need

From this repository, with Python 3.10+ and Git for the workflow:

```sh
python3 scripts/validate_extensions.py
python3 scripts/workflow.py --root /physical/path/to/project bootstrap
python3 scripts/install_extensions.py --project /physical/path/to/project \
  --extension cloud-engineering --extension devops-delivery --dry-run
python3 scripts/install_extensions.py --project /physical/path/to/project \
  --extension cloud-engineering --extension devops-delivery
python3 scripts/workflow.py --root /physical/path/to/project extensions
```

Replace example paths with the target project's physical path. The installer requires an explicit package list, copies packages into `.workflow/extensions/<id>`, and adds configuration entries while preserving other keys. It does not modify AGENTS.md, the project map, or active changes. It rejects symlinks, conflicting configuration, and differing local copies; an identical copy is reused. Writes respect the engine lock, all collisions are checked before copying, and a copy failure removes only newly created directories. Dry-run performs no writes.

Installed packages are self-contained: their four phase references, sources, and editorial cases are local. The engine does not require the source repository path. After installation, use a runtime from any of the seven installed skills or from this repository. The extension installer requires the source repository and catalog; it is not copied into the core skills.

## Select extensions for a change

```sh
python3 scripts/workflow.py --root /physical/path/to/project \
  explore storage-migration --extension cloud-engineering
```

This example does not select devops-delivery even though it is available. `explore correct-copy` without extension options selects no domain. To change a selection during exploration:

```sh
python3 scripts/workflow.py --root /physical/path/to/project \
  select storage-migration --extension cloud-engineering --extension devops-delivery
```

`select` replaces the selection and invalidates previous approval. `extensions` lists available references; `start` reports only selected references. The engine returns paths and digests rather than automatically loading instructions: the agent reads the reference for the relevant phase. Do not load the whole catalog into every prompt.

## Manual configuration and updates

For manual installation, copy a package into the project and **merge** this entry into `.workflow/config.json` without overwriting existing settings:

```json
{
  "schema_version": 1,
  "extensions": {
    "cloud-engineering": {
      "enabled": true,
      "path": ".workflow/extensions/cloud-engineering"
    }
  },
  "settings": {"require_user_approval": true}
}
```

The path may refer to another directory **inside the project**. It must exist before configuration. Absolute paths, `..` traversal, and symlinks are not allowed. `enabled: false` makes a domain unavailable for new selections. Disabling an extension selected by an active change prevents that change from continuing; review its selection and contract first.

The installer rejects destructive updates and differing customized copies. To update, compare source and local files, preserve user changes, and replace only the approved files. Any change to a selected manifest or its four phase references invalidates the change's approval: revise and obtain renewed approval before apply. Sources and evaluation cases are informational and are not part of the v1 digest; requirements derived from them must be recorded in the shared specification. This also applies to English translations of previously installed references.

## Manifest v1

Each package contains:

```json
{
  "schema_version": 1,
  "id": "cloud-engineering",
  "description": "Design reproducible cloud resources with access controls, recovery, health, and cost considerations.",
  "explore": "explore.md",
  "apply": "apply.md",
  "check": "check.md",
  "docs": "docs.md"
}
```

The engine requires only `explore`; all 28 shipped packages provide all four phases. References are relative to the package and cannot use traversal, absolute paths, or symlinks. The engine reads manifests and digests; it executes no extension hook or code. The v1 interface and engine behavior remain unchanged.

## Contract, responsibilities, and evidence

Explore classifies existing foundations as **established, inferred, incomplete, missing, or not-applicable**, with evidence or justification. Missing documentation does not prove that a practice is absent. Reuse or complete existing work before replacing it; a domain step may already be satisfied.

Check points are candidates to discuss during explore/validate. The agent adapts them into actual **AC-1, AC-2, etc., unique in the shared specification**; the engine does not remap domain IDs. Apply implements approved decisions. Check compares observations with required outcomes, distinguishes simulations from real environments, and retains failed/unverified results when evidence is missing. Docs contributes domain-specific readers and information to the core stip-docs skill. No domain grants itself approval, changes a threshold to make a result pass, or implicitly publishes work.

Previously authorized actions remain authorized within their scope. Publication, deployment, and external contact require only the authorization actually needed; archive does not trigger them. Objectives that require an operational observation period remain distinct from local tests.

## Catalog verification

```sh
python3 scripts/validate_skills.py
python3 scripts/validate_extensions.py
python3 -m unittest discover -s tests -v
```

Validation inspects 28 manifests, 112 bounded and portable phase references, local links, and 112 editorial cases. Tests cover selective installation, no default selection, cloud without design, collisions, preservation, locking, copy rollback, reference changes, and a full synthetic lifecycle per package with a failing check followed by scoped archive.

These tests verify structural integration with the engine. They do not establish the correctness of Astra's domain choices or a real project's outcomes. Each `evaluation.json` supplies four cases for human or agent evaluation: relevant activation, non-activation, adopting existing work, and an insufficient result. For behavioral evaluation, run each prompt against a suitable fixture, retain decisions and evidence, compare them with expected outcomes, and report discrepancies. Sources were reviewed on September 7, 2026; verify versions and applicability before relying on an evolving rule.

## Catalog

See also the [machine-readable catalog](../extensions/catalog.json). Descriptions support selection without automating it.

| Package | Responsibility |
|---|---|
| [accessibility](../extensions/accessibility/explore.md) | Make tasks and content perceivable, operable, understandable, and robust for the intended audiences. |
| [ai-engineering](../extensions/ai-engineering/explore.md) | Scope and evaluate a model capability, including its tools, errors, costs, and human fallback. |
| [analytics-experimentation](../extensions/analytics-experimentation/explore.md) | Connect a hypothesis, instrumentation, and analysis method to a measurable decision. |
| [api-integrations](../extensions/api-integrations/explore.md) | Define and verify an API boundary, including identities, errors, retries, and versions. |
| [backend-engineering](../extensions/backend-engineering/explore.md) | Ensure consistent server behavior across success, failure, concurrency, and recovery. |
| [build-in-public](../extensions/build-in-public/explore.md) | Prepare useful public updates about project progress, evidence, lessons, and limitations. |
| [cli-tooling](../extensions/cli-tooling/explore.md) | Build a stable command-line interface for people and automation. |
| [cloud-engineering](../extensions/cloud-engineering/explore.md) | Design reproducible cloud resources with access controls, recovery, health, and cost considerations. |
| [content-design](../extensions/content-design/explore.md) | Help people understand and complete their task through clear content in the right context. |
| [customer-support](../extensions/customer-support/explore.md) | Prepare diagnosis, assistance, and escalation for problems users actually encounter. |
| [data-engineering](../extensions/data-engineering/explore.md) | Make data flows traceable, replayable, and verifiable from source to consumer. |
| [database-engineering](../extensions/database-engineering/explore.md) | Preserve invariants, compatibility, performance, and recovery when changing persisted data. |
| [design-system](../extensions/design-system/explore.md) | Evolve shared primitives and components with their usage guidance, contracts, and migrations. |
| [desktop-engineering](../extensions/desktop-engineering/explore.md) | Verify a desktop application across windows, processes, files, permissions, and packaging. |
| [devops-delivery](../extensions/devops-delivery/explore.md) | Make the build and delivery path reproducible, observable, and recoverable. |
| [frontend-engineering](../extensions/frontend-engineering/explore.md) | Build rendered web behavior, including states, data, accessibility, and performance. |
| [mobile-engineering](../extensions/mobile-engineering/explore.md) | Build and verify a mobile experience across its lifecycle, network, permissions, and distribution. |
| [privacy-engineering](../extensions/privacy-engineering/explore.md) | Bound personal data processing through purpose, minimization, access, retention, and rights. |
| [product-strategy](../extensions/product-strategy/explore.md) | Connect the problem, audience, value, alternatives, and tradeoffs to a product decision. |
| [quality-engineering](../extensions/quality-engineering/explore.md) | Choose checks that reduce actual risks and link their results to acceptance criteria. |
| [release-management](../extensions/release-management/explore.md) | Prepare an identifiable release with compatibility, artifacts, release notes, and recovery. |
| [security-engineering](../extensions/security-engineering/explore.md) | Reduce abuse risks affecting assets and trust boundaries touched by the change. |
| [seo-discoverability](../extensions/seo-discoverability/explore.md) | Make public content discoverable and indexable according to its purpose and constraints. |
| [sre-operations](../extensions/sre-operations/explore.md) | Connect user-perceived reliability, indicators, objectives, alerts, and responses to degradation. |
| [storytelling](../extensions/storytelling/explore.md) | Connect intent, a supportable promise, messaging, and consistent narrative across product surfaces. |
| [user-research](../extensions/user-research/explore.md) | Reduce uncertainty about people, their tasks, and their context through proportionate observation. |
| [ux-design](../extensions/ux-design/explore.md) | Design journeys, interactions, states, and recovery for a user task. |
| [visual-design](../extensions/visual-design/explore.md) | Define appropriate hierarchy, readability, colors, typography, spacing, and visual states. |
