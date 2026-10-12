// Back of house: the stock-room handheld. Near-expiry stock in, priced bundle out.

import { PRODUCTS, productById } from '../data/products.js';
import { RECIPES, recipeById } from '../data/recipes.js';
import { STORE_NAME } from '../data/stock.js';
import { formatPence, formatWeight } from '../lib/money.js';
import { suggest, publish, withdraw, URGENCY } from '../lib/bundles.js';
import { dueLabel } from '../lib/search.js';
import { encodeEan13 } from '../lib/barcode.js';
import { getState, update, resetDemo } from '../store.js';
import { h, $, icon, mount, barcode, toast, sticker } from '../ui.js';

export function staff() {
  const ticked = new Set(getState().stock.filter((l) => l.units > 0).map((l) => l.productId));
  let proposal = null; // { bundle, ranked } from the last Generate press
  let message = '';

  const clock = () => { $('hhClock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  clock();
  setInterval(clock, 30000);

  function openPoster(bundle) {
    const r = recipeById(bundle.recipeId);
    mount($('poster'),
      h('p', { class: 'poster-store' }, `YugeSavers, ${STORE_NAME}`),
      h('h2', { class: 'poster-title' }, bundle.name),
      h('p', { class: 'poster-sub' }, `Rescue bundle. Serves ${r.serves}, ready in ${r.minutes} minutes.`),
      sticker(bundle.shelfPence, bundle.pricePence, { tilt: -3, ean: bundle.ean }),
      h('h3', {}, 'In the bundle'),
      h('ul', {}, r.ingredients.map((i) => { const p = productById(i.productId); return h('li', {}, `${i.qty > 1 ? `${i.qty} × ` : ''}${p.name}, ${p.size}`); })),
      h('p', { class: 'poster-small' }, `You will also need: ${r.cupboard.join(', ')}.`),
      h('h3', {}, 'Method'),
      h('ol', {}, r.steps.map((step) => h('li', {}, step))),
      h('p', { class: 'poster-small' }, `Reduced because some ingredients are close to their use-by date. Each bundle saves ${formatWeight(bundle.wasteGrams)} of food. Demo poster for a prototype.`));
    $('posterDialog').showModal();
  }
  $('posterClose').addEventListener('click', () => $('posterDialog').close());
  $('posterPrint').addEventListener('click', () => window.print());

  $('generate').addEventListener('click', () => {
    proposal = suggest(getState(), RECIPES, PRODUCTS, [...ticked]);
    message = proposal.bundle ? '' : ticked.size
      ? 'No recipe that is not already live uses the ticked lines.'
      : 'Tick at least one stock line first.';
    render(getState());
    $('proposal').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  $('resetDemo').addEventListener('click', () => {
    const st = resetDemo();
    ticked.clear();
    for (const l of st.stock) if (l.units > 0) ticked.add(l.productId);
    proposal = null; message = '';
    toast('Demo data reset');
  });

  function render(st) {
    const lines = st.stock.filter((l) => l.units > 0).sort((a, b) => a.daysLeft - b.daysLeft);
    mount($('stockList'), lines.length ? lines.map((l) => {
      const p = productById(l.productId);
      return h('li', {}, h('label', { class: 'hh-line' },
        h('input', {
          type: 'checkbox', checked: ticked.has(p.id), 'data-fk': `tick${p.id}`,
          onchange: (e) => { if (e.target.checked) ticked.add(p.id); else ticked.delete(p.id); },
        }),
        h('span', { class: 'hh-name' }, p.name, h('small', {}, `${l.units} ${l.units === 1 ? 'unit' : 'units'}, ${p.size}`)),
        h('span', { class: `hh-due hh-due-${l.daysLeft}` }, dueLabel(l.daysLeft))));
    }) : h('li', { class: 'hh-none' }, 'No near-expiry stock left. Every line has been bundled.'));
    $('generate').disabled = lines.length === 0;

    const b = proposal?.bundle;
    mount($('proposal'),
      message && h('p', { class: 'hh-msg' }, message),
      b && [
        h('h2', {}, 'Proposed bundle'),
        h('p', { class: 'hh-big' }, b.name),
        h('table', { class: 'hh-scores' },
          h('caption', {}, 'How the recipes scored on the ticked lines'),
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Recipe'), h('th', { scope: 'col' }, 'Lines'), h('th', { scope: 'col' }, 'Score'))),
          h('tbody', {}, proposal.ranked.slice(0, 4).map((r, i) =>
            h('tr', { class: i === 0 ? 'hh-win' : '' }, h('td', {}, r.recipe.name), h('td', {}, r.covered.length), h('td', {}, r.score))))),
        h('ul', { class: 'hh-contents' }, recipeById(b.recipeId).ingredients.map((i) => {
          const p = productById(i.productId);
          const c = b.covered.find((x) => x.productId === p.id);
          return h('li', {}, h('span', {}, `${i.qty} × ${p.name}`),
            c ? h('span', { class: `hh-due hh-due-${c.daysLeft}` }, `${dueLabel(c.daysLeft)}, +${URGENCY[c.daysLeft]}`) : h('span', { class: 'hh-shelf' }, 'from shelf'));
        })),
        h('dl', { class: 'hh-facts' },
          h('div', {}, h('dt', {}, 'Ingredients at shelf price'), h('dd', {}, formatPence(b.shelfPence))),
          h('div', {}, h('dt', {}, `Reduction (soonest date is ${dueLabel(b.soonest)})`), h('dd', {}, `${b.percentOff}%`)),
          h('div', { class: 'hh-price' }, h('dt', {}, 'Bundle price'), h('dd', {}, formatPence(b.pricePence))),
          h('div', {}, h('dt', {}, 'Bundles the stock allows'), h('dd', {}, b.count)),
          h('div', {}, h('dt', {}, 'Food rescued per bundle'), h('dd', {}, formatWeight(b.wasteGrams)))),
        h('button', {
          type: 'button', class: 'key key-go', 'data-fk': 'publish',
          onclick: () => {
            proposal = null;
            message = `Published ${b.count} × ${b.name} at ${formatPence(b.pricePence)}. It is live in the shopper app.`;
            update((s0) => publish(s0, b));
          },
        }, icon('check'), 'Publish to app'),
        h('button', { type: 'button', class: 'key', 'data-fk': 'poster', onclick: () => openPoster(b) }, icon('print'), 'Recipe poster'),
      ],
      !b && message.startsWith('Published') && h('a', { class: 'key key-link', href: 'index.html' }, icon('shop'), 'See it on the shop floor'));

    mount($('liveList'), st.bundles.length ? st.bundles.map((x) =>
      h('li', {},
        h('div', { class: 'hh-live-main' },
          h('span', { class: 'hh-name' }, x.name, h('small', {}, `${formatPence(x.pricePence)}, ${x.percentOff}% off, published by ${x.by}`)),
          h('span', { class: 'hh-count' }, h('strong', {}, x.count - x.sold), ` of ${x.count} left`)),
        barcode(encodeEan13(x.ean), `Barcode ${x.ean}`, 'hh-bars'),
        h('div', { class: 'hh-live-keys' },
          h('button', { type: 'button', class: 'key key-small', 'data-fk': `poster${x.id}`, onclick: () => openPoster(x) }, icon('print'), 'Poster'),
          h('button', {
            type: 'button', class: 'key key-small key-warn', 'data-fk': `wd${x.id}`,
            onclick: () => {
              message = ''; proposal = null;
              for (const c of x.covered) ticked.add(c.productId);
              update((s0) => withdraw(s0, x.id));
              toast(`Withdrew ${x.name}. Unsold stock is back on the list.`);
            },
          }, 'Withdraw')))) : h('li', { class: 'hh-none' }, 'Nothing is live. Generate a bundle above.'));
  }
  return render;
}
