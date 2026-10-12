// DOM building blocks shared by every page. Everything is built with
// createElement/textContent, never innerHTML, so data and search text are safe.

import { PRODUCTS, productById, currentPrice } from './data/products.js';
import { recipeById } from './data/recipes.js';
import { CARD_NUMBER, STORE_NAME, SHOPPER_NAME } from './data/stock.js';
import { formatPence, ticketParts, unitPrice, percentOf } from './lib/money.js';
import { encodeEan13, encodeCode128, ean13, barsPath } from './lib/barcode.js';
import { addLine, setQty, qtyOf, bundleLeft, countItems } from './lib/basket.js';
import { dueLabel } from './lib/search.js';
import { getState, update } from './store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function fill(el, props, kids) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === false || kid == null) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const h = (tag, props, ...kids) => fill(document.createElement(tag), props, kids);
export const s = (tag, props, ...kids) => fill(document.createElementNS(SVG_NS, tag), props, kids);
export const $ = (id) => document.getElementById(id);

export function icon(name) {
  return s('svg', { class: 'i', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, s('use', { href: `#i-${name}` }));
}

/** Replace a container's children, keeping keyboard focus on the same control. */
export function mount(container, ...kids) {
  const key = document.activeElement?.dataset?.fk;
  container.replaceChildren(...kids.flat(Infinity).filter(Boolean));
  if (key) document.querySelector(`[data-fk="${key}"]`)?.focus({ preventScroll: true });
}

/** Shelf-ticket price: big pounds, small raised pence. */
export function ticket(pence, cls = '') {
  const t = ticketParts(pence);
  return h('span', { class: `price ${cls}` },
    h('span', { class: 'visually-hidden' }, formatPence(pence)),
    h('span', { 'aria-hidden': 'true', class: 'price-in' },
      t.unit === '£' && h('span', { class: 'price-cur' }, '£'),
      h('span', { class: 'price-main' }, t.unit === '£' ? t.pounds : t.pence),
      h('span', { class: 'price-small' }, t.unit === '£' ? t.pence : 'p')));
}

/** A barcode as crisp SVG rectangles, with quiet zones either side. */
export function barcode(modules, label, cls = '') {
  const quiet = 6, height = 30;
  return s('svg', {
    class: `barcode ${cls}`, viewBox: `${-quiet} 0 ${modules.length + quiet * 2} ${height}`,
    preserveAspectRatio: 'none', role: 'img', 'aria-label': label, 'shape-rendering': 'crispEdges',
  }, s('path', { d: barsPath(modules, height), fill: 'currentColor' }));
}

/** In-store EAN-13 for a product: prefix 20 marks a store's own numbering. */
export const productEan = (p) => ean13(`20${String(p.id).padStart(5, '0')}00000`);

export function packImg(p, px, eager = false) {
  return h('img', {
    class: 'pack', src: `assets/packs/${p.slug}.svg`, alt: '', width: px, height: px,
    loading: eager ? 'eager' : 'lazy', decoding: 'async',
  });
}

/** A recipe's packs lined up on a shelf. */
export function lineup(recipe, px = 84, eager = false) {
  return h('div', { class: 'lineup', style: `--n:${recipe.ingredients.length}` },
    recipe.ingredients.map((i) => packImg(productById(i.productId), px, eager)));
}

export function toast(message) {
  const host = $('toasts');
  if (!host) return;
  const el = h('p', { class: 'toast' }, message);
  host.replaceChildren(el);
  setTimeout(() => { if (el.isConnected) el.remove(); }, 3200);
}

/** Minus / quantity / plus. `fk` keeps focus stable across re-renders. */
export function stepper({ qty, max, label, fk, onChange }) {
  return h('div', { class: 'stepper', role: 'group', 'aria-label': `Quantity of ${label}` },
    h('button', { type: 'button', class: 'step', 'aria-label': qty === 1 ? `Remove ${label}` : `One fewer ${label}`, 'data-fk': `${fk}:minus`, onclick: () => onChange(qty - 1) }, icon('minus')),
    h('output', { class: 'step-qty', 'aria-label': `${qty} in basket` }, qty),
    h('button', { type: 'button', class: 'step', 'aria-label': `One more ${label}`, 'data-fk': `${fk}:plus`, disabled: qty >= max, onclick: () => onChange(qty + 1) }, icon('plus')));
}

function addOrStep({ kind, id, label, max, fk, addText = 'Add' }) {
  const qty = qtyOf(getState().basket, kind, id);
  const change = (q) => {
    update((st) => ({ ...st, basket: setQty(st.basket, kind, id, q, max) }));
    toast(q > qty ? `Added ${label} to basket` : q === 0 ? `Removed ${label}` : `${label}: ${q} in basket`);
  };
  if (qty > 0) return stepper({ qty, max, label, fk, onChange: change });
  return h('button', { type: 'button', class: 'btn btn-add', 'data-fk': `${fk}:plus`, disabled: max < 1, 'aria-label': `Add ${label} to basket`, onclick: () => change(1) },
    max < 1 ? 'None left' : addText);
}

/** One product on the shelf, with its shelf-edge label. */
export function productBay(p, eager = false) {
  const now = currentPrice(p);
  return h('article', { class: `bay${p.offer ? ' bay-saver' : ''}` },
    h('div', { class: 'bay-shot' }, packImg(p, 132, eager)),
    h('div', { class: 'sel' },
      p.offer && h('p', { class: 'sel-flag' }, 'Saver price'),
      h('h3', { class: 'sel-name' }, p.name),
      h('p', { class: 'sel-size' }, p.size),
      h('div', { class: 'sel-row' },
        ticket(now),
        barcode(encodeEan13(productEan(p)), `Barcode ${productEan(p)}`, 'sel-bars')),
      h('p', { class: 'sel-unit' },
        unitPrice(now, p.amount, p.unit),
        p.offer && [' ', h('s', {}, `was ${formatPence(p.price)}`)])),
    addOrStep({ kind: 'product', id: p.id, label: p.name, max: 20, fk: `p${p.id}` }));
}

/** The yellow sticker: was, now, how much off. */
export function sticker(wasPence, nowPence, { tilt = -4, ean = null } = {}) {
  return h('div', { class: 'sticker', style: `--tilt:${tilt}deg` },
    h('span', { class: 'sticker-head' }, 'Reduced'),
    h('span', { class: 'sticker-was' }, 'was ', h('s', {}, formatPence(wasPence))),
    ticket(nowPence, 'price-sticker'),
    h('span', { class: 'sticker-off' }, `${percentOf(wasPence - nowPence, wasPence)}% off`),
    ean && barcode(encodeEan13(ean), `Barcode ${ean}`, 'sticker-bars'));
}

export function dueLine(bundle) {
  const names = bundle.covered.map((c) => productById(c.productId).name.toLowerCase());
  return h('p', { class: 'due' }, icon('clock'), `Use by ${dueLabel(bundle.soonest)}: ${names.join(', ')}`);
}

/** A rescue bundle as shoppers see it. */
export function bundleCard(bundle, index = 0, eager = false) {
  const recipe = recipeById(bundle.recipeId);
  const left = bundleLeft(bundle, getState().basket);
  const inBasket = qtyOf(getState().basket, 'bundle', bundle.id);
  return h('article', { class: 'bundle' },
    h('div', { class: 'bundle-shelf' },
      lineup(recipe, 84, eager),
      sticker(bundle.shelfPence, bundle.pricePence, { tilt: index % 2 ? 3 : -4 })),
    h('div', { class: 'bundle-body' },
      h('h3', {}, h('a', { href: `recipe.html?id=${recipe.id}` }, bundle.name)),
      h('p', { class: 'meta' }, `Serves ${recipe.serves}, ${recipe.minutes} minutes, recipe included`),
      dueLine(bundle),
      h('div', { class: 'bundle-foot' },
        h('p', { class: `left${left === 0 ? ' left-none' : ''}` }, h('strong', {}, left), ' left'),
        addOrStep({ kind: 'bundle', id: bundle.id, label: `${bundle.name} bundle`, max: left + inBasket, fk: `b${bundle.id}`, addText: 'Add bundle' }))));
}

export function emptyNote(text, link) {
  return h('div', { class: 'panel empty' }, h('p', {}, text), link && h('a', { class: 'btn', href: link.href }, link.text));
}

/** The loyalty card: clearly a demo, with a real Code 128 of its number. */
export function saverCard(points) {
  const digits = CARD_NUMBER.replace(/\s/g, '');
  return h('div', { class: 'saver-card' },
    h('div', { class: 'saver-top' },
      h('p', { class: 'saver-brand' }, h('span', { class: 'roundel', 'aria-hidden': 'true' }, 'YS'), 'Saver Card'),
      h('p', { class: 'saver-demo' }, 'Demo card')),
    h('div', { class: 'saver-mid' },
      h('div', {},
        h('p', { class: 'saver-points' }, h('strong', {}, points.toLocaleString('en-GB')), points === 1 ? ' point' : ' points'),
        h('p', { class: 'saver-small' }, `1 point per £1 of demo orders. ${SHOPPER_NAME}, ${STORE_NAME}.`)),
      h('img', { class: 'saver-qr', src: 'assets/saver-card-qr.svg', alt: 'QR code linking to this project\'s source on GitHub', width: 84, height: 84, loading: 'lazy' })),
    h('div', { class: 'saver-strip' },
      barcode(encodeCode128(digits), `Card barcode ${CARD_NUMBER}`, 'saver-bars'),
      h('p', { class: 'saver-number' }, CARD_NUMBER)),
    h('p', { class: 'saver-note' }, 'Not a real loyalty scheme. The QR code opens this project\'s source code.'));
}

/** Things every page needs: active tab, basket badge, live updates. */
export function chrome() {
  const page = document.body.dataset.page;
  for (const a of document.querySelectorAll('.till-nav a')) {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  }
  const badge = $('basketCount');
  const paint = (st) => {
    if (!badge) return;
    const n = countItems(st.basket);
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.setAttribute('aria-label', `${n} ${n === 1 ? 'item' : 'items'} in basket`);
  };
  paint(getState());
  return paint;
}

export { PRODUCTS, addLine };
