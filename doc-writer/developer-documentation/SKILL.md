---
name: developer-documentation
description: "Use when creating, restructuring, auditing, or maintaining developer documentation: READMEs, quickstarts, tutorials, how-to guides, concepts, API/CLI/config reference, runbooks, troubleshooting, migration guides, changelogs, and docs-as-code systems. Inherits the repository's documentation structure, grounds changed claims in source, and verifies affected examples proportionately."
license: Apache-2.0
compatibility: Works with Markdown and common documentation stacks. Project-specific linters, generators, and build tools are used when they govern the changed documentation.
metadata:
  version: "1.1.0"
  author: BRYANN2K
  category: doc-writer
  tags: documentation, readme, api-docs, tutorials, runbooks, diataxis, docs-as-code
---

# Developer Documentation

## Overview

Help a developer find, understand, or perform the requested work with the least documentation that solves the reader's problem. Inherit the repository's current docs structure, terminology, style, generators, and navigation before introducing a new scheme.

Choose the shortest safe path. A small correction may require only the governing source, the affected page, a direct edit, and link/readback checks. The workflow below is guidance for larger work, not a sequence of admission gates.

<HARD-GATE>
Do not invent commands, flags, APIs, versions, defaults, support guarantees, benchmark results, paths, behavior, or successful output. Ground changed technical claims in current code, schemas, generated help, tests, executable output, or an explicitly cited authoritative source. If a material claim or example cannot be checked, label that gap rather than presenting it as verified.
</HARD-GATE>

## When to use

- README, installation, quickstart, onboarding, tutorial, task guide, concept, or reference.
- API, CLI, configuration, environment-variable, schema, webhook, and error documentation.
- Runbook, troubleshooting, migration, deprecation, changelog, or release notes.
- Documentation structure, content audit, docs debt, style, navigation, or docs CI.

Use `architecture-decision-records` for consequential decisions and `software-architecture-diagrams` for architecture views, then link them where the repository normally does.

## Reader-intent heuristic

When useful, ask whether the reader mainly needs:

- a guided learning path;
- steps to accomplish a specific task;
- exact facts to look up;
- a conceptual explanation.

This is a planning lens, not a required taxonomy, page split, title set, or directory structure. A repository may intentionally combine needs in a README or use its own information architecture. Follow local conventions unless the user requested a redesign and evidence shows a different structure would help.

The [Diátaxis documentation framework at `957c09c`](https://github.com/evildmp/diataxis-documentation-framework/tree/957c09ca40b4a1edc23874f713e01937d50d54d5) (CC-BY-SA-4.0) is used only as evidence for the factual distinction among reader intents. The local workflow is independently written; do not copy its prose, templates, or distinctive structure into the repository.

## Workflow

### 1. Bound the reader, change, and local structure

Infer the audience, desired outcome, product/version/environment, affected pages, and exclusions from the request and repository. Ask only for a decision that cannot be inferred safely. Inspect applicable repository instructions, neighboring docs, navigation, generator ownership, and Git status.

For an existing docs set, use its page types and placement. Do not create a docs site, taxonomy, template set, ownership system, or navigation layer merely because one could exist.

### 2. Trace affected claims to their sources

Inspect only the sources needed for the pages and claims being changed: public APIs/types/schemas, CLI help, config definitions, implementation, tests, examples, migrations, release automation, ADRs, or current diff. Prefer generated or executable contracts for exact surfaces, while reporting genuine conflicts instead of silently changing product behavior in prose.

When an affected surface is generated, identify its ownership seam before editing: the authoritative input, existing generator or repository command, generated file or marked region, adjacent human-authored seam, and the input/generator revision represented by the output. Change an authoritative input and regenerate only when that input is documentation-bearing, already inside the requested authority, and the edit does not alter code behavior, schema semantics, CLI behavior, or another public machine contract. Otherwise preserve the generated boundary, hand off or request explicit scope expansion for the owning product source, and report the stale output as a gap. Do not overwrite human prose or patch generated output unless the repository explicitly makes that output an edit point. For conditional or single-source content, list only the product/version variants affected by the change.

For broad audits, a temporary docs-to-code coverage map can expose missing or stale areas. For a bounded edit, a few source locators in working notes are enough; no durable matrix is required. Load conditional guidance only when it helps:

- learning, task, README, or concept pages: [learning and task docs](references/learning-and-task-docs.md)
- API, CLI, config, schema, or errors: [reference documentation](references/reference-documentation.md)
- runbook, troubleshooting, migration, deprecation, or release notes: [operations and change docs](references/operations-and-change-docs.md)
- audit or docs-site structure: [documentation system](references/documentation-system.md)

### 3. Write the shortest useful path

Lead with the outcome and prerequisites that matter. Put warnings before the risky action, keep commands and effects together, use consistent project terminology, and link one canonical source instead of duplicating changing facts. Include permissions, failure, cleanup, rollback, compatibility, or next steps only where they affect the reader's task.

Templates under `templates/` are optional scaffolds for a new page. Existing repository structure and a smaller direct edit take precedence. Do not add marketing filler, fabricated quotes or output, raw secrets, real credentials, or decorative badges without signal.

### 4. Verify only the affected claims and examples

After the last edit, re-read the changed pages and run the smallest safe checks that can falsify the changed claims:

- inspect generated help or source for changed flags/defaults;
- run changed commands or examples in a safe sandbox when their successful use is claimed;
- validate changed API/config examples against the applicable schema or test server;
- regenerate affected output with the repository-owned path when available, then confirm the generated boundary, human seam, and expected source/generator revision were preserved;
- render or preview each affected product/version variant when conditional content changed, rather than checking only the default variant;
- check changed links, anchors, snippets, or Mermaid blocks;
- use the repository's docs build/lint/generator when required or when the change can affect it broadly.

Do not rerun every example, rebuild an unrelated site, or exercise production procedures for a bounded prose change. A parser proves syntax, not factual correctness; a docs build proves the build, not that commands behave as written. Record checks as passed, failed, skipped, unavailable, or not applicable, and label affected unverified examples clearly.

### 5. Integrate where the repository requires it

Update navigation, indexes, backlinks, generated sources, changelog links, ownership metadata, or maintenance triggers only when the local docs system or requested change requires them. Re-read the final diff and confirm no unrelated content, generated output, or human-authored context was lost.

## Output contract

Preserve this information when reporting authoring or audit work:

- artifact paths and the reader outcome addressed;
- material sources used for changed technical claims;
- checks run and their scoped results;
- unverified, stale, conflicting, skipped, or unavailable items;
- for an audit, prioritized findings and affected pages rather than unsupported completeness claims.

No fixed section order is required. A user-requested or host presentation adapter may reorder, chunk, summarize, or progressively disclose the response as long as it retains the artifact, source/evidence, validation, and gap boundaries.

## Common pitfalls

- Reorganizing the repository around a documentation framework instead of solving the requested reader problem.
- Writing from memory before checking code, schema, generated help, or existing docs.
- Hand-copying generated reference that will drift.
- Showing output that was never observed.
- Testing the whole documentation estate when only one claim changed—or testing nothing while claiming the example works.
- Hiding destructive effects, permissions, or rollback information needed for the task.
- Calling grammar or a successful docs build proof of technical accuracy.

## Verification checklist

- Did the change inherit the repository's docs structure and source ownership?
- Is any generated ownership seam intact, and were affected product/version variants checked rather than inferred from one render?
- Do material changed claims trace to current evidence?
- Were affected examples checked, or clearly labeled when they could not be?
- Are warnings placed before consequential actions?
- Is the result discoverable to the extent the repository normally requires?
