import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addLine, setQty, qtyOf, countItems, bundleLeft, priceBasket, placeOrder, tally } from '../src/js/lib/basket.js';
import { PRODUCTS } from '../src/js/data/products.js';
import { COUPONS, DELIVERY } from '../src/js/data/stock.js';

const bundle = { id: 'B1', recipeId: 6, name: 'Mushroom Noodle Pot', serves: 2, count: 9, sold: 0, shelfPence: 485, pricePence: 240, wasteGrams: 540 };
const price = (lines, extra = {}) =>
  priceBasket({ lines, products: PRODUCTS, bundles: [bundle], coupons: COUPONS, clipped: [], delivery: DELIVERY, ...extra });

test('adding the same product twice makes one line with quantity 2', () => {
  let lines = addLine([], 'product', 1);
  lines = addLine(lines, 'product', 1);
  assert.deepEqual(lines, [{ kind: 'product', id: 1, qty: 2 }]);
  assert.equal(countItems(lines), 2);
});

test('a product and a bundle with the same id stay separate lines', () => {
  const lines = addLine(addLine([], 'product', 1), 'bundle', 1);
  assert.equal(lines.length, 2);
});

test('setting quantity to zero removes the line, and quantities are capped', () => {
  let lines = addLine([], 'product', 3, 2);
  assert.deepEqual(setQty(lines, 'product', 3, 0), []);
  lines = addLine(lines, 'bundle', 'B1', 20, 9);
  assert.equal(qtyOf(lines, 'bundle', 'B1'), 9);
  assert.equal(qtyOf(setQty(lines, 'product', 3, -4), 'product', 3), 0);
});

test('bundles left = made, minus sold, minus those already in the basket', () => {
  assert.equal(bundleLeft(bundle, []), 9);
  assert.equal(bundleLeft(bundle, [{ kind: 'bundle', id: 'B1', qty: 2 }]), 7);
  assert.equal(bundleLeft({ ...bundle, sold: 8 }, [{ kind: 'bundle', id: 'B1', qty: 2 }]), 0);
});

test('line totals and savings against shelf price', () => {
  // Chicken has no Saver price; spinach is 140p against a 190p shelf price.
  const s = price([{ kind: 'product', id: 1, qty: 1 }, { kind: 'product', id: 3, qty: 2 }]);
  assert.equal(s.lines[0].linePence, 620);
  assert.equal(s.lines[1].linePence, 280);
  assert.equal(s.lines[1].savingPence, 100);
  assert.equal(s.goodsPence, 900);
  assert.equal(s.shelfPence, 1000);
  assert.equal(s.savingsPence, 100);
  assert.equal(s.percentSaved, 10);
  assert.equal(s.items, 3);
});

test('delivery is charged below the threshold, with a spend-more message', () => {
  const s = price([{ kind: 'product', id: 1, qty: 1 }, { kind: 'product', id: 3, qty: 2 }]);
  assert.equal(s.deliveryPence, 250);
  assert.equal(s.toFreePence, 2100);
  assert.equal(s.deliveryMessage, 'Spend £21.00 more for free delivery');
  assert.equal(s.totalPence, 1150);
  assert.equal(s.deliveryProgress, 30);
});

test('delivery is free at exactly the threshold and charged one penny below it', () => {
  const lines = [{ kind: 'product', id: 1, qty: 4 }, { kind: 'product', id: 25, qty: 1 }, { kind: 'product', id: 26, qty: 1 }]; // 2480 + 290 + 220
  const below = price(lines);
  assert.equal(below.goodsPence, 2990);
  assert.equal(below.deliveryPence, 250);
  assert.equal(below.toFreePence, 10);
  assert.equal(below.deliveryMessage, 'Spend £0.10 more for free delivery');

  const exact = price(lines, { delivery: { feePence: 250, freeFromPence: 2990 } });
  assert.equal(exact.deliveryPence, 0);
  assert.equal(exact.toFreePence, 0);
  assert.equal(exact.deliveryMessage, 'Free delivery on this order');
  assert.equal(exact.totalPence, 2990);
  assert.equal(exact.deliveryProgress, 100);
});

test('an empty basket costs nothing, including delivery', () => {
  const s = price([]);
  assert.equal(s.totalPence, 0);
  assert.equal(s.deliveryPence, 0);
  assert.equal(s.percentSaved, 0);
  assert.equal(s.deliveryMessage, 'Spend £30.00 more for free delivery');
});

