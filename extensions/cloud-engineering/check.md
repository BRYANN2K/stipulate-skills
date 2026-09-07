# cloud-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Le plan d’infrastructure produit les ressources attendues dans un environnement contrôlé et un second passage sans changement inattendu (idempotence ou équivalent).
- Les chemins d’accès non autorisés sont refusés et les identités utilisées par le workload sont limitées aux permissions nécessaires, vérifiées sur la configuration active.
- Une panne représentative ou restauration définie par le contrat est exécutée, avec durée et perte de données comparées au RTO/RPO retenu.
- Les signaux de santé, journaux utiles et seuils d’alerte permettent de détecter le comportement convenu ; un dashboard présent seul n’est pas une preuve.
- La ressource, son propriétaire, son budget et sa procédure de retrait sont identifiables ; un déploiement éventuellement autorisé est distingué de la clôture locale par `archive`.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le plan IaC réussit, mais aucune restauration n’est testée alors que le contrat exige un RTO/RPO.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
