/**
 * Constants and limits for Stellar memo byte-size estimation.
 */

/**
 * Maximum encoded byte limits for each supported Stellar memo type.
 */
export const MEMO_LIMITS = Object.freeze({
  text: 28,
  id: 8,
  hash: 32,
  return: 32,
  none: 0,
});

/**
 * Maximum 64-bit unsigned integer value for memo ID (2^64 - 1).
 */
export const MAX_MEMO_ID = 18_446_744_073_709_551_615n;

/**
 * Supported memo type identifiers.
 */
export const MEMO_TYPES = Object.freeze(["text", "id", "hash", "return", "none"]);
