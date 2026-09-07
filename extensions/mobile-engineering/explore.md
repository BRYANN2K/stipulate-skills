# mobile-engineering — explorer

Construire et vérifier une expérience mobile avec son cycle de vie, réseau, permissions et distribution.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter une synchronisation mobile après suspension et retour du réseau. Exemple hors périmètre : Corriger une page web sans comportement mobile natif ni package mobile affecté.

Cette extension transforme un parcours mobile en comportement fiable sur appareil réel : cycle de vie, état restaurable, réseau intermittent, permissions, stockage local, notifications, gestes, accessibilité, sécurité et distribution. Elle s’active dans `spec-explore` dès qu’un changement touche une application iOS ou Android, un composant natif, une app cross-platform, une permission ou une fonctionnalité sensible au cycle de vie. Elle s’active aussi quand une API existante doit fonctionner hors connexion ou dans un écran interrompu.

Elle ne s’active pas pour un service web qui n’est pas empaqueté mobile, ni pour une règle backend sans comportement appareil. Elle ne choisit pas iOS contre Android, un framework ou une stratégie de distribution à la place du projet. Le guide d’architecture Android recommande une séparation claire des responsabilités, des modèles persistants et une source de vérité unique, tout en rappelant qu’un processus peut être tué par les contraintes de ressources ([Guide to app architecture](https://developer.android.com/topic/architecture)). Les recommandations Android de qualité actuelles couvrent notamment l’état après interruption, l’accessibilité, les crash/ANR, la confidentialité, le réseau et les essais sur form factors représentatifs ([Core app quality guidelines](https://developer.android.com/docs/quality-guidelines/core-app-quality)).

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher les plateformes et versions ciblées, les modules d’état, la persistance, les permissions, le backend, les commandes de build/signature, les tests d’appareil et les règles de distribution. Pour un projet en cours, installer la build réelle, interrompre/reprendre le parcours, couper le réseau, refuser une permission, changer la taille/rotation et vérifier le comportement après mise en veille ou terminaison. Classer chaque constat comme **établi** (test, build ou trace reproductible), **inféré** (indice de comportement), **incomplet** (une plateforme ou un cycle manque), **manquant** (recherche effectuée sans trace) ou **non applicable** (capacité absente du produit). Un écran qui fonctionne dans l’émulateur ne prouve pas la restauration après terminaison ; une permission déclarée ne prouve pas le consentement compréhensible.

OWASP MASVS structure les contrôles mobiles autour du stockage, de la cryptographie, de l’authentification, du réseau, de la plateforme, du code, de la résilience et de la confidentialité ([MASVS](https://mas.owasp.org/MASVS/)). Le document précise que ces groupes structurent une vérification et que les profils de test sont ailleurs : ils ne valent pas audit complet par défaut. La page Apple Human Interface Guidelines a été consultée mais son contenu détaillé est livré par JavaScript dans l’environnement de recherche ([Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines?lang=en)) ; cette limite est conservée dans les sources et ne sert pas à inventer une règle Apple.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP couvre une plateforme explicitement ciblée, le parcours nominal, restauration minimale, erreur réseau, permission nécessaire, test UI principal et build installable. Approfondir si l’app traite santé/paiement, données privées, notifications critiques, plusieurs versions ou un mode hors ligne : tester matrice iOS/Android, faible mémoire, réseau interrompu, accessibilité, chiffrement/stockage, migration et déploiement progressif. Ne pas annoncer “compatible mobile” sur la seule base d’un navigateur redimensionné.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`backend-engineering` et `api-integrations` définissent synchronisation, auth et reprise ; `database-engineering` traite le stockage ; `frontend-engineering` peut partager des invariants d’état ; `desktop-engineering` porte l’installation native desktop. Éviter de stocker un token en clair, de demander toutes les permissions au premier lancement, de croire qu’un état mémoire survit au processus, ou de déclarer la compatibilité sur un seul appareil. MASVS est une structure de vérification ; les recommandations Android ne remplacent pas les tests iOS. Une évolution purement serveur sans effet sur le client n’active pas cette extension.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
