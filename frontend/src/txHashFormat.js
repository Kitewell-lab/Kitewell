/**
 * Transaction hash display formatter.
 *
 * Formats a 64-character hex transaction hash into a shortened display form
 * with configurable prefix/suffix length, validating the input is well-formed
 * hex of the correct length first.
 *
 * This module is standalone: nothing in App.jsx, freighter.js, or stellar.js
 * imports it yet.
 */

/** Ellipsis inserted between the kept prefix and suffix. */
export const ELLIPSIS = "…";

export const DEFAULT_PREFIX_LENGTH = 6;
export const DEFAULT_SUFFIX_LENGTH = 6;
export const TX_HASH_LENGTH = 64;

/**
 * Canonical 64-character hexadecimal string representing a Stellar transaction hash.
 */
const TX_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Validate an optional length option.
 *
 * @param {number|undefined} value
 * @param {string} name option name used in the error message
 * @param {number} fallback value used when the option is omitted
 * @returns {number}
 * @throws {Error} when the value is not a non-negative integer
 */
function normalizeLength(value, name, fallback) {
  if (value === undefined) return fallback;

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

/**
 * Check if a given value is a well-formed 64-character hex transaction hash.
 *
 * @param {unknown} txHash Value to test
 * @returns {boolean} True if valid 64-character hex string
 */
export function isValidTxHash(txHash) {
  if (typeof txHash !== "string") return false;
  return TX_HASH_REGEX.test(txHash.trim());
}

/**
 * Shorten a 64-character hex transaction hash for compact UI display.
 *
 * Behaviour:
 * - Surrounding whitespace is trimmed before validation.
 * - Input must be a valid 64-character hexadecimal string.
 * - When prefixLength + suffixLength >= 64, the full hash is returned unchanged.
 * - A zero-length side is omitted (e.g. prefixLength: 6, suffixLength: 0 yields "prefix…").
 * - Ellipsis character can be customized via options.ellipsis (defaults to "…").
 *
 * @param {string} txHash 64-character hexadecimal transaction hash
 * @param {object} [options]
 * @param {number} [options.prefixLength=6] Characters kept from the start
 * @param {number} [options.suffixLength=6] Characters kept from the end
 * @param {string} [options.ellipsis="…"] Custom ellipsis string
 * @returns {string} Shortened transaction hash, e.g. `a1b2c3…d4e5f6`
 * @throws {Error} When hash is missing, malformed, or length options are invalid
 */
export function formatTxHash(txHash, options = {}) {
  if (typeof txHash !== "string") {
    throw new Error("Transaction hash must be a string.");
  }

  const value = txHash.trim();

  if (!value) {
    throw new Error("Transaction hash is required.");
  }

  if (!TX_HASH_REGEX.test(value)) {
    throw new Error("Invalid transaction hash. Expected a 64-character hexadecimal string.");
  }

  const opts = options ?? {};
  const prefixLength = normalizeLength(
    opts.prefixLength,
    "prefixLength",
    DEFAULT_PREFIX_LENGTH
  );
  const suffixLength = normalizeLength(
    opts.suffixLength,
    "suffixLength",
    DEFAULT_SUFFIX_LENGTH
  );
  const ellipsis = opts.ellipsis !== undefined ? String(opts.ellipsis) : ELLIPSIS;

  if (prefixLength + suffixLength === 0) {
    throw new Error("prefixLength and suffixLength cannot both be 0.");
  }

  if (value.length <= prefixLength + suffixLength) {
    return value;
  }

  const prefix = value.slice(0, prefixLength);
  const suffix = suffixLength > 0 ? value.slice(-suffixLength) : "";

  return `${prefix}${ellipsis}${suffix}`;
}

/** Alias matching module file name */
export const txHashFormat = formatTxHash;

export default formatTxHash;
