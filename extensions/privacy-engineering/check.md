# privacy-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Le système ne collecte et ne conserve que les champs nécessaires au but déclaré ; un test sur le payload et le stockage confirme l’absence de champs superflus.
- Les réglages initiaux n’exposent pas la donnée au-delà de la finalité et des destinataires prévus ; le scénario « nouveau compte » est vérifié.
- Un utilisateur ou opérateur autorisé peut exercer le comportement prévu (accès, correction ou suppression) et une vérification indépendante confirme l’effet sur les copies concernées.
- Les logs, traces, exports et environnements de test ne contiennent pas de données personnelles non nécessaires ; les exceptions sont justifiées et contrôlées.
- La notice ou documentation de traitement reflète le flux réellement exécuté, avec propriétaire, durée et fournisseur identifiés ; une page présente n’est pas la preuve d’une information exacte.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **La ligne principale est supprimée, mais une copie contenant les données personnelles reste accessible dans les logs.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
