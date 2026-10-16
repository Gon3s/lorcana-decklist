import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHash } from '../docs/js/core/routes.js';

test('deck routes preserve identity and editor tabs', () => {
  for (const mode of ['read', 'edit']) {
    const hash = routeHash({ mode, current: { id: 'un deck/1' }, tab: 'cards' });
    const parsed = parseRoute(hash);
    assert.equal(parsed.mode, mode);
    assert.equal(parsed.id, 'un deck/1');
    if (mode === 'edit') assert.equal(parsed.tab, 'cards');
  }
});
test('invalid routes and filters have safe defaults', () => {
  assert.deepEqual(parseRoute('#/inconnue'), { mode: 'library' });
  assert.deepEqual(parseRoute('#/fiche/%ZZ'), { mode: 'library' });
  assert.equal(parseRoute('#/modifier/id/unknown').tab, 'identity');
  assert.deepEqual(parseRoute('#/catalogue'), { mode: 'library' });
});
