# YugeSavers prototype

A supermarket app prototype built around one idea, **rescue bundles**: store staff turn
stock that is about to go out of date into a discounted meal bundle with a recipe, and
shoppers see it in the app while there is still time to cook it.

It is a static site that looks like a discount supermarket on purpose: shelf-edge labels,
yellow reduced stickers, a till-receipt basket and a stock-room handheld for staff.

Hosted at <https://nathankagoro.github.io/yugesavers-prototype/> (once Pages is switched on,
see below). Part of [nathankagoro.com](https://nathankagoro.com).

## What you can do in it

- **Shop**: search, filter by aisle, add to a basket that is kept in `localStorage`.
- **Offers**: add a rescue bundle (the "left" count drops as you add), clip a coupon.
- **Basket**: a receipt with real totals, savings against shelf price, one free-delivery
  threshold (£30.00, otherwise £2.50) and the weight of near-expiry food rescued.
- **Staff door** (`staff.html`): tick near-expiry stock lines, generate a bundle, publish
  it, print a recipe poster. The bundle then appears on the shopper's Home and Offers pages.
  Open the two in separate tabs and the shopper tab updates by itself.

## What is real and what is illustrative

Real, and unit-tested:

- **The bundle rule** (`src/js/lib/bundles.js`). Each recipe is scored by the near-expiry
  stock its ingredients would use: 3 for a line due today, 2 for tomorrow, 1 for two days.
  The highest score wins; ties go to the recipe using more near-expiry lines, then fewer
  ordinary shelf items. The bundle is priced at 50%, 35% or 25% off the ingredients' shelf
  price, by its most urgent ingredient, rounded down to the nearest 5p. The number of
  bundles is what the scarcest near-expiry ingredient allows, up to 12.
- **The basket maths** (`src/js/lib/basket.js`, `money.js`). Integer pence throughout.
- **The barcodes** (`src/js/lib/barcode.js`). Genuine EAN-13 and Code 128 encodings, checked
  against an independent encoder. Product codes use the `20` prefix reserved for in-store
  numbering, so they do not collide with real products.

Illustrative:

- The Harbour Road store, the shopper "Sam", the products, prices, stock levels and recipes
  are invented demo data. The first two bundles are produced by the same rule at start-up,
  standing in for an early shift.
- The Saver Card is a demo card, not a loyalty scheme. Its QR code is a real one that
  links to this repository.
- No order is sent anywhere, nothing is charged and nothing is delivered. All state lives
  in your browser; "Reset demo data" on the Account page clears it.
- There is no AI in this. An earlier version described its fixed recipe list as
  "AI-generated"; the recipes are a fixed list, chosen by the rule above.
- Pack shots are drawings generated from the product data (`src/js/lib/pack.js`). The
  original prototype used photos downloaded from loremflickr.com with no recorded licence,
  so they are not in this repository.

## Run, build, test

Needs Node 22 or later.

```sh
npm ci
npm test              # 60 unit tests (node --test)
npm run build         # writes the site to dist/
npm run serve         # http://127.0.0.1:4380/yugesavers-prototype/
npm run screenshots   # browser flow check + screenshots at 1440, 390 and 360 px (needs Chrome)
```

`npm run screenshots` looks for Chrome in the usual places; set `CHROME` to its path if it
is somewhere else. `node scripts/og.mjs` redraws the social preview image after a build.

## Layout

```
src/pages/      one HTML fragment per page, wrapped in src/layout.html by the build
src/partials/   nav, icon sprite, the desktop side panels
src/css/app.css all styles (no framework)
src/js/lib/     pure, tested logic: money, basket, bundles, barcode, search, pack drawings
src/js/data/    demo catalogue, recipes, stock
src/js/pages/   page rendering (DOM nodes only, no innerHTML)
scripts/        build, local server, browser check, social image
test/           node --test suites
```

## Hosting

`.github/workflows/pages.yml` builds and deploys `dist/` to GitHub Pages on every push to
`main`. Pages has to be switched on once by hand: **Settings → Pages → Source: GitHub
Actions**. `.github/workflows/ci.yml` runs the tests, the build and the browser check on
every push and pull request, and uploads the screenshots as an artifact.

## Credits

Typefaces: [Archivo](https://github.com/Omnibus-Type/Archivo) and
[IBM Plex Mono](https://github.com/IBM/plex), both under the SIL Open Font License 1.1,
self-hosted as WOFF2.
