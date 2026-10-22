# Asset code normalizer

`frontend/src/assetCodeNormalize.js` normalizes user-entered asset codes by trimming surrounding whitespace and uppercase-converting letters, throwing typed `InvalidAssetCodeError` or returning error objects for invalid inputs.

## What it does

- Trims leading and trailing whitespace.
- Uppercases all letters (e.g., `usdc` -> `USDC`).
- Enforces 1–12 character length bounds.
- Restricts characters strictly to alphanumeric `[A-Za-z0-9]`.
- Provides non-throwing `tryNormalizeAssetCode` helper returning `{ ok: true, code }` or `{ ok: false, error }`.

## Public API

### `normalizeAssetCode(value, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `unknown` | — | User-entered asset code string or number |
| `options.allowNative` | `boolean` | `false` | Whether to allow special "NATIVE" / "XLM" tokens |

### `tryNormalizeAssetCode(value, options)`

Returns `{ ok: true, code: string }` on success or `{ ok: false, error: InvalidAssetCodeError }` on error.

### Error Reasons

`InvalidAssetCodeError.reason` can be one of:
- `"invalid_type"`
- `"empty"`
- `"too_long"`
- `"invalid_charset"`

### Examples

```js
import { normalizeAssetCode, tryNormalizeAssetCode } from "./assetCodeNormalize";

normalizeAssetCode("  usdc  "); // => "USDC"
normalizeAssetCode("btc");       // => "BTC"

tryNormalizeAssetCode("bad-code!");
// => { ok: false, error: InvalidAssetCodeError }
```
