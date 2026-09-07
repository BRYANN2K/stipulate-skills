# Contrat du noyau v1

Le numéro 2.0.0 est la version du dépôt ; `schema_version: 1` est celle des fichiers workflow. Python 3.10+ suffit. Tous les chemins CLI désignent le projet cible, jamais le dossier d’installation du skill par défaut.

## États et transitions

```text
exploring → draft → approved → applying → checked → documented → archived
                        ↑         ↑          │
                        │         └── correction autorisée
                 nouveau contrat
```

Validate vérifie la forme et expose l’empreinte du contrat. Approve enregistre l’accord utilisateur ; l’opérateur qui utilise le CLI est responsable de sa véracité. Start refuse un contrat différent. Un check échoué reste applying. Docs et archive exigent les étapes précédentes. Start peut reprendre après checked/documented et invalide leurs preuves tout en conservant le premier état de référence.

Le champ `phase` seul n’est jamais une preuve d’approbation actuelle : utiliser `status`, qui recalcule `approval_current`.

## Exemple CLI de bout en bout

Depuis le dépôt d’outils, remplacer `/physical/path/to/project` par la racine Git réelle. Initialiser Git séparément si nécessaire. Les appels sont montrés séparément pour matérialiser les interventions humaines et les observations, pas comme un script qui s’auto-approuve.

```sh
python3 scripts/workflow.py --root /physical/path/to/project bootstrap
python3 scripts/workflow.py --root /physical/path/to/project explore ajout-annulation --title "Annuler un traitement"
```

Renseigner project.md et proposal.md. Compléter spec.md avec des critères tels que :

```markdown
# Annuler un traitement

## Intent
Permettre l’annulation des traitements encore en attente.

## Acceptance criteria
- AC-1: L’annulation d’un traitement en attente produit un état annulé observable.
- AC-2: Une tentative non autorisée est rejetée côté serveur.
```

Pour faire évoluer une spec existante : `explore ajuster-annulation --target ajout-annulation`. Le contenu de la cible est repris comme départ, et sa version est protégée contre les écrasements concurrents lors de l’archive.

```sh
python3 scripts/workflow.py --root /physical/path/to/project validate ajout-annulation
```

Présenter la version à l’utilisateur. **Seulement après son accord :**

```sh
python3 scripts/workflow.py --root /physical/path/to/project approve ajout-annulation --by user --ack-user-approval
python3 scripts/workflow.py --root /physical/path/to/project start ajout-annulation
```

Construire, exécuter les vérifications pertinentes, corriger, puis demander l’empreinte :

```sh
python3 scripts/workflow.py --root /physical/path/to/project snapshot
```

Créer hors du dépôt un JSON contenant la valeur exacte de `subject_digest` retournée, et les observations réelles :

```json
{
  "subject_digest": "empreinte-retournee-par-snapshot",
  "criteria": [
    {"id": "AC-1", "status": "passed", "evidence": "Commande, résultat et localisateur réellement observés"},
    {"id": "AC-2", "status": "unverified", "evidence": "Test serveur non exécuté : environnement indisponible"}
  ]
}
```

Cet exemple reste volontairement non concluant : il ne permet pas de passer à docs tant que AC-2 n’est pas réellement vérifié. Le JSON peut aussi être transmis via stdin avec `--results -`. Check sort avec 0 si tous les critères passent, 2 si le rapport décrit un échec ou un manque, et 1 si le rapport ou les préconditions sont invalides. Le JSON expose aussi `all_passed` et `phase`.

```sh
python3 scripts/workflow.py --root /physical/path/to/project check ajout-annulation --results /tmp/check-results.json
python3 scripts/workflow.py --root /physical/path/to/project status ajout-annulation
```

Après un check entièrement réussi, mettre à jour et vérifier la documentation, puis déclarer ses chemins :

```sh
python3 scripts/workflow.py --root /physical/path/to/project docs ajout-annulation --paths README.md --summary "Exemple d’annulation vérifié contre le comportement observé."
python3 scripts/workflow.py --root /physical/path/to/project archive ajout-annulation --paths src/jobs.py tests/test_jobs.py README.md --message "Add pending-job cancellation"
```

Les chemins d’archive doivent correspondre exactement aux différences depuis start, hors `.workflow`. Inclure les suppressions et les anciens/nouveaux chemins lors d’un renommage. Les chemins montrés sont illustratifs. Les fichiers de la spec et de son archive sont ajoutés automatiquement ; AGENTS.md/config/project.md ne sont pas ajoutés implicitement.

## Fichiers

- `config.json` : `schema_version`, objet `extensions`, objet `settings`. L’approbation utilisateur ne peut pas être désactivée dans v1.
- `project.md` : intention, contexte, conventions, preuves de l’existant et questions. Géré par l’agent et le propriétaire du projet.
- `proposal.md` : problème, périmètre, décisions et questions ouvertes.
- `spec.md` : contrat complet futur de la cible ; critères `- AC-n: texte` uniques. La revue sémantique doit résoudre les inconnues importantes avant accord.
- `tasks.md` : facultatif, intégré à l’empreinte d’approbation s’il existe.
- `evidence.md` : rapport humain issu du check, avec critères et localisateurs.
- `state.json` : id, cible, extensions, état, accord, baseline, preuves et documentation. Ne pas le modifier pour fabriquer une validation ; utiliser `select <id> --extension <enabled-id>` pour changer les extensions durant une nouvelle exploration, ce qui invalide l’accord précédent.

Le contrat approuvé inclut proposal/spec/tasks et les manifestes/références des extensions sélectionnées. Les ressources imbriquées non déclarées dans le manifeste ne sont pas intégralement figées : une extension doit exposer ses références gouvernantes directement. Les exigences qui conditionnent l’acceptation doivent être présentes dans spec.md.

## Reprise et incidents locaux

- Un contrat modifié : validate, revue utilisateur, approve, puis start. La baseline source du premier start est conservée.
- Du code modifié après check : check à nouveau ; docs n’accepte que les changements documentaires déclarés.
- HEAD déplacé ou fichier préalablement sale devenu concerné : l’archive automatique refuse. Séparer/reconcilier les travaux explicitement, ou créer un nouveau changement sur une base propre et transférer la spec après revue. Aucune commande de contournement silencieux n’est fournie.
- Commit refusé par un hook : les métadonnées workflow sont restaurées et les chemins de cette transaction sont désindexés si HEAD n’a pas bougé. Les modifications de source produites par un hook sont préservées et doivent être examinées.
- Un processus tué peut laisser `.workflow/.lock`. Vérifier qu’il n’est plus actif avant de retirer ce verrou. Ne pas supprimer automatiquement un verrou sur le seul critère de son âge.
- L’écriture de chaque fichier est atomique ; une panne système au milieu de plusieurs opérations Git/fichiers n’est pas une transaction de base de données. Inspecter Git et l’archive avant de reprendre après une telle panne.
