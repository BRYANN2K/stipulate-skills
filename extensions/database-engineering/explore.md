# database-engineering — explorer

Préserver invariants, compatibilité, performance et récupération lors d’une évolution de données persistées.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Migrer une colonne utilisée par deux versions de l’application sans perdre les données. Exemple hors périmètre : Modifier un style visuel sans schéma, requête ou persistance affectés.

Cette extension sécurise la donnée persistée et les requêtes qui la servent : modèle, contraintes, migrations, transactions, isolation, index, plans, sauvegardes, restauration, accès et évolution de schéma. Elle s’active dans `spec-explore` dès qu’un changement ajoute ou modifie une table/collection, une migration, une requête non triviale, un invariant de persistance, une politique de rétention ou un chemin de sauvegarde/restauration. Elle s’active aussi quand une API change sa pagination ou sa cohérence sans ajouter de table.

Elle ne s’active pas pour une modification sans lecture/écriture persistée, sauf si la performance ou le contrat de données change. Elle ne choisit pas PostgreSQL, SQLite ou un ORM à la place du projet. L’édition PostgreSQL 17 consultée explique que son modèle MVCC organise visibilité et concurrence, tout en laissant subsister conflits et deadlocks à traiter ([Concurrency Control](https://www.postgresql.org/docs/17/mvcc.html)). Sa documentation distingue `EXPLAIN`, qui fournit un plan et des coûts estimés, de `EXPLAIN ANALYZE`, qui exécute réellement la requête et mesure les lignes/temps ; ce dernier peut produire des effets d’écriture et demande un environnement contrôlé, une transaction réversible ou une autorisation explicite ([Using EXPLAIN](https://www.postgresql.org/docs/17/using-explain.html)). SQLite décrit commit atomique, verrous et rollback après panne ([Atomic Commit](https://www.sqlite.org/atomiccommit.html)). Ces sources ne transforment pas chaque CRUD en optimisation ou en test de panne.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher schéma, propriétaire des données, migrations, contraintes, index, volume, requêtes critiques, isolation, credentials, sauvegarde, restauration et règles de rétention. Pour un projet en cours, inspecter la base réelle dans un environnement sûr, lire migrations et rollback, mesurer les requêtes avec plans, simuler concurrence/doublon, vérifier permissions et restaurer une sauvegarde. Classer chaque constat comme **établi** (DDL, plan, test ou restauration reproductible), **inféré** (intention non mesurée), **incomplet** (un moteur, volume ou cas manque), **manquant** (recherche sans artefact) ou **non applicable** (aucune donnée persistée concernée). Une migration présente ne prouve pas qu’elle est compatible avec l’ancienne version ; une contrainte dans le code ne prouve pas son application concurrente en base.

OWASP recommande d’isoler la base, d’utiliser une API pour les clients épais, de chiffrer le transport quand nécessaire et de limiter les privilèges ([Database Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)). Nous l’utilisons pour choisir les contrôles pertinents, avec les secrets et rôles constatés dans le projet. `EXPLAIN` sert à caractériser un plan daté ; il ne prouve pas les performances de toutes les cardinalités.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend schéma/migration, contrainte clé, test de lecture/écriture, permission minimale, migration rejouée et mesure de la requête critique. Approfondir si la donnée est financière ou personnelle, le volume élevé, la migration destructive, les clients multiples, la forte concurrence ou la restauration critique : tester compatibilité expand/contract, deadlocks, isolation, plan par cardinalité, backfill, sauvegarde restaurée, chiffrement et séparation des rôles. Ne pas optimiser sur un plan isolé sans charge représentative.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`backend-engineering` porte transactions métier, retries et déploiement ; `api-integrations` expose cohérence et pagination ; `data-engineering` traite tables analytiques et lineage ; `security-engineering` peut approfondir les menaces. Éviter de laisser une invariance seulement dans l’UI, de mélanger migration de données et changement non compatible, de prendre un backup non restauré pour une preuve, ou de croire qu’un index réduit toujours le coût. SQLite et PostgreSQL ont des propriétés différentes ; les exemples des docs ne valent pas preuve de notre charge. Une modification sans persistance ni requête ne déclenche pas l’extension.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
