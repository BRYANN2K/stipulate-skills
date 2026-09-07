# product-strategy — explorer

Relier problème, public, valeur, alternatives et arbitrages à une décision produit.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Choisir quel problème résoudre pour le premier MVP et définir sa proposition de valeur. Exemple hors périmètre : Renommer une variable privée sans changer le comportement ni une hypothèse produit.

Cette extension aide à décider si un changement mérite d’être poursuivi, pour quel résultat et avec quelles hypothèses de valeur. Elle transforme une demande de solution (« ajouter un tableau de bord ») en problème, résultats attendus, options et décisions traçables. Elle s’active dès `spec-explore` quand le changement engage un produit, un service, un portefeuille de priorités, un modèle de valeur, un périmètre ou une mesure de succès. Elle reste utile pour une évolution d’un produit existant quand la demande semble locale mais peut modifier la promesse, les utilisateurs servis ou les coûts.

Elle ne s’active pas pour une correction purement mécanique déjà spécifiée, une migration technique sans choix de résultat utilisateur, ou un changement documentaire dont le contenu et le public sont déjà établis. Elle ne remplace ni la recherche utilisateur, ni l’architecture, ni la gouvernance budgétaire : elle relie ces éléments à une décision produit. Le guide produit 18F décrit d’ailleurs une pratique locale où découverte, vision, stratégie, feuille de route et livraison sont des activités différentes, ancrées dans les résultats et les preuves ([18F Product Guide](https://guides.18f.org/product/)). Cette référence décrit la pratique de 18F, pas une norme universelle.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher au minimum l’intention initiale, les utilisateurs visés, les problèmes observés, les alternatives déjà utilisées, les contraintes connues et les critères de succès envisagés. Pour un projet en cours, examiner la spec précédente, les critères passés, la roadmap, les décisions abandonnées, les données d’usage, les coûts d’exploitation et les résultats des tests. Le guide 18F recommande de construire une base partagée de l’état actuel et de faire participer une équipe pluridisciplinaire ([Discover the current state](https://guides.18f.org/product/discover/)).

Classer chaque élément avec la taxonomie du cœur : **établi** (source, date, propriétaire et portée sont vérifiables), **inféré** (déduit d’indices mais pas confirmé), **incomplet** (trace existante mais couverture, date ou portée insuffisante), **manquant** (recherche explicitée sans trace pertinente) ou **non applicable** (le risque ou le public n’existe pas pour ce changement). Une affirmation non documentée reste au mieux inférée ; elle ne prouve pas la présence. Ne pas déduire « manquant » d’un dossier vide. Noter les chemins, liens, requêtes ou entretiens qui fondent la conclusion. Pour une évolution, comparer la baseline au comportement réellement livré ; une vision ou une roadmap ancienne ne prouve pas une valeur actuelle.

Un problème de qualité doit rester indépendant d’une solution. 18F conseille de documenter qui est affecté, l’impact et les points douloureux, puis de réviser le problème à mesure que la recherche progresse ([Define the problem](https://guides.18f.org/product/define/problem/)). Le modèle de proposition de valeur de Strategyzer peut structurer les « jobs », pains et gains, mais les auteurs précisent qu’un canvas seul ne constitue pas une stratégie et qu’il doit être ajusté avec des preuves client ([Value Proposition Canvas](https://www.strategyzer.com/library/the-value-proposition-canvas)).

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP suffit avec un problème sourcé, une population, un résultat observable, deux ou trois hypothèses prioritaires, une option retenue et un indicateur de suivi. Approfondir si le changement a plusieurs segments, un coût élevé, une dépendance réglementaire ou technique, une promesse commerciale, ou une forte irréversibilité : comparer plusieurs options, établir une baseline quantitative, faire une expérience de valeur et documenter les décisions de non-investissement. Ne pas fabriquer un business case complet pour une correction locale sans effet sur le résultat.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

La recherche utilisateur fournit les preuves de besoins ; UX et contenu testent les options ; design system et accessibilité peuvent transformer un risque de mise en œuvre en contrainte de stratégie ; storytelling rend la décision compréhensible sans remplacer l’évidence. Éviter le piège de la roadmap comme engagement de livraison : une roadmap doit exprimer des résultats et rester révisable. Un changement de couleur interne, une faute dans une documentation ou un renommage technique sans impact utilisateur ne déclenche pas cette extension. Les sources citées sont des guides situés ; la table, les statuts et l’intégration dans `explore`–`check` sont notre synthèse, pas une prescription de ces organisations.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
