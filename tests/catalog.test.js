import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeCard,
  normalizeCatalog,
  effectiveCards,
  createCardIndex,
  searchCatalog,
  withCard,
  withoutCard,
} from '../docs/js/core/catalog.js';
import { CatalogRepository } from '../docs/js/services/catalog-store.js';

const card = (id, extra = {}) => ({
  id,
  name: 'Carte ' + id,
  inks: ['amethyst'],
  cost: 2,
  type: 'characters',
  set: ['set1'],
  image: 'https://example.com/' + id + '.png',
  ...extra,
});
const document = () =>
  normalizeCatalog({
    cards: [
      card('a', { name: 'Éléphant — L’ami', text: 'Piochez une carte.' }),
      card('b', { inks: ['ruby', 'amethyst'], cost: 4, type: 'actions', set: ['set2'] }),
      card('c', { inks: ['steel'], cost: 4 }),
    ],
  });
test('official normalization merges printings and preserves all extensions', () => {
  const raw = {
    cards: {
      characters: [
        {
          deck_building_id: 'm',
          name: 'Merlin',
          subtitle: 'En chèvre',
          magic_ink_colors: ['AMETHYST'],
          ink_cost: 4,
          card_sets: ['set2'],
        },
        {
          deck_building_id: 'm',
          name: 'Merlin',
          subtitle: 'En chèvre',
          magic_ink_colors: ['AMETHYST'],
          ink_cost: 4,
          card_sets: ['set9'],
        },
        { name: 'Alternate without deck identity' },
      ],
    },
  };
  const result = normalizeCatalog(raw);
  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].name, 'Merlin — En chèvre');
  assert.deepEqual(result.cards[0].set, ['set2', 'set9']);
});
test('combined filters search accents, apostrophes and rules text', () => {
  const index = createCardIndex(effectiveCards(document()));
  assert.equal(
    searchCatalog(index, {
      query: "elephant l'ami piochez",
      ink: 'amethyst',
      type: 'characters',
      cost: 2,
      set: 'set1',
    }).total,
    1,
  );
  assert.equal(searchCatalog(index, { query: 'piochez', type: 'actions' }).total, 0);
});
test('deck colours require both inks on a bicolour card and exclude quest cards', () => {
  const index = createCardIndex([
    ...effectiveCards(document()),
    normalizeCard(card('quest', { inks: [], set: ['quest1'] })),
  ]);
  assert.deepEqual(
    searchCatalog(index, { deckOnly: true, deckInks: ['amethyst'] }).cards.map((c) => c.id),
    ['a'],
  );
  assert.equal(searchCatalog(index, { deckOnly: true, deckInks: ['amethyst', 'ruby'] }).total, 2);
});
test('paging clamps invalid pages and sorting is deterministic', () => {
  const index = createCardIndex(
    Array.from({ length: 53 }, (_, i) => card(String(i).padStart(2, '0'))),
  );
  const last = searchCatalog(index, { page: 999 });
  assert.equal(last.page, 3);
  assert.equal(last.cards.length, 5);
  assert.equal(searchCatalog(index, { query: 'no match', page: 99 }).page, 1);
});
test('edits, manual cards and hidden cards survive export and import', () => {
  let doc = document();
  doc = withCard(doc, card('a', { name: 'Correction' }));
  doc = withCard(doc, card('custom-1'));
  doc = withoutCard(doc, 'b');
  const imported = normalizeCatalog(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(
    effectiveCards(imported).map((c) => c.name),
    ['Correction', 'Carte c', 'Carte custom-1'],
  );
});
test('invalid catalogue import is rejected atomically', async () => {
  let saved = document();
  const repo = new CatalogRepository({
    cache: {
      read: async () => saved,
      write: async (value) => {
        saved = value;
      },
    },
    fetcher: async () => {
      throw Error('no');
    },
  });
  await repo.load();
  await assert.rejects(() => repo.import({ cards: [card('bad', { inks: ['unknown'] })] }));
  assert.equal(repo.document.cards.length, 3);
  assert.equal(saved.cards.length, 3);
});
test('a failed cache write never changes the active catalogue', async () => {
  const repo = new CatalogRepository({
    cache: {
      read: async () => document(),
      write: async () => {
        throw Error('quota');
      },
    },
    fetcher: async () => {
      throw Error('no');
    },
  });
  await repo.load();
  await assert.rejects(() => repo.upsert(card('new')), /quota/);
  assert.equal(effectiveCards(repo.document).length, 3);
});
test('refresh retains custom overrides and hidden cards; network failures retain old data', async () => {
  let saved = withCard(withoutCard(document(), 'b'), card('custom-1'));
  saved = withCard(saved, card('a', { name: 'Ma correction' }));
  let fails = false;
  const repo = new CatalogRepository({
    cache: {
      read: async () => saved,
      write: async (value) => {
        saved = value;
      },
    },
    fetcher: async () => {
      if (fails) throw Error('network');
      return { ok: true, json: async () => ({ cards: [card('a'), card('b'), card('d')] }) };
    },
  });
  await repo.load();
  await repo.refresh();
  assert.deepEqual(
    effectiveCards(repo.document).map((c) => c.name),
    ['Ma correction', 'Carte d', 'Carte custom-1'],
  );
  fails = true;
  await assert.rejects(() => repo.refresh());
  assert.equal(effectiveCards(repo.document).length, 3);
});
test('bundled catalogue has names, images, rules text, valid types and inks', async () => {
  const doc = normalizeCatalog(
    JSON.parse(await readFile(new URL('../docs/assets/catalog.json', import.meta.url), 'utf8')),
  );
  assert.ok(doc.cards.length > 2500);
  assert.ok(doc.cards.some((c) => c.text.includes('pioche')));
  assert.ok(doc.sets.length > 10);
  assert.ok(doc.cards.every((c) => c.image.startsWith('https://')));
});

test('IndexedDB catalogue cache persists across repository instances', async () => {
  const { IDBFactory } = await import('fake-indexeddb');
  const { createCatalogCache } = await import('../docs/js/services/catalog-store.js');
  const database = new IDBFactory();
  const cache = createCatalogCache(database);
  assert.equal(await cache.read(), undefined);
  const repo = new CatalogRepository({
    cache,
    fetcher: async () => ({ ok: true, json: async () => document() }),
  });
  await repo.load();
  await repo.upsert(card('custom-persisted'));
  const reloaded = new CatalogRepository({
    cache: createCatalogCache(database),
    fetcher: async () => {
      throw Error('must read cache');
    },
  });
  await reloaded.load();
  assert.ok(effectiveCards(reloaded.document).some((card) => card.id === 'custom-persisted'));
});
