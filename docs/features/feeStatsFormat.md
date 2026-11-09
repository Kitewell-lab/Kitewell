# Horizon fee stats formatter

`frontend/src/feeStatsFormat.js` formats a Horizon `/fee_stats` response
object's percentile and summary fields (`min`, `mode`, `p10..p99`, `max`) into
an ordered array of `{ label, stroops }` rows for a fee-chart UI.

This module is standalone — it does not call Horizon or wire into `App.jsx`,
`freighter.js`, or `stellar.js`.

## Canonical row order

`FEE_STATS_FIELDS`:
`min`, `mode`, `p10`, `p20`, `p30`, `p40`, `p50`, `p60`, `p70`, `p80`, `p90`,
`p95`, `p99`, `max`.

## Public API

```js
import { formatFeeStats, tryFormatFeeStats } from "./feeStatsFormat.js";

const rows = formatFeeStats(horizonFeeStatsJson);
// => [
//   { label: "min", stroops: 100 },
//   { label: "mode", stroops: 100 },
//   { label: "p10", stroops: 100 },
//   ...
//   { label: "max", stroops: 5000 },
// ]

const maxFeeRows = formatFeeStats(horizonFeeStatsJson, { bucket: "max_fee" });
```

## Tests

`npm test` (Vitest) from `frontend/` runs:

- `feeStatsFormat-happy.test.js`
- `feeStatsFormat-top-level.test.js`
- `feeStatsFormat-order.test.js`
- `feeStatsFormat-boundary.test.js`
- `feeStatsFormat-missing-field.test.js`
- `feeStatsFormat-invalid-stroops.test.js`
- `feeStatsFormat-invalid-input.test.js`
- `feeStatsFormat-try-immutable.test.js`
