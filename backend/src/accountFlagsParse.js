/**
 * @file accountFlagsParse.js
 * @description Parses and validates Stellar account numeric flags bitmasks into structured boolean representations.
 */

/**
 * Standard Stellar account flag bit values according to protocol specification:
 * - AUTH_REQUIRED (1): Account requires trustlines to be approved.
 * - AUTH_REVOCABLE (2): Account can revoke existing trustlines.
 * - AUTH_IMMUTABLE (4): Account authorization flags cannot be changed.
 * - AUTH_CLAWBACK_ENABLED (8): Account can claw back asset balances.
 */
export const STELLAR_ACCOUNT_FLAGS = Object.freeze({
  AUTH_REQUIRED: 1,
  AUTH_REVOCABLE: 2,
  AUTH_IMMUTABLE: 4,
  AUTH_CLAWBACK_ENABLED: 8,
});

/**
 * Custom error thrown when an account flags bitmask is invalid, negative, or malformed.
 */
export class InvalidAccountFlagsError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidAccountFlagsError';
    this.context = context;
  }
}

/**
 * Parses and validates an input value into a non-negative BigInt bitmask.
 *
 * @param {*} value - The bitmask value to validate
 * @returns {bigint} Non-negative BigInt representation of the flags bitmask
 * @throws {InvalidAccountFlagsError} If value is invalid, negative, or not an integer
 */
function toBigIntBitmask(value) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidAccountFlagsError(
      `account flags bitmask is required and cannot be ${value === null ? 'null' : typeof value}`,
      { value }
    );
  }

  let bi;
  if (typeof value === 'bigint') {
    bi = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidAccountFlagsError(
        `account flags bitmask must be a finite integer, got ${value}`,
        { value }
      );
    }
    bi = BigInt(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed) && !/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
      throw new InvalidAccountFlagsError(
        `account flags string must be an integer, got "${value}"`,
        { value }
      );
    }
    try {
      bi = BigInt(trimmed);
    } catch {
      throw new InvalidAccountFlagsError(
        `could not parse account flags string "${value}" as an integer`,
        { value }
      );
    }
  } else {
    throw new InvalidAccountFlagsError(
      `account flags must be a number, string, or bigint, got ${typeof value}`,
      { value }
    );
  }

  if (bi < 0n) {
    throw new InvalidAccountFlagsError(
      `account flags bitmask cannot be negative, got ${bi.toString()}`,
      { value }
    );
  }

  return bi;
}

/**
 * Checks whether an input value represents a valid account flags bitmask without throwing.
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a valid non-negative integer flags bitmask
 */
export function isValidAccountFlags(value) {
  try {
    toBigIntBitmask(value);
    return true;
  } catch (err) {
    if (err instanceof InvalidAccountFlagsError) {
      return false;
    }
    throw err;
  }
}

/**
 * Parses a numeric account flags bitmask into named boolean properties.
 *
 * @param {number|string|bigint} flagsBitmask - The flags bitmask to parse
 * @returns {{ authRequired: boolean, authRevocable: boolean, authImmutable: boolean, authClawbackEnabled: boolean, raw: number }}
 * @throws {InvalidAccountFlagsError} If bitmask is invalid or negative
 */
export function parseAccountFlags(flagsBitmask) {
  const bi = toBigIntBitmask(flagsBitmask);

  const authRequired = (bi & 1n) !== 0n;
  const authRevocable = (bi & 2n) !== 0n;
  const authImmutable = (bi & 4n) !== 0n;
  const authClawbackEnabled = (bi & 8n) !== 0n;

  const rawNumber = bi <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bi) : Number(bi & 0xffff_ffffn);

  return {
    authRequired,
    authRevocable,
    authImmutable,
    authClawbackEnabled,
    raw: rawNumber,
  };
}

/**
 * Builds a numeric bitmask integer from a set of named boolean flags.
 *
 * @param {Object} [flags={}] - Named flags object
 * @param {boolean} [flags.authRequired=false]
 * @param {boolean} [flags.authRevocable=false]
 * @param {boolean} [flags.authImmutable=false]
 * @param {boolean} [flags.authClawbackEnabled=false]
 * @returns {number} The integer bitmask
 */
export function buildAccountFlagsBitmask(flags = {}) {
  let mask = 0;
  if (flags.authRequired) mask |= STELLAR_ACCOUNT_FLAGS.AUTH_REQUIRED;
  if (flags.authRevocable) mask |= STELLAR_ACCOUNT_FLAGS.AUTH_REVOCABLE;
  if (flags.authImmutable) mask |= STELLAR_ACCOUNT_FLAGS.AUTH_IMMUTABLE;
  if (flags.authClawbackEnabled) mask |= STELLAR_ACCOUNT_FLAGS.AUTH_CLAWBACK_ENABLED;
  return mask;
}
