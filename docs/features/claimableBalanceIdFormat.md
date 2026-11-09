# Claimable balance ID formatter/validator

`frontend/src/claimableBalanceIdFormat.js` validates Stellar claimable balance
ID strings (type-prefixed 72-hex-character format) and formats them for display
using a shortened middle-ellipsis form (`…`).

This module is standalone — it does not import `@stellar/stellar-sdk` or wire
into `App.jsx`, `freighter.js`, or `stellar.js`.

## Format rules

A Horizon claimable balance ID is a 72-character hexadecimal string:

- `8` hex characters (`"00000000"`) encoding the 4-byte XDR discriminant
  `CLAIMABLE_BALANCE_ID_TYPE_V0` (`0`)
- `64` hex characters encoding the 32-byte SHA-256 balance hash

## Public API

```js
import {
  formatClaimableBalanceId,
  isValidClaimableBalanceId,
  validateClaimableBalanceId,
} from "./claimableBalanceIdFormat.js";

const id =
  "00000000a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4ef987654";

formatClaimableBalanceId(id);
// => "000000…987654"

formatClaimableBalanceId(id, { prefixLength: 10, suffixLength: 8 });
// => "00000000a1…ef987654"

validateClaimableBalanceId(id);
// => { ok: true, id: "00000000a1b2c3d4..." }

isValidClaimableBalanceId(id); // => true
```

## Tests

`npm test` (Vitest) from `frontend/` runs:

- `claimableBalanceIdFormat-happy.test.js`
- `claimableBalanceIdFormat-custom-lengths.test.js`
- `claimableBalanceIdFormat-boundary.test.js`
- `claimableBalanceIdFormat-prefix.test.js`
- `claimableBalanceIdFormat-charset-length.test.js`
- `claimableBalanceIdFormat-invalid-input.test.js`
- `claimableBalanceIdFormat-invalid-options.test.js`
- `claimableBalanceIdFormat-validate-predicate.test.js`
