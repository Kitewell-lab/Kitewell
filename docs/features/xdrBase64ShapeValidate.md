# Base64 XDR shape validator

`backend/src/xdrBase64ShapeValidate.js` validates that a string plausibly represents base64-encoded XDR (correct base64 alphabet, padding, and length % 4 == 0) without attempting to decode or parse its contents.

## What it does

- Verifies that input contains only characters from standard Base64 alphabet `[A-Za-z0-9+/]`.
- Enforces length is a non-zero multiple of 4 (with customizable empty string support).
- Validates that `=` padding occurs only at the end and does not exceed 2 padding characters.
- Provides non-throwing predicate `isValidXdrBase64` and assertion helper `assertValidXdrBase64`.

## Public API

### `isValidXdrBase64(value, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `unknown` | — | The value to check |
| `options.allowEmpty` | `boolean` | `false` | Whether empty string evaluates to true |
| `options.trim` | `boolean` | `true` | Whether to trim whitespace before checking |

### `assertValidXdrBase64(value, name, options)`

Validates that `value` is valid Base64 string, throwing `TypeError` for non-string or `RangeError` for invalid length/characters.

### Examples

```js
import { isValidXdrBase64, assertValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

isValidXdrBase64("AAAAAA=="); // => true
isValidXdrBase64("invalid!"); // => false

assertValidXdrBase64("AAAAAA=="); // => "AAAAAA=="
```
