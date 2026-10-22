# Order book spread calculator

`backend/src/orderbookSpreadCalc.js` computes the bid-ask spread (absolute and percentage) from the top bid and top ask price of a Stellar Horizon order book response, using BigInt-safe rational arithmetic (zero floating-point math).

The module is standalone; backend route integration is out of scope.

## What it does

- Accepts Horizon orderbook rows (`{ price, price_r: { n, d } }`), direct rational pairs (`{ n, d }`), decimal strings, numbers, or BigInts.
- Computes exact rational bid-ask spread:
  - `absoluteSpread`: $Ask - Bid$
  - `percentageSpread`: $\frac{Ask - Bid}{Ask} \times 100\%$
  - `midPrice`: $\frac{Ask + Bid}{2}$
- Detects crossed order books ($Bid > Ask$) and sets `isCrossed: true`.
- Uses BigInt integer scaling with half-up rounding to prevent IEEE-754 precision artifacts.
- Enforces strictly positive prices ($price > 0$), rejecting zero and negative prices.
- Provides `tryCalcOrderbookSpread` for safe fallback execution without throwing.
- Throws typed `InvalidOrderbookPriceError` for invalid or non-positive price inputs.

## Public API

### `calcOrderbookSpread(topBid, topAsk, options)`

Calculates spread metrics from top bid and ask prices.

```js
import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

const result = calcOrderbookSpread("1.95", "2.00");
// => {
//   absoluteSpread: "0.0500000",
//   percentageSpread: "2.5000000%",
//   midPrice: "1.9750000",
//   bid: "1.9500000",
//   ask: "2.0000000",
//   isCrossed: false
// }

// Using Horizon price_r objects
calcOrderbookSpread(
  { price: "0.90", price_r: { n: 9, d: 10 } },
  { price: "1.00", price_r: { n: 1, d: 1 } }
);
```

### `isValidOrderbookPrice(price)`

Returns `true` if `price` is a valid positive price representation, `false` otherwise.

```js
import { isValidOrderbookPrice } from "./orderbookSpreadCalc.js";

isValidOrderbookPrice("1.50"); // true
isValidOrderbookPrice("0");    // false
isValidOrderbookPrice("-1");   // false
```

### `tryCalcOrderbookSpread(topBid, topAsk, options, fallback)`

Safely attempts to compute spread, returning `fallback` (default `null`) on failure.

```js
import { tryCalcOrderbookSpread } from "./orderbookSpreadCalc.js";

tryCalcOrderbookSpread("0", "1.0"); // null
tryCalcOrderbookSpread(null, "1.0", {}, "N/A"); // "N/A"
```
