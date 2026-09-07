# Périmètre et sécurité

Le moteur est local et hors ligne. Il ne lance ni shell de production, ni déploiement, ni appel réseau. Git commit utilise les hooks du dépôt : leur comportement dépend de l’environnement du projet.

L’accord utilisateur est enregistré par l’opérateur. Le noyau ne fournit pas d’authentification, de signature ni de protection contre un utilisateur qui falsifie ses propres fichiers. Les rapports d’acceptation doivent venir d’observations réelles. Les empreintes identifient le travail local, pas la vérité des résultats ni l’état d’un service externe.

Les chemins workflow refusent les remontées et les liens symboliques. L’archive refuse les changements source antérieurs à start sur les fichiers concernés, les index déjà remplis, les preuves périmées et les cibles modifiées concurremment. Un verrou local prévient les écritures concurrentes par le CLI. Il ne verrouille pas les éditeurs ou toutes les opérations Git externes.

Ne pas écrire de credentials, payloads clients ou logs privés dans proposal, spec, evidence ou les résumés de documentation. Les noms et empreintes des fichiers suivis/non ignorés figurent dans state.json ; examiner ce qui sera commité. Ne pas placer une information privée dans Git en supposant que l’archive la protège.

La publication, le push et les opérations métier distantes demandent le périmètre et les autorisations correspondants. Aucun skill ne peut élargir les permissions de l’environnement.
