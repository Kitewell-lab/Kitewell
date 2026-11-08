# Transaction hash display formatter

`frontend/src/txHashFormat.js` formats a 64-character hexadecimal Stellar transaction hash into a shortened display form, for example `a1b2c3…d4e5f6`. Prefix and suffix lengths are configurable and the input is strictly validated. The module is standalone; wallet and UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Trims surrounding whitespace from the transaction hash.
- Validates that the input is a 64-character hexadecimal string (`0–9`, `a–f`, `A–F`).
- Keeps `prefixLength` characters from the start and `suffixLength` characters from the end, joining them with an ellipsis (default `…`).
- Returns the transaction hash unchanged when it already fits within `prefixLength + suffixLength` (e.g. `prefixLength + suffixLength >= 64`).
- Supports omitting a side entirely when its length is set to `0` (e.g. `{ prefixLength: 6, suffixLength: 0 }` yields `012345…`).
- Throws an `Error` with a clear message for missing, malformed, non-hexadecimal, or wrong length input, as well as for invalid length options.
- Provides `isValidTxHash(txHash)` boolean helper for quick validation checks without throwing.

## Public API

### `formatTxHash(txHash, options)` (also aliased as `txHashFormat`)

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `txHash` | `string` | — | 64-character hexadecimal transaction hash (trimmed before validation) |
| `options.prefixLength` | `number` | `6` | Characters kept from the start |
| `options.suffixLength` | `number` | `6` | Characters kept from the end |
| `options.ellipsis` | `string` | `"…"` | Custom separator string |

```js
import { formatTxHash, isValidTxHash } from "./txHashFormat";

formatTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
// => "012345…abcdef"

formatTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", {
  prefixLength: 4,
  suffixLength: 4,
});
// => "0123…cdef"

formatTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", {
  prefixLength: 8,
  suffixLength: 0,
});
// => "01234567…"

formatTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", {
  ellipsis: "...",
});
// => "012345...abcdef"
```

Throws when:

| Condition | Message |
| --- | --- |
| `txHash` is not a string | `Transaction hash must be a string.` |
| `txHash` is empty or whitespace-only | `Transaction hash is required.` |
| `txHash` is not a 64-char hex string | `Invalid transaction hash. Expected a 64-character hexadecimal string.` |
| A length is negative, fractional, or not a number | `<option> must be a non-negative integer.` |
| Both lengths are `0` | `prefixLength and suffixLength cannot both be 0.` |

### `isValidTxHash(txHash)`

Returns `true` if `txHash` is a string and represents a valid 64-character hexadecimal hash; `false` otherwise.

### Constants

- `ELLIPSIS` — the default `…` character inserted between the kept parts.
- `DEFAULT_PREFIX_LENGTH` — `6`.
- `DEFAULT_SUFFIX_LENGTH` — `6`.
- `TX_HASH_LENGTH` — `64`.

## Notes

- Tests live next to the module in `frontend/src/txHashFormat-*.test.js` and run with `npm test` from `frontend/`.
- Zero existing files were modified.
