// The shopper-facing pages. Each exports a render function that redraws from state.

import { PRODUCTS, CATEGORIES, productById, currentPrice } from '../data/products.js';
import { RECIPES, TAGS, recipeById } from '../data/recipes.js';
import { COUPONS, DELIVERY, SHOPPER_NAME, STORE_NAME } from '../data/stock.js';
import { formatPence, formatWeight } from '../lib/money.js';
import { priceBasket, placeOrder, tally, setQty, bundleLeft, qtyOf, addLine } from '../lib/basket.js';
import { liveBundles } from '../lib/bundles.js';
import { filterProducts, greeting, dueLabel } from '../lib/search.js';
import { encodeCode128 } from '../lib/barcode.js';
import { getState, update, resetDemo } from '../store.js';
import { h, $, icon, mount, ticket, barcode, lineup, toast, stepper, productBay, sticker, bundleCard, dueLine, emptyNote, saverCard } from '../ui.js';

const summary = (st) => priceBasket({
  lines: st.basket, products: PRODUCTS, bundles: st.bundles, coupons: COUPONS, clipped: st.clipped, delivery: DELIVERY,
});

function chip(text, pressed, onclick, fk) {
  return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pressed), 'data-fk': fk, onclick }, text);
}

function bundleList(host, st, emptyText) {
  const live = liveBundles(st);
  mount(host, live.length
    ? live.map((b, i) => bundleCard(b, i, i === 0))
    : emptyNote(emptyText, { href: 'staff.html', text: 'Open the staff door' }));
}

/* ---------- Home ---------- */

export function home() {
  $('greeting').textContent = `${greeting(new Date().getHours())}, ${SHOPPER_NAME}`;
  mount($('aisles'), CATEGORIES.map((c) =>
    h('a', { class: 'aisle', href: `shop.html?cat=${c.id}` },
      h('span', { class: 'aisle-no' }, c.aisle), icon(c.id), h('span', { class: 'aisle-name' }, c.name))));

  return (st) => {
    bundleList($('homeBundles'), st, 'No bundles are live right now. Staff can publish one from the stock room.');
    const mine = st.bundles.filter((b) => b.by === 'you').length;
    $('staffNote').textContent = `Staff have published ${st.bundles.length} ${st.bundles.length === 1 ? 'bundle' : 'bundles'} today` +
      (mine ? `, ${mine} of them by you.` : '.');
    const sum = summary(st);
    $('deliveryMsg').textContent = sum.deliveryMessage;
    $('deliveryGauge').firstElementChild.style.width = `${sum.deliveryProgress}%`;
    mount($('saverCard'), saverCard(Math.floor(tally(st.orders).spentPence / 100)));
  };
}

/* ---------- Shop ---------- */

export function shop() {
  const params = new URLSearchParams(location.search);
  const view = {
    q: params.get('q') || '',
    cat: CATEGORIES.some((c) => c.id === params.get('cat')) ? params.get('cat') : 'all',
  };
  const input = $('q');
  input.value = view.q;

  const draw = () => {
    const cat = CATEGORIES.find((c) => c.id === view.cat);
    $('aisleNo').textContent = cat ? cat.aisle : 'All';
    $('aisleName').textContent = cat ? `Aisle ${cat.aisle}: ${cat.name}` : 'Every aisle';
    mount($('catChips'),
      chip('All', view.cat === 'all', () => setCat('all'), 'cat:all'),
      CATEGORIES.map((c) => chip(c.name, view.cat === c.id, () => setCat(c.id), `cat:${c.id}`)));

    const list = filterProducts(PRODUCTS, view);
    const q = view.q.trim();
    $('resultCount').textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'}` +
      (q ? ` for “${q}”` : '') + (cat ? ` in ${cat.name}` : '');
    mount($('shelves'), list.length
      ? list.map((p, i) => productBay(p, i < 4))
      : h('div', { class: 'panel empty' },
        h('p', {}, q ? `Nothing on the shelves matches “${q}”.` : 'This aisle is empty.'),
        h('button', { type: 'button', class: 'btn', onclick: () => { view.q = ''; view.cat = 'all'; input.value = ''; sync(); draw(); input.focus(); } }, 'Show everything')));
  };
  const sync = () => {
    const next = new URLSearchParams();
    if (view.q.trim()) next.set('q', view.q.trim());
    if (view.cat !== 'all') next.set('cat', view.cat);
    history.replaceState(null, '', next.size ? `?${next}` : location.pathname);
  };
  const setCat = (id) => { view.cat = id; sync(); draw(); };

  input.addEventListener('input', () => { view.q = input.value; sync(); draw(); });
  $('shopSearch').addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
  return draw;
}

/* ---------- Offers ---------- */

