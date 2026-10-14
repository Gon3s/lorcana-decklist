# Grimoire — Fiches de decks Lorcana

Application statique en français pour créer, éditer et consulter des guides de decks.

## Fonctionnalités

- Catalogue de fiches filtrable par texte, encre et archétype.
- Éditeur à quatre onglets avec aperçu en direct.
- Une ou deux encres, decklist collée, déposée ou choisie (PNG/JPG/WebP).
- Cartes clés, core et techs sans limite d’entrées, quantités et commentaires.
- Catalogue français Ravensburger intégré : 2 784 identités de cartes au 14 octobre 2026.
- Matchups favorables/défavorables avec une ou deux encres et commentaires.
- Lignes de jeu réordonnables, mulligan général et adapté à l’adversaire.
- Sauvegarde locale automatique, duplication, suppression, import/export JSON comprenant l’image.
- Impression/PDF à travers la boîte d’impression du navigateur.

Les fiches restent dans le navigateur : pas de synchronisation entre appareils ni de liens publics de fiches. Exporter le JSON pour sauvegarder ou transmettre une fiche. Le dépôt conserve sa visibilité actuelle. GitHub Pages se configure séparément dans les paramètres du dépôt.

## Exécution

Servir le dossier `docs` avec un serveur statique. Aucune compilation ni dépendance applicative. Vérifier avec `node --check docs/app.js` et `node verify.cjs`.

Le catalogue est un instantané normalisé de https://api.lorcana.ravensburger.com/v3/catalog/fr ; les illustrations sont chargées depuis les URL officielles. Les polices distantes disposent de polices système de repli.

Inspirations fournies : https://github.com/Gon3s/lorcana-top5 et https://github.com/Gon3s/duocast-overlay. Aucun code de ces dépôts n’est copié.

Projet de fans indépendant. Disney Lorcana © Disney.

## Publication sur GitHub Pages

Dans Settings → Pages → Build and deployment :

1. Source : **Deploy from a branch**.
2. Branch : **main**.
3. Folder : **/docs**.
4. Save.

Adresse prévue après activation : https://gon3s.github.io/lorcana-decklist/

Les chemins des ressources sont relatifs et fonctionnent dans le sous-dossier du projet. Le fichier `.nojekyll` désactive le traitement Jekyll. Aucune clé, aucun secret ni compte n’est nécessaire au site.

Les brouillons de l’ancienne adresse restent dans son stockage local. Pour les transférer, exporter les fiches en JSON depuis l’ancien site puis les importer sur GitHub Pages.

GitHub Pages sur un dépôt privé nécessite une offre GitHub compatible.
