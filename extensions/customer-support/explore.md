# customer-support — explorer

Préparer diagnostic, aide et escalade pour les problèmes réellement rencontrés par les utilisateurs.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Préparer une procédure pour diagnostiquer une synchronisation bloquée et récupérer les données. Exemple hors périmètre : Refactoriser une fonction interne sans incident, aide ou comportement utilisateur affecté.

Cette extension organise l’aide aux utilisateurs et le retour de terrain : canaux, demandes, base de connaissance, délais, résolution, escalade, plaintes, accessibilité du support et boucle d’amélioration. Elle s’active dans `spec-explore` quand le changement modifie une expérience client, un canal d’aide, un centre de support, un processus de plainte, une information de dépannage ou une capacité opérationnelle visible. Elle ne remplace pas UX, SRE, qualité ou juridique ; elle donne la voix du support et les preuves de service réellement perçu.

ISO 10002:2018 donne des lignes directrices pour planifier, concevoir, opérer, maintenir et améliorer un processus de traitement des réclamations ([ISO 10002](https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/07/15/71580.html)). Le Service Manual GOV.UK recommande d’estimer la demande, définir un niveau de service et utiliser les demandes pour améliorer le service ([Set up and manage user support](https://www.gov.uk/service-manual/helping-people-to-use-your-service/set-up-and-manage-user-support)). Zendesk décrit des mesures comme first reply time, résolution et CSAT, à calibrer selon le canal et les attentes ([support metrics](https://support.zendesk.com/hc/en-us/articles/4408832234394-Analyzing-the-metrics-that-matter-to-improve-customer-support)). Ce sont des guides et pratiques ; des SLA, délais réglementaires ou obligations d’accessibilité ne s’appliquent que lorsque le contexte les impose. Cette extension ne garantit pas la conformité ou la satisfaction.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher les publics, canaux, volumes prévus, langues, besoins d’assistance, horaires, niveaux de service, catégories de demandes, base de connaissance, escalades, incidents et propriétaires. Dans un service existant, examiner tickets, temps de première réponse et résolution, motifs récurrents, taux de réouverture, CSAT/commentaires, articles consultés, plaintes, incidents communiqués et changements qui ont créé du volume.

Utiliser les états **établi**, **inféré**, **incomplet**, **manquant** et **non applicable**. Une FAQ publiée ne prouve pas qu’elle résout une demande ; un SLA configuré ne prouve pas qu’il est atteint ; un temps moyen peut masquer les cas longs. Distinguer absence de demandes (pas de trafic ou canal caché) et absence de besoin. Pour un projet neuf, tester avec utilisateurs représentatifs ou demandes simulées ; pour un projet en cours, comparer avant/après et segmenter par canal et motif.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP fournit un canal de contact visible, une classification minimale, une réponse de première ligne, une procédure d’escalade et un article ou message de dépannage pour les cas critiques. Pour un outil interne avec peu d’utilisateurs, une adresse ou file responsable et un runbook testable peuvent suffire. Approfondir selon volume, criticité, publics vulnérables ou engagement : base de connaissance mesurée, multicanal, horaires et staffing, SLA segmentés, analyse de plaintes selon ISO 10002, CSAT par motif, traduction/accessibilité, communication d’incident et boucle avec produit. Les métriques ne doivent pas encourager des réponses rapides mais inexactes.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

UX et accessibilité traitent l’expérience ; quality-engineering vérifie les parcours ; SRE et security traitent incidents et données ; privacy encadre tickets et identifiants ; release informe les changements. Éviter de promettre un délai impossible, de mesurer uniquement la vitesse, de publier des informations confidentielles ou de transformer chaque demande en bug sans triage. Ne pas activer l’extension pour une librairie sans utilisateurs supportés, une note interne non diffusée ou un changement qui ne modifie ni résultat ni canal d’aide ; documenter toutefois l’absence de besoin.

ISO 10002 est un guide de réclamations, GOV.UK une pratique de service public et Zendesk un guide d’outillage ; aucun ne garantit une expérience pour notre contexte. Le processus, les seuils MVP, les états et critères sont notre synthèse d’intégration.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
