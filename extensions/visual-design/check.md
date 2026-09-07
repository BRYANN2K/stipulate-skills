# visual-design — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- un lecteur identifie le titre, l’action principale et l’état système sur les tailles annoncées ; l’observation est réalisée sur un rendu, pas seulement dans un fichier source.
- texte, contrôles et informations essentielles respectent les seuils de contraste annoncés, avec résultat daté de l’outil ou de la revue manuelle.
- le sens d’un état reste compréhensible sans couleur seule et les états focus, erreur, succès et désactivé sont observables au clavier ou au pointeur selon le contexte.
- la surface reste lisible avec le contenu le plus long et le zoom ou la taille de texte supportés ; les captures multi-contexte sont archivées.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md`; le moteur ne le fait pas automatiquement. Un score ou une maquette non rendue ne valide pas un critère.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Une maquette attractive est livrée, mais les textes réels débordent et un état repose uniquement sur la couleur.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
