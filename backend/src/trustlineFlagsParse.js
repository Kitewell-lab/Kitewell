/**
 * @file trustlineFlagsParse.js
 * @description Parses and validates Stellar trustline numeric flags bitmasks into structured boolean representations.
 */

/**
 * Standard Stellar trustline flag bit values according to protocol specification:
 * - AUTHORIZED (1): Trustline is authorized to hold and trade the asset.
 * - AUTHORIZED_TO_MAINTAIN_LIABILITIES (2): Trustline can only maintain existing orders/liabilities, cannot accept new payments.
 * - CLAWBACK_ENABLED (4): Issuer can claw back asset balance from this trustline.
 */
export const STELLAR_TRUSTLINE_FLAGS = Object.freeze({
  AUTHORIZED: 1,
  AUTHORIZED_TO_MAINTAIN_LIABILITIES: 2,
  CLAWBACK_ENABLED: 4,
});

/**
 * Custom error thrown when a trustline flags bitmask is invalid, negative, or malformed.
 */
export class InvalidTrustlineFlagsError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidTrustlineFlagsError';
    this.context = context;
  }
}

/**
 * Parses and validates an input value into a non-negative BigInt bitmask.
 *
 * @param {*} value - The bitmask value to validate
 * @returns {bigint} Non-negative BigInt representation of the flags bitmask
 * @throws {InvalidTrustlineFlagsError} If value is invalid, negative, or not an integer
 */
function toBigIntBitmask(value) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidTrustlineFlagsError(
      `trustline flags bitmask is required and cannot be ${value === null ? 'null' : typeof value}`,
      { value }
    );
  }

  let bi;
  if (typeof value === 'bigint') {
    bi = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidTrustlineFlagsError(
        `trustline flags bitmask must be a finite integer, got ${value}`,
        { value }
      );
    }
    bi = BigInt(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed) && !/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
      throw new InvalidTrustlineFlagsError(
        `trustline flags string must be an integer, got "${value}"`,
        { value }
      );
    }
    try {
      bi = BigInt(trimmed);
    } catch {
      throw new InvalidTrustlineFlagsError(
        `could not parse trustline flags string "${value}" as an integer`,
        { value }
      );
    }
  } else {
    throw new InvalidTrustlineFlagsError(
      `trustline flags must be a number, string, or bigint, got ${typeof value}`,
      { value }
    );
  }

  if (bi < 0n) {
    throw new InvalidTrustlineFlagsError(
      `trustline flags bitmask cannot be negative, got ${bi.toString()}`,
      { value }
    );
  }

  return bi;
}

/**
 * Checks whether an input value represents a valid trustline flags bitmask without throwing.
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a valid non-negative integer flags bitmask
 */
export function isValidTrustlineFlags(value) {
  try {
    toBigIntBitmask(value);
    return true;
  } catch (err) {
    if (err instanceof InvalidTrustlineFlagsError) {
      return false;
    }
    throw err;
  }
}

/**
 * Parses a numeric trustline flags bitmask into named boolean properties.
 *
 * @param {number|string|bigint} flagsBitmask - The flags bitmask to parse
 * @returns {{ authorized: boolean, authorizedToMaintainLiabilities: boolean, clawbackEnabled: boolean, raw: number }}
 * @throws {InvalidTrustlineFlagsError} If bitmask is invalid or negative
 */
export function parseTrustlineFlags(flagsBitmask) {
  const bi = toBigIntBitmask(flagsBitmask);

  const authorized = (bi & 1n) !== 0n;
  const authorizedToMaintainLiabilities = (bi & 2n) !== 0n;
  const clawbackEnabled = (bi & 4n) !== 0n;

  const rawNumber = bi <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bi) : Number(bi & 0xffff_ffffn);

  return {
    authorized,
    authorizedToMaintainLiabilities,
    clawbackEnabled,
    raw: rawNumber,
  };
}

/**
 * Builds a numeric bitmask integer from a set of named boolean flags.
 *
 * @param {Object} [flags={}] - Named flags object
 * @param {boolean} [flags.authorized=false]
 * @param {boolean} [flags.authorizedToMaintainLiabilities=false]
 * @param {boolean} [flags.clawbackEnabled=false]
 * @returns {number} The integer bitmask
 */
export function buildTrustlineFlagsBitmask(flags = {}) {
  let mask = 0;
  if (flags.authorized) mask |= STELLAR_TRUSTLINE_FLAGS.AUTHORIZED;
  if (flags.authorizedToMaintainLiabilities) mask |= STELLAR_TRUSTLINE_FLAGS.AUTHORIZED_TO_MAINTAIN_LIABILITIES;
  if (flags.clawbackEnabled) mask |= STELLAR_TRUSTLINE_FLAGS.CLAWBACK_ENABLED;
  return mask;
}
