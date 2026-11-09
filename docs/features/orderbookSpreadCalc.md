# Order book spread calculator

`backend/src/orderbookSpreadCalc.js` computes the bid-ask spread (both absolute
and percentage) from the top bid and top ask of a Horizon `/order_book`
response using `BigInt`-safe rational arithmetic with zero floating-point math.

This module is standalone — it does not import `@stellar/stellar-sdk`, call
Horizon, or wire into `app.js` / `index.js`.

## Rational arithmetic

Top bid $B = \frac{n_b}{d_b}$ and top ask $A = \frac{n_a}{d_a}$ are read from
`bids[0]` and `asks[0]` (`price_r: { n, d }` or decimal `price` string):

$$\text{spread} = A - B = \frac{n_a d_b - n_b d_a}{d_a d_b}$$

## Public API

```js
import {
  calculateOrderbookSpread,
  tryCalculateOrderbookSpread,
} from "./orderbookSpreadCalc.js";

calculateOrderbookSpread({
  bids: [{ price_r: { n: 99, d: 100 }, price: "0.9900000" }],
  asks: [{ price_r: { n: 101, d: 100 }, price: "1.0100000" }],
});
// => {
//   absolute: "0.0200000",
//   percentage: "2.0000",
//   bidPrice: "0.9900000",
//   askPrice: "1.0100000",
//   midPrice: "1.0000000",
//   rational: { n: 1n, d: 50n },
// }
```

## Tests

`npm test` from `backend/` runs:

- `orderbookSpreadCalc-happy.test.js`
- `orderbookSpreadCalc-rational.test.js`
- `orderbookSpreadCalc-boundary.test.js`
- `orderbookSpreadCalc-options.test.js`
- `orderbookSpreadCalc-empty-book.test.js`
- `orderbookSpreadCalc-invalid-price.test.js`
- `orderbookSpreadCalc-invalid-input.test.js`
- `orderbookSpreadCalc-try-immutable.test.js`
