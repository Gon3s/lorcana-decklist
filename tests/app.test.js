import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

const snapshot = JSON.parse(
  await readFile(new URL('../docs/assets/catalog.json', import.meta.url), 'utf8'),
);
const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
const window = new Window({
  url: 'https://example.test/lorcana-decklist/',
  settings: {
    disableJavaScriptFileLoading: true,
    disableJavaScriptEvaluation: true,
    disableCSSFileLoading: true,
  },
});
window.document.write(html);
for (const key of ['window', 'document', 'localStorage', 'FormData', 'Blob'])
  Object.defineProperty(globalThis, key, {
    value: key === 'window' ? window : window[key],
    configurable: true,
  });
globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(snapshot) });
window.scrollTo = () => {};
const dialog = window.HTMLDialogElement.prototype;
if (!dialog.showModal)
  dialog.showModal = function () {
    this.open = true;
  };
if (!dialog.close)
  dialog.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
const nativeSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...args) => {
  const timer = nativeSetTimeout(fn, ms, ...args);
  timer.unref?.();
  return timer;
};
const $ = (selector) => window.document.querySelector(selector);
const $$ = (selector) => [...window.document.querySelectorAll(selector)];
const click = (selector) => {
  assert.ok($(selector), selector);
  $(selector).click();
};
function input(selector, value, event = 'input') {
  const element = $(selector);
  assert.ok(element, selector);
  element.value = value;
  element.dispatchEvent(new window.Event(event, { bubbles: true }));
}
await import('../docs/app.js');
await new Promise((resolve) => setImmediate(resolve));

