// Product search and category filter. Pure.

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Every word of the query must appear in the product's name, size or category. */
export function filterProducts(products, { q = '', cat = 'all', offersOnly = false } = {}) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (cat !== 'all' && p.cat !== cat) return false;
    if (offersOnly && !p.offer) return false;
    const hay = fold(`${p.name} ${p.size} ${p.cat}`);
    return words.every((w) => hay.includes(w));
  });
}

/** Time-of-day greeting for an hour 0-23. */
export function greeting(hour) {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "today", "tomorrow", "in 2 days". */
export function dueLabel(daysLeft) {
  return daysLeft <= 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
}
