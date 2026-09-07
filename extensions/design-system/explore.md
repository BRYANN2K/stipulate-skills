# design-system — explorer

Faire évoluer des primitives et composants partagés avec leurs usages, contrats et migrations.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Unifier un composant de formulaire réutilisé dans plusieurs parcours en préservant ses consommateurs. Exemple hors périmètre : Réaliser une esquisse ponctuelle sans besoin démontré de réutilisation.

Cette extension décide quand une règle visuelle ou interactionnelle doit devenir réutilisable, gouvernée et testable entre plusieurs surfaces. Elle couvre inventaire, tokens, composants, patterns, documentation, versioning, contribution et stratégie d’extension. Elle s’active dès `spec-explore` lorsqu’un changement réutilise ou modifie une bibliothèque existante, crée une primitive destinée à plusieurs équipes, ou révèle une divergence qui risque de multiplier la dette.

Elle ne s’active pas automatiquement pour une page isolée, une maquette exploratoire jetable ou une préférence de marque sans besoin de réutilisation. Elle ne remplace pas UX, visual-design, content-design ou accessibility : un composant n’est utile que s’il résout un besoin, reste compréhensible et passe les vérifications de ces métiers. Le GOV.UK Design System exige qu’une proposition soit utile et unique, puis que l’implémentation soit utilisable, cohérente et versatile ([Contribution criteria](https://design-system.service.gov.uk/community/contribution-criteria/)). Ce sont les critères de ce système, à adapter explicitement au contexte du projet.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher design systems installés, tokens, composants, patterns, conventions de nommage, versions de runtime, preuves de recherche, couverture accessibilité, licences et propriétaire. Pour un projet en cours, inventorier les usages réels, forks, overrides, composants dupliqués, divergences de code/design, incidents et coûts de mise à jour. Le guide GOV.UK recommande de commencer par ce qui existe et de chercher les exemples avant de proposer une nouvelle contribution ([Develop a component or pattern](https://design-system.service.gov.uk/community/develop-a-component-or-pattern/)).

Classer chaque règle en **établi** (composant/version/usage et propriétaire vérifiables), **inféré** (convention répétée sans gouvernance explicite), **incomplet** (design, code, contenu ou tests manquants), **manquant** (recherche explicitée sans artefact) ou **non applicable**. Une classe CSS ou un composant présent n’est pas forcément supporté ; une discussion ouverte n’est pas une preuve qu’elle a été testée. Le projet neuf peut commencer par réutiliser un système tiers ; le projet en cours doit calculer le coût de changement et la trajectoire de version avant de forker.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP d’une extension de système est un inventaire, une décision de réutiliser ou non, un composant/pattern local documenté et des tests sur la surface touchée. Ne pas créer une gouvernance ou un catalogue complet pour un usage unique. Approfondir si le composant est partagé, sensible, très fréquent, versionné par plusieurs équipes ou coûteux à corriger : tokens sémantiques, documentation design/code/content, tests automatisés et manuels, compatibilité, processus de contribution, changelog et dépréciation deviennent nécessaires. USWDS décrit les tokens comme un vocabulaire discret qui réduit les choix arbitraires et améliore la communication design–développement ([Design tokens](https://designsystem.digital.gov/design-tokens/)).

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

UX et visual-design apportent les besoins et formes ; accessibility impose les tests ; content-design vérifie les mots et exemples ; user-research établit l’utilité ; build-in-public peut documenter une contribution seulement si la publication est décidée. Pièges : cataloguer sans utilisateurs, confondre cohérence et uniformité, forker sans plan de mise à jour, remplacer un composant pour une préférence locale ou publier une ressource communautaire comme officielle. Ne pas déclencher cette extension pour une seule page sans réutilisation prévue, même si elle utilise plusieurs styles. Les critères GOV.UK et USWDS décrivent leurs propres systèmes ; notre activation, nos statuts et la table sont une synthèse de contrat.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
