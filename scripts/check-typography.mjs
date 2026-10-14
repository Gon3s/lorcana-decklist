import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const skipped = new Set(['node_modules', '_site', '.git']);
const extensions = /\.(?:js|mjs|cjs|json|md|css|html|yml|yaml|txt)$/;
const failures = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (!extensions.test(path)) continue;
    const text = await readFile(path, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      if (/[\u2013\u2014]/.test(line)) failures.push(`${path}:${index + 1}: tiret long interdit`);
    }
    if (path.endsWith('.css') || path.endsWith('.js')) {
      for (const match of text.matchAll(
        /(?:font-size\s*:\s*|(?<![-\w])font\s*:[^;{}]*?)(\d+(?:\.\d+)?)px/g,
      )) {
        if (Number(match[1]) < 14)
          failures.push(`${path}: taille de texte ${match[1]}px inférieure à 14px`);
      }
    }
  }
}
await scan('.');
if (failures.length) throw new Error(failures.join('\n'));
console.log('Typographie vérifiée : aucun tiret long et aucune taille de texte inférieure à 14px.');
