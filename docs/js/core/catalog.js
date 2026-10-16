import { CARD_TYPES, INKS, CATALOG_PAGE_SIZE } from './constants.js';
import { normalize, safeURL, cleanText } from './utils.js';

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

function regularPrintingCode(set, number) {
  const setNumber = String(set).match(/^set(\d+)$/)?.[1];
  return setNumber && number !== null ? setNumber + '-' + number : '';
}

function officialPrinting(value, sets, number) {
  const identifier = String(value.card_identifier ?? '').trim();
  const match = identifier.match(/^(\d+[A-Z]?)\/([A-Z0-9]+)\s+[A-Z]{2}\s+(\d+)$/i);
  const legacyPromo = identifier.match(/^(\d+)TFC\s+[A-Z]{2}\s+(\d+)\/([A-Z0-9]+)$/i);
  if (!match && !legacyPromo) return null;
  const setNumber = match?.[3] || legacyPromo[1];
  const collectorNumber = (match?.[1] || legacyPromo[2]).toUpperCase();
  const denominator = (match?.[2] || legacyPromo[3]).toUpperCase();
  const set = 'set' + setNumber;
  const promo = /^\d+$/.test(denominator) ? '' : denominator;
  return {
    set: sets.includes(set) ? set : sets[0] || set,
    number,
    code: setNumber + (promo ? '-' + promo : '') + '-' + collectorNumber,
    image: safeURL(value.image ?? value.thumbnail_url),
  };
}

function normalizePrinting(value, fallbackImage = '') {
  const set = String(value.set);
  const number = value.number == null ? null : Number(value.number);
  const code = cleanText(value.code || regularPrintingCode(set, number))
    .trim()
    .toUpperCase();
  return {
    set,
    number,
    code,
    image: safeURL(value.image || fallbackImage),
  };
}

