# Horizon Error Parse

A pure, standalone frontend utility for parsing Horizon error responses into human-readable reasons.

## Overview

When a Stellar transaction fails, Horizon returns an error response with detailed result codes in `extras.result_codes`. This module extracts those codes and maps them to human-readable error messages, making it easy to display meaningful error messages to users.

## Installation

```js
import { parseHorizonError, isTransactionFailedError, getOperationResultCodes, getTransactionResultCode } from "./horizonErrorParse";
```

## API

### `parseHorizonError(errorResponse)`

Parse a Horizon error response body into a human-readable reason and result codes.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `errorResponse` | `Object` | The raw Horizon error response body (parsed JSON) |

**Returns**

`HorizonErrorParseResult`:
```typescript
{
  reason: string;           // Human-readable error reason
  resultCodes: string[];    // All result codes (transaction + operations)
  errorType: string;        // Horizon error type URL
  status: number;           // HTTP status code
}
```

**Throws**

`Error` if `errorResponse` is null, undefined, not an object, or is an array.

**Example: Transaction Failed with Operation Codes**

```js
const error = {
  type: "https://stellar.org/horizon-errors/transaction_failed",
  title: "Transaction Failed",
  status: 400,
  detail: "The transaction failed when submitted to the stellar network.",
  extras: {
    result_codes: {
      transaction: "tx_failed",
      operations: ["op_underfunded"]
    },
    envelope_xdr: "...",
    result_xdr: "..."
  }
};

parseHorizonError(error);
// => {
//   reason: "Sending account does not have enough balance.",
//   resultCodes: ["tx_failed", "op_underfunded"],
//   errorType: "https://stellar.org/horizon-errors/transaction_failed",
//   status: 400
// }
```

**Example: Missing Result Codes**

```js
const error = {
  type: "https://stellar.org/horizon-errors/transaction_failed",
  status: 400
};

parseHorizonError(error);
// => {
//   reason: "Transaction failed (unknown reason).",
//   resultCodes: [],
//   errorType: "https://stellar.org/horizon-errors/transaction_failed",
//   status: 400
// }
```

**Example: Sequence Number Error**

```js
const error = {
  type: "https://stellar.org/horizon-errors/transaction_failed",
  status: 400,
  extras: {
    result_codes: {
      transaction: "tx_bad_seq",
      operations: []
    }
  }
};

parseHorizonError(error);
// => {
//   reason: "Transaction sequence number is invalid (too low or too high).",
//   resultCodes: ["tx_bad_seq"],
//   errorType: "https://stellar.org/horizon-errors/transaction_failed",
//   status: 400
// }
```

---

### `isTransactionFailedError(errorResponse)`

Check if an error response is a Horizon `transaction_failed` error.

**Parameters**

Same as `parseHorizonError`.

**Returns**

`boolean` — True if the error type is `https://stellar.org/horizon-errors/transaction_failed`.

**Example**

```js
isTransactionFailedError({ type: "https://stellar.org/horizon-errors/transaction_failed" });
// => true

isTransactionFailedError({ type: "https://stellar.org/horizon-errors/bad_request" });
// => false

isTransactionFailedError(null);
// => false
```

---

### `getOperationResultCodes(errorResponse)`

Extract just the operation result codes from a Horizon error response.

**Parameters**

Same as `parseHorizonError`.

**Returns**

`string[]` — Array of operation result codes (empty if none).

**Example**

```js
const error = {
  extras: {
    result_codes: {
      transaction: "tx_failed",
      operations: ["op_underfunded", "op_no_trust"]
    }
  }
};

getOperationResultCodes(error);
// => ["op_underfunded", "op_no_trust"]
```

---

### `getTransactionResultCode(errorResponse)`

Extract the transaction result code from a Horizon error response.

**Parameters**

Same as `parseHorizonError`.

**Returns**

`string|null` — Transaction result code or null if not present.

**Example**

```js
const error = {
  extras: {
    result_codes: {
      transaction: "tx_bad_seq",
      operations: ["op_underfunded"]
    }
  }
};

getTransactionResultCode(error);
// => "tx_bad_seq"
```

---

## Supported Result Codes

### Operation Codes (Mapped to Human-Readable Messages)

