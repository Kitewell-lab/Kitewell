# Transaction envelope size estimator

`backend/src/txEnvelopeSizeEstimate.js` estimates the approximate XDR-encoded byte size of a Stellar transaction envelope based on operation count, memo type, and signature count.

Calculations are performed via documented constants using pure integer arithmetic (no actual XDR encoding or network calls).

## Sizing Model & Constants

- `BASE_ENVELOPE_BYTES` (`160`): Base overhead for source account, sequence number, fee, timebounds, vector counts, and envelope union discriminator.
- `PER_OPERATION_BYTES` (`72`): Typical per-operation payload overhead.
- `SIGNATURE_BYTES` (`68`): Per-signature overhead (4-byte hint + 64-byte Ed25519 signature).
- `MAX_OPERATIONS` (`100`): Maximum operations permitted in a single Stellar transaction envelope.
- `MEMO_BYTES_MAP`:
  - `MEMO_NONE`: 4 bytes
  - `MEMO_TEXT`: 36 bytes (discriminator + length + max 28-byte padded string)
  - `MEMO_ID`: 12 bytes (discriminator + uint64)
  - `MEMO_HASH`: 36 bytes (discriminator + 32-byte hash)
  - `MEMO_RETURN`: 36 bytes (discriminator + 32-byte hash)

## Exported API

### `estimateTxEnvelopeSize(arg1, arg2, arg3)`

Returns estimated total byte size. Accepts either positional arguments or an options object. Throws `TxEnvelopeSizeEstimateError` on invalid input.

```js
import { estimateTxEnvelopeSize } from "../../backend/src/txEnvelopeSizeEstimate.js";

// Positional arguments: (operationCount, memoType, signatureCount)
const size1 = estimateTxEnvelopeSize(1, "MEMO_NONE");
// 304

// Object arguments:
const size2 = estimateTxEnvelopeSize({
  operationCount: 3,
  memoType: "MEMO_TEXT",
  signatureCount: 2,
});
// 548
```

### `checkTxEnvelopeSize(arg1, arg2, arg3)`

Non-throwing alternative returning structured `{ ok: true, estimatedBytes, breakdown, operationCount, memoType, signatureCount }` or `{ ok: false, error, code, details }`.

### `isValidTxEnvelopeSizeInput(arg1, arg2, arg3)`

Returns boolean indicating whether inputs are valid.
