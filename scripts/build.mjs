// Build the static site into dist/.
//   pages:  src/pages/*.html wrapped in src/layout.html (front matter in a leading comment)
//   code:   src/js/app.js and src/css/app.css bundled and minified by esbuild
//   packs:  one SVG pack shot per product, drawn from the product data
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PRODUCTS } from '../src/js/data/products.js';
import { packSvg } from '../src/js/lib/pack.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const read = (...p) => readFileSync(join(src, ...p), 'utf8');

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets', 'packs'), { recursive: true });

// 1. Code.
await build({
  entryPoints: [join(src, 'js', 'app.js'), join(src, 'css', 'app.css')],
  bundle: true, minify: true, format: 'esm', target: 'es2020',
  outdir: dist, outbase: src, logLevel: 'warning',
  loader: { '.woff2': 'file' }, external: ['../assets/*'],
});
const version = createHash('sha1')
  .update(readFileSync(join(dist, 'js', 'app.js')))
  .update(readFileSync(join(dist, 'css', 'app.css')))
  .digest('hex').slice(0, 8);

// 2. Assets and pack shots.
cpSync(join(src, 'assets'), join(dist, 'assets'), { recursive: true });
for (const p of PRODUCTS) writeFileSync(join(dist, 'assets', 'packs', `${p.slug}.svg`), packSvg(p));

// 3. Pages.
const layout = read('layout.html');
const partial = (name) => read('partials', `${name}.html`).trimEnd();
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const expandIcons = (html) => html.replace(/\{\{i:([a-z-]+)\}\}/g, (_, n) => icon(n));

let count = 0;
for (const file of readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html'))) {
  const raw = read('pages', file);
  const m = raw.match(/^<!--\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing front matter comment`);
  const meta = Object.fromEntries(m[1].trim().split(/\r?\n/).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
  for (const key of ['title', 'description', 'page']) if (!meta[key]) throw new Error(`${file}: front matter needs "${key}"`);
  const vars = {
    title: meta.title,
    description: meta.description,
    page: meta.page,
    file: file === 'index.html' ? '' : file,
    bodyClass: meta.bodyClass || 'shopfloor',
    theme: meta.theme || '#0a3ea6',
    version,
    icons: partial('icons'),
    aside: partial(meta.aside || 'aside-shop'),
    nav: meta.nav === 'none' ? '' : partial('nav'),
    footerLinks: partial(meta.footer || 'footer-shop'),
    content: raw.slice(m[0].length).trimEnd(),
  };
  let html = layout.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all));
  if (meta.base) html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">
<base href="${meta.base}">`);
  html = expandIcons(html);
  const left = html.match(/\{\{[^}]+\}\}/);
  if (left) throw new Error(`${file}: unresolved placeholder ${left[0]}`);
  writeFileSync(join(dist, file), html);
  count++;
}

console.log(`Built ${count} pages, ${PRODUCTS.length} pack shots, version ${version} -> dist/`);
