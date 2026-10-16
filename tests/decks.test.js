import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck,
  validateDeck,
  decodeDeckExport,
  encodeDeckExport,
  addCatalogCard,
  addCatalogCards,
  toggleSectionCard,
  toggleInk,
  moveRow,
} from '../docs/js/core/decks.js';
import { createSampleDeck } from '../docs/js/core/sample.js';
import { loadDecks, saveDecks } from '../docs/js/services/deck-store.js';
import { DECK_STORAGE_KEY } from '../docs/js/core/constants.js';

const card = { id: 'merlin', name: 'Merlin - En chèvre', image: 'https://example.com/card.png' };
test('legacy exports round-trip images, notes and order without reusing identity', () => {
  const deck = createSampleDeck();
  deck.image = 'data:image/png;base64,aGVsbG8=';
  const restored = decodeDeckExport(encodeDeckExport(deck));
  assert.notEqual(restored.id, deck.id);
  for (const key of ['name', 'inks', 'image', 'keys', 'core', 'lines', 'mulligan'])
    assert.deepEqual(restored[key], validateDeck(deck)[key]);
});
test('a card can be key and core without duplicates in either section', () => {
  const deck = createDeck();
  assert.equal(addCatalogCard(deck, 'keys', card), true);
  deck.keys[0].qty = 4;
  deck.keys[0].note = 'Synergie';
  assert.equal(addCatalogCard(deck, 'keys', card), false);
  assert.equal(addCatalogCard(deck, 'core', card), true);
  assert.equal(deck.keys.length, 1);
  assert.equal(deck.core.length, 1);
  assert.equal(deck.keys[0].qty, 4);
  assert.equal(deck.keys[0].note, 'Synergie');
  assert.throws(() => addCatalogCard(deck, 'unknown', card));
});
test('catalog cards can be added as one duplicate-safe batch', () => {
  const deck = createDeck();
  addCatalogCard(deck, 'keys', card);
  const second = { ...card, id: 'mickey', name: 'Mickey Mouse' };
  assert.equal(addCatalogCards(deck, 'keys', [card, second]), 1);
  assert.deepEqual(
    deck.keys.map((row) => row.id),
    ['merlin', 'mickey'],
  );
  assert.throws(() => addCatalogCards(deck, 'unknown', [second]));
  assert.throws(() => addCatalogCards(deck, 'keys', null), /Liste de cartes/);
});
test('full decklists round-trip and feed strategic selections without duplicate state', () => {
  const deck = createDeck();
  deck.name = 'Import Duels.ink';
  deck.inks = ['emerald'];
  deck.decklist = [
    {
      id: 'mushu',
      name: 'Mushu - Dragon furtif',
      qty: 4,
      image: 'https://example.com/mushu.jpg',
      printingCode: '13-D23-12',
      inks: ['emerald'],
    },
  ];
  assert.equal(toggleSectionCard(deck, 'keys', deck.decklist[0]), true);
  assert.equal(deck.keys[0].qty, 4);
  assert.equal(toggleSectionCard(deck, 'core', deck.decklist[0]), true);
  assert.equal(toggleSectionCard(deck, 'keys', deck.decklist[0]), false);
  const restored = decodeDeckExport(encodeDeckExport(deck));
  assert.deepEqual(restored.decklist, deck.decklist);
  assert.equal(restored.core[0].id, 'mushu');
});
test('two distinct inks maximum in UI and imports', () => {
  const inks = [];
  toggleInk(inks, 'ruby');
  toggleInk(inks, 'amethyst');
  assert.throws(() => toggleInk(inks, 'steel'));
  assert.deepEqual(inks, ['ruby', 'amethyst']);
  toggleInk(inks, 'ruby');
  assert.deepEqual(inks, ['amethyst']);
  assert.throws(() => validateDeck({ ...createDeck(), inks: ['ruby', 'ruby'] }));
  assert.throws(() => validateDeck({ ...createDeck(), inks: ['ruby', 'steel', 'amber'] }));
});
test('reordering is bounded and preserves the rows', () => {
  const rows = ['a', 'b', 'c'];
  assert.equal(moveRow(rows, 0, -1), false);
  assert.equal(moveRow(rows, 0, 1), true);
  assert.deepEqual(rows, ['b', 'a', 'c']);
});
test('legacy localStorage remains readable; bad entries are not overwritten during load', () => {
  const source = JSON.stringify([createSampleDeck(), { broken: true }]);
  const storage = {
    getItem: (key) => {
      assert.equal(key, DECK_STORAGE_KEY);
      return source;
    },
    setItem: () => assert.fail('read must not write'),
  };
  const loaded = loadDecks(storage, createSampleDeck);
  assert.equal(loaded.decks.length, 1);
  assert.equal(loaded.warnings.length, 1);
});
test('storage failures reach the controller instead of reporting success', () => {
  assert.throws(
    () =>
      saveDecks(
        {
          setItem() {
            throw new Error('quota');
          },
        },
        [createDeck()],
      ),
    /quota/,
  );
});
test('untrusted images and links are removed on import', () => {
  const value = createSampleDeck();
  value.image = 'javascript:alert(1)';
  value.source = 'javascript:alert(1)';
  value.keys[0].image = 'data:text/html;base64,YQ==';
  const deck = validateDeck(value);
  assert.equal(deck.image, '');
  assert.equal(deck.source, '');
  assert.equal(deck.keys[0].image, '');
});

test('imported legacy names and notes use ASCII hyphens', () => {
  const value = createSampleDeck();
  value.name = 'Titre\u2014version';
  value.keys[0].note = 'Rôle\u2013conseil';
  const deck = validateDeck(value);
  assert.equal(deck.name, 'Titre-version');
  assert.equal(deck.keys[0].note, 'Rôle-conseil');
});
