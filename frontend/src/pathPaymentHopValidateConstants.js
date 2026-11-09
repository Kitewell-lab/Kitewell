/**
 * Constants and error strings for Stellar path payment intermediate hop list
 * validation.
 *
 * Stellar `pathPaymentStrictSend` and `pathPaymentStrictReceive` operations
 * allow between 0 and 5 intermediate assets in the `path` array.
 */

/** Minimum number of intermediate hops (an empty path is valid). */
export const MIN_PATH_PAYMENT_HOPS = 0;

/** Maximum number of intermediate hops permitted by the Stellar protocol. */
export const MAX_PATH_PAYMENT_HOPS = 5;

/** Stable error messages returned or thrown by `pathPaymentHopValidate`. */
export const PATH_HOP_VALIDATE_ERROR = Object.freeze({
  NOT_ARRAY: "Path hops must be an array.",
  TOO_MANY_HOPS: "Path payment supports at most 5 intermediate hops.",
  INVALID_HOP:
    "Each path hop must be a valid native or issued asset descriptor.",
  DUPLICATE_CONSECUTIVE_HOP:
    "Path payment cannot contain duplicate consecutive hops.",
});
