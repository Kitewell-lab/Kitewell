# Liquidity pool share percentage calculator

`backend/src/liquidityPoolShareCalc.js` computes a depositor's pool share percentage from their pool share balance and the pool's total shares using BigInt-safe integer math and returns a fixed-precision decimal string.

## Features

- **BigInt Math**: Computes exact percentages using integer scaling and half-up rounding, preventing JavaScript floating-point inaccuracies.
- **Flexible Inputs**: Accepts `BigInt`, `number`, or decimal `string` representations.
- **Customizable Precision**: Supports 0 to 18 decimal places (default: `4`), with optional `'%'` suffix.
- **Validation**: Enforces non-negative balances, non-zero total shares, and ensures user shares do not exceed total shares.

## Exported API

### `calcLiquidityPoolShare(userShares, totalShares, options)`

Computes the percentage string. Throws `LiquidityPoolShareCalcError` if inputs are invalid.

```js
import { calcLiquidityPoolShare } from "../../backend/src/liquidityPoolShareCalc.js";

// Standard calculation
const share = calcLiquidityPoolShare(500, 1000);
// "50.0000"

// With custom precision and symbol
const formatted = calcLiquidityPoolShare("250", "1000", { precision: 2, includeSymbol: true });
// "25.00%"
```

### `checkLiquidityPoolShare(userShares, totalShares, options)`

Non-throwing alternative returning a structured result: `{ ok: true, percentage, userShares, totalShares }` or `{ ok: false, error, code, details }`.

### `calcPoolSharePercentage(userShares, totalShares, options)`

Convenience alias for `calcLiquidityPoolShare`.

### Constants

- `DEFAULT_PRECISION`: `4`
