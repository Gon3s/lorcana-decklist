import { CARD_TYPES, INKS, CATALOG_PAGE_SIZE } from './constants.js';
import { normalize, safeURL } from './utils.js';

const TYPE_ALIASES = {
  character: 'characters',
  characters: 'characters',
  personnage: 'characters',
  action: 'actions',
  actions: 'actions',
  item: 'items',
  items: 'items',
  objet: 'items',
  location: 'locations',
  locations: 'locations',
  lieu: 'locations',
};

export function normalizeCard(value, fallbackType = '') {
  if (!value || typeof value !== 'object') throw new Error('Carte invalide.');
  const id = String(value.id ?? value.deck_building_id ?? '').trim();
  let name = String(value.name ?? '').trim();
  if (value.subtitle) name += ' — ' + String(value.subtitle);
  if (!id || !name) throw new Error('Chaque carte doit avoir un identifiant et un nom.');
  const sets = value.set ?? value.card_sets ?? [];
  if (!Array.isArray(sets)) throw new Error('Extensions invalides.');
  const questCard = sets.some((set) => /^quest/.test(String(set)));
  const inks = [
    ...new Set(
      (value.inks ?? value.magic_ink_colors ?? []).map((ink) => String(ink).toLowerCase()),
    ),
  ];
  if ((!inks.length && !questCard) || inks.length > 2 || inks.some((ink) => !INKS[ink]))
    throw new Error('Encres invalides pour « ' + name + ' ».');
  const cost = Number(value.cost ?? value.ink_cost ?? 0);
  if (!Number.isInteger(cost) || cost < 0 || cost > 99)
    throw new Error('Coût invalide pour « ' + name + ' ».');
  const type = TYPE_ALIASES[normalize(value.type || fallbackType)] || '';
  if (!CARD_TYPES[type]) throw new Error('Type de carte inconnu pour « ' + name + ' ».');
  return {
    id,
    name,
    inks,
    cost,
    type,
    image: safeURL(value.image ?? value.thumbnail_url),
    set: [...new Set(sets.map(String))],
    rarity: String(value.rarity ?? ''),
    text: String(value.text ?? value.rules_text ?? '').replaceAll('%', '\n'),
    inkable: typeof value.inkable === 'boolean' ? value.inkable : (value.ink_convertible ?? null),
  };
}

/** Accept our export format and the official Ravensburger French catalogue. */
export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.cards)
    throw new Error('Catalogue invalide : champ cards manquant.');
  if (raw.schemaVersion && raw.schemaVersion !== 1)
    throw new Error('Version de catalogue non prise en charge.');
  let cards;
  if (Array.isArray(raw.cards)) cards = raw.cards.map((card) => normalizeCard(card));
  else
    cards = Object.entries(raw.cards).flatMap(([type, rows]) => {
      if (!Array.isArray(rows)) throw new Error('Liste de cartes invalide.');
      // Promo/alternate official entries may have no deck identity; they are not playable identities.
      return rows.filter((card) => card.deck_building_id).map((card) => normalizeCard(card, type));
    });
  const byId = new Map();
  for (const card of cards) {
    const previous = byId.get(card.id);
    if (previous) previous.set = [...new Set([...previous.set, ...card.set])];
    else byId.set(card.id, card);
  }
  if (!byId.size) throw new Error('Le catalogue ne contient aucune carte exploitable.');
  const custom = (raw.custom ?? []).map((card) => normalizeCard(card));
  const overrides = Object.create(null);
  for (const [id, card] of Object.entries(raw.overrides ?? {})) {
    const normalized = normalizeCard(card);
    if (normalized.id !== id) throw new Error('Identifiant de correction incohérent.');
    overrides[id] = normalized;
  }
  return {
    schemaVersion: 1,
    source: String(raw.source || 'Import JSON'),
    updated: typeof raw.updated === 'string' ? raw.updated : new Date().toISOString(),
    cards: [...byId.values()],
    custom,
    overrides,
    hidden: Array.isArray(raw.hidden) ? [...new Set(raw.hidden.map(String))] : [],
    sets: Array.isArray(raw.sets)
      ? raw.sets
      : (raw.card_sets ?? []).map((set) => ({ id: set.id, name: set.name })),
  };
}

export function effectiveCards(document) {
  if (!document) return [];
  const cards = new Map(document.cards.map((card) => [card.id, card]));
  for (const card of document.custom) cards.set(card.id, card);
  for (const [id, card] of Object.entries(document.overrides))
    if (cards.has(id)) cards.set(id, card);
  const hidden = new Set(document.hidden);
  return [...cards.values()].filter((card) => !hidden.has(card.id));
}
export function createCardIndex(cards) {
  return cards.map((card) => ({
    card,
    search: normalize(card.name + ' ' + card.text),
  }));
}
export function searchCatalog(index, filters = {}) {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean);
  const cost = filters.cost === '' || filters.cost == null ? null : Number(filters.cost);
  const matches = index
    .filter(
      ({ card, search }) =>
        words.every((word) => search.includes(word)) &&
        (!filters.ink || card.inks.includes(filters.ink)) &&
        (!filters.type || card.type === filters.type) &&
        (!filters.set || card.set.includes(filters.set)) &&
        (cost === null || card.cost === cost) &&
        (!filters.deckOnly ||
          !filters.deckInks?.length ||
          (card.inks.length > 0 && card.inks.every((ink) => filters.deckInks.includes(ink)))),
    )
    .map((row) => row.card);
  matches.sort(
    (a, b) =>
      (filters.sort === 'cost' ? a.cost - b.cost : 0) ||
      a.name.localeCompare(b.name, 'fr') ||
      a.id.localeCompare(b.id),
  );
  const size = filters.pageSize || CATALOG_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const page = Math.max(1, Math.min(pages, Number(filters.page) || 1));
  return {
    cards: matches.slice((page - 1) * size, page * size),
    total: matches.length,
    pages,
    page,
  };
}
export function withCard(document, rawCard) {
  const card = normalizeCard(rawCard);
  const next = structuredClone(document);
  if (next.cards.some((item) => item.id === card.id)) next.overrides[card.id] = card;
  else {
    const index = next.custom.findIndex((item) => item.id === card.id);
    if (index >= 0) next.custom[index] = card;
    else next.custom.push(card);
  }
  next.hidden = next.hidden.filter((id) => id !== card.id);
  return next;
}
export function withoutCard(document, id) {
  const next = structuredClone(document);
  next.custom = next.custom.filter((card) => card.id !== id);
  delete next.overrides[id];
  if (next.cards.some((card) => card.id === id) && !next.hidden.includes(id)) next.hidden.push(id);
  return next;
}
