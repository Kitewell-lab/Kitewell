# Transaction time bounds validator

`backend/src/timeBoundsValidate.js` validates a `{ minTime, maxTime }` time-bounds pair (unix seconds) for Stellar transactions.

The module is standalone; backend route integration is out of scope.

## What it does

- Validates that `minTime` and `maxTime` are non-negative unix second integers (`number`, `string`, or `bigint`).
- Allows `maxTime = 0` to denote "no upper bound" (unbounded transaction validity in the future).
- Strictly rejects bounds where `minTime > maxTime` when an upper bound is set (`maxTime > 0`).
- Supports point intervals (`minTime === maxTime`), which represent valid 1-second execution windows.
- Normalizes parsed values into non-negative `BigInt` timestamps and exposes `hasUpperBound` flag.
- Provides `isTimeWithinBounds(timestamp, bounds)` for point-in-time checks against a configured window.
- Throws typed `InvalidTimeBoundsError` for invalid or malformed bounds.

## Public API

### `validateTimeBounds(bounds)`

Validates a `{ minTime, maxTime }` pair or positional `(minTime, maxTime)` arguments. Returns the normalized bounds object.

```js
import { validateTimeBounds } from "./timeBoundsValidate.js";

// Valid bounded interval
validateTimeBounds({ minTime: 1700000000, maxTime: 1700003600 });
// => { minTime: 1700000000n, maxTime: 1700003600n, hasUpperBound: true }

// Valid unbounded interval (maxTime = 0)
validateTimeBounds({ minTime: 1700000000, maxTime: 0 });
// => { minTime: 1700000000n, maxTime: 0n, hasUpperBound: false }
```

### `isValidTimeBounds(bounds)`

Returns a boolean indicating whether the input forms a valid time-bounds specification without throwing.

```js
import { isValidTimeBounds } from "./timeBoundsValidate.js";

isValidTimeBounds({ minTime: 100, maxTime: 200 }); // true
isValidTimeBounds({ minTime: 200, maxTime: 100 }); // false (minTime > maxTime)
isValidTimeBounds({ minTime: -1, maxTime: 100 });  // false (negative)
```

### `isTimeWithinBounds(timestamp, bounds)`

Tests whether a specific unix timestamp falls within the time bounds window (`minTime <= timestamp <= maxTime`).

```js
import { isTimeWithinBounds } from "./timeBoundsValidate.js";

isTimeWithinBounds(1500, { minTime: 1000, maxTime: 2000 }); // true
isTimeWithinBounds(2500, { minTime: 1000, maxTime: 2000 }); // false
isTimeWithinBounds(2500, { minTime: 1000, maxTime: 0 });    // true
```
