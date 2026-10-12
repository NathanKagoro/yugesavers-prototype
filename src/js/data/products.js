// Demo catalogue for the fictional Harbour Road store. Prices are integer pence.
// `amount` + `unit` drive the unit-price line; `weightG` is the food weight used
// for "waste prevented"; `pack`, `tint` and `motif` drive the pack illustration.

const P = (id, slug, name, size, amount, unit, price, cat, pack, tint, motif, weightG, offer) =>
  ({ id, slug, name, size, amount, unit, price, cat, pack, tint, motif, weightG, ...(offer ? { offer } : {}) });

export const CATEGORIES = [
  { id: 'fresh', name: 'Fresh', aisle: 1 },
  { id: 'dairy', name: 'Dairy', aisle: 2 },
  { id: 'bakery', name: 'Bakery', aisle: 3 },
  { id: 'cupboard', name: 'Cupboard', aisle: 4 },
  { id: 'frozen', name: 'Frozen', aisle: 5 },
  { id: 'drinks', name: 'Drinks', aisle: 6 },
  { id: 'household', name: 'Household', aisle: 7 },
  { id: 'baby', name: 'Baby', aisle: 8 },
];

export const PRODUCTS = [
  P(1, 'chicken-breast-fillets', 'British Chicken Breast Fillets', '600 g', 600, 'g', 620, 'fresh', 'tray', '#f3b6a8', 'fillet', 600),
  P(2, 'red-bell-peppers', 'Red Bell Peppers', '3 pack', 3, 'each', 210, 'fresh', 'bag', '#d3222a', 'round', 450, 180),
  P(3, 'baby-spinach', 'Baby Spinach', '240 g', 240, 'g', 190, 'fresh', 'bag', '#2f8f3e', 'leaf', 240, 140),
  P(4, 'brown-onions', 'Brown Onions', '1 kg', 1000, 'g', 95, 'fresh', 'bag', '#c98a3c', 'round', 1000),
  P(5, 'broccoli', 'Broccoli', '350 g', 350, 'g', 85, 'fresh', 'bag', '#3c8a35', 'floret', 350),
  P(6, 'carrots', 'Carrots', '1 kg', 1000, 'g', 69, 'fresh', 'bag', '#ef7d1a', 'stick', 1000),
  P(7, 'closed-cup-mushrooms', 'Closed Cup Mushrooms', '300 g', 300, 'g', 115, 'fresh', 'tray', '#d9c8b0', 'round', 300),
  P(8, 'white-potatoes', 'White Potatoes', '2 kg', 2000, 'g', 150, 'fresh', 'bag', '#d8b36a', 'round', 2000),
  P(9, 'pork-sausages', 'Pork Sausages', '8 pack, 454 g', 454, 'g', 250, 'fresh', 'tray', '#e19a86', 'stick', 454),
  P(10, 'mature-cheddar', 'Mature Cheddar', '350 g', 350, 'g', 380, 'dairy', 'block', '#f2b632', 'slice', 350),
  P(11, 'semi-skimmed-milk', 'Semi-Skimmed Milk', '2 litres', 2000, 'ml', 185, 'dairy', 'jug', '#2fa24a', 'drop', 2000),
  P(12, 'free-range-eggs', 'Free Range Eggs', '6 pack', 6, 'each', 195, 'dairy', 'box', '#e9cfa6', 'round', 360),
  P(13, 'wholemeal-bread-loaf', 'Wholemeal Bread Loaf', '800 g', 800, 'g', 170, 'bakery', 'loaf', '#a8672f', 'slice', 800),
  P(14, 'chocolate-croissants', 'Chocolate Croissants', '4 pack', 4, 'each', 230, 'bakery', 'box', '#c98d4b', 'crescent', 280),
  P(15, 'tortilla-wraps', 'Tortilla Wraps', '8 pack', 8, 'each', 180, 'bakery', 'bag', '#ecd9a8', 'round', 490),
  P(16, 'penne-pasta', 'Penne Pasta', '500 g', 500, 'g', 140, 'cupboard', 'bag', '#f0c64f', 'tube', 500),
  P(17, 'tomato-and-basil-sauce', 'Tomato and Basil Sauce', '350 g', 350, 'g', 195, 'cupboard', 'jar', '#c7321f', 'leaf', 350),
  P(18, 'egg-noodles', 'Egg Noodles', '250 g', 250, 'g', 120, 'cupboard', 'bag', '#e8c15a', 'wave', 250),
  P(19, 'soy-sauce', 'Soy Sauce', '150 ml', 150, 'ml', 110, 'cupboard', 'bottle', '#3a2416', 'drop', 150),
  P(20, 'long-grain-rice', 'Long Grain Rice', '1 kg', 1000, 'g', 145, 'cupboard', 'bag', '#e9e2cf', 'grain', 1000),
  P(21, 'chickpeas', 'Chickpeas in Water', '400 g', 400, 'g', 65, 'cupboard', 'tin', '#d8b46a', 'round', 400),
  P(22, 'chopped-tomatoes', 'Chopped Tomatoes', '400 g', 400, 'g', 55, 'cupboard', 'tin', '#d0312a', 'round', 400),
  P(23, 'coconut-milk', 'Coconut Milk', '400 ml', 400, 'ml', 110, 'cupboard', 'tin', '#7a4a2a', 'drop', 400),
  P(24, 'frozen-mixed-vegetables', 'Frozen Mixed Vegetables', '900 g', 900, 'g', 250, 'frozen', 'bag', '#3f8fd0', 'grain', 900),
  P(25, 'crispy-potato-wedges', 'Crispy Potato Wedges', '1 kg', 1000, 'g', 290, 'frozen', 'bag', '#2a5fb0', 'crescent', 1000),
  P(26, 'orange-juice', 'Orange Juice', '1 litre', 1000, 'ml', 220, 'drinks', 'carton', '#f28c1c', 'round', 1000),
  P(27, 'sparkling-water', 'Sparkling Water', '6 × 500 ml', 3000, 'ml', 340, 'drinks', 'bottle', '#3aa7c9', 'bubble', 3000),
  P(28, 'laundry-liquid', 'Laundry Liquid', '35 washes', 35, 'wash', 720, 'household', 'jug', '#3a55c4', 'bubble', 0, 600),
  P(29, 'dishwasher-tablets', 'Dishwasher Tablets', '30 pack', 30, 'each', 650, 'household', 'box', '#1f9aa0', 'bubble', 0),
  P(30, 'baby-wipes-sensitive', 'Baby Wipes Sensitive', '12 × 56 wipes', 672, 'sheet', 800, 'baby', 'box', '#8ecbe6', 'drop', 0),
  P(31, 'nappies-size-4', 'Nappies Size 4', '52 pack', 52, 'each', 1090, 'baby', 'bag', '#f2a3c0', 'grain', 0),
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);
/** What a shopper pays today: the Saver price where there is one. */
export const currentPrice = (p) => p.offer ?? p.price;
