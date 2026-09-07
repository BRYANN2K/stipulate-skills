# data-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec identifie source, propriétaire, grain, fenêtre/partition, dataset de sortie et consommateurs ; une donnée non confirmée reste `incomplet`/`unverified` et ne passe pas.
- un rerun de la même fenêtre produit la sortie attendue sans doublon ni effet divergent, ou l’exclusion est décidée avant approbation pour un flux explicitement non rejouable.
- les tests de qualité choisis (par exemple schéma, complétude, unicité ou fraîcheur) sont exécutés sur une partition datée et leur rapport est conservé.
- le run et le dataset peuvent être retrouvés avec ownership, version et lineage prévu ; `failed`/`unverified` impose correction ou révision/réapprobation.

Lors de `validate`, l’agent traduit les `AC-DATA-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le pipeline termine sans erreur, mais des lignes disparaissent lors d’un rejeu.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
