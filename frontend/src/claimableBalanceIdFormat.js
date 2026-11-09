import {
  CLAIMABLE_BALANCE_ID_ERROR,
  CLAIMABLE_BALANCE_ID_LENGTH,
  CLAIMABLE_BALANCE_TYPE_PREFIX,
  DEFAULT_PREFIX_LENGTH,
  DEFAULT_SUFFIX_LENGTH,
  ELLIPSIS,
} from "./claimableBalanceIdFormatConstants.js";

const HEX_ONLY = /^[0-9a-fA-F]+$/;

/**
 * Validate a Stellar claimable balance ID string (type-prefixed 72-hex-char format).
 *
 * Surrounding whitespace is trimmed and hex digits are normalized to lowercase.
 * Invalid input returns `{ ok: false, error }` and never throws.
 *
 * @param {unknown} id Candidate claimable balance ID.
 * @returns {{ ok: true, id: string } | { ok: false, error: string }}
 */
export function validateClaimableBalanceId(id) {
  if (typeof id !== "string") {
    return { ok: false, error: CLAIMABLE_BALANCE_ID_ERROR.TYPE };
  }

  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: CLAIMABLE_BALANCE_ID_ERROR.EMPTY };
  }

  if (trimmed.length !== CLAIMABLE_BALANCE_ID_LENGTH) {
    return { ok: false, error: CLAIMABLE_BALANCE_ID_ERROR.LENGTH };
  }

  if (!HEX_ONLY.test(trimmed)) {
    return { ok: false, error: CLAIMABLE_BALANCE_ID_ERROR.HEX };
  }

  const normalized = trimmed.toLowerCase();
  if (!normalized.startsWith(CLAIMABLE_BALANCE_TYPE_PREFIX)) {
    return { ok: false, error: CLAIMABLE_BALANCE_ID_ERROR.PREFIX };
  }

  return { ok: true, id: normalized };
}

/**
 * Boolean predicate form of {@link validateClaimableBalanceId}.
 * Never throws.
 *
 * @param {unknown} id Candidate claimable balance ID.
 * @returns {boolean}
 */
export function isValidClaimableBalanceId(id) {
  return validateClaimableBalanceId(id).ok === true;
}

/**
 * Validate a non-negative integer length option.
 *
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} errorMessage
 * @returns {number}
 */
function resolveSideLength(value, fallback, errorMessage) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Validate a claimable balance ID and format it for compact display with a
 * middle ellipsis (`…`).
 *
 * - Trims surrounding whitespace and normalizes hex digits to lowercase.
 * - Keeps `prefixLength` characters from the start and `suffixLength` from the
 *   end, separated by `…`.
 * - Returns the full 72-character normalized ID unchanged if
 *   `prefixLength + suffixLength >= 72`.
 *
 * @param {string} id 72-character hex claimable balance ID.
 * @param {object} [options]
 * @param {number} [options.prefixLength=6] Characters kept from the start.
 * @param {number} [options.suffixLength=6] Characters kept from the end.
 * @returns {string} Shortened display string, e.g. `"000000…abcdef"`.
 * @throws {TypeError} When `id` is not a string or `options` is not an object.
 * @throws {Error} When `id` is malformed or length options are invalid.
 */
export function formatClaimableBalanceId(id, options = {}) {
  if (typeof id !== "string") {
    throw new TypeError(CLAIMABLE_BALANCE_ID_ERROR.TYPE);
  }

  const validation = validateClaimableBalanceId(id);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(CLAIMABLE_BALANCE_ID_ERROR.OPTIONS_TYPE);
  }

  const prefixLength = resolveSideLength(
    options.prefixLength,
    DEFAULT_PREFIX_LENGTH,
    CLAIMABLE_BALANCE_ID_ERROR.PREFIX_LENGTH
  );
  const suffixLength = resolveSideLength(
    options.suffixLength,
    DEFAULT_SUFFIX_LENGTH,
    CLAIMABLE_BALANCE_ID_ERROR.SUFFIX_LENGTH
  );

  if (prefixLength + suffixLength === 0) {
    throw new Error(CLAIMABLE_BALANCE_ID_ERROR.BOTH_ZERO);
  }

  const normalized = validation.id;
  if (normalized.length <= prefixLength + suffixLength) {
    return normalized;
  }

  const prefix = normalized.slice(0, prefixLength);
  const suffix = suffixLength > 0 ? normalized.slice(-suffixLength) : "";
  return `${prefix}${ELLIPSIS}${suffix}`;
}
