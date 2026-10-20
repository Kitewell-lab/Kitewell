# `amountFormat`

Converts between Stellar decimal amount strings and integer stroops. Pure and
local — all math is done on integers, so no floating point rounding occurs.

## What it does

- `toStroops("1.5")` → `15000000`
- `formatStroops(15000000)` → `"1.5000000"`

## Public API

### `toStroops(value): number|null`
Parses a decimal amount string into an integer stroop count. Accepts a bare
integer (`"5"`), optional trailing zeros, and leading zeros. Returns `null` for
empty input, negatives, locale commas, more than seven decimal places, or any
non-string input.

### `formatStroops(stroops): string|null`
Formats a non-negative integer stroop count as a fixed seven-decimal string.
Returns `null` for negative or non-integer values.

## Usage

```js
import { formatStroops, toStroops } from "./amountFormat.js";

toStroops("0.0000001"); // 1
formatStroops(1); // "0.0000001"
toStroops("1,5"); // null
```
