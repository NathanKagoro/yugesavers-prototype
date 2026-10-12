// Recipes the store can bundle. Ingredients point at catalogue product ids, so the
// bundle rule can check them against near-expiry stock. `cupboard` lists things
// the shopper is assumed to have at home; they are not in the bundle.

export const TAGS = [
  { id: 'family', name: 'Family' },
  { id: 'quick', name: 'Quick' },
  { id: 'vegetarian', name: 'Vegetarian' },
  { id: 'student', name: 'Student' },
];

export const RECIPES = [
  {
    id: 1, name: 'Chicken Fajita Night', serves: 4, minutes: 25, tags: ['family', 'quick'],
    ingredients: [{ productId: 1, qty: 1 }, { productId: 2, qty: 1 }, { productId: 4, qty: 1 }, { productId: 15, qty: 1 }],
    cupboard: ['oil', 'paprika', 'cumin'],
    steps: [
      'Slice the peppers and one onion into strips.',
      'Cut the chicken into strips, toss with oil, paprika and cumin, and fry in a hot pan for 8 minutes.',
      'Add the peppers and onion and fry for 5 minutes more.',
      'Warm the wraps in a dry pan, fill and serve.',
    ],
  },
  {
    id: 2, name: 'Veggie Stir Fry', serves: 3, minutes: 20, tags: ['quick', 'vegetarian', 'student'],
    ingredients: [{ productId: 5, qty: 1 }, { productId: 6, qty: 1 }, { productId: 2, qty: 1 }, { productId: 18, qty: 1 }, { productId: 19, qty: 1 }],
    cupboard: ['oil', 'garlic'],
    steps: [
      'Cut the broccoli into small florets and slice two carrots and the peppers thinly.',
      'Cook the noodles as the packet says, then drain.',
      'Stir fry the vegetables in hot oil for 5 minutes.',
      'Add the noodles and three tablespoons of soy sauce, toss and serve.',
    ],
  },
  {
    id: 3, name: 'Family Pasta Bake', serves: 4, minutes: 40, tags: ['family', 'vegetarian'],
    ingredients: [{ productId: 16, qty: 1 }, { productId: 17, qty: 1 }, { productId: 10, qty: 1 }, { productId: 3, qty: 1 }],
    cupboard: ['salt'],
    steps: [
      'Boil the pasta until just tender, then drain.',
      'Stir in the sauce and the spinach until the leaves wilt.',
      'Tip into a dish and grate half the cheddar over the top.',
      'Bake at 200°C for 20 minutes until golden.',
    ],
  },
  {
    id: 4, name: 'One-Pan Sausage Tray', serves: 4, minutes: 45, tags: ['family'],
    ingredients: [{ productId: 9, qty: 1 }, { productId: 8, qty: 1 }, { productId: 2, qty: 1 }, { productId: 4, qty: 1 }],
    cupboard: ['oil', 'salt', 'pepper'],
    steps: [
      'Cut 800 g of potatoes into wedges and chop the peppers and two onions.',
      'Toss everything with oil on a large tray and lay the sausages on top.',
      'Roast at 200°C for 35 minutes, turning once.',
      'Serve straight from the tray.',
    ],
  },
  {
    id: 5, name: 'Speedy Omelette Wrap', serves: 2, minutes: 10, tags: ['quick', 'student', 'vegetarian'],
    ingredients: [{ productId: 12, qty: 1 }, { productId: 15, qty: 1 }, { productId: 3, qty: 1 }, { productId: 10, qty: 1 }],
    cupboard: ['butter'],
    steps: [
      'Whisk three eggs and cook as a thin omelette in a little butter.',
      'Lay a wrap on top while the egg is still soft, then flip.',
      'Add a handful of spinach and some grated cheddar.',
      'Fold, cut in half and serve. Repeat for the second wrap.',
    ],
  },
  {
    id: 6, name: 'Mushroom Noodle Pot', serves: 2, minutes: 15, tags: ['vegetarian', 'quick'],
    ingredients: [{ productId: 18, qty: 1 }, { productId: 7, qty: 1 }, { productId: 3, qty: 1 }, { productId: 19, qty: 1 }],
    cupboard: ['oil', 'garlic'],
    steps: [
      'Cook the noodles as the packet says, then drain.',
      'Slice the mushrooms and fry in hot oil until browned.',
      'Add the spinach and stir until it wilts.',
      'Toss with the noodles and two tablespoons of soy sauce.',
    ],
  },
  {
    id: 7, name: 'Student Pasta Cheese', serves: 3, minutes: 30, tags: ['student', 'vegetarian'],
    ingredients: [{ productId: 16, qty: 1 }, { productId: 10, qty: 1 }, { productId: 11, qty: 1 }, { productId: 13, qty: 1 }],
    cupboard: ['butter', 'flour'],
    steps: [
      'Boil 300 g of pasta until tender, then drain.',
      'Melt butter, stir in flour, then whisk in 500 ml of milk to make a sauce. Stir in 200 g of grated cheddar.',
      'Mix the pasta into the sauce and tip into a dish.',
      'Crumble two slices of bread over the top and grill until crisp.',
    ],
  },
  {
    id: 8, name: 'Chickpea Curry', serves: 4, minutes: 30, tags: ['vegetarian', 'family'],
    ingredients: [{ productId: 21, qty: 2 }, { productId: 22, qty: 1 }, { productId: 23, qty: 1 }, { productId: 20, qty: 1 }, { productId: 3, qty: 1 }, { productId: 4, qty: 1 }],
    cupboard: ['oil', 'curry powder'],
    steps: [
      'Chop one onion and soften it in oil with two teaspoons of curry powder.',
      'Add the drained chickpeas and the chopped tomatoes.',
      'Stir in the coconut milk and simmer for 15 minutes, adding the spinach at the end.',
      'Serve with 300 g of rice, boiled.',
    ],
  },
];

export const recipeById = (id) => RECIPES.find((r) => r.id === id);
