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
import { loadDecks, saveDecks } from '../docs/js/services/deck-store.js';
import { DECK_STORAGE_KEY } from '../docs/js/core/constants.js';

const card = { id: 'merlin', name: 'Merlin - En chèvre', image: 'https://example.com/card.png' };

function validDeck() {
  const deck = createDeck();
  deck.name = 'Import Duels.ink';
  deck.inks = ['emerald'];
  deck.decklist = [
    {
      id: 'mushu',
      name: 'Mushu - Dragon furtif',
      qty: 60,
      image: 'https://example.com/mushu.jpg',
      printingCode: '13-D23-12',
      inks: ['emerald'],
    },
  ];
  return deck;
}

test('schema v2 exports round-trip decklists, notes and order without reusing identity', () => {
  const deck = validDeck();
  addCatalogCard(deck, 'keys', card);
  deck.keys[0].note = 'Synergie';
  const restored = decodeDeckExport(encodeDeckExport(deck));
  assert.notEqual(restored.id, deck.id);
  for (const key of ['name', 'inks', 'decklist', 'keys', 'core', 'lines', 'mulligan'])
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
  const deck = validDeck();
  assert.equal(toggleSectionCard(deck, 'keys', deck.decklist[0]), true);
  assert.equal(deck.keys[0].qty, 60);
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
  const deck = validDeck();
  deck.decklist.push({
    ...deck.decklist[0],
    id: 'three-inks',
    qty: 1,
    inks: ['ruby', 'steel'],
  });
  assert.throws(() => validateDeck(deck), /deux encres/);
});
test('only schema v2 Duels.ink decks are accepted', () => {
  const deck = validDeck();
  assert.throws(() => validateDeck({ ...deck, decklist: [] }), /Decklist|decklist/);
  assert.throws(
    () => decodeDeckExport(JSON.stringify({ schemaVersion: 1, deck })),
    /Version de fiche/,
  );
  assert.equal(JSON.parse(encodeDeckExport(deck)).schemaVersion, 2);
});
test('reordering is bounded and preserves the rows', () => {
  const rows = ['a', 'b', 'c'];
  assert.equal(moveRow(rows, 0, -1), false);
  assert.equal(moveRow(rows, 0, 1), true);
  assert.deepEqual(rows, ['b', 'a', 'c']);
});
test('v2 localStorage loads valid decks and does not overwrite bad entries', () => {
  const source = JSON.stringify([validDeck(), { broken: true }]);
  const storage = {
    getItem: (key) => {
      assert.equal(key, DECK_STORAGE_KEY);
      return source;
    },
    setItem: () => assert.fail('read must not write'),
  };
  const loaded = loadDecks(storage);
  assert.equal(loaded.decks.length, 1);
  assert.equal(loaded.warnings.length, 1);
});
test('fresh storage starts with no example deck', () => {
  const loaded = loadDecks({ getItem: () => null });
  assert.deepEqual(loaded, { decks: [], warnings: [] });
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
  const value = validDeck();
  value.source = 'javascript:alert(1)';
  addCatalogCard(value, 'keys', card);
  value.keys[0].image = 'data:text/html;base64,YQ==';
  value.decklist[0].image = 'javascript:alert(1)';
  const deck = validateDeck(value);
  assert.equal(deck.source, '');
  assert.equal(deck.keys[0].image, '');
  assert.equal(deck.decklist[0].image, '');
});

test('imported names and notes use ASCII hyphens', () => {
  const value = validDeck();
  addCatalogCard(value, 'keys', card);
  value.name = 'Titre\u2014version';
  value.keys[0].note = 'Rôle\u2013conseil';
  const deck = validateDeck(value);
  assert.equal(deck.name, 'Titre-version');
  assert.equal(deck.keys[0].note, 'Rôle-conseil');
});
