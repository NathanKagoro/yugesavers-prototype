import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eanCheckDigit, ean13, encodeEan13, code128Values, encodeCode128, barsPath } from '../src/js/lib/barcode.js';

// Reference module strings were produced with an independent encoder (JsBarcode 3).

test('EAN-13 check digits match published examples', () => {
  assert.equal(eanCheckDigit('400638133393'), 1);
  assert.equal(eanCheckDigit('590123412345'), 7);
  assert.equal(ean13('978030640615'), '9780306406157');
});

test('EAN-13 encodes to the reference bars', () => {
  assert.equal(encodeEan13('5901234123457'),
    '10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101');
  assert.equal(encodeEan13('4006381333931'),
    '10100011010100111010111101111010001001011001101010100001010000101000010111010010000101100110101');
});

test('EAN-13 is always 95 modules with guards at both ends and the centre', () => {
  const bars = encodeEan13(ean13('200000600240'));
  assert.equal(bars.length, 95);
  assert.equal(bars.slice(0, 3), '101');
  assert.equal(bars.slice(45, 50), '01010');
  assert.equal(bars.slice(-3), '101');
});

test('EAN-13 rejects a wrong check digit or wrong length', () => {
  assert.throws(() => encodeEan13('5901234123450'), /check digit/);
  assert.throws(() => encodeEan13('123'), RangeError);
  assert.throws(() => eanCheckDigit('12345678901x'), RangeError);
});

test('Code 128 set B encodes text to the reference bars', () => {
  assert.equal(encodeCode128('HR107919'),
    '110100100001100010100011000101110100111001101001110110011101101110111001011001001110011011100101100100111011001100011101011');
});

test('Code 128 switches to set C for an even run of digits', () => {
  assert.equal(code128Values('982600417305')[0], 105);
  assert.equal(encodeCode128('982600417305'),
    '11010011100111101000101110010011011011001100110001000101000011010010001001100101000111101100011101011');
});

test('Code 128 checksum is the weighted sum modulo 103', () => {
  // By hand, start B = 104: 104 + 48*1 + 42*2 + 42*3 + 17*4 + 18*5 + 19*6 + 35*7 = 879; 879 mod 103 = 55.
  const v = code128Values('PJJ123C');
  assert.equal(v[0], 104);
  assert.equal(v.at(-2), 55);
  assert.equal(v.at(-1), 106);
});

test('Code 128 length is 11 modules per symbol plus a 13-module stop', () => {
  assert.equal(encodeCode128('YS').length, 11 * 4 + 13);
  assert.throws(() => encodeCode128('é'), RangeError);
});

test('barsPath draws one rectangle per run of bars', () => {
  assert.equal(barsPath('1011', 10), 'M0 0h1v10h-1zM2 0h2v10h-2z');
  assert.equal(barsPath('000', 10), '');
});
