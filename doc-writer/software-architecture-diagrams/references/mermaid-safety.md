# Mermaid syntax, portability, and safety

## Portable syntax

- Use stable alphanumeric/camelCase node IDs and quoted labels.
- Avoid reserved IDs such as `end`.
- Quote labels containing parentheses, punctuation, or markup.
- Keep subgraph identifiers simple and put display names in brackets/quotes.
- Prefer explicit arrows and concise edge labels.
- Avoid renderer-specific directives unless the target supports them.
- Escape or rewrite user-provided text rather than injecting raw syntax.

## Security

Do not include secrets, tokens, private hostnames, account IDs, customer names, sensitive data flows, or exploitable topology in public artifacts. Treat Mermaid initialization directives, links, and HTML labels as active content; avoid them unless trusted and required.

## Rendering

When Mermaid CLI is available:

```bash
mmdc -i diagram.mmd -o diagram.svg -b transparent
```

Use the repository's pinned command if present. Verify the actual target renderer (GitHub, MkDocs, Docusaurus, etc.) because Mermaid versions differ.

## Accessibility

Provide a descriptive title and adjacent prose summary. Do not rely on color alone. Keep text contrast strong and labels readable at typical README width. For critical procedures, provide a text/table equivalent.