export function offers() {
  return (st) => {
    bundleList($('offerBundles'), st, 'No bundles are live right now. Staff can publish one from the stock room.');
    mount($('offerShelves'), filterProducts(PRODUCTS, { offersOnly: true }).map((p) => productBay(p)));
    const sum = summary(st);
    mount($('coupons'), COUPONS.map((c) => {
      const on = st.clipped.includes(c.id);
      const line = sum.couponLines.find((l) => l.id === c.id);
      const status = !on ? '' : line.applied
        ? `Clipped. ${formatPence(line.offPence)} is coming off your basket.`
        : `Clipped. Spend ${formatPence(line.shortPence)} more on ${c.cat} products to use it.`;
      return h('article', { class: `coupon${on ? ' coupon-on' : ''}` },
        h('div', { class: 'coupon-body' },
          h('h3', {}, c.title),
          h('p', {}, c.terms),
          status && h('p', { class: 'coupon-status' }, status)),
        h('button', {
          type: 'button', class: 'coupon-clip', 'aria-pressed': String(on), 'data-fk': `c:${c.id}`,
          onclick: () => {
            update((s0) => ({ ...s0, clipped: on ? s0.clipped.filter((x) => x !== c.id) : [...s0.clipped, c.id] }));
            toast(on ? `${c.title} coupon put back` : `${c.title} coupon clipped`);
          },
        }, icon(on ? 'check' : 'scissors'), on ? 'Clipped' : 'Clip'));
    }));
  };
}

/* ---------- Recipes ---------- */

const shelfPrice = (recipe) => recipe.ingredients.reduce((n, i) => n + currentPrice(productById(i.productId)) * i.qty, 0);

export function recipes() {
  let tag = 'all';
  const draw = (st = getState()) => {
    mount($('tagChips'),
      chip('All', tag === 'all', () => { tag = 'all'; draw(); }, 'tag:all'),
      TAGS.map((t) => chip(t.name, tag === t.id, () => { tag = t.id; draw(); }, `tag:${t.id}`)));
    const live = liveBundles(st);
    const list = RECIPES.filter((r) => tag === 'all' || r.tags.includes(tag))
      .map((r) => ({ r, b: live.find((x) => x.recipeId === r.id) }))
      .sort((a, b) => Boolean(b.b) - Boolean(a.b));
    const reduced = list.filter((x) => x.b).length;
    $('resultCount').textContent = `${list.length} ${list.length === 1 ? 'recipe' : 'recipes'}, ${reduced} reduced today`;
    mount($('recipeList'), list.map(({ r, b }, i) => b ? bundleCard(b, i, i === 0) :
      h('article', { class: 'bundle bundle-plain' },
        h('div', { class: 'bundle-shelf' }, lineup(r, 84)),
        h('div', { class: 'bundle-body' },
          h('h3', {}, h('a', { href: `recipe.html?id=${r.id}` }, r.name)),
          h('p', { class: 'meta' }, `Serves ${r.serves}, ${r.minutes} minutes`),
          h('p', { class: 'meta' }, `Not reduced today. Ingredients at shelf price: ${formatPence(shelfPrice(r))}`)))));
  };
  return draw;
}

/* ---------- One recipe ---------- */

