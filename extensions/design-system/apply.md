# design-system — réaliser

Lire le contrat approuvé et les seules références sélectionnées. Préserver les travaux utilisateurs, conventions et autorisations déjà établies ; ne pas élargir le périmètre.

## Procédure métier

Recenser composants, tokens et usages réels avant d’inventer un système. Définir le contrat du composant, états, variants et accessibilité. Implémenter un changement compatible ou une migration explicite, avec exemples et tests des consommateurs représentatifs. Vérifier adoption et exceptions ; ne pas confondre une bibliothèque de fichiers avec un système gouverné.

Découper cette procédure selon les risques du changement ; les étapes peuvent se chevaucher ou être non applicables avec raison. Partir des éléments réutilisables identifiés pendant explore. Vérifier progressivement le comportement attendu et corriger dans le contrat ; utiliser [check.md](check.md) pour les observations métier.

## Résultat attendu

Fournir le résultat concret et inspectable, ses décisions et des preuves reliées aux vrais identifiants `AC-n`. Noter commandes, environnement, données ou participants réellement utilisés et ce qui reste simulé. Si le travail révèle une exigence nouvelle, revenir à la révision et à l’accord du contrat ; ne pas déplacer un seuil pour faire passer le résultat.

Cette extension ne donne pas d’approbation humaine, n’exécute aucun hook et n’autorise ni publication, ni contact externe, ni déploiement implicite. Exécuter les actions déjà autorisées dans leur périmètre ; demander seulement l’autorisation réellement manquante pour une action qui l’exige.
