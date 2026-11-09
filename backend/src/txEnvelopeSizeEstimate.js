import {
  BASE_ENVELOPE_BYTES,
  BYTES_PER_OPERATION,
  DEFAULT_MEMO_TYPE,
  MAX_OPERATIONS,
  MEMO_TYPE_BYTES,
  MIN_OPERATIONS,
  TX_ENVELOPE_SIZE_ERROR,
} from "./txEnvelopeSizeEstimateConstants.js";

/**
 * Estimate the approximate XDR-encoded byte size of a Stellar transaction
 * envelope from its operation count and memo type using pure arithmetic.
 *
 * Total estimated bytes:
 * `baseEnvelopeBytes + (operationCount * bytesPerOperation) + MEMO_TYPE_BYTES[memoType]`
 *
 * Validation rules (checked in order):
 * 1. `operationCount` must be a `number` (no string/boolean/BigInt coercion).
 * 2. `operationCount` must be a finite integer (`Number.isInteger`).
 * 3. `operationCount` must be in the closed Stellar protocol range `[1, 100]`.
 * 4. `memoType` (defaults to `"none"` when `undefined`) must be a `string`
 *    matching one of `none`, `text`, `id`, `hash`, or `return` (case-insensitive,
 *    surrounding whitespace trimmed).
 * 5. `options` (optional) must be a plain object; if `baseEnvelopeBytes` or
 *    `bytesPerOperation` overrides are provided, each must be a non-negative
 *    safe integer.
 *
 * Invalid input returns `{ ok: false, error }` and never throws.
 *
 * @param {unknown} operationCount Number of operations in the transaction (1–100).
 * @param {unknown} [memoType="none"] Stellar memo type (`"none"`, `"text"`, `"id"`, `"hash"`, `"return"`).
 * @param {{ baseEnvelopeBytes?: number, bytesPerOperation?: number }} [options] Optional byte constant overrides.
 * @returns {{
 *   ok: true,
 *   bytes: number,
 *   breakdown: {
 *     baseBytes: number,
 *     operationsBytes: number,
 *     memoBytes: number,
 *     operationCount: number,
 *     memoType: string
 *   }
 * } | { ok: false, error: string }}
 *
 * @example
 * estimateTxEnvelopeSize(1, "none");
 * // {
 * //   ok: true,
 * //   bytes: 244,
 * //   breakdown: { baseBytes: 180, operationsBytes: 64, memoBytes: 0, operationCount: 1, memoType: "none" }
 * // }
 */
export function estimateTxEnvelopeSize(
  operationCount,
  memoType = DEFAULT_MEMO_TYPE,
  options = undefined,
) {
  if (typeof operationCount !== "number") {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_TYPE };
  }

  if (!Number.isInteger(operationCount)) {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_INTEGER };
  }

  if (operationCount < MIN_OPERATIONS || operationCount > MAX_OPERATIONS) {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_RANGE };
  }

  if (typeof memoType !== "string") {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.MEMO_TYPE_TYPE };
  }

  const normalizedMemo = memoType.trim().toLowerCase();
  if (!Object.hasOwn(MEMO_TYPE_BYTES, normalizedMemo)) {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.MEMO_TYPE_UNKNOWN };
  }

  const resolvedOptions = resolveOptions(options);
  if (!resolvedOptions.ok) {
    return { ok: false, error: resolvedOptions.error };
  }

  const baseBytes = resolvedOptions.baseEnvelopeBytes;
  const operationsBytes = operationCount * resolvedOptions.bytesPerOperation;
  const memoBytes = MEMO_TYPE_BYTES[normalizedMemo];
  const bytes = baseBytes + operationsBytes + memoBytes;

  return {
    ok: true,
    bytes,
    breakdown: {
      baseBytes,
      operationsBytes,
      memoBytes,
      operationCount,
      memoType: normalizedMemo,
    },
  };
}

/**
 * Estimate the XDR byte size of a Stellar transaction envelope or throw an
 * `Error` when any argument is invalid.
 *
 * @param {unknown} operationCount Number of operations in the transaction (1–100).
 * @param {unknown} [memoType="none"] Stellar memo type.
 * @param {{ baseEnvelopeBytes?: number, bytesPerOperation?: number }} [options] Optional byte constant overrides.
 * @returns {number} Estimated XDR envelope size in bytes.
 * @throws {Error} When validation fails.
 */
export function assertTxEnvelopeSize(
  operationCount,
  memoType = DEFAULT_MEMO_TYPE,
  options = undefined,
) {
  const result = estimateTxEnvelopeSize(operationCount, memoType, options);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.bytes;
}

/**
 * @param {unknown} options
 * @returns {{ ok: true, baseEnvelopeBytes: number, bytesPerOperation: number } | { ok: false, error: string }}
 */
function resolveOptions(options) {
  if (options === undefined) {
    return {
      ok: true,
      baseEnvelopeBytes: BASE_ENVELOPE_BYTES,
      bytesPerOperation: BYTES_PER_OPERATION,
    };
  }

  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.OPTIONS_TYPE };
  }

  const baseEnvelopeBytes = options.baseEnvelopeBytes ?? BASE_ENVELOPE_BYTES;
  const bytesPerOperation = options.bytesPerOperation ?? BYTES_PER_OPERATION;

  if (
    !Number.isSafeInteger(baseEnvelopeBytes) ||
    baseEnvelopeBytes < 0 ||
    !Number.isSafeInteger(bytesPerOperation) ||
    bytesPerOperation < 0
  ) {
    return { ok: false, error: TX_ENVELOPE_SIZE_ERROR.OPTIONS_TYPE };
  }

  return { ok: true, baseEnvelopeBytes, bytesPerOperation };
}
