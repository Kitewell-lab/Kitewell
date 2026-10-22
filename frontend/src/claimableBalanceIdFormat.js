/**
 * @file claimableBalanceIdFormat.js
 * @description Validates and formats 72-character type-prefixed hexadecimal Stellar Claimable Balance IDs for UI display.
 */

const CLAIMABLE_BALANCE_ID_REGEX = /^[0-9a-fA-F]{72}$/;

/**
 * Custom error thrown when a claimable balance id does not meet the 72-hex-character shape.
 */
export class InvalidClaimableBalanceIdError extends Error {
  /**
   * @param {string} message
   * @param {*} [value]
   */
  constructor(message, value) {
    super(message);
    this.name = 'InvalidClaimableBalanceIdError';
    this.value = value;
  }
}

/**
 * Validates whether an input is a well-formed 72-character hexadecimal Claimable Balance ID.
 *
 * @param {*} id - The value to inspect
 * @returns {boolean} True if input is a 72-character hex string, false otherwise
 */
export function isValidClaimableBalanceId(id) {
  if (typeof id !== 'string') {
    return false;
  }
  return CLAIMABLE_BALANCE_ID_REGEX.test(id);
}

/**
 * Parses a 72-character Claimable Balance ID into its 8-character type prefix and 64-character hash.
 *
 * @param {string} id - 72-character hex Claimable Balance ID
 * @returns {{ type: string, hash: string }} Decomposed components
 * @throws {InvalidClaimableBalanceIdError} If id is not a valid 72-character hex string
 */
export function parseClaimableBalanceId(id) {
  if (!isValidClaimableBalanceId(id)) {
    throw new InvalidClaimableBalanceIdError(
      `Invalid Claimable Balance ID: expected 72-character hex string, got ${typeof id === 'string' ? `length ${id.length}` : typeof id}`,
      id
    );
  }
  return {
    type: id.slice(0, 8),
    hash: id.slice(8),
  };
}

/**
 * Formats a 72-character Claimable Balance ID into a shortened display string with middle ellipsis.
 *
 * Accepts either positional arguments:
 *   formatClaimableBalanceId(id, prefixLength, suffixLength, ellipsis)
 * or an options object:
 *   formatClaimableBalanceId(id, { prefixLength, suffixLength, ellipsis })
 *
 * @param {string} id - 72-character hex Claimable Balance ID
 * @param {number|Object} [optionsOrPrefix=8] - Prefix length (default 8 covers the type prefix) or options object
 * @param {number} [suffixLengthParam=6] - Suffix length
 * @param {string} [ellipsisParam='…'] - Delimiter
 * @returns {string} Shortened string or full id if prefix + suffix >= 72
 * @throws {InvalidClaimableBalanceIdError} If id is invalid
 * @throws {TypeError} If prefixLength or suffixLength is not a finite number
 * @throws {RangeError} If prefixLength or suffixLength is negative
 */
export function formatClaimableBalanceId(id, optionsOrPrefix = 8, suffixLengthParam = 6, ellipsisParam = '…') {
  if (!isValidClaimableBalanceId(id)) {
    throw new InvalidClaimableBalanceIdError(
      `Invalid Claimable Balance ID: expected 72-character hex string, got ${typeof id === 'string' ? `length ${id.length}` : typeof id}`,
      id
    );
  }

  let prefixLength = 8;
  let suffixLength = 6;
  let ellipsis = '…';

  if (typeof optionsOrPrefix === 'object' && optionsOrPrefix !== null) {
    if (optionsOrPrefix.prefixLength !== undefined) {
      prefixLength = optionsOrPrefix.prefixLength;
    }
    if (optionsOrPrefix.suffixLength !== undefined) {
      suffixLength = optionsOrPrefix.suffixLength;
    }
    if (optionsOrPrefix.ellipsis !== undefined) {
      ellipsis = String(optionsOrPrefix.ellipsis);
    }
  } else {
    prefixLength = optionsOrPrefix;
    suffixLength = suffixLengthParam;
    ellipsis = ellipsisParam !== undefined ? String(ellipsisParam) : '…';
  }

  if (typeof prefixLength !== 'number' || !Number.isFinite(prefixLength)) {
    throw new TypeError('prefixLength must be a finite number');
  }
  if (typeof suffixLength !== 'number' || !Number.isFinite(suffixLength)) {
    throw new TypeError('suffixLength must be a finite number');
  }

  if (prefixLength < 0) {
    throw new RangeError('prefixLength cannot be negative');
  }
  if (suffixLength < 0) {
    throw new RangeError('suffixLength cannot be negative');
  }

  const intPrefix = Math.floor(prefixLength);
  const intSuffix = Math.floor(suffixLength);

  if (intPrefix + intSuffix >= 72) {
    return id;
  }

  const prefix = intPrefix > 0 ? id.slice(0, intPrefix) : '';
  const suffix = intSuffix > 0 ? id.slice(-intSuffix) : '';

  return `${prefix}${ellipsis}${suffix}`;
}

/**
 * Safely format a Claimable Balance ID without throwing on invalid input.
 *
 * @param {*} id - Claimable Balance ID
 * @param {Object} [options={}] - Formatting options
 * @param {*} [fallback=null] - Value returned when id is invalid
 * @returns {string|*} Formatted string or fallback value
 */
export function tryFormatClaimableBalanceId(id, options = {}, fallback = null) {
  try {
    return formatClaimableBalanceId(id, options);
  } catch (err) {
    if (err instanceof InvalidClaimableBalanceIdError) {
      return fallback;
    }
    throw err;
  }
}
