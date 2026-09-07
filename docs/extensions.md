# Extensions métier — interface v1 et catalogue local

Le dépôt livre 28 packages indépendants du noyau. Les sept skills core restent les seules entrées de découverte Codex/Orca ; les extensions ne sont ni 28 skills supplémentaires ni des plugins exécutables. Aucun métier n’est installé par bootstrap ou par l’installeur des skills core.

Bootstrap cartographie l’existant. **La sélection pour un changement se décide pendant spec-explore**, selon le comportement touché et les inconnues réelles. Une extension disponible n’est pas automatiquement sélectionnée ; un changement cloud seul n’active pas UX/design. Chaque métier contribue au même contrat approuvé.

## Installer seulement les packages souhaités

Depuis ce dépôt, Python 3.10+ et Git pour le workflow :

```sh
python3 scripts/validate_extensions.py
python3 scripts/workflow.py --root /chemin/physique/du/projet bootstrap
python3 scripts/install_extensions.py --project /chemin/physique/du/projet \
  --extension cloud-engineering --extension devops-delivery --dry-run
python3 scripts/install_extensions.py --project /chemin/physique/du/projet \
  --extension cloud-engineering --extension devops-delivery
python3 scripts/workflow.py --root /chemin/physique/du/projet extensions
```

Les chemins d’exemple doivent être remplacés par ceux du projet. L’installeur exige une liste explicite, copie les packages dans `.workflow/extensions/<id>` et ajoute leurs entrées à la configuration en préservant les autres clés. Il ne modifie ni AGENTS.md, ni la carte du projet, ni les changements en cours. Il refuse les liens symboliques, une configuration conflictuelle ou une copie différente ; une copie identique est réutilisée. Les écritures respectent le verrou du moteur, toutes les collisions sont contrôlées avant copie, et un échec de copie retire seulement les nouveaux dossiers créés. Le dry-run ne modifie rien.

Le dossier installé est autonome : ses quatre références, ses sources et ses cas éditoriaux sont locaux. Aucun chemin du dépôt source n’est nécessaire au moteur. Après installation, utiliser le runtime de l’un des sept skills déjà installés ou celui du dépôt. L’installeur des extensions nécessite le dépôt source contenant le catalogue ; il n’est pas recopié dans les skills core.

## Sélectionner dans un changement

```sh
python3 scripts/workflow.py --root /chemin/physique/du/projet \
  explore migration-stockage --extension cloud-engineering
```

Cet exemple ne sélectionne pas devops-delivery malgré sa disponibilité. `explore correction-texte` sans option ne sélectionne aucun métier. Pour modifier la sélection d’un changement pendant son exploration :

```sh
python3 scripts/workflow.py --root /chemin/physique/du/projet \
  select migration-stockage --extension cloud-engineering --extension devops-delivery
```

`select` remplace la liste et invalide un accord précédent. `extensions` affiche les références disponibles ; `start` rappelle seulement celles sélectionnées. Le moteur retourne chemins et empreintes, pas des instructions chargées automatiquement : l’agent lit la référence de la phase pertinente. Ne pas charger le catalogue entier dans chaque prompt.

## Configuration manuelle et mises à jour

Une installation manuelle peut copier un package dans le projet puis **fusionner** cette entrée avec `.workflow/config.json`, sans écraser les paramètres existants :

```json
{
  "schema_version": 1,
  "extensions": {
    "cloud-engineering": {
      "enabled": true,
      "path": ".workflow/extensions/cloud-engineering"
    }
  },
  "settings": {"require_user_approval": true}
}
```

Le chemin peut désigner un autre dossier **à l’intérieur du projet**. Il doit exister avant configuration ; pas de chemin absolu, de remontée `..` ou de lien symbolique. `enabled: false` rend un métier indisponible aux nouvelles sélections ; le désactiver alors qu’un changement le sélectionne empêche sa poursuite, donc revoir d’abord sa sélection et son contrat.

