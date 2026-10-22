# Reserve ratio display formatter

`formatReserveRatio` (also exported as `inflationPoolShareFormat`) formats an account's native balance and its base reserve requirements into a `{ usedReserves, availableBalance }` display pair using BigInt-safe stroop arithmetic.

## Overview

In the Stellar protocol, every account is required to maintain a minimum reserve of native XLM. The minimum required balance (used reserves) is governed by:

$$\text{usedReserves} = (2 + \text{subentryCount}) \times \text{baseReserve}$$

- $2 \times \text{baseReserve}$ for the base account entry.
- $1 \times \text{baseReserve}$ for each subentry (such as trustlines, offers, data entries, and signers).

The spendable balance (available balance) is:

$$\text{availableBalance} = \max(0, \text{nativeBalance} - \text{usedReserves})$$

All calculations are performed using exact 64-bit integer stroop arithmetic ($1\text{ XLM} = 10^7\text{ stroops}$) to eliminate floating-point rounding errors.

## Usage

```js
import { formatReserveRatio, inflationPoolShareFormat } from "./inflationPoolShareFormat";

// Positional invocation: formatReserveRatio(nativeBalance, baseReserve, subentryCount)
const display = formatReserveRatio("10.0000000", "0.5000000", 3);
console.log(display.usedReserves);     // "2.5000000"
console.log(display.availableBalance); // "7.5000000"

// Options object invocation
const info = inflationPoolShareFormat({
  nativeBalance: "25.0000000",
  baseReserve: "0.5000000",
  subentryCount: 4,
});
console.log(info.usedReserves);        // "3.0000000"
console.log(info.availableBalance);    // "22.0000000"
```

## API

### `formatReserveRatio(nativeBalanceOrOptions, [baseReserve], [subentryCount])`

- **`nativeBalanceOrOptions`**: Native XLM balance (as decimal string, number, bigint) or an options object `{ nativeBalance, baseReserve, subentryCount }`.
- **`baseReserve`**: Base reserve amount (defaults to `5,000,000n` stroops, equivalent to `0.5 XLM`).
- **`subentryCount`**: Non-negative integer count of account subentries (defaults to `0`).
- **Returns**:
  ```js
  {
    usedReserves: string,           // "2.5000000"
    availableBalance: string,       // "7.5000000"
    usedReservesStroops: bigint,    // 25000000n
    availableBalanceStroops: bigint // 75000000n
  }
  ```
- **Throws**:
  - `TypeError` if `nativeBalance` is missing or invalid.
  - `RangeError` if `nativeBalance`, `baseReserve`, or `subentryCount` is negative.
  - `TypeError` if `subentryCount` is not an integer.
