import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRecipe, rankRecipes, buildBundle, suggest, publish, withdraw, seedState, liveBundles, MAX_BUNDLES } from '../src/js/lib/bundles.js';
import { PRODUCTS, productById } from '../src/js/data/products.js';
import { RECIPES, recipeById } from '../src/js/data/recipes.js';
import { SEED_STOCK, SEED_PUBLISHED } from '../src/js/data/stock.js';
import { encodeEan13 } from '../src/js/lib/barcode.js';

const fresh = () => seedState(SEED_STOCK, RECIPES, PRODUCTS, 0);

test('every recipe ingredient is a real product', () => {
  for (const r of RECIPES) for (const i of r.ingredients) assert.ok(productById(i.productId), `${r.name} -> ${i.productId}`);
});

test('a recipe scores 3 for a line due today, 2 for tomorrow, 1 for two days', () => {
  const s = scoreRecipe(recipeById(3), SEED_STOCK); // pasta bake: cheddar (2 days) + spinach (today)
  assert.equal(s.score, 4);
  assert.deepEqual(s.covered.map((c) => c.productId).sort((a, b) => a - b), [3, 10]);
  assert.equal(s.extra, 2);
  assert.equal(s.possible, 8); // 8 cheddar, 16 spinach
});

test('a recipe with no near-expiry ingredients is not offered', () => {
  const ranked = rankRecipes(RECIPES, [{ productId: 31, units: 5, daysLeft: 0 }]);
  assert.equal(ranked.length, 0);
});

test('a stock line with too few units for the recipe does not count', () => {
  // Chickpea curry needs 2 tins of chickpeas.
  const s = scoreRecipe(recipeById(8), [{ productId: 21, units: 1, daysLeft: 0 }]);
  assert.equal(s.score, 0);
  const ok = scoreRecipe(recipeById(8), [{ productId: 21, units: 5, daysLeft: 0 }]);
  assert.equal(ok.possible, 2);
});

test('the best cover wins: mushrooms and spinach due today pick the noodle pot', () => {
  const { bundle, ranked } = suggest(fresh(), RECIPES, PRODUCTS);
  assert.equal(ranked[0].recipe.name, 'Mushroom Noodle Pot');
  assert.equal(ranked[0].score, 6);
  assert.equal(bundle.count, 9); // 9 mushrooms is the scarcest
  assert.equal(bundle.shelfPence, 120 + 115 + 140 + 110);
  assert.equal(bundle.percentOff, 50);
  assert.equal(bundle.pricePence, 240);
  assert.equal(bundle.wasteGrams, 300 + 240);
});

test('ties break on fewer ordinary items, then lower recipe id', () => {
  const stock = [{ productId: 2, units: 5, daysLeft: 1 }]; // peppers: fajita, stir fry, sausage tray all score 2
  const ranked = rankRecipes(RECIPES, stock);
  assert.deepEqual(ranked.map((r) => r.recipe.id), [1, 4, 2]); // stir fry needs 4 other items, the others 3
});

test('the discount follows the most urgent ingredient', () => {
  const tomorrow = buildBundle(scoreRecipe(recipeById(1), [{ productId: 1, units: 3, daysLeft: 1 }]), PRODUCTS);
  assert.equal(tomorrow.percentOff, 35);
  assert.equal(tomorrow.pricePence, 695); // 1075 less 35% = 698.75, down to the 5p
  const twoDays = buildBundle(scoreRecipe(recipeById(3), [{ productId: 10, units: 3, daysLeft: 2 }]), PRODUCTS);
  assert.equal(twoDays.percentOff, 25);
  assert.equal(twoDays.count, 3);
});

test('never more than the maximum number of bundles', () => {
  const b = buildBundle(scoreRecipe(recipeById(1), [{ productId: 1, units: 500, daysLeft: 0 }]), PRODUCTS);
  assert.equal(b.count, MAX_BUNDLES);
});

