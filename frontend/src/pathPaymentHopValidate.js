/**
 * @file pathPaymentHopValidate.js
 * @description Validates intermediate path asset hop arrays for Stellar path payment operations (max 5 hops, valid descriptors, no duplicate consecutive hops).
 */

/** Maximum allowed intermediate hops in Stellar path payments according to protocol. */
export const MAX_PATH_HOPS = 5;

/** Error code constants for path hop validation failures. */
export const HOP_ERROR_CODES = Object.freeze({
  NOT_AN_ARRAY: 'NOT_AN_ARRAY',
  EXCEEDS_MAX_HOPS: 'EXCEEDS_MAX_HOPS',
  INVALID_ASSET_DESCRIPTOR: 'INVALID_ASSET_DESCRIPTOR',
  DUPLICATE_CONSECUTIVE_HOPS: 'DUPLICATE_CONSECUTIVE_HOPS'
});

/**
 * Custom error thrown when path payment hop list fails validation.
 */
export class PathHopValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {*} [context]
   */
  constructor(message, code, context) {
    super(message);
    this.name = 'PathHopValidationError';
    this.code = code;
    this.context = context;
  }
}

const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;
const ASSET_CODE_REGEX = /^[a-zA-Z0-9]{1,12}$/;

/**
 * Normalizes an individual hop asset descriptor into a canonical string key ('native' or 'CODE:ISSUER').
 *
 * @param {*} hop - Raw hop descriptor
 * @returns {string} Canonical string key
 * @throws {Error} If descriptor is malformed
 */
function canonicalizeHopAsset(hop) {
  if (hop === null || hop === undefined) {
    throw new Error('Hop descriptor cannot be null or undefined');
  }

  // Handle native shortcuts
  if (typeof hop === 'string') {
    const trimmed = hop.trim();
    if (trimmed.toLowerCase() === 'native' || trimmed.toUpperCase() === 'XLM') {
      return 'native';
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Non-native asset string must be "CODE:ISSUER", got "${trimmed}"`);
    }

    const code = trimmed.slice(0, colonIndex).trim().toUpperCase();
    const issuer = trimmed.slice(colonIndex + 1).trim();

    if (!ASSET_CODE_REGEX.test(code)) {
      throw new Error(`Invalid asset code "${code}"`);
    }
    if (!STELLAR_ADDRESS_REGEX.test(issuer)) {
      throw new Error(`Invalid issuer account address "${issuer}"`);
    }

    return `${code}:${issuer}`;
  }

  if (typeof hop === 'object') {
    if (hop.isNative || (hop.code && hop.code.toUpperCase() === 'XLM' && !hop.issuer)) {
      return 'native';
    }

    const rawCode = hop.code || hop.asset_code;
    const rawIssuer = hop.issuer || hop.asset_issuer;

    if (!rawCode || typeof rawCode !== 'string') {
      throw new Error('Asset object missing valid code string');
    }
    if (!rawIssuer || typeof rawIssuer !== 'string') {
      throw new Error('Asset object missing valid issuer address');
    }

    const code = rawCode.trim().toUpperCase();
    const issuer = rawIssuer.trim();

    if (!ASSET_CODE_REGEX.test(code)) {
      throw new Error(`Invalid asset code "${code}"`);
    }
    if (!STELLAR_ADDRESS_REGEX.test(issuer)) {
      throw new Error(`Invalid issuer address "${issuer}"`);
    }

    return `${code}:${issuer}`;
  }

  throw new Error(`Hop descriptor must be a string or object, got ${typeof hop}`);
}

/**
 * Validates an array of intermediate path payment asset hops.
 *
 * @param {*} hops - Array of hop asset descriptors (max 5)
 * @param {Object} [options={}] - Options
 * @param {number} [options.maxHops=MAX_PATH_HOPS] - Maximum allowed intermediate hops
 * @returns {{ valid: boolean, count: number, normalizedHops?: string[], error?: string, code?: string }}
 */
export function validatePathPaymentHops(hops, options = {}) {
  if (!Array.isArray(hops)) {
    return {
      valid: false,
      count: 0,
      code: HOP_ERROR_CODES.NOT_AN_ARRAY,
      error: `Hops must be an array, got ${hops === null ? 'null' : typeof hops}`
    };
  }

  const { maxHops = MAX_PATH_HOPS } = options;

  if (hops.length > maxHops) {
    return {
      valid: false,
      count: hops.length,
      code: HOP_ERROR_CODES.EXCEEDS_MAX_HOPS,
      error: `Hops list exceeds maximum allowed intermediate hops (${maxHops}), got ${hops.length}`
    };
  }

  const normalized = [];
  for (let i = 0; i < hops.length; i += 1) {
    let key;
    try {
      key = canonicalizeHopAsset(hops[i]);
    } catch (err) {
      return {
        valid: false,
        count: hops.length,
        code: HOP_ERROR_CODES.INVALID_ASSET_DESCRIPTOR,
        error: `Invalid hop asset at index ${i}: ${err.message}`
      };
    }

    if (normalized.length > 0 && normalized[normalized.length - 1] === key) {
      return {
        valid: false,
        count: hops.length,
        code: HOP_ERROR_CODES.DUPLICATE_CONSECUTIVE_HOPS,
        error: `Duplicate consecutive hop detected at index ${i}: "${key}"`
      };
    }

    normalized.push(key);
  }

  return {
    valid: true,
    count: hops.length,
    normalizedHops: normalized
  };
}

/**
 * Checks whether an intermediate path hops array is completely valid.
 *
 * @param {*} hops - Intermediate hops array
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if valid
 */
export function isValidPathPaymentHops(hops, options = {}) {
  const result = validatePathPaymentHops(hops, options);
  return result.valid;
}

/**
 * Asserts that path hops are valid, throwing PathHopValidationError if invalid.
 *
 * @param {*} hops - Intermediate hops
 * @param {Object} [options={}] - Options
 * @returns {{ valid: true, count: number, normalizedHops: string[] }}
 * @throws {PathHopValidationError}
 */
export function assertValidPathPaymentHops(hops, options = {}) {
  const result = validatePathPaymentHops(hops, options);
  if (!result.valid) {
    throw new PathHopValidationError(result.error, result.code, { hops });
  }
  return result;
}
