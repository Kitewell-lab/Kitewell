# Operation success-rate calculator

`calculateOpSuccessRate` (also exported as `opSuccessRateCalc`) computes the success and failure metrics from an array of Horizon operation records based on their `transaction_successful` or `successful` booleans.

## Overview

When monitoring account activity or displaying transaction analytics in Stellar dashboards, determining the percentage of successful vs failed operations helps users assess network health and error rates.

`calculateOpSuccessRate` processes operation records, handling both standard Horizon `transaction_successful` fields and generic `successful` flags.

## Usage

```js
import { calculateOpSuccessRate, opSuccessRateCalc } from "./opSuccessRateCalc";

const operations = [
  { id: "1", type: "payment", transaction_successful: true },
  { id: "2", type: "change_trust", transaction_successful: true },
  { id: "3", type: "payment", transaction_successful: false },
];

const stats = calculateOpSuccessRate(operations);
console.log(stats.total);         // 3
console.log(stats.successful);    // 2
console.log(stats.failed);        // 1
console.log(stats.successRate);   // 66.7
console.log(stats.formattedRate); // "66.7%"

// Custom precision
const precise = calculateOpSuccessRate(operations, { precision: 2 });
console.log(precise.formattedRate); // "66.67%"
```

## API

### `calculateOpSuccessRate(operations, [options])`

- **`operations`**: Array of Horizon operation objects.
- **`options`**: `{ precision?: number }` (defaults to `1` decimal digit).
- **Returns**:
  ```js
  {
    successRate: number,       // Percentage (0 - 100)
    total: number,             // Total operations evaluated
    successful: number,        // Successful operations
    failed: number,            // Failed operations
    formattedRate: string      // e.g. "95.5%"
  }
  ```
- **Throws**:
  - `TypeError` if `operations` is not an array or if an element is not an object.
