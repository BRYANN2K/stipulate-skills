# Contribuer

Le noyau porte le cycle de vie ; les métiers restent des extensions. Toute modification doit préserver l’intention utilisateur, la portée des commits et la distinction entre preuve déclarée et preuve réellement observée.

Le moteur canonique est `scripts/workflow.py`. Les copies sous chaque skill permettent une installation indépendante ; ne pas les éditer directement. Après modification :

```sh
python3 scripts/build_skills.py
python3 scripts/validate_skills.py
python3 -m unittest discover -s tests -v
```

Tester les comportements pertinents, les échecs et la préservation du travail existant. Les descriptions doivent sélectionner une tâche précise. Ne pas tester une formulation exacte sans nécessité de format. Les sept interfaces correspondent au contrat public actuel ; changer cet ensemble est une modification d’API à documenter.

Ne pas ajouter un métier au noyau. Fournir des fixtures isolées, sans données privées ni services réels. Toute modification d’un schéma doit expliquer sa compatibilité et sa migration. Préserver les licences des ressources réutilisées.
