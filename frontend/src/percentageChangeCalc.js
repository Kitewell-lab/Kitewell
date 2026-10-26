/**
 * Balance percentage-change calculator.
 *
 * Computes the percentage change between two BigInt-safe balance strings
 * (e.g. for a 24h change indicator), safely handling zero-previous-balance
 * edge cases without dividing by zero.
 */

export const STROOPS_PER_UNIT = 10_000_000n;
export const MAX_DECIMAL_PLACES = 7;

/**
 * Parse an amount string, number, or BigInt into BigInt stroops.
 *
 * @param {string|number|bigint} value
 * @param {string} [name="balance"]
 * @returns {bigint}
 */
export function balanceToStroops(value, name = "balance") {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new RangeError(`${name} must be non-negative`);
    }
    return value;
  }
  if (value == null || (typeof value !== "string" && typeof value !== "number")) {
    throw new TypeError(`${name} must be a string, number, or bigint`);
  }
  const text = String(value).trim();
  if (!text) {
    throw new TypeError(`${name} must not be empty`);
  }
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new RangeError(`${name} must be a non-negative decimal amount, got "${text}"`);
  }
  const [intPart, fracPart = ""] = text.split(".");
  if (fracPart.length > MAX_DECIMAL_PLACES) {
    throw new RangeError(`${name} exceeds maximum of ${MAX_DECIMAL_PLACES} decimal places`);
  }
  const paddedFrac = fracPart.padEnd(MAX_DECIMAL_PLACES, "0");
  return BigInt(intPart) * STROOPS_PER_UNIT + BigInt(paddedFrac);
}

/**
 * Format stroops back to a decimal string.
 *
 * @param {bigint} stroops
 * @returns {string}
 */
export function stroopsToBalance(stroops) {
  const sign = stroops < 0n ? "-" : "";
  const absVal = stroops < 0n ? -stroops : stroops;
  const intPart = absVal / STROOPS_PER_UNIT;
  const fracPart = (absVal % STROOPS_PER_UNIT).toString().padStart(MAX_DECIMAL_PLACES, "0");
  const trimmedFrac = fracPart.replace(/0+$/, "");
  return trimmedFrac ? `${sign}${intPart}.${trimmedFrac}` : `${sign}${intPart}`;
}

/**
 * Calculate the percentage change between previous and current balance.
 *
 * @param {string|number|bigint} previous Previous balance
 * @param {string|number|bigint} current Current balance
 * @param {{
 *   decimals?: number,
 *   zeroPreviousFallback?: number | null,
 *   zeroPreviousFormat?: string
 * }} [options={}]
 * @returns {{
 *   percentage: number | null,
 *   direction: "up" | "down" | "flat",
 *   difference: string,
 *   differenceStroops: bigint,
 *   formatted: string,
 *   isInfinite: boolean
 * }}
 */
export function calculatePercentageChange(previous, current, options = {}) {
  const prevStroops = balanceToStroops(previous, "previous balance");
  const currStroops = balanceToStroops(current, "current balance");

  const decimals = options.decimals ?? 2;
  if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 10) {
    throw new RangeError("decimals option must be an integer between 0 and 10");
  }

  const diffStroops = currStroops - prevStroops;
  const diffStr = stroopsToBalance(diffStroops);

  // Case 1: Both balances are identical (0% change)
  if (diffStroops === 0n) {
    return {
      percentage: 0,
      direction: "flat",
      difference: "0",
      differenceStroops: 0n,
      formatted: `${(0).toFixed(decimals)}%`,
      isInfinite: false,
    };
  }

  // Case 2: Previous balance is 0 and current is positive (zero division edge case)
  if (prevStroops === 0n) {
    const fallback = options.zeroPreviousFallback !== undefined ? options.zeroPreviousFallback : null;
    const fallbackFormat = options.zeroPreviousFormat ?? (fallback !== null ? `+${fallback.toFixed(decimals)}%` : "N/A");
    return {
      percentage: fallback,
      direction: "up",
      difference: `+${diffStr}`,
      differenceStroops: diffStroops,
      formatted: fallbackFormat,
      isInfinite: true,
    };
  }

  // Case 3: Normal calculation using precision scaled arithmetic
  // Use high-precision scaling: (diff * 10^8 / prev) / 10^6 = percentage float
  const scale = 100_000_000n;
  const scaledPct = (diffStroops * 100n * scale) / prevStroops;
  const percentage = Number(scaledPct) / Number(scale);

  const direction = diffStroops > 0n ? "up" : "down";
  const sign = diffStroops > 0n ? "+" : "";
  const formatted = `${sign}${percentage.toFixed(decimals)}%`;
  const signedDiffStr = diffStroops > 0n ? `+${diffStr}` : diffStr;

  return {
    percentage,
    direction,
    difference: signedDiffStr,
    differenceStroops: diffStroops,
    formatted,
    isInfinite: false,
  };
}

export const percentageChangeCalc = calculatePercentageChange;
export default calculatePercentageChange;
