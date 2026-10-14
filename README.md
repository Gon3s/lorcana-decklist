# Grimoire - Fiches de decks Lorcana

Application statique française pour écrire, sauvegarder et partager des guides de decks. Site : https://gon3s.github.io/lorcana-decklist/

## Utilisation

- **Mes fiches** : créer, consulter, dupliquer, filtrer, importer/exporter une fiche et imprimer en PDF.
- **Éditeur → Cartes** : chercher par nom ou texte, filtrer par encre, type, coût, extension et encres du deck ; choisir Cartes clés, Core ou Techs et ajouter une carte. Quantités et commentaires restent propres à chaque rubrique. Une carte ne se répète pas deux fois dans une même rubrique.
- **Catalogue** : consulter les illustrations et règles, importer/exporter le catalogue JSON, ajouter/corriger une carte ou la masquer.
- « Catalogue d’origine » réinitialise ces modifications après confirmation. Un import remplace le catalogue local après validation et confirmation.

Les fiches restent dans le navigateur (`localStorage`, clé historique `grimoire-v1`). Le catalogue personnalisé utilise **IndexedDB**, séparément des fiches. Ces données ne se synchronisent pas entre appareils : les exports JSON servent à les transmettre ou les sauvegarder. Les cartes enregistrées dans les fiches sont des copies ; modifier le catalogue ne réécrit pas les fiches existantes.

Le site utilise le catalogue intégré au dépôt. Sa mise à jour depuis Ravensburger se fait uniquement en développement, avec le script décrit plus bas. Vous pouvez importer un export JSON normalisé ou le catalogue officiel français brut. Une écriture échouée conserve le catalogue actif et affiche une erreur.

## Développement

Node.js **22 ou supérieur** et npm. Les dépendances sont exclusivement des outils de développement ; le site publié n’a ni serveur applicatif, ni dépendance d’exécution externe à installer.

```sh
npm ci
npm run serve         # sources sur http://localhost:8080
npm run lint          # Oxlint et règles de typographie
npm run check         # syntaxe, imports, actifs et catalogue
npm test              # domaine, stockage et parcours DOM
npm run format        # formatage Oxfmt
npm run format:check
npm run build         # publication statique dans _site/
```

`npm run build` regroupe JavaScript et CSS avec esbuild et génère des noms de fichiers basés sur le contenu pour éviter les mélanges de versions en cache. `_site/` est généré, ignoré par Git, et seul son contenu est publié.

## Architecture

| Dossier                | Responsabilité                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `docs/app.js`          | État de la session, navigation, orchestration des événements                           |
| `docs/js/core/`        | Modèles, validation, recherche/pagination, règles de sélection ; aucun DOM ni stockage |
| `docs/js/services/`    | Persistance des fiches, cache IndexedDB du catalogue, requêtes réseau et fichiers      |
| `docs/js/ui/`          | Fonctions de rendu HTML ; état fourni en argument et valeurs échappées                 |
| `docs/css/layout.css`  | Géométrie et composants de base                                                        |
| `docs/css/theme.css`   | Identité visuelle Lorcana, responsive et impression                                    |
| `docs/css/catalog.css` | Catalogue, sélecteur de cartes et dialogues                                            |
| `tests/`               | Tests Node, persistance IndexedDB simulée et parcours DOM Happy DOM                    |
| `scripts/`             | Vérification, construction et actualisation du catalogue intégré                       |

Les vues ne font pas de requête réseau. Les services ne manipulent pas le DOM. Les règles métier sont partagées par l’interface, les imports et les tests.

## Données et compatibilité

- Les exports de fiches conservent `schemaVersion: 1`. Les sauvegardes de la première version sont validées et relues sans migration destructive. Les entrées illisibles sont signalées ; le chargement ne réécrit jamais le stockage.
- Catalogue `schemaVersion: 1` : `cards` officielles, `custom` ajoutées, `overrides` indexées par identifiant, `hidden` pour les cartes masquées, `sets`, `source`, `updated`.
- Le normaliseur accepte aussi la réponse officielle Ravensburger (`cards` groupées par type), gère les réimpressions et regroupe les extensions d’une même identité.
- Les cartes spéciales de quête sans encre sont consultables ; le filtre « Encres du deck uniquement » les exclut.
- La suppression d’une carte du catalogue ne supprime jamais les copies utilisées dans les fiches.

Pour actualiser le catalogue **intégré au dépôt**, séparément du catalogue local des visiteurs :

```sh
npm run catalog:update
npm run check
npm test
# Examiner le diff de docs/assets/catalog.json avant de le committer.
```

Source : https://api.lorcana.ravensburger.com/v3/catalog/fr . L’instantané fourni contient 2 784 identités de cartes, leurs textes, illustrations, raretés et extensions.

## Tests et publication

GitHub Actions (`.github/workflows/pages.yml`) installe les dépendances depuis `package-lock.json`, vérifie le code et les données, exécute les tests et le contrôle de formatage Oxfmt, construit le site puis publie `_site/` sur Pages. Les validations s’exécutent sur les pull requests. La publication s’exécute uniquement depuis `main`, à chaque push ou lancement manuel.

Dans Settings → Pages, la source est **GitHub Actions**. Aucun secret personnel n’est nécessaire. Les tests DOM ne remplacent pas une vérification visuelle dans un vrai navigateur : contrôler aussi les petits écrans, les dialogues et l’impression lors des changements de mise en page.

Lors d’un changement d’adresse, exporter les fiches depuis l’ancienne adresse et les importer sur la nouvelle : chaque origine possède son propre stockage navigateur.

## Visuels

Voir [ASSETS.md](ASSETS.md) pour les sources. Projet de fans indépendant. Disney Lorcana © Disney.

## Règles d’interface

- Texte affiché au minimum en 14 px, y compris les labels, filtres, métadonnées et boutons.
- Les caractères U+2013 et U+2014 sont interdits dans les sources, contenus et données. Utiliser le trait d’union ASCII. Le contrôle `npm run lint` fait échouer la CI en cas de réintroduction. Les imports normalisent également ces caractères.
- Le sélecteur des cartes accepte plusieurs encres. Une carte bicolore doit avoir ses deux encres autorisées. Dans l’éditeur, les encres du deck sont sélectionnées par défaut ; la sélection manuelle permet de les ajuster.
- Tri initial : extension principale la plus récente, puis numéro de collection croissant. Lorsqu’une extension est filtrée, son numéro de réimpression est utilisé.
- Oxlint assure le linting ; Oxfmt assure le formatage. Les deux sont exécutés dans GitHub Actions.

Les anciens catalogues en cache reçoivent automatiquement les numéros de réimpression manquants depuis le catalogue intégré. Les corrections, ajouts et cartes masquées sont conservés. Si cette opération échoue, le catalogue en cache reste disponible. Décocher le filtre des encres du deck retire le filtrage automatique ; ouvrir la gestion du catalogue réinitialise les filtres du sélecteur.
