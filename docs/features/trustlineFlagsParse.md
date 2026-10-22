# Trustline flags bitmask parser

`backend/src/trustlineFlagsParse.js` parses a Stellar trustline's numeric flags bitmask into a structured object representing the documented protocol flag states.

The module is standalone; backend route integration is out of scope.

## What it does

- Parses a trustline's flags bitmask into three named boolean flags:
  - `authorized` (`0x1`): trustline is authorized to hold and trade the asset.
  - `authorizedToMaintainLiabilities` (`0x2`): trustline can only maintain existing orders/liabilities, cannot accept new payments.
  - `clawbackEnabled` (`0x4`): issuer can claw back asset balances from this trustline.
- Accepts `number`, decimal `string`, hex `string` (`0x...`), and `bigint` inputs.
- Preserves raw input bitmask value in `raw`.
- Provides inverse `buildTrustlineFlagsBitmask(flags)` for generating flags bitmasks.
- Guards against negative numbers, floats, null, and non-numeric strings.
- Throws typed `InvalidTrustlineFlagsError` for invalid inputs.

## Public API

### `STELLAR_TRUSTLINE_FLAGS`

Constant mapping of Stellar trustline flag bitmask constants:

```js
import { STELLAR_TRUSTLINE_FLAGS } from "./trustlineFlagsParse.js";

// { AUTHORIZED: 1, AUTHORIZED_TO_MAINTAIN_LIABILITIES: 2, CLAWBACK_ENABLED: 4 }
```

### `parseTrustlineFlags(flagsBitmask)`

Parses a numeric or string bitmask into named boolean properties.

```js
import { parseTrustlineFlags } from "./trustlineFlagsParse.js";

parseTrustlineFlags(1);
// => { authorized: true, authorizedToMaintainLiabilities: false, clawbackEnabled: false, raw: 1 }

parseTrustlineFlags(0);
// => { authorized: false, authorizedToMaintainLiabilities: false, clawbackEnabled: false, raw: 0 }
```

### `buildTrustlineFlagsBitmask(flags)`

Constructs an integer bitmask from named flags.

```js
import { buildTrustlineFlagsBitmask } from "./trustlineFlagsParse.js";

buildTrustlineFlagsBitmask({ authorized: true, clawbackEnabled: true });
// => 5
```

### `isValidTrustlineFlags(value)`

Returns `true` if `value` represents a valid non-negative integer flags bitmask, `false` otherwise.

```js
import { isValidTrustlineFlags } from "./trustlineFlagsParse.js";

isValidTrustlineFlags(7);   // true
isValidTrustlineFlags(-1);  // false
isValidTrustlineFlags("foo");// false
```
