<!-- web-craft:start -->
## Web Craft design gate

For any task that creates, redesigns, or materially changes files under `{{UI_ROOTS}}`:

1. load `web-craft` and follow `.design-flow/workflow.json`;
2. treat `.design-flow/artifacts/` as the reviewed source of truth;
3. do not modify protected product UI until `design_flow.py check-build --root .` passes;
4. after compilation, load `.agents/skills/{{PROJECT-SLUG}}-ui/SKILL.md` plus the surface-specific engineering skill;
5. never infer approval from a request to build, continue, or use judgment—the human must explicitly approve the presented design-system review set;
6. never edit the compiled project UI skill directly; edit `PROJECT-UI.md`, rerun `ready`, obtain new approval, and compile;
7. if any approved artifact digest is stale, stop product UI writes and return to review.

Work under `.design-flow/` may proceed before approval when it is limited to product evidence, copy, references, direction, tokens, components, and isolated preview artifacts rather than product routes or product frontend slices.
<!-- web-craft:end -->
