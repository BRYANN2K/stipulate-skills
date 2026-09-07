# build-in-public — vérifier

Les points ci-dessous sont des **candidats**, pas une checklist obligatoire ni des critères déjà approuvés. Pendant explore/validate, l’agent choisit et reformule les candidats utiles en vrais `AC-n` uniques dans `spec.md`. Pendant check, vérifier exclusivement ce contrat ; ne pas ajouter des exigences à la volée.

## Propriétés observables à adapter

- chaque artefact public porte audience, objectif, statut, version ou date, propriétaire, périmètre et limites ; un lien public sans métadonnées ne suffit pas.
- un contrôle de partage vérifie que les secrets, données personnelles, informations confidentielles et détails de sécurité présents sont autorisés, minimisés et traités selon le périmètre, et conserve le résultat avec la version publiée.
- roadmap et prévisions distinguent exploration, design, preview, livré et retiré, et indiquent explicitement qu’une intention ou date indicative n’est pas une garantie lorsqu’elle peut être interprétée comme telle.
- le canal de feedback, le propriétaire du triage et le statut de chaque retour critique sont accessibles ; une demande publique n’est pas considérée comme décision produit sans preuve et décision enregistrées.
- toute modification de produit, de preuve ou de risque déclenche une mise à jour, correction ou retraite datée, avec lien vers l’ancienne version lorsque c’est sûr et pertinent, ou justification de retrait si la confidentialité l’interdit.

Ces identifiants sont locaux à la fiche. Lors de `spec-validate`, l’agent doit les remapper explicitement en `AC-n` uniques dans `spec.md` ; le moteur ne le fait pas automatiquement. Un critère non vérifié ne passe pas `check` tant qu’une preuve n’est pas produite ou que le contrat approuvé n’est pas révisé.

## Réconcilier les preuves

Pour chaque `AC-n`, comparer observation et résultat attendu, avec commande ou protocole, environnement/version, données couvertes et limites. Un fichier présent, un test simplement écrit ou un outil qui se termine n’est pas une preuve suffisante du comportement. Distinguer tests simulés, observations réelles et objectifs nécessitant une période d’exploitation.

Contre-exemple à signaler : **Le brouillon est relu, mais contient un secret ou présente un prototype comme disponible ; il ne peut pas être déclaré prêt.** Relier cet écart au critère applicable ; corriger ou déclarer `failed` / `unverified`. Une observation d’échec peut être utile sans satisfaire un critère de réussite. Ne pas changer les critères ou seuils pour les faire passer ; tout changement de contrat exige révision et nouvel accord.

Le cœur exige un rapport avec l’empreinte courante du sujet et chaque identifiant exact. Le moteur vérifie la structure, les statuts et les empreintes ; il ne certifie pas la vérité des observations ni la pertinence du métier. Lire les [cas d’évaluation](evaluation.json) pour exercer le jugement de sélection/reprise sans les présenter comme des tests métier réellement exécutés.
