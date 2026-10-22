# Asset amount clamp helper

`backend/src/assetAmountClamp.js` clamps a decimal amount string to an inclusive `[min, max]` range using BigInt-safe stroop-precision comparison, returning the original, min, or max string as appropriate.

## What it does

- Converts decimal amount strings into BigInt stroop values ($10^7$ stroops = 1 unit) to avoid JavaScript floating point errors.
- Compares amounts with stroop-level precision (down to $0.0000001$).
- Clamps values below `min` to `min`, and values above `max` to `max`.
- Retains original formatted input string when within `[min, max]`.
- Rejects negative amounts or decimal representations with more than 7 decimal places.

## Public API

### `clampAssetAmount(amount, minOrOptions, maybeMax)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `amount` | `string \| number \| bigint` | — | Target amount |
| `minOrOptions` | `string \| number \| bigint \| object` | — | Minimum bound or options object (`{ min, max }`) |
| `maybeMax` | `string \| number \| bigint` | `undefined` | Maximum bound when positional arguments are used |

### `amountToStroops(value, paramName)`

Converts a decimal string to its exact BigInt stroop representation.

### Examples

```js
import { clampAssetAmount } from "./assetAmountClamp.js";

// Basic clamping
clampAssetAmount("50.0", "10.0", "100.0"); // => "50.0"
clampAssetAmount("5.0", "10.0", "100.0");  // => "10.0"
clampAssetAmount("150.0", "10.0", "100.0"); // => "100.0"

// Options object
clampAssetAmount("5.0", { min: "10.0", max: "20.0" }); // => "10.0"
```
