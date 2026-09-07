# Spec Workflow — carte du projet

## Intention
Remplacer le catalogue historique par sept skills autonomes pour guider une idée jusqu’à un contrat approuvé, une implémentation vérifiée, sa documentation et son archive Git. Le dialogue en langage naturel reste le moyen d’explorer et de modifier les décisions. Les extensions métier interviendront dans spec-explore.

## Carte et preuves
| Zone | État | Preuve / décision |
|---|---|---|
| Noyau du cycle | établi | scripts/workflow.py ; sept skills dans skills/ |
| Installation locale | établi | scripts/install.py ; tests/test_install.py |
| Contrats et usages | établi | README.md ; docs/workflow.md ; .workflow/specs/core.md |
| Extensions métier | manquant, prochaine étape | Interface documentée dans docs/extensions.md ; aucune extension activée |
| Interface graphique / design system | non applicable | Ce dépôt fournit des instructions et un CLI local |
| Déploiement cloud | non applicable | Exécution locale sans service ni API |
| Vérification automatisée | établie localement | tests/ ; validation des packages ; environnement de livraison macOS / Python 3.14 |
| CI multi-environnement | configuré, exécution distante non vérifiée | .github/workflows/validate.yml |
| Évaluation comportementale sur projets réels | incomplète | À réaliser à l’usage ; tests du CLI distincts de la qualité des décisions du modèle |

## Conventions
Python standard 3.10+, sans dépendance tierce. Source canonique du moteur : scripts/workflow.py. Les copies portables se régénèrent avec scripts/build_skills.py. Ne pas éditer ces copies séparément. Conserver l’accord utilisateur avant spec-apply, les preuves réelles avant check et les changements Git étrangers à l’archive.

## Commandes
- python3 scripts/build_skills.py --check
- python3 scripts/validate_skills.py
- python3 -m unittest discover -s tests -v
- python3 scripts/install.py --destination <dossier-skills> --dry-run

## Historique
Le catalogue antérieur est conservé dans l’historique Git, un tag de migration et des sauvegardes externes au chemin de découverte des skills. La refonte ne publie ni ne pousse le dépôt.
