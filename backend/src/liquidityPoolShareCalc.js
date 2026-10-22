/**
 * @file liquidityPoolShareCalc.js
 * @description Computes liquidity pool share percentage using BigInt-safe integer math and returns a fixed-precision decimal string.
 */

export const DEFAULT_PRECISION = 4;

/**
 * Custom error thrown when pool share calculation encounters invalid input or math constraints.
 */
export class LiquidityPoolShareCalcError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_POOL_SHARE_INPUT', context) {
    super(message);
    this.name = 'LiquidityPoolShareCalcError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Parses an input value (number, string, or BigInt) into an unscaled integer string and decimal scale.
 *
 * @param {*} val
 * @param {string} paramName
 * @returns {{ digits: string, scale: number, isNegative: boolean }}
 */
function parseValueDetails(val, paramName) {
  if (val === null || val === undefined) {
    throw new LiquidityPoolShareCalcError(
      `${paramName} cannot be ${val === null ? 'null' : 'undefined'}`,
      'MISSING_VALUE',
      { paramName, val }
    );
  }

  if (typeof val === 'bigint') {
    const str = val.toString();
    const isNegative = str.startsWith('-');
    const digits = isNegative ? str.slice(1) : str;
    return { digits, scale: 0, isNegative };
  }

  if (typeof val === 'number') {
    if (Number.isNaN(val)) {
      throw new LiquidityPoolShareCalcError(`${paramName} cannot be NaN`, 'NAN_VALUE', { paramName, val });
    }
    if (!Number.isFinite(val)) {
      throw new LiquidityPoolShareCalcError(`${paramName} must be a finite number`, 'INFINITE_VALUE', { paramName, val });
    }
    const str = val.toString();
    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    const intPart = parts[0];
    const fracPart = parts[1] || '';
    return {
      digits: intPart + fracPart,
      scale: fracPart.length,
      isNegative,
    };
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      throw new LiquidityPoolShareCalcError(`${paramName} string cannot be empty`, 'EMPTY_STRING_VALUE', { paramName, val });
    }

    if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
      throw new LiquidityPoolShareCalcError(
        `${paramName} string "${val}" is not a valid decimal or integer number`,
        'INVALID_NUMBER_STRING',
        { paramName, val }
      );
    }

    const isNegative = trimmed.startsWith('-');
    const unsignedStr = trimmed.startsWith('-') || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    const parts = unsignedStr.split('.');
    const intPart = parts[0];
    const fracPart = parts[1] || '';
    return {
      digits: intPart + fracPart,
      scale: fracPart.length,
      isNegative,
    };
  }

  throw new LiquidityPoolShareCalcError(
    `${paramName} must be a BigInt, number, or numeric string, got ${typeof val}`,
    'INVALID_TYPE',
    { paramName, val }
  );
}

/**
 * Normalizes two numeric inputs to a shared BigInt scale.
 *
 * @param {*} userVal
 * @param {*} totalVal
 * @returns {{ userBigInt: bigint, totalBigInt: bigint }}
 */
function normalizeInputs(userVal, totalVal) {
  const user = parseValueDetails(userVal, 'userShares');
  const total = parseValueDetails(totalVal, 'totalShares');

  if (user.isNegative) {
    throw new LiquidityPoolShareCalcError(
      `userShares cannot be negative, got ${userVal}`,
      'NEGATIVE_USER_SHARES',
      { userShares: userVal }
    );
  }

  if (total.isNegative) {
    throw new LiquidityPoolShareCalcError(
      `totalShares cannot be negative, got ${totalVal}`,
      'NEGATIVE_TOTAL_SHARES',
      { totalShares: totalVal }
    );
  }

  const maxScale = Math.max(user.scale, total.scale);
  const userPad = maxScale - user.scale;
  const totalPad = maxScale - total.scale;

  const userBigInt = BigInt(user.digits + '0'.repeat(userPad));
  const totalBigInt = BigInt(total.digits + '0'.repeat(totalPad));

  if (totalBigInt === 0n) {
    throw new LiquidityPoolShareCalcError(
      'totalShares cannot be zero (pool has no total shares)',
      'ZERO_TOTAL_SHARES',
      { totalShares: totalVal }
    );
  }

  if (userBigInt > totalBigInt) {
    throw new LiquidityPoolShareCalcError(
      `userShares (${userVal}) cannot exceed totalShares (${totalVal})`,
      'USER_SHARES_EXCEED_TOTAL',
      { userShares: userVal, totalShares: totalVal }
    );
  }

  return { userBigInt, totalBigInt };
}

/**
 * Computes pool share percentage with typed result without throwing.
 *
 * @param {*} userShares
 * @param {*} totalShares
 * @param {Object} [options={}]
 * @param {number} [options.precision=DEFAULT_PRECISION] - Number of decimal places (0-18)
 * @param {boolean} [options.includeSymbol=false] - Whether to append '%'
 * @returns {{ ok: true, percentage: string, userShares: string, totalShares: string } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkLiquidityPoolShare(userShares, totalShares, options = {}) {
  const { precision = DEFAULT_PRECISION, includeSymbol = false } = options;

  if (typeof precision !== 'number' || !Number.isInteger(precision) || precision < 0 || precision > 18) {
    return {
      ok: false,
      code: 'INVALID_PRECISION',
      error: `precision must be an integer between 0 and 18, got ${precision}`,
      details: { precision },
    };
  }

  let userBigInt;
  let totalBigInt;

  try {
    const normalized = normalizeInputs(userShares, totalShares);
    userBigInt = normalized.userBigInt;
    totalBigInt = normalized.totalBigInt;
  } catch (err) {
    if (err instanceof LiquidityPoolShareCalcError) {
      return {
        ok: false,
        code: err.code,
        error: err.message,
        details: err.context,
      };
    }
    return {
      ok: false,
      code: 'UNKNOWN_ERROR',
      error: err.message,
    };
  }

  // Pure integer math with half-up rounding:
  // (userBigInt * 100 * 10^precision * 2 + totalBigInt) / (totalBigInt * 2)
  const scaleMultiplier = 10n ** BigInt(precision);
  const numerator = userBigInt * 100n * scaleMultiplier;
  const roundedScaled = (numerator * 2n + totalBigInt) / (totalBigInt * 2n);

  let formatted;
  if (precision === 0) {
    formatted = roundedScaled.toString();
  } else {
    const intPart = (roundedScaled / scaleMultiplier).toString();
    const fracPart = (roundedScaled % scaleMultiplier).toString().padStart(precision, '0');
    formatted = `${intPart}.${fracPart}`;
  }

  if (includeSymbol) {
    formatted += '%';
  }

  return {
    ok: true,
    percentage: formatted,
    userShares: userShares.toString(),
    totalShares: totalShares.toString(),
  };
}

/**
 * Computes pool share percentage as a fixed-precision string, throwing on invalid input.
 *
 * @param {*} userShares
 * @param {*} totalShares
 * @param {Object} [options={}]
 * @returns {string}
 * @throws {LiquidityPoolShareCalcError}
 */
export function calcLiquidityPoolShare(userShares, totalShares, options = {}) {
  const result = checkLiquidityPoolShare(userShares, totalShares, options);
  if (!result.ok) {
    throw new LiquidityPoolShareCalcError(result.error, result.code, result.details);
  }
  return result.percentage;
}

export const calcPoolSharePercentage = calcLiquidityPoolShare;
