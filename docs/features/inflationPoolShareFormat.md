# Reserve ratio display formatter

`formatReserveRatio` (also exported as `inflationPoolShareFormat`) calculates an account's minimum required reserves and available spendable balance from its native balance, base reserve, and subentry count.

## Overview

In the Stellar protocol, accounts must maintain a minimum native XLM balance (reserve requirement) calculated as:
$$\text{usedReserves} = (2 + \text{subentryCount}) \times \text{baseReserve}$$
where:
- $2 \times \text{baseReserve}$ covers the account itself
- $1 \times \text{baseReserve}$ is required for each subentry (trustline, open offer, signer, data entry, etc.)
- Available spendable balance is $\max(0, \text{nativeBalance} - \text{usedReserves})$.

All calculations are executed in integer stroops ($10^7$ stroops per XLM) using BigInt to eliminate floating-point drift.

## Usage

```js
import {
  formatReserveRatio,
  inflationPoolShareFormat,
  DEFAULT_BASE_RESERVE_STROOPS,
  STROOPS_PER_XLM,
} from "./inflationPoolShareFormat.js";

// Standard account with 2 subentries and 10 XLM balance (0.5 XLM base reserve):
// usedReserves = (2 + 2) * 0.5 = 2.0 XLM
// availableBalance = 10.0 - 2.0 = 8.0 XLM
const res = formatReserveRatio("10.0", "0.5", 2);
console.log(res.usedReserves);     // "2.0000000"
console.log(res.availableBalance); // "8.0000000"

// Options object parameter:
const resObj = inflationPoolShareFormat({
  nativeBalance: "1.5",
  subentryCount: 3, // requires (2 + 3) * 0.5 = 2.5 XLM
});
console.log(resObj.usedReserves);     // "2.5000000"
console.log(resObj.availableBalance); // "0.0000000" (clamped to 0)
```

## API

### `formatReserveRatio(nativeBalanceOrOptions, [baseReserve], [subentryCount])`

- **`nativeBalanceOrOptions`**: String/number/BigInt or options object `{ nativeBalance, baseReserve, subentryCount }`.
- **`baseReserve`**: Base reserve in XLM or stroops (defaults to `0.5` XLM = `5000000n` stroops).
- **`subentryCount`**: Number of subentries (non-negative integer, defaults to `0`).
- **Returns**:
  ```js
  {
    usedReserves: string,             // 7-decimal formatted XLM string
    availableBalance: string,         // 7-decimal formatted XLM string
    usedReservesStroops: bigint,      // Exact stroops
    availableBalanceStroops: bigint   // Exact stroops
  }
  ```
- **Throws**:
  - `TypeError` if balance or counts are invalid/non-numeric.
  - `RangeError` if balance or subentry count is negative.

### Constants

`frontend/src/inflationPoolShareFormatConstants.js` exports:
- `STROOPS_PER_XLM`: `10_000_000n`
- `DEFAULT_BASE_RESERVE_STROOPS`: `5_000_000n`
- `ACCOUNT_BASE_RESERVE_MULTIPLIER`: `2n`
- `RESERVE_FORMAT_ERROR`: Error string dictionary.
