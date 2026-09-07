# Interface des futures extensions

Aucune extension métier n’est installée par le noyau. Le bootstrap établit la nature du projet et les éléments existants. **L’activation pour un changement se décide pendant spec-explore**, selon l’idée discutée et les besoins réels.

Une extension configurée reste disponible ; elle n’est pas automatiquement sélectionnée. Cloud seul ne déclenche pas UX/design. Chaque extension contribue au même contrat de changement, sans questionnaire ou spec indépendante imposée.

## Manifeste v1

Exemple de contrat d’interface, pas d’extension métier livrée :

```json
{
  "schema_version": 1,
  "id": "cloud",
  "description": "Exploration des contraintes opérationnelles cloud.",
  "explore": "explore.md",
  "apply": "apply.md",
  "check": "check.md",
  "docs": "docs.md"
}
```

Seul `explore` est requis. Les autres références sont facultatives. Les chemins sont relatifs au dossier de l’extension ; pas de remontée, de chemin absolu ou de lien symbolique. Le moteur lit les manifestes et empreintes, mais n’exécute aucun hook ou code fourni par une extension.

Configuration dans `.workflow/config.json` :

```json
{
  "schema_version": 1,
  "extensions": {
    "cloud": {"enabled": true, "path": ".workflow/extensions/cloud"}
  },
  "settings": {"require_user_approval": true}
}
```

Sélection : `explore infrastructure-change --extension cloud`. `extensions` affiche les références disponibles ; `start` rappelle celles sélectionnées. Le dossier doit réellement exister avant configuration.

## Responsabilités métier prévues

Explore aide à reconnaître le travail déjà fait et à décider ce qui manque pour ce changement. Les contributions applicables deviennent des critères dans spec.md, discutés avec l’utilisateur. Apply fournit des procédures spécifiques. Check apporte les moyens de vérifier les critères. Docs identifie les lecteurs et les informations à conserver.

Les extensions ne peuvent pas attribuer une approbation utilisateur, modifier les critères pour rendre le code conforme, exécuter une publication implicite ou imposer un processus sans rapport avec le périmètre.

La prochaine étape est de concevoir les extensions métier avec des exemples positifs et négatifs. Le contrat v1 est vérifié par une extension synthétique de test, sans prétendre valider la qualité d’un métier.
