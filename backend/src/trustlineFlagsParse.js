/**
 * @file trustlineFlagsParse.js
 * @description Parses a trustline's numeric flags bitmask into a structured descriptor object.
 * Documented Stellar trustline flags:
 *   1 (0x1) - AUTHORIZED_FLAG
 *   2 (0x2) - AUTHORIZED_TO_MAINTAIN_LIABILITIES_FLAG
 *   4 (0x4) - CLAWBACK_ENABLED_FLAG
 */

export const TRUSTLINE_FLAGS = Object.freeze({
  AUTHORIZED: 1,
  AUTHORIZED_TO_MAINTAIN_LIABILITIES: 2,
  CLAWBACK_ENABLED: 4,
});

/**
 * Parses raw trustline flags into a boolean capability object.
 *
 * @param {number|string|{ flags: number|string }} input - Numeric flags bitmask, stringified integer, or object containing flags property.
 * @returns {{
 *   raw: number,
 *   authorized: boolean,
 *   authorizedToMaintainLiabilities: boolean,
 *   clawbackEnabled: boolean,
 *   hasAnyFlag: boolean
 * }}
 * @throws {TypeError} If flags cannot be parsed into a non-negative integer.
 */
export function parseTrustlineFlags(input) {
  let val = input;
  if (typeof val === 'object' && val !== null) {
    if (!('flags' in val)) {
      throw new TypeError('Invalid trustline flags: object must contain a flags property');
    }
    val = val.flags;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new TypeError(`Invalid trustline flags: "${val}" is not a valid non-negative integer`);
    }
    val = Number(trimmed);
  }

  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isInteger(val) || val < 0) {
    throw new TypeError(`Invalid trustline flags: expected non-negative integer, got ${val}`);
  }

  const authorized = (val & TRUSTLINE_FLAGS.AUTHORIZED) !== 0;
  const authorizedToMaintainLiabilities = (val & TRUSTLINE_FLAGS.AUTHORIZED_TO_MAINTAIN_LIABILITIES) !== 0;
  const clawbackEnabled = (val & TRUSTLINE_FLAGS.CLAWBACK_ENABLED) !== 0;

  return {
    raw: val,
    authorized,
    authorizedToMaintainLiabilities,
    clawbackEnabled,
    hasAnyFlag: authorized || authorizedToMaintainLiabilities || clawbackEnabled,
  };
}

/**
 * Safely parses trustline flags without throwing, returning a fallback value if invalid.
 *
 * @param {*} input
 * @param {*} [fallback=null]
 * @returns {Object|null}
 */
export function tryParseTrustlineFlags(input, fallback = null) {
  try {
    return parseTrustlineFlags(input);
  } catch {
    return fallback;
  }
}

/**
 * Checks if the given input is a valid trustline flag representation.
 *
 * @param {*} input
 * @returns {boolean}
 */
export function isValidTrustlineFlags(input) {
  try {
    parseTrustlineFlags(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serializes boolean flags back into a bitmask integer.
 *
 * @param {{
 *   authorized?: boolean,
 *   authorizedToMaintainLiabilities?: boolean,
 *   clawbackEnabled?: boolean
 * }} flagsObj
 * @returns {number}
 */
export function serializeTrustlineFlags(flagsObj = {}) {
  if (typeof flagsObj !== 'object' || flagsObj === null) {
    throw new TypeError('serializeTrustlineFlags expects an object');
  }
  let mask = 0;
  if (flagsObj.authorized) mask |= TRUSTLINE_FLAGS.AUTHORIZED;
  if (flagsObj.authorizedToMaintainLiabilities) mask |= TRUSTLINE_FLAGS.AUTHORIZED_TO_MAINTAIN_LIABILITIES;
  if (flagsObj.clawbackEnabled) mask |= TRUSTLINE_FLAGS.CLAWBACK_ENABLED;
  return mask;
}
