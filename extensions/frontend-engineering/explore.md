# frontend-engineering — explorer

Construire le comportement web rendu, ses états, données, accessibilité et performances.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Implémenter une recherche web avec chargement, erreur, navigation clavier et résultats asynchrones. Exemple hors périmètre : Modifier exclusivement une infrastructure sans comportement frontend affecté.

Cette extension transforme une intention d’interface en comportement livrable, testable et maintenable côté navigateur : structure de l’écran, états, navigation, données, erreurs, performance et compatibilité. Elle s’active dans `spec-explore` dès que le changement modifie une surface web, une interaction, un rendu client, un parcours de navigation ou une dépendance de build frontend. Une modification de contrat backend qui oblige à adapter un écran l’active également, en coordination avec `backend-engineering` ou `api-integrations`.

Elle ne s’active pas pour une correction exclusivement serveur, une décision visuelle sans implémentation, ou un document qui ne promet aucun comportement d’interface. Elle ne prescrit pas un framework, une bibliothèque de composants ni un niveau de design. WCAG 2.2 définit des critères de succès testables, quatre principes d’accessibilité et trois niveaux de conformité ; la page recommande de combiner évaluation automatisée et jugement humain ([WCAG 2.2](https://www.w3.org/TR/wcag/)). Les seuils et la séquence ci-dessous sont donc un contrat d’intégration adapté au projet, pas une déclaration automatique de conformité WCAG.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher le point d’entrée, les routes prévues, le système de styles, les composants réutilisables, les données simulées ou réelles, la cible navigateur, les commandes de build et les vérifications déjà disponibles. Pour un projet en cours, lire la spec et les critères précédents, inspecter le code réellement monté, vérifier les états de chargement/erreur/vide, relever la baseline de performance et reproduire les parcours principaux. Classer chaque constat comme **établi** (artefact ou commande vérifiable), **inféré** (indice sans preuve directe), **incomplet** (trace partielle), **manquant** (recherche effectuée sans trace) ou **non applicable** (pas de surface concernée). Une page existante ne prouve pas que son état hors-ligne, clavier ou erreur est couvert ; l’absence de test n’est pas la preuve d’une absence de comportement.

L’ARIA Authoring Practices Guide décrit des motifs de widgets, leurs rôles, états, propriétés, nom accessible et interactions clavier ([WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)). Il sert à vérifier un composant interactif, pas à ajouter des rôles à l’aveugle. Pour la performance, Google définit des indicateurs issus d’expérience réelle : LCP, INP et CLS, avec des repères respectifs de 2,5 s, 200 ms et 0,1 ([Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)). MDN décrit la progressive enhancement comme un contenu et une fonction de base utilisables d’abord, puis enrichis après détection des capacités ([Progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)). Ces pages permettent de distinguer une mesure disponible, une mesure non instrumentée et une exigence hors périmètre.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend la route ou surface concernée, les états succès/chargement/erreur/vide, une navigation principale au clavier, un test de comportement et une vérification de build. Approfondir si l’écran est critique, public, multilingue, fortement dynamique, utilisé sur mobile, soumis à une exigence d’accessibilité, ou sensible à la performance : mesurer les Core Web Vitals sur une baseline représentative, tester les annonces et focus avec un outil et une personne, couvrir les navigateurs supportés et vérifier les chemins de repli. Ne pas transformer un label ou une couleur interne en campagne d’audit sans risque correspondant.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`api-integrations` doit fournir le contrat de données et les erreurs ; `backend-engineering` précise disponibilité, pagination et limites ; mobile ou desktop peuvent reprendre les mêmes invariants avec des contrôles différents. Éviter de traiter une capture comme spécification, de mettre un spinner sans stratégie d’erreur, d’ajouter ARIA sans modèle de clavier, ou de confondre score Lighthouse et expérience réelle. Le Core Web Vitals guide des mesures web et ne garantit pas chaque appareil ; APG décrit des motifs et non un composant prêt à copier. Une modification de texte sans changement de comportement ne déclenche pas l’extension, sauf si elle change le nom accessible ou le contrat de contenu.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
