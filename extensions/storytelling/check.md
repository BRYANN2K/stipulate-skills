# storytelling — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- le contrat contient une intention, une audience, une action attendue et une promesse dont chaque élément factuel pointe vers une preuve ou une limite ; une promesse sans preuve reste non vérifiée.
- la hiérarchie distingue message central, messages de soutien, preuve et caveats ; un lecteur du segment ciblé peut reformuler le problème, la valeur et la prochaine action sans aide du rédacteur.
- la landing ou la surface d’entrée et l’onboarding concernés portent une version cohérente de la promesse et permettent de relier cette promesse à une action réelle du produit ; une simple présence de texte ne suffit pas.
- après modification du produit, de la donnée ou du périmètre, le propriétaire réévalue les messages, date la version et retire ou corrige toute affirmation devenue inexacte.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md` ; le moteur ne le fait pas automatiquement. Un critère non prouvé reste non vérifié et ne passe pas `check` tant qu’une preuve n’est pas produite ou que le contrat approuvé n’est pas révisé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **La narration est cohérente entre pages, mais promet une capacité absente du produit livré.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
