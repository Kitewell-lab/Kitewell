# Fee bump minimum fee calculator

`backend/src/feeBumpFeeCalc.js` computes the minimum total fee (in stroops) required for a CAP-0015 fee-bump transaction wrapping an inner transaction, using pure BigInt arithmetic without requiring XDR parsing or signing. The module is standalone; API route wiring (`app.js`, `index.js`) is out of scope.

## What it does

- Computes minimum total fee for CAP-0015 fee-bump transactions. Under CAP-0015, the effective operation count of a fee-bump transaction is `innerOpCount + 1`.
- Calculates total fee as:
  $$\text{totalFee} = (\text{innerOpCount} + 1) \times \text{perOpFee} + \text{resourceFee}$$
- Respects `innerTxFee` lower bounds (a fee bump transaction cannot pay less than the wrapped inner transaction).
- Converts stroop amounts to formatted XLM decimal strings without floating-point precision loss.
- Validates that operation counts are positive integers and fees are non-negative.

## Public API

### `calculateFeeBumpFee(innerOpCount, perOpFee, options)`

Calculates the minimum total fee in stroops.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `innerOpCount` | `number\|string\|bigint` | — | Number of operations in the inner transaction ($> 0$) |
| `perOpFee` | `number\|string\|bigint` | `100n` | Desired fee rate per operation in stroops |
| `options.resourceFee` | `number\|string\|bigint` | `0n` | Optional Soroban resource fee in stroops |
| `options.innerTxFee` | `number\|string\|bigint` | `undefined` | Optional existing inner transaction fee lower bound |

```js
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

// Standard 1-operation inner transaction with network base fee (100 stroops)
const fee = calculateFeeBumpFee(1);
// => 200n ((1 + 1) * 100)

// 2-operation transaction with custom fee rate and resource fee
const sorobanFee = calculateFeeBumpFee(2, 200, { resourceFee: 50000 });
// => 50600n ((2 + 1) * 200 + 50000)
```

### `calculateFeeBumpFeeDetails(innerOpCount, perOpFee, options)`

Returns a structured object containing breakdown metrics and formatted XLM string:

```js
import { calculateFeeBumpFeeDetails } from "./feeBumpFeeCalc.js";

const details = calculateFeeBumpFeeDetails(1, 100);
// => {
//   feeStroops: 200n,
//   feeXlm: "0.00002",
//   innerOpCount: 1n,
//   effectiveOpCount: 2n,
//   perOpFeeStroops: 100n,
//   resourceFeeStroops: 0n
// }
```

### `formatStroopsToXlm(stroops)`

Converts a BigInt stroop amount into an exact XLM string.

### Constants

- `DEFAULT_BASE_FEE_STROOPS`: `100n`
- `STROOPS_PER_XLM`: `10_000_000n`

## Notes

- Tests live alongside the module in `backend/src/feeBumpFeeCalc-*.test.js` and run with `npm test` from `backend/`.
- No existing files or routes are modified.
