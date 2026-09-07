# release-management — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Le numéro choisi correspond à l’évolution vérifiée de l’API publique et la justification est lisible par un consommateur.
- Les notes décrivent les changements ajoutés, modifiés, supprimés, corrigés ou de sécurité et indiquent la migration lorsque nécessaire.
- L’artefact téléchargé ou testé est identique au digest attendu et relié au commit/build ; une simple présence dans une release ne suffit pas.
- Une vérification d’immuabilité ou de signature réussit pour le canal retenu, ou l’absence est déclarée comme risque et empêche toute revendication supérieure.
- Une rupture est refusée par le test de compatibilité ou accompagnée d’une version/migration explicitement révisée et réapprouvée.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **L’archive est créée, mais l’artefact ne s’installe pas sur une plateforme annoncée comme supportée.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
