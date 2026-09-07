# accessibility — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la tâche critique annoncée est exécutable au clavier avec focus visible, ordre prévisible, activation et retour d’état observables ; un rapport automatisé seul ne suffit pas.
- les informations non textuelles, champs, contrôles, erreurs et changements dynamiques ont une alternative ou un nom accessible vérifié dans l’environnement prévu.
- la matrice relie chaque exigence WCAG ou contractuelle retenue à un état, une méthode de test, une date et un résultat ; une exigence non testée reste non vérifiée.
- les parcours et composants critiques ont été rejoués avec les navigateurs/technologies annoncés, et chaque défaut bloquant a une correction vérifiée ; un défaut accepté par défaut laisse le critère non vérifié jusqu’à une révision du contrat explicitement approuvée.
- si une déclaration ou un audit est dans le périmètre, il indique couverture, limites, problèmes connus, voie de contact et plan de correction avec une version identifiable.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md` ; le moteur ne le fait pas automatiquement. Un critère « non vérifié » ne passe pas `check` tant qu’une preuve n’est pas produite ou que le contrat approuvé n’est pas révisé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le scan automatique passe, mais le focus clavier sort du dialogue et empêche de terminer la tâche.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
