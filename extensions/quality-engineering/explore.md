# quality-engineering — explorer

Choisir des vérifications qui réduisent les risques réels et relier leurs résultats aux critères.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Définir une stratégie de test pour une migration comportant plusieurs modes de panne. Exemple hors périmètre : Ajouter une vérification miroir pour une modification textuelle triviale déjà inspectée sans risque distinct.

Cette extension transforme les attentes de qualité d’un changement en propriétés observables, risques testables et preuves de vérification. Elle couvre la qualité du produit et du service, les tests fonctionnels et non fonctionnels, les revues statiques, les données et environnements de test, les défauts et la régression. Les tests ordinaires des changements restent une fonction du cœur ; on active cette extension dans `spec-explore` lorsque le changement nécessite une stratégie de qualité transversale, des qualités non fonctionnelles, une gestion de risque, des critères de compatibilité ou une campagne de vérification qui dépasse les contrôles courants du cœur. Elle n’a pas à être activée pour une modification purement documentaire sans effet comportemental, sauf si la documentation est elle-même un livrable contractuel.

ISO/IEC 25010:2023 fournit un modèle de neuf caractéristiques de qualité pour spécifier, mesurer et évaluer un produit ([ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html)). La page ISO consultée expose la notice et le résumé public ; le texte intégral du standard est vendu et n’a pas été traité comme librement accessible. ISO/IEC/IEEE 29119-2 décrit des processus génériques de test applicables à différents cycles de vie ([ISO/IEC/IEEE 29119-2:2021](https://www.iso.org/standard/79428.html)) ; la page consultée expose également le résumé public. Ce sont des standards de référence, pas une obligation universelle ni une certification du projet. L’extension ne remplace ni sécurité, ni accessibilité, ni UX, ni support ; elle vérifie les qualités que le contrat du changement a réellement retenues.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher la définition du résultat attendu, les parcours ou interfaces prévues, les contrats d’API, les contraintes de données, les environnements disponibles et les outils de test. Dans un projet en cours, rechercher les tests existants, suites CI, rapports de défauts, métriques de production, tests d’acceptation, contrats de compatibilité et procédures de régression.

Chaque constat doit porter un état explicite : **établi** (preuve observée et reliée à la version), **inféré** (indice plausible mais non vérifié directement), **incomplet** (preuve partielle), **manquant** (aucune preuve après une recherche définie), ou **non applicable** (risque ou qualité hors périmètre, avec justification). Un fichier `tests/` présent ne prouve donc ni couverture utile ni exécution réussie. Pour un système en cours, comparer aussi une référence avant changement ; pour un projet neuf, produire une première baseline minimale plutôt que d’inférer une absence de défaut.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP consiste à sélectionner les risques principaux, définir un petit nombre de critères d’acceptation, exécuter les tests adaptés sur un environnement identifiable et enregistrer les résultats. Pour une modification locale à faible risque, une revue et quelques scénarios ciblés peuvent suffire. L’approfondissement se déclenche par impact utilisateur, criticité, données ou intégrations : tests de contrat et de compatibilité, tests de charge avec baseline, tests de résilience, mutation ou fuzzing, tests d’accessibilité avec l’extension concernée, et analyse de tendances de défauts. ISO 29119 décrit des processus ; il ne commande pas que chaque projet produise tous les artefacts.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

La sécurité, la confidentialité, le cloud et le SRE apportent leurs propres risques et signaux ; qualité-engineering les relie aux tests sans décider de leurs seuils métier. Release-management peut exiger une vérification d’artefact ; devops-delivery peut fournir la pipeline, mais le noyau v1 ne suppose aucune CI ni développement trunk-based. Éviter la couverture comme objectif isolé, les tests dépendants de données de production, les benchmarks sans environnement comparable et les tests verts qui n’exercent pas le comportement demandé. Ne pas activer cette extension pour changer uniquement un libellé interne non exposé et sans contrat de qualité ; une vérification documentaire du changement cœur suffit alors.

Les standards cités donnent des modèles et processus, pas une garantie de qualité ni de conformité. La stratégie, les seuils, les étapes et la distinction des statuts sont notre synthèse d’intégration au contrat Spec Workflow.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
