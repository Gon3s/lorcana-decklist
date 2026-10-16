import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { DUELS_DECKLIST } from './fixtures.js';

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

test('DOM integration: catalogue search, key/core selection and v2 persistence', async () => {
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
  const storedDeckCount = JSON.parse(localStorage.getItem('grimoire-v2') || '[]').length;
  assert.equal(storedDeckCount, 0);
  const deckCount = Number.parseInt($('#count').textContent, 10);
  click('[data-action="new"]');
  assert.equal($('.preview-panel'), null);
  assert.ok($('#create-name'));
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v2') || '[]').length, storedDeckCount);
  input('#create-name', 'Fiche abandonnée');
  click('[data-action="create-cancel"]');
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v2') || '[]').length, storedDeckCount);
  click('[data-action="new"]');
  input('#create-name', 'Test de non-régression');
  input('#create-decklist', DUELS_DECKLIST);
  assert.equal($('[data-action="create-next"]').disabled, false);
  click('[data-action="create-next"]');
  assert.ok($('.creation-review-stats').textContent.includes('60'));
  assert.equal($$('.creation-review-row.problem').length, 0);
  assert.ok($('.creation-detected-inks').textContent.includes('Acier + Émeraude'));
  click('[data-action="create-next"]');
  assert.equal($$('.creation-strategy-card').length, 18);
  const importedId = $('[data-create-section="keys"]').dataset.cardId;
  click(`[data-create-section="keys"][data-card-id="${importedId}"]`);
  click(`[data-create-section="core"][data-card-id="${importedId}"]`);
  assert.equal($$('[data-create-section][aria-pressed="true"]').length, 2);
  click('[data-action="create-finish"]');
  assert.ok($('#selected-card-sections'));
  assert.ok($('.decklist-overview').textContent.includes('60 cartes'));
  assert.equal(JSON.parse(localStorage.getItem('grimoire-v2')).length, deckCount + 1);
  assert.equal($('#image-file'), null);
  assert.equal($('.catalog-browser'), null);
  click('[data-pick-section="keys"]');
  assert.ok($('.card-picker-dialog'));
  assert.equal($('[data-picker-filter="deckOnly"]').checked, true);
  click('[data-picker-toggle-filters]');
  assert.equal($$('[data-picker-ink].selected').length, 2);
  $('[data-picker-filter="deckOnly"]').checked = false;
  $('[data-picker-filter="deckOnly"]').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal($$('[data-picker-ink].selected').length, 0);
  assert.equal($('[data-picker-filter="deckOnly"]').checked, false);
  $('[data-picker-filter="deckOnly"]').checked = true;
  $('[data-picker-filter="deckOnly"]').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal($$('[data-picker-ink].selected').length, 2);
  click('[data-picker-ink="amber"]');
  assert.equal($('[data-picker-filter="deckOnly"]').checked, false);
  assert.equal($$('[data-picker-ink].selected').length, 3);
  assert.equal(window.document.activeElement.dataset.pickerInk, 'amber');
  $('[data-picker-filter="deckOnly"]').checked = false;
  $('[data-picker-filter="deckOnly"]').dispatchEvent(new window.Event('change', { bubbles: true }));
  input('#card-picker-search', 'merlin');
  const cardButtons = $$('[data-picker-select]');
  assert.ok(cardButtons.length > 1);
  const id = cardButtons[0].dataset.pickerSelect;
  const secondId = cardButtons[1].dataset.pickerSelect;
  click('[data-picker-select="' + id + '"]');
  assert.ok($('.card-picker-selection'));
  click('[data-picker-clear-selection]');
  assert.equal($$('[data-picker-select][aria-pressed="true"]').length, 0);
  click('[data-picker-select="' + id + '"]');
  click('[data-picker-select="' + secondId + '"]');
  assert.equal($('#card-picker-search').value, 'merlin');
  assert.equal($$('[data-picker-select][aria-pressed="true"]').length, 2);
  assert.ok(
    $('.card-picker-selection').textContent.replace(/\s+/g, ' ').includes('2 cartes sélectionnées'),
  );
  assert.equal($$('#section-keys .selected-card').length, 1);
  assert.equal(
    JSON.parse(localStorage.getItem('grimoire-v2')).find(
      (deck) => deck.name === 'Test de non-régression',
    ).keys.length,
    1,
  );
  click('[data-picker-add]');
  assert.equal($('.card-picker-dialog'), null);
  assert.equal($$('#section-keys .selected-card').length, 3);
  click('[data-pick-section="core"]');
  $('[data-picker-filter="deckOnly"]').checked = false;
  $('[data-picker-filter="deckOnly"]').dispatchEvent(new window.Event('change', { bubbles: true }));
  input('#card-picker-search', 'merlin');
  click('[data-picker-select="' + id + '"]');
  assert.equal($$('#section-core .selected-card').length, 1);
  click('[data-picker-add]');
  assert.equal($$('#section-core .selected-card').length, 2);
  const stored = JSON.parse(localStorage.getItem('grimoire-v2')).find(
    (deck) => deck.name === 'Test de non-régression',
  );
  assert.deepEqual(
    stored.keys.map((card) => card.id),
    [importedId, id, secondId],
  );
  assert.deepEqual(
    stored.core.map((card) => card.id),
    [importedId, id],
  );
  assert.equal(
    stored.decklist.reduce((sum, card) => sum + card.qty, 0),
    60,
  );
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
  assert.equal($$('#section-core .selected-card').length, 2);
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
  assert.equal($('[data-action="create-next"]').disabled, true);
  click('[data-action="create-cancel"]');
  assert.ok($('#grid'));
  await window.happyDOM.abort();
});
