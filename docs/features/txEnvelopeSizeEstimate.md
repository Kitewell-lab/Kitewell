# Transaction envelope size estimator

`backend/src/txEnvelopeSizeEstimate.js` estimates the approximate XDR-encoded
byte size of a Stellar transaction envelope from its operation count and memo
type using documented byte constants and pure arithmetic. It does not perform
actual XDR encoding, import `@stellar/stellar-sdk`, or talk to Horizon. The
HTTP app does not import it; `app.js` and `index.js` are unchanged.

## Constants and formula

$$\text{bytes} = \text{baseEnvelopeBytes} + (\text{operationCount} \times \text{bytesPerOperation}) + \text{MEMO\_TYPE\_BYTES}[\text{memoType}]$$

Default constants in `backend/src/txEnvelopeSizeEstimateConstants.js`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `BASE_ENVELOPE_BYTES` | `180` | Fixed `TransactionV1Envelope` header + 1 decorated signature |
| `BYTES_PER_OPERATION` | `64` | Approximate XDR bytes per operation |
| `MIN_OPERATIONS` | `1` | Minimum operations per Stellar transaction |
| `MAX_OPERATIONS` | `100` | Maximum operations per Stellar transaction |
| `MEMO_TYPE_BYTES.none` | `0` | No extra payload beyond the 4-byte discriminant |
| `MEMO_TYPE_BYTES.id` | `8` | 64-bit unsigned integer memo |
| `MEMO_TYPE_BYTES.text` | `32` | 4-byte length prefix + up to 28 UTF-8 bytes |
| `MEMO_TYPE_BYTES.hash` | `32` | 32-byte hash memo |
| `MEMO_TYPE_BYTES.return` | `32` | 32-byte return hash memo |

## Public API

```js
import {
  assertTxEnvelopeSize,
  estimateTxEnvelopeSize,
} from "./txEnvelopeSizeEstimate.js";

estimateTxEnvelopeSize(1, "none");
// {
//   ok: true,
//   bytes: 244,
//   breakdown: {
//     baseBytes: 180,
//     operationsBytes: 64,
//     memoBytes: 0,
//     operationCount: 1,
//     memoType: "none",
//   },
// }

estimateTxEnvelopeSize(2, "text");
// { ok: true, bytes: 340, breakdown: { ... } }

estimateTxEnvelopeSize(0, "none");
// { ok: false, error: "Operation count must be between 1 and 100" }

assertTxEnvelopeSize(2, "text"); // 340
```

- `estimateTxEnvelopeSize(operationCount, memoType = "none", options)` returns
  `{ ok: true, bytes, breakdown }` or `{ ok: false, error }` without throwing.
- `assertTxEnvelopeSize(operationCount, memoType = "none", options)` returns
  `bytes` or throws an `Error` when validation fails.

## Tests

`npm test` from `backend/` runs the `node:test` suites:

- `txEnvelopeSizeEstimate-happy.test.js`
- `txEnvelopeSizeEstimate-memo-types.test.js`
- `txEnvelopeSizeEstimate-boundary.test.js`
- `txEnvelopeSizeEstimate-invalid-op-count.test.js`
- `txEnvelopeSizeEstimate-invalid-memo-type.test.js`
- `txEnvelopeSizeEstimate-options.test.js`
- `txEnvelopeSizeEstimate-assert.test.js`
- `txEnvelopeSizeEstimate-immutable.test.js`
