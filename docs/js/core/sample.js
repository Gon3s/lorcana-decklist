import { createDeck } from './decks.js';
export function createSampleDeck() {
  const sample = createDeck();
  Object.assign(sample, {
    id: 'example-ruby-amethyst',
    name: 'Rubis Améthyste · Contrôle',
    inks: ['ruby', 'amethyst'],
    description:
      'Gagner du temps, reprendre le plateau et transformer chaque échange en avantage. Une fiche exemple à adapter à votre liste.',
    archetype: 'Contrôle',
    format: 'Exemple pédagogique',
    author: 'Grimoire',
    example: true,
    keys: [
      {
        name: 'Madame Mime - En renard',
        id: 'b632a76e8971d47d81626acf0505fdf0b9a173ba',
        qty: 4,
        note: 'Un outil de tempo : remonter un personnage pour rejouer un effet utile.',
        image:
          'https://api.lorcana.ravensburger.com/images/fr/set2/46_876586e7dbbad24d7577dba0316c97b0fdf8fc81.jpg',
      },
      {
        name: 'Merlin - En chèvre',
        id: 'a29eca3d8c2f7e753604eac2019e1eb7a21a01b2',
        qty: 4,
        note: 'Une source de lore à intégrer à vos séquences de rebond.',
        image:
          'https://api.lorcana.ravensburger.com/images/fr/set2/51_6bfccc48aa7af9e4eb41fc2d9b67760ed018b458.jpg',
      },
    ],
    core: [
      {
        name: 'Moteur de rebond',
        qty: 1,
        note: 'Décrivez ici les cartes et les quantités indispensables à votre version.',
        image: '',
      },
    ],
    favorable: [
      {
        inks: ['amber', 'amethyst'],
        name: 'Pression rapide - exemple',
        note: 'À tester : stabiliser le plateau et préserver vos ressources. Cette indication illustre le format, pas une évaluation de la méta.',
      },
    ],
    unfavorable: [
      {
        inks: ['sapphire', 'steel'],
        name: 'Rampe - exemple',
        note: 'À tester : identifier les menaces prioritaires et éviter de laisser trop de temps à l’adversaire.',
      },
    ],
    lines: [
      {
        name: 'Début de partie',
        note: 'Développer son encre et contester le plateau. Choisir ses échanges en fonction de la main adverse.',
      },
      {
        name: 'Milieu de partie',
        note: 'Réutiliser les effets d’arrivée en jeu pour créer de l’avantage et préparer une fenêtre de quête.',
      },
    ],
    mulligan:
      'Chercher une courbe jouable dès les premiers tours, des cartes encrables et une interaction adaptée. Renvoyer les cartes trop coûteuses sans plan pour les jouer.',
    mulliganMatchup:
      'Face à une pression rapide, privilégier les réponses immédiates. Adapter ces principes à la liste exacte.',
    tech: [
      {
        name: 'Une réponse à votre environnement',
        qty: 1,
        note: 'Indiquer le matchup visé et la carte que vous retireriez pour faire de la place.',
        image: '',
      },
    ],
  });
  return sample;
}
