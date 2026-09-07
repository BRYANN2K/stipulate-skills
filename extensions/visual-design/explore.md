# visual-design — explorer

Définir hiérarchie, lisibilité, couleurs, typographie, espaces et états visuels adaptés.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Corriger une hiérarchie illisible et les états visuels d’un tableau sur petit écran. Exemple hors périmètre : Changer un worker serveur sans surface visuelle affectée.

Cette extension rend une expérience lisible, hiérarchisée et cohérente par la typographie, la couleur, l’espace, la grille, les images, les icônes et les états visuels. Elle répond à une question de communication visuelle : que doit voir, distinguer ou comprendre une personne dans ce contexte ? Elle s’active dès `spec-explore` lorsqu’un changement modifie la hiérarchie, la lisibilité, le contraste, la densité, le responsive, l’identité ou les états de l’interface.

Elle ne remplace pas UX design, qui définit le parcours et les interactions, content design, qui définit le langage, design-system, qui gouverne les primitives et composants réutilisables, ou accessibility, qui vérifie la perception et l’opérabilité. Elle ne déclenche pas la création d’une identité complète pour une correction locale ni un changement serveur sans surface visuelle. Une page isolée peut utiliser quelques décisions visuelles documentées sans exiger un design system complet.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, rechercher plateforme, thèmes clair/sombre, système de police, palette, grille, images, icônes, états de focus/erreur/succès, contraintes de marque et environnements de rendu. Pour un projet en cours, capturer les écrans réellement livrés sur les tailles et densités supportées, inspecter les tokens ou variables utilisés, relever les incohérences et vérifier les incidents de contraste ou de lisibilité.

Classer chaque artefact en **établi** (valeur, usage et contexte vérifiables), **inféré** (convention supposée par répétition), **incomplet** (règle ou état partiellement couvert), **manquant** (recherche explicite sans règle ou preuve) ou **non applicable**. Une couleur récurrente ne prouve pas son sens : GOV.UK demande d’attribuer les couleurs fonctionnelles selon leur contexte et de vérifier le contraste WCAG 2.2 AA ([Colour](https://design-system.service.gov.uk/styles/colour/)). Une capture sur un écran ne prouve ni le mode sombre, ni le zoom, ni le responsive.

Les recommandations sont contextuelles. Apple demande de tester la lisibilité à différentes tailles et de ne pas dépendre uniquement de la couleur pour communiquer ([Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color)). GOV.UK utilise une échelle typographique testée et un layout small-first ([Type scale](https://design-system.service.gov.uk/styles/type-scale), [Layout](https://design-system.service.gov.uk/styles/layout)). Ce sont des systèmes différents ; l’extension reprend les principes vérifiables, pas leurs valeurs sans décision de plateforme.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend une hiérarchie, une paire typographique ou échelle existante, une palette sémantique minimale, un layout responsive, des états principaux et une vérification de contraste/zoom sur la surface touchée. Approfondir si plusieurs surfaces ou équipes partagent les règles, si l’identité est stratégique, si le contenu est dense ou internationalisé, si les thèmes changent ou si une régression coûte cher : tokens sémantiques, documentation de composants, tests visuels automatisés, assets multi-résolution et gouvernance deviennent pertinents. Ne pas fabriquer des tokens pour une valeur unique sans répétition attendue.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

UX fixe le parcours et les états ; content-design teste la longueur et le sens des mots ; accessibility fournit WCAG, clavier et AT ; design-system décide quand une règle devient réutilisable ; storytelling peut hiérarchiser une présentation. Pièges : choisir une palette avant le sens, réutiliser une couleur sémantique hors contexte, tester uniquement sur écran large, dépendre d’un état visuel invisible ou surinvestir la marque au détriment de la tâche. Ne pas déclencher pour une valeur de log ou un endpoint sans rendu utilisateur. Les guidelines Apple et GOV.UK restent propres à leurs plateformes ; les règles d’activation et la table sont notre intégration.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
