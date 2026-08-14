# Discovery and profile selection

Load this reference only when repository evidence and the user's request do not settle the bootstrap manifest.

## Inspect first

Read, without mutation:

1. applicable `AGENTS.md`, `CLAUDE.md`, and project instructions;
2. root and workspace manifests;
3. lockfiles and package-manager declarations;
4. language and build configuration;
5. source and test roots;
6. existing documentation and specification directories;
7. CI definitions for validation evidence only;
8. Git status, without staging.

Do not inspect `.env`, credential stores, private keys, secret-manager output, production databases, or user profiles merely to bootstrap structure.

## Ask only decision-changing questions

| Decision | Ask when evidence does not establish |
|---|---|
| Product kind | The primary user interface and delivery form |
| Language/toolchain | Several active stacks conflict or none is selected |
| Package manager | Lockfiles, manifest declarations, and CI disagree |
| Source/test roots | Existing ownership is unclear or a new repository needs a layout decision |
| Validation | No safe repository-native checks are known |
| Spec depth | Change risk and collaboration needs are unclear |

Do not ask about branding, providers, deployment topology, databases, authentication vendors, analytics, or UI frameworks unless those facts directly determine the requested repository foundation.

## Select `minimal` by default

Use `minimal` when all are true:

- one team or owner;
- small and reversible scope;
- no consequential public-contract migration;
- no cross-system rollout or data migration;
- no compliance or production-safety gate requiring durable specs.

## Select `spec-driven` when one or more apply

- multiple systems or teams must coordinate;
- public APIs, schemas, persisted data, permissions, or compatibility change;
- work is difficult to reverse;
- security, privacy, compliance, or production risk is material;
- implementation needs multiple independently verifiable slices;
- decisions need explicit review before code.

The profile does not authorize a particular spec tool. `generic` is portable. `openspec` records an already-approved choice but still does not install or initialize anything.

## Project-kind routing

| Kind | Defining interface |
|---|---|
| `website` | Public content and conversion path |
| `web-application` | Stateful browser behavior |
| `dashboard` | Dense data/operations console |
| `terminal-ui` | Full-screen interactive terminal frames |
| `command-line-tool` | Line-oriented scriptable process contract |
| `desktop` | Native or packaged graphical desktop interface |
| `api` | Public network request/response contract |
| `backend` | Service behavior without a primary public UI |
| `library` / `package` | Imported public programming interface |

Only website, web application, dashboard, terminal UI, and command-line tool kinds have dedicated product-surface skills in this pack. Desktop, API, backend, library/package, and `other` remain valid bootstrap classifications, but their handoff must name a repository-owned or external workflow—or explicitly record that no specialist has been selected—before product implementation begins.

If a repository has several products, choose the primary bootstrap context and record others as explicit subprojects or open decisions. Do not flatten a monorepo into one imaginary product.