| Code | Message |
|------|---------|
| `op_underfunded` | Sending account does not have enough balance. |
| `op_no_trust` | Destination account does not trust the asset (missing trustline). |
| `op_no_issuer` | Asset issuer does not exist. |
| `op_not_authorized` | Destination account is not authorized to hold the asset. |
| `op_line_full` | Destination account trustline limit would be exceeded. |
| `op_no_path` | No path found between source and destination assets. |
| `op_too_few_offers` | Insufficient liquidity on the order book for the path. |
| `op_under_destmin` | Strict send path would receive less than destMin. |
| `op_over_sendmax` | Strict receive path would exceed sendMax. |
| `op_offer_cross_self` | Path would cross an offer from the same account. |
| `op_low_reserve` | Account does not have enough reserve for a new trustline. |
| `op_invalid_limit` | Trustline limit is invalid. |
| `op_trust_not_allowed` | Asset does not allow trustlines (auth_required not set). |
| `op_already_exist` | Destination account already exists. |

### Transaction Codes (Mapped to Human-Readable Messages)

| Code | Message |
|------|---------|
| `tx_bad_seq` | Transaction sequence number is invalid (too low or too high). |
| `tx_bad_auth` | Transaction authorization failed (missing or invalid signatures). |
| `tx_insufficient_fee` | Transaction fee is below the network minimum. |
| `tx_failed` | Transaction failed during execution. |
| `tx_internal_error` | Internal server error processing transaction. |
| `tx_too_early` | Transaction timebounds not yet reached. |
| `tx_too_late` | Transaction timebounds expired. |
| `tx_missing_operation` | Transaction has no operations. |
| `tx_bad_auth_extra` | Transaction has extra unauthorized signatures. |
| `tx_insufficient_balance` | Account has insufficient balance for fee or operations. |
| `tx_no_account` | Source account does not exist. |
| `tx_insufficient_reserve` | Account reserve insufficient for transaction. |

---

## Design Notes

- **Pure functions** — No side effects, no network calls, no global state
- **Operation codes take precedence** — When both transaction and operation codes are present, operation codes are checked first for more specific error messages
- **Fallback chain** — Operation code → Transaction code → `detail` → `title` → Generic message
- **Array-safe** — Explicitly rejects arrays (which are objects in JS)
- **Zero dependencies** — Only standard JavaScript/TypeScript
- **Extensible** — Easy to add new result code mappings by updating the constant maps

## Testing

Run the Vitest suite from the frontend directory:

```bash
cd frontend
npm test
```

Test files (one behavior per file):

| File | Covers |
|------|--------|
| `horizon-error-operation-codes.test.js` | Payment/path payment/change trust operation codes |
| `horizon-error-transaction-codes.test.js` | Transaction-level result codes |
| `horizon-error-multiple-operations.test.js` | Multiple operations, first-match precedence |
| `horizon-error-missing-codes.test.js` | Missing extras, result_codes, transaction code |
| `horizon-error-invalid-input.test.js` | Null, undefined, string, array, number inputs |
| `horizon-error-unknown-codes.test.js` | Unknown codes fall back to detail/title/generic |
| `horizon-error-change-trust-codes.test.js` | Change trust specific codes |
| `horizon-error-create-account-codes.test.js` | Create account specific codes |
| `horizon-error-helper-functions.test.js` | `isTransactionFailedError`, `getOperationResultCodes`, `getTransactionResultCode` |
| `horizon-error-edge-cases.test.js` | Status as string, null operations, empty object |

---

## When to Use

- **In catch blocks** — Parse Horizon errors from failed transactions before showing to users
- **In API wrappers** — Centralize error parsing in your Horizon API client
- **For logging** — Extract structured result codes for error tracking/analytics
- **In testing** — Mock Horizon error responses and verify parsing

## When Not to Use

- **For non-Horizon errors** — Only parses Horizon-formatted error responses
- **As a replacement for try/catch** — This only parses; you still need to catch the error first
- **For successful responses** — Only handles error response format

## Integration Example

```js
// In your transaction submission wrapper
import { parseHorizonError } from "./horizonErrorParse";

async function submitTransaction(signedXdr) {
  try {
    const response = await horizonServer.submitTransaction(signedXdr);
    return response;
  } catch (error) {
    // Parse Horizon error response
    if (error.response?.data) {
      const parsed = parseHorizonError(error.response.data);
      // Show user-friendly message
      throw new Error(parsed.reason);
    }
    // Re-throw non-Horizon errors
    throw error;
  }
}

// In your UI component
try {
  await submitPayment(...);
} catch (error) {
  // error.message is now human-readable
  showToast(error.message, "error");
}
```