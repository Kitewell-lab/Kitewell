import {
  DEFAULT_PERCENTAGE_PRECISION,
  DEFAULT_PRICE_PRECISION,
  DEFAULT_SPREAD_REFERENCE,
  MAX_SPREAD_PRECISION,
  MIN_SPREAD_PRECISION,
  ORDERBOOK_SPREAD_ERROR,
  SUPPORTED_SPREAD_REFERENCES,
} from "./orderbookSpreadCalcConstants.js";

/**
 * Compute greatest common divisor of two non-negative `BigInt` values.
 *
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint}
 */
function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0n ? 1n : x;
}

/**
 * Reduce a numerator/denominator pair to lowest terms.
 *
 * @param {bigint} n
 * @param {bigint} d
 * @returns {{ n: bigint, d: bigint }}
 */
function reduceRational(n, d) {
  if (n === 0n) return { n: 0n, d: 1n };
  const divisor = gcdBigInt(n, d);
  return { n: n / divisor, d: d / divisor };
}

/**
 * Parse an integer component (`n` or `d`) of a rational price into a `BigInt`.
 *
 * @param {unknown} value
 * @returns {bigint}
 */
function parseRationalTerm(value) {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^[+-]?\d+$/.test(trimmed)) {
      throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
    }
    return BigInt(trimmed);
  }
  throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
}

/**
 * Parse a decimal price string (e.g. `"1.2500000"`) into an exact reduced
 * rational `{ n, d }` without floating-point conversion.
 *
 * @param {string} priceStr
 * @returns {{ n: bigint, d: bigint }}
 */
function parseDecimalPriceString(priceStr) {
  const trimmed = priceStr.trim();
  if (trimmed.startsWith("-")) {
    const rest = trimmed.slice(1);
    if (/^\d+(\.\d+)?$/.test(rest)) {
      throw new RangeError(ORDERBOOK_SPREAD_ERROR.NON_POSITIVE_PRICE);
    }
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
  }

  const whole = match[1];
  const frac = match[2] ?? "";
  const scale = 10n ** BigInt(frac.length);
  const numerator =
    BigInt(whole) * scale + (frac === "" ? 0n : BigInt(frac));

  if (numerator <= 0n) {
    throw new RangeError(ORDERBOOK_SPREAD_ERROR.NON_POSITIVE_PRICE);
  }

  return reduceRational(numerator, scale);
}

/**
 * Extract a positive reduced rational price `{ n, d }` from a Horizon order
 * book level (`{ price_r: { n, d }, price }`), a direct `{ n, d }` rational, or
 * a decimal price string.
 *
 * @param {unknown} level
 * @returns {{ n: bigint, d: bigint }}
 */
function parseOrderbookPrice(level) {
  if (typeof level === "string") {
    return parseDecimalPriceString(level);
  }

  if (level === null || typeof level !== "object" || Array.isArray(level)) {
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
  }

  const ratioObj =
    level.price_r !== undefined && level.price_r !== null
      ? level.price_r
      : Object.hasOwn(level, "n") || Object.hasOwn(level, "d")
        ? level
        : null;

  if (ratioObj !== null) {
    if (typeof ratioObj !== "object" || Array.isArray(ratioObj)) {
      throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
    }
    const n = parseRationalTerm(ratioObj.n);
    const d = parseRationalTerm(ratioObj.d);
    if (d <= 0n) {
      throw new RangeError(ORDERBOOK_SPREAD_ERROR.ZERO_DENOMINATOR);
    }
    if (n <= 0n) {
      throw new RangeError(ORDERBOOK_SPREAD_ERROR.NON_POSITIVE_PRICE);
    }
    return reduceRational(n, d);
  }

  if (typeof level.price === "string") {
    return parseDecimalPriceString(level.price);
  }

  throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_PRICE);
}

/**
 * Format a non-negative rational `numerator / denominator` to `precision`
 * decimal places using half-up `BigInt` rounding.
 *
 * @param {bigint} numerator
 * @param {bigint} denominator
 * @param {number} precision
 * @returns {string}
 */
function formatRationalFixed(numerator, denominator, precision) {
  const scale = 10n ** BigInt(precision);
  const scaled = numerator * scale;
  const quotient = scaled / denominator;
  const remainder = scaled % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;

  if (precision === 0) {
    return rounded.toString();
  }

  const whole = rounded / scale;
  const fraction = (rounded % scale).toString().padStart(precision, "0");
  return `${whole}.${fraction}`;
}

/**
 * Validate and normalize spread calculation options.
 *
 * @param {unknown} options
 * @returns {{ pricePrecision: number, percentagePrecision: number, reference: "mid" | "ask" | "bid" }}
 */
