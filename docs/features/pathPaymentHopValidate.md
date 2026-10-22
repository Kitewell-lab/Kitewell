# Path payment hop list validator

`frontend/src/pathPaymentHopValidate.js` validates an array of intermediate path assets for Stellar path payment operations (`PathPaymentStrictReceive` and `PathPaymentStrictSend`).

## Rules Enforced

1. **Max Length**: Maximum of 5 intermediate hops (`MAX_PATH_HOPS = 5`). Empty array `[]` is permitted for direct payments.
2. **Well-formed Assets**: Each hop must be a valid native descriptor (`"native"`, `"XLM"`, `{ type: 'native' }`) or credit asset descriptor (`"CODE:ISSUER"`, `{ code, issuer }`).
3. **No Duplicate Consecutive Hops**: Identical consecutive assets are rejected (e.g. `[USDC:G..., USDC:G...]`). Non-consecutive duplicate hops are allowed.

## Exported API

### `checkPathHops(hops)`

Inspects an array of hops and returns a typed validation result without throwing:

```js
import { checkPathHops } from "./pathPaymentHopValidate";

const res = checkPathHops(["native", "USDC:GA5Z..."]);
// { ok: true, hopCount: 2, hops: [ ... ] }

const invalidRes = checkPathHops(["native", "native"]);
// { ok: false, code: "DUPLICATE_CONSECUTIVE_HOPS", error: "...", details: { ... } }
```

### `validatePathHops(hops)`

Validates hops and returns normalized hop items, throwing `PathPaymentHopValidationError` on failure.

### `isValidPathHops(hops)`

Returns a boolean indicating whether the hops array satisfies all constraints.

### `normalizeHopAsset(asset)`

Normalizes an individual asset into `{ canonical, type, code?, issuer? }`.

### Constants

- `MAX_PATH_HOPS`: `5`
