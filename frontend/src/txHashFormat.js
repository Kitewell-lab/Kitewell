/**
 * @file txHashFormat.js
 * @description Validates and formats 64-character hexadecimal Stellar/blockchain transaction hashes for UI display.
 */

const TX_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Custom error thrown when an input string is not a valid 64-character hex transaction hash.
 */
export class InvalidTxHashError extends Error {
  /**
   * @param {string} message
   * @param {*} [value]
   */
  constructor(message, value) {
    super(message);
    this.name = 'InvalidTxHashError';
    this.value = value;
  }
}

/**
 * Validates whether an input is a well-formed 64-character hexadecimal transaction hash.
 *
 * @param {*} hash - The value to inspect
 * @returns {boolean} True if input is a 64-character hex string, false otherwise
 */
export function isValidTxHash(hash) {
  if (typeof hash !== 'string') {
    return false;
  }
  return TX_HASH_REGEX.test(hash);
}

/**
 * Formats a 64-character hexadecimal transaction hash into a shortened display string.
 *
 * Accepts either positional arguments:
 *   formatTxHash(hash, prefixLength, suffixLength, ellipsis)
 * or an options object:
 *   formatTxHash(hash, { prefixLength, suffixLength, ellipsis, fallback })
 *
 * @param {string} hash - 64-character hex transaction hash
 * @param {number|Object} [optionsOrPrefix=6] - Prefix character count or options object
 * @param {number} [suffixLengthParam=6] - Suffix character count (when using positional args)
 * @param {string} [ellipsisParam='…'] - Delimiter between prefix and suffix
 * @returns {string} Truncated formatted string or full hash if kept length >= 64
 * @throws {InvalidTxHashError} If hash is not a valid 64-char hex string
 * @throws {TypeError} If prefixLength or suffixLength is not a finite number
 * @throws {RangeError} If prefixLength or suffixLength is negative
 */
export function formatTxHash(hash, optionsOrPrefix = 6, suffixLengthParam = 6, ellipsisParam = '…') {
  if (!isValidTxHash(hash)) {
    throw new InvalidTxHashError(
      `Invalid transaction hash: expected 64-character hex string, got ${typeof hash === 'string' ? `length ${hash.length} ("${hash.slice(0, 10)}...")` : typeof hash}`,
      hash
    );
  }

  let prefixLength = 6;
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

  if (intPrefix + intSuffix >= 64) {
    return hash;
  }

  const prefix = intPrefix > 0 ? hash.slice(0, intPrefix) : '';
  const suffix = intSuffix > 0 ? hash.slice(-intSuffix) : '';

  return `${prefix}${ellipsis}${suffix}`;
}

/**
 * Safely format a transaction hash without throwing on invalid input.
 *
 * @param {*} hash - Transaction hash to format
 * @param {Object} [options] - Options passed to formatTxHash
 * @param {*} [fallback=null] - Value returned when hash is invalid
 * @returns {string|*} Formatted string or fallback value
 */
export function tryFormatTxHash(hash, options = {}, fallback = null) {
  try {
    return formatTxHash(hash, options);
  } catch (err) {
    if (err instanceof InvalidTxHashError) {
      return fallback;
    }
    throw err;
  }
}
