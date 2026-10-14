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
  assert.equal($$('.catalog-card').length, 24);
  input('#card-search', 'merlin');
  assert.ok($$('.catalog-card').length > 0);
  assert.ok(
    $$('.catalog-card h3').every((element) => element.textContent.toLowerCase().includes('merlin')),
  );
  click('[data-card-preview]');
  assert.ok($('.card-detail'));
  click('[data-close-dialog]');
  click('[data-action="home"]');
  click('[data-action="new"]');
  input('#f-name', 'Test de non-régression');
  click('[data-ink="ruby"]');
  click('[data-ink="amethyst"]');
  click('[data-tab="cards"]');
  assert.equal($('#card-deck-only').checked, true);
  assert.equal($$('[data-catalog-ink].selected').length, 2);
  click('[data-catalog-ink="emerald"]');
  assert.equal($('#card-deck-only').checked, false);
  assert.equal($$('[data-catalog-ink].selected').length, 3);
  input('#card-search', 'merlin');
  const id = $('[data-select-card]').dataset.selectCard;
  click('[data-select-card]');
  assert.equal($('#card-search').value, 'merlin');
  assert.equal($$('[data-select-card]:disabled').length, 1);
  assert.equal($$('#section-keys .selected-card').length, 1);
  input('#card-target', 'core', 'change');
  click('[data-select-card="' + id + '"]');
  assert.equal($$('#section-core .selected-card').length, 1);
  const stored = JSON.parse(localStorage.getItem('grimoire-v1')).find(
    (deck) => deck.name === 'Test de non-régression',
  );
  assert.equal(stored.keys[0].id, id);
  assert.equal(stored.core[0].id, id);
  click('[data-tab="strategy"]');
  input('#f-mulligan', 'Chercher une courbe jouable');
  click('[data-action="read-current"]');
  assert.ok($('.sheet').textContent.includes('Chercher une courbe jouable'));
  click('[data-action="home"]');
  assert.ok($('#grid').textContent.includes('Test de non-régression'));
  await window.happyDOM.abort();
});
