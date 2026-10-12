// Basket maths. Pure functions over integer pence; nothing here touches the DOM
// or storage. A basket is a list of lines: { kind: 'product' | 'bundle', id, qty }.

import { formatPence, percentOf } from './money.js';

const priceNow = (p) => p.offer ?? p.price;
const same = (line, kind, id) => line.kind === kind && line.id === id;

export function qtyOf(lines, kind, id) {
  return lines.find((l) => same(l, kind, id))?.qty ?? 0;
}

export function countItems(lines) {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** Set a line's quantity, clamped to 0..max. Zero removes the line. */
export function setQty(lines, kind, id, qty, max = 99) {
  const q = Math.max(0, Math.min(Math.trunc(qty) || 0, max));
  const rest = lines.filter((l) => !same(l, kind, id));
  if (q === 0) return rest;
  return lines.some((l) => same(l, kind, id))
    ? lines.map((l) => (same(l, kind, id) ? { ...l, qty: q } : l))
    : [...lines, { kind, id, qty: q }];
}

export function addLine(lines, kind, id, by = 1, max = 99) {
  return setQty(lines, kind, id, qtyOf(lines, kind, id) + by, max);
}

/** Bundles still available to add: made, minus sold, minus already in this basket. */
export function bundleLeft(bundle, lines) {
  return Math.max(0, bundle.count - bundle.sold - qtyOf(lines, 'bundle', bundle.id));
}

/**
 * Price a basket.
 * Shelf price = what the same goods cost without any Saver price, bundle or coupon.
 * Free delivery is judged on what the shopper pays for goods, after coupons.
 */
export function priceBasket({ lines, products, bundles, coupons = [], clipped = [], delivery }) {
  const priced = lines.map((line) => {
    if (line.kind === 'bundle') {
      const b = bundles.find((x) => x.id === line.id);
      if (!b) throw new Error(`Unknown bundle ${line.id}`);
      return {
        ...line, name: `${b.name} bundle`, detail: `Serves ${b.serves}`, cat: 'bundle',
        unitPence: b.pricePence, shelfUnitPence: b.shelfPence,
        linePence: b.pricePence * line.qty, shelfLinePence: b.shelfPence * line.qty,
        wasteGrams: b.wasteGrams * line.qty,
      };
    }
    const p = products.find((x) => x.id === line.id);
    if (!p) throw new Error(`Unknown product ${line.id}`);
    return {
      ...line, name: p.name, detail: p.size, cat: p.cat,
      unitPence: priceNow(p), shelfUnitPence: p.price,
      linePence: priceNow(p) * line.qty, shelfLinePence: p.price * line.qty,
      wasteGrams: 0,
    };
  }).map((l) => ({ ...l, savingPence: l.shelfLinePence - l.linePence }));

  const sum = (key) => priced.reduce((n, l) => n + l[key], 0);
  const goodsPence = sum('linePence');
  const shelfPence = sum('shelfLinePence');

  const couponLines = [];
  for (const c of coupons) {
    if (!clipped.includes(c.id)) continue;
    const spend = priced.filter((l) => l.cat === c.cat).reduce((n, l) => n + l.linePence, 0);
    if (spend < c.minSpend) {
      couponLines.push({ id: c.id, title: c.title, applied: false, offPence: 0, shortPence: c.minSpend - spend });
      continue;
    }
    const off = c.amountOff ?? Math.floor((spend * c.percentOff) / 100);
    couponLines.push({ id: c.id, title: c.title, applied: true, offPence: Math.min(off, spend), shortPence: 0 });
  }
  const couponPence = couponLines.reduce((n, c) => n + c.offPence, 0);

  const subtotalPence = goodsPence - couponPence;
  const empty = priced.length === 0;
  const free = subtotalPence >= delivery.freeFromPence;
  const deliveryPence = empty || free ? 0 : delivery.feePence;
  const toFreePence = free ? 0 : delivery.freeFromPence - subtotalPence;
  const savingsPence = shelfPence - subtotalPence;

  return {
    lines: priced,
    items: countItems(lines),
    goodsPence,
    shelfPence,
    couponLines,
    couponPence,
    subtotalPence,
    savingsPence,
    percentSaved: percentOf(savingsPence, shelfPence),
    deliveryPence,
    toFreePence,
    deliveryProgress: Math.min(100, percentOf(subtotalPence, delivery.freeFromPence)),
    deliveryMessage: free
      ? 'Free delivery unlocked'
      : `Spend ${formatPence(toFreePence)} more for free delivery`,
    totalPence: subtotalPence + deliveryPence,
    wasteGrams: sum('wasteGrams'),
  };
}

/**
 * Place the (demo) order: record it, mark bundles as sold, empty the basket.
 * `summary` is the priceBasket result for the current basket.
 */
export function placeOrder(state, summary, at) {
  if (!summary.lines.length) return state;
  const n = state.orders.length + 1;
  const order = {
    ref: `HR${String(100000 + ((n * 7919) % 900000))}`,
    ticket: 40 + n,
    at,
    lines: summary.lines.map(({ kind, id, qty, name, detail, linePence }) => ({ kind, id, qty, name, detail, linePence })),
    totalPence: summary.totalPence,
    deliveryPence: summary.deliveryPence,
    couponPence: summary.couponPence,
    savingsPence: summary.savingsPence,
    wasteGrams: summary.wasteGrams,
    bundles: summary.lines.filter((l) => l.kind === 'bundle').reduce((k, l) => k + l.qty, 0),
  };
  const bundles = state.bundles.map((b) => {
    const line = summary.lines.find((l) => l.kind === 'bundle' && l.id === b.id);
    return line ? { ...b, sold: b.sold + line.qty } : b;
  });
  return { ...state, bundles, basket: [], orders: [...state.orders, order] };
}

/** Running totals across every order placed in this browser. */
export function tally(orders) {
  return orders.reduce((t, o) => ({
    orders: t.orders + 1,
    bundles: t.bundles + o.bundles,
    savingsPence: t.savingsPence + o.savingsPence,
    wasteGrams: t.wasteGrams + o.wasteGrams,
    spentPence: t.spentPence + o.totalPence,
  }), { orders: 0, bundles: 0, savingsPence: 0, wasteGrams: 0, spentPence: 0 });
}
