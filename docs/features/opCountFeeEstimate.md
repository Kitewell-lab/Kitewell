# Operation-count fee estimator

`backend/src/opCountFeeEstimate.js` computes total transaction fees in stroops as `baseFeeStroops * operationCount` using BigInt-safe arithmetic, strictly rejecting non-positive or non-integer operation counts.

## What it does

- Computes `baseFeeStroops * operationCount` using JavaScript `BigInt` to prevent integer overflow.
- Rejects non-positive counts (0 or negative values) with `RangeError`.
- Rejects fractional or non-integer counts with `TypeError`.
- Provides both raw stroop `BigInt` estimation and structured breakdown with XLM string representation.

## Public API

### `estimateOpCountFee(operationCount, baseFeeStroops)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `operationCount` | `number \| string \| bigint` | — | Total number of operations (must be positive integer) |
| `baseFeeStroops` | `number \| string \| bigint` | `100n` | Base fee per operation in stroops |

### `estimateFeeDetails(operationCount, baseFeeStroops)`

Returns:
```js
{
  feeStroops: bigint,
  feeXlm: string,
  operationCount: bigint,
  baseFeeStroops: bigint
}
```

### Examples

```js
import { estimateOpCountFee, estimateFeeDetails } from "./opCountFeeEstimate.js";

estimateOpCountFee(5); // => 500n
estimateOpCountFee(2, 200n); // => 400n

estimateFeeDetails(10, 100);
// => { feeStroops: 1000n, feeXlm: "0.0001", operationCount: 10n, baseFeeStroops: 100n }
```
