// Near-expiry stock at the start of the demo day. `daysLeft` is relative to
// today (0 = use by today) so the demo never goes stale.
export const SEED_STOCK = [
  { productId: 7, units: 9, daysLeft: 0 },
  { productId: 3, units: 16, daysLeft: 0 },
  { productId: 13, units: 5, daysLeft: 0 },
  { productId: 1, units: 12, daysLeft: 1 },
  { productId: 2, units: 18, daysLeft: 1 },
  { productId: 9, units: 6, daysLeft: 1 },
  { productId: 5, units: 7, daysLeft: 1 },
  { productId: 10, units: 8, daysLeft: 2 },
  { productId: 11, units: 10, daysLeft: 2 },
];

/** How many bundles the early shift has already published when the demo starts. */
export const SEED_PUBLISHED = 2;

export const COUPONS = [
  { id: 'FRESH150', title: '£1.50 off fresh', terms: 'When you spend £8.00 or more on fresh products.', cat: 'fresh', minSpend: 800, amountOff: 150 },
  { id: 'HOME10', title: '10% off household', terms: 'When you spend £10.00 or more on household products.', cat: 'household', minSpend: 1000, percentOff: 10 },
];

export const DELIVERY = { feePence: 250, freeFromPence: 3000 };
export const STORE_NAME = 'Harbour Road store';
export const SHOPPER_NAME = 'Sam';
export const CARD_NUMBER = '9826 0041 7305';
