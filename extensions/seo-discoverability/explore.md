# seo-discoverability — explorer

Rendre des contenus publics découvrables et indexables selon leur intention et leurs contraintes.

## Décider de la pertinence

La disponibilité dans la configuration n’active pas ce métier. Pendant `spec-explore`, sélectionner cette extension seulement si sa responsabilité touche le changement ou une inconnue décisive. Ne pas lancer tout le catalogue. Exemple pertinent : Publier une page de documentation publique qui doit être trouvée via recherche organique. Exemple hors périmètre : Modifier un dashboard privé non destiné à l’indexation.

Cette extension rend un contenu web public compréhensible et découvrable par les moteurs et les personnes, sans promettre une position dans les résultats. Elle couvre indexabilité, exploration, liens, structure, titres, contenu utile, données structurées, sitemaps, canonicals et mesure Search Console. Elle s’active dans `spec-explore` quand le changement publie ou modifie des pages publiques, URLs, métadonnées, rendu JavaScript, structure de liens, sitemap, données structurées ou contrôle d’indexation. Elle ne s’active pas pour une application privée, un intranet ou un écran sans exigence de découverte publique ; elle n’invente pas un besoin SEO à partir d’un simple site web.

Google Search Essentials distingue exigences techniques, politiques anti-spam et bonnes pratiques, tout en précisant que leur respect ne garantit pas exploration, indexation ou affichage ([Search Essentials](https://developers.google.com/search/docs/essentials)). Le guide pour développeurs recommande de vérifier la façon dont Google voit la page et rappelle les liens avec sécurité, performance, accessibilité et appareils ([guide développeur](https://developers.google.com/search/docs/fundamentals/get-started-developers)). Les sitemaps signalent des URLs mais ne forcent pas l’indexation ([Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=en)). Schema.org fournit un vocabulaire partagé, sans garantie de rich result ([Getting started](https://schema.org/docs/gs.html)). Ces recommandations ne sont ni obligations légales ni garantie de trafic.

## Reconnaître et réutiliser l’existant

Dans un projet neuf, chercher inventaire des URLs publiques, audience et intentions, règles robots/noindex, titles/headings, liens, canonical, sitemap, rendu côté serveur/client, structured data et propriété Search Console. Dans un projet en cours, examiner couverture indexation, erreurs d’exploration, changements de trafic, pages orphelines, redirections, duplications, résultats enrichis, performance et tickets de contenu.

Employer les états **établi**, **inféré**, **incomplet**, **manquant** et **non applicable**. Un sitemap présent ne prouve pas que ses URLs sont accessibles ou canoniques ; un JSON-LD valide ne garantit pas un résultat enrichi ; une page visible dans un navigateur ne prouve pas que Googlebot reçoit le même contenu. Distinguer une page non indexée volontairement, bloquée par erreur, ou simplement non encore explorée.

Consulter la carte du bootstrap puis rechercher seulement les preuves utiles au changement. Pour chaque élément, noter **établi, inféré, incomplet, manquant ou non applicable**, avec preuve ou justification. Ne pas confondre absence de document et absence de pratique. Décider de réutiliser, compléter ou remplacer ; une étape déjà satisfaite peut ne demander aucun travail.

## Borner la contribution au contrat commun

Le MVP couvre une URL canonique, title/heading et contenu utile, liens crawlables, absence de blocage involontaire, sitemap si nécessaire et validation HTML/rendu. Pour une page non indexable par choix, la preuve est la règle et son test, pas un classement. Approfondir selon taille et enjeu : architecture internationale, données structurées pertinentes, budgets de performance, monitoring Search Console, logs crawler, migrations avec redirects, tests de rendu JavaScript et stratégie éditoriale. Google ne fournit pas de seuil garantissant le ranking ; ne pas convertir un conseil en promesse.

Proposer seulement les propriétés nécessaires et leurs moyens de vérification, en utilisant les candidats de [check.md](check.md). L’agent les adapte et les remappe en identifiants `AC-1`, `AC-2`, etc., uniques dans la **spec commune** ; le moteur ne remappe aucun identifiant métier. Ne pas créer une approbation ou une spec parallèle. Chaque critère doit préciser résultat, contexte et preuve attendue. Une nouvelle exigence après accord impose révision et nouvel accord sur le contrat.

## Frontières

Quality-engineering teste le rendu et les contrats ; privacy-engineering vérifie qu’aucune donnée personnelle privée n’est indexée ; customer-support et docs fournissent des contenus utiles ; cloud/devops traitent performance et livraison. Éviter le keyword stuffing, le contenu généré sans valeur, le sitemap comme bouton d’indexation, et les métriques de position isolées. Ne pas activer cette extension pour une surface non publique ou une page explicitement exclue sans changement de règle ; documenter l’inapplicabilité. Les résultats de recherche fluctuent et dépendent de systèmes externes.

Les règles de Search Essentials, sitemaps et Schema.org sont des recommandations techniques de leurs éditeurs. Le processus, les états et critères sont notre synthèse d’intégration.

Les autres métiers cités sont des collaborations possibles, jamais des dépendances automatiquement activées. Le travail cloud seul n’active pas UX/design. Les sources détaillées sont dans [sources.md](sources.md) ; elles éclairent les décisions et ne constituent pas des critères supplémentaires implicites.
