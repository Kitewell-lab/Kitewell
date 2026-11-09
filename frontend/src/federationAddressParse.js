import {
  FEDERATION_ADDRESS_ERROR,
  FEDERATION_SEPARATOR,
  FORBIDDEN_NAME_CHARS,
  MAX_DOMAIN_LABEL_LENGTH,
  MAX_FEDERATION_DOMAIN_LENGTH,
  MAX_FEDERATION_NAME_LENGTH,
} from "./federationAddressParseConstants.js";

/** DNS label pattern: alphanumeric start/end, inner hyphens allowed, 1-63 chars. */
const DOMAIN_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Check whether a string contains whitespace, ASCII control characters, or
 * SEP-2 forbidden characters (`<`, `>`, `,`, `*`).
 *
 * @param {string} value
 * @returns {boolean}
 */
function hasInvalidNameChars(value) {
  if (/\s/.test(value)) return true;

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
    if (FORBIDDEN_NAME_CHARS.includes(ch)) return true;
  }

  return false;
}

/**
 * Validate and normalize the `name` portion of a federation address.
 *
 * @param {string} rawName
 * @returns {string}
 */
function validateName(rawName) {
  if (rawName.length === 0) {
    throw new Error(FEDERATION_ADDRESS_ERROR.EMPTY_NAME);
  }

  if (rawName.length > MAX_FEDERATION_NAME_LENGTH) {
    throw new Error(FEDERATION_ADDRESS_ERROR.NAME_TOO_LONG);
  }

  if (hasInvalidNameChars(rawName)) {
    throw new Error(FEDERATION_ADDRESS_ERROR.INVALID_NAME);
  }

  return rawName;
}

/**
 * Validate and normalize the `domain` portion of a federation address.
 * Domains are normalized to lowercase.
 *
 * @param {string} rawDomain
 * @returns {string}
 */
function validateDomain(rawDomain) {
  if (rawDomain.length === 0) {
    throw new Error(FEDERATION_ADDRESS_ERROR.EMPTY_DOMAIN);
  }

  if (/\s/.test(rawDomain)) {
    throw new Error(FEDERATION_ADDRESS_ERROR.INVALID_DOMAIN);
  }

  const domain = rawDomain.toLowerCase();
  if (domain.length > MAX_FEDERATION_DOMAIN_LENGTH) {
    throw new Error(FEDERATION_ADDRESS_ERROR.DOMAIN_TOO_LONG);
  }

  const labels = domain.split(".");
  if (labels.length < 2) {
    throw new Error(FEDERATION_ADDRESS_ERROR.INVALID_DOMAIN);
  }

  for (const label of labels) {
    if (
      label.length === 0 ||
      label.length > MAX_DOMAIN_LABEL_LENGTH ||
      !DOMAIN_LABEL.test(label)
    ) {
      throw new Error(FEDERATION_ADDRESS_ERROR.INVALID_DOMAIN);
    }
  }

  const tld = labels[labels.length - 1];
  if (!/[a-z]/.test(tld)) {
    throw new Error(FEDERATION_ADDRESS_ERROR.INVALID_DOMAIN);
  }

  return domain;
}

/**
 * Parse a Stellar SEP-2 federation address (`name*domain.com`) into `{ name, domain }`.
 *
 * Validation rules:
 * 1. Input must be a `string` (surrounding whitespace is trimmed).
 * 2. Exactly one `*` separator must be present.
 * 3. `name` (before `*`) must be non-empty, at most 256 characters, and free of
 *    whitespace, control characters, and SEP-2 forbidden characters (`<`, `>`, `,`, `*`).
 * 4. `domain` (after `*`) must be a valid multi-label DNS domain (at most 253
 *    characters) and is normalized to lowercase.
 *
 * @param {string} address Federation address string, e.g. `"alice*example.com"`.
 * @returns {{ name: string, domain: string }} Parsed `{ name, domain }` pair.
 * @throws {TypeError} When `address` is not a string.
 * @throws {Error} When `address` is empty, missing `*`, has multiple `*` separators,
 *   or has an empty/invalid `name` or `domain`.
 *
 * @example
 * parseFederationAddress("alice*example.com");
 * // => { name: "alice", domain: "example.com" }
 */
export function parseFederationAddress(address) {
  if (typeof address !== "string") {
    throw new TypeError(FEDERATION_ADDRESS_ERROR.TYPE);
  }

  const trimmed = address.trim();
  if (trimmed.length === 0) {
    throw new Error(FEDERATION_ADDRESS_ERROR.EMPTY);
  }

  const firstStar = trimmed.indexOf(FEDERATION_SEPARATOR);
  if (firstStar === -1) {
    throw new Error(FEDERATION_ADDRESS_ERROR.MISSING_SEPARATOR);
  }

  const lastStar = trimmed.lastIndexOf(FEDERATION_SEPARATOR);
  if (firstStar !== lastStar) {
    throw new Error(FEDERATION_ADDRESS_ERROR.MULTIPLE_SEPARATORS);
  }

  const rawName = trimmed.slice(0, firstStar);
  const rawDomain = trimmed.slice(firstStar + 1);

  const name = validateName(rawName);
  const domain = validateDomain(rawDomain);

  return { name, domain };
}

/**
 * Non-throwing companion to {@link parseFederationAddress}.
 *
 * @param {unknown} address Candidate federation address.
 * @returns {{ ok: true, name: string, domain: string } | { ok: false, error: string }}
 */
export function tryParseFederationAddress(address) {
  try {
    const { name, domain } = parseFederationAddress(address);
    return { ok: true, name, domain };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Return `true` when `address` is a valid SEP-2 federation address.
 * Never throws.
 *
 * @param {unknown} address Candidate federation address.
 * @returns {boolean}
 */
export function isValidFederationAddress(address) {
  return tryParseFederationAddress(address).ok === true;
}

/**
 * Format a `{ name, domain }` pair into a canonical `name*domain` federation address.
 *
 * @param {string} name Local federation name.
 * @param {string} domain Federation server domain.
 * @returns {string} Canonical `name*domain` string.
 * @throws {TypeError} When `name` or `domain` is not a string.
 * @throws {Error} When `name` or `domain` is invalid.
 */
export function formatFederationAddress(name, domain) {
  if (typeof name !== "string" || typeof domain !== "string") {
    throw new TypeError(FEDERATION_ADDRESS_ERROR.TYPE);
  }

  const validName = validateName(name.trim());
  const validDomain = validateDomain(domain.trim());
  return `${validName}${FEDERATION_SEPARATOR}${validDomain}`;
}
