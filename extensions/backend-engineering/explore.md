# backend-engineering — explorer

Garantir un comportement serveur cohérent en succès, erreur, concurrence et récupération.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter un worker qui applique une règle métier sans double effet après retry. Exemple hors périmètre : Changer uniquement la typographie d’un écran sans effet de service.

Cette extension transforme un besoin de service en comportement serveur exploitable : contrats, validation, autorisation, états d’erreur, persistance, concurrence, observabilité, déploiement et récupération. Elle s’active dans `spec-explore` dès qu’un changement modifie une API, un worker, une tâche asynchrone, une règle métier côté serveur, une file, une base de données ou le comportement d’un service en production. Elle peut s’activer pour une petite modification si celle-ci touche une frontière de sécurité, une transaction ou un objectif de disponibilité.

Elle ne s’active pas pour un changement uniquement visuel ou documentaire sans effet de service. Elle ne remplace pas l’extension `database-engineering`, `api-integrations` ou l’exploitation : elle rend explicites leurs contrats communs et le chemin exécutable. Le Twelve-Factor App décrit une méthode pour des services SaaS portables : configuration séparée, services support traités comme ressources, processus sans état, disposabilité et logs comme flux ([The Twelve-Factor App](https://www.12factor.net/)). OWASP ASVS fournit une base de vérification des contrôles techniques et des exigences de développement sécurisé ([OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)). Ces références orientent l’enquête ; elles ne signifient pas qu’un projet doit appliquer chaque facteur ou chaque exigence à chaque changement.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher le point d’entrée du service, les contrats entrants/sortants, le stockage, les migrations, les dépendances externes, la gestion des secrets, les logs/métriques/traces et la procédure de déploiement. Pour un projet en cours, lire la spec approuvée et les critères passés, suivre une requête de bout en bout, inspecter les timeouts/retries, rejouer les migrations dans un environnement sûr et vérifier les alertes réellement disponibles. Classer chaque constat comme **établi** (code, test, métrique ou commande qui le prouve), **inféré** (indice), **incomplet** (couverture partielle), **manquant** (recherche explicitée sans artefact) ou **non applicable** (service, risque ou état absent du changement). Un log présent ne prouve pas sa corrélation avec une requête ; un endpoint qui répond ne prouve ni l’idempotence ni la récupération.

OpenTelemetry présente l’observabilité comme un cadre neutre vis-à-vis des fournisseurs pour traces, métriques et logs, avec un Collector et des spécifications ([OpenTelemetry documentation](https://opentelemetry.io/docs/)). Google SRE recommande de choisir peu d’indicateurs centrés sur l’utilisateur, par exemple latence, erreurs, débit, disponibilité et justesse, et de distinguer SLI, SLO et SLA ([Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)). Dans notre contrat, une instrumentation absente devient `manquant` ou `incomplet`, pas une réussite présumée.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP couvre le chemin nominal, validation et autorisation, une erreur représentative, un test d’intégration, la migration si elle existe, les logs corrélables et une procédure de retour. Approfondir si le service traite des données sensibles, de l’argent ou des tâches longues, s’il a plusieurs consommateurs, une forte charge, une promesse de disponibilité ou une migration irréversible : vérifier menaces ASVS pertinentes, budget de latence/erreur, saturation, reprise après panne, compatibilité de versions et traces distribuées. Les facteurs Twelve-Factor sont une grille de questions ; ils ne justifient pas à eux seuls une réécriture.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`api-integrations` formalise les contrats HTTP et les retries ; `database-engineering` traite isolation, plans et migrations ; `data-engineering` couvre pipelines et qualité ; `frontend-engineering` vérifie les états visibles. Éviter de confondre disponibilité d’un processus et réussite utilisateur, de masquer un timeout par des retries non bornés, de mettre des secrets dans la configuration versionnée ou d’ajouter une alerte sans action associée. Un renommage interne sans changement de chemin d’exécution ne déclenche pas l’extension. ASVS et OpenTelemetry sont des cadres de référence ; les critères de cette fiche sont la traduction locale et doivent rester vérifiables.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
