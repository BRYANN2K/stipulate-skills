# cli-tooling — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- `--help` ou l’aide équivalente décrit invocation, arguments, defaults, erreurs et exemples ; l’aide est générée ou vérifiée par une commande datée.
- succès, entrée invalide et opération refusée produisent des codes de sortie et flux stdout/stderr conformes au contrat ; un `failed` ou `unverified` ne passe pas par explication.
- le format machine annoncé est produit dans un pipe sans texte décoratif et correspond au schéma/fixture versionné ; si le format n’est pas dans le périmètre, l’exclusion est décidée avant approbation.
- une invocation CI/non interactive et une invocation interactive sont rejouées avec des résultats attendus, sans secret dans les sorties, et le rapport est daté.

Lors de `validate`, l’agent traduit les `AC-CLI-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **La commande marche dans un terminal, mais imprime une bannière dans stdout et casse le JSON en pipeline.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
