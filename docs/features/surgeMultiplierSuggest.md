# Surge pricing multiplier suggester

`backend/src/surgeMultiplierSuggest.js` suggests a base-fee multiplier (e.g. 1x / 1.5x / 2x / 2.5x) based on recent Horizon fee-stats percentiles and ledger capacity usage to improve inclusion speed without network overhead.

## What it does

- Analyzes Horizon `/fee_stats` payload (`ledger_capacity_usage` or `fee_charged` percentiles).
- Dynamically assigns multipliers based on ledger capacity congestion levels:
  - `< 0.50`: 1.0x (low congestion)
  - `0.50 – 0.79`: 1.5x (medium congestion)
  - `0.80 – 0.94`: 2.0x (high congestion)
  - `>= 0.95`: 2.5x (critical congestion)
- Supports explicit priority tiers (`standard`, `priority`, `urgent`, `critical`).
- Computes recommended total fee in stroops.
- Pure in-memory calculation with no external dependencies or network calls.

## Public API

### `suggestSurgeMultiplier(feeStats, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `feeStats` | `object` | — | Horizon `/fee_stats` response object |
| `options.priority` | `string` | `undefined` | Target priority tier (`"standard"`, `"priority"`, `"high"`, `"urgent"`, etc.) |
| `options.baseFee` | `number` | `100` | Base fee override |
| `options.minMultiplier` | `number` | `1.0` | Minimum allowed multiplier |
| `options.maxMultiplier` | `number` | `10.0` | Maximum allowed multiplier |

### Return Value

```js
{
  multiplier: number,
  tier: string,
  capacityUsage: number | null,
  recommendedFee: number | null
}
```

### Examples

```js
import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

const stats = {
  last_ledger_base_fee: "100",
  ledger_capacity_usage: "0.85",
};

suggestSurgeMultiplier(stats);
// => { multiplier: 2.0, tier: "high", capacityUsage: 0.85, recommendedFee: 200 }
```