export function recipe() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const r = recipeById(id);
  if (!r) {
    $('recipeTitle').textContent = 'Recipe not found';
    mount($('recipeMain'), emptyNote('There is no recipe with that number.', { href: 'recipes.html', text: 'See all recipes' }));
    return () => {};
  }
  document.title = `${r.name} | YugeSavers`;
  $('recipeTitle').textContent = r.name;
  $('recipeMeta').textContent = `Serves ${r.serves}, ${r.minutes} minutes`;

  return (st) => {
    const b = liveBundles(st).find((x) => x.recipeId === r.id);
    const left = b ? bundleLeft(b, st.basket) : 0;
    const inBasket = b ? qtyOf(st.basket, 'bundle', b.id) : 0;
    const shelf = shelfPrice(r);

    const buy = b
      ? h('section', { class: 'buy' },
        h('p', { class: `left${left === 0 ? ' left-none' : ''}` }, h('strong', {}, left), ' left'),
        inBasket
          ? stepper({
            qty: inBasket, max: left + inBasket, label: `${b.name} bundle`, fk: 'buy',
            onChange: (q) => update((s0) => ({ ...s0, basket: setQty(s0.basket, 'bundle', b.id, q, left + inBasket) })),
          })
          : h('button', {
            type: 'button', class: 'btn btn-big', 'data-fk': 'buy:plus', disabled: left < 1,
            onclick: () => { update((s0) => ({ ...s0, basket: addLine(s0.basket, 'bundle', b.id, 1, left) })); toast(`Added ${b.name} bundle to basket`); },
          }, left < 1 ? 'None left' : `Add bundle for ${formatPence(b.pricePence)}`))
      : h('section', { class: 'buy' },
        h('p', { class: 'meta' }, `Not reduced today. Ingredients cost ${formatPence(shelf)} at shelf price.`),
        h('button', {
          type: 'button', class: 'btn btn-big', 'data-fk': 'buy:plus',
          onclick: () => {
            update((s0) => ({ ...s0, basket: r.ingredients.reduce((lines, i) => addLine(lines, 'product', i.productId, i.qty, 20), s0.basket) }));
            toast(`Added ${r.ingredients.length} ingredients to basket`);
          },
        }, 'Add the ingredients'));

    mount($('recipeMain'),
      h('section', { class: 'recipe-hero' },
        lineup(r, 96, true),
        b && sticker(b.shelfPence, b.pricePence, { tilt: -5, ean: b.ean })),
      buy,
      b && h('section', { class: 'panel why' },
        h('h2', {}, 'Why it is reduced'),
        h('p', {}, 'These ingredients are close to their use-by date, so staff have bundled them to sell today instead of throwing them away.'),
        dueLine(b),
        h('p', { class: 'meta' }, icon('leaf'), `Each bundle keeps ${formatWeight(b.wasteGrams)} of food out of the bin.`)),
      h('section', { class: 'panel' },
        h('h2', {}, b ? 'In the bundle' : 'Ingredients'),
        h('ul', { class: 'ingredients' }, r.ingredients.map((i) => {
          const p = productById(i.productId);
          const due = b?.covered.find((c) => c.productId === p.id);
          return h('li', {},
            h('span', {}, `${i.qty > 1 ? `${i.qty} × ` : ''}${p.name}`, h('small', {}, p.size)),
            due && h('span', { class: 'tag-due' }, `Use by ${dueLabel(due.daysLeft)}`));
        })),
        h('p', { class: 'meta' }, `From your cupboard: ${r.cupboard.join(', ')}.`)),
      h('section', { class: 'panel' },
        h('h2', {}, 'Method'),
        h('ol', { class: 'steps' }, r.steps.map((step) => h('li', {}, step)))));
  };
}

/* ---------- Basket ---------- */

function receiptRows(rows) {
  return h('dl', { class: 'r-totals' }, rows.filter(Boolean).map(([label, value, cls]) =>
    h('div', { class: cls || '' }, h('dt', {}, label), h('dd', {}, value))));
}

function orderReceipt(order) {
  return h('section', { class: 'receipt', 'aria-label': `Receipt for order ${order.ref}` },
    h('header', { class: 'r-head' },
      h('p', { class: 'r-shop' }, 'YugeSavers'),
      h('p', {}, STORE_NAME),
      h('p', {}, 'Demo receipt. Nothing was charged.')),
    h('ul', { class: 'r-lines r-lines-done' }, order.lines.map((l) =>
      h('li', {}, h('span', {}, `${l.qty} × ${l.name}`), h('span', { class: 'r-amt' }, formatPence(l.linePence))))),
    receiptRows([
      order.couponPence ? ['Coupons', formatPence(-order.couponPence)] : null,
      ['Delivery', order.deliveryPence ? formatPence(order.deliveryPence) : 'Free'],
      ['Total', formatPence(order.totalPence), 'r-total'],
      ['You saved', formatPence(order.savingsPence)],
      order.wasteGrams ? ['Food rescued', formatWeight(order.wasteGrams)] : null,
    ]),
    barcode(encodeCode128(order.ref), `Order barcode ${order.ref}`, 'r-bars'),
    h('p', { class: 'r-foot' }, `${order.ref}  ${new Date(order.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`));
}

