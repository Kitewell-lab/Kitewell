# Balance percentage-change calculator

`frontend/src/percentageChangeCalc.js` computes the percentage change between two BigInt-safe balance values (e.g. for a 24h change indicator), safely handling zero-previous-balance edge cases without dividing by zero.

## What it does

- Converts balance strings into BigInt stroops ($10^7$ stroops = 1 unit) to avoid JavaScript floating point errors.
- Calculates scaled percentage change between `previous` and `current` balances.
- Categorizes movement direction: `"up"`, `"down"`, or `"flat"`.
- Safely handles zero previous balance without division by zero, returning `null` or customizable fallback.
- Formats signed percentage string with configurable decimal precision.

## Public API

### `calculatePercentageChange(previous, current, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `previous` | `string \| number \| bigint` | — | Previous balance |
| `current` | `string \| number \| bigint` | — | Current balance |
| `options.decimals` | `number` | `2` | Number of decimal places in `formatted` |
| `options.zeroPreviousFallback` | `number \| null` | `null` | Numeric percentage fallback when previous balance is 0 |
| `options.zeroPreviousFormat` | `string` | `"N/A"` | Formatted string when previous balance is 0 |

### Return Value

```js
{
  percentage: number | null,
  direction: "up" | "down" | "flat",
  difference: string,
  differenceStroops: bigint,
  formatted: string,
  isInfinite: boolean
}
```

### Examples

```js
import { calculatePercentageChange } from "./percentageChangeCalc";

// Regular positive change
calculatePercentageChange("100", "125");
// => { percentage: 25, direction: "up", difference: "+25", formatted: "+25.00%", isInfinite: false }

// Zero previous balance
calculatePercentageChange("0", "50");
// => { percentage: null, direction: "up", difference: "+50", formatted: "N/A", isInfinite: true }
```
