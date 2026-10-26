/**
 * Asset amount clamp helper.
 *
 * Clamps a decimal amount string to an inclusive [min, max] range using
 * BigInt-safe stroop-precision comparison, returning the original, min,
 * or max string as appropriate.
 */

/**
 * Number of stroops in 1 Stellar asset unit (10^7).
 */
export const STROOPS_PER_UNIT = 10_000_000n;

/**
 * Maximum fractional decimal places supported by Stellar (stroops).
 */
export const MAX_DECIMAL_PLACES = 7;

/**
 * Convert a decimal amount string or value to BigInt stroops.
 *
 * @param {string|number|bigint} value
 * @param {string} [paramName="amount"]
 * @returns {bigint}
 * @throws {TypeError} When value is null, undefined, or unsupported type
 * @throws {RangeError} When format is invalid, negative, or exceeds 7 decimals
 */
export function amountToStroops(value, paramName = "amount") {
  if (typeof value === "bigint") {
    return value;
  }
  if (value == null || (typeof value !== "string" && typeof value !== "number")) {
    throw new TypeError(`${paramName} must be a string, number, or bigint`);
  }
  const text = String(value).trim();
  if (!text) {
    throw new TypeError(`${paramName} must not be empty`);
  }
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new RangeError(
      `${paramName} must be a non-negative decimal amount, got "${text}"`,
    );
  }
  const [intPart, fracPart = ""] = text.split(".");
  if (fracPart.length > MAX_DECIMAL_PLACES) {
    throw new RangeError(
      `${paramName} exceeds maximum of ${MAX_DECIMAL_PLACES} decimal places`,
    );
  }
  const paddedFrac = fracPart.padEnd(MAX_DECIMAL_PLACES, "0");
  return BigInt(intPart) * STROOPS_PER_UNIT + BigInt(paddedFrac);
}

/**
 * Clamps a decimal amount string to an inclusive [min, max] range.
 *
 * @param {string|number|bigint} amount The target amount
 * @param {string|number|bigint|{ min?: string|number|bigint, max?: string|number|bigint }} minOrOptions
 * @param {string|number|bigint} [maybeMax]
 * @returns {string} The clamped amount string
 * @throws {RangeError} If min exceeds max or amount/min/max has invalid decimal format
 * @throws {TypeError} If amount/min/max has invalid data type
 */
export function clampAssetAmount(amount, minOrOptions, maybeMax) {
  let minVal;
  let maxVal;

  if (
    minOrOptions != null &&
    typeof minOrOptions === "object" &&
    typeof minOrOptions !== "bigint"
  ) {
    minVal = minOrOptions.min;
    maxVal = minOrOptions.max;
  } else {
    minVal = minOrOptions;
    maxVal = maybeMax;
  }

  const amountStroops = amountToStroops(amount, "amount");
  const amountStr = String(amount).trim();

  let minStroops = null;
  let minStr = null;
  if (minVal != null) {
    minStroops = amountToStroops(minVal, "min");
    minStr = String(minVal).trim();
  }

  let maxStroops = null;
  let maxStr = null;
  if (maxVal != null) {
    maxStroops = amountToStroops(maxVal, "max");
    maxStr = String(maxVal).trim();
  }

  if (minStroops != null && maxStroops != null && minStroops > maxStroops) {
    throw new RangeError(`min (${minStr}) cannot exceed max (${maxStr})`);
  }

  if (minStroops != null && amountStroops < minStroops) {
    return minStr;
  }
  if (maxStroops != null && amountStroops > maxStroops) {
    return maxStr;
  }

  return amountStr;
}

export const assetAmountClamp = clampAssetAmount;
export default clampAssetAmount;
