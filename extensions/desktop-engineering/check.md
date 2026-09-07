# desktop-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec liste les plateformes, fenêtres/webviews, permissions et canaux IPC concernés ; toute capacité non prouvée est `incomplet` ou exclue avant approbation.
- un parcours installé vérifie lancement, action native, refus de permission et fermeture/reprise ; `unverified` ou `failed` ne passe pas par une justification.
- les webviews et opérations natives appliquent le moindre privilège prévu, et l’audit de configuration ou test IPC donne une observation datée.
- l’artefact packagé testé est identifié par version/hash et la procédure de support, retrait de capability ou rollback est retrouvable.

Lors de `validate`, l’agent traduit les `AC-DESK-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le binaire compile, mais le parcours réel échoue encore et laisse un brouillon non récupérable.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
