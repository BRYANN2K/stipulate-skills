# devops-delivery — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Le build de l’artefact testé est reproductible ou ses différences sont expliquées ; commit, dépendances et digest sont enregistrés.
- Un contrôle requis échoue réellement lorsque l’entrée est invalide ; le workflow ne publie ni ne promeut l’artefact après cet échec.
- Les permissions et secrets de la pipeline sont minimaux et testés sur la configuration active ; aucun secret n’apparaît dans les logs.
- La provenance identifie au moins l’entrée, le builder, la procédure et la sortie lorsque ce niveau est retenu ; un niveau SLSA déclaré est vérifié selon sa version.
- Les cinq mesures DORA retenues — change lead time, deployment frequency, failed deployment recovery time, change fail rate et deployment rework rate — utilisent des définitions et fenêtres documentées, ou sont déclarées non applicables avec justification ; elles ne sont pas présentées comme une note universelle.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le pipeline est vert, mais reconstruit un artefact différent au moment de la promotion.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