test('publishing takes the used units off the stock list', () => {
  const state = fresh();
  const { bundle } = suggest(state, RECIPES, PRODUCTS);
  const next = publish(state, bundle);
  const units = (s, id) => s.stock.find((l) => l.productId === id).units;
  assert.equal(units(next, 7), 0);
  assert.equal(units(next, 3), 7);
  assert.equal(units(next, 1), 12, 'untouched lines stay');
  assert.equal(next.bundles.length, 1);
  assert.equal(next.seq, state.seq + 1);
  assert.equal(units(state, 7), 9, 'input state is not mutated');
});

test('a recipe that is already live is not suggested again', () => {
  let state = fresh();
  state = publish(state, suggest(state, RECIPES, PRODUCTS).bundle);
  const again = suggest(state, RECIPES, PRODUCTS);
  assert.notEqual(again.bundle.recipeId, 6);
});

test('only ticked stock lines are considered', () => {
  const { bundle } = suggest(fresh(), RECIPES, PRODUCTS, [1, 2]); // chicken + peppers
  assert.equal(bundle.name, 'Chicken Fajita Night');
  assert.deepEqual(bundle.covered.map((c) => c.productId), [1, 2]);
  assert.equal(suggest(fresh(), RECIPES, PRODUCTS, []).bundle, null);
});

test('withdrawing returns unsold units to stock and clears it from baskets', () => {
  let state = fresh();
  const { bundle } = suggest(state, RECIPES, PRODUCTS);
  state = publish(state, bundle);
  state = { ...state, basket: [{ kind: 'bundle', id: bundle.id, qty: 1 }, { kind: 'product', id: 1, qty: 1 }] };
  state = { ...state, bundles: state.bundles.map((b) => ({ ...b, sold: 4 })) };
  const back = withdraw(state, bundle.id);
  assert.equal(back.stock.find((l) => l.productId === 7).units, 5);
  assert.equal(back.bundles.length, 0);
  assert.deepEqual(back.basket, [{ kind: 'product', id: 1, qty: 1 }]);
});

test('publishing more than the stock holds is refused', () => {
  const state = fresh();
  const { bundle } = suggest(state, RECIPES, PRODUCTS);
  assert.throws(() => publish(state, { ...bundle, count: 99 }), /Not enough stock/);
});

test('the demo starts with the early shift having published two bundles by the same rule', () => {
  const state = seedState(SEED_STOCK, RECIPES, PRODUCTS, SEED_PUBLISHED);
  assert.deepEqual(liveBundles(state).map((b) => b.name), ['Mushroom Noodle Pot', 'Student Pasta Cheese']);
  const pasta = state.bundles[1];
  assert.equal(pasta.count, 5); // 5 loaves
  assert.equal(pasta.pricePence, 435);
  assert.equal(pasta.wasteGrams, 350 + 2000 + 800);
  // ...and there is still stock for the visitor to bundle next.
  const next = suggest(state, RECIPES, PRODUCTS).bundle;
  assert.equal(next.name, 'Chicken Fajita Night');
  assert.equal(next.count, 12);
  assert.equal(next.wasteGrams, 1050);
});

test('each bundle carries a valid in-store EAN-13 with its price in it', () => {
  const { bundle } = suggest(fresh(), RECIPES, PRODUCTS);
  assert.match(bundle.ean, /^200000600240\d$/);
  assert.equal(encodeEan13(bundle.ean).length, 95);
});

test('working through all the stock ends with nothing left to suggest', () => {
  let state = fresh();
  for (let i = 0; i < 20; i++) {
    const { bundle } = suggest(state, RECIPES, PRODUCTS);
    if (!bundle) break;
    state = publish(state, bundle);
  }
  assert.ok(state.stock.every((l) => l.units >= 0));
  assert.equal(suggest(state, RECIPES, PRODUCTS).bundle, null);
  assert.ok(state.bundles.length >= 3);
});
