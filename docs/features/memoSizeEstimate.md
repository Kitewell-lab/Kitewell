# Memo byte-size estimator

`estimateMemoSize` (also exported as `memoSizeEstimate`) estimates the encoded byte size of a Stellar transaction memo against protocol limits without building the transaction envelope.

## Overview

Stellar transaction memos are strictly limited by type:
- `text`: up to 28 bytes encoded in UTF-8
- `id`: 64-bit unsigned integer (8 bytes, max value `18446744073709551615`)
- `hash`: 32 bytes (64-character hexadecimal or 32-byte Uint8Array)
- `return`: 32 bytes (64-character hexadecimal or 32-byte Uint8Array)
- `none`: 0 bytes

`estimateMemoSize` inspects inputs in real time, counts multibyte UTF-8 characters accurately, checks 64-bit bounds, and returns `{ type, byteLength, maxBytes, valid, remainingBytes }`.

## Usage

```js
import {
  estimateMemoSize,
  memoSizeEstimate,
  MEMO_LIMITS,
  MAX_MEMO_ID,
} from "./memoSizeEstimate.js";

// Text memo:
const textRes = estimateMemoSize("text", "Payment for order #1234");
console.log(textRes.byteLength);     // 23
console.log(textRes.remainingBytes); // 5
console.log(textRes.valid);          // true

// Multibyte UTF-8:
const emojiRes = estimateMemoSize("text", "Stellar 🚀");
console.log(emojiRes.byteLength);    // 12 (4 bytes for rocket)

// ID memo:
const idRes = estimateMemoSize("id", 12345678n);
console.log(idRes.byteLength);       // 8
console.log(idRes.valid);            // true

// Options object parameter:
const hashRes = memoSizeEstimate({
  type: "hash",
  value: "a".repeat(64),
});
console.log(hashRes.valid);          // true
```

## API

### `estimateMemoSize(typeOrOptions, [value])`

- **`typeOrOptions`**: Memo type string (`"text"`, `"id"`, `"hash"`, `"return"`, `"none"`) or options object `{ type, value }`.
- **`value`**: Memo content to evaluate.
- **Returns**:
  ```js
  {
    type: string,
    byteLength: number,
    maxBytes: number,
    valid: boolean,
    remainingBytes: number
  }
  ```
- **Throws**: `TypeError` when memo type is missing or unknown.

### Constants

`frontend/src/memoSizeEstimateConstants.js` exports:
- `MEMO_LIMITS`: `{ text: 28, id: 8, hash: 32, return: 32, none: 0 }`
- `MAX_MEMO_ID`: `18446744073709551615n`
- `MEMO_TYPES`: `["text", "id", "hash", "return", "none"]`
