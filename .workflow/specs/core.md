# Stip core contract

This contract describes the owner-requested core: seven skills and a local engine. The repository also ships optional domain extensions, documented separately in `docs/extensions.md`; they contribute to the same change contract.

## Accepted behavior

- AC-1: Bootstrap creates AGENTS.md and the .workflow structure for a new project; for an existing project, it preserves existing conventions and files and avoids duplicates.
- AC-2: Explore creates only a real change, with proposal.md, spec.md, evidence.md, and state.json; tasks.md remains optional. It selects the extensions relevant to the idea.
- AC-3: Validate exposes a reviewable contract; apply requires explicit approval of its current version. Changing contract documents or selected references invalidates that approval.
- AC-4: Apply preserves a source baseline and records preexisting work. Check requires an inspectable result for every criterion and a digest matching current sources.
- AC-5: Only a fully successful check allows documentation to complete. Documentation changes are declared; other changes require renewed verification.
- AC-6: Archive promotes the complete specification, preserves change records, and creates a scoped local commit without including unrelated work or pushing.
- AC-7: The seven skills remain executable from their own installation; the installer preserves unrelated skills and refuses to overwrite modified copies.

## Explicit limits

Evidence and approval are local attestations, not authenticated signatures. The agent performs semantic review and observations. Submodules are unsupported. Git-ignored files are outside the snapshot. Local engine validation alone does not establish that remote CI or Astra's behavioral evaluation on real projects has passed.
