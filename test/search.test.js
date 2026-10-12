import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, greeting, dueLabel } from '../src/js/lib/search.js';
import { PRODUCTS, CATEGORIES } from '../src/js/data/products.js';

const names = (list) => list.map((p) => p.name);

test('searching "pasta" finds the pasta and nothing else', () => {
  assert.deepEqual(names(filterProducts(PRODUCTS, { q: 'pasta' })), ['Penne Pasta']);
});

test('search ignores case, accents and extra spaces, and needs every word', () => {
  assert.deepEqual(names(filterProducts(PRODUCTS, { q: '  MILK ' })), ['Semi-Skimmed Milk', 'Coconut Milk']);
  assert.deepEqual(names(filterProducts(PRODUCTS, { q: 'coconut milk' })), ['Coconut Milk']);
  assert.deepEqual(names(filterProducts(PRODUCTS, { q: 'pénne' })), ['Penne Pasta']);
  assert.equal(filterProducts(PRODUCTS, { q: 'caviar' }).length, 0);
});

test('search also matches the category and pack size', () => {
  assert.equal(filterProducts(PRODUCTS, { q: 'frozen' }).length, 2);
  assert.ok(names(filterProducts(PRODUCTS, { q: '1 kg' })).includes('Carrots'));
});

test('an empty query returns everything', () => {
  assert.equal(filterProducts(PRODUCTS, {}).length, PRODUCTS.length);
});

test('category filter and search combine', () => {
  assert.equal(filterProducts(PRODUCTS, { cat: 'baby' }).length, 2);
  assert.deepEqual(names(filterProducts(PRODUCTS, { cat: 'dairy', q: 'milk' })), ['Semi-Skimmed Milk']);
});

test('every category has products, and every product has a known category', () => {
  const ids = CATEGORIES.map((c) => c.id);
  for (const c of CATEGORIES) assert.ok(filterProducts(PRODUCTS, { cat: c.id }).length > 0, c.id);
  for (const p of PRODUCTS) assert.ok(ids.includes(p.cat), p.name);
});

test('offers filter keeps only products with a Saver price below shelf price', () => {
  const offers = filterProducts(PRODUCTS, { offersOnly: true });
  assert.ok(offers.length > 0);
  for (const p of offers) assert.ok(p.offer < p.price);
});

test('greeting follows the clock', () => {
  assert.equal(greeting(7), 'Good morning');
  assert.equal(greeting(12), 'Good afternoon');
  assert.equal(greeting(17), 'Good afternoon');
  assert.equal(greeting(18), 'Good evening');
  assert.equal(greeting(2), 'Good evening');
});

test('due labels', () => {
  assert.equal(dueLabel(0), 'today');
  assert.equal(dueLabel(1), 'tomorrow');
  assert.equal(dueLabel(2), 'in 2 days');
});
