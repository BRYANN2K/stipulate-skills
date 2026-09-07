# cli-tooling — explorer

Construire une interface en ligne de commande stable pour humains et automatisations.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Ajouter une commande JSON qui signale proprement les erreurs et interruptions. Exemple hors périmètre : Changer un composant graphique sans commande ou automatisation affectée.

Cette extension transforme une opération technique en commande CLI stable, lisible et scriptable : arguments, sous-commandes, aide, codes de sortie, stdin/stdout/stderr, configuration, auth, formats, erreurs et compatibilité. Elle s’active dans `spec-explore` lorsqu’un changement ajoute ou modifie une commande, une sous-commande, un flag, un output consommé par script ou une procédure d’administration. Elle s’active aussi quand une API interne devient un outil terminal destiné à des humains ou à l’automatisation.

Elle ne s’active pas pour un script privé jetable sans interface promise, ni pour une bibliothèque sans invocation terminal. Elle ne force pas POSIX, Rust/clap ou GitHub CLI si le projet a déjà une convention cohérente. Les conventions POSIX décrivent une syntaxe et des conventions d’arguments pour les utilitaires ([POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)); la page était partiellement inaccessible dans l’environnement et est marquée `limited`. GNU Coding Standards discute également des options et de la compatibilité POSIX ([GNU Coding Standards](https://www.gnu.org/prep/standards/standards.html)), avec la même limite d’accès. Ces documents sont des références de compatibilité, non un oracle pour chaque CLI.

## Reconnaître et réutiliser l’existant

Pour un projet neuf, chercher le nom de la commande, sous-commandes, conventions d’aide, codes de sortie, formats machine/humain, variables d’environnement, fichier de configuration, auth, exemples et procédure d’installation. Pour un projet en cours, lancer `--help`, tester stdin, sortie terminal redirigée, TTY absent, erreur réseau, interruption et version précédente, puis inspecter les scripts qui consomment la sortie. Classer chaque constat comme **établi** (commande et résultat reproductibles), **inféré** (intention non exécutée), **incomplet** (une plateforme ou un mode manque), **manquant** (recherche explicitée sans trace) ou **non applicable** (aucun contrat de terminal). Une commande qui réussit à la main ne prouve pas que son JSON est stable ; un flag documenté ne prouve pas son code de sortie.

La documentation clap présente un parseur qui fournit aide, suggestions, couleurs, complétion, version, tests et messages d’erreur ([clap documentation](https://docs.rs/clap/latest/clap/)). Le manuel GitHub CLI distingue usage terminal/script et options d’authentification ([GitHub CLI manual](https://cli.github.com/manual/)), et sa page de formatage décrit sortie par défaut, `--json`, `--jq` et `--template` ([gh help formatting](https://cli.github.com/manual/gh_help_formatting)). Nous reprenons l’invariant utile : séparer sortie humaine et contrat machine ; les flags exacts restent un choix du projet.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP comprend une invocation nominale, `--help`, validation d’une entrée invalide, code de sortie non nul, sortie d’erreur sur stderr et un exemple exécutable. Approfondir si la commande est publique, utilisée en CI, destructive, authentifiée ou consommée par d’autres outils : versionner le schéma machine, tester stdin/TTY, pagination, retries, interruption, compatibilité N-1, redaction et completion. Ne pas ajouter des options longues ou un format JSON simplement parce qu’un autre CLI le fait.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

`api-integrations` définit les appels distants et auth ; `backend-engineering` porte permissions et effets ; `desktop-engineering` peut fournir shell/protocole ; `database-engineering` peut exposer migrations. Éviter de mélanger logs et données machine, d’utiliser stdout pour des diagnostics, de supposer un TTY en CI, de supprimer une confirmation destructive ou de casser les scripts par une phrase ajoutée. POSIX/GNU et clap sont des références situées ; ils ne rendent pas une interface automatiquement stable. Un script non partagé et sans contrat ne déclenche pas l’extension.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
