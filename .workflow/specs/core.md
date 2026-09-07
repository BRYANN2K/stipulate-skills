# Contrat du cœur Spec Workflow

Ce contrat décrit le périmètre livré à la demande du propriétaire : sept skills et un moteur local. Les extensions métier sont une étape suivante.

## Comportements acceptés
- AC-1: Bootstrap crée AGENTS.md et la structure .workflow sur un nouveau projet ; sur un projet existant, il préserve les conventions et fichiers présents et évite les doublons.
- AC-2: Explore crée uniquement un changement réel, avec proposal.md, spec.md, evidence.md et state.json ; tasks.md reste facultatif. Il sélectionne les extensions pertinentes pour cette idée.
- AC-3: Validate expose un contrat relisible ; apply exige un accord explicite portant sur sa version actuelle. Une modification des documents contractuels ou des références sélectionnées invalide cet accord.
- AC-4: Apply conserve une référence des sources et des travaux préexistants. Check exige un résultat inspectable pour chaque critère et une empreinte correspondant aux sources actuelles.
- AC-5: Seul un check entièrement réussi permet de terminer la documentation. Les changements documentaires sont déclarés ; les autres changements exigent une nouvelle vérification.
- AC-6: Archive promeut la spécification complète, conserve les pièces du changement et crée un commit local ciblé sans intégrer de travaux étrangers ni effectuer de push.
- AC-7: Les sept skills restent exécutables depuis leur propre installation ; l’installeur préserve les skills étrangers et refuse d’écraser des copies modifiées.

## Limites explicites
Les preuves et l’accord sont des attestations locales, pas des signatures authentifiées. L’agent réalise la revue sémantique et les observations. Les sous-modules ne sont pas gérés. Les fichiers Git ignorés sont hors empreinte. La CI distante et l’évaluation comportementale d’Astra sur projets réels ne sont pas déclarées réussies par la seule validation locale du moteur.
