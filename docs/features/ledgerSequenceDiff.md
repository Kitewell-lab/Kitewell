# Ledger sequence difference calculator

`calculateLedgerDiff` (also exported as `ledgerSequenceDiff`) computes the non-negative ledger count difference between two ledger sequence numbers, validating non-negative integer bounds and clarifying which argument is newer.

## Overview

In Stellar and Soroban node operations, indexers and monitoring daemons frequently need to compare ledger sequences to evaluate synchronization lag, checkpoint advancement, or replay spans.

`calculateLedgerDiff` calculates the absolute difference between any two ledger sequences while maintaining clear directional context (`newer`, `older`, and `sign`).

## Usage

```js
import {
  calculateLedgerDiff,
  ledgerSequenceDiff,
  LEDGER_SEQUENCE_ARGUMENT,
  LEDGER_SEQUENCE_SIGN,
} from "./ledgerSequenceDiff.js";

// First argument is newer:
const res1 = calculateLedgerDiff(1050, 1000);
console.log(res1.difference); // 50
console.log(res1.newer);      // "first"
console.log(res1.older);      // "second"
console.log(res1.sign);       // 1

// Second argument is newer:
const res2 = calculateLedgerDiff(1000, 1050);
console.log(res2.difference); // 50
console.log(res2.newer);      // "second"
console.log(res2.older);      // "first"
console.log(res2.sign);       // -1

// Options object invocation:
const res3 = ledgerSequenceDiff({ current: 2000, previous: 1950 });
console.log(res3.difference); // 50
```

## API

### `calculateLedgerDiff(firstInput, [secondInput])`

- **`firstInput`**: First sequence (number, bigint, string) or options object `{ first, second }`.
- **`secondInput`**: Second sequence (number, bigint, string).
- **Returns**:
  ```js
  {
    difference: number,         // Non-negative integer difference
    differenceBigInt: bigint,   // BigInt difference
    newer: "first" | "second" | null,
    older: "first" | "second" | null,
    sign: 1 | -1 | 0,
    isEqual: boolean
  }
  ```
- **Throws**:
  - `TypeError` if either sequence is missing, not an integer, or non-numeric.
  - `RangeError` if either sequence is negative.

### Constants

`backend/src/ledgerSequenceDiffConstants.js` exports:
- `LEDGER_SEQUENCE_ARGUMENT`: `{ FIRST: "first", SECOND: "second", NEITHER: null }`
- `LEDGER_SEQUENCE_SIGN`: `{ FIRST_NEWER: 1, SECOND_NEWER: -1, EQUAL: 0 }`
- `LEDGER_SEQUENCE_ERROR`: Standard error fragments.
