/**
 * Pure helper that validates Stellar asset code strings (length 1-12,
 * alphanumeric) without requiring the Horizon SDK.
 */

const ASSET_CODE_PATTERN = /^[a-zA-Z0-9]{1,12}$/;

/**
 * Validate a Stellar asset code string.
 *
 * @param {unknown} value Candidate asset code.
 * @returns {boolean} True if `value` is a string of 1-12 alphanumeric characters.
 */
export function isValidAssetCode(value) {
  if (typeof value !== "string") return false;
  return ASSET_CODE_PATTERN.test(value);
}

/**
 * Check if an asset code represents native XLM.
 *
 * @param {unknown} value Candidate asset code.
 * @returns {boolean} True if `value` is `"XLM"` or `"native"`.
 */
export function isNativeAssetCode(value) {
  if (typeof value !== "string") return false;
  const upper = value.trim().toUpperCase();
  return upper === "XLM" || upper === "NATIVE";
}
