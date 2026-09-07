# api-integrations — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- chaque opération consommée ou exposée possède méthode, chemin, schéma, statuts, version et propriétaire retrouvables ; tout champ inféré ou non confirmé est marqué `incomplet` ou `unverified` et ne passe pas le critère tant que le contrat n’est pas corrigé ou révisé/réapprouvé.
- un scénario de renouvellement/expiration d’autorisation et un scénario d’erreur sont exécutés sans exposer le secret ; une affirmation documentaire seule ne passe pas le critère.
- les appels récupérables et non récupérables ont une politique de timeout/retry ; une mutation rejouée produit au plus l’effet prévu. Si l’idempotence est non applicable, cette exclusion est décidée dans le périmètre et le contrat avant l’approbation du critère, avec sa raison et une vérification adaptée.
- le test de contrat ou de compatibilité annoncé est exécuté sur la version cible, et le rapport date les réponses, limites et écarts ; `failed` ou `unverified` impose correction ou révision/réapprobation.

Lors de `validate`, l’agent traduit les `AC-API-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage. L’extension ne rend pas `tasks.md` obligatoire.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le mock réussit, mais aucun test ne vérifie qu’un webhook répété ne duplique pas l’effet.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
