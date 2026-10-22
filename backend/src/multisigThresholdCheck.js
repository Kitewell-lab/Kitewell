/**
 * @file multisigThresholdCheck.js
 * @description Pure arithmetic validator determining whether a subset of signer weights satisfies a Stellar multisig threshold (0-255).
 */

/** Minimum allowed threshold/weight value in Stellar protocol. */
export const MIN_STELLAR_WEIGHT = 0;

/** Maximum allowed threshold/weight value in Stellar protocol (single byte integer). */
export const MAX_STELLAR_WEIGHT = 255;

/**
 * Custom error thrown when multisig threshold check receives invalid inputs.
 */
export class InvalidThresholdCheckError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidThresholdCheckError';
    this.context = context;
  }
}

/**
 * Normalizes and validates an individual weight or threshold integer.
 *
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error messages
 * @returns {number} Validated integer in [0, 255]
 * @throws {InvalidThresholdCheckError}
 */
function toValidWeightInteger(value, paramName) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidThresholdCheckError(
      `${paramName} is required and cannot be ${value === null ? 'null' : typeof value}`,
      { paramName, value }
    );
  }

  let num;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidThresholdCheckError(
        `${paramName} string must contain only digits, got "${value}"`,
        { paramName, value }
      );
    }
    num = Number(trimmed);
  } else if (typeof value === 'bigint') {
    num = Number(value);
  } else {
    throw new InvalidThresholdCheckError(
      `${paramName} must be a number, string, or bigint, got ${typeof value}`,
      { paramName, value }
    );
  }

  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new InvalidThresholdCheckError(
      `${paramName} must be a finite integer, got ${value}`,
      { paramName, value }
    );
  }

  if (num < MIN_STELLAR_WEIGHT || num > MAX_STELLAR_WEIGHT) {
    throw new InvalidThresholdCheckError(
      `${paramName} must be between ${MIN_STELLAR_WEIGHT} and ${MAX_STELLAR_WEIGHT}, got ${num}`,
      { paramName, value: num }
    );
  }

  return num;
}

/**
 * Extracts a numeric weight from a number, string, or signer object { weight }.
 *
 * @param {*} item - Weight number or signer object
 * @param {number} index - Item index in the weights list
 * @returns {number} Validated weight
 */
function extractWeight(item, index) {
  if (typeof item === 'object' && item !== null && 'weight' in item) {
    return toValidWeightInteger(item.weight, `Signer weight at index ${index}`);
  }
  return toValidWeightInteger(item, `Weight at index ${index}`);
}

/**
 * Evaluates whether a set of signer weights satisfies a multisig threshold.
 *
 * @param {Array<number|string|{weight: number|string}>} weights - List of signer weights
 * @param {number|string} threshold - Required threshold value (0-255)
 * @returns {{ satisfied: boolean, totalWeight: number, threshold: number, deficit: number, surplus: number }}
 * @throws {InvalidThresholdCheckError} If weights or threshold are invalid
 */
export function checkMultisigThreshold(weights, threshold) {
  if (!Array.isArray(weights)) {
    throw new InvalidThresholdCheckError(
      `Signer weights must be an array, got ${weights === null ? 'null' : typeof weights}`,
      { weights }
    );
  }

  const validThreshold = toValidWeightInteger(threshold, 'Threshold');

  let totalWeight = 0;
  for (let i = 0; i < weights.length; i += 1) {
    const w = extractWeight(weights[i], i);
    totalWeight += w;
  }

  const satisfied = totalWeight >= validThreshold;
  const deficit = satisfied ? 0 : validThreshold - totalWeight;
  const surplus = satisfied ? totalWeight - validThreshold : 0;

  return {
    satisfied,
    totalWeight,
    threshold: validThreshold,
    deficit,
    surplus
  };
}

/**
 * Quick boolean check whether total signer weight satisfies threshold.
 *
 * @param {Array<number|string|{weight: number|string}>} weights - List of weights
 * @param {number|string} threshold - Required threshold (0-255)
 * @returns {boolean} True if satisfied
 */
export function isThresholdSatisfied(weights, threshold) {
  const result = checkMultisigThreshold(weights, threshold);
  return result.satisfied;
}

/**
 * Safely evaluates multisig threshold without throwing, returning fallback on invalid input.
 *
 * @param {*} weights - List of weights
 * @param {*} threshold - Threshold
 * @param {*} [fallback=false] - Fallback boolean or object
 * @returns {boolean|*}
 */
export function tryCheckMultisigThreshold(weights, threshold, fallback = false) {
  try {
    return isThresholdSatisfied(weights, threshold);
  } catch (err) {
    if (err instanceof InvalidThresholdCheckError) {
      return fallback;
    }
    throw err;
  }
}
