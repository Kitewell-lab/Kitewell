/**
 * Pure helpers that validate Stellar G... public keys without any
 * network access. Only the string format is checked: length, the
 * version byte prefix and the base32 charset.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PUBLIC_KEY_LENGTH = 56;

/**
 * Check that a value is a non-empty string of the exact length
 * required for a Stellar public key.
 *
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when `value` is a string of length 56.
 */
export function hasPublicKeyLength(value) {
  return typeof value === "string" && value.length === PUBLIC_KEY_LENGTH;
}

/**
 * Check that every character of a public key is uppercase base32
 * (A-Z plus 2-7). Lowercase and other symbols are rejected.
 *
 * @param {string} value Candidate public key.
 * @returns {boolean} True when the whole string is base32.
 */
export function isBase32(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  for (const char of value) {
    if (!BASE32_ALPHABET.includes(char)) return false;
  }
  return true;
}

/**
 * Validate the format of a Stellar G... public key.
 *
 * The check is purely local: length 56, a leading `G` and an
 * uppercase base32 body. No Horizon or RPC call is made, so a
 * syntactically valid but unused address still passes.
 *
 * @param {unknown} value Candidate address.
 * @returns {boolean} True when `value` looks like a public key.
 */
export function isValidPublicKey(value) {
  if (!hasPublicKeyLength(value)) return false;
  if (value[0] !== "G") return false;
  return isBase32(value);
}
