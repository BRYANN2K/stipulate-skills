# release-management — explorer

Préparer une version identifiable avec compatibilité, artefacts, notes et récupération.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Préparer une nouvelle version distribuable avec migration et notes de compatibilité. Exemple hors périmètre : Explorer un prototype sans version ou distribution prévue.

Cette extension rend une sortie identifiable, compréhensible et vérifiable pour ses consommateurs : version, notes, compatibilité, dépréciation, artefacts, provenance et critères de retrait. Elle s’active dans `spec-explore` quand le changement modifie une API publique, un paquet, un binaire, un format distribué, une politique de version, des notes de version ou l’intégrité d’un artefact. Elle ne s’active pas pour chaque `archive` du cœur : `archive` ferme un changement local et ne publie pas de version.

SemVer 2.0.0 prescrit une relation entre API publique et incréments MAJOR/MINOR/PATCH, ainsi que l’immuabilité du contenu publié ([Semantic Versioning](https://semver.org/)). Keep a Changelog recommande un historique curé, lisible et organisé par versions ([Keep a Changelog](https://keepachangelog.com/en/1.0.0/)). GitHub décrit l’option d’immutabilité des releases, qui verrouille tag et assets et crée une attestation ([Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)). Ce sont respectivement une spécification choisie, une convention éditoriale et une capacité de plateforme ; aucune n’est une obligation universelle.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher l’API publique, politique de compatibilité, format de version, registre/package cible, modèle de release notes, artefacts attendus, signatures/provenance, support des versions précédentes et plan de dépréciation. Dans un projet existant, examiner tags et releases, changelog, commits et artefacts réellement téléchargés, ruptures historiques, métadonnées de build, signatures, canaux de distribution, issues de migration et versions encore supportées.

Utiliser les états **établi**, **inféré**, **incomplet**, **manquant** et **non applicable**. Un tag présent ne prouve pas que le code ou les assets n’ont pas changé ; une note de version ne prouve pas la compatibilité ; un numéro SemVer n’a de sens que si l’API concernée est déclarée. Quand les standards ISO ou obligations client exigent un format différent, celui-ci doit être explicitement retenu dans le contrat.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP définit l’API ou contrat consommé, choisit une convention de version, produit des notes lisibles, attache un artefact au commit vérifié et documente la marche de publication. Pour un outil interne non distribué, un identifiant de build et un journal local peuvent suffire. Approfondir selon exposition et risque : immutabilité des releases, signatures et attestations, provenance SLSA, matrice de compatibilité, canaux canary, migration dépréciée, SBOM, vérification côté consommateur et politique de support. SemVer et Keep a Changelog sont à adopter volontairement, non à présumer.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Devops-delivery fournit build et provenance ; security-engineering traite intégrité et signatures ; quality-engineering vérifie compatibilité ; support prépare les messages ; SRE traite risque de mise en production. Ne pas modifier un tag publié, réutiliser un numéro, générer des notes depuis un log brut sans curation, ni appeler `archive` publication. Les releases immuables GitHub sont une option de plateforme et ne protègent pas une copie diffusée ailleurs. Ne pas activer l’extension pour une refactorisation interne sans consommateur ni artefact externe, sauf si elle change un contrat documenté.

Le processus et les niveaux MVP sont une synthèse d’intégration ; les sources ne garantissent ni compatibilité ni intégrité pour un projet qui ne met pas en œuvre leurs conditions.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