test('DOM integration: catalogue search, key/core selection and legacy persistence', async () => {
  assert.ok($('.hero'));
  assert.ok($('#nav-catalog'));
  click('#nav-catalog');
  assert.ok($('.catalog-heading'));
  assert.equal($('.catalog-management'), null);
  assert.equal(window.location.hash, '#/catalogue');
  assert.equal($$('.catalog-card').length, 24);
  input('#card-search', 'merlin');
  assert.equal(new URLSearchParams(window.location.hash.split('?')[1]).get('query'), 'merlin');
  assert.ok($$('.catalog-card').length > 0);
  assert.ok(
    $$('.catalog-card h3').every((element) => element.textContent.toLowerCase().includes('merlin')),
  );
  click('[data-card-preview]');
  assert.ok($('.card-detail'));
  click('[data-close-dialog]');
  click('[data-action="home"]');
  const storedDeckCount = JSON.parse(localStorage.getItem('grimoire-v1') || '[]').length;
  const deckCount = Number.parseInt($('#count').textContent, 10);
  click('[data-action="new"]');
  assert.equal($('.preview-panel'), null);
  assert.ok($('#create-name'));
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v1') || '[]').length, storedDeckCount);
  input('#create-name', 'Fiche abandonnée');
  click('[data-action="create-cancel"]');
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v1') || '[]').length, storedDeckCount);
  click('[data-action="new"]');
  input('#create-name', 'Test de non-régression');
  click('[data-ink="ruby"]');
  click('[data-ink="amethyst"]');
  assert.equal($('#create-basics-next').disabled, false);
  click('[data-action="create-next"]');
  click('[data-create-method="catalog"]');
  click('[data-action="create-next"]');
  assert.ok($('.creation-summary').textContent.includes('Test de non-régression'));
  click('[data-action="create-finish"]');
  assert.ok($('#selected-card-sections'));
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v1')).length, deckCount + 1);
  assert.equal($('#card-deck-only').checked, true);
  assert.equal($$('[data-catalog-ink].selected').length, 2);
  $('#card-deck-only').checked = false;
  $('#card-deck-only').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal($$('[data-catalog-ink].selected').length, 0);
  assert.equal($('#card-deck-only').checked, false);
  $('#card-deck-only').checked = true;
  $('#card-deck-only').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal($$('[data-catalog-ink].selected').length, 2);
  click('[data-catalog-ink="emerald"]');
  assert.equal($('#card-deck-only').checked, false);
  assert.equal($$('[data-catalog-ink].selected').length, 3);
  assert.equal(window.document.activeElement.dataset.catalogInk, 'emerald');
  input('#card-search', 'merlin');
  const cardButtons = $$('[data-select-card]');
  assert.ok(cardButtons.length > 1);
  const id = cardButtons[0].dataset.selectCard;
  const secondId = cardButtons[1].dataset.selectCard;
  click('[data-select-card="' + id + '"]');
  assert.ok($('.catalog-selection'));
  click('[data-clear-card-selection]');
  assert.equal($('.catalog-selection'), null);
  click('[data-select-card="' + id + '"]');
  click('[data-select-card="' + secondId + '"]');
  assert.equal($('#card-search').value, 'merlin');
  assert.equal($$('[data-select-card][aria-pressed="true"]').length, 2);
  assert.ok(
    $('.catalog-selection').textContent.replace(/\s+/g, ' ').includes('2 cartes sélectionnées'),
  );
  assert.equal($$('#section-keys .selected-card').length, 0);
  assert.equal(
    JSON.parse(localStorage.getItem('grimoire-v1')).find(
      (deck) => deck.name === 'Test de non-régression',
    ).keys.length,
    0,
  );
  click('[data-add-card-selection]');
  assert.equal($$('[data-select-card]:disabled').length, 2);
  assert.equal($$('#section-keys .selected-card').length, 2);
  assert.equal($('[data-card-target="keys"] span').textContent.replace(/\s+/g, ' '), '2 cartes');
  click('[data-card-target="core"]');
  click('[data-select-card="' + id + '"]');
  assert.equal($$('#section-core .selected-card').length, 0);
  click('[data-add-card-selection]');
  assert.equal($$('#section-core .selected-card').length, 1);
  const stored = JSON.parse(localStorage.getItem('grimoire-v1')).find(
    (deck) => deck.name === 'Test de non-régression',
  );
  assert.deepEqual(
    stored.keys.map((card) => card.id),
    [id, secondId],
  );
  assert.equal(stored.core[0].id, id);
  click('[data-tab="strategy"]');
  assert.equal(window.location.hash, '#/modifier/' + stored.id + '/strategy');
  input('#f-mulligan', 'Chercher une courbe jouable');
  click('[data-action="read-current"]');
  assert.ok($('.sheet').textContent.includes('Chercher une courbe jouable'));
  click('[data-action="home"]');
  assert.ok($('#grid').textContent.includes('Test de non-régression'));
  click('#nav-catalog');
  assert.equal($$('[data-catalog-ink].selected').length, 0);
  assert.equal($('#card-search').value, '');
  assert.equal($$('.catalog-card').length, 24);
  window.history.pushState(null, '', '#/catalogue?query=merlin&inks=amethyst&page=2');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal($('#card-search').value, 'merlin');
  assert.equal($$('[data-catalog-ink].selected').length, 1);
  window.history.pushState(null, '', '#/modifier/' + stored.id + '/cards');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.ok($('#selected-card-sections'));
  assert.equal($$('#section-core .selected-card').length, 1);
  window.history.back();
  await new Promise((resolve) => nativeSetTimeout(resolve, 30));
  assert.ok($('.catalog-heading'));
  assert.equal($('#card-search').value, 'merlin');
  window.history.forward();
  await new Promise((resolve) => nativeSetTimeout(resolve, 30));
  assert.ok($('#selected-card-sections'));
  window.history.pushState(null, '', '#/fiche/missing');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.ok($('#grid'));
  assert.equal(window.location.hash, '#/fiches');
  assert.ok($('#toast').textContent.includes('pas enregistrée'));
  click('[data-action="new"]');
  input('#create-name', 'Brouillon sans decklist');
  click('[data-ink="amber"]');
  click('[data-action="create-next"]');
  click('[data-action="create-skip"]');
  assert.ok($('.creation-summary').textContent.includes('À ajouter plus tard'));
  click('[data-action="create-finish"]');
  assert.equal($('#f-name').value, 'Brouillon sans decklist');
  await window.happyDOM.abort();
});
