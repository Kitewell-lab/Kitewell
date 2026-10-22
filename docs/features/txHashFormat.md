# Transaction hash display formatter

`frontend/src/txHashFormat.js` formats a 64-character hexadecimal transaction hash into a shortened display form with configurable prefix/suffix lengths and ellipsis delimiters. The input is strictly validated before truncation.

The module is standalone; UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Validates that the input is a 64-character hexadecimal string (`/^[0-9a-fA-F]{64}$/`).
- Truncates the hash to keep `prefixLength` characters from the start and `suffixLength` characters from the end, joined by a customizable `ellipsis` (default `…`).
- Returns the full 64-character hash unmodified if `prefixLength + suffixLength >= 64`.
- Supports zero-length prefix or suffix for single-sided truncation.
- Provides `tryFormatTxHash` for safe display formatting with fallback value without throwing.
- Throws typed `InvalidTxHashError` for malformed hashes, `TypeError` for non-finite lengths, and `RangeError` for negative lengths.

## Public API

### `isValidTxHash(hash)`

Returns `true` if `hash` is a 64-character hexadecimal string, `false` otherwise.

```js
import { isValidTxHash } from "./txHashFormat";

isValidTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"); // true
isValidTxHash("invalid-hash"); // false
```

### `formatTxHash(hash, optionsOrPrefix, suffixLength, ellipsis)`

Formats a 64-character transaction hash. Accepts either positional arguments or an options object.

| Argument / Option | Type | Default | Description |
| --- | --- | --- | --- |
| `hash` | `string` | — | 64-character hexadecimal transaction hash |
| `prefixLength` | `number` | `6` | Number of characters kept from the beginning |
| `suffixLength` | `number` | `6` | Number of characters kept from the end |
| `ellipsis` | `string` | `"…"` | Delimiter inserted between prefix and suffix |

```js
import { formatTxHash } from "./txHashFormat";

const HASH = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";

// Default 6 + … + 6
formatTxHash(HASH);
// => "a1b2c3…cdef0"

// Positional arguments
formatTxHash(HASH, 4, 8, "...");
// => "a1b2...89abcdef0"

// Options object
formatTxHash(HASH, { prefixLength: 8, suffixLength: 4 });
// => "a1b2c3d4…def0"
```

### `tryFormatTxHash(hash, options, fallback)`

Safely attempts to format a hash, returning `fallback` (default `null`) if `hash` is invalid.

```js
import { tryFormatTxHash } from "./txHashFormat";

tryFormatTxHash("not-a-hash", {}, "N/A");
// => "N/A"
```
