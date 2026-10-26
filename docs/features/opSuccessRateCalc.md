# Operation Success-Rate Calculator (`opSuccessRateCalc`)

The `opSuccessRateCalc` module provides utilities for computing and formatting success-rate metrics across Stellar Horizon and indexer operation records.

## Problem & Context

Stellar Horizon operations query endpoints return lists of operation records indicating transaction status either through the canonical `transaction_successful` boolean or a generic `successful` indicator.

This module provides a pure, zero-dependency calculator that consumes an array of operation records and calculates the exact success count, failure count, and ratio/percentage metrics.

## Public API

### `calculateOpSuccessRate(operations, options = {})`

Computes success statistics for a given list of operation records.

#### Parameters

- `operations` (`Array<object>`): An array of operation objects. Each object should contain a boolean `transaction_successful` or `successful` property.
- `options` (`object`, optional):
  - `asPercentage` (`boolean`, default: `false`): When `true`, returns `successRate` scaled to `0..100` instead of `0..1`.
  - `precision` (`number|null`, default: `null`): When provided as a non-negative integer, rounds `successRate` to that many decimal places.
  - `strict` (`boolean`, default: `true`): When `true`, throws a `TypeError` if a record is missing a boolean success property. When `false`, missing properties default to failed.

#### Returns

```js
{
  successRate: number, // Ratio (0..1) or percentage (0..100)
  successful: number,  // Count of successful operations
  failed: number,      // Count of failed operations
  total: number        // Total number of evaluated operations
}
```

#### Example

```js
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

const ops = [
  { id: "1", transaction_successful: true },
  { id: "2", transaction_successful: false },
  { id: "3", transaction_successful: true },
];

const stats = calculateOpSuccessRate(ops, { asPercentage: true, precision: 1 });
// => { successRate: 66.7, successful: 2, failed: 1, total: 3 }
```

---

### `formatSuccessRate(rate, options = {})`

Formats a numeric success rate into a localized percentage string.

#### Parameters

- `rate` (`number`): The rate value to format.
- `options` (`object`, optional):
  - `isPercentage` (`boolean`, default: `false`): Set to `true` if `rate` is already in the range `0..100`.
  - `decimals` (`number`, default: `2`): Number of decimal places.

#### Example

```js
import { formatSuccessRate } from "./opSuccessRateCalc.js";

formatSuccessRate(0.8525);
// => "85.25%"

formatSuccessRate(95.678, { isPercentage: true, decimals: 1 });
// => "95.7%"
```
