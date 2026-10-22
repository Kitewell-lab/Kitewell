/**
 * @file txEnvelopeSizeEstimate.js
 * @description Estimates the approximate XDR-encoded byte size of a Stellar transaction envelope.
 * Uses documented per-operation, per-memo, and envelope constants (pure arithmetic, no XDR encoding).
 */

export const BASE_ENVELOPE_BYTES = 160;
export const PER_OPERATION_BYTES = 72;
export const SIGNATURE_BYTES = 68;
export const MAX_OPERATIONS = 100;

export const MEMO_BYTES_MAP = Object.freeze({
  MEMO_NONE: 4,
  MEMO_TEXT: 36,
  MEMO_ID: 12,
  MEMO_HASH: 36,
  MEMO_RETURN: 36,
});

/**
 * Custom error thrown when transaction envelope size estimation input is invalid.
 */
export class TxEnvelopeSizeEstimateError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_ENVELOPE_ESTIMATE_INPUT', context) {
    super(message);
    this.name = 'TxEnvelopeSizeEstimateError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Resolves options from positional or object argument patterns.
 */
function resolveOptions(arg1, arg2, arg3) {
  if (arg1 !== null && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    return {
      operationCount: arg1.operationCount ?? arg1.operations ?? 1,
      memoType: arg1.memoType ?? arg1.memo ?? 'MEMO_NONE',
      signatureCount: arg1.signatureCount ?? arg1.signatures ?? 1,
      options: arg2 ?? {},
    };
  }

  return {
    operationCount: arg1 ?? 1,
    memoType: arg2 ?? 'MEMO_NONE',
    signatureCount: (arg3 && typeof arg3 === 'object' ? arg3.signatureCount : arg3) ?? 1,
    options: (arg3 && typeof arg3 === 'object' ? arg3 : {}) ?? {},
  };
}

/**
 * Normalizes memo type string into a canonical enum key.
 *
 * @param {string} memoType
 * @returns {string}
 * @throws {TxEnvelopeSizeEstimateError}
 */
function normalizeMemoType(memoType) {
  if (memoType === null || memoType === undefined) {
    return 'MEMO_NONE';
  }

  if (typeof memoType !== 'string') {
    throw new TxEnvelopeSizeEstimateError(
      `memoType must be a string, got ${typeof memoType}`,
      'INVALID_MEMO_TYPE',
      { memoType }
    );
  }

  const clean = memoType.trim().toUpperCase();
  if (clean in MEMO_BYTES_MAP) {
    return clean;
  }

  // Support simplified names ('none', 'text', 'id', 'hash', 'return')
  const withPrefix = `MEMO_${clean}`;
  if (withPrefix in MEMO_BYTES_MAP) {
    return withPrefix;
  }

  throw new TxEnvelopeSizeEstimateError(
    `Unsupported memo type "${memoType}". Supported types: ${Object.keys(MEMO_BYTES_MAP).join(', ')}`,
    'UNSUPPORTED_MEMO_TYPE',
    { memoType, supported: Object.keys(MEMO_BYTES_MAP) }
  );
}

/**
 * Inspects envelope inputs and returns estimated size breakdown without throwing.
 *
 * @param {*} arg1
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @returns {{ ok: true, estimatedBytes: number, breakdown: { base: number, operations: number, memo: number, signatures: number }, operationCount: number, memoType: string, signatureCount: number } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkTxEnvelopeSize(arg1, arg2, arg3) {
  const { operationCount, memoType, signatureCount } = resolveOptions(arg1, arg2, arg3);

  // 1. Validate operationCount
  if (typeof operationCount !== 'number' || Number.isNaN(operationCount) || !Number.isFinite(operationCount)) {
    return {
      ok: false,
      code: 'INVALID_OPERATION_COUNT',
      error: `operationCount must be a finite number, got ${typeof operationCount}`,
      details: { operationCount },
    };
  }

  if (!Number.isInteger(operationCount)) {
    return {
      ok: false,
      code: 'NON_INTEGER_OPERATION_COUNT',
      error: `operationCount must be an integer, got ${operationCount}`,
      details: { operationCount },
    };
  }

  if (operationCount < 0) {
    return {
      ok: false,
      code: 'NEGATIVE_OPERATION_COUNT',
      error: `operationCount cannot be negative, got ${operationCount}`,
      details: { operationCount },
    };
  }

  if (operationCount > MAX_OPERATIONS) {
    return {
      ok: false,
      code: 'MAX_OPERATIONS_EXCEEDED',
      error: `operationCount exceeds protocol limit of ${MAX_OPERATIONS} (got ${operationCount})`,
      details: { operationCount, max: MAX_OPERATIONS },
    };
  }

  // 2. Validate memoType
  let normalizedMemo;
  try {
    normalizedMemo = normalizeMemoType(memoType);
  } catch (err) {
    if (err instanceof TxEnvelopeSizeEstimateError) {
      return {
        ok: false,
        code: err.code,
        error: err.message,
        details: err.context,
      };
    }
    return {
      ok: false,
      code: 'UNKNOWN_MEMO_ERROR',
      error: err.message,
    };
  }

  // 3. Validate signatureCount
  if (typeof signatureCount !== 'number' || Number.isNaN(signatureCount) || !Number.isFinite(signatureCount)) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE_COUNT',
      error: `signatureCount must be a finite number, got ${typeof signatureCount}`,
      details: { signatureCount },
    };
  }

  if (!Number.isInteger(signatureCount) || signatureCount < 0) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE_COUNT',
      error: `signatureCount must be a non-negative integer, got ${signatureCount}`,
      details: { signatureCount },
    };
  }

  const base = BASE_ENVELOPE_BYTES;
  const operations = operationCount * PER_OPERATION_BYTES;
  const memo = MEMO_BYTES_MAP[normalizedMemo];
  const signatures = signatureCount * SIGNATURE_BYTES;
  const estimatedBytes = base + operations + memo + signatures;

  return {
    ok: true,
    estimatedBytes,
    breakdown: {
      base,
      operations,
      memo,
      signatures,
    },
    operationCount,
    memoType: normalizedMemo,
    signatureCount,
  };
}

/**
 * Estimates transaction envelope XDR size in bytes, throwing on invalid inputs.
 *
 * @param {*} arg1
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @returns {number} Estimated envelope size in bytes
 * @throws {TxEnvelopeSizeEstimateError}
 */
export function estimateTxEnvelopeSize(arg1, arg2, arg3) {
  const result = checkTxEnvelopeSize(arg1, arg2, arg3);
  if (!result.ok) {
    throw new TxEnvelopeSizeEstimateError(result.error, result.code, result.details);
  }
  return result.estimatedBytes;
}

/**
 * Checks whether the input arguments can produce a valid estimation without throwing.
 *
 * @param {*} arg1
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @returns {boolean}
 */
export function isValidTxEnvelopeSizeInput(arg1, arg2, arg3) {
  return checkTxEnvelopeSize(arg1, arg2, arg3).ok;
}
