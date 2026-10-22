/**
 * @file federationAddressParse.js
 * @description Parses Stellar SEP-0002 federation addresses (name*domain.com) into name and domain components.
 */

/**
 * Custom error thrown when a federation address string is invalid or malformed.
 */
export class InvalidFederationAddressError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidFederationAddressError';
    this.context = context;
  }
}

/**
 * Basic domain validation regex (disallows spaces and requires at least one character).
 */
const DOMAIN_FORMAT_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?::\d+)?$/;

/**
 * Parses a federation address string into its name and domain parts.
 *
 * @param {string} address - Federation address string (e.g. "jed*stellar.org")
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.trim=true] - Trim leading/trailing whitespace
 * @param {boolean} [options.lowercaseDomain=true] - Convert domain component to lowercase
 * @param {boolean} [options.lowercaseName=false] - Convert name component to lowercase
 * @param {boolean} [options.validateDomain=false] - Strictly validate domain structure
 * @returns {{ name: string, domain: string, raw: string }}
 * @throws {InvalidFederationAddressError}
 */
export function parseFederationAddress(address, options = {}) {
  if (typeof address !== 'string') {
    throw new InvalidFederationAddressError(
      `Federation address must be a string, got ${address === null ? 'null' : typeof address}`,
      { address }
    );
  }

  const {
    trim = true,
    lowercaseDomain = true,
    lowercaseName = false,
    validateDomain = false
  } = options;

  const processed = trim ? address.trim() : address;

  if (processed.length === 0) {
    throw new InvalidFederationAddressError('Federation address cannot be empty', { address });
  }

  const starCount = (processed.match(/\*/g) || []).length;
  if (starCount === 0) {
    throw new InvalidFederationAddressError(
      'Federation address must contain a "*" separator',
      { address: processed }
    );
  }

  if (starCount > 1) {
    throw new InvalidFederationAddressError(
      `Federation address must contain exactly one "*" separator, found ${starCount}`,
      { address: processed, starCount }
    );
  }

  const parts = processed.split('*');
  const rawName = parts[0];
  const rawDomain = parts[1];

  if (!rawName || rawName.trim().length === 0) {
    throw new InvalidFederationAddressError(
      'Federation address name component cannot be empty',
      { address: processed }
    );
  }

  if (!rawDomain || rawDomain.trim().length === 0) {
    throw new InvalidFederationAddressError(
      'Federation address domain component cannot be empty',
      { address: processed }
    );
  }

  const name = lowercaseName ? rawName.toLowerCase() : rawName;
  const domain = lowercaseDomain ? rawDomain.toLowerCase() : rawDomain;

  if (validateDomain && !DOMAIN_FORMAT_REGEX.test(domain)) {
    throw new InvalidFederationAddressError(
      `Invalid federation domain format "${domain}"`,
      { domain, address: processed }
    );
  }

  return {
    name,
    domain,
    raw: processed
  };
}

/**
 * Checks whether an input represents a valid federation address.
 *
 * @param {*} address - Address to validate
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if valid
 */
export function isValidFederationAddress(address, options = {}) {
  try {
    parseFederationAddress(address, options);
    return true;
  } catch (err) {
    if (err instanceof InvalidFederationAddressError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely parses a federation address, returning a fallback on invalid input without throwing.
 *
 * @param {*} address - Address to parse
 * @param {Object} [options={}] - Options
 * @param {*} [fallback=null] - Fallback value
 * @returns {{ name: string, domain: string, raw: string }|*}
 */
export function tryParseFederationAddress(address, options = {}, fallback = null) {
  try {
    return parseFederationAddress(address, options);
  } catch (err) {
    if (err instanceof InvalidFederationAddressError) {
      return fallback;
    }
    throw err;
  }
}
