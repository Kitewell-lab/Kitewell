# Path payment hop list validator

`frontend/src/pathPaymentHopValidate.js` validates an array of intermediate path
assets for a Stellar path payment operation (`pathPaymentStrictSend` /
`pathPaymentStrictReceive`).

This module is standalone — it performs pure validation with no network calls
and is not wired into `App.jsx`, `freighter.js`, or `stellar.js`.

## Validation rules

1. `hops` must be an `Array` containing between `0` and `5` elements inclusive
   (matching the Stellar protocol limit of 5 intermediate hops).
2. Each element must be a valid native asset (`{ isNative: true }` or
   `{ asset_type: "native" }`) or issued asset (`code` of 1–12 alphanumeric
   characters and `issuer` matching a 56-character `G...` public key).
3. No two consecutive hops (`hops[i - 1]` and `hops[i]`) may represent the same
   asset.

## Public API

```js
import {
  assertPathPaymentHops,
  isValidPathPaymentHops,
  validatePathPaymentHops,
} from "./pathPaymentHopValidate.js";

validatePathPaymentHops([
  { isNative: true },
  { code: "USDC", issuer: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" },
]);
// => {
//   ok: true,
//   hops: [
//     { isNative: true },
//     { isNative: false, code: "USDC", issuer: "G..." },
//   ],
// }

isValidPathPaymentHops([]); // => true
assertPathPaymentHops([{ isNative: true }]); // => [{ isNative: true }]
```

## Tests

`npm test` (Vitest) from `frontend/` runs:

- `pathPaymentHopValidate-happy.test.js`
- `pathPaymentHopValidate-empty-boundary.test.js`
- `pathPaymentHopValidate-max-length.test.js`
- `pathPaymentHopValidate-consecutive-duplicate.test.js`
- `pathPaymentHopValidate-invalid-hop.test.js`
- `pathPaymentHopValidate-invalid-input.test.js`
- `pathPaymentHopValidate-assert-predicate.test.js`
- `pathPaymentHopValidate-immutable.test.js`
