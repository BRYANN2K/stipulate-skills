# sre-operations — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Le SLI retenu est calculé sur une source, population et fenêtre définies et correspond à un comportement utilisateur observable.
- Le service atteint la cible SLO sur la fenêtre prévue dans un environnement ou jeu de données identifié ; les périodes exclues sont justifiées.
- Une alerte se déclenche sur une dégradation simulée ou réelle et indique une action de runbook ; les alertes purement décoratives ne passent pas.
- Une panne ou restauration représentative produit un résultat comparé au RTO/RPO ou à la cible retenue.
- Les mesures après livraison ont un propriétaire et une échéance ; leur absence ne peut pas être masquée par la clôture locale de `archive`.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le dashboard existe, mais une panne représentative ne déclenche aucune alerte actionnable.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
