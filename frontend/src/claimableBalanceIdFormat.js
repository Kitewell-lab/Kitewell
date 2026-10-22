/**
 * @file claimableBalanceIdFormat.js
 * @description Validates and formats Stellar claimable balance IDs (type-prefixed 72 hex character string) for UI display.
 */

/**
 * Regular expression strictly matching Stellar claimable balance ID: 72 hexadecimal characters.
 */
export const CLAIMABLE_BALANCE_ID_REGEX = /^[0-9a-fA-F]{72}$/;

/**
 * Custom error thrown when claimable balance ID is invalid or malformed.
 */
export class InvalidClaimableBalanceIdError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidClaimableBalanceIdError';
    this.context = context;
  }
}

/**
 * Checks whether an input value is a valid 72-character hexadecimal Stellar claimable balance ID.
 *
 * @param {*} id - Value to check
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.trim=true] - Whether to trim surrounding whitespace
 * @returns {boolean} True if valid claimable balance ID
 */
export function isValidClaimableBalanceId(id, options = {}) {
  if (typeof id !== 'string') {
    return false;
  }

  const { trim = true } = options;
  const processed = trim ? id.trim() : id;

  return CLAIMABLE_BALANCE_ID_REGEX.test(processed);
}

/**
 * Validates and extracts normalized components of a claimable balance ID.
 *
 * @param {*} id - ID to normalize
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.trim=true] - Whether to trim
 * @param {boolean} [options.lowercase=true] - Convert to lowercase
 * @returns {{ full: string, type: string, hash: string }}
 * @throws {InvalidClaimableBalanceIdError}
 */
export function parseClaimableBalanceId(id, options = {}) {
  if (typeof id !== 'string') {
    throw new InvalidClaimableBalanceIdError(
      `Claimable balance ID must be a string, got ${id === null ? 'null' : typeof id}`,
      { id }
    );
  }

  const { trim = true, lowercase = true } = options;
  const processed = trim ? id.trim() : id;

  if (processed.length !== 72) {
    throw new InvalidClaimableBalanceIdError(
      `Claimable balance ID must be exactly 72 hex characters, got length ${processed.length}`,
      { id, length: processed.length }
    );
  }

  if (!CLAIMABLE_BALANCE_ID_REGEX.test(processed)) {
    throw new InvalidClaimableBalanceIdError(
      'Claimable balance ID contains invalid non-hexadecimal characters',
      { id }
    );
  }

  const normalized = lowercase ? processed.toLowerCase() : processed;
  return {
    full: normalized,
    type: normalized.slice(0, 8),
    hash: normalized.slice(8)
  };
}

/**
 * Formats a Stellar claimable balance ID into a compact shortened string with middle ellipsis.
 *
 * @param {string} id - Raw 72-hex claimable balance ID
 * @param {Object} [options={}] - Formatting options
 * @param {number} [options.prefixLength=8] - Number of leading characters to keep
 * @param {number} [options.suffixLength=8] - Number of trailing characters to keep
 * @param {string} [options.ellipsis='…'] - Ellipsis separator
 * @param {boolean} [options.lowercase=true] - Convert output to lowercase
 * @param {boolean} [options.trim=true] - Trim whitespace before validating
 * @returns {string} Formatted shortened string (e.g. "00000000…abcdef12")
 * @throws {InvalidClaimableBalanceIdError} If ID is malformed
 * @throws {RangeError} If prefixLength or suffixLength are negative
 */
export function formatClaimableBalanceId(id, options = {}) {
  const {
    prefixLength = 8,
    suffixLength = 8,
    ellipsis = '…',
    lowercase = true,
    trim = true
  } = options;

  if (typeof prefixLength !== 'number' || !Number.isInteger(prefixLength) || prefixLength < 0) {
    throw new RangeError(`prefixLength must be a non-negative integer, got ${prefixLength}`);
  }

  if (typeof suffixLength !== 'number' || !Number.isInteger(suffixLength) || suffixLength < 0) {
    throw new RangeError(`suffixLength must be a non-negative integer, got ${suffixLength}`);
  }

  const { full } = parseClaimableBalanceId(id, { trim, lowercase });

  if (prefixLength + suffixLength >= full.length) {
    return full;
  }

  const prefix = full.slice(0, prefixLength);
  const suffix = suffixLength > 0 ? full.slice(-suffixLength) : '';

  return `${prefix}${ellipsis}${suffix}`;
}

/**
 * Safely formats a claimable balance ID without throwing on invalid input, returning fallback.
 *
 * @param {*} id - Raw claimable balance ID
 * @param {Object} [options={}] - Formatting options
 * @param {*} [fallback=''] - Fallback value on failure
 * @returns {string|*}
 */
export function tryFormatClaimableBalanceId(id, options = {}, fallback = '') {
  try {
    return formatClaimableBalanceId(id, options);
  } catch (err) {
    if (err instanceof InvalidClaimableBalanceIdError) {
      return fallback;
    }
    throw err;
  }
}
