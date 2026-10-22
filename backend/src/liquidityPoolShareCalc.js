/**
 * @file liquidityPoolShareCalc.js
 * @description Computes liquidity pool share percentage using BigInt-safe rational integer math without floating-point rounding errors.
 */

/**
 * Custom error thrown when liquidity pool share calculations receive invalid, negative, or zero inputs.
 */
export class InvalidPoolShareError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidPoolShareError';
    this.context = context;
  }
}

/**
 * Parses and normalizes a share balance value into an integer BigInt scaled by decimal precision.
 *
 * @param {*} value - Value to parse (number, string, bigint)
 * @param {string} paramName - Name of the parameter
 * @returns {{ integer: bigint, decimals: number }}
 * @throws {InvalidPoolShareError}
 */
function parseShareValue(value, paramName) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidPoolShareError(
      `${paramName} is required and cannot be ${value === null ? 'null' : typeof value}`,
      { paramName, value }
    );
  }

  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new InvalidPoolShareError(`${paramName} cannot be negative, got ${value.toString()}`, { paramName, value });
    }
    return { integer: value, decimals: 0 };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidPoolShareError(`${paramName} must be a non-negative finite number, got ${value}`, { paramName, value });
    }
    const str = value.toString();
    const dotIndex = str.indexOf('.');
    if (dotIndex === -1) {
      return { integer: BigInt(str), decimals: 0 };
    }
    const decimals = str.length - dotIndex - 1;
    const cleanStr = str.replace('.', '');
    return { integer: BigInt(cleanStr), decimals };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
      throw new InvalidPoolShareError(
        `${paramName} must be a valid non-negative numeric string, got "${value}"`,
        { paramName, value }
      );
    }
    const dotIndex = trimmed.indexOf('.');
    if (dotIndex === -1) {
      return { integer: BigInt(trimmed), decimals: 0 };
    }
    const decimals = trimmed.length - dotIndex - 1;
    const cleanStr = trimmed.replace('.', '');
    return { integer: BigInt(cleanStr), decimals };
  }

  throw new InvalidPoolShareError(
    `${paramName} must be a number, string, or bigint, got ${typeof value}`,
    { paramName, value }
  );
}

/**
 * Normalizes userShares and totalShares to the same common scale BigInt.
 *
 * @param {*} userShares
 * @param {*} totalShares
 * @returns {{ u: bigint, t: bigint }}
 */
function alignShares(userShares, totalShares) {
  const parsedUser = parseShareValue(userShares, 'User shares');
  const parsedTotal = parseShareValue(totalShares, 'Total shares');

  let u = parsedUser.integer;
  let t = parsedTotal.integer;

  if (parsedUser.decimals > parsedTotal.decimals) {
    const diff = BigInt(parsedUser.decimals - parsedTotal.decimals);
    t *= 10n ** diff;
  } else if (parsedTotal.decimals > parsedUser.decimals) {
    const diff = BigInt(parsedTotal.decimals - parsedUser.decimals);
    u *= 10n ** diff;
  }

  if (t === 0n) {
    throw new InvalidPoolShareError('Total shares must be strictly greater than zero', { userShares, totalShares });
  }

  return { u, t };
}

/**
 * Computes pool share percentage as a fixed-precision decimal string.
 *
 * @param {number|string|bigint} userShares - Depositor's share balance
 * @param {number|string|bigint} totalShares - Liquidity pool's total share supply
 * @param {Object} [options={}] - Calculation options
 * @param {number} [options.decimals=4] - Output decimal precision (0-20)
 * @param {boolean} [options.includePercentSign=false] - Whether to append '%' to output
 * @param {boolean} [options.trimTrailingZeros=false] - Whether to trim trailing decimal zeros
 * @param {boolean} [options.round=true] - Whether to apply half-up integer rounding
 * @returns {string} Formatted percentage string (e.g. "25.0000" or "25.0000%")
 * @throws {InvalidPoolShareError} If shares are invalid or totalShares <= 0
 */
export function calcPoolSharePercentage(userShares, totalShares, options = {}) {
  const {
    decimals = 4,
    includePercentSign = false,
    trimTrailingZeros = false,
    round = true
  } = options;

  if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new RangeError(`decimals must be an integer between 0 and 20, got ${decimals}`);
  }

  const { u, t } = alignShares(userShares, totalShares);

  const scale = 10n ** BigInt(decimals);
  // sharePercentage = (u * 100 * 10^decimals) / t
  const scaledUser = u * 100n * scale;

  let quotient;
  if (round) {
    const remainder = scaledUser % t;
    quotient = scaledUser / t;
    if (remainder * 2n >= t) {
      quotient += 1n;
    }
  } else {
    quotient = scaledUser / t;
  }

  let formatted;
  if (decimals === 0) {
    formatted = quotient.toString();
  } else {
    const intPart = quotient / scale;
    const fracPart = (quotient % scale).toString().padStart(decimals, '0');
    formatted = `${intPart.toString()}.${fracPart}`;
  }

  if (trimTrailingZeros && decimals > 0) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  if (includePercentSign) {
    return `${formatted}%`;
  }

  return formatted;
}

/**
 * Checks whether user shares and total shares form a valid calculation input.
 *
 * @param {*} userShares
 * @param {*} totalShares
 * @param {Object} [options={}]
 * @returns {boolean} True if valid
 */
export function isValidPoolShares(userShares, totalShares, options = {}) {
  try {
    alignShares(userShares, totalShares);
    return true;
  } catch (err) {
    if (err instanceof InvalidPoolShareError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely computes pool share percentage without throwing on error.
 *
 * @param {*} userShares
 * @param {*} totalShares
 * @param {Object} [options={}]
 * @param {*} [fallback='0.0000']
 * @returns {string|*}
 */
export function tryCalcPoolSharePercentage(userShares, totalShares, options = {}, fallback = '0.0000') {
  try {
    return calcPoolSharePercentage(userShares, totalShares, options);
  } catch (err) {
    if (err instanceof InvalidPoolShareError) {
      return fallback;
    }
    throw err;
  }
}