test('bundles save against the price of their ingredients and carry waste prevented', () => {
  const s = price([{ kind: 'bundle', id: 'B1', qty: 2 }]);
  assert.equal(s.goodsPence, 480);
  assert.equal(s.shelfPence, 970);
  assert.equal(s.savingsPence, 490);
  assert.equal(s.percentSaved, 51); // 490 / 970 = 50.5%
  assert.equal(s.wasteGrams, 1080);
});

test('waste prevented comes only from bundles', () => {
  const s = price([{ kind: 'product', id: 8, qty: 3 }]);
  assert.equal(s.wasteGrams, 0);
});

test('a clipped coupon applies only once its category spend is reached', () => {
  const lines = [{ kind: 'product', id: 1, qty: 1 }, { kind: 'product', id: 3, qty: 1 }]; // fresh 760
  const short = price(lines, { clipped: ['FRESH150'] });
  assert.equal(short.couponPence, 0);
  assert.deepEqual(short.couponLines[0], { id: 'FRESH150', title: '£1.50 off fresh', applied: false, offPence: 0, shortPence: 40 });

  const ok = price([{ kind: 'product', id: 1, qty: 1 }, { kind: 'product', id: 3, qty: 2 }], { clipped: ['FRESH150'] });
  assert.equal(ok.couponPence, 150);
  assert.equal(ok.subtotalPence, 750);
  assert.equal(ok.savingsPence, 250);
  assert.equal(ok.percentSaved, 25);
  assert.equal(ok.totalPence, 1000);
});

test('an unclipped coupon does nothing', () => {
  const s = price([{ kind: 'product', id: 1, qty: 2 }]);
  assert.equal(s.couponPence, 0);
  assert.equal(s.couponLines.length, 0);
});

test('a percentage coupon is taken from its own category only', () => {
  // Laundry liquid at its 600p Saver price + dishwasher tablets 650p, plus milk.
  const s = price([{ kind: 'product', id: 28, qty: 1 }, { kind: 'product', id: 29, qty: 1 }, { kind: 'product', id: 11, qty: 1 }], { clipped: ['HOME10'] });
  assert.equal(s.couponPence, 125);
  assert.equal(s.subtotalPence, 600 + 650 + 185 - 125);
});

test('free delivery is judged after coupons', () => {
  const lines = [{ kind: 'product', id: 1, qty: 5 }]; // 3100 fresh
  assert.equal(price(lines).deliveryPence, 0);
  const s = price(lines, { clipped: ['FRESH150'] });
  assert.equal(s.subtotalPence, 2950);
  assert.equal(s.deliveryPence, 250);
  assert.equal(s.deliveryMessage, 'Spend £0.50 more for free delivery');
});

test('an unknown line is an error, not a silent zero', () => {
  assert.throws(() => price([{ kind: 'product', id: 999, qty: 1 }]), /Unknown product/);
  assert.throws(() => price([{ kind: 'bundle', id: 'nope', qty: 1 }]), /Unknown bundle/);
});

test('placing an order records it, sells the bundles and empties the basket', () => {
  const basket = [{ kind: 'bundle', id: 'B1', qty: 2 }, { kind: 'product', id: 11, qty: 1 }];
  const state = { bundles: [bundle], basket, orders: [], stock: [], clipped: [], seq: 2 };
  const next = placeOrder(state, price(basket), '2026-01-01T12:00:00Z');
  assert.equal(next.basket.length, 0);
  assert.equal(next.bundles[0].sold, 2);
  assert.equal(next.orders.length, 1);
  assert.equal(next.orders[0].totalPence, 480 + 185 + 250);
  assert.equal(next.orders[0].ticket, 41);
  assert.match(next.orders[0].ref, /^HR\d{6}$/);
  assert.equal(bundleLeft(next.bundles[0], next.basket), 7);
  assert.equal(state.bundles[0].sold, 0, 'input state is not mutated');
});

test('placing an empty order changes nothing', () => {
  const state = { bundles: [bundle], basket: [], orders: [], stock: [], clipped: [], seq: 2 };
  assert.equal(placeOrder(state, price([]), 'now'), state);
});

test('tally adds up every order', () => {
  const t = tally([
    { bundles: 2, savingsPence: 490, wasteGrams: 1080, totalPence: 915 },
    { bundles: 1, savingsPence: 245, wasteGrams: 540, totalPence: 490 },
  ]);
  assert.deepEqual(t, { orders: 2, bundles: 3, savingsPence: 735, wasteGrams: 1620, spentPence: 1405 });
});
