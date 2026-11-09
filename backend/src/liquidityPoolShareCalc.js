import {
  DEFAULT_ROUNDING_MODE,
  DEFAULT_SHARE_PRECISION,
  LIQUIDITY_POOL_SHARE_ERROR,
  MAX_SHARE_PRECISION,
  MIN_SHARE_PRECISION,
  STROOP_DECIMALS,
  STROOP_SCALE,
  SUPPORTED_ROUNDING_MODES,
} from "./liquidityPoolShareCalcConstants.js";

/**
 * Compute a depositor's liquidity pool share percentage `(shareBalance / totalShares) * 100`
 * using BigInt-safe integer math and return a fixed-precision decimal string.
 *
 * Both `shareBalance` and `totalShares` may be supplied as:
 * - a `BigInt` (`>= 0n`),
 * - a non-negative safe integer `number` (`Number.isSafeInteger`), or
 * - a decimal `string` with up to 7 fractional digits (Horizon format, e.g. `"250.0000000"`).
 *
 * Floating-point `number` values (e.g. `12.5`, `NaN`, `Infinity`) are rejected
 * so IEEE-754 rounding never enters the calculation.
 *
 * @param {bigint | number | string} shareBalance Depositor's pool share balance.
 * @param {bigint | number | string} totalShares Total shares issued by the liquidity pool (`> 0`).
 * @param {object} [options]
 * @param {number} [options.precision=4] Number of decimal places in the returned percentage (`0`–`18`).
 * @param {"half-up" | "down"} [options.rounding="half-up"] Rounding mode for the final digit.
 * @returns {string} Fixed-precision decimal percentage string (e.g. `"25.0000"`).
 * @throws {TypeError} When an input or option has an invalid type or format.
 * @throws {RangeError} When a numeric value or precision is out of bounds (`totalShares <= 0`, `shareBalance < 0`, `shareBalance > totalShares`, or `precision` outside `[0, 18]`).
 *
 * @example
 * calculatePoolSharePercentage("250.0000000", "1000.0000000");
 * // => "25.0000"
 *
 * calculatePoolSharePercentage(1n, 3n, { precision: 2 });
 * // => "33.33"
 */
export function calculatePoolSharePercentage(
  shareBalance,
  totalShares,
  options = undefined,
) {
  const shareUnits = parseShareUnits(shareBalance, "share");
  const totalUnits = parseShareUnits(totalShares, "total");

  if (totalUnits <= 0n) {
    throw new RangeError(LIQUIDITY_POOL_SHARE_ERROR.TOTAL_NON_POSITIVE);
  }

  if (shareUnits > totalUnits) {
    throw new RangeError(LIQUIDITY_POOL_SHARE_ERROR.EXCEEDS_TOTAL);
  }

  const { precision, rounding } = resolveOptions(options);
  const scale = 10n ** BigInt(precision);
  const numerator = shareUnits * 100n * scale;
  const quotient = numerator / totalUnits;
  const remainder = numerator % totalUnits;

  const roundedUnits =
    rounding === "half-up" && remainder * 2n >= totalUnits
      ? quotient + 1n
      : quotient;

  return formatScaledBigInt(roundedUnits, precision, scale);
}

/**
 * Non-throwing companion to {@link calculatePoolSharePercentage}.
 *
 * @param {unknown} shareBalance Depositor's pool share balance.
 * @param {unknown} totalShares Total shares issued by the liquidity pool.
 * @param {unknown} [options] Optional `{ precision, rounding }` configuration.
 * @returns {{ ok: true, percentage: string } | { ok: false, error: string }}
 */
