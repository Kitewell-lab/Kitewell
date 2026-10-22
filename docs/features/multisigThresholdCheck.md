# Multisig threshold satisfaction checker

`backend/src/multisigThresholdCheck.js` determines whether a subset of Stellar signer weights satisfies a target account multisig threshold value (`0-255`).

This module performs pure arithmetic calculation without cryptographic signature verification.

## Exported API

### `checkMultisigThreshold(weights, threshold)`

Evaluates whether the sum of weights reaches or exceeds `threshold`. Returns a typed result object without throwing:

```js
import { checkMultisigThreshold } from "../../backend/src/multisigThresholdCheck.js";

// 1. Threshold satisfied
const result = checkMultisigThreshold([1, 1], 2);
// { ok: true, satisfied: true, totalWeight: 2, threshold: 2, deficit: 0, excess: 0 }

// 2. Deficit
const deficitResult = checkMultisigThreshold([1], 2);
// { ok: true, satisfied: false, totalWeight: 1, threshold: 2, deficit: 1, excess: 0 }

// 3. Weight objects
const objectResult = checkMultisigThreshold([{ key: "G...", weight: 10 }, { key: "G...", weight: 15 }], 20);
// { ok: true, satisfied: true, totalWeight: 25, threshold: 20, deficit: 0, excess: 5 }
```

### `isMultisigThresholdSatisfied(weights, threshold)`

Returns a boolean indicating whether the threshold is met, throwing a `MultisigThresholdCheckError` if inputs are invalid.

### `assertMultisigThresholdSatisfied(weights, threshold)`

Throws a `MultisigThresholdNotSatisfiedError` if `totalWeight < threshold`.

### Error Types

- `MultisigThresholdCheckError`: Thrown when inputs are malformed (non-array weights, out-of-range weights/thresholds, floats, NaN/Infinity).
- `MultisigThresholdNotSatisfiedError`: Thrown by `assertMultisigThresholdSatisfied` when weights are insufficient, exposing `.totalWeight`, `.threshold`, and `.deficit`.
