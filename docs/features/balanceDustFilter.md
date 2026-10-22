# Balance dust filter

`filterDustBalances` filters an array of Horizon balance line objects, removing entries below a configurable minimum display threshold (in stroops) while always keeping the native XLM balance regardless of amount.

## Overview

In the Stellar network, an account's balances array returned by Horizon can contain multiple asset trustlines with zero or dust balances (often left over after swaps or dust spam). 

`filterDustBalances` filters out these dust entries to clean up the display, while strictly preserving the native XLM balance line (`asset_type === "native"`), which represents the core reserve and fee-paying balance of the account.

## Usage

```js
import { filterDustBalances, balanceDustFilter } from "./balanceDustFilter";

// Default threshold (1 stroop = 0.0000001 units): removes zero balances
const cleaned = filterDustBalances(account.balances);

// Custom threshold (e.g., 100,000 stroops = 0.0100000 units)
const withoutSmallDust = filterDustBalances(account.balances, 100_000n);

// Or using options object
const customOptions = balanceDustFilter(account.balances, {
  minThresholdStroops: 100_000,
});
```

## API

### `filterDustBalances(balances, optionsOrThreshold = 1n)`

- **`balances`** (`object[]`): The Horizon `balances` array.
- **`optionsOrThreshold`** (`number | bigint | { minThresholdStroops?: number | bigint }`): Minimum inclusive balance in stroops required to retain a credit asset. Defaults to `1n` (1 stroop).
- **Returns**: `object[]` — A new array containing only eligible non-dust balances and the native XLM balance.
- **Throws**:
  - `TypeError` if `balances` is not an array, or if any entry is not an object.
  - `RangeError` if the threshold is negative.
  - `TypeError` if the threshold is not a valid number or bigint.

The input array is never mutated.
