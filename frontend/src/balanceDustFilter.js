/**
 * Horizon balance dust filter.
 *
 * Filters an array of Horizon balance line objects, removing entries below
 * a configurable minimum display threshold (in stroops) while always keeping
 * the native XLM balance regardless of amount.
 *
 * Rule:
 *  1. Native XLM (`asset_type === "native"`) is always retained, even if zero.
 *  2. Non-native balances are converted to integer stroops (1 unit = 10^7 stroops).
 *  3. Any non-native balance with stroops strictly less than the minimum threshold
 *     is removed as dust.
 *  4. Returns a new filtered array without mutating the input array.
 */

import {
  STROOPS_PER_UNIT,
  DEFAULT_DUST_THRESHOLD_STROOPS,
  DUST_FILTER_ERROR,
} from "./balanceDustFilterConstants.js";

/**
 * Convert a Stellar balance decimal string to BigInt stroops.
 * Supports strings like "100", "0.5", "0.0000001", "0.0000000", numbers, and bigints.
 *
 * @param {string|number|bigint} value Stellar decimal balance string
 * @returns {bigint} Integer amount in stroops (10^-7 units)
 * @throws {TypeError} If value cannot be parsed
 */
export function balanceToStroops(value) {
  if (typeof value === "bigint") return value;
  if (value == null) return 0n;

  const text = String(value).trim();
  if (!text) return 0n;

  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new TypeError(`Invalid balance amount format: "${text}"`);
  }

  const [intPart = "0", fracPartRaw = ""] = text.split(".");
  const fracPart = fracPartRaw.slice(0, 7).padEnd(7, "0");
  return BigInt(intPart) * STROOPS_PER_UNIT + BigInt(fracPart);
}

/**
 * Resolve the minimum threshold in BigInt stroops from an argument or options object.
 *
 * @param {number|bigint|{ minThresholdStroops?: number|bigint }} [optionsOrThreshold]
 * @returns {bigint}
 * @throws {TypeError|RangeError}
 */
function resolveThreshold(optionsOrThreshold) {
  if (optionsOrThreshold === undefined) {
    return DEFAULT_DUST_THRESHOLD_STROOPS;
  }

  let raw = optionsOrThreshold;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    raw = raw.minThresholdStroops ?? DEFAULT_DUST_THRESHOLD_STROOPS;
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || Number.isNaN(raw)) {
      throw new TypeError(DUST_FILTER_ERROR.THRESHOLD_TYPE);
    }
    if (raw < 0) {
      throw new RangeError(DUST_FILTER_ERROR.THRESHOLD_NEGATIVE);
    }
    return BigInt(Math.floor(raw));
  }

  if (typeof raw === "bigint") {
    if (raw < 0n) {
      throw new RangeError(DUST_FILTER_ERROR.THRESHOLD_NEGATIVE);
    }
    return raw;
  }

  throw new TypeError(DUST_FILTER_ERROR.THRESHOLD_TYPE);
}

/**
 * Filter an array of Horizon balance lines by dust threshold.
 *
 * @param {unknown} balances Horizon `balances` array
 * @param {number|bigint|{ minThresholdStroops?: number|bigint }} [optionsOrThreshold=1n] Minimum threshold in stroops (inclusive)
 * @returns {object[]} New array with dust entries excluded
 * @throws {TypeError} When balances is not an array, or an entry is not an object
 * @throws {RangeError} When threshold is negative
 */
export function filterDustBalances(balances, optionsOrThreshold = DEFAULT_DUST_THRESHOLD_STROOPS) {
  if (!Array.isArray(balances)) {
    throw new TypeError(DUST_FILTER_ERROR.BALANCES_ARRAY);
  }

  const thresholdStroops = resolveThreshold(optionsOrThreshold);

  return balances.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new TypeError(DUST_FILTER_ERROR.ENTRY_OBJECT);
    }

    // Rule: native XLM is always kept regardless of balance amount
    if (entry.asset_type === "native") {
      return true;
    }

    const stroops = balanceToStroops(entry.balance);
    return stroops >= thresholdStroops;
  });
}

/**
 * Alias for filterDustBalances matching the module name.
 */
export const balanceDustFilter = filterDustBalances;

export {
  STROOPS_PER_UNIT,
  DEFAULT_DUST_THRESHOLD_STROOPS,
  DUST_FILTER_ERROR,
};

export default filterDustBalances;
