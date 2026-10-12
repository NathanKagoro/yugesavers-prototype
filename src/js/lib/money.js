// Money helpers. Every amount in the app is an integer number of pence.

const MINUS = '−';

function assertPence(pence) {
  if (!Number.isInteger(pence)) throw new TypeError(`Expected integer pence, got ${pence}`);
}

/** 123450 -> "£1,234.50"; -500 -> "−£5.00". */
export function formatPence(pence) {
  assertPence(pence);
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const pp = String(abs % 100).padStart(2, '0');
  return `${pence < 0 ? MINUS : ''}£${pounds}.${pp}`;
}

/** Shelf-ticket parts: big pounds, small pence. 85 -> {pounds:'', pence:'85', unit:'p'}. */
export function ticketParts(pence) {
  assertPence(pence);
  if (pence < 0) throw new RangeError('A ticket price cannot be negative');
  if (pence < 100) return { pounds: '', pence: String(pence), unit: 'p' };
  const pounds = Math.floor(pence / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return { pounds, pence: String(pence % 100).padStart(2, '0'), unit: '£' };
}

/** Percentage of a/b, rounded half up to a whole number. 0 when b is 0. */
export function percentOf(part, whole) {
  assertPence(part); assertPence(whole);
  if (whole <= 0) return 0;
  return Math.floor((part * 200 + whole) / (whole * 2));
}

/** Discount applied in whole pence, rounding the price down to a multiple of `step`. */
export function discounted(pence, percentOff, step = 1) {
  assertPence(pence);
  const raw = Math.floor((pence * (100 - percentOff)) / 100);
  return Math.max(step, raw - (raw % step));
}

const UNIT_RULES = {
  g: { per: 1000, label: 'kg' },
  ml: { per: 1000, label: 'litre' },
  each: { per: 1, label: 'each' },
  wash: { per: 1, label: 'wash' },
  sheet: { per: 100, label: '100 sheets' },
};

/**
 * Unit price line as printed under a shelf price: "£10.33/kg", "23p each".
 * amount is the pack quantity in `unit` (600 g, 2000 ml, 8 each).
 */
export function unitPrice(pence, amount, unit) {
  assertPence(pence);
  const rule = UNIT_RULES[unit];
  if (!rule) throw new RangeError(`Unknown unit ${unit}`);
  if (!(amount > 0)) throw new RangeError('Pack amount must be positive');
  const tenths = Math.round((pence * rule.per * 10) / amount); // tenths of a penny
  const sep = rule.label === 'each' ? ' ' : '/';
  if (tenths < 1000) {
    const whole = Math.floor(tenths / 10), frac = tenths % 10;
    return `${whole}${frac ? '.' + frac : ''}p${sep}${rule.label}`;
  }
  return `${formatPence(Math.round(tenths / 10))}${sep}${rule.label}`;
}

/** 1400 -> "1.4 kg"; 840 -> "840 g". */
export function formatWeight(grams) {
  if (!Number.isInteger(grams) || grams < 0) throw new TypeError('Expected whole grams');
  if (grams < 1000) return `${grams} g`;
  const kg = (grams / 1000).toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
  return `${kg} kg`;
}
