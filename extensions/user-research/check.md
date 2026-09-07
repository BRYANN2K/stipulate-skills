# user-research — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- chaque question prioritaire est reliée à une décision et à une méthode ; la trace permet de retrouver la note ou donnée qui a répondu, partiellement répondu ou laissé la question ouverte.
- le rapport indique qui a participé, quels critères d’inclusion et besoins d’accès ont été utilisés, et quelles limites empêchent une généralisation.
- au moins une tâche réaliste est observée sur le prototype ou le produit ; le rapport contient un comportement ou résultat observable, pas seulement une préférence déclarée.
- après partage, la spec, la priorité ou le plan de recherche montre la décision prise et la prochaine question ; la présence d’un rapport sans effet traçable ne suffit pas.
- les données personnelles et enregistrements sont stockés selon le consentement annoncé et la synthèse livrée ne ré-identifie pas un participant.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans le contrat commun ; le moteur ne le fait pas automatiquement. Un résultat `unverified` reste non passé tant qu’il n’existe pas de preuve ou qu’un contrat révisé n’a pas été approuvé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Un guide d’entretien est prêt, mais aucune séance n’a été menée ; la compréhension des utilisateurs reste non vérifiée.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
