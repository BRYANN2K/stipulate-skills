# database-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec relie chaque évolution de schéma à une migration versionnée, une contrainte ou une décision `non applicable` prise avant approbation ; le schéma manuel seul ne suffit pas.
- un test de concurrence, doublon ou transaction vérifie l’invariant choisi sur le moteur cible ; un `failed` ou `unverified` ne passe pas par justification.
- la requête critique possède un plan estimé (`EXPLAIN`) et, si une mesure réelle est engagée, un `EXPLAIN ANALYZE` daté sur jeu de données et environnement contrôlés, avec seuil et gestion des effets d’écriture ; si la performance n’est pas dans le périmètre, l’exclusion est actée avant inclusion du critère.
- migration, permission et restauration annoncées sont exécutées dans l’environnement défini, et les observations et limites sont conservées.

Lors de `validate`, l’agent traduit les `AC-DB-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **La migration passe sur une base vide, mais n’a pas été exercée sur des données existantes représentatives.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
