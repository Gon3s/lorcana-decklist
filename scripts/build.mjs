import { build } from 'esbuild';
import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';

// Runtime stays entirely static. Only the build uses dependencies.
const output = '_site';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp('docs/assets', output + '/assets', { recursive: true });
const result = await build({
  entryPoints: { app: 'docs/app.js', style: 'docs/style.css' },
  outdir: output + '/assets',
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  bundle: true,
  minify: true,
  sourcemap: true,
  metafile: true,
  format: 'esm',
  target: 'es2022',
  loader: { '.jpg': 'file', '.png': 'file', '.svg': 'file' },
  logLevel: 'info',
});
let html = await readFile('docs/index.html', 'utf8');
for (const [path, metadata] of Object.entries(result.metafile.outputs)) {
  if (!metadata.entryPoint) continue;
  const relative = path.replace(output + '/', '');
  if (metadata.entryPoint === 'docs/app.js')
    html = html.replace(/src="app\.js(?:\?[^"]*)?"/, 'src="' + relative + '"');
  if (metadata.entryPoint === 'docs/style.css')
    html = html.replace(/href="style\.css(?:\?[^"]*)?"/, 'href="' + relative + '"');
}
if (html.includes('src="app.js') || html.includes('href="style.css'))
  throw Error('Entry asset replacement failed.');
await writeFile(output + '/index.html', html);
await writeFile(output + '/.nojekyll', '');
console.log('Static build ready in ' + output + ' with content-hashed scripts and styles.');
