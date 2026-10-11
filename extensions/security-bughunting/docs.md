# security-bughunting — docs

This reference contributes to **stip-docs**; it neither replaces core documentation nor creates an independent phase.

For maintainers and reviewers: the vulnerability classes checked, the controls added, the tests that demonstrate them, the evidence and its limits, and any residual risk with a dated follow-up.

Find and update documents these readers already use before creating new ones. Document the delivered behavior, the decisions that help a reader maintain the control, examples actually verified on an authorized fixture, and what remains simulated rather than observed. Link useful criteria and results without copying a research folder.

Note the review scope: this was a hunt for weaknesses in the change on authorized code and systems, not a guarantee of absence of vulnerabilities and not a test of third-party systems. If the project runs the security role on a specific model, record it; the most capable model can be selected for that role in `.workflow/config.json` or the Settings tab, and this package pins no model.

Verify changed examples and links, keep secrets and personal data out of the documentation, and report changed paths and their purpose to the core. If no documentation is affected, explain why in the docs summary. A residual risk or a future retest remains a separate, authorized follow-up. Archive closes the local change and does not publish these documents.
