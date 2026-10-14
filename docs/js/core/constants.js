/** Shared vocabulary. Ink IDs and deck section IDs are stable persisted values. */
export const INKS = Object.freeze({
  amber: ['Ambre', '#d7a849'],
  amethyst: ['Améthyste', '#9869c4'],
  emerald: ['Émeraude', '#419e79'],
  ruby: ['Rubis', '#c54e61'],
  sapphire: ['Saphir', '#4389be'],
  steel: ['Acier', '#9ca9b8'],
});
export const CARD_SECTIONS = Object.freeze({
  keys: 'Cartes clés',
  core: 'Core du deck',
  tech: 'Techs & cartes potentielles',
});
export const ARCHETYPES = ['Aggro', 'Midrange', 'Contrôle', 'Combo', 'Tempo', 'Autre'];
export const TABS = [
  ['identity', 'Identité'],
  ['cards', 'Cartes'],
  ['matchups', 'Matchups'],
  ['strategy', 'Plan de jeu'],
];
export const CARD_TYPES = {
  characters: 'Personnage',
  actions: 'Action',
  items: 'Objet',
  locations: 'Lieu',
};
export const DECK_STORAGE_KEY = 'grimoire-v1';
export const CATALOG_URL = 'https://api.lorcana.ravensburger.com/v3/catalog/fr';
export const CATALOG_SNAPSHOT_URL = 'assets/catalog.json';
export const CATALOG_PAGE_SIZE = 24;
