# Liquidity pool share percentage calculator

`backend/src/liquidityPoolShareCalc.js` computes a depositor's pool-share
percentage from their liquidity pool share balance and the pool's total shares
using `BigInt`-safe integer arithmetic, returning a fixed-precision decimal
string.

This module is standalone — it does not import `@stellar/stellar-sdk`, call
Horizon, or wire into `app.js` / `index.js`.

## Arithmetic and inputs

All inputs (`shareBalance` and `totalShares`) are scaled into integer stroops
(`10^7` per share unit) using `BigInt`:

- `BigInt` (`>= 0n`)
- Safe integer `number` (`Number.isSafeInteger` and `>= 0`)
- Decimal `string` with up to 7 fractional digits (Horizon format, e.g. `"250.0000000"`)

Floating-point numbers (`12.5`, `NaN`, `Infinity`) are rejected so IEEE-754
inaccuracy never enters the calculation.

## Public API

### `calculatePoolSharePercentage(shareBalance, totalShares, options)`

```js
import {
  calculatePoolSharePercentage,
  tryCalculatePoolSharePercentage,
} from "./liquidityPoolShareCalc.js";

calculatePoolSharePercentage("250.0000000", "1000.0000000");
// => "25.0000"

calculatePoolSharePercentage(2n, 3n, { precision: 4, rounding: "half-up" });
// => "66.6667"

calculatePoolSharePercentage(2n, 3n, { precision: 4, rounding: "down" });
// => "66.6666"

tryCalculatePoolSharePercentage("50", "0");
// => { ok: false, error: "totalShares must be greater than zero" }
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `shareBalance` | `bigint \| number \| string` | — | Depositor's pool share balance (`0 <= shareBalance <= totalShares`) |
| `totalShares` | `bigint \| number \| string` | — | Total shares in the liquidity pool (`> 0`) |
| `options.precision` | `number` | `4` | Decimal places in returned percentage string (`0`–`18`) |
| `options.rounding` | `"half-up" \| "down"` | `"half-up"` | Rounding mode applied to the final decimal place |

### `tryCalculatePoolSharePercentage(shareBalance, totalShares, options)`

Non-throwing companion that returns `{ ok: true, percentage }` or
`{ ok: false, error }`.

## Tests

`npm test` from `backend/` runs the `node:test` suites:

- `liquidityPoolShareCalc-happy.test.js`
- `liquidityPoolShareCalc-bigint.test.js`
- `liquidityPoolShareCalc-boundary.test.js`
- `liquidityPoolShareCalc-precision-rounding.test.js`
- `liquidityPoolShareCalc-invalid-share.test.js`
- `liquidityPoolShareCalc-invalid-total.test.js`
- `liquidityPoolShareCalc-invalid-options.test.js`
- `liquidityPoolShareCalc-try-immutable.test.js`
