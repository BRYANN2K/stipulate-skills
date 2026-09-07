# sre-operations — explorer

Relier fiabilité perçue, indicateurs, objectifs, alertes et réponse aux dégradations.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Définir et tester une alerte actionnable pour un service dont le taux d’erreur augmente. Exemple hors périmètre : Modifier un document sans service, signal ou procédure opérationnelle affectés.

Cette extension relie un changement au comportement réel d’un service exploité : objectifs de niveau de service, mesure, alertes, capacité, incidents, astreinte, récupération et réduction du travail répétitif. Elle s’active dans `spec-explore` lorsqu’un changement affecte disponibilité, latence, débit, durabilité, dépendances, observabilité, capacité, procédure d’incident ou engagement opérationnel. Elle ne transforme pas toute modification en projet SRE : les tests locaux du cœur et une note de maintenance peuvent suffire pour un changement sans impact sur un service opéré.

Le livre SRE de Google distingue SLI (mesure), SLO (cible) et SLA (accord avec conséquences) et recommande de partir de ce qui compte pour les utilisateurs ([Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)). Il présente les usages du monitoring et des signaux d’alerte ([Monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/)). Une politique Google d’error budget illustre un choix d’organisation : geler les changements après dépassement du budget, avec exceptions ([Error budget policy](https://sre.google/workbook/error-budget-policy/)). Ces pratiques ne sont pas des obligations universelles et leur politique de gel n’est pas une fonction native du cœur v1.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, rechercher utilisateurs et parcours critiques, SLI candidats, SLO internes, dépendances, instrumentation, dashboards, alertes actionnables, runbook, capacité, sauvegardes, restauration et responsabilités d’incident. Dans un service existant, examiner historique de disponibilité/latence, erreurs, saturation, incidents et postmortems, alertes bruyantes, astreinte, toil, changements récents, tests de panne et procédures de récupération.

Utiliser les états **établi**, **inféré**, **incomplet**, **manquant** et **non applicable**. Un dashboard ne prouve pas qu’un SLI mesure l’expérience utilisateur ; un SLO déclaré ne prouve pas la qualité de sa fenêtre ou de son calcul ; une alerte ne vaut que si quelqu’un peut agir. Une absence de SLA commercial n’empêche pas un SLO utile, et la présence d’un SLA n’est pas une preuve d’atteinte.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP consiste à choisir un ou deux parcours critiques, une mesure compréhensible, une cible réaliste, un signal d’alerte et une action documentée. Pour un outil interne non critique, une vérification de disponibilité et un runbook court peuvent suffire. Approfondir selon criticité et fréquence : SLO par classe d’utilisateur, budget d’erreur, alertes multi-signaux, capacité et autoscaling, tests de panne, restauration, postmortems, réduction automatisée du toil et exercices d’astreinte. Les seuils et fenêtres doivent être décidés avec les propriétaires du service, pas copiés d’un exemple Google.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Cloud-engineering fournit architecture, capacité et récupération ; devops-delivery et release-management relient changements et artefacts ; quality-engineering teste les comportements ; security et privacy traitent leurs risques ; customer-support remonte l’impact utilisateur. Éviter le 100 % de disponibilité comme objectif implicite, le paging sur chaque métrique, les moyennes qui masquent la queue de latence et les SLO sans conséquence opérationnelle. Ne pas geler automatiquement les releases ni déplacer HEAD : ces adaptations appartiennent à une politique et à un changement du cœur séparés. Ne pas activer l’extension pour un script offline sans service ni utilisateur dépendant.

Les pages Google SRE documentent une pratique d’équipe et des exemples, non un standard contraignant. Le processus, les seuils MVP et les critères ci-dessus sont notre synthèse d’intégration.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
