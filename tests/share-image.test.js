import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
  shareImageFilename,
} from '../docs/js/services/share-image.js';

test('share image uses the social portrait format and a safe filename', () => {
  assert.equal(SHARE_IMAGE_WIDTH, 1080);
  assert.equal(SHARE_IMAGE_HEIGHT, 1350);
  assert.equal(
    shareImageFilename({ name: 'Émeraude / Acier - Tempo !' }),
    'emeraude-acier-tempo-grimoire.png',
  );
  assert.equal(shareImageFilename({ name: '' }), 'deck-lorcana-grimoire.png');
});
