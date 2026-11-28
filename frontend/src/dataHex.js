/** Largest manage-data value Stellar accepts, in bytes. */
export const MAX_DATA_VALUE_BYTES = 64;

const HEX_DIGITS = /^[0-9a-fA-F]*$/;

/**
 * Parse a manage-data value entered in hex mode into bytes.
 * Needs an even number of hex characters and at most 64 bytes.
 *
 * @param {string} input
 * @returns {Uint8Array}
 */
export function parseHexDataValue(input) {
  const text = String(input ?? "").trim();
  if (!HEX_DIGITS.test(text)) {
    throw new Error("Hex value may only contain the characters 0-9 and a-f.");
  }
  if (text.length % 2 !== 0) {
    throw new Error("Hex value must have an even number of characters.");
  }
  if (text.length / 2 > MAX_DATA_VALUE_BYTES) {
    throw new Error("Data value must be 64 bytes or fewer.");
  }
  const bytes = new Uint8Array(text.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(text.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Render a stored data value as lowercase hex, whether it is the base64 string
 * Horizon returns or raw bytes. `parseHexDataValue` output reads back the same.
 *
 * @param {string|Uint8Array|null|undefined} value
 * @returns {string}
 */
export function formatDataValueAsHex(value) {
  if (value == null) return "";
  let bytes;
  if (value instanceof Uint8Array) {
    bytes = value;
  } else {
    try {
      const binary = atob(String(value));
      bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
      bytes = new TextEncoder().encode(String(value));
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
