import { cleanText, safeURL } from './utils.js';

const DECKLIST_LINE = /^(\d+)\s+(.+?)\s+\(([^()]+)\)$/;
const PRINTING_CODE = /^\d+(?:-[A-Z0-9]+)*-[A-Z0-9]+$/;

export function normalizePrintingCode(value) {
  return cleanText(value).trim().toUpperCase();
}

export function isPrintingCode(value) {
  return PRINTING_CODE.test(normalizePrintingCode(value));
}

export function parseDecklist(text) {
  const entries = [];
  const errors = [];
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);
  lines.forEach((raw, index) => {
    const input = cleanText(raw).trim();
    if (!input) return;
    const match = input.match(DECKLIST_LINE);
    if (!match) {
      errors.push({ line: index + 1, input, message: 'Format de ligne non reconnu.' });
      return;
    }
    const qty = Number(match[1]);
    const printingCode = normalizePrintingCode(match[3]);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      errors.push({ line: index + 1, input, message: 'Quantité invalide.' });
      return;
    }
    if (!isPrintingCode(printingCode)) {
      errors.push({ line: index + 1, input, message: "Code d'impression invalide." });
      return;
    }
    entries.push({
      line: index + 1,
      qty,
      importedName: cleanText(match[2]).trim(),
      printingCode,
    });
  });
  return {
    entries,
    errors,
    total: entries.reduce((sum, entry) => sum + entry.qty, 0),
  };
}

export function createPrintingIndex(cards) {
  const index = new Map();
  for (const card of cards || []) {
    for (const printing of card.printings || []) {
      const code = normalizePrintingCode(printing.code);
      if (!code) continue;
      const candidates = index.get(code) || [];
      if (!candidates.some((candidate) => candidate.card.id === card.id))
        candidates.push({ card, printing });
      index.set(code, candidates);
    }
  }
  return index;
}

export function resolveDecklist(text, cards) {
  const parsed = parseDecklist(text);
  const printingIndex = createPrintingIndex(cards);
  const rows = parsed.entries.map((entry) => {
    const candidates = printingIndex.get(entry.printingCode) || [];
    if (candidates.length !== 1) {
      return {
        ...entry,
        status: candidates.length ? 'ambiguous' : 'missing',
        candidates: candidates.map(({ card }) => ({ id: card.id, name: card.name })),
      };
    }
    const { card, printing } = candidates[0];
    return {
      ...entry,
      status: 'matched',
      card: {
        id: card.id,
        name: card.name,
        qty: entry.qty,
        image: safeURL(printing.image || card.image),
        printingCode: entry.printingCode,
        inks: [...card.inks],
      },
    };
  });
  return {
    ...parsed,
    rows,
    matched: rows.filter((row) => row.status === 'matched').length,
    unresolved: rows.filter((row) => row.status !== 'matched').length,
  };
}

export function deckCardsFromResolution(result) {
  return result.rows.filter((row) => row.status === 'matched').map((row) => row.card);
}

export function uniqueDeckCards(cards) {
  const unique = new Map();
  for (const card of cards || []) {
    const previous = unique.get(card.id);
    if (previous) previous.qty += card.qty;
    else unique.set(card.id, structuredClone(card));
  }
  return [...unique.values()];
}

export function deckInks(cards) {
  return [...new Set((cards || []).flatMap((card) => card.inks || []))];
}
