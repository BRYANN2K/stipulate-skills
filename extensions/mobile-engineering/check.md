# mobile-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec nomme plateformes, versions et appareils de preuve, et un parcours reprend après l’interruption prévue avec la donnée attendue.
- succès, chargement, erreur réseau et permission refusée sont déclenchés dans la build cible ; une absence de test reste `unverified` et ne passe pas par justification.
- les contrôles de stockage, réseau, authentification et confidentialité pertinents sont associés à une vérification ou exclus avant approbation ; MASVS n’est pas cité comme preuve sans test.
- la build et les tests annoncés produisent un rapport daté sur les plateformes retenues, avec crash/ANR et procédure de retrait observables.

Lors de `validate`, l’agent traduit les `AC-MOB-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le simulateur affiche l’écran, mais le retour après suspension perd une opération en cours.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
