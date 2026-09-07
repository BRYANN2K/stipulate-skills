# Spec Workflow

Sept skills pour reprendre un projet ou développer une idée avec un contrat durable, une revue utilisateur et des preuves liées au résultat. Le noyau vise GPT-6 Astra dans Codex et utilise le format Agent Skills. Il reste local : aucune API payante, télémétrie, dépendance Python tierce ou action de publication.

## Installation

Python 3.10+ et Git sont nécessaires. Depuis ce dépôt :

```sh
python3 scripts/validate_skills.py
python3 -m unittest discover -s tests -v
python3 scripts/install.py --destination "$HOME/.agents/skills" --dry-run
python3 scripts/install.py --destination "$HOME/.agents/skills"
```

Pour une installation limitée à un projet, fournir son dossier `.agents/skills` comme destination. L’installeur conserve les autres skills, refuse les collisions et les copies modifiées. Chaque skill inclut son runtime : aucune dépendance au chemin du dépôt source. Ouvrir une nouvelle conversation après installation pour vérifier le catalogue du client.

Désinstallation des seules copies détenues par ce projet :

```sh
python3 scripts/install.py --destination "$HOME/.agents/skills" --uninstall
```

## Utilisation dans Codex

| Commande | Résultat |
|---|---|
| `$spec-bootstrap` | Préparer `.workflow`, adapter AGENTS.md et établir une carte factuelle du projet |
| `$spec-explore` | Explorer l’idée avec les extensions pertinentes, si elles sont disponibles |
| `$spec-validate` | Préparer la spec, la faire relire et enregistrer l’accord explicite |
| `$spec-apply` | Construire, vérifier et corriger dans le périmètre approuvé |
| `$spec-check` | Réconcilier les critères avec des preuves actuelles |
| `$spec-docs` | Créer ou mettre à jour la documentation affectée |
| `$spec-archive` | Promouvoir la spec, archiver le changement et créer un commit local ciblé |

Exemple de conversation : « $spec-bootstrap, reprends ce dépôt et préserve ses conventions. » Puis : « $spec-explore, ajoutons l’annulation des traitements. » Après revue de la spec : « J’approuve cette version ; $spec-apply. » Les corrections reviennent vers apply/check. Une nouvelle exigence revient vers validate. Docs et archive clôturent le changement.

Les extensions interviennent dans **explore** pour poser les questions métier et contribuer aux critères. Les phases suivantes consomment ces décisions. Le bootstrap reconnaît les métiers applicables et les fondations existantes, sans lancer tous leurs processus. Aucun métier n’est livré dans cette version du noyau.

## Structure d’un projet

```text
AGENTS.md
.workflow/
  project.md
  config.json
  specs/
  changes/
    ajout-connexion/
      proposal.md
      spec.md
      tasks.md       # seulement si utile
      evidence.md
      state.json
  archive/
```

Bootstrap crée les dossiers vides ; il ne crée pas de fausse fonctionnalité `ajout-connexion`. Explore crée le premier dossier réel. Project.md distingue faits, déductions et manques. Les specs courantes décrivent le comportement accepté ; chaque spec de changement représente la version complète souhaitée de sa cible.

## Garanties et limites

- Bootstrap préserve les fichiers et ajoute une seule section bornée à AGENTS.md. L’analyse métier est réalisée par l’agent ; le script ne déclare pas le projet mature.
- L’approbation lie proposal, spec, tasks et les références sélectionnées. Toute modification d’octets invalide l’accord, même éditoriale dans cette première version.
- Check exige tous les critères et une empreinte actuelle des fichiers Git, incluant le contenu, les liens et les bits exécutables. Les fichiers ignorés et `.workflow` ne font pas partie du sujet de code. Les résultats externes nécessitent une preuve identifiée dans le rapport.
- Les preuves sont des attestations inspectables ; le script ne peut pas garantir qu’un humain ou un agent a dit vrai. Les états locaux ne constituent pas un système de signature ou une barrière contre un opérateur malveillant ayant accès en écriture.
- Archive refuse les sources périmées, un index déjà rempli, les fichiers sélectionnés déjà modifiés au début, un HEAD déplacé et les mises à jour concurrentes de la spec cible. Il n’absorbe pas les autres travaux et n’effectue aucun push.
- Les sous-modules ne sont pas pris en charge dans l’empreinte v1. Utiliser la racine physique du dépôt. Linux et macOS sont les cibles du CI ; seul l’environnement local indiqué dans le rapport de livraison est vérifié lors de cette livraison.

Les tests couvrent le moteur et l’installation. Une évaluation comportementale d’Astra sur des projets réels reste distincte : ce noyau ne certifie pas à lui seul qu’un produit est prêt pour la production.

[Contrat et commandes](docs/workflow.md) · [Extensions](docs/extensions.md) · [Développement](CONTRIBUTING.md) · [Sécurité](SECURITY.md)

La version précédente de 33 skills reste dans l’historique Git et la sauvegarde de migration. Aucun ancien dossier SKILL.md n’est conservé sous un chemin de découverte de cette version.
