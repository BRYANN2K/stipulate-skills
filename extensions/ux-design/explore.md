# ux-design — explorer

Concevoir parcours, interactions, états et récupération pour une tâche utilisateur.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter un parcours d’annulation avec confirmation, état en cours et récupération d’erreur. Exemple hors périmètre : Migrer une ressource cloud sans changer aucune interaction ou tâche utilisateur.

Cette extension conçoit et vérifie l’expérience nécessaire pour qu’une personne atteigne son objectif dans le contexte réel du service. Elle couvre parcours, interactions, états, erreurs, navigation, contenu dans le flux et prototypes ; elle inclut l’interface mais ne se réduit pas à son apparence. Elle s’active dès `spec-explore` lorsqu’un changement modifie une tâche, un parcours, une interaction, une décision utilisateur, un canal ou une prise en charge des erreurs. Elle peut intervenir très tôt : le Design Council décrit le Double Diamond comme un cadre itératif où recherche, définition, développement et livraison se chevauchent et où les tests peuvent revenir à une étape antérieure ([Framework for Innovation](https://www.designcouncil.org.uk/resources/framework-for-innovation/)).

Elle ne remplace pas user-research, qui organise les questions et les participants, visual-design, qui règle la forme graphique, content-design, qui travaille le langage, ou accessibility, qui apporte les exigences et tests inclusifs. Elle ne s’active pas pour une modification strictement serveur sans effet sur la tâche ou le comportement observable. Un changement de service cloud seul ne déclenche pas UX/design. La séquence ci-dessous évite d’imposer un design system complet ou une chaîne linéaire : on peut esquisser, rechercher et prototyper en parallèle selon le risque.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher parcours actuels et alternatifs, objectifs, points de sortie, canaux hors écran, règles métier visibles, composants existants, prototypes, tickets d’utilisabilité et contraintes de technologie. Pour un projet en cours, comparer la version réellement utilisée au prototype et à la spec, inspecter analytics et erreurs, vérifier les états de chargement, vide, succès, échec et reprise, puis regarder les retours de recherche récents.

Classer chaque élément en **établi** (comportement et source vérifiables), **inféré** (hypothèse issue d’un indice), **incomplet** (flux ou état partiellement décrit), **manquant** (recherche explicitée sans preuve exploitable) ou **non applicable**. Une capture d’écran seule établit une apparence, pas un parcours utilisable. Pour un produit neuf, l’absence de flux peut être normale et doit être marquée « manquant » après recherche, pas traitée comme permission de concevoir au hasard. Pour un produit existant, une ancienne maquette ne prouve pas le comportement actuel.

Le Service Manual GOV.UK demande de prototyper avant de s’engager dans le code et d’utiliser le niveau de fidélité adapté à la question ([Making prototypes](https://www.gov.uk/service-manual/design/making-prototypes)). En alpha, il recommande de concentrer le prototype sur les hypothèses les plus risquées, de ne pas produire un service public et d’accepter de jeter le code d’essai ([How the alpha phase works](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works)). Ce sont des prescriptions situées ; l’intégration ci-dessous les traduit en preuves proportionnées.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend un scénario principal, un flux de départ à résultat, les états erreur/attente/succès, un prototype basse ou moyenne fidélité et une vérification avec quelques utilisateurs représentatifs. Approfondir lorsque le changement touche plusieurs canaux, permissions, paiements, données sensibles, navigation complexe, usage mobile, forte fréquence ou coût de reprise élevé : prototype réaliste, parcours secondaires, responsive, micro-interactions, tests avec technologies d’assistance et critères de performance peuvent être nécessaires. Ne pas créer un kit de wireframes exhaustif pour un endpoint sans interface.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

User-research fournit participants et questions ; product-strategy fournit résultat et priorité ; visual-design et design-system fournissent langage visuel et réutilisation ; content-design écrit les libellés et erreurs ; accessibility vérifie clavier, zoom, AT et inclusion ; build-in-public ne s’active que si une communication publique a été décidée. Pièges : dessiner une solution avant de comprendre le parcours, tester seulement le happy path, traiter une maquette comme preuve de faisabilité, ou imposer une bibliothèque de composants à une page isolée. Ne pas déclencher pour un changement purement interne et observable seulement par un test API. Le cadre Design Council et les guides GOV.UK sont des références de pratiques, pas une obligation de reproduire leurs phases ou outils.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
