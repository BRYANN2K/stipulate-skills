# analytics-experimentation — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec relie hypothèse, population, métrique primaire, baseline et décision attendue ; chaque définition est retrouvable dans les données ou marquée `incomplet` avant approbation.
- l’exposition et l’assignation annoncées sont observées dans un rapport daté, avec garde-fous et règle de pause ; le contrôle SRM prévu est passé ou son écart est diagnostiqué avant toute conclusion d’effet. Un `failed` ou `unverified` ne passe pas par récit.
- l’analyse utilise la méthode et la fenêtre annoncées, compare chaque métrique critique au seuil convenu, décrit incertitude/segments/données manquantes et ne transforme pas un consultation répétée des résultats en cours de test en conclusion implicite.
- une décision post-expérience et une observation après lancement sont conservées ; une approche avant/après est explicitement qualifiée d’observation non causale sauf design complémentaire. Si le test est non applicable, cette exclusion est décidée avant l’approbation du critère.

Lors de `validate`, l’agent traduit les `AC-AN-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Un dashboard affiche une hausse, mais l’assignation est déséquilibrée et la fenêtre d’analyse n’est pas terminée.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