export function tryCalculatePoolSharePercentage(
  shareBalance,
  totalShares,
  options = undefined,
) {
  try {
    const percentage = calculatePoolSharePercentage(
      shareBalance,
      totalShares,
      options,
    );
    return { ok: true, percentage };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Parse a share balance or total shares value into scaled `BigInt` stroop units.
 *
 * Every input is scaled by `10^7` (`STROOP_SCALE`) so that `"25"`, `"25.0000000"`,
 * `25`, and `25n` represent the same quantity while preserving up to 7 fractional
 * digits in decimal strings.
 *
 * @param {unknown} raw
 * @param {"share" | "total"} kind
 * @returns {bigint}
 */
function parseShareUnits(raw, kind) {
  const typeErrorMsg =
    kind === "share"
      ? LIQUIDITY_POOL_SHARE_ERROR.SHARE_TYPE
      : LIQUIDITY_POOL_SHARE_ERROR.TOTAL_TYPE;
  const formatErrorMsg =
    kind === "share"
      ? LIQUIDITY_POOL_SHARE_ERROR.SHARE_FORMAT
      : LIQUIDITY_POOL_SHARE_ERROR.TOTAL_FORMAT;
  const negativeErrorMsg =
    kind === "share"
      ? LIQUIDITY_POOL_SHARE_ERROR.SHARE_NEGATIVE
      : LIQUIDITY_POOL_SHARE_ERROR.TOTAL_NON_POSITIVE;

  if (typeof raw === "bigint") {
    if (raw < 0n) {
      throw new RangeError(negativeErrorMsg);
    }
    return raw * STROOP_SCALE;
  }

  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw)) {
      throw new TypeError(typeErrorMsg);
    }
    if (raw < 0) {
      throw new RangeError(negativeErrorMsg);
    }
    return BigInt(raw) * STROOP_SCALE;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("-")) {
      const rest = trimmed.slice(1);
      if (/^\d+(\.\d+)?$/.test(rest)) {
        throw new RangeError(negativeErrorMsg);
      }
      throw new TypeError(formatErrorMsg);
    }

    const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
    if (!match) {
      throw new TypeError(formatErrorMsg);
    }

    const wholePart = match[1];
    const fracPart = match[2] ?? "";
    if (fracPart.length > STROOP_DECIMALS) {
      throw new TypeError(formatErrorMsg);
    }

    const paddedFrac = fracPart.padEnd(STROOP_DECIMALS, "0");
    return BigInt(wholePart) * STROOP_SCALE + BigInt(paddedFrac);
  }

  throw new TypeError(typeErrorMsg);
}

/**
 * Validate and normalize the optional `{ precision, rounding }` configuration.
 *
 * @param {unknown} options
 * @returns {{ precision: number, rounding: "half-up" | "down" }}
 */
function resolveOptions(options) {
  if (options === undefined) {
    return {
      precision: DEFAULT_SHARE_PRECISION,
      rounding: DEFAULT_ROUNDING_MODE,
    };
  }

  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(LIQUIDITY_POOL_SHARE_ERROR.OPTIONS_TYPE);
  }

  const precision = options.precision ?? DEFAULT_SHARE_PRECISION;
  if (
    typeof precision !== "number" ||
    !Number.isInteger(precision) ||
    precision < MIN_SHARE_PRECISION ||
    precision > MAX_SHARE_PRECISION
  ) {
    throw new RangeError(LIQUIDITY_POOL_SHARE_ERROR.PRECISION_RANGE);
  }

  const rounding = options.rounding ?? DEFAULT_ROUNDING_MODE;
  if (
    typeof rounding !== "string" ||
    !SUPPORTED_ROUNDING_MODES.includes(rounding)
  ) {
    throw new TypeError(LIQUIDITY_POOL_SHARE_ERROR.ROUNDING_INVALID);
  }

  return { precision, rounding };
}

/**
 * Format a non-negative scaled `BigInt` with `precision` decimal digits.
 *
 * @param {bigint} scaledValue
 * @param {number} precision
 * @param {bigint} scale
 * @returns {string}
 */
function formatScaledBigInt(scaledValue, precision, scale) {
  if (precision === 0) {
    return scaledValue.toString();
  }

  const whole = scaledValue / scale;
  const fraction = (scaledValue % scale).toString().padStart(precision, "0");
  return `${whole}.${fraction}`;
}
