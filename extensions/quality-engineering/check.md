# quality-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Chaque exigence retenue possède au moins un oracle explicite et un résultat de test relié au commit ou à l’artefact vérifié.
- Les scénarios critiques passent dans un environnement identifié ; un échec ou résultat non vérifié reste bloquant jusqu’à correction ou révision explicite et réapprobation du contrat.
- Une modification d’API démontre la compatibilité attendue avec un consommateur représentatif, ou documente la rupture et sa migration.
- Une propriété non fonctionnelle retenue (par exemple p95 de latence) est mesurée sur une charge et une fenêtre définies ; le résultat est comparé au seuil du contrat.
- Une régression détectée est reproduite et classée ; elle est corrigée avant le passage du critère, ou le contrat est explicitement révisé et réapprouvé avec un critère adapté ; le simple nombre de fichiers de tests ne constitue pas la preuve.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Tous les tests exécutés passent, mais le seul test du risque critique a été désactivé.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
