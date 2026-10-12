// Browser state: one JSON blob in localStorage, changed only through update().
// The pure reducers live in lib/; this file only loads, saves and notifies.

import { PRODUCTS } from './data/products.js';
import { RECIPES } from './data/recipes.js';
import { SEED_STOCK, SEED_PUBLISHED } from './data/stock.js';
import { seedState } from './lib/bundles.js';

const KEY = 'yugesavers.v2';
const listeners = new Set();
let state = null;

const fresh = () => seedState(SEED_STOCK, RECIPES, PRODUCTS, SEED_PUBLISHED);

function valid(s) {
  return s && ['stock', 'bundles', 'basket', 'clipped', 'orders'].every((k) => Array.isArray(s[k])) && Number.isInteger(s.seq);
}

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return valid(parsed) ? parsed : null;
  } catch {
    return null; // storage blocked or corrupt: fall back to a fresh in-memory demo
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep going in memory */ }
}

export function getState() {
  if (!state) {
    state = read();
    if (!state) { state = fresh(); save(); }
  }
  return state;
}

export function update(fn) {
  state = fn(getState());
  save();
  for (const l of listeners) l(state);
  return state;
}

export function resetDemo() {
  return update(() => fresh());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Another tab changed the data (for example the staff handheld published a bundle).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    const next = read();
    if (!next) return;
    state = next;
    for (const l of listeners) l(state);
  });
}
