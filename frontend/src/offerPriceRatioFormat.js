/**
 * @file offerPriceRatioFormat.js
 * @description Formats Horizon offer price ratios (numerator/denominator) into fixed-precision decimal strings without floating-point rounding.
 */

/**
 * Custom error thrown when price ratio inputs are invalid, negative, or have a zero denominator.
 */
export class InvalidPriceRatioError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidPriceRatioError';
    this.context = context;
  }
}

/**
 * Parses and validates an individual numerator or denominator value into a non-negative BigInt.
 *
 * @param {*} value - Value to parse
 * @param {string} paramName - Name of the parameter
 * @returns {bigint} Non-negative BigInt
 * @throws {InvalidPriceRatioError} If value is invalid or negative
 */
function toBigIntPart(value, paramName) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidPriceRatioError(
      `${paramName} is required and cannot be ${value === null ? 'null' : typeof value}`,
      { paramName, value }
    );
  }

  let bi;
  if (typeof value === 'bigint') {
    bi = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidPriceRatioError(
        `${paramName} must be a finite integer, got ${value}`,
        { paramName, value }
      );
    }
    bi = BigInt(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidPriceRatioError(
        `${paramName} string must contain only digits, got "${value}"`,
        { paramName, value }
      );
    }
    bi = BigInt(trimmed);
  } else {
    throw new InvalidPriceRatioError(
      `${paramName} must be a number, string, or bigint, got ${typeof value}`,
      { paramName, value }
    );
  }

  if (bi < 0n) {
    throw new InvalidPriceRatioError(
      `${paramName} cannot be negative, got ${bi.toString()}`,
      { paramName, value }
    );
  }

  return bi;
}

/**
 * Normalizes input ratio into { n: bigint, d: bigint }.
 *
 * @param {*} ratioOrN - Ratio object { n, d } / { numerator, denominator } or numerator value
 * @param {*} [maybeD] - Denominator if called positionally
 * @returns {{ n: bigint, d: bigint }}
 */
function extractRatio(ratioOrN, maybeD) {
  let rawN;
  let rawD;

  if (typeof ratioOrN === 'object' && ratioOrN !== null && maybeD === undefined) {
    if ('n' in ratioOrN && 'd' in ratioOrN) {
      rawN = ratioOrN.n;
      rawD = ratioOrN.d;
    } else if ('numerator' in ratioOrN && 'denominator' in ratioOrN) {
      rawN = ratioOrN.numerator;
      rawD = ratioOrN.denominator;
    } else {
      throw new InvalidPriceRatioError(
        'Ratio object must contain { n, d } or { numerator, denominator }',
        { ratio: ratioOrN }
      );
    }
  } else {
    rawN = ratioOrN;
    rawD = maybeD;
  }

  const n = toBigIntPart(rawN, 'numerator');
  const d = toBigIntPart(rawD, 'denominator');

  if (d === 0n) {
    throw new InvalidPriceRatioError('Denominator cannot be zero', { n: n.toString(), d: d.toString() });
  }

  return { n, d };
}

/**
 * Checks whether an input represents a valid price ratio with non-zero denominator.
 *
 * @param {*} ratioOrN - Ratio object or numerator
 * @param {*} [maybeD] - Denominator
 * @returns {boolean} True if ratio is valid and denominator > 0
 */
export function isValidPriceRatio(ratioOrN, maybeD) {
  try {
    extractRatio(ratioOrN, maybeD);
    return true;
  } catch (err) {
    if (err instanceof InvalidPriceRatioError) {
      return false;
    }
    throw err;
  }
}

/**
 * Converts a Horizon offer's price ratio into a fixed-precision decimal display string without floating-point math.
 *
 * @param {Object|number|string|bigint} ratioOrN - Ratio object { n, d } or numerator
 * @param {Object|number|string|bigint} [optionsOrD={}] - Options object or denominator
 * @param {Object} [maybeOptions={}] - Options object when called as (n, d, options)
 * @returns {string} Formatted decimal string
 * @throws {InvalidPriceRatioError} If ratio is invalid or denominator is zero
 * @throws {TypeError|RangeError} If decimals is invalid
 */
export function formatOfferPriceRatio(ratioOrN, optionsOrD = {}, maybeOptions = {}) {
  let options = {};
  let ratio;

  if (typeof ratioOrN === 'object' && ratioOrN !== null && !(typeof optionsOrD === 'number' || typeof optionsOrD === 'bigint' || typeof optionsOrD === 'string')) {
    ratio = extractRatio(ratioOrN);
    options = optionsOrD || {};
  } else {
    ratio = extractRatio(ratioOrN, optionsOrD);
    options = maybeOptions || {};
  }

  const { decimals = 7, trimTrailingZeros = false, round = true } = options;

  if (typeof decimals !== 'number' || !Number.isFinite(decimals) || !Number.isInteger(decimals)) {
    throw new TypeError('decimals must be a finite integer');
  }
  if (decimals < 0 || decimals > 20) {
    throw new RangeError('decimals must be between 0 and 20');
  }

  const { n, d } = ratio;
  const scale = 10n ** BigInt(decimals);

  let quotient;
  if (round) {
    // Perform integer half-up rounding: (N * 10^decimals * 2 + D) / (2 * D)
    const scaled = n * scale;
    const remainder = scaled % d;
    quotient = scaled / d;
    if (remainder * 2n >= d) {
      quotient += 1n;
    }
  } else {
    quotient = (n * scale) / d;
  }

  if (decimals === 0) {
    return quotient.toString();
  }

  const intPart = quotient / scale;
  const fracPart = (quotient % scale).toString().padStart(decimals, '0');
  let result = `${intPart.toString()}.${fracPart}`;

  if (trimTrailingZeros) {
    result = result.replace(/\.?0+$/, '');
  }

  return result;
}

/**
 * Safely format an offer price ratio without throwing on invalid input or zero denominator.
 *
 * @param {*} ratioOrN - Ratio object or numerator
 * @param {*} [optionsOrD={}] - Options or denominator
 * @param {*} [fallback='N/A'] - Fallback return value
 * @returns {string|*} Formatted string or fallback value
 */
export function tryFormatOfferPriceRatio(ratioOrN, optionsOrD = {}, fallback = 'N/A') {
  try {
    return formatOfferPriceRatio(ratioOrN, optionsOrD);
  } catch (err) {
    if (err instanceof InvalidPriceRatioError) {
      return fallback;
    }
    throw err;
  }
}