function resolveOptions(options) {
  if (options === undefined) {
    return {
      pricePrecision: DEFAULT_PRICE_PRECISION,
      percentagePrecision: DEFAULT_PERCENTAGE_PRECISION,
      reference: DEFAULT_SPREAD_REFERENCE,
    };
  }

  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.OPTIONS_TYPE);
  }

  const pricePrecision = options.pricePrecision ?? DEFAULT_PRICE_PRECISION;
  const percentagePrecision =
    options.percentagePrecision ?? DEFAULT_PERCENTAGE_PRECISION;

  for (const p of [pricePrecision, percentagePrecision]) {
    if (
      typeof p !== "number" ||
      !Number.isInteger(p) ||
      p < MIN_SPREAD_PRECISION ||
      p > MAX_SPREAD_PRECISION
    ) {
      throw new RangeError(ORDERBOOK_SPREAD_ERROR.PRECISION_RANGE);
    }
  }

  const reference = options.reference ?? DEFAULT_SPREAD_REFERENCE;
  if (
    typeof reference !== "string" ||
    !SUPPORTED_SPREAD_REFERENCES.includes(reference)
  ) {
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.INVALID_REFERENCE);
  }

  return { pricePrecision, percentagePrecision, reference };
}

/**
 * Compute the bid-ask spread (absolute and percentage) from the top bid and
 * top ask of a Horizon `/order_book` response using BigInt-safe rational math.
 *
 * @param {{ bids: unknown[], asks: unknown[] }} orderbook Horizon `/order_book` response object.
 * @param {object} [options]
 * @param {number} [options.pricePrecision=7] Decimal places for `absolute`, `bidPrice`, `askPrice`, and `midPrice`.
 * @param {number} [options.percentagePrecision=4] Decimal places for `percentage`.
 * @param {"mid" | "ask" | "bid"} [options.reference="mid"] Reference denominator used for the percentage spread.
 * @returns {{
 *   absolute: string,
 *   percentage: string,
 *   bidPrice: string,
 *   askPrice: string,
 *   midPrice: string,
 *   rational: { n: bigint, d: bigint }
 * }}
 * @throws {TypeError} When `orderbook`, price entries, or `options` have invalid types.
 * @throws {RangeError} When `bids`/`asks` are empty, prices are non-positive,
 *   a denominator is zero, the book is crossed (`ask < bid`), or precision is out of range.
 *
 * @example
 * calculateOrderbookSpread({
 *   bids: [{ price_r: { n: 99, d: 100 }, price: "0.9900000" }],
 *   asks: [{ price_r: { n: 101, d: 100 }, price: "1.0100000" }],
 * });
 * // => {
 * //   absolute: "0.0200000",
 * //   percentage: "2.0000",
 * //   bidPrice: "0.9900000",
 * //   askPrice: "1.0100000",
 * //   midPrice: "1.0000000",
 * //   rational: { n: 1n, d: 50n },
 * // }
 */
export function calculateOrderbookSpread(orderbook, options = undefined) {
  if (
    orderbook === null ||
    typeof orderbook !== "object" ||
    Array.isArray(orderbook) ||
    !Array.isArray(orderbook.bids) ||
    !Array.isArray(orderbook.asks)
  ) {
    throw new TypeError(ORDERBOOK_SPREAD_ERROR.ORDERBOOK_TYPE);
  }

  if (orderbook.bids.length === 0) {
    throw new RangeError(ORDERBOOK_SPREAD_ERROR.EMPTY_BIDS);
  }

  if (orderbook.asks.length === 0) {
    throw new RangeError(ORDERBOOK_SPREAD_ERROR.EMPTY_ASKS);
  }

  const resolvedOpts = resolveOptions(options);
  const bid = parseOrderbookPrice(orderbook.bids[0]);
  const ask = parseOrderbookPrice(orderbook.asks[0]);

  const askCross = ask.n * bid.d;
  const bidCross = bid.n * ask.d;
  const diffNum = askCross - bidCross;
  const commonDen = ask.d * bid.d;

  if (diffNum < 0n) {
    throw new RangeError(ORDERBOOK_SPREAD_ERROR.CROSSED_BOOK);
  }

  const rational = reduceRational(diffNum, commonDen);
  const { pricePrecision, percentagePrecision, reference } = resolvedOpts;

  const absolute = formatRationalFixed(rational.n, rational.d, pricePrecision);
  const bidPrice = formatRationalFixed(bid.n, bid.d, pricePrecision);
  const askPrice = formatRationalFixed(ask.n, ask.d, pricePrecision);
  const midPrice = formatRationalFixed(
    askCross + bidCross,
    2n * commonDen,
    pricePrecision,
  );

  let pctNum;
  let pctDen;
  if (reference === "mid") {
    pctNum = diffNum * 200n;
    pctDen = askCross + bidCross;
  } else if (reference === "ask") {
    pctNum = diffNum * 100n;
    pctDen = askCross;
  } else {
    pctNum = diffNum * 100n;
    pctDen = bidCross;
  }

  const percentage = formatRationalFixed(pctNum, pctDen, percentagePrecision);

  return {
    absolute,
    percentage,
    bidPrice,
    askPrice,
    midPrice,
    rational,
  };
}

/**
 * Non-throwing companion to {@link calculateOrderbookSpread}.
 *
 * @param {unknown} orderbook Candidate Horizon `/order_book` object.
 * @param {unknown} [options] Optional formatting configuration.
 * @returns {{
 *   ok: true,
 *   spread: ReturnType<typeof calculateOrderbookSpread>
 * } | {
 *   ok: false,
 *   error: string
 * }}
 */
export function tryCalculateOrderbookSpread(orderbook, options = undefined) {
  try {
    const spread = calculateOrderbookSpread(orderbook, options);
    return { ok: true, spread };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
