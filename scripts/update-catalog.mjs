/** Run manually to update the bundled catalogue, review the diff, then commit it. */
import { writeFile, rename, mkdir } from 'node:fs/promises';
import { CATALOG_URL } from '../docs/js/core/constants.js';
import { normalizeCatalog } from '../docs/js/core/catalog.js';
const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error('Official catalogue returned HTTP ' + response.status);
const catalog = normalizeCatalog(await response.json());
catalog.source = CATALOG_URL;
catalog.updated = new Date().toISOString();
await mkdir('docs/assets', { recursive: true });
const path = 'docs/assets/catalog.json';
await writeFile(path + '.tmp', JSON.stringify(catalog));
await rename(path + '.tmp', path);
console.log(
  'Updated bundled catalogue:',
  catalog.cards.length,
  'cards. Run npm run check && npm test before committing.',
);
