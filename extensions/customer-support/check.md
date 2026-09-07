# customer-support — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Un utilisateur représentatif peut trouver le canal prévu, soumettre une demande et recevoir une réponse correspondant à la version réellement livrée.
- Une demande critique est catégorisée, routée et escaladée vers un propriétaire dans le délai explicitement retenu ; le test observe le ticket, pas seulement la configuration.
- L’article ou message de dépannage résout le scénario nominal et indique clairement quand demander une aide humaine ; un lien existant seul ne prouve pas son utilité.
- Les mesures de première réponse, résolution et satisfaction sont calculées par canal/motif avec une fenêtre connue et examinées avec le volume.
- Une plainte ou demande récurrente produit une action liée (correction, clarification ou décision d’inapplicabilité) et sa fermeture est vérifiée.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **La FAQ décrit le symptôme, mais ses étapes ne permettent ni récupération ni escalade sur le cas reproduit.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
