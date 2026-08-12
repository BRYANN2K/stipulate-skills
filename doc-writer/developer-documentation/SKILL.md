---
name: developer-documentation
description: "Use when creating, restructuring, auditing, or maintaining developer documentation: READMEs, quickstarts, tutorials, how-to guides, concepts, API/CLI/config reference, runbooks, troubleshooting, migration guides, changelogs, and docs-as-code systems. Grounds claims in code and tests examples before completion."
license: Apache-2.0
compatibility: Works with Markdown and common documentation stacks. Project-specific linters, generators, and build tools are used when available.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: doc-writer
  tags: documentation, readme, api-docs, tutorials, runbooks, diataxis, docs-as-code
---

# Developer Documentation

## Overview

Write the complete documentation a developer needs to discover, adopt, understand, operate, change, and migrate a software project. Classify the reader's job first, then ground every technical claim in the repository, executable output, or an explicitly cited source.

<HARD-GATE>
Do not invent commands, flags, APIs, versions, defaults, support guarantees, benchmark results, file paths, or successful output. Inspect the source of truth and run examples when feasible. If verification is unavailable, label the example or claim unverified.
</HARD-GATE>

## When to use

- README, installation, quickstart, onboarding, tutorial, how-to, explanation, reference.
- API, CLI, configuration, environment-variable, schema, webhook, and error documentation.
- Runbook, troubleshooting, incident procedure, migration, deprecation, changelog, release notes.
- Documentation architecture, content audit, docs debt, style guide, docs CI, contribution workflow.

Use `architecture-decision-records` for decisions and `software-architecture-diagrams` for diagrams. Link them into the broader documentation set rather than duplicating them.

## Documentation map

Choose one primary intent per page:

| Intent | Reader asks | Doc type |
|---|---|---|
| Learn | “Can you teach me?” | Tutorial |
| Accomplish | “How do I do X?” | How-to guide |
| Look up | “What exactly is X?” | Reference |
| Understand | “Why does this work this way?” | Explanation |

Project entry points, operations, changes, and migrations use dedicated contracts but still follow the same separation. Do not mix a tutorial, reference dump, and conceptual essay into one long page.

## Workflow

### 1. Define the reader and outcome

State:

- primary audience and assumed knowledge;
- task or understanding they need;
- software/version/environment in scope;
- artifact type and where it belongs;
- what is intentionally out of scope.

Prefer an existing docs convention and information architecture over creating a new one.

**Complete when:** one reader, one primary intent, and one observable outcome are explicit.

### 2. Inspect sources of truth

Before writing, trace the relevant behavior through:

- README/docs and contribution rules;
- manifests and lock files;
- public APIs, types, schemas, OpenAPI/AsyncAPI, CLI help, config definitions;
- implementation and call sites;
- tests, examples, fixtures, migrations, and release automation;
- existing ADRs, diagrams, runbooks, and changelog;
- current Git diff when documenting a change.

When sources disagree, prefer executable contracts and current code, then report/document the inconsistency. Do not silently “fix” behavior in prose.

### 3. Select the output contract

Load the matching reference:

- README, quickstart, tutorial, how-to, concept → `references/learning-and-task-docs.md`
- API, CLI, config, schema, errors → `references/reference-documentation.md`
- Runbook, troubleshooting, migration, deprecation, release notes → `references/operations-and-change-docs.md`
- Audit or docs-site design → `references/documentation-system.md`

Use the relevant template under `templates/`.

### 4. Outline before prose

Create headings that match the reader's path. Lead with outcome and shortest success path. Put prerequisites before commands, explanations after the step they clarify, and exhaustive details in reference.

Each page should answer quickly:

1. What is this?
2. Who is it for?
3. What outcome will I get?
4. What must I have first?
5. What is the shortest verified path?
6. What can go wrong or where do I go next?

### 5. Write for execution and scanning

- Use active voice, present tense, concrete nouns, and direct verbs.
- Prefer short paragraphs, descriptive headings, tables for comparisons, and numbered steps for sequences.
- Introduce commands before code blocks; explain expected effect after.
- Use consistent terminology; add a glossary only when terms cannot be avoided.
- Link to one canonical source instead of copying changing facts across pages.
- State defaults, constraints, permissions, failure modes, and destructive effects near the relevant action.
- Keep secrets and real credentials out of examples; use unmistakable placeholders.

Do not add marketing filler, fake quotes, fake output, or decorative badges with no signal.

### 6. Test the documentation

Validate according to artifact:

- run commands in a clean/sandboxed environment where safe;
- compile/run code samples and validate API requests against schemas or test servers;
- verify CLI flags from real `--help` or source;
- build the docs site;
- lint Markdown/style, check links/anchors, and render Mermaid;
- follow tutorial steps from zero with declared prerequisites;
- verify migration rollback and runbook decision points without touching production.

Mark every validation **passed**, **failed**, **skipped**, or **unavailable**. A plausible snippet is not a tested snippet.

### 7. Review technical and editorial quality

Run two distinct reviews:

- **Technical:** correctness, completeness, version, safety, executable examples, API/config parity.
- **Reader:** information scent, prerequisites, sequence, terminology, accessibility, cognitive load, next steps.

Check that warnings appear before risk, not after a destructive command.

### 8. Integrate and maintain

Update navigation/indexes, backlinks, API indexes, ADR links, changelog/release notes, and ownership metadata as applicable. Add a maintenance signal: code owner, generated source, review condition, version boundary, or deprecation date.

Documentation is complete only when discoverable and attached to the change it describes.

## Output contract

When authoring:

- artifact path and type;
- audience/outcome/version;
- completed document;
- source-of-truth map;
- validation log;
- known gaps or intentionally unverified items.

When auditing:

- inventory and audience journeys;
- findings by severity: incorrect, missing, stale, unsafe, hard to find, hard to use;
- evidence and affected pages;
- prioritized fix plan with owners/validation;
- suggested information architecture.

## Common pitfalls

- Writing before reading the code/schema/CLI.
- Using one page for tutorial, how-to, explanation, and reference.
- Copying generated API reference by hand.
- Showing success output that was never observed.
- Omitting permissions, cleanup, rollback, or destructive warnings.
- Documenting only the happy path.
- Adding a docs site when a strong README and a few focused pages are enough.
- Treating grammar as documentation quality while behavior is wrong.
- Shipping a new page without navigation or ownership.

## Verification checklist

- [ ] Audience, intent, outcome, version, and scope are explicit.
- [ ] Technical claims trace to current code, schema, tests, or cited sources.
- [ ] Commands/examples were tested or labeled unverified.
- [ ] Prerequisites, permissions, failures, cleanup, and next steps are present where needed.
- [ ] Terminology, links, anchors, and navigation are consistent.
- [ ] Docs build/lint/render checks have honest status.
- [ ] The artifact is discoverable and has a maintenance owner/trigger.
