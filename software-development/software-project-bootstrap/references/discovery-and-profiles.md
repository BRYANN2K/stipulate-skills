# Discovery and optional profile selection

Load this reference only when repository evidence and the user's request do not settle a consequential bootstrap choice, or when deciding whether the bundled deterministic profile is worth its ceremony.

## Inspect proportionately

Read only what the requested foundation needs:

1. applicable repository/agent instructions;
2. relevant workspace/package manifests and lockfiles;
3. active language/build configuration;
4. source and test roots;
5. existing documentation/specification directories;
6. CI declarations as evidence of commands, not authority to run them;
7. Git status without staging.

Do not inspect environment files, credential stores, private keys, secret-manager output, production databases, or user profiles merely to bootstrap structure.

## Ask only decision-changing questions

| Decision | Ask only when evidence does not establish and it changes the request |
|---|---|
| Product/interface | The next useful slice has no clear delivery surface |
| Language/toolchain | Active stacks conflict or none is selected |
| Package manager | Repository declarations conflict or a new project needs a choice now |
| Source/test roots | Existing ownership is unclear or the requested files need a layout decision |
| Validation | The user needs a declared check and no safe repository-native command is known |
| Durable specification | Coordination, compatibility, migration, security, or reversibility makes memory useful |

Do not ask about branding, providers, deployment topology, databases, authentication vendors, analytics, or UI frameworks unless they determine the requested foundation.

## Choose direct scaffolding by default

Use direct bounded writes when:

- the request names the files/layout or local conventions make them obvious;
- the target is absent/empty or conflicts are easy to inspect;
- only a few files are needed;
- no repeatable managed-file/drift contract is requested.

The original scaffolding request authorizes those bounded writes. Inspect targets and proceed without generating a manifest or asking again.

## Choose the optional deterministic profile when useful

The helper's `minimal` profile is appropriate when repeatable multi-file generation or later doctor checks are useful but coordination/risk is modest.

Its `spec-driven` profile may be useful when several systems/teams coordinate, public schemas/permissions/persisted data migrate, the work is hard to reverse, or security/privacy/compliance requires durable decisions. The profile does not authorize a particular spec tool. A generic spec should organize independently deliverable slices and decisions; it is not a prerequisite artifact train before implementation.

OpenSpec is only an already approved recorded choice. The helper neither installs nor initializes it.

## Product routing hints

These labels are routing hints, not a mandate to flatten a repository into one kind:

| Surface | Matching workflow in this pack |
|---|---|
| Public content/conversion | `website-production-engineering` |
| Stateful browser journey | `web-application-engineering` |
| Data/operations console | `dashboard-application-engineering` when dashboard semantics are material |
| Full-screen terminal frames | `terminal-ui-engineering` |
| Line-oriented process contract | `command-line-tool-engineering` |

Desktop, API, backend, library, package, and other work remains valid but should follow the repository's own specialist workflow when this pack has none. In a multi-product repository, bootstrap only the requested root/scope and preserve subproject ownership.
