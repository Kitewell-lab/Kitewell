# Offer price ratio formatter

`frontend/src/offerPriceRatioFormat.js` converts a Horizon offer's `price` numerator/denominator pair (`price_r: { n, d }`) into a fixed-precision decimal display string without floating-point math, safely guarding against zero-denominator edge cases.

The module is standalone; UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Converts integer numerator/denominator pairs into decimal representations with customizable precision (default `7` decimals).
- Uses integer BigInt arithmetic with half-up rounding, eliminating IEEE-754 precision issues (e.g. `0.1 + 0.2`).
- Handles zero-denominator (`d = 0`) safely: throws `InvalidPriceRatioError` in strict mode or falls back to `N/A` in `tryFormatOfferPriceRatio`.
- Supports `{ n, d }`, `{ numerator, denominator }`, and positional `(n, d)` arguments.
- Supports optional `trimTrailingZeros: true` to strip superfluous zeros.
- Throws typed `InvalidPriceRatioError` for invalid or negative inputs.

## Public API

### `formatOfferPriceRatio(ratioOrN, optionsOrD, maybeOptions)`

Converts an offer's price ratio into a decimal string.

```js
import { formatOfferPriceRatio } from "./offerPriceRatioFormat";

// Default 7 decimal places
formatOfferPriceRatio({ n: 1, d: 2 });
// => "0.5000000"

// Custom precision
formatOfferPriceRatio({ n: 1, d: 3 }, { decimals: 4 });
// => "0.3333"

// Trimming trailing zeros
formatOfferPriceRatio({ n: 5, d: 2 }, { trimTrailingZeros: true });
// => "2.5"

// Positional arguments
formatOfferPriceRatio(3, 4);
// => "0.7500000"
```

### `isValidPriceRatio(ratioOrN, maybeD)`

Returns `true` if input is a valid non-negative integer ratio with `d > 0`.

```js
import { isValidPriceRatio } from "./offerPriceRatioFormat";

isValidPriceRatio({ n: 1, d: 2 }); // true
isValidPriceRatio({ n: 1, d: 0 }); // false (zero denominator)
isValidPriceRatio({ n: -1, d: 5 });// false (negative)
```

### `tryFormatOfferPriceRatio(ratioOrN, optionsOrD, fallback)`

Safely attempts to format a price ratio, returning `fallback` (default `'N/A'`) if invalid.

```js
import { tryFormatOfferPriceRatio } from "./offerPriceRatioFormat";

tryFormatOfferPriceRatio({ n: 1, d: 0 }); // "N/A"
tryFormatOfferPriceRatio(null, {}, "--");  // "--"
```
