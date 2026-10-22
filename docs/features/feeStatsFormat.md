# Horizon fee stats formatter

`frontend/src/feeStatsFormat.js` formats a Horizon `/fee_stats` response object's percentile fields (p10..p99, min, max, mode) into an ordered array of `{ label, stroops }` rows for fee chart visualizations.

The module is standalone; UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Extracts percentile statistics from Horizon `/fee_stats` responses (defaulting to the `fee_charged` group, or customizable via `group: 'max_fee'`).
- Also accepts raw group objects directly without wrapper envelopes.
- Formats fields into a standardized, canonical order:
  - `Min` -> `p10` -> `p20` -> `p30` -> `p40` -> `p50` -> `p60` -> `p70` -> `p80` -> `p90` -> `p95` -> `p99` -> `Max` -> `Mode`.
- Converts string/number stroop values into integer numbers (or strings with `asString: true`).
- Gracefully handles sparse/partial responses by only including present fields.
- Provides `tryFormatFeeStats` for safe rendering without throwing.
- Throws typed `InvalidFeeStatsError` for invalid or negative inputs.

## Public API

### `formatFeeStats(rawStats, options)`

Formats fee stats JSON into an ordered array of `{ label, stroops }` objects.

```js
import { formatFeeStats } from "./feeStatsFormat";

const horizonResponse = {
  fee_charged: {
    min: "100",
    p50: "120",
    max: "1000",
    mode: "100"
  }
};

const rows = formatFeeStats(horizonResponse);
// => [
//   { label: "Min", stroops: 100 },
//   { label: "p50", stroops: 120 },
//   { label: "Max", stroops: 1000 },
//   { label: "Mode", stroops: 100 }
// ]

// Select max_fee group
formatFeeStats(horizonResponse, { group: "max_fee" });
```

### `isValidFeeStats(rawStats, options)`

Returns `true` if `rawStats` contains a valid fee stats structure, `false` otherwise.

```js
import { isValidFeeStats } from "./feeStatsFormat";

isValidFeeStats({ fee_charged: { min: "100" } }); // true
isValidFeeStats(null);                            // false
```

### `tryFormatFeeStats(rawStats, options, fallback)`

Safely attempts to format fee stats, returning `fallback` (default `[]`) on failure.

```js
import { tryFormatFeeStats } from "./feeStatsFormat";

tryFormatFeeStats(null); // []
```
