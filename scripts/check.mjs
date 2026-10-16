import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeCatalog } from '../docs/js/core/catalog.js';

async function files(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await files(path)));
    else results.push(path);
  }
  return results;
}
const sources = (await files('docs')).filter((path) => path.endsWith('.js'));
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(file + '\n' + result.stderr);
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))
    await access(resolve(dirname(file), match[1]));
}
for (const file of (await files('docs')).filter((path) => path.endsWith('.css'))) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/url\(['"]?([^)'"]+)['"]?\)/g)) {
    if (!/^(?:https?:|data:|#|%23)/.test(match[1])) await access(resolve(dirname(file), match[1]));
  }
  for (const match of source.matchAll(/@import\s+url\(['"](\.[^'"]+)['"]\)/g))
    await access(resolve(dirname(file), match[1]));
}
const catalog = normalizeCatalog(JSON.parse(await readFile('docs/assets/catalog.json', 'utf8')));
for (const ink of ['amber', 'amethyst', 'emerald', 'ruby', 'sapphire', 'steel'])
  await access('docs/assets/inks/' + ink + '.png');
const html = await readFile('docs/index.html', 'utf8');
for (const id of ['app', 'nav-library', 'import-file', 'toast'])
  if (!html.includes('id="' + id + '"')) throw Error('Missing mount ' + id);
console.log(
  `${sources.length} modules checked; all local imports, stylesheets, ink assets and ${catalog.cards.length} catalogue records are valid.`,
);
