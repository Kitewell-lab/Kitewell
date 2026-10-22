# Memo byte-size estimator

`estimateMemoSize` (also exported as `memoSizeEstimate`) calculates the encoded byte length of a Stellar transaction memo against protocol limits without building the actual memo XDR structure.

## Overview

Stellar supports several memo types, each with strict byte size constraints:
- **`text`**: UTF-8 string up to 28 bytes.
- **`id`**: 64-bit unsigned integer (8 bytes, max $18,446,744,073,709,551,615$).
- **`hash`**: Exactly 32 bytes (64-character hex string or 32-byte binary).
- **`return`**: Exactly 32 bytes hash.
- **`none`**: 0 bytes.

## Usage

```js
import { estimateMemoSize, memoSizeEstimate } from "./memoSizeEstimate";

// Text memo
const textResult = estimateMemoSize("text", "Payment 123");
console.log(textResult.byteLength);     // 11
console.log(textResult.valid);          // true
console.log(textResult.remainingBytes); // 17

// Options object invocation
const idResult = memoSizeEstimate({
  type: "id",
  value: 12345678n,
});
console.log(idResult.valid);            // true
```

## API

### `estimateMemoSize(typeOrOptions, [value])`

- **`typeOrOptions`**: Memo type string (`"text" | "id" | "hash" | "return" | "none"`) or options object `{ type, value }`.
- **`value`**: The value to estimate.
- **Returns**:
  ```js
  {
    type: string,          // "text" | "id" | "hash" | "return" | "none"
    byteLength: number,    // Estimated encoded byte size
    maxBytes: number,      // Maximum allowed byte size for this type
    valid: boolean,        // Whether the value satisfies size and format rules
    remainingBytes: number // max(0, maxBytes - byteLength)
  }
  ```
- **Throws**:
  - `TypeError` if `type` is missing or not a known Stellar memo type.
