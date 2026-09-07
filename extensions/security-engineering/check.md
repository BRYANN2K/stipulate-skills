# security-engineering — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- Une requête sans authentification ou autorisation appropriée échoue avec le code et le comportement attendus, vérifiés sur l’interface réellement exposée.
- Une entrée malformée ou hostile ne produit ni exécution indue, ni fuite de données dans la réponse ou les journaux ; le test négatif est rejouable.
- Les secrets ne sont pas présents dans le diff, les artefacts ni les logs de vérification ; la source de secret et la procédure de rotation sont identifiées.
- Les dépendances et images concernées sont identifiées à une version/digest ; les vulnérabilités bloquantes sont corrigées avant le passage, ou le contrat est explicitement révisé et réapprouvé avec un risque résiduel et un suivi daté.
- Un artefact livrable peut être relié au commit et aux contrôles exécutés ; la vérification porte sur l’artefact réellement testé, et un résultat échoué ou non vérifié reste bloquant jusqu’à correction ou révision explicite et réapprobation.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le chemin autorisé passe, mais un autre utilisateur peut accéder à la même ressource en changeant son identifiant.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
