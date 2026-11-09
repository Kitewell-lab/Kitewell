# Multisig threshold satisfaction checker

`backend/src/multisigThresholdCheck.js` determines whether a given subset of
Stellar signer weights sums to at least a required operation threshold
(`0`–`255`) using pure arithmetic.

This module is standalone — it performs no cryptographic signature verification,
does not import `@stellar/stellar-sdk`, and is not wired into `app.js` or
`index.js`.

## Rules

1. `weights` must be an array of integers in `[0, 255]` (or plain signer objects
   `{ weight: number }` with `weight` in `[0, 255]`).
2. `threshold` must be an integer `number` in `[0, 255]`.
3. `satisfied` is `true` when `totalWeight >= threshold`; otherwise `shortfall`
   reports `threshold - totalWeight`.

## Public API

```js
import {
  assertMultisigThreshold,
  checkMultisigThreshold,
  isThresholdSatisfied,
} from "./multisigThresholdCheck.js";

checkMultisigThreshold([1, 2], 2);
// => { ok: true, satisfied: true, totalWeight: 3, threshold: 2, shortfall: 0 }

checkMultisigThreshold([1], 3);
// => { ok: true, satisfied: false, totalWeight: 1, threshold: 3, shortfall: 2 }

isThresholdSatisfied([2, 2], 3); // => true
assertMultisigThreshold([{ weight: 2 }, { weight: 3 }], 4);
// => { satisfied: true, totalWeight: 5, threshold: 4, shortfall: 0 }
```

## Tests

`npm test` from `backend/` runs:

- `multisigThresholdCheck-happy.test.js`
- `multisigThresholdCheck-shortfall.test.js`
- `multisigThresholdCheck-boundary.test.js`
- `multisigThresholdCheck-signer-objects.test.js`
- `multisigThresholdCheck-invalid-weights.test.js`
- `multisigThresholdCheck-invalid-threshold.test.js`
- `multisigThresholdCheck-predicate-assert.test.js`
- `multisigThresholdCheck-immutable.test.js`
