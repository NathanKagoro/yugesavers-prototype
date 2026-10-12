// Real barcodes: EAN-13 for shelf labels, Code 128 for the Saver Card and receipts.
// Each encoder returns a string of modules, '1' = bar, '0' = space.

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
// Which of L/G each of the six left-hand digits uses, chosen by the first digit.
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Check digit for the first 12 digits of an EAN-13. */
export function eanCheckDigit(twelve) {
  if (!/^\d{12}$/.test(twelve)) throw new RangeError('EAN-13 needs 12 digits before the check digit');
  const sum = [...twelve].reduce((n, d, i) => n + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

/** Complete a 12-digit number into a 13-digit EAN. */
export function ean13(twelve) {
  return twelve + eanCheckDigit(twelve);
}

/** 95 modules: guard, six left digits, centre guard, six right digits, guard. */
export function encodeEan13(code) {
  if (!/^\d{13}$/.test(code)) throw new RangeError('EAN-13 must be 13 digits');
  if (eanCheckDigit(code.slice(0, 12)) !== Number(code[12])) throw new RangeError(`Bad EAN-13 check digit in ${code}`);
  const parity = PARITY[Number(code[0])];
  let out = '101';
  for (let i = 0; i < 6; i++) out += (parity[i] === 'L' ? L : G)[Number(code[i + 1])];
  out += '01010';
  for (let i = 7; i < 13; i++) out += R[Number(code[i])];
  return out + '101';
}

// Code 128 symbol widths (bar, space, bar, space, bar, space), values 0-105, then stop.
const C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 ' +
  '123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 ' +
  '232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 ' +
  '313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 ' +
  '111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 ' +
  '114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112').split(' ');
const START_B = 104, START_C = 105, STOP = 106;

const toModules = (widths) => [...widths].map((w, i) => (i % 2 ? '0' : '1').repeat(Number(w))).join('');

/** Symbol values (start, data, checksum, stop) for a Code 128 barcode. */
export function code128Values(text) {
  let values;
  if (/^(\d\d)+$/.test(text)) {
    // Set C packs two digits per symbol.
    values = [START_C, ...text.match(/\d\d/g).map(Number)];
  } else {
    if (!/^[\x20-\x7e]+$/.test(text)) throw new RangeError('Code 128 set B covers printable ASCII only');
    values = [START_B, ...[...text].map((ch) => ch.charCodeAt(0) - 32)];
  }
  const check = values.reduce((n, v, i) => n + v * Math.max(i, 1), 0) % 103;
  return [...values, check, STOP];
}

export function encodeCode128(text) {
  return code128Values(text).map((v) => toModules(C128[v])).join('');
}

/** SVG path data for a module string: one rectangle per run of bars. */
export function barsPath(modules, height) {
  let d = '';
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== '1') continue;
    let j = i;
    while (modules[j + 1] === '1') j++;
    d += `M${i} 0h${j - i + 1}v${height}h-${j - i + 1}z`;
    i = j;
  }
  return d;
}
