# content-design — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- pour chaque étape de la tâche ciblée, le contenu indique l’action, l’objet, les conditions et la prochaine étape ; une personne du segment peut reformuler le message sans aide du rédacteur.
- labels, titres, instructions et erreurs utilisent le vocabulaire établi et correspondent exactement aux contrôles et états rendus ; une simple présence dans un fichier source ne valide pas ce critère.
- au moins une observation ou un test de compréhension couvre le contenu critique, y compris un état d’erreur ou de récupération, et la personne atteint le niveau de reformulation ou d’action défini ; une étude peut enregistrer une incompréhension, mais elle ne fait pas passer ce critère tant qu’elle n’est pas résolue ou que le contrat n’est pas révisé et réapprouvé.
- chaque contenu livré possède une source de vérité, un propriétaire, une version et un déclencheur de révision ; les duplications ou liens périmés identifiés ont une décision documentée.
- les exigences de langue, accessibilité et traduction dans le périmètre sont vérifiées dans la surface et le contexte annoncés, avec les limites restantes explicites.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md` ; le moteur ne le fait pas automatiquement. Un critère non vérifié ne passe pas `check` tant qu’une preuve n’est pas produite ou que le contrat approuvé n’est pas révisé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le texte respecte le guide de style, mais le lecteur ne comprend toujours pas comment corriger son erreur.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
