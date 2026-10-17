// Dev aid: node scripts/preview-packs.mjs out.html writes all pack shots to one page.
import { writeFileSync } from 'node:fs';
import { PRODUCTS } from '../src/js/data/products.js';
import { packSvg } from '../src/js/lib/pack.js';
writeFileSync(process.argv[2] || 'packs.html',
  `<body style="margin:0;background:#eee;display:grid;grid-template-columns:repeat(8,200px)">${PRODUCTS.map(packSvg).join('')}</body>`);
