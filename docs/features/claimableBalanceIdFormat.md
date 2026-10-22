# claimableBalanceIdFormat

`claimableBalanceIdFormat` is a frontend utility for validating and formatting Stellar Claimable Balance IDs (72 hexadecimal characters: 8-character type prefix + 64-character SHA-256 hash).

## Capabilities

- Validates whether an input strictly conforms to the 72-hex character Claimable Balance ID format.
- Formats IDs into compact display strings with middle ellipses (e.g. `00000000…e5f6a1b2`).
- Supports configurable prefix length, suffix length, and custom ellipsis characters.
- Parses and separates the 8-character type prefix from the 64-character hash component.
- Provides a safe non-throwing formatter (`tryFormatClaimableBalanceId`) with customizable fallback.

## Public API

### `formatClaimableBalanceId(id, options)`

Formats a 72-hex character claimable balance ID into a shortened string with middle ellipsis.

- **Parameters**:
  - `id` (`string`): Raw 72-hex claimable balance ID.
  - `options` (`Object`, optional):
    - `prefixLength` (`number`, default: `8`): Leading character count.
    - `suffixLength` (`number`, default: `8`): Trailing character count.
    - `ellipsis` (`string`, default: `'…'`): Separator between prefix and suffix.
    - `lowercase` (`boolean`, default: `true`): Convert output to lowercase.
    - `trim` (`boolean`, default: `true`): Trim leading/trailing whitespace before parsing.
- **Returns**: `string`
- **Throws**: `InvalidClaimableBalanceIdError` if format is invalid; `RangeError` if lengths are negative.

### `parseClaimableBalanceId(id, options)`

Validates and parses the ID into `{ full, type, hash }`.

### `isValidClaimableBalanceId(id, options)`

Returns `true` if input is a valid 72-hex string, `false` otherwise.

### `tryFormatClaimableBalanceId(id, options, fallback = '')`

Safe formatter returning `fallback` instead of throwing on invalid inputs.

### `InvalidClaimableBalanceIdError`

Error subclass thrown when input validation fails.
