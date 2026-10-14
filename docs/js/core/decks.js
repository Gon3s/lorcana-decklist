import { ARCHETYPES, CARD_SECTIONS, INKS } from './constants.js';
import { quantity, safeURL, uid } from './utils.js';

export function createDeck() {
  return {
    id: uid(),
    name: '',
    inks: [],
    description: '',
    archetype: 'Midrange',
    format: '',
    author: '',
    version: '1.0',
    image: '',
    source: '',
    keys: [],
    core: [],
    tech: [],
    favorable: [],
    unfavorable: [],
    lines: [],
    mulligan: '',
    mulliganMatchup: '',
    updated: new Date().toISOString(),
    example: false,
  };
}

/** Validate both legacy saved decks and schema v1 exports without mutating them. */
export function validateDeck(value, { newIdentity = false } = {}) {
  if (!value || typeof value !== 'object' || typeof value.name !== 'string') {
    throw new Error('Le nom de la fiche est manquant.');
  }
  if (
    !Array.isArray(value.inks) ||
    value.inks.length > 2 ||
    new Set(value.inks).size !== value.inks.length ||
    value.inks.some((ink) => !INKS[ink])
  ) {
    throw new Error('La fiche doit contenir au maximum deux encres différentes.');
  }
  const deck = createDeck();
  for (const key of [
    'name',
    'description',
    'format',
    'author',
    'version',
    'mulligan',
    'mulliganMatchup',
  ]) {
    if (typeof value[key] === 'string') deck[key] = value[key];
  }
  if (!newIdentity && typeof value.id === 'string') deck.id = value.id;
  deck.inks = [...value.inks];
  deck.image = safeURL(value.image);
  deck.source = /^https?:/.test(value.source || '') ? safeURL(value.source) : '';
  deck.archetype = ARCHETYPES.includes(value.archetype) ? value.archetype : 'Autre';
  deck.example = !newIdentity && value.example === true;
  if (!newIdentity && !Number.isNaN(Date.parse(value.updated))) deck.updated = value.updated;
  for (const section of [...Object.keys(CARD_SECTIONS), 'lines', 'favorable', 'unfavorable']) {
    if (!Array.isArray(value[section])) throw new Error('Rubrique manquante : ' + section);
    deck[section] = value[section].map((row) => {
      if (!row || typeof row !== 'object') throw new Error('Entrée de fiche invalide.');
      return {
        name: String(row.name ?? ''),
        note: String(row.note ?? ''),
        qty: quantity(row.qty),
        image: safeURL(row.image),
        id: typeof row.id === 'string' ? row.id : undefined,
        inks: Array.isArray(row.inks)
          ? [...new Set(row.inks.filter((ink) => INKS[ink]))].slice(0, 2)
          : [],
      };
    });
  }
  return deck;
}
export function decodeDeckExport(text) {
  const document = JSON.parse(text);
  if (document.schemaVersion !== 1) throw new Error('Version de fiche non prise en charge.');
  return validateDeck(document.deck, { newIdentity: true });
}
export function encodeDeckExport(deck) {
  return JSON.stringify({ schemaVersion: 1, deck: validateDeck(deck) }, null, 2);
}

/** A card may be both key and core, but cannot appear twice in the same section. */
export function addCatalogCard(deck, section, card) {
  if (!CARD_SECTIONS[section]) throw new Error('Rubrique de cartes inconnue.');
  if (deck[section].some((row) => row.id === card.id)) return false;
  deck[section].push({
    id: card.id,
    name: card.name,
    image: safeURL(card.image),
    qty: 1,
    note: '',
  });
  return true;
}
export function toggleInk(inks, ink) {
  if (!INKS[ink]) throw new Error('Encre inconnue.');
  const index = inks.indexOf(ink);
  if (index >= 0) inks.splice(index, 1);
  else {
    if (inks.length >= 2) throw new Error('Deux encres maximum. Retirez-en une pour changer.');
    inks.push(ink);
  }
}
export function moveRow(rows, index, direction) {
  const next = index + direction;
  if (!Number.isInteger(index) || ![-1, 1].includes(direction) || next < 0 || next >= rows.length)
    return false;
  [rows[index], rows[next]] = [rows[next], rows[index]];
  return true;
}
