import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeCard,
  normalizeCatalog,
  effectiveCards,
  createCardIndex,
  searchCatalog,
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
      card('a', { name: 'Éléphant - L’ami', text: 'Piochez une carte.' }),
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
  assert.equal(result.cards[0].name, 'Merlin - En chèvre');
  assert.deepEqual(result.cards[0].set, ['set2', 'set9']);
});
test('official printing identifiers preserve standard and promotional variants', () => {
  const result = normalizeCatalog({
    cards: {
      characters: [
        {
          deck_building_id: 'mushu',
          name: 'Mushu',
          subtitle: 'Dragon furtif',
          magic_ink_colors: ['EMERALD'],
          ink_cost: 4,
          card_sets: ['set13'],
          card_identifier: '97/207 FR 13',
          thumbnail_url: 'https://example.com/standard.jpg',
        },
        {
          deck_building_id: 'mushu',
          name: 'Mushu',
          subtitle: 'Stealthy Dragon',
          magic_ink_colors: ['EMERALD'],
          ink_cost: 4,
          card_sets: ['set13'],
          card_identifier: '12/D23 EN 13',
          thumbnail_url: 'https://example.com/promo.jpg',
        },
        {
          deck_building_id: 'legacy-promo',
          name: 'Mickey Mouse',
          subtitle: 'Brave petit tailleur',
          magic_ink_colors: ['STEEL'],
          ink_cost: 8,
          card_sets: ['set1'],
          card_identifier: '1TFC EN 1/P1',
          thumbnail_url: 'https://example.com/promo1.jpg',
        },
      ],
    },
  });
  assert.deepEqual(
    result.cards[0].printings.map((printing) => printing.code),
    ['13-97', '13-D23-12'],
  );
  assert.equal(result.cards[0].printings[1].image, 'https://example.com/promo.jpg');
  assert.equal(result.cards[1].printings[0].code, '1-P1-1');
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
test('legacy custom, corrected and hidden cards remain readable', () => {
  const imported = normalizeCatalog({
    ...document(),
    custom: [card('custom-1')],
    overrides: { a: card('a', { name: 'Correction' }) },
    hidden: ['b'],
  });
  assert.deepEqual(
    effectiveCards(imported).map((c) => c.name),
    ['Correction', 'Carte c', 'Carte custom-1'],
  );
});
test('bundled catalogue has names, images, rules text, valid types and inks', async () => {
  const doc = normalizeCatalog(
    JSON.parse(await readFile(new URL('../docs/assets/catalog.json', import.meta.url), 'utf8')),
  );
  assert.ok(doc.cards.length > 2500);
  assert.ok(doc.cards.some((c) => c.text.includes('pioche')));
  assert.ok(doc.sets.length > 10);
  assert.ok(doc.cards.every((c) => c.image.startsWith('https://')));
  const printings = doc.cards.flatMap((card) => card.printings).filter((printing) => printing.code);
  assert.ok(printings.every((printing) => printing.image.startsWith('https://')));
  assert.equal(new Set(printings.map((printing) => printing.code)).size, printings.length);
  for (const code of ['13-D23-12', '9-C2-1', '1-P1-1'])
    assert.ok(printings.some((printing) => printing.code === code));
});

test('IndexedDB catalogue cache remains readable', async () => {
  const { IDBFactory } = await import('fake-indexeddb');
  const { createCatalogCache } = await import('../docs/js/services/catalog-store.js');
  const database = new IDBFactory();
  const cache = createCatalogCache(database);
  assert.equal(await cache.read(), undefined);
  await cache.write(normalizeCatalog({ ...document(), custom: [card('custom-persisted')] }));
  const reloaded = new CatalogRepository({
    cache: createCatalogCache(database),
    fetcher: async () => {
      throw Error('must read cache');
    },
  });
  await reloaded.load();
  assert.ok(effectiveCards(reloaded.document).some((card) => card.id === 'custom-persisted'));
});

test('multi-ink selection includes mono and compatible bicolour cards', () => {
  const index = createCardIndex(effectiveCards(document()));
  assert.deepEqual(
    searchCatalog(index, { inks: ['amethyst', 'ruby'] }).cards.map((card) => card.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    searchCatalog(index, { inks: ['amethyst'] }).cards.map((card) => card.id),
    ['a'],
  );
  assert.equal(searchCatalog(index, { inks: [] }).total, 3);
});

test('default order is newest expansion then ascending collector number', () => {
  const index = createCardIndex([
    normalizeCard(card('nine', { set: ['set9'], number: 2 })),
    normalizeCard(card('ten', { set: ['set10'], number: 10 })),
    normalizeCard(card('two', { set: ['set10'], number: 2 })),
    normalizeCard(card('one', { set: ['set10'], number: 1 })),
    normalizeCard(
      card('reprint', {
        set: ['set9', 'set10'],
        number: 3,
        printings: [
          { set: 'set9', number: 100 },
          { set: 'set10', number: 3 },
        ],
      }),
    ),
  ]);
  assert.deepEqual(
    searchCatalog(index).cards.map((card) => card.id),
    ['one', 'two', 'reprint', 'ten', 'nine'],
  );
  assert.deepEqual(
    searchCatalog(index, { set: 'set9' }).cards.map((card) => card.id),
    ['nine', 'reprint'],
  );
});

test('normalization preserves official zero numbering and removes long dashes', () => {
  const card = normalizeCard({
    id: 'zero',
    name: 'Bruno\u2014Madrigal',
    inks: ['amethyst'],
    type: 'characters',
    set: ['set9'],
    card_identifier: '0/204 FR 9',
    text: 'Effet\u2013description',
  });
  assert.equal(card.number, 0);
  assert.equal(card.name, 'Bruno-Madrigal');
  assert.equal(card.text, 'Effet-description');
});

test('legacy cached printings are enriched without losing corrections or custom cards', async () => {
  const old = {
    cards: [card('reprint', { set: ['set1', 'set2'], number: 8 })],
    custom: [card('custom')],
    overrides: {
      reprint: card('reprint', { name: 'Ma correction', set: ['set1', 'set2'], number: 8 }),
    },
    hidden: ['custom'],
  };
  const reference = normalizeCatalog({
    cards: [
      card('reprint', {
        set: ['set1', 'set2'],
        number: 8,
        printings: [
          { set: 'set1', number: 3 },
          { set: 'set2', number: 8 },
        ],
      }),
    ],
  });
  let saved;
  const repo = new CatalogRepository({
    cache: {
      read: async () => old,
      write: async (value) => {
        saved = value;
      },
    },
    fetcher: async () => ({ ok: true, json: async () => reference }),
  });
  await repo.load();
  const selected = searchCatalog(createCardIndex(effectiveCards(repo.document)), { set: 'set1' });
  assert.equal(selected.cards[0].printings.find((printing) => printing.set === 'set1').number, 3);
  assert.equal(selected.cards[0].name, 'Ma correction');
  assert.equal(saved.custom.length, 1);
  assert.deepEqual(saved.hidden, ['custom']);
});

test('an offline legacy migration keeps the cached collection available', async () => {
  const old = { cards: [card('legacy')] };
  const repo = new CatalogRepository({
    cache: { read: async () => old, write: async () => assert.fail('must not write') },
    fetcher: async () => {
      throw Error('offline');
    },
  });
  await repo.load();
  assert.equal(repo.document.cards[0].id, 'legacy');
});

test('verified collector numbering in a cache never triggers a migration fetch', async () => {
  const doc = document();
  const repo = new CatalogRepository({
    cache: { read: async () => doc, write: async () => assert.fail('must not write') },
    fetcher: async () => assert.fail('must not fetch'),
  });
  await repo.load();
  assert.equal(repo.document.cards.length, 3);
});
