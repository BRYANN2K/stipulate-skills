# ai-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- la spec identifie tâche, données, configuration, sortie attendue, outils et limites d’autorité ; toute propriété non mesurée reste `incomplet`/`unverified` et ne passe pas.
- un dataset versionné couvre cas nominaux, ambiguïtés et échecs pertinents, avec labels/rubrique, seuils de qualité convenus par classe et rapport daté montrant que chaque seuil est atteint ; la présence d’un dataset ou d’un rapport sans résultat au seuil, un prompt ou une démo seule ne suffit pas.
- chaque appel d’outil valide arguments et autorisation côté application, et un test montre refus, timeout ou résultat invalide sans effet interdit.
- coûts, latence, traces et fallback sont observables dans la configuration cible ; si une mesure est non applicable, l’exclusion est décidée avant approbation du critère.

Lors de `validate`, l’agent traduit les `AC-AI-*` retenus en `AC-n` uniques dans la spec composée ; le moteur n’effectue pas ce remappage.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le dataset existe et l’eval s’exécute, mais le seuil de qualité de la classe critique est manqué.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
