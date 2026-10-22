/**
 * @file signerWeightValidate.js
 * @description Validates Stellar account signer weights (0-255 uint8 range).
 * Signer weight 0 indicates signer removal; 1-255 indicates active signature voting weight.
 */

export const MIN_SIGNER_WEIGHT = 0;
export const MAX_SIGNER_WEIGHT = 255;

/**
 * Custom error thrown when a signer weight is invalid.
 */
export class InvalidSignerWeightError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_SIGNER_WEIGHT', context) {
    super(message);
    this.name = 'InvalidSignerWeightError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Inspects a signer weight candidate and returns a typed ok/error result without throwing.
 *
 * @param {*} value - The candidate signer weight
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.allowString=true] - Whether to accept numeric strings like "10"
 * @returns {{ ok: true, weight: number, isRemoval: boolean } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkSignerWeight(value, options = {}) {
  const { allowString = true } = options;

  if (value === null || value === undefined) {
    return {
      ok: false,
      code: 'MISSING_WEIGHT',
      error: `Signer weight cannot be ${value === null ? 'null' : 'undefined'}`,
      details: { value },
    };
  }

  let numericValue;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string' && allowString) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return {
        ok: false,
        code: 'EMPTY_STRING_WEIGHT',
        error: 'Signer weight string cannot be empty',
        details: { value },
      };
    }

    // Strict integer string pattern
    if (!/^[+-]?\d+$/.test(trimmed)) {
      return {
        ok: false,
        code: 'NON_INTEGER_STRING',
        error: `Signer weight string "${value}" is not a valid integer representation`,
        details: { value },
      };
    }

    numericValue = Number(trimmed);
  } else {
    return {
      ok: false,
      code: 'INVALID_WEIGHT_TYPE',
      error: `Signer weight must be a number${allowString ? ' or integer string' : ''}, got ${typeof value}`,
      details: { value },
    };
  }

  if (Number.isNaN(numericValue)) {
    return {
      ok: false,
      code: 'NAN_WEIGHT',
      error: 'Signer weight cannot be NaN',
      details: { value },
    };
  }

  if (!Number.isFinite(numericValue)) {
    return {
      ok: false,
      code: 'INFINITE_WEIGHT',
      error: 'Signer weight must be a finite number',
      details: { value },
    };
  }

  if (!Number.isInteger(numericValue)) {
    return {
      ok: false,
      code: 'NON_INTEGER_WEIGHT',
      error: `Signer weight must be an integer, got ${numericValue}`,
      details: { value, numericValue },
    };
  }

  if (numericValue < MIN_SIGNER_WEIGHT) {
    return {
      ok: false,
      code: 'WEIGHT_BELOW_MINIMUM',
      error: `Signer weight cannot be negative (min: ${MIN_SIGNER_WEIGHT}, got: ${numericValue})`,
      details: { value, numericValue, min: MIN_SIGNER_WEIGHT },
    };
  }

  if (numericValue > MAX_SIGNER_WEIGHT) {
    return {
      ok: false,
      code: 'WEIGHT_ABOVE_MAXIMUM',
      error: `Signer weight cannot exceed ${MAX_SIGNER_WEIGHT} (got: ${numericValue})`,
      details: { value, numericValue, max: MAX_SIGNER_WEIGHT },
    };
  }

  return {
    ok: true,
    weight: numericValue,
    isRemoval: numericValue === 0,
  };
}

/**
 * Validates a signer weight, returning the validated integer weight or throwing an InvalidSignerWeightError.
 *
 * @param {*} value - The candidate signer weight
 * @param {Object} [options={}] - Options
 * @returns {number} The validated integer weight
 * @throws {InvalidSignerWeightError}
 */
export function validateSignerWeight(value, options = {}) {
  const result = checkSignerWeight(value, options);
  if (!result.ok) {
    throw new InvalidSignerWeightError(result.error, result.code, result.details);
  }
  return result.weight;
}

/**
 * Checks whether a candidate signer weight is valid without throwing.
 *
 * @param {*} value - The candidate signer weight
 * @param {Object} [options={}] - Options
 * @returns {boolean}
 */
export function isValidSignerWeight(value, options = {}) {
  return checkSignerWeight(value, options).ok;
}

export const assertSignerWeight = validateSignerWeight;
