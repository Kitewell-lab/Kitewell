/**
 * @file federationAddressParse.js
 * @description Parses a Stellar federation address (name*domain.com) into name and domain components.
 * Reference: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md
 */

export const FEDERATION_SEPARATOR = '*';

/**
 * Custom error thrown when a federation address string is invalid.
 */
export class FederationAddressParseError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [details]
   */
  constructor(message, code = 'INVALID_FEDERATION_ADDRESS', details) {
    super(message);
    this.name = 'FederationAddressParseError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses a federation address string into { name, domain }.
 *
 * @param {string} address - The federation address string (e.g. "jed*stellar.org")
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.trim=true] - Whether to trim outer whitespace before parsing
 * @returns {{ name: string, domain: string, raw: string }}
 * @throws {FederationAddressParseError}
 */
export function parseFederationAddress(address, options = {}) {
  if (typeof address !== 'string') {
    throw new FederationAddressParseError(
      `Federation address must be a string, got ${address === null ? 'null' : typeof address}`,
      'INVALID_ADDRESS_TYPE',
      { address }
    );
  }

  const { trim = true } = options;
  const processed = trim ? address.trim() : address;

  if (!processed) {
    throw new FederationAddressParseError(
      'Federation address cannot be empty',
      'EMPTY_ADDRESS',
      { address }
    );
  }

  const firstStar = processed.indexOf(FEDERATION_SEPARATOR);
  if (firstStar === -1) {
    throw new FederationAddressParseError(
      `Invalid federation address: missing separator "${FEDERATION_SEPARATOR}"`,
      'MISSING_SEPARATOR',
      { address: processed }
    );
  }

  const lastStar = processed.lastIndexOf(FEDERATION_SEPARATOR);
  if (firstStar !== lastStar) {
    throw new FederationAddressParseError(
      `Invalid federation address: expected exactly one "${FEDERATION_SEPARATOR}" separator, found multiple`,
      'MULTIPLE_SEPARATORS',
      { address: processed }
    );
  }

  const name = processed.slice(0, firstStar);
  const domain = processed.slice(firstStar + 1);

  if (!name) {
    throw new FederationAddressParseError(
      'Invalid federation address: name part cannot be empty',
      'EMPTY_NAME',
      { address: processed, name, domain }
    );
  }

  if (!domain) {
    throw new FederationAddressParseError(
      'Invalid federation address: domain part cannot be empty',
      'EMPTY_DOMAIN',
      { address: processed, name, domain }
    );
  }

  return {
    name,
    domain,
    raw: processed,
  };
}

/**
 * Attempts to parse a federation address, returning a typed result object without throwing.
 *
 * @param {string} address
 * @param {Object} [options={}]
 * @returns {{ ok: true, data: { name: string, domain: string, raw: string } } | { ok: false, error: string, code: string, details?: * }}
 */
export function tryParseFederationAddress(address, options = {}) {
  try {
    const data = parseFederationAddress(address, options);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof FederationAddressParseError) {
      return {
        ok: false,
        error: err.message,
        code: err.code,
        details: err.details,
      };
    }
    return {
      ok: false,
      error: err.message,
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Checks whether a given string is a valid federation address.
 *
 * @param {string} address
 * @param {Object} [options={}]
 * @returns {boolean}
 */
export function isFederationAddress(address, options = {}) {
  return tryParseFederationAddress(address, options).ok;
}
