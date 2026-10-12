// The rescue-bundle rule. Pure functions: stock and recipes in, bundles out.
//
// 1. Score every recipe by the near-expiry stock lines its ingredients would use.
//    A line due today is worth 3, tomorrow 2, in two days 1.
// 2. Pick the highest score. Ties go to the recipe that uses more near-expiry
//    lines, then the one needing fewer ordinary shelf items, then the lower id.
// 3. Make as many bundles as the scarcest near-expiry ingredient allows (max 12).
// 4. Price the bundle at a discount set by its most urgent ingredient:
//    50% off if anything is due today, 35% tomorrow, 25% in two days,
//    rounded down to the nearest 5p.

import { discounted } from './money.js';
import { ean13 } from './barcode.js';

export const URGENCY = { 0: 3, 1: 2, 2: 1 };
export const DISCOUNT_BY_DAYS = { 0: 50, 1: 35, 2: 25 };
export const MAX_BUNDLES = 12;
export const PRICE_STEP = 5;

const priceNow = (p) => p.offer ?? p.price;

/** How well one recipe covers the given near-expiry stock lines. */
export function scoreRecipe(recipe, stock) {
  const covered = [];
  for (const ing of recipe.ingredients) {
    const line = stock.find((s) => s.productId === ing.productId);
    if (line && line.units >= ing.qty && line.daysLeft in URGENCY) {
      covered.push({ productId: ing.productId, qty: ing.qty, units: line.units, daysLeft: line.daysLeft });
    }
  }
  const score = covered.reduce((sum, c) => sum + URGENCY[c.daysLeft], 0);
  const possible = covered.length
    ? Math.min(MAX_BUNDLES, ...covered.map((c) => Math.floor(c.units / c.qty)))
    : 0;
  return { recipe, covered, score, extra: recipe.ingredients.length - covered.length, possible };
}

/** Recipes that use at least one near-expiry line, best first. */
export function rankRecipes(recipes, stock, excludeIds = []) {
  return recipes
    .filter((r) => !excludeIds.includes(r.id))
    .map((r) => scoreRecipe(r, stock))
    .filter((s) => s.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      b.covered.length - a.covered.length ||
      a.extra - b.extra ||
      a.recipe.id - b.recipe.id);
}

/** Turn a scored recipe into a priced bundle. */
export function buildBundle(scored, products, { seq = 1, by = 'staff' } = {}) {
  const { recipe, covered, possible } = scored;
  if (!covered.length || possible < 1) return null;
  const find = (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) throw new Error(`Recipe ${recipe.id} uses unknown product ${id}`);
    return p;
  };
  const shelfPence = recipe.ingredients.reduce((sum, i) => sum + priceNow(find(i.productId)) * i.qty, 0);
  const soonest = Math.min(...covered.map((c) => c.daysLeft));
  const percentOff = DISCOUNT_BY_DAYS[soonest];
  const pricePence = discounted(shelfPence, percentOff, PRICE_STEP);
  const wasteGrams = covered.reduce((sum, c) => sum + find(c.productId).weightG * c.qty, 0);
  return {
    id: `B${seq}`,
    recipeId: recipe.id,
    name: recipe.name,
    serves: recipe.serves,
    count: possible,
    sold: 0,
    shelfPence,
    pricePence,
    percentOff,
    wasteGrams,
    soonest,
    covered: covered.map(({ productId, qty, daysLeft }) => ({ productId, qty, daysLeft })),
    by,
    // In-store code: prefix 20, recipe number, then the price, as reduced labels do.
    ean: ean13(`20${String(recipe.id).padStart(5, '0')}${String(pricePence).padStart(5, '0')}`),
  };
}

/** Best bundle for the selected stock lines, plus the runners-up for display. */
export function suggest(state, recipes, products, selectedIds = null) {
  const stock = selectedIds ? state.stock.filter((s) => selectedIds.includes(s.productId)) : state.stock;
  const live = state.bundles.filter((b) => b.count - b.sold > 0).map((b) => b.recipeId);
  const ranked = rankRecipes(recipes, stock.filter((s) => s.units > 0), live);
  if (!ranked.length) return { bundle: null, ranked };
  return { bundle: buildBundle(ranked[0], products, { seq: state.seq, by: 'you' }), ranked };
}

/** Publish: the bundle goes live and its near-expiry units leave the stock list. */
export function publish(state, bundle) {
  const stock = state.stock.map((line) => {
    const used = bundle.covered.find((c) => c.productId === line.productId);
    return used ? { ...line, units: line.units - used.qty * bundle.count } : line;
  });
  if (stock.some((l) => l.units < 0)) throw new Error('Not enough stock to publish this bundle');
  return { ...state, stock, bundles: [...state.bundles, bundle], seq: state.seq + 1 };
}

/** Withdraw: unsold bundles are broken up and their units go back on the list. */
export function withdraw(state, bundleId) {
  const bundle = state.bundles.find((b) => b.id === bundleId);
  if (!bundle) return state;
  const unsold = bundle.count - bundle.sold;
  const stock = state.stock.map((line) => {
    const used = bundle.covered.find((c) => c.productId === line.productId);
    return used ? { ...line, units: line.units + used.qty * unsold } : line;
  });
  const basket = state.basket.filter((l) => !(l.kind === 'bundle' && l.id === bundleId));
  return { ...state, stock, basket, bundles: state.bundles.filter((b) => b.id !== bundleId) };
}

/** Starting state: the early shift has already run the rule `published` times. */
export function seedState(seedStock, recipes, products, published = 0) {
  let state = { stock: seedStock.map((l) => ({ ...l })), bundles: [], basket: [], clipped: [], orders: [], seq: 1 };
  for (let i = 0; i < published; i++) {
    const { bundle } = suggest(state, recipes, products);
    if (!bundle) break;
    state = publish(state, { ...bundle, by: 'early shift' });
  }
  return state;
}

export const liveBundles = (state) => state.bundles.filter((b) => b.count - b.sold > 0);