L’installeur refuse les mises à jour destructrices et les personnalisations différentes. Pour mettre à jour, comparer les fichiers source et locaux, préserver les modifications utilisateur, puis remplacer les seuls fichiers approuvés. Toute modification du manifeste ou des quatre références sélectionnées invalide l’accord du changement : réviser et faire réapprouver avant apply. Les sources et cas d’évaluation sont informatifs et ne sont pas inclus dans l’empreinte v1 ; toute exigence qui en provient doit être inscrite dans la spec commune.

## Manifeste v1

Chaque dossier contient :

```json
{
  "schema_version": 1,
  "id": "cloud-engineering",
  "description": "Concevoir des ressources cloud reproductibles avec leurs accès, récupération, santé et coût.",
  "explore": "explore.md",
  "apply": "apply.md",
  "check": "check.md",
  "docs": "docs.md"
}
```

Seul `explore` est requis par le moteur ; les 28 packages fournissent les quatre phases. Les références sont relatives au package, sans remontée, absolu ou lien symbolique. Le moteur lit les manifestes et empreintes ; aucun hook ou code d’extension n’est exécuté. L’interface et le moteur v1 restent inchangés.

## Contrat, responsabilités et preuves

Explore reconnaît l’existant : **établi, inféré, incomplet, manquant, non applicable**, avec preuve ou justification. L’absence d’un document ne prouve pas l’absence d’une pratique. Réutiliser ou compléter avant de remplacer ; une étape métier peut déjà être satisfaite.

Les points de check sont des candidats à discuter pendant explore/validate. L’agent les adapte en vrais identifiants **AC-1, AC-2, etc., uniques dans la spec commune** ; le moteur ne remappe pas d’identifiants métier. Apply réalise les décisions approuvées. Check rapproche les observations du résultat exigé, distingue simulation et environnement réel et conserve failed/unverified lorsque le résultat manque. Docs contribue au skill core spec-docs, avec les lecteurs et informations métier concernés. Aucun métier ne s’attribue une approbation, ne change un seuil pour faire passer un résultat ou ne publie implicitement.

Les actions déjà autorisées restent autorisées dans leur périmètre. Une publication, un déploiement ou un contact externe exige seulement l’autorisation réellement nécessaire ; archive ne les déclenche pas. Les objectifs nécessitant une période d’exploitation restent distincts de leurs tests locaux.

## Vérification du catalogue

```sh
python3 scripts/validate_skills.py
python3 scripts/validate_extensions.py
python3 -m unittest discover -s tests -v
```

La validation inspecte les 28 manifestes, 112 références bornées et portables, les liens locaux et 112 cas éditoriaux. Les tests exercent installation ciblée, non-sélection par défaut, cloud sans design, collisions, préservation, verrou, rollback de copie, modification de référence et un cycle synthétique complet par package avec gate d’échec puis archive ciblée.

Ces tests prouvent l’intégration structurelle avec le moteur, **pas** la justesse d’un choix métier par Astra ni le résultat d’un projet réel. Chaque `evaluation.json` donne quatre cas pour une évaluation humaine ou agent : activation pertinente, non-activation, reprise d’existant, résultat insuffisant. Pour une évaluation comportementale, exécuter chaque prompt dans une fixture pertinente, conserver décision et preuves, comparer au résultat attendu et rapporter les écarts. Les sources sont une base relue le 7 septembre 2026 ; vérifier versions et applicabilité avant de s’appuyer sur une règle évolutive.

## Catalogue

Voir aussi [le catalogue machine](../extensions/catalog.json). Les descriptions aident au choix, sans l’automatiser.

