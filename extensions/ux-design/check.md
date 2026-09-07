# ux-design — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- une étude d’observation avec une personne du segment ciblé exécute le scénario principal et enregistre séparément le contexte, les interventions, le résultat observé (réussite ou échec) et les points de blocage ; cette étude documente le comportement, elle ne transforme pas un échec en réussite.
- lors de la validation d’utilisabilité, une personne du segment ciblé atteint le résultat défini sans intervention du concepteur ; un échec reste échoué ou non vérifié et ne satisfait pas ce critère, même s’il est accompagné d’un contournement documenté.
- le prototype ou produit expose et permet de récupérer les états de chargement, vide, erreur, succès et retour arrière pertinents au scénario.
- les décisions d’interaction sont reliées à des observations ou contraintes, et le contrôle après `apply` rejoue le scénario principal sur les contextes annoncés avec une observation datée et un résultat vérifiable.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md`; le moteur ne le fait pas automatiquement. Un critère sans parcours exécuté reste non vérifié.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le prototype existe et le test a enregistré un abandon ; cela ne satisfait pas le critère de réussite de la tâche.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
