/**
 * Constants and error strings for formatting Horizon `/fee_stats` responses.
 */

/**
 * Canonical ordered list of Horizon fee distribution fields from minimum/mode
 * through percentiles (`p10..p99`) to maximum.
 */
export const FEE_STATS_FIELDS = Object.freeze([
  "min",
  "mode",
  "p10",
  "p20",
  "p30",
  "p40",
  "p50",
  "p60",
  "p70",
  "p80",
  "p90",
  "p95",
  "p99",
  "max",
]);

/** Supported top-level distribution buckets on a Horizon `/fee_stats` payload. */
export const FEE_STATS_BUCKETS = Object.freeze(["fee_charged", "max_fee"]);

/** Default distribution bucket read when a full `/fee_stats` response is passed. */
export const DEFAULT_FEE_STATS_BUCKET = "fee_charged";

/** Stable error messages thrown or returned by `feeStatsFormat`. */
export const FEE_STATS_FORMAT_ERROR = Object.freeze({
  TYPE: "Fee stats input must be a plain object.",
  OPTIONS_TYPE: "Fee stats options must be a plain object.",
  INVALID_BUCKET: 'Fee stats bucket must be "fee_charged" or "max_fee".',
  MISSING_BUCKET: "Fee stats response is missing the requested fee bucket.",
  MISSING_FIELD: "Fee stats distribution is missing required field",
  INVALID_STROOPS:
    "Fee stats stroops value must be a non-negative safe integer or digit string",
});