export function normalizeCard(value, fallbackType = '') {
  if (!value || typeof value !== 'object') throw new Error('Carte invalide.');
  const id = String(value.id ?? value.deck_building_id ?? '').trim();
  let name = cleanText(value.name).trim();
  if (value.subtitle) name += ' - ' + cleanText(value.subtitle);
  if (!id || !name) throw new Error('Chaque carte doit avoir un identifiant et un nom.');
  const sets = value.set ?? value.card_sets ?? [];
  if (!Array.isArray(sets)) throw new Error('Extensions invalides.');
  const questCard = sets.some((set) => String(set).startsWith('quest'));
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
  const parsedNumber =
    String(value.card_identifier ?? '').match(/^(\d+)\//)?.[1] ??
    String(value.image ?? value.thumbnail_url ?? '').match(/\/(\d+)[_.][^/]*$/)?.[1];
  const rawNumber = value.number ?? parsedNumber;
  const number =
    rawNumber === null || rawNumber === undefined || rawNumber === '' ? null : Number(rawNumber);
  if (number !== null && (!Number.isInteger(number) || number < 0))
    throw new Error('Numéro de carte invalide.');
  const parsedOfficialPrinting = officialPrinting(value, sets, number);
  const printings = Array.isArray(value.printings)
    ? value.printings.map((printing) =>
        normalizePrinting(printing, value.image ?? value.thumbnail_url),
      )
    : parsedOfficialPrinting
      ? [parsedOfficialPrinting]
      : sets.map((set) =>
          normalizePrinting({ set: String(set), number }, value.image ?? value.thumbnail_url),
        );
  if (
    printings.some(
      (printing) =>
        !sets.includes(printing.set) ||
        (printing.number !== null && (!Number.isInteger(printing.number) || printing.number < 0)) ||
        (printing.code && !/^\d+(?:-[A-Z0-9]+)*-[A-Z0-9]+$/.test(printing.code)),
    )
  )
    throw new Error('Numérotation de réimpression invalide.');
  return {
    id,
    name,
    inks,
    cost,
    type,
    number,
    printings,
    image: safeURL(value.image ?? value.thumbnail_url),
    set: [...new Set(sets.map(String))],
    rarity: String(value.rarity ?? ''),
    text: cleanText(value.text ?? value.rules_text).replaceAll('%', '\n'),
    inkable: typeof value.inkable === 'boolean' ? value.inkable : (value.ink_convertible ?? null),
  };
}

/** Accept the bundled catalogue and legacy locally saved catalogue documents. */
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
    if (previous) {
      previous.set = [...new Set([...previous.set, ...card.set])];
      previous.printings = [
        ...new Map(
          [...previous.printings, ...card.printings].map((printing) => [
            printing.code || printing.set + ':' + printing.number,
            printing,
          ]),
        ).values(),
      ];
    } else byId.set(card.id, card);
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
      ? raw.sets.map((set) => ({ ...set, name: cleanText(set.name) }))
      : (raw.card_sets ?? []).map((set) => ({ id: set.id, name: cleanText(set.name) })),
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
  const selectedInks =
    filters.deckOnly && filters.deckInks?.length
      ? filters.deckInks
      : (filters.inks ?? (filters.ink ? [filters.ink] : []));
  const cost = filters.cost === '' || filters.cost == null ? null : Number(filters.cost);
  const matches = index
    .filter(
      ({ card, search }) =>
        words.every((word) => search.includes(word)) &&
        (!selectedInks.length ||
          (card.inks.length > 0 && card.inks.every((ink) => selectedInks.includes(ink)))) &&
        (!filters.type || card.type === filters.type) &&
        (!filters.set || card.set.includes(filters.set)) &&
        (cost === null || card.cost === cost) &&
        (!filters.deckOnly ||
          !filters.deckInks?.length ||
          (card.inks.length > 0 && card.inks.every((ink) => filters.deckInks.includes(ink)))),
    )
    .map((row) => row.card);
  matches.sort((a, b) => {
    if (!filters.sort || filters.sort === 'set') {
      const left = cardPrinting(a, filters.set);
      const right = cardPrinting(b, filters.set);
      return (
        compareSets(right.set, left.set) ||
        (left.number ?? Infinity) - (right.number ?? Infinity) ||
        a.name.localeCompare(b.name, 'fr') ||
        a.id.localeCompare(b.id)
      );
    }
    return (
      (filters.sort === 'cost' ? a.cost - b.cost : 0) ||
      a.name.localeCompare(b.name, 'fr') ||
      a.id.localeCompare(b.id)
    );
  });
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
/** Main expansions first, newest first; then quest/promo families in natural order. */
function compareSets(left, right) {
  const priority = (set) =>
    /^set\d+$/.test(set) ? 3 : set.startsWith('quest') ? 2 : set.startsWith('promo') ? 1 : 0;
  return priority(left) - priority(right) || left.localeCompare(right, 'fr', { numeric: true });
}
export function cardPrinting(card, selectedSet = '') {
  const printings = (
    card.printings?.length
      ? card.printings
      : card.set.map((set) => ({ set, number: card.number ?? null }))
  ).filter((printing) => !selectedSet || printing.set === selectedSet);
  return (
    [...printings].sort(
      (a, b) => compareSets(b.set, a.set) || (a.number ?? Infinity) - (b.number ?? Infinity),
    )[0] || { set: selectedSet || '', number: null }
  );
}

/** Fill only incomplete official printing metadata; never replace personal card content. */
export function upgradeLegacyPrintings(raw, reference) {
  const document = normalizeCatalog(raw);
  const known = new Map(reference.cards.map((card) => [card.id, card]));
  function upgrade(original, card) {
    if (
      Array.isArray(original?.printings) &&
      original.printings.every((printing) => printing.number == null || printing.code)
    )
      return card;
    const official = known.get(card.id);
    if (!official) return card;
    const printings = official.printings.filter((printing) => card.set.includes(printing.set));
    if (!printings.length) return card;
    return { ...card, printings: structuredClone(printings) };
  }
  const originals = new Map(
    (Array.isArray(raw.cards) ? raw.cards : []).map((card) => [String(card.id), card]),
  );
  document.cards = document.cards.map((card) => upgrade(originals.get(card.id), card));
  for (const [id, card] of Object.entries(document.overrides)) {
    document.overrides[id] = upgrade(raw.overrides?.[id], card);
  }
  return document;
}
export function needsPrintingUpgrade(raw) {
  return (
    (Array.isArray(raw.cards) &&
      raw.cards.some(
        (card) =>
          !Array.isArray(card.printings) ||
          card.printings.some((printing) => printing.number != null && !printing.code),
      )) ||
    Object.values(raw.overrides ?? {}).some(
      (card) =>
        !Array.isArray(card.printings) ||
        card.printings.some((printing) => printing.number != null && !printing.code),
    )
  );
}
