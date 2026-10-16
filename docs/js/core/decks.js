import { ARCHETYPES, CARD_SECTIONS, INKS } from './constants.js';
import { isPrintingCode, normalizePrintingCode } from './decklist.js';
import { quantity, safeURL, uid, cleanText } from './utils.js';

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
    source: '',
    decklist: [],
    keys: [],
    core: [],
    tech: [],
    favorable: [],
    unfavorable: [],
    lines: [],
    mulligan: '',
    mulliganMatchup: '',
    updated: new Date().toISOString(),
  };
}

/** Validate the current Duels.ink-backed deck format without mutating it. */
export function validateDeck(value, { newIdentity = false } = {}) {
  if (!value || typeof value !== 'object' || !cleanText(value.name).trim()) {
    throw new Error('Le nom de la fiche est manquant.');
  }
  if (!Array.isArray(value.decklist) || !value.decklist.length)
    throw new Error('La decklist Duels.ink est manquante.');
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
    if (typeof value[key] === 'string') deck[key] = cleanText(value[key]);
  }
  if (!newIdentity && typeof value.id === 'string') deck.id = value.id;
  deck.source = /^https?:/.test(value.source || '') ? safeURL(value.source) : '';
  deck.archetype = ARCHETYPES.includes(value.archetype) ? value.archetype : 'Autre';
  if (!newIdentity && !Number.isNaN(Date.parse(value.updated))) deck.updated = value.updated;
  deck.decklist = value.decklist.map((row) => {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id)
      throw new Error('Carte de decklist invalide.');
    const printingCode = normalizePrintingCode(row.printingCode);
    if (!isPrintingCode(printingCode)) throw new Error("Code d'impression de decklist invalide.");
    const inks = Array.isArray(row.inks) ? [...new Set(row.inks.filter((ink) => INKS[ink]))] : [];
    if (!inks.length || inks.length > 2) throw new Error('Encres de decklist invalides.');
    return {
      id: row.id,
      name: cleanText(row.name),
      qty: quantity(row.qty),
      image: safeURL(row.image),
      printingCode,
      inks,
    };
  });
  if (deck.decklist.reduce((total, row) => total + row.qty, 0) < 60)
    throw new Error('La decklist doit contenir au moins 60 cartes.');
  deck.inks = [...new Set(deck.decklist.flatMap((row) => row.inks))];
  if (deck.inks.length > 2)
    throw new Error('La fiche doit contenir au maximum deux encres différentes.');
  for (const section of [...Object.keys(CARD_SECTIONS), 'lines', 'favorable', 'unfavorable']) {
    if (!Array.isArray(value[section])) throw new Error('Rubrique manquante : ' + section);
    deck[section] = value[section].map((row) => {
      if (!row || typeof row !== 'object') throw new Error('Entrée de fiche invalide.');
      return {
        name: cleanText(row.name),
        note: cleanText(row.note),
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
  if (document.schemaVersion !== 2) throw new Error('Version de fiche non prise en charge.');
  return validateDeck(document.deck, { newIdentity: true });
}
export function encodeDeckExport(deck) {
  return JSON.stringify({ schemaVersion: 2, deck: validateDeck(deck) }, null, 2);
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
export function addCatalogCards(deck, section, cards) {
  if (!Array.isArray(cards)) throw new Error('Liste de cartes invalide.');
  if (!CARD_SECTIONS[section]) throw new Error('Rubrique de cartes inconnue.');
  return cards.reduce((count, card) => count + Number(addCatalogCard(deck, section, card)), 0);
}
export function toggleSectionCard(deck, section, card) {
  if (!CARD_SECTIONS[section]) throw new Error('Rubrique de cartes inconnue.');
  const index = deck[section].findIndex((row) => row.id === card.id);
  if (index >= 0) {
    deck[section].splice(index, 1);
    return false;
  }
  deck[section].push({
    id: card.id,
    name: cleanText(card.name),
    image: safeURL(card.image),
    qty: quantity(card.qty),
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
