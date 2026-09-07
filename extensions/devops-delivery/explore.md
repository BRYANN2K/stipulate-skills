# devops-delivery — explorer

Rendre le chemin de construction et livraison reproductible, observable et récupérable.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Créer un pipeline qui produit un artefact traçable et permet un retour contrôlé. Exemple hors périmètre : Réécrire un texte sans build, pipeline ou livraison affectés.

Cette extension examine le flux qui transforme une modification en artefact vérifiable et, lorsque cela est explicitement autorisé, en livraison contrôlée. Elle couvre intégration continue, automatisation, petits lots, environnements, contrôles de changement, observabilité du flux, provenance et retour arrière. Elle s’active dans `spec-explore` si le changement modifie une pipeline, un workflow, un mécanisme d’intégration ou de déploiement, un artefact, une pratique de livraison ou une mesure de flux. Le cœur prend déjà en charge `apply/check` localement ; un changement applicatif ordinaire ne déclenche pas automatiquement cette extension.

DORA décrit des capacités qui favorisent la performance de livraison, dont intégration et livraison continues ([DevOps capabilities](https://docs.cloud.google.com/architecture/devops?authuser=9)). Sa page actuelle sur les métriques décrit cinq mesures : change lead time, deployment frequency, failed deployment recovery time, change fail rate et deployment rework rate ([DORA metrics](https://dora.dev/guides/dora-metrics/), mise à jour du 5 janvier 2026). Ce sont des résultats de recherche et un vocabulaire de pilotage, pas une obligation universelle ni une prescription de branches. GitHub Environments illustre des gates et secrets conditionnels à une plateforme ([GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)). SLSA 1.2 fournit une spécification progressive de provenance et de niveaux ([SLSA specification v1.2](https://slsa.dev/spec/v1.2/)). Le noyau v1 ne prétend pas fournir nativement CI, trunk-based development, déploiement ou métriques DORA.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher le chemin de commit à artefact, les outils de build/test, environnements, secrets de pipeline, règles de promotion, stratégie de rollback, métadonnées de provenance et événements permettant de mesurer les cinq métriques DORA retenues. Dans un projet en cours, examiner workflows réels, historique des exécutions, files d’attente, flakiness, changements manuels, différences entre environnements, artefacts téléchargés et incidents de livraison.

Utiliser les états **établi**, **inféré**, **incomplet**, **manquant** et **non applicable**. Une pipeline présente n’établit pas qu’elle a exécuté le commit courant ; un badge vert ne prouve pas le contenu de l’artefact ; une mesure DORA calculée sur des définitions différentes n’est pas comparable. Documenter les accès limités aux historiques ou environnements. Pour un projet neuf, établir une baseline minimale ; pour un projet existant, comparer la procédure réellement utilisée avec la procédure déclarée et expliciter les cinq métriques retenues ou leur non-applicabilité.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP relie un commit à un build reproductible, exécute les vérifications indispensables, produit un artefact identifié et documente la promotion manuelle si elle existe. Pour un projet local sans déploiement, cette preuve peut être une commande reproductible et un hash. Approfondir selon risque et volume : environnements séparés, gates d’approbation, tests parallèles fiables, cache maîtrisé, provenance SLSA, signatures, déploiement progressif, métriques DORA par définition stable, rollback automatisé et exercices de récupération. Les niveaux SLSA sont des objectifs choisis ; l’atteinte n’est pas présumée par la présence d’une CI.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Quality-engineering fournit les tests, security-engineering les contrôles de chaîne et secrets, release-management le contrat d’artefact, cloud-engineering l’environnement, SRE les signaux après livraison, et support les incidents utilisateurs. Éviter de confondre CI verte avec qualité globale, fréquence élevée avec valeur, ou déploiement automatique avec autorisation. Ne pas introduire trunk-based, publication ou changement de branche dans le cœur sans adaptation séparée. Ne pas activer l’extension pour une note de documentation interne sans effet sur le flux ; la consigner comme non applicable.

La description DORA, GitHub et SLSA est contextualisée à leurs sources ; le processus et les critères sont notre synthèse d’intégration et ne constituent ni certification ni promesse de performance.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
