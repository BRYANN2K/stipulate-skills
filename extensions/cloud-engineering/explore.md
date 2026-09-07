# cloud-engineering — explorer

Concevoir des ressources cloud reproductibles avec leurs accès, récupération, santé et coût.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Migrer un service managé et définir sa restauration, ses accès et son budget. Exemple hors périmètre : Modifier une application locale sans service cloud ni topologie affectés.

Cette extension examine les choix propres à une plateforme cloud ou cloud native : architecture de déploiement, comptes et régions, réseau, identité, stockage, résilience, récupération, performance, coût, durabilité et opérations. Elle s’active dans `spec-explore` lorsqu’un changement crée ou modifie une ressource cloud, une infrastructure as code, un service managé, une image/plateforme d’exécution, une topologie ou une contrainte de disponibilité. Un changement cloud-only ne déclenche pas UX/design par défaut ; cette extension ne conçoit pas l’interface ni les parcours utilisateurs.

Les cadres AWS ([Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/definitions.html)), Azure ([Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)) et Google Cloud ([Well-Architected Framework](https://docs.cloud.google.com/architecture/framework?authuser=0&hl=en)) proposent des piliers et des questions d’évaluation propres à leurs contextes. La définition CNCF décrit le cloud native comme des pratiques programmables et répétables, sécurisées, résilientes, gérables, durables et observables ([CNCF Cloud Native Definition](https://github.com/cncf/toc/blob/main/DEFINITION.md)). Ces cadres sont des recommandations ; ils ne rendent pas une architecture conforme ni portable entre fournisseurs.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher fournisseur, organisation de comptes/projets, régions et zones, architecture réseau, IAM, secrets, services managés, IaC, stratégie de données, sauvegardes, RTO/RPO, quotas, budget et observabilité. Dans un projet en cours, rechercher les modules IaC et états, inventaire des ressources, dérive de configuration, diagrammes réels, règles de coûts, incidents, tests de récupération, métriques, limites de fournisseur et dépendances externes.

Classer chaque preuve avec la taxonomie du cœur : **établi** (état réel et version observés), **inféré** (indice sans observation directe), **incomplet** (couverture ou environnement partiel), **manquant** (recherche sans preuve) ou **non applicable** (dimension hors risque retenu, avec justification). Une stack déployée n’est pas une preuve de résilience ; un fichier Terraform ne prouve ni son application ni l’absence de dérive.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend un diagramme à jour, un propriétaire, une configuration reproductible, des accès minimaux, une sauvegarde ou stratégie de récupération proportionnée, un signal de santé et une estimation de coût. Pour un prototype éphémère, une seule région et une reprise manuelle peuvent être acceptables si elles sont explicites. Approfondir lorsque criticité, volume, données, multi-région, dépendance fournisseur ou exigences d’exploitation l’imposent : revue de piliers, tests de panne, réplication, quotas automatisés, chiffrement et clés, policy as code, optimisation continue et plan de sortie fournisseur. Aucun cadre fournisseur ne justifie automatiquement toutes les bonnes pratiques.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Security-engineering couvre menaces et secrets, privacy-engineering la localisation et les données personnelles, SRE les SLO et incidents, devops-delivery la livraison, release-management les artefacts, et quality-engineering les tests. Éviter de confondre « cloud native » avec microservices obligatoires, disponibilité fournisseur avec disponibilité du service, ou IaC avec absence de dérive. Ne pas copier des identifiants de production dans les exemples. Ne pas activer cette extension pour une pure documentation sans changement d’architecture, ni pour une application locale qui n’utilise aucun service cloud ; consigner cependant les dépendances inapplicables.

Les cadres cités sont parfois centrés sur un fournisseur et évolutifs. Le processus, le choix du niveau MVP et les critères sont notre synthèse d’intégration ; ils ne constituent pas une certification Well-Architected ni un engagement de disponibilité.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