| Package | Responsabilité |
|---|---|
| [accessibility](../extensions/accessibility/explore.md) | Rendre les tâches et contenus perceptibles, opérables, compréhensibles et robustes pour les publics concernés. |
| [ai-engineering](../extensions/ai-engineering/explore.md) | Borner et évaluer une capacité de modèle avec ses outils, erreurs, coûts et recours humains. |
| [analytics-experimentation](../extensions/analytics-experimentation/explore.md) | Relier hypothèse, instrumentation et méthode d’analyse à une décision mesurable. |
| [api-integrations](../extensions/api-integrations/explore.md) | Définir et vérifier une frontière API, ses identités, erreurs, répétitions et versions. |
| [backend-engineering](../extensions/backend-engineering/explore.md) | Garantir un comportement serveur cohérent en succès, erreur, concurrence et récupération. |
| [build-in-public](../extensions/build-in-public/explore.md) | Préparer un partage public utile des progrès, preuves, apprentissages et limites du projet. |
| [cli-tooling](../extensions/cli-tooling/explore.md) | Construire une interface en ligne de commande stable pour humains et automatisations. |
| [cloud-engineering](../extensions/cloud-engineering/explore.md) | Concevoir des ressources cloud reproductibles avec leurs accès, récupération, santé et coût. |
| [content-design](../extensions/content-design/explore.md) | Aider une personne à comprendre et accomplir sa tâche par un contenu clair dans le bon contexte. |
| [customer-support](../extensions/customer-support/explore.md) | Préparer diagnostic, aide et escalade pour les problèmes réellement rencontrés par les utilisateurs. |
| [data-engineering](../extensions/data-engineering/explore.md) | Rendre un flux de données traçable, rejouable et vérifiable de la source au consommateur. |
| [database-engineering](../extensions/database-engineering/explore.md) | Préserver invariants, compatibilité, performance et récupération lors d’une évolution de données persistées. |
| [design-system](../extensions/design-system/explore.md) | Faire évoluer des primitives et composants partagés avec leurs usages, contrats et migrations. |
| [desktop-engineering](../extensions/desktop-engineering/explore.md) | Vérifier une application de bureau dans ses fenêtres, processus, fichiers, permissions et packaging. |
| [devops-delivery](../extensions/devops-delivery/explore.md) | Rendre le chemin de construction et livraison reproductible, observable et récupérable. |
| [frontend-engineering](../extensions/frontend-engineering/explore.md) | Construire le comportement web rendu, ses états, données, accessibilité et performances. |
| [mobile-engineering](../extensions/mobile-engineering/explore.md) | Construire et vérifier une expérience mobile avec son cycle de vie, réseau, permissions et distribution. |
| [privacy-engineering](../extensions/privacy-engineering/explore.md) | Borner les données personnelles par finalité, minimisation, accès, conservation et droits. |
| [product-strategy](../extensions/product-strategy/explore.md) | Relier problème, public, valeur, alternatives et arbitrages à une décision produit. |
| [quality-engineering](../extensions/quality-engineering/explore.md) | Choisir des vérifications qui réduisent les risques réels et relier leurs résultats aux critères. |
| [release-management](../extensions/release-management/explore.md) | Préparer une version identifiable avec compatibilité, artefacts, notes et récupération. |
| [security-engineering](../extensions/security-engineering/explore.md) | Réduire les risques d’abus sur les actifs et frontières de confiance touchés par le changement. |
| [seo-discoverability](../extensions/seo-discoverability/explore.md) | Rendre des contenus publics découvrables et indexables selon leur intention et leurs contraintes. |
| [sre-operations](../extensions/sre-operations/explore.md) | Relier fiabilité perçue, indicateurs, objectifs, alertes et réponse aux dégradations. |
| [storytelling](../extensions/storytelling/explore.md) | Relier intention, promesse prouvable, messages et narration cohérente entre les surfaces du produit. |
| [user-research](../extensions/user-research/explore.md) | Réduire une inconnue sur les personnes, leurs tâches et leur contexte par une observation proportionnée. |
| [ux-design](../extensions/ux-design/explore.md) | Concevoir parcours, interactions, états et récupération pour une tâche utilisateur. |
| [visual-design](../extensions/visual-design/explore.md) | Définir hiérarchie, lisibilité, couleurs, typographie, espaces et états visuels adaptés. |
