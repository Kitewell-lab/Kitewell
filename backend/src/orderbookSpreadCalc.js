/**
 * @file orderbookSpreadCalc.js
 * @description Calculates bid-ask spreads (absolute and percentage) for Stellar order books using BigInt rational arithmetic.
 */

/**
 * Custom error thrown when orderbook price inputs are invalid, non-positive, or unparseable.
 */
export class InvalidOrderbookPriceError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidOrderbookPriceError';
    this.context = context;
  }
}

/**
 * Parses any price representation (Horizon offer object, { n, d } ratio, decimal string, number, or BigInt)
 * into a canonical positive rational { n: bigint, d: bigint }.
 *
 * @param {*} input - Price input to parse
 * @param {string} [paramName='price'] - Name of the parameter for error reporting
 * @returns {{ n: bigint, d: bigint }}
 * @throws {InvalidOrderbookPriceError} If input is invalid, zero, or negative
 */
export function parseRationalPrice(input, paramName = 'price') {
  if (input === null || input === undefined || input === '') {
    throw new InvalidOrderbookPriceError(
      `${paramName} is required and cannot be ${input === null ? 'null' : typeof input}`,
      { paramName, input }
    );
  }

  // Handle Horizon orderbook row with price_r property
  let target = input;
  if (typeof input === 'object' && input !== null) {
    if ('price_r' in input && typeof input.price_r === 'object' && input.price_r !== null) {
      target = input.price_r;
    }
  }

  let n;
  let d = 1n;

  if (typeof target === 'object' && target !== null) {
    if ('n' in target && 'd' in target) {
      n = BigInt(target.n);
      d = BigInt(target.d);
    } else if ('numerator' in target && 'denominator' in target) {
      n = BigInt(target.numerator);
      d = BigInt(target.denominator);
    } else if ('price' in target && typeof target.price === 'string') {
      return parseRationalPrice(target.price, paramName);
    } else {
      throw new InvalidOrderbookPriceError(
        `${paramName} object must contain { n, d } or { price_r }`,
        { paramName, input }
      );
    }
  } else if (typeof target === 'bigint') {
    n = target;
  } else if (typeof target === 'number') {
    if (!Number.isFinite(target) || Number.isNaN(target)) {
      throw new InvalidOrderbookPriceError(`${paramName} must be a finite number, got ${target}`, { paramName, input });
    }
    return parseRationalPrice(target.toString(), paramName);
  } else if (typeof target === 'string') {
    const trimmed = target.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new InvalidOrderbookPriceError(`${paramName} string must be a decimal number, got "${target}"`, { paramName, input });
    }

    const parts = trimmed.split('.');
    if (parts.length === 1) {
      n = BigInt(parts[0]);
    } else {
      const decimals = parts[1].length;
      d = 10n ** BigInt(decimals);
      n = BigInt(parts[0] + parts[1]);
    }
  } else {
    throw new InvalidOrderbookPriceError(
      `${paramName} must be an object, number, string, or bigint, got ${typeof target}`,
      { paramName, input }
    );
  }

  if (d <= 0n) {
    throw new InvalidOrderbookPriceError(`${paramName} denominator must be strictly positive, got ${d.toString()}`, { paramName, input });
  }

  if (n <= 0n) {
    throw new InvalidOrderbookPriceError(`${paramName} must be strictly positive, got ${n.toString()}`, { paramName, input });
  }

  return { n, d };
}

/**
 * Checks whether an input value represents a valid positive orderbook price without throwing.
 *
 * @param {*} input - Value to inspect
 * @returns {boolean} True if input is a valid positive price
 */
export function isValidOrderbookPrice(input) {
  try {
    parseRationalPrice(input);
    return true;
  } catch (err) {
    if (err instanceof InvalidOrderbookPriceError) {
      return false;
    }
    throw err;
  }
}

/**
 * Formats a BigInt rational (n / d) into a decimal string with specified precision.
 *
 * @param {bigint} n - Numerator
 * @param {bigint} d - Denominator
 * @param {number} decimals - Precision decimal digits
 * @param {boolean} [round=true] - Whether to apply half-up rounding
 * @returns {string} Formatted decimal string
 */
function formatRational(n, d, decimals = 7, round = true) {
  const isNegative = n < 0n;
  const absN = isNegative ? -n : n;

  const scale = 10n ** BigInt(decimals);
  const scaled = absN * scale;

  let quotient;
  if (round) {
    const rem = scaled % d;
    quotient = scaled / d;
    if (rem * 2n >= d) {
      quotient += 1n;
    }
  } else {
    quotient = scaled / d;
  }

  if (decimals === 0) {
    return (isNegative ? '-' : '') + quotient.toString();
  }

  const intPart = quotient / scale;
  const fracPart = (quotient % scale).toString().padStart(decimals, '0');
  return `${isNegative ? '-' : ''}${intPart.toString()}.${fracPart}`;
}

/**
 * Computes bid-ask spread and related statistics for an order book.
 *
 * @param {*} topBid - Highest buying price
 * @param {*} topAsk - Lowest selling price
 * @param {Object} [options={}]
 * @param {number} [options.decimals=7] - Number of decimal places for spreads and prices
 * @returns {{ absoluteSpread: string, percentageSpread: string, midPrice: string, bid: string, ask: string, isCrossed: boolean }}
 * @throws {InvalidOrderbookPriceError} If either price is invalid or non-positive
 */
export function calcOrderbookSpread(topBid, topAsk, options = {}) {
  const { decimals = 7 } = options;

  if (typeof decimals !== 'number' || !Number.isFinite(decimals) || !Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new RangeError('decimals must be a finite integer between 0 and 20');
  }

  const bid = parseRationalPrice(topBid, 'topBid');
  const ask = parseRationalPrice(topAsk, 'topAsk');

  // Absolute spread = Ask - Bid = (Ask_n * Bid_d - Bid_n * Ask_d) / (Ask_d * Bid_d)
  const diffN = ask.n * bid.d - bid.n * ask.d;
  const commonD = ask.d * bid.d;
  const isCrossed = diffN < 0n;

  // Percentage spread = (Ask - Bid) / Ask * 100 = (diffN * 100) / (ask.n * bid.d)
  const percentN = diffN * 100n;
  const percentD = ask.n * bid.d;

  // Mid price = (Ask + Bid) / 2 = (Ask_n * Bid_d + Bid_n * Ask_d) / (2 * Ask_d * Bid_d)
  const midN = ask.n * bid.d + bid.n * ask.d;
  const midD = 2n * commonD;

  const absoluteSpread = formatRational(diffN, commonD, decimals);
  const percentageSpread = `${formatRational(percentN, percentD, decimals)}%`;
  const midPrice = formatRational(midN, midD, decimals);
  const bidStr = formatRational(bid.n, bid.d, decimals);
  const askStr = formatRational(ask.n, ask.d, decimals);

  return {
    absoluteSpread,
    percentageSpread,
    midPrice,
    bid: bidStr,
    ask: askStr,
    isCrossed,
  };
}

/**
 * Safely compute orderbook spread without throwing on invalid input.
 *
 * @param {*} topBid - Top bid price
 * @param {*} topAsk - Top ask price
 * @param {Object} [options={}] - Calculation options
 * @param {*} [fallback=null] - Value returned on error
 * @returns {Object|*} Spread result object or fallback value
 */
export function tryCalcOrderbookSpread(topBid, topAsk, options = {}, fallback = null) {
  try {
    return calcOrderbookSpread(topBid, topAsk, options);
  } catch (err) {
    if (err instanceof InvalidOrderbookPriceError) {
      return fallback;
    }
    throw err;
  }
}
