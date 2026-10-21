/**
 * Pure helper that redacts sensitive field names from objects before
 * they are written to structured log lines.
 */

const DEFAULT_SENSITIVE_KEYS = [
  "secret",
  "seed",
  "password",
  "authorization",
  "token",
  "key",
  "privatekey",
  "passphrase",
];

const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Deeply redact sensitive keys from a plain object or array.
 *
 * @param {unknown} input Plain object, array, or primitive.
 * @param {string[]} [customKeys] Optional list of key names to redact (case-insensitive).
 * @returns {unknown} A new object/array with sensitive values replaced by `"[REDACTED]"`.
 */
export function redactLogObject(input, customKeys) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const keysToRedact = Array.isArray(customKeys) && customKeys.length > 0
    ? customKeys.map((k) => String(k).toLowerCase())
    : DEFAULT_SENSITIVE_KEYS;

  if (Array.isArray(input)) {
    return input.map((item) => redactLogObject(item, keysToRedact));
  }

  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (keysToRedact.includes(key.toLowerCase())) {
      result[key] = REDACTED_PLACEHOLDER;
    } else if (value && typeof value === "object") {
      result[key] = redactLogObject(value, keysToRedact);
    } else {
      result[key] = value;
    }
  }

  return result;
}
