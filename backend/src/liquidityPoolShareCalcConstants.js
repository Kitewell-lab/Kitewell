/**
 * Constants and error strings for Stellar liquidity pool share percentage
 * calculations.
 *
 * Horizon reports liquidity pool share balances and total pool shares as
 * 7-decimal strings (stroop precision, `10^-7`), while low-level callers may
 * pass raw `BigInt` or integer share counts. All arithmetic is performed with
 * `BigInt` to avoid IEEE-754 floating-point precision loss.
 */

/** Maximum decimal places supported in a Stellar share amount string. */
export const STROOP_DECIMALS = 7;

/** Multiplier used to scale a 7-decimal Stellar amount into integer stroops. */
export const STROOP_SCALE = 10_000_000n;

/** Default number of fractional digits in the returned percentage string. */
export const DEFAULT_SHARE_PRECISION = 4;

/** Minimum allowed fractional digits for the percentage output. */
export const MIN_SHARE_PRECISION = 0;

/** Maximum allowed fractional digits for the percentage output. */
export const MAX_SHARE_PRECISION = 18;

/** Default rounding mode (`"half-up"` rounds 0.5 ulp away from zero). */
export const DEFAULT_ROUNDING_MODE = "half-up";

/** Supported rounding modes for percentage output formatting. */
export const SUPPORTED_ROUNDING_MODES = Object.freeze(["half-up", "down"]);

/** Stable error messages used by `liquidityPoolShareCalc`. */
export const LIQUIDITY_POOL_SHARE_ERROR = Object.freeze({
  SHARE_TYPE:
    "shareBalance must be a BigInt, non-negative safe integer, or decimal string",
  SHARE_NEGATIVE: "shareBalance must be non-negative",
  SHARE_FORMAT:
    "shareBalance string must be a valid non-negative decimal with at most 7 fractional digits",
  TOTAL_TYPE:
    "totalShares must be a BigInt, positive safe integer, or decimal string",
  TOTAL_NON_POSITIVE: "totalShares must be greater than zero",
  TOTAL_FORMAT:
    "totalShares string must be a valid decimal with at most 7 fractional digits",
  EXCEEDS_TOTAL: "shareBalance cannot exceed totalShares",
  OPTIONS_TYPE: "options must be a plain object",
  PRECISION_RANGE: "precision must be an integer between 0 and 18",
  ROUNDING_INVALID: 'rounding must be either "half-up" or "down"',
});
