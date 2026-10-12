import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPence, ticketParts, percentOf, discounted, unitPrice, formatWeight } from '../src/js/lib/money.js';

test('formatPence uses pounds, two decimals and thousands separators', () => {
  assert.equal(formatPence(0), '£0.00');
  assert.equal(formatPence(5), '£0.05');
  assert.equal(formatPence(599), '£5.99');
  assert.equal(formatPence(123450), '£1,234.50');
  assert.equal(formatPence(100000000), '£1,000,000.00');
});

test('formatPence puts a real minus sign before the pound sign', () => {
  assert.equal(formatPence(-500), '−£5.00');
});

test('formatPence rejects fractional pence', () => {
  assert.throws(() => formatPence(5.99), TypeError);
});

test('ticketParts splits pounds from pence, and shows sub-pound prices in pence', () => {
  assert.deepEqual(ticketParts(695), { pounds: '6', pence: '95', unit: '£' });
  assert.deepEqual(ticketParts(1000), { pounds: '10', pence: '00', unit: '£' });
  assert.deepEqual(ticketParts(85), { pounds: '', pence: '85', unit: 'p' });
});

test('percentOf rounds half up and survives a zero base', () => {
  assert.equal(percentOf(1, 8), 13); // 12.5
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(2, 3), 67);
  assert.equal(percentOf(245, 485), 51); // 50.5...
  assert.equal(percentOf(0, 0), 0);
  assert.equal(percentOf(100, 100), 100);
});

test('discounted rounds down to the price step and never reaches zero', () => {
  assert.equal(discounted(485, 50, 5), 240);
  assert.equal(discounted(1075, 35, 5), 695);
  assert.equal(discounted(875, 50, 5), 435);
  assert.equal(discounted(999, 25), 749);
  assert.equal(discounted(4, 50, 5), 5);
});

test('unitPrice gives the per-kilo, per-litre and each lines of a shelf label', () => {
  assert.equal(unitPrice(620, 600, 'g'), '£10.33/kg');
  assert.equal(unitPrice(95, 1000, 'g'), '95p/kg');
  assert.equal(unitPrice(185, 2000, 'ml'), '92.5p/litre');
  assert.equal(unitPrice(180, 8, 'each'), '22.5p each');
  assert.equal(unitPrice(210, 3, 'each'), '70p each');
  assert.equal(unitPrice(720, 35, 'wash'), '20.6p/wash');
  assert.equal(unitPrice(800, 672, 'sheet'), '£1.19/100 sheets');
  assert.throws(() => unitPrice(100, 0, 'g'), RangeError);
  assert.throws(() => unitPrice(100, 1, 'furlong'), RangeError);
});

test('formatWeight switches to kilograms at 1,000 g', () => {
  assert.equal(formatWeight(540), '540 g');
  assert.equal(formatWeight(1000), '1 kg');
  assert.equal(formatWeight(1400), '1.4 kg');
  assert.equal(formatWeight(3150), '3.15 kg');
});
