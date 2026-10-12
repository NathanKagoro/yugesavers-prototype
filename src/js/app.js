// Entry point: draw the page named on <body data-page>, and redraw when state changes.

import { getState, subscribe } from './store.js';
import { chrome } from './ui.js';
import { home, shop, offers, recipes, recipe, basket, profile } from './pages/shopper.js';
import { staff } from './pages/staff.js';

const PAGES = { home, shop, offers, recipes, recipe, basket, account: profile, staff };

function pageName() {
  const file = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  if (file === 'recipes' || file === 'recipe') return file;
  return document.body.dataset.page;
}

function boot() {
  const paintChrome = chrome();
  const start = PAGES[pageName()];
  const render = start ? start() : () => {};
  // Stickers slap on once, on arrival, not on every redraw.
  document.documentElement.classList.add('first-paint');
  setTimeout(() => document.documentElement.classList.remove('first-paint'), 700);
  render(getState());
  subscribe((st) => { paintChrome(st); render(st); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
