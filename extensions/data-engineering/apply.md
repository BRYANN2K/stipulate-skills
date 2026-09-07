# data-engineering — réaliser

Lire le contrat approuvé et les seules références sélectionnées. Préserver les travaux utilisateurs, conventions et autorisations déjà établies ; ne pas élargir le périmètre.

## Procédure métier

Tracer sources, transformations, consommateurs, schémas et ownership. Définir fraîcheur, qualité et comportement des données tardives ou invalides. Implémenter checkpoints, déduplication, quarantaine et backfill selon le besoin. Tester reprise après interruption, rejeu et compatibilité de schéma ; comparer comptes et invariants de bout en bout. Protéger les données et distinguer qualité d’un échantillon et qualité du flux réel.

Découper cette procédure selon les risques du changement ; les étapes peuvent se chevaucher ou être non applicables avec raison. Partir des éléments réutilisables identifiés pendant explore. Vérifier progressivement le comportement attendu et corriger dans le contrat ; utiliser [check.md](check.md) pour les observations métier.

## Résultat attendu

Fournir le résultat concret et inspectable, ses décisions et des preuves reliées aux vrais identifiants `AC-n`. Noter commandes, environnement, données ou participants réellement utilisés et ce qui reste simulé. Si le travail révèle une exigence nouvelle, revenir à la révision et à l’accord du contrat ; ne pas déplacer un seuil pour faire passer le résultat.

Cette extension ne donne pas d’approbation humaine, n’exécute aucun hook et n’autorise ni publication, ni contact externe, ni déploiement implicite. Exécuter les actions déjà autorisées dans leur périmètre ; demander seulement l’autorisation réellement manquante pour une action qui l’exige.
