/**
 * Constants for Stellar reserve ratio and balance formatting.
 */

/** Number of stroops in one whole XLM (10^7). */
export const STROOPS_PER_XLM = 10_000_000n;

/** Default Stellar network base reserve: 0.5 XLM = 5,000,000 stroops. */
export const DEFAULT_BASE_RESERVE_STROOPS = 5_000_000n;

/** Base reserve multiplier for an account entry itself (2 base reserves). */
export const ACCOUNT_BASE_RESERVE_MULTIPLIER = 2n;

/** Standard error messages. */
export const RESERVE_FORMAT_ERROR = Object.freeze({
  BALANCE_REQUIRED: "nativeBalance is required",
  BALANCE_EMPTY: "nativeBalance cannot be empty",
  NEGATIVE: "cannot be negative",
  INVALID_SUBENTRY: "subentryCount must be an integer",
});
