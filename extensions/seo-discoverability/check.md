# seo-discoverability — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Une URL publique retenue renvoie le contenu attendu sans blocage robots/noindex involontaire ; le test porte sur la réponse réelle.
- Le title, heading principal, texte et liens représentent l’intention déclarée et sont visibles dans le rendu accessible au crawler.
- Le sitemap, s’il est retenu, ne contient que des URLs absolues canoniques pertinentes et respecte les limites ; sa génération est vérifiée.
- Les données structurées correspondent au contenu visible et passent le validateur ou test adapté ; aucune promesse de rich result n’est déduite.
- Une redirection, canonical ou retrait de page conserve le comportement contractuel pour les URLs consommées et est testée sur un échantillon réel.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Les métadonnées existent, mais la page publique reste bloquée par robots ou noindex.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
