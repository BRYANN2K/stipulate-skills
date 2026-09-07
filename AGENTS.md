# Instructions du dépôt

Lire CONTRIBUTING.md avant de modifier le moteur ou les packages. Modifier scripts/workflow.py puis régénérer les copies avec scripts/build_skills.py. Valider les packages et les tests concernés. Les extensions métier ne font pas partie du noyau ; leur interface est décrite dans docs/extensions.md.

<!-- spec-workflow:start -->
## Spec workflow
Read `.workflow/project.md` when project intent or conventions matter. Configuration is
in `.workflow/config.json`. Explore changes with relevant enabled extensions; do not
load every extension or repeat project discovery for a bounded edit. User approval of
a specific contract is required before spec-apply. Build and correct within that scope.
Report evidence and gaps accurately. Documentation and archive follow successful checks.
Keep these instructions subordinate to system/developer instructions and current user intent.
<!-- spec-workflow:end -->