export function basket() {
  let placed = null;
  return (st) => {
    const sum = summary(st);
    $('basketSub').textContent = sum.items ? `${sum.items} ${sum.items === 1 ? 'item' : 'items'}, ${formatPence(sum.totalPence)}`
      : placed ? `Demo order ${placed.ref} placed` : 'Nothing here yet';

    if (!sum.lines.length) {
      mount($('basketMain'),
        placed && h('section', { class: 'deli', role: 'status' },
          h('p', { class: 'deli-top' }, 'Your number'),
          h('p', { class: 'deli-no' }, placed.ticket),
          h('p', { class: 'deli-text' }, `Demo order ${placed.ref} placed. Nothing was charged and nothing will be delivered.`)),
        placed ? orderReceipt(placed) : emptyNote('Your basket is empty.', { href: 'offers.html', text: 'See what is reduced' }),
        placed && h('a', { class: 'btn btn-outline', href: 'index.html' }, 'Back to the shop front'));
      return;
    }

    const lines = sum.lines.map((l) => {
      const b = l.kind === 'bundle' ? st.bundles.find((x) => x.id === l.id) : null;
      const max = b ? b.count - b.sold : 20;
      return h('li', {},
        h('div', { class: 'r-name' },
          h('span', {}, l.name),
          h('small', {}, `${l.detail}, ${formatPence(l.unitPence)} each`),
          l.savingPence > 0 && h('small', { class: 'r-save' }, `${b ? 'Reduced' : 'Saver price'}: ${formatPence(-l.savingPence)}`)),
        stepper({
          qty: l.qty, max, label: l.name, fk: `${l.kind}${l.id}`,
          onChange: (q) => update((s0) => ({ ...s0, basket: setQty(s0.basket, l.kind, l.id, q, max) })),
        }),
        h('span', { class: 'r-amt' }, formatPence(l.linePence)));
    });

    mount($('basketMain'),
      h('section', { class: 'receipt', 'aria-label': 'Basket' },
        h('header', { class: 'r-head' },
          h('p', { class: 'r-shop' }, 'YugeSavers'),
          h('p', {}, STORE_NAME),
          h('p', {}, 'Demo basket, not a real order')),
        h('ul', { class: 'r-lines' }, lines),
        h('p', { class: 'next-customer', 'aria-hidden': 'true' }, 'Next customer please'),
        receiptRows([
          ['At shelf price', formatPence(sum.shelfPence)],
          sum.shelfPence - sum.goodsPence > 0 ? ['Reductions and Saver prices', formatPence(sum.goodsPence - sum.shelfPence)] : null,
          ...sum.couponLines.map((c) => c.applied
            ? [`Coupon: ${c.title}`, formatPence(-c.offPence)]
            : [`Coupon: ${c.title}`, `spend ${formatPence(c.shortPence)} more`, 'r-muted']),
          ['Subtotal', formatPence(sum.subtotalPence)],
          ['Delivery', sum.deliveryPence ? formatPence(sum.deliveryPence) : 'Free'],
          ['Total', formatPence(sum.totalPence), 'r-total'],
        ]),
        h('p', { class: 'r-saved' }, sum.savingsPence > 0
          ? `You save ${formatPence(sum.savingsPence)} (${sum.percentSaved}%) against shelf price`
          : 'No savings in this basket yet'),
        h('div', { class: 'r-delivery' },
          h('p', {}, sum.deliveryMessage),
          h('div', { class: 'gauge', role: 'img', 'aria-label': `${sum.deliveryProgress}% of the way to free delivery` }, h('span', { style: `width:${sum.deliveryProgress}%` }))),
        sum.wasteGrams > 0 && h('p', { class: 'r-waste' }, icon('leaf'), `Near-expiry food rescued: ${formatWeight(sum.wasteGrams)}`)),
      h('button', {
        type: 'button', class: 'btn btn-big btn-checkout', 'data-fk': 'checkout',
        onclick: () => {
          update((s0) => {
            const next = placeOrder(s0, summary(s0), new Date().toISOString());
            placed = next.orders.at(-1);
            return next;
          });
          $('screen').scrollTo?.({ top: 0 });
          window.scrollTo({ top: 0 });
        },
      }, `Place demo order, ${formatPence(sum.totalPence)}`),
      h('p', { class: 'meta centre' }, 'No payment is taken and nothing is delivered.'));
  };
}

/* ---------- Account ---------- */

export function profile() {
  $('resetDemo').addEventListener('click', () => { resetDemo(); toast('Demo data reset'); });
  return (st) => {
    const t = tally(st.orders);
    mount($('saverCard'), saverCard(Math.floor(t.spentPence / 100)));
    mount($('tally'),
      h('div', { class: 'tally-tile' }, h('strong', {}, t.bundles), h('span', {}, t.bundles === 1 ? 'bundle rescued' : 'bundles rescued')),
      h('div', { class: 'tally-tile' }, h('strong', {}, formatPence(t.savingsPence)), h('span', {}, 'saved against shelf price')),
      h('div', { class: 'tally-tile' }, h('strong', {}, formatWeight(t.wasteGrams)), h('span', {}, 'of food kept out of the bin')),
      h('p', { class: 'meta' }, 'Added up from the demo orders placed in this browser.'));
    mount($('orders'), st.orders.length
      ? h('ul', { class: 'order-list' }, [...st.orders].reverse().map((o) =>
        h('li', {},
          h('span', { class: 'order-no' }, o.ticket),
          h('span', { class: 'order-main' }, o.ref, h('small', {}, `${new Date(o.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}, ${o.lines.reduce((n, l) => n + l.qty, 0)} items`)),
          h('span', { class: 'order-amt' }, formatPence(o.totalPence)))))
      : emptyNote('No demo orders yet.', { href: 'offers.html', text: 'See what is reduced' }));
  };
}
