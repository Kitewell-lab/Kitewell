# Stellar signer weight validator

`backend/src/signerWeightValidate.js` validates that a Stellar account signer weight is an integer within the protocol range of `0` to `255` inclusive:

- **Weight 0**: Removes the signer from the account.
- **Weight 1-255**: Active signature weight.

## Exported API

### `checkSignerWeight(value, options)`

Inspects candidate signer weight and returns a typed result object without throwing:

```js
import { checkSignerWeight } from "../../backend/src/signerWeightValidate.js";

const result = checkSignerWeight(10);
// { ok: true, weight: 10, isRemoval: false }

const removalResult = checkSignerWeight(0);
// { ok: true, weight: 0, isRemoval: true }

const errorResult = checkSignerWeight(300);
// { ok: false, code: "WEIGHT_ABOVE_MAXIMUM", error: "...", details: { ... } }
```

### `validateSignerWeight(value, options)`

Returns the validated integer weight, or throws an `InvalidSignerWeightError` if validation fails.

### `isValidSignerWeight(value, options)`

Returns `true` if the value is a valid signer weight, `false` otherwise.

### `assertSignerWeight(value, options)`

Convenience alias for `validateSignerWeight`.

### Constants

- `MIN_SIGNER_WEIGHT`: `0`
- `MAX_SIGNER_WEIGHT`: `255`

### Options

- `allowString` (boolean, default: `true`): Whether integer strings like `"10"` are accepted and parsed into numbers.
