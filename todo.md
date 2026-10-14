# Idées et améliorations

Cette liste prépare les évolutions futures. Les suggestions restent à prioriser.

## À faire : cartes mises en avant sur l'accueil

- [ ] Ajouter un fichier de configuration pour choisir les trois cartes mises en avant sur l'accueil, sans modifier le code de rendu.

Piste proposée : `docs/config/home.json`, avec trois identifiants de cartes du catalogue, dans leur ordre d'affichage. Conserver Elsa, Mickey et Stitch comme sélection initiale.

- [ ] Résoudre les noms et illustrations depuis le catalogue intégré, plutôt que dupliquer les URL dans la configuration.
- [ ] Vérifier que la configuration contient exactement trois cartes distinctes et que leurs identifiants existent.
- [ ] Prévoir une sélection de secours si la configuration est absente ou invalide, ainsi qu'un rendu de secours si une illustration ne charge pas.
- [ ] Générer les textes alternatifs et le libellé accessible du groupe à partir des cartes choisies.
- [ ] Copier la configuration dans le site construit et documenter comment changer la sélection dans le README.
- [ ] Contrôler les configurations valides et invalides, puis vérifier le rendu sur mobile et ordinateur.

Repère technique : les trois illustrations et leurs libellés sont actuellement codés dans `docs/js/ui/collection.js`.

## Suggestions à étudier

- [ ] Permettre de cliquer sur une carte de l'accueil pour ouvrir sa fiche dans le catalogue, avec navigation au clavier.
- [ ] Proposer un aperçu des trois cartes sélectionnées avant publication pour vérifier leur composition visuelle.
- [ ] Optimiser le chargement des illustrations de l'accueil : dimensions explicites et priorité adaptée, pour éviter les décalages de mise en page.
- [ ] Vérifier l'accessibilité de l'accueil : contraste, focus visible et respect de la préférence de réduction des animations.
- [ ] Ajouter un rappel discret de sauvegarde par export JSON après des modifications de fiches, puisque les données restent locales au navigateur.
- [ ] Étudier le partage d'une fiche complète par lien, en précisant que le contenu partagé devient accessible aux personnes possédant ce lien.
- [ ] Revoir la mise en page d'impression/PDF des fiches longues pour éviter les coupures de cartes et de rubriques.
