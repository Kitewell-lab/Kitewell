/**
 * Bounds and error messages for Stellar multisig threshold satisfaction checks.
 *
 * Stellar stores account operation thresholds (`low`, `med`, `high`) and signer
 * weights as unsigned 8-bit integers in the closed range `[0, 255]`.
 */

/** Minimum valid threshold or signer weight, inclusive. */
export const THRESHOLD_MIN = 0;

/** Maximum valid threshold or signer weight, inclusive. */
export const THRESHOLD_MAX = 255;

/** Minimum valid individual signer weight, inclusive. */
export const SIGNER_WEIGHT_MIN = 0;

/** Maximum valid individual signer weight, inclusive. */
export const SIGNER_WEIGHT_MAX = 255;

/** Stable error messages returned or thrown by `multisigThresholdCheck`. */
export const MULTISIG_THRESHOLD_ERROR = Object.freeze({
  WEIGHTS_NOT_ARRAY: "Signer weights must be an array",
  WEIGHT_TYPE:
    "Each signer weight must be a number or an object with a numeric weight",
  WEIGHT_INTEGER: "Each signer weight must be an integer",
  WEIGHT_RANGE: "Each signer weight must be between 0 and 255",
  THRESHOLD_TYPE: "Threshold must be a number",
  THRESHOLD_INTEGER: "Threshold must be an integer",
  THRESHOLD_RANGE: "Threshold must be between 0 and 255",
});
