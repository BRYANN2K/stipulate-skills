# Mermaid syntax, portability, and safety

## Source syntax

Useful portable practices include stable simple node IDs, quoted labels with punctuation, simple subgraph IDs, explicit arrows, concise edge labels, and avoidance of renderer-specific directives unless the target supports them. Escape or rewrite untrusted text instead of injecting it as Mermaid syntax.

These practices are heuristics, not a substitute for checking the repository's pinned Mermaid version and actual target renderer.

## Security

Do not include secrets, tokens, customer names, private hostnames, account IDs, sensitive data flows, or exploitable topology in artifacts whose audience is not authorized. Treat initialization directives, links, callbacks, and HTML labels as active content; use them only with trusted input and a target configuration that permits them.

## Syntax and rendering are separate

When a compatible Mermaid CLI is available, a basic render command is:

```bash
mmdc -i diagram.mmd -o diagram.svg -b transparent
```

Prefer the repository's pinned command. A successful parse establishes only that this tool accepted the syntax. A successful render establishes that this renderer produced output. Neither proves architecture truth, cross-renderer portability, readability, accessibility, or security.

Inspect the actual target renderer—such as GitHub or the repository docs site—when compatibility or layout is part of the claim. If rendering is unavailable, report it rather than upgrading a static check.

The source/render distinction and syntax behavior are informed by [mermaid-js/mermaid at `a8bff7b`](https://github.com/mermaid-js/mermaid/tree/a8bff7b01acf24b080ecce973b940373eea79aac) (MIT). This guidance is independently worded.

## Accessibility

Provide a descriptive title and enough adjacent prose to convey the view's conclusion. Do not rely on color alone. Check contrast and label readability at the intended width when rendered quality is claimed. For critical procedures, provide an equivalent text or table when a diagram alone is insufficient.

Mermaid `accTitle` and `accDescr` are target-version-conditional source features, not universal directives. Confirm that the repository's Mermaid version, diagram type, and actual renderer accept them before adding them. If the target does not support them, preserve the accessible title and description in adjacent prose or repository-native host metadata rather than introducing invalid syntax.

Keep the claims separate:

- **Source accessibility:** supported `accTitle`/`accDescr` or an explicit adjacent equivalent exists.
- **Rendered SVG metadata:** the delivered SVG or host wrapper was inspected after rendering and sanitization, and exposes the intended accessible name and description through the target's DOM or accessibility semantics.
- **Visual readability:** labels, contrast, layout, and zoom are usable at the intended size.

Passing one does not establish the others. In particular, directives accepted by a parser do not prove that a downstream renderer or sanitizer preserved accessible SVG metadata.

## Compact evals

- **Positive:** The pinned target accepts `accTitle` and `accDescr`; the final hosted SVG exposes the intended name and description, while contrast and intended-width readability are reported as a separate render check.
- **Negative:** Accessibility directives are added without checking the target version, parsing succeeds elsewhere, and the diagram is called accessible without inspecting the delivered SVG or its readability.

## Accessibility source note

The directive guidance is independently worded from [`docs/config/accessibility.md` in Mermaid at `a8bff7b0`](https://github.com/mermaid-js/mermaid/blob/a8bff7b01acf24b080ecce973b940373eea79aac/docs/config/accessibility.md) (MIT). The separation between an accessible name, description, and visual presentation is informed by [`index.html` in WAI-ARIA at `2f5c69b0`](https://github.com/w3c/aria/blob/2f5c69b053c2b03f03fb00b4c9ff2c4ce517af55/index.html) (W3C Document License). This skill does not assume a particular renderer-to-SVG mapping without inspecting the target output.
