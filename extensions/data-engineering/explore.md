# data-engineering — explorer

Rendre un flux de données traçable, rejouable et vérifiable de la source au consommateur.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter une ingestion incrémentale qui gère doublons, retard et évolution de schéma. Exemple hors périmètre : Changer une interface sans flux ou transformation de données affectés.

Cette extension rend un flux de données reproductible, observable et exploitable : ingestion, transformation, partitionnement, schéma, qualité, orchestration, stockage, lineage et reprise. Elle s’active dans `spec-explore` dès qu’un changement modifie une source, un job, un DAG, un dataset, un format de fichier, une table analytique, une fenêtre temporelle ou une règle de qualité. Elle s’active aussi lorsqu’un produit commence à dépendre d’un calcul batch ou d’un pipeline asynchrone.

Elle ne s’active pas pour un calcul en mémoire limité à une requête sans dataset durable, ni pour une base transactionnelle dont aucun pipeline ni contrat analytique ne change. Elle ne choisit pas Airflow, Parquet, dbt ou OpenLineage à la place du projet. Les bonnes pratiques Airflow actuelles traitent les tâches comme des transactions : sorties complètes, rerun au même résultat, partitions explicites, stockage distant entre workers et secrets dans des connexions ([Airflow Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)). Parquet sépare métadonnées et chunks de colonnes, ce qui permet au lecteur d’identifier les colonnes avant de les lire ([Parquet File Format](https://parquet.apache.org/docs/file-format/)). Ce sont des propriétés et pratiques à appliquer si le pipeline utilise ces outils, pas des obligations universelles.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher sources et propriétaires, fréquence, watermark, partitions, schéma, contrat de qualité, format, stockage, orchestration, secrets, rétention, coûts et consommateurs. Pour un projet en cours, rejouer une fenêtre passée, inspecter les inputs/outputs, simuler doublon et retard, comparer schémas, mesurer volumes et vérifier un rerun après panne. Classer chaque constat comme **établi** (run, dataset, test ou artefact reproductible), **inféré** (intention ou documentation non exécutée), **incomplet** (fenêtre, source ou colonne manquante), **manquant** (recherche sans artefact) ou **non applicable** (pas de pipeline/dataset durable). Un DAG vert ne prouve pas l’idempotence ni la fraîcheur ; un fichier Parquet lisible ne prouve pas la qualité métier.

OpenLineage distingue jobs, runs et datasets, avec événements de conception et événements de run ; les facettes peuvent porter schéma, statistiques et métriques de qualité ([OpenLineage Object Model](https://openlineage.io/docs/spec/object-model/)). Cette distinction évite de confondre “le pipeline est documenté” avec “ce run a traité cette partition”. Les versions de format Parquet peuvent introduire des fonctions incompatibles selon le lecteur ; il faut donc vérifier la matrice réelle plutôt que le seul suffixe de fichier ([Parquet format versions](https://parquet.apache.org/docs/file-format/versions/)).

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend une source propriétaire, un dataset de sortie, schéma/grain, partition ou fenêtre, rerun déterministe, test de complétude et rapport de run. Approfondir si le flux alimente décisions, finance ou ML, a de gros volumes, plusieurs consommateurs, données sensibles, retards ou SLA de fraîcheur : tester backfill, évolution de schéma, compatibilité lecteurs, qualité par colonne, coûts, lineage runtime/design, purge et restauration. Ne pas ajouter une plateforme de lineage à un script local sans problème d’ownership ou d’audit.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`database-engineering` porte stockage transactionnel et index ; `backend-engineering` fournit événements et contrats ; `api-integrations` traite ingestion externe ; `analytics-experimentation` définit l’usage des métriques ; `ai-engineering` peut consommer un dataset mais ne garantit pas sa qualité. Éviter les tâches non idempotentes avec retries, les chemins locaux entre workers, les backfills sans fenêtre figée, le schéma implicite et le lineage purement décoratif. Airflow, Parquet et OpenLineage ont leurs propres modèles ; les adapter à notre architecture plutôt que les présenter comme norme unique. Un CSV temporaire jamais consommé ne déclenche pas l’extension.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
