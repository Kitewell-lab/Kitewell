/**
 * Pure helpers that convert between Stellar's decimal string amounts and
 * stroops. All values are handled as strings so no floating point rounding
 * is ever introduced.
 */

const DECIMAL_PLACES = 7;
const STROOPS_PER_UNIT = 10000000;
const AMOUNT_PATTERN = /^\d+(?:\.\d{0,7})?$/;

/**
 * Parse a decimal amount string into an integer stroop count.
 *
 * Accepts optional trailing zeros and a bare integer such as `"5"`. Rejects
 * empty input, negatives, more than seven decimal places and locale commas.
 *
 * @param {unknown} value Decimal amount such as `"1.5"`.
 * @returns {number|null} Stroops, or `null` when the input is not a valid
 * amount. Non-integer inputs are not supported.
 */
export function toStroops(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || !AMOUNT_PATTERN.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const padded = fraction.padEnd(DECIMAL_PLACES, "0");
  const units = Number(whole) * STROOPS_PER_UNIT + Number(padded);
  return Number.isSafeInteger(units) ? units : null;
}

/**
 * Format a stroop count as a fixed seven decimal place string.
 *
 * @param {unknown} stroops Integer stroop count.
 * @returns {string|null} Amount string such as `"1.5000000"`, or `null` when
 * `stroops` is not a non-negative safe integer.
 */
export function formatStroops(stroops) {
  if (!Number.isInteger(stroops) || stroops < 0) return null;
  if (!Number.isSafeInteger(stroops)) return null;

  const units = Math.floor(stroops / STROOPS_PER_UNIT);
  const remainder = String(stroops % STROOPS_PER_UNIT).padStart(DECIMAL_PLACES, "0");
  return `${units}.${remainder}`;
}
