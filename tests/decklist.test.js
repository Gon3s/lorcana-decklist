import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeCatalog, effectiveCards } from '../docs/js/core/catalog.js';
import {
  parseDecklist,
  resolveDecklist,
  deckCardsFromResolution,
  deckInks,
  uniqueDeckCards,
} from '../docs/js/core/decklist.js';
import { DUELS_DECKLIST } from './fixtures.js';

const catalog = normalizeCatalog(
  JSON.parse(await readFile(new URL('../docs/assets/catalog.json', import.meta.url), 'utf8')),
);

test('Duels.ink decklists parse quantities, names and standard or promo codes', () => {
  const result = parseDecklist(DUELS_DECKLIST);
  assert.equal(result.total, 60);
  assert.equal(result.entries.length, 18);
  assert.deepEqual(result.errors, []);
  assert.equal(result.entries[3].printingCode, '13-D23-12');
  assert.equal(result.entries[13].printingCode, '9-C2-1');
  assert.equal(parseDecklist('1 Alternate (3-4a)').entries[0].printingCode, '3-4A');
});

test('the sample decklist resolves every printing without translating names', () => {
  const result = resolveDecklist(DUELS_DECKLIST, effectiveCards(catalog));
  assert.equal(result.matched, 18);
  assert.equal(result.unresolved, 0);
  const mushu = result.rows.find((row) => row.printingCode === '13-D23-12').card;
  const pegasus = result.rows.find((row) => row.printingCode === '9-C2-1').card;
  assert.equal(mushu.name, 'Mushu - Dragon furtif');
  assert.match(mushu.image, /\/en\/d23\/12_/);
  assert.equal(pegasus.name, 'Pégase - Présent pour Hercule');
  assert.match(pegasus.image, /\/en\/challenge2\/1_/);
  assert.deepEqual(deckInks(deckCardsFromResolution(result)), ['steel', 'emerald']);
});

test('invalid and unknown lines remain explicit instead of using fuzzy name matching', () => {
  const result = resolveDecklist(
    '4 Unknown card (99-999)\nnot a decklist line',
    effectiveCards(catalog),
  );
  assert.equal(result.unresolved, 1);
  assert.equal(result.rows[0].status, 'missing');
  assert.equal(result.errors[0].line, 2);
});

test('strategic choices aggregate multiple printings of one card identity', () => {
  const cards = [
    { id: 'same', name: 'Carte', qty: 2, printingCode: '1-1', inks: ['amber'] },
    { id: 'same', name: 'Carte', qty: 2, printingCode: '1-P1-1', inks: ['amber'] },
  ];
  assert.equal(uniqueDeckCards(cards).length, 1);
  assert.equal(uniqueDeckCards(cards)[0].qty, 4);
});
