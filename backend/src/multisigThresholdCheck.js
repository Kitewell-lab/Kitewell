/**
 * @file multisigThresholdCheck.js
 * @description Evaluates whether a subset of Stellar signer weights satisfies a target multisig threshold (0-255).
 * Pure arithmetic comparison without cryptographic signature verification.
 */

export const MIN_THRESHOLD = 0;
export const MAX_THRESHOLD = 255;
export const MIN_SIGNER_WEIGHT = 0;
export const MAX_SIGNER_WEIGHT = 255;

/**
 * Custom error thrown when multisig threshold check parameters are malformed.
 */
export class MultisigThresholdCheckError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_THRESHOLD_CHECK_INPUT', context) {
    super(message);
    this.name = 'MultisigThresholdCheckError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Custom error thrown when signer weights fail to meet the required threshold.
 */
export class MultisigThresholdNotSatisfiedError extends Error {
  /**
   * @param {string} message
   * @param {number} totalWeight
   * @param {number} threshold
   */
  constructor(message, totalWeight, threshold) {
    super(message);
    this.name = 'MultisigThresholdNotSatisfiedError';
    this.code = 'THRESHOLD_NOT_SATISFIED';
    this.totalWeight = totalWeight;
    this.threshold = threshold;
    this.deficit = Math.max(0, threshold - totalWeight);
  }
}

/**
 * Normalizes an individual weight item (supports raw number or object with a .weight property).
 *
 * @param {*} item
 * @returns {number}
 * @throws {MultisigThresholdCheckError}
 */
function extractWeight(item, index) {
  let val = item;
  if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
    if ('weight' in item) {
      val = item.weight;
    } else {
      throw new MultisigThresholdCheckError(
        `Signer item at index ${index} must have a numeric "weight" property`,
        'INVALID_SIGNER_OBJECT',
        { index, item }
      );
    }
  }

  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    throw new MultisigThresholdCheckError(
      `Signer weight at index ${index} must be a finite number, got ${typeof val}`,
      'INVALID_WEIGHT_TYPE',
      { index, item, val }
    );
  }

  if (!Number.isInteger(val)) {
    throw new MultisigThresholdCheckError(
      `Signer weight at index ${index} must be an integer, got ${val}`,
      'NON_INTEGER_WEIGHT',
      { index, val }
    );
  }

  if (val < MIN_SIGNER_WEIGHT || val > MAX_SIGNER_WEIGHT) {
    throw new MultisigThresholdCheckError(
      `Signer weight at index ${index} must be between ${MIN_SIGNER_WEIGHT} and ${MAX_SIGNER_WEIGHT}, got ${val}`,
      'WEIGHT_OUT_OF_RANGE',
      { index, val, min: MIN_SIGNER_WEIGHT, max: MAX_SIGNER_WEIGHT }
    );
  }

  return val;
}

/**
 * Evaluates whether the sum of provided signer weights satisfies the required threshold.
 *
 * @param {Array<number|{ weight: number }>} weights - Array of signer weights or objects with a weight property
 * @param {number} threshold - Target threshold (0-255)
 * @returns {{ ok: true, satisfied: boolean, totalWeight: number, threshold: number, deficit: number, excess: number } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkMultisigThreshold(weights, threshold) {
  if (!Array.isArray(weights)) {
    return {
      ok: false,
      code: 'INVALID_WEIGHTS_TYPE',
      error: `Signer weights must be an array, got ${weights === null ? 'null' : typeof weights}`,
      details: { weights },
    };
  }

  if (typeof threshold !== 'number' || Number.isNaN(threshold) || !Number.isFinite(threshold)) {
    return {
      ok: false,
      code: 'INVALID_THRESHOLD_TYPE',
      error: `Threshold must be a finite number, got ${typeof threshold}`,
      details: { threshold },
    };
  }

  if (!Number.isInteger(threshold)) {
    return {
      ok: false,
      code: 'NON_INTEGER_THRESHOLD',
      error: `Threshold must be an integer, got ${threshold}`,
      details: { threshold },
    };
  }

  if (threshold < MIN_THRESHOLD || threshold > MAX_THRESHOLD) {
    return {
      ok: false,
      code: 'THRESHOLD_OUT_OF_RANGE',
      error: `Threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}, got ${threshold}`,
      details: { threshold, min: MIN_THRESHOLD, max: MAX_THRESHOLD },
    };
  }

  let totalWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    try {
      totalWeight += extractWeight(weights[i], i);
    } catch (err) {
      if (err instanceof MultisigThresholdCheckError) {
        return {
          ok: false,
          code: err.code,
          error: err.message,
          details: err.context,
        };
      }
      return {
        ok: false,
        code: 'UNKNOWN_WEIGHT_ERROR',
        error: err.message,
      };
    }
  }

  const satisfied = totalWeight >= threshold;
  const deficit = Math.max(0, threshold - totalWeight);
  const excess = Math.max(0, totalWeight - threshold);

  return {
    ok: true,
    satisfied,
    totalWeight,
    threshold,
    deficit,
    excess,
  };
}

/**
 * Returns a boolean indicating whether the signer weights satisfy the threshold.
 * Throws MultisigThresholdCheckError if inputs are invalid.
 *
 * @param {Array<number|{ weight: number }>} weights
 * @param {number} threshold
 * @returns {boolean}
 * @throws {MultisigThresholdCheckError}
 */
export function isMultisigThresholdSatisfied(weights, threshold) {
  const result = checkMultisigThreshold(weights, threshold);
  if (!result.ok) {
    throw new MultisigThresholdCheckError(result.error, result.code, result.details);
  }
  return result.satisfied;
}

/**
 * Validates that weights satisfy the threshold, throwing MultisigThresholdNotSatisfiedError if not satisfied.
 *
 * @param {Array<number|{ weight: number }>} weights
 * @param {number} threshold
 * @returns {{ satisfied: true, totalWeight: number, threshold: number, excess: number }}
 * @throws {MultisigThresholdCheckError|MultisigThresholdNotSatisfiedError}
 */
export function assertMultisigThresholdSatisfied(weights, threshold) {
  const result = checkMultisigThreshold(weights, threshold);
  if (!result.ok) {
    throw new MultisigThresholdCheckError(result.error, result.code, result.details);
  }
  if (!result.satisfied) {
    throw new MultisigThresholdNotSatisfiedError(
      `Signer weights total ${result.totalWeight}, which does not meet required threshold of ${result.threshold} (deficit: ${result.deficit})`,
      result.totalWeight,
      result.threshold
    );
  }
  return {
    satisfied: true,
    totalWeight: result.totalWeight,
    threshold: result.threshold,
    excess: result.excess,
  };
}
