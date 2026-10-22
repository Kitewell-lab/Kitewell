# liquidityPoolShareCalc

`liquidityPoolShareCalc` is a backend calculation module that computes a liquidity pool depositor's share percentage using BigInt-safe arithmetic to prevent floating-point rounding inaccuracies.

## Capabilities

- Performs exact rational math: `sharePercentage = (userShares * 100) / totalShares`.
- Accepts numbers, decimal strings, and native BigInt inputs, automatically aligning fractional decimal scales.
- Applies half-up integer rounding to the requested decimal precision.
- Supports configurable precision (`decimals`), optional trailing zeros trimming, and optional percentage symbol.
- Exposes `tryCalcPoolSharePercentage` safe wrapper and `isValidPoolShares` validator.

## Public API

### `calcPoolSharePercentage(userShares, totalShares, options)`

Computes the percentage of pool ownership.

- **Parameters**:
  - `userShares` (`number|string|bigint`): Depositor's pool shares.
  - `totalShares` (`number|string|bigint`): Pool's total share supply.
  - `options` (`Object`, optional):
    - `decimals` (`number`, default: `4`): Decimal precision (0-20).
    - `includePercentSign` (`boolean`, default: `false`): Append `'%'` suffix.
    - `trimTrailingZeros` (`boolean`, default: `false`): Strip superfluous trailing zeros.
    - `round` (`boolean`, default: `true`): Apply half-up integer rounding.
- **Returns**: `string`
- **Throws**: `InvalidPoolShareError` if inputs are negative, non-numeric, or `totalShares <= 0`.

### `isValidPoolShares(userShares, totalShares, options)`

Returns `true` if inputs can be parsed and `totalShares > 0`, `false` otherwise.

### `tryCalcPoolSharePercentage(userShares, totalShares, options, fallback = '0.0000')`

Safe wrapper returning `fallback` instead of throwing on invalid inputs.

### `InvalidPoolShareError`

Custom Error class thrown on invalid input or division by zero.
