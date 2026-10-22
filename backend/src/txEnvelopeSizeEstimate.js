/**
 * @file txEnvelopeSizeEstimate.js
 * @description Estimates approximate XDR-encoded byte size of a Stellar transaction envelope from operation count and memo type using documented constants.
 */

/**
 * Standard byte constants for Stellar transaction envelope size estimation.
 */
export const TX_SIZE_CONSTANTS = Object.freeze({
  BASE_ENVELOPE_BYTES: 200,
  BYTES_PER_OPERATION: 72,
  BYTES_PER_SIGNATURE: 68,
  MEMO_BYTES: Object.freeze({
    NONE: 4,
    TEXT: 36,
    ID: 12,
    HASH: 36,
    RETURN: 36
  }),
  MAX_OPERATIONS: 100,
  MAX_SIGNATURES: 20
});

/**
 * Custom error thrown when transaction envelope size estimation receives invalid parameters.
 */
export class InvalidTxEstimateError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidTxEstimateError';
    this.context = context;
  }
}

/**
 * Resolves and validates operation count and options from either (opCount, options) or ({ operationCount, ... }).
 *
 * @param {*} opCountOrOptions
 * @param {*} maybeOptions
 * @returns {{ opCount: number, memoType: string, sigCount: number }}
 */
function resolveParams(opCountOrOptions, maybeOptions = {}) {
  let rawOpCount;
  let options = {};

  if (typeof opCountOrOptions === 'object' && opCountOrOptions !== null) {
    rawOpCount = opCountOrOptions.operationCount ?? opCountOrOptions.operations;
    options = opCountOrOptions;
  } else {
    rawOpCount = opCountOrOptions;
    options = maybeOptions || {};
  }

  if (rawOpCount === null || rawOpCount === undefined) {
    throw new InvalidTxEstimateError('operationCount is required and cannot be null or undefined', { rawOpCount });
  }

  let opCount;
  if (typeof rawOpCount === 'number') {
    opCount = rawOpCount;
  } else if (typeof rawOpCount === 'string' && /^\d+$/.test(rawOpCount.trim())) {
    opCount = Number(rawOpCount.trim());
  } else {
    throw new InvalidTxEstimateError(`operationCount must be a non-negative integer, got ${rawOpCount}`, { rawOpCount });
  }

  if (!Number.isFinite(opCount) || !Number.isInteger(opCount) || opCount < 0 || opCount > TX_SIZE_CONSTANTS.MAX_OPERATIONS) {
    throw new InvalidTxEstimateError(
      `operationCount must be an integer between 0 and ${TX_SIZE_CONSTANTS.MAX_OPERATIONS}, got ${opCount}`,
      { opCount }
    );
  }

  const {
    memoType = 'none',
    signaturesCount = 1
  } = options;

  let sigCount = signaturesCount;
  if (typeof sigCount === 'string' && /^\d+$/.test(sigCount.trim())) {
    sigCount = Number(sigCount.trim());
  }
  if (typeof sigCount !== 'number' || !Number.isInteger(sigCount) || sigCount < 1 || sigCount > TX_SIZE_CONSTANTS.MAX_SIGNATURES) {
    throw new InvalidTxEstimateError(
      `signaturesCount must be an integer between 1 and ${TX_SIZE_CONSTANTS.MAX_SIGNATURES}, got ${signaturesCount}`,
      { signaturesCount }
    );
  }

  if (typeof memoType !== 'string') {
    throw new InvalidTxEstimateError(`memoType must be a string, got ${typeof memoType}`, { memoType });
  }

  const normalizedMemo = memoType.trim().toUpperCase();
  if (!(normalizedMemo in TX_SIZE_CONSTANTS.MEMO_BYTES)) {
    throw new InvalidTxEstimateError(
      `Unsupported memoType "${memoType}". Supported: ${Object.keys(TX_SIZE_CONSTANTS.MEMO_BYTES).join(', ')}`,
      { memoType }
    );
  }

  return { opCount, memoType: normalizedMemo.toLowerCase(), sigCount };
}

/**
 * Estimates the approximate XDR-encoded byte size of a Stellar transaction envelope.
 *
 * @param {number|Object} opCountOrOptions - Number of operations or options object
 * @param {Object} [options={}] - Options object if opCount passed first
 * @param {string} [options.memoType='none'] - Memo type ('none', 'text', 'id', 'hash', 'return')
 * @param {number} [options.signaturesCount=1] - Number of signatures attached
 * @returns {{ estimatedBytes: number, operationCount: number, signaturesCount: number, memoType: string, breakdown: { base: number, operations: number, signatures: number, memo: number } }}
 * @throws {InvalidTxEstimateError} If parameters are invalid
 */
export function estimateTxEnvelopeSize(opCountOrOptions, options = {}) {
  const { opCount, memoType, sigCount } = resolveParams(opCountOrOptions, options);

  const baseBytes = TX_SIZE_CONSTANTS.BASE_ENVELOPE_BYTES;
  const opBytes = opCount * TX_SIZE_CONSTANTS.BYTES_PER_OPERATION;
  const sigBytes = sigCount * TX_SIZE_CONSTANTS.BYTES_PER_SIGNATURE;
  const memoBytes = TX_SIZE_CONSTANTS.MEMO_BYTES[memoType.toUpperCase()];

  const totalBytes = baseBytes + opBytes + sigBytes + memoBytes;

  return {
    estimatedBytes: totalBytes,
    operationCount: opCount,
    signaturesCount: sigCount,
    memoType,
    breakdown: {
      base: baseBytes,
      operations: opBytes,
      signatures: sigBytes,
      memo: memoBytes
    }
  };
}

/**
 * Checks whether the parameters for transaction envelope size estimation are valid.
 *
 * @param {*} opCountOrOptions
 * @param {*} [options]
 * @returns {boolean} True if parameters are valid
 */
export function isValidTxEnvelopeParams(opCountOrOptions, options) {
  try {
    resolveParams(opCountOrOptions, options);
    return true;
  } catch (err) {
    if (err instanceof InvalidTxEstimateError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely estimates transaction envelope size without throwing on invalid input.
 *
 * @param {*} opCountOrOptions
 * @param {*} [options]
 * @param {*} [fallback=null]
 * @returns {{ estimatedBytes: number, operationCount: number, signaturesCount: number, memoType: string, breakdown: Object }|*}
 */
export function tryEstimateTxEnvelopeSize(opCountOrOptions, options, fallback = null) {
  try {
    return estimateTxEnvelopeSize(opCountOrOptions, options);
  } catch (err) {
    if (err instanceof InvalidTxEstimateError) {
      return fallback;
    }
    throw err;
  }
}
