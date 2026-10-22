# feeStatsFormat

`feeStatsFormat` is a frontend helper module for transforming Horizon `/fee_stats` response payloads into ordered arrays of `{ label, stroops }` rows tailored for fee chart and table UI components.

## Capabilities

- Formats percentile fields (`min`, `p10`..`p99`, `max`, `mode`) into an ordered list.
- Supports both full Horizon responses (`fee_charged` or `max_fee`) and direct fee metrics objects.
- Normalizes integer string values into numbers for charting, with options to retain raw strings.
- Allows filtering out `mode` or `min`/`max` boundaries.
- Supports strict custom ordering and safe fallback handling (`tryFormatFeeStats`).

## Public API

### `formatFeeStats(rawStats, options)`

Formats fee stats object into an array of `{ label: string, stroops: number|string }`.

- **Parameters**:
  - `rawStats` (`Object`): Horizon response or fee stats object.
  - `options` (`Object`, optional):
    - `category` (`string`, default: `'fee_charged'`): Metric category to extract (`'fee_charged'` or `'max_fee'`).
    - `asNumber` (`boolean`, default: `true`): Whether stroops values should be numeric (`true`) or string (`false`).
    - `includeMode` (`boolean`, default: `true`): Include `mode` fee entry.
    - `includeMinMax` (`boolean`, default: `true`): Include `min` and `max` entries.
    - `keys` (`string[]`, optional): Explicit custom key list and order.
- **Returns**: `Array<{ label: string, stroops: number|string }>`
- **Throws**: `InvalidFeeStatsError` on invalid inputs or malformed values.

### `isValidFeeStats(rawStats, options)`

Returns `true` if formatting would succeed without errors, `false` otherwise.

### `tryFormatFeeStats(rawStats, options, fallback = [])`

Safe wrapper returning `fallback` instead of throwing on invalid inputs.

### `InvalidFeeStatsError`

Custom error subclass thrown when input validation fails.
