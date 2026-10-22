# pathPaymentHopValidate

`pathPaymentHopValidate` is a frontend validation module for Stellar path payment operations, verifying that intermediate asset hop arrays adhere to Stellar network protocol constraints without making network calls.

## Constraints Enforced

- **Array Length**: Maximum of 5 intermediate hops (`MAX_PATH_HOPS = 5`).
- **Asset Descriptors**: Accepts `'native'` / `'XLM'` or credit assets formatted as `'CODE:ISSUER'` / `{ code, issuer }`.
- **No Duplicate Consecutive Hops**: Prevents pointless circular hops where two consecutive assets in the path are identical.

## Public API

### `validatePathPaymentHops(hops, options)`

Validates the hops array without throwing.

- **Parameters**:
  - `hops` (`Array`): Intermediate asset hops.
  - `options` (`Object`, optional):
    - `maxHops` (`number`, default: `5`): Maximum allowed hop count.
- **Returns**: Typed result:
  - If valid: `{ valid: true, count: number, normalizedHops: string[] }`
  - If invalid: `{ valid: false, count: number, error: string, code: string }`

### `isValidPathPaymentHops(hops, options)`

Returns `true` if hops array is valid, `false` otherwise.

### `assertValidPathPaymentHops(hops, options)`

Throws `PathHopValidationError` if invalid; returns success result otherwise.

### `MAX_PATH_HOPS`

Constant set to `5`.

### `HOP_ERROR_CODES`

Error codes (`NOT_AN_ARRAY`, `EXCEEDS_MAX_HOPS`, `INVALID_ASSET_DESCRIPTOR`, `DUPLICATE_CONSECUTIVE_HOPS`).

### `PathHopValidationError`

Error subclass thrown when validation fails.
