/**
 * Base64 XDR shape validator.
 *
 * Validates that a string plausibly represents base64-encoded XDR
 * (correct base64 alphabet, padding, and length % 4 == 0) without
 * attempting to decode or parse its contents.
 */

/**
 * Standard Base64 regex matching 4-character chunks with valid padding.
 * Ensures:
 * - Only characters from [A-Za-z0-9+/]
 * - Length is a multiple of 4
 * - Padding ('=') only occurs at the end (0, 1, or 2 '=' characters)
 */
export const BASE64_SHAPE_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

/**
 * Check whether a value has the shape of a valid Base64-encoded XDR string.
 *
 * @param {unknown} value
 * @param {{
 *   allowEmpty?: boolean,
 *   trim?: boolean
 * }} [options={}]
 * @returns {boolean}
 */
export function isValidXdrBase64(value, options = {}) {
  if (typeof value !== "string") {
    return false;
  }

  const shouldTrim = options.trim ?? true;
  const text = shouldTrim ? value.trim() : value;

  if (text.length === 0) {
    return Boolean(options.allowEmpty);
  }

  if (text.length % 4 !== 0) {
    return false;
  }

  return BASE64_SHAPE_REGEX.test(text);
}

/**
 * Validate that a value is a valid Base64-encoded XDR string, throwing an Error if not.
 *
 * @param {unknown} value
 * @param {string} [name="XDR"]
 * @param {{
 *   allowEmpty?: boolean,
 *   trim?: boolean
 * }} [options={}]
 * @returns {string} The trimmed valid base64 string
 * @throws {TypeError} When value is not a string
 * @throws {RangeError} When length or characters are invalid
 */
export function assertValidXdrBase64(value, name = "XDR", options = {}) {
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string`);
  }

  const shouldTrim = options.trim ?? true;
  const text = shouldTrim ? value.trim() : value;

  if (text.length === 0) {
    if (options.allowEmpty) {
      return text;
    }
    throw new RangeError(`${name} must not be empty`);
  }

  if (text.length % 4 !== 0) {
    throw new RangeError(
      `${name} base64 length must be a multiple of 4, got length ${text.length}`,
    );
  }

  if (!BASE64_SHAPE_REGEX.test(text)) {
    throw new RangeError(`${name} contains invalid base64 characters or padding`);
  }

  return text;
}

export const xdrBase64ShapeValidate = isValidXdrBase64;
export default isValidXdrBase64;
