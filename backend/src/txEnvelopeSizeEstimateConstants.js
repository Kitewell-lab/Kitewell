/**
 * Documented byte constants and validation error messages for Stellar
 * transaction envelope size estimation.
 *
 * These constants represent approximate XDR byte sizes for a standard
 * single-signature `TransactionV1Envelope` without performing XDR encoding:
 * - `BASE_ENVELOPE_BYTES` (180): envelope type discriminant, source account,
 *   fee, sequence number, preconditions, operation count prefix, memo
 *   discriminant, extension union, and one decorated signature.
 * - `BYTES_PER_OPERATION` (64): per-operation overhead including optional
 *   source account discriminant, operation type discriminant, and a typical
 *   operation body.
 * - `MEMO_TYPE_BYTES`: additional XDR bytes contributed by each memo payload
 *   beyond the 4-byte memo discriminant included in `BASE_ENVELOPE_BYTES`.
 */

/** Base XDR byte overhead for a 1-signature TransactionV1Envelope. */
export const BASE_ENVELOPE_BYTES = 180;

/** Approximate XDR byte size per operation in a transaction envelope. */
export const BYTES_PER_OPERATION = 64;

/** Minimum operations permitted in a Stellar transaction, inclusive. */
export const MIN_OPERATIONS = 1;

/** Maximum operations permitted in a Stellar transaction, inclusive. */
export const MAX_OPERATIONS = 100;

/** Default memo type used when none is supplied. */
export const DEFAULT_MEMO_TYPE = "none";

/**
 * Additional XDR payload bytes per Stellar memo type.
 *
 * - `none`: 0 extra bytes (only the 4-byte discriminant in the base header)
 * - `text`: 32 bytes (4-byte length prefix + up to 28 UTF-8 bytes aligned to 4 bytes)
 * - `id`: 8 bytes (64-bit unsigned integer)
 * - `hash`: 32 bytes (32-byte hash)
 * - `return`: 32 bytes (32-byte return hash)
 */
export const MEMO_TYPE_BYTES = Object.freeze({
  none: 0,
  text: 32,
  id: 8,
  hash: 32,
  return: 32,
});

/** Canonical list of supported Stellar memo types. */
export const SUPPORTED_MEMO_TYPES = Object.freeze(
  Object.keys(MEMO_TYPE_BYTES),
);

/** Stable error messages returned by `estimateTxEnvelopeSize`. */
export const TX_ENVELOPE_SIZE_ERROR = Object.freeze({
  OP_COUNT_TYPE: "Operation count must be a number",
  OP_COUNT_INTEGER: "Operation count must be an integer",
  OP_COUNT_RANGE: "Operation count must be between 1 and 100",
  MEMO_TYPE_TYPE: "Memo type must be a string",
  MEMO_TYPE_UNKNOWN:
    "Unsupported memo type. Expected one of: none, text, id, hash, return",
  OPTIONS_TYPE:
    "Options must be a plain object with non-negative integer byte overrides",
});
