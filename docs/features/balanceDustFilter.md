# Horizon balance dust filter

`filterDustBalances` (also exported as `balanceDustFilter`) filters an array of Horizon balance line objects, removing entries below a configurable minimum display threshold (in stroops) while always keeping the native XLM balance regardless of amount.

## Overview

In wallet frontends, inactive accounts frequently collect tiny fractional spam/dust balances across various trustlines. Displaying these entries creates clutter.

`filterDustBalances` parses non-native balances into integer stroops ($10^7$ stroops per unit) using BigInt and filters out any non-native asset with balance strictly below the specified threshold. Native XLM balances are always preserved.

## Usage

```js
import {
  filterDustBalances,
  balanceDustFilter,
  DEFAULT_DUST_THRESHOLD_STROOPS,
} from "./balanceDustFilter.js";

const balances = [
  { asset_type: "native", balance: "0.0000000" }, // kept!
  { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "100.5000000" }, // kept!
  { asset_type: "credit_alphanum4", asset_code: "SPAM", balance: "0.0000000" }, // filtered
];

// Default: filters zero-balance non-native lines (threshold = 1 stroop)
const cleanBalances = filterDustBalances(balances);

// Custom threshold (e.g. 10 XLM units in stroops):
const highValueBalances = filterDustBalances(balances, {
  minThresholdStroops: 100_000_000n,
});
```

## API

### `filterDustBalances(balances, [optionsOrThreshold])`

- **`balances`**: Array of Horizon balance line objects (`asset_type`, `balance`, etc.).
- **`optionsOrThreshold`**: Minimum threshold in stroops (inclusive), as number, BigInt, or `{ minThresholdStroops }`. Defaults to `1n`.
- **Returns**: `object[]` (new array with dust entries excluded; does not mutate input).
- **Throws**:
  - `TypeError` if balances is not an array or an entry is not an object.
  - `RangeError` if threshold is negative.

### Constants

`frontend/src/balanceDustFilterConstants.js` exports:
- `STROOPS_PER_UNIT`: `10_000_000n`
- `DEFAULT_DUST_THRESHOLD_STROOPS`: `1n`
- `DUST_FILTER_ERROR`: Error string dictionary.
