# product-strategy — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec relie le changement à un problème formulé sans nommer de solution obligatoire ; un lecteur externe peut identifier public, contexte et exclusion.
- chaque hypothèse critique possède une source, une expérience ou un état explicitement `unverified`, et la preuve est retrouvable au chemin ou à l’URL indiquée ; `unverified` ne permet pas de déclarer le critère passé.
- au moins deux options ou la justification documentée d’une option unique sont comparées selon le même résultat et le même risque.
- après `apply`, une vérification exécute la mesure ou le test annoncé et rapporte une observation datée ; un fichier présent seul ne suffit pas.

Ces identifiants sont ceux de la fiche d’extension. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md` ; le moteur ne le fait pas automatiquement. Un critère `unverified` ne passe pas `check` tant qu’une preuve n’est pas produite ou que le contrat approuvé n’est pas révisé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Une roadmap et une promesse existent, mais aucune observation ne soutient le besoin ni les critères de décision.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
