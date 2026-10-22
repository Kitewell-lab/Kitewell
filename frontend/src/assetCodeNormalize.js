/**
 * Asset code normalizer.
 *
 * Normalizes a user-entered asset code by trimming whitespace and upper-casing letters,
 * returning the normalized string or a typed error for inputs that can't become a
 * valid code after normalization.
 */

export const MIN_ASSET_CODE_LENGTH = 1;
export const MAX_ASSET_CODE_LENGTH = 12;

export const ASSET_CODE_REGEX = /^[A-Za-z0-9]{1,12}$/;

/**
 * Typed error for asset code normalization failures.
 */
export class InvalidAssetCodeError extends Error {
  /**
   * @param {string} message
   * @param {"invalid_type" | "empty" | "too_long" | "invalid_charset"} reason
   * @param {unknown} [value]
   */
  constructor(message, reason, value) {
    super(message);
    this.name = "InvalidAssetCodeError";
    this.reason = reason;
    this.value = value;
  }
}

/**
 * Normalizes an asset code string by trimming and converting to uppercase.
 *
 * @param {unknown} value The user-entered asset code
 * @param {{
 *   allowNative?: boolean
 * }} [options={}]
 * @returns {string} The normalized asset code
 * @throws {InvalidAssetCodeError} When input cannot become a valid asset code
 */
export function normalizeAssetCode(value, options = {}) {
  if (value == null || (typeof value !== "string" && typeof value !== "number")) {
    throw new InvalidAssetCodeError(
      "Asset code must be a string or number",
      "invalid_type",
      value,
    );
  }

  const trimmed = String(value).trim();
  if (trimmed.length === 0) {
    throw new InvalidAssetCodeError(
      "Asset code must not be empty",
      "empty",
      value,
    );
  }

  const upper = trimmed.toUpperCase();

  // If allowNative option is true and code is native/XLM
  if (options.allowNative && (upper === "NATIVE" || upper === "XLM")) {
    return upper;
  }

  if (upper.length > MAX_ASSET_CODE_LENGTH) {
    throw new InvalidAssetCodeError(
      `Asset code exceeds maximum length of ${MAX_ASSET_CODE_LENGTH} characters, got ${upper.length}`,
      "too_long",
      value,
    );
  }

  if (!ASSET_CODE_REGEX.test(upper)) {
    throw new InvalidAssetCodeError(
      `Asset code contains invalid characters (must be alphanumeric A-Z, 0-9): "${trimmed}"`,
      "invalid_charset",
      value,
    );
  }

  return upper;
}

/**
 * Safely attempts to normalize an asset code, returning a result object without throwing.
 *
 * @param {unknown} value
 * @param {object} [options={}]
 * @returns {{ ok: true, code: string } | { ok: false, error: InvalidAssetCodeError }}
 */
export function tryNormalizeAssetCode(value, options = {}) {
  try {
    const code = normalizeAssetCode(value, options);
    return { ok: true, code };
  } catch (error) {
    if (error instanceof InvalidAssetCodeError) {
      return { ok: false, error };
    }
    throw error;
  }
}

export const assetCodeNormalize = normalizeAssetCode;
export default normalizeAssetCode;
