/**
 * Constants and limits for Horizon balance dust filtering.
 */

/** Number of stroops in one whole Stellar unit (10^7). */
export const STROOPS_PER_UNIT = 10_000_000n;

/**
 * Default dust threshold in stroops (1 stroop = 0.0000001).
 * Balances strictly below 1 stroop (i.e. zero balance lines) are filtered by default.
 */
export const DEFAULT_DUST_THRESHOLD_STROOPS = 1n;

/** Standard error messages. */
export const DUST_FILTER_ERROR = Object.freeze({
  BALANCES_ARRAY: "balances must be an array",
  ENTRY_OBJECT: "each balance must be an object",
  THRESHOLD_TYPE: "minThresholdStroops must be a valid number or bigint",
  THRESHOLD_NEGATIVE: "minThresholdStroops cannot be negative",
});
