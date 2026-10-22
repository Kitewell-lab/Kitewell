/**
 * Surge pricing multiplier suggester.
 *
 * Given recent Horizon fee-stats percentiles, suggests a base-fee multiplier
 * (e.g. 1x/1.5x/2x) to use for faster inclusion, as a pure lookup/threshold
 * function with no network calls.
 */

export const DEFAULT_BASE_FEE = 100;
export const MIN_SURGE_MULTIPLIER = 1.0;
export const MAX_SURGE_MULTIPLIER = 10.0;

export const SURGE_TIERS = {
  low: 1.0,
  economy: 1.0,
  standard: 1.0,
  normal: 1.0,
  medium: 1.5,
  priority: 1.5,
  high: 2.0,
  urgent: 2.5,
  critical: 3.0,
};

/**
 * Extract numerical percentile or fee value from mixed representation.
 *
 * @param {unknown} val
 * @returns {number|null}
 */
function toNum(val) {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Suggest a surge pricing multiplier given Horizon fee stats.
 *
 * @param {object} feeStats Horizon /fee_stats object or fee charged percentiles
 * @param {{
 *   priority?: "low" | "standard" | "medium" | "priority" | "high" | "urgent" | "critical",
 *   baseFee?: number,
 *   minMultiplier?: number,
 *   maxMultiplier?: number
 * }} [options={}]
 * @returns {{
 *   multiplier: number,
 *   tier: string,
 *   capacityUsage: number | null,
 *   recommendedFee: number | null
 * }}
 * @throws {TypeError} When feeStats is not an object
 * @throws {RangeError} When priority or multiplier bounds are invalid
 */
export function suggestSurgeMultiplier(feeStats, options = {}) {
  if (!feeStats || typeof feeStats !== "object" || Array.isArray(feeStats)) {
    throw new TypeError("feeStats must be an object");
  }

  const baseFee = toNum(options.baseFee ?? feeStats.last_ledger_base_fee ?? feeStats.base_fee) ?? DEFAULT_BASE_FEE;

  const minMult = options.minMultiplier ?? MIN_SURGE_MULTIPLIER;
  const maxMult = options.maxMultiplier ?? MAX_SURGE_MULTIPLIER;
  if (minMult > maxMult) {
    throw new RangeError(`minMultiplier (${minMult}) cannot exceed maxMultiplier (${maxMult})`);
  }

  // Check explicit priority tier
  if (options.priority != null) {
    const rawPriority = String(options.priority).trim().toLowerCase();
    const tierMultiplier = SURGE_TIERS[rawPriority];
    if (tierMultiplier === undefined) {
      throw new RangeError(
        `Unsupported priority "${options.priority}". Allowed: ${Object.keys(SURGE_TIERS).join(", ")}`,
      );
    }
    const clampedMult = Math.min(Math.max(tierMultiplier, minMult), maxMult);
    return {
      multiplier: clampedMult,
      tier: rawPriority,
      capacityUsage: toNum(feeStats.ledger_capacity_usage ?? feeStats.capacity_usage),
      recommendedFee: Math.round(baseFee * clampedMult),
    };
  }

  // Automatic calculation based on capacity usage and percentiles
  const feeCharged = feeStats.fee_charged ?? feeStats.percentiles ?? feeStats;
  const capacityUsage = toNum(feeStats.ledger_capacity_usage ?? feeStats.capacity_usage);

  const p50 = toNum(feeCharged.p50 ?? feeCharged.mode);
  const p90 = toNum(feeCharged.p90);
  const p99 = toNum(feeCharged.p99 ?? feeCharged.max);

  let rawMultiplier = 1.0;
  let tier = "standard";

  // If capacity usage is reported, use network congestion thresholds
  if (capacityUsage != null) {
    if (capacityUsage >= 0.95) {
      rawMultiplier = 2.5;
      tier = "critical";
    } else if (capacityUsage >= 0.8) {
      rawMultiplier = 2.0;
      tier = "high";
    } else if (capacityUsage >= 0.5) {
      rawMultiplier = 1.5;
      tier = "medium";
    } else {
      rawMultiplier = 1.0;
      tier = "low";
    }
  } else if (p90 != null && baseFee > 0) {
    // Infer multiplier from fee percentiles ratio
    const ratio = p90 / baseFee;
    if (ratio >= 2.0) {
      rawMultiplier = 2.0;
      tier = "high";
    } else if (ratio >= 1.3) {
      rawMultiplier = 1.5;
      tier = "medium";
    } else {
      rawMultiplier = 1.0;
      tier = "low";
    }
  }

  const multiplier = Math.min(Math.max(rawMultiplier, minMult), maxMult);
  const recommendedFee = Math.round(baseFee * multiplier);

  return {
    multiplier,
    tier,
    capacityUsage,
    recommendedFee,
  };
}

export const surgeMultiplierSuggest = suggestSurgeMultiplier;
export default suggestSurgeMultiplier;
