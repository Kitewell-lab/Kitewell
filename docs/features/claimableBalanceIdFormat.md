# Claimable balance ID formatter and validator

`frontend/src/claimableBalanceIdFormat.js` validates the shape of a Stellar Claimable Balance ID string (type-prefixed 72-hex-character format) and formats it for UI display with a shortened middle-ellipsis representation.

The module is standalone; UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Validates that an ID is a well-formed 72-character hexadecimal string (`/^[0-9a-fA-F]{72}$/`).
- Decomposes the 72-character ID into its 8-character type code and 64-character hash via `parseClaimableBalanceId`.
- Formats the ID into a compact representation with customizable prefix/suffix lengths and ellipsis (defaults to keeping the 8-character type prefix and 6-character trailing hash).
- Returns the full 72-character ID unmodified if `prefixLength + suffixLength >= 72`.
- Provides `tryFormatClaimableBalanceId` for safe rendering without throwing.
- Throws typed `InvalidClaimableBalanceIdError` for malformed IDs.

## Public API

### `isValidClaimableBalanceId(id)`

Returns `true` if `id` is a 72-character hexadecimal string, `false` otherwise.

```js
import { isValidClaimableBalanceId } from "./claimableBalanceIdFormat";

isValidClaimableBalanceId("00000000" + "a".repeat(64)); // true
isValidClaimableBalanceId("invalid-id");                 // false
```

### `parseClaimableBalanceId(id)`

Splits a 72-character ID into its 8-character type and 64-character hash.

```js
import { parseClaimableBalanceId } from "./claimableBalanceIdFormat";

const { type, hash } = parseClaimableBalanceId("00000000" + "b".repeat(64));
// type: "00000000"
// hash: "bbbb..." (64 chars)
```

### `formatClaimableBalanceId(id, optionsOrPrefix, suffixLength, ellipsis)`

Formats a Claimable Balance ID for display.

```js
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat";

const id = "00000000" + "1234567890abcdef" + "c".repeat(48);

// Default 8 + … + 6
formatClaimableBalanceId(id);
// => "00000000…cccccc"

// Positional arguments
formatClaimableBalanceId(id, 12, 4, "...");
// => "000000001234...cccc"

// Options object
formatClaimableBalanceId(id, { prefixLength: 10, suffixLength: 8 });
```

### `tryFormatClaimableBalanceId(id, options, fallback)`

Safely attempts to format an ID, returning `fallback` (default `null`) on failure.

```js
import { tryFormatClaimableBalanceId } from "./claimableBalanceIdFormat";

tryFormatClaimableBalanceId("invalid", {}, "N/A"); // "N/A"
```
