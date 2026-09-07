# backend-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- un scénario de bout en bout montre entrée, validation, autorisation, dépendances et sortie ; les états d’erreur et la donnée sensible sont explicités.
- les tests annoncés vérifient le succès et au moins une défaillance pertinente (doublon, timeout, droit ou concurrence selon le risque) ; une justification ne fait pas passer un test `failed` ou `unverified`.
- si la corrélation dans les signaux est exigée par le contrat, une requête ou tâche peut être retrouvée de bout en bout ; une instrumentation manquante ne passe pas le critère et doit être corrigée ou faire l’objet d’une révision/réapprobation du contrat avant `check`. La présence d’un log isolé ne suffit pas.
- la migration et le déploiement sont rejoués dans l’environnement défini avec une procédure de rollback ou une décision d’irréversibilité approuvée ; l’observation est datée.

Lors de `validate`, l’agent traduit les `AC-BE-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage. Aucun fichier `tasks.md` n’est obligatoire.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le chemin nominal réussit, mais un retry crédite deux fois le même compte dans la fixture.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
