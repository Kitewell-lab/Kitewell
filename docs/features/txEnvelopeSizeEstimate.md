# txEnvelopeSizeEstimate

`txEnvelopeSizeEstimate` is a backend module that computes the approximate XDR-encoded byte size of a Stellar transaction envelope from its operation count, signatures count, and memo type using documented constants.

## Byte Breakdown Model

- **Base Envelope Overhead**: `200` bytes (Transaction source, sequence, fee, timebounds, ext).
- **Per Operation**: `72` bytes (Standard operation header and body padding).
- **Per Signature**: `68` bytes (4-byte hint + 64-byte Ed25519 signature).
- **Memo Overhead**:
  - `none`: `4` bytes
  - `text`: `36` bytes
  - `id`: `12` bytes
  - `hash`: `36` bytes
  - `return`: `36` bytes

## Public API

### `estimateTxEnvelopeSize(operationCount, options)`

Calculates approximate transaction envelope size in bytes.

- **Parameters**:
  - `operationCount` (`number|Object`): Operation count (0-100) or configuration object.
  - `options` (`Object`, optional):
    - `memoType` (`string`, default: `'none'`): `'none' | 'text' | 'id' | 'hash' | 'return'`.
    - `signaturesCount` (`number`, default: `1`): Signatures count (1-20).
- **Returns**: `{ estimatedBytes: number, operationCount: number, signaturesCount: number, memoType: string, breakdown: Object }`
- **Throws**: `InvalidTxEstimateError` on invalid values.

### `isValidTxEnvelopeParams(operationCount, options)`

Returns `true` if inputs are valid, `false` otherwise.

### `tryEstimateTxEnvelopeSize(operationCount, options, fallback = null)`

Safe wrapper returning `fallback` instead of throwing on invalid inputs.

### `TX_SIZE_CONSTANTS`

Exported byte constants map.

### `InvalidTxEstimateError`

Custom Error class thrown on validation failure.
