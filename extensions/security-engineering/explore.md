# security-engineering — explorer

Réduire les risques d’abus sur les actifs et frontières de confiance touchés par le changement.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter un accès à des données privées avec une nouvelle frontière d’autorisation. Exemple hors périmètre : Modifier un espace typographique sans actif, droit ou flux de confiance affecté.

Cette extension identifie les menaces et exigences de sécurité d’un changement, puis relie les contrôles à des preuves vérifiables. Elle couvre le modèle de menace, les frontières de confiance, l’identité et les autorisations, les secrets, les dépendances, la surface réseau, la journalisation utile, la gestion des vulnérabilités et l’intégrité de la chaîne de livraison. Elle s’active dans `spec-explore` dès qu’un changement introduit ou modifie une entrée non fiable, une identité, une permission, un secret, une donnée sensible, une dépendance, un service exposé ou un mécanisme de livraison. Une retouche locale sans effet sur ces surfaces peut être explicitement non activée.

Le NIST SSDF 1.1 propose des pratiques de développement sécurisé intégrables à tout SDLC ([NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)). Le NIST CSF 2.0 fournit une taxonomie de résultats et précise qu’il ne prescrit pas comment les atteindre ([NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20)). Pour une application web, OWASP ASVS 5.0 fournit des exigences de conception, développement et vérification ([OWASP ASVS](https://github.com/OWASP/ASVS)). Ce sont des références et cadres ; une obligation de sécurité supplémentaire vient seulement du contexte contractuel, réglementaire, sectoriel ou du risque accepté. Cette extension ne promet aucune conformité juridique, certification ou absence de vulnérabilité.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher les acteurs et actifs, flux de données, frontières de confiance, exigences d’authentification et d’autorisation, choix cryptographiques, dépendances, exposition réseau, stratégie de secrets, journalisation et réponse aux incidents. Dans un projet en cours, examiner threat model, contrôles IAM, scans SAST/SCA/DAST, SBOM, avis de dépendances, règles de branches, rapports de pentest, politique de divulgation, configurations de déploiement et incidents connus.

Qualifier les résultats par la taxonomie du cœur : **établi** (preuve observée et reliée à la version), **inféré** (indice plausible sans vérification directe), **incomplet** (preuve partielle), **manquant** (aucune preuve après recherche définie) ou **non applicable** (surface hors périmètre, avec justification). Un rapport de scanner présent mais non exécuté sur le commit courant n’est pas une preuve actuelle ; un score OpenSSF Scorecard est un signal à analyser, pas un certificat de sécurité. Signaler séparément les limites d’accès aux systèmes, aux journaux ou aux secrets.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP couvre les frontières de confiance, les entrées et autorisations critiques, la protection des secrets, les dépendances directes et quelques tests négatifs reproductibles. Un scan ciblé peut être suffisant pour un petit changement, à condition de vérifier son périmètre et son résultat. Approfondir lorsque le risque, l’exposition ou la criticité l’exige : threat modeling plus fin, ASVS versionné, SAST/SCA/DAST, SBOM et provenance, durcissement du pipeline, tests de fuzzing, revue indépendante, exercices de réponse et surveillance après livraison. SSDF et CSF décrivent des pratiques et résultats ; ils n’imposent pas que toutes les pratiques soient installées dans le cœur v1.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Privacy-engineering décide des risques liés aux personnes ; cloud-engineering couvre les contrôles de plateforme ; quality-engineering fournit les tests ; devops-delivery et release-management peuvent apporter provenance et gates ; SRE traite détection et réponse en production. Ne pas confondre un score, une checklist ou un rapport avec une analyse de menace. Ne pas mettre de données réelles dans des tests sans justification et protection. Éviter la journalisation de secrets et les scans de branches qui ne sont pas celles de l’artefact vérifié. Ne pas activer l’extension pour une modification purement locale et non exposée sans nouvel actif, permission ou donnée ; documenter toutefois une non-activation raisonnée.

Le choix des contrôles, seuils, classifications et boucles ci-dessus est notre synthèse d’intégration. Les pages NIST et OWASP ne garantissent pas une conformité et les exigences juridiques doivent être examinées dans la juridiction concernée.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
