/**
 * Pure helpers that shorten a Stellar G... address to a short display form
 * such as `GBBD...FLA5`. Only the string shape is inspected, so no network
 * call is made.
 */

const PUBLIC_KEY_LENGTH = 56;
const MIN_PREFIX = 1;
const MIN_SUFFIX = 1;
const MIN_SHORTENABLE_LENGTH = MIN_PREFIX + MIN_SUFFIX + 1;

/**
 * Shorten a Stellar public key for display.
 *
 * Returns a `<prefix>...<suffix>` string. Inputs that are not long enough to
 * keep at least one character on each side of the ellipsis are returned
 * unchanged, so callers never lose information.
 *
 * @param {string} value Stellar G... public key.
 * @param {number} [prefixLength=4] Characters kept at the start.
 * @param {number} [suffixLength=4] Characters kept at the end.
 * @returns {string} Shortened address, or the original string when it cannot
 * be shortened.
 */
export function shortenAddress(value, prefixLength = 4, suffixLength = 4) {
  if (typeof value !== "string") return value;
  const prefix = normalizeLength(prefixLength, MIN_PREFIX, PUBLIC_KEY_LENGTH);
  const suffix = normalizeLength(suffixLength, MIN_SUFFIX, PUBLIC_KEY_LENGTH);
  if (value.length < prefix + suffix + 1) return value;
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}

/**
 * Clamp a requested side length into a usable positive integer.
 *
 * @param {unknown} length Requested character count.
 * @param {number} min Smallest accepted value.
 * @param {number} max Largest accepted value.
 * @returns {number} A clamped integer length.
 */
function normalizeLength(length, min, max) {
  if (!Number.isFinite(length)) return min;
  const rounded = Math.trunc(length);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}


