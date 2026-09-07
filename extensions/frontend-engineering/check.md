# frontend-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec identifie la surface et décrit les états succès, chargement, vide et erreur ; chacun est déclenchable avec une donnée ou un scénario de test retrouvé.
- l’interaction principale est utilisable au clavier avec focus observable et nom accessible ; une inspection ou un test reproductible est joint. Une absence de preuve reste `unverified`.
- le build et le test de parcours annoncés passent sur la cible définie, ou le critère est révisé puis réapprouvé ; une justification textuelle ne convertit pas un échec en succès.
- pour une surface soumise à un budget de performance, la mesure choisie (par exemple LCP/INP/CLS) est exécutée sur un environnement daté et comparée à la baseline ; si elle n’est pas pertinente, le périmètre est exclu ou le critère est ajusté avant l’approbation.

Lors de `validate`, l’agent traduit les `AC-FE-*` retenus en identifiants `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage. Aucun `tasks.md` n’est requis par l’extension.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le build réussit, mais le navigateur affiche une liste vide car le service dépendant est indisponible.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
