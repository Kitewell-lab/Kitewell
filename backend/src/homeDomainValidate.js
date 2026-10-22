/**
 * @file homeDomainValidate.js
 * @description Validates Stellar account home_domain strings according to protocol constraints.
 */

const MAX_HOME_DOMAIN_BYTES = 32;
const LABEL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

/**
 * Custom error thrown when a home_domain string violates format or length constraints.
 */
export class InvalidHomeDomainError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidHomeDomainError';
    this.context = context;
  }
}

/**
 * Validates a Stellar home_domain string against protocol and shape rules:
 * - Must be a string.
 * - Must not exceed 32 bytes (UTF-8).
 * - Must contain only ASCII characters.
 * - Must not contain URI schemes (e.g. "https://").
 * - Must not contain paths (e.g. "/foo").
 * - Must not contain ports (e.g. ":8080").
 * - Must match basic domain-name structure (alphanumeric labels separated by dots, no leading/trailing hyphens).
 *
 * @param {*} domain - The home_domain to inspect
 * @returns {string} The validated domain string
 * @throws {InvalidHomeDomainError} If the domain is invalid
 */
export function validateHomeDomain(domain) {
  if (typeof domain !== 'string') {
    throw new InvalidHomeDomainError(
      `home_domain must be a string, got ${domain === null ? 'null' : typeof domain}`,
      { domain }
    );
  }

  if (domain.length === 0) {
    throw new InvalidHomeDomainError(
      'home_domain cannot be empty',
      { domain }
    );
  }

  // Reject non-ASCII characters
  if (/[^\x00-\x7F]/.test(domain)) {
    throw new InvalidHomeDomainError(
      'home_domain contains non-ASCII characters which are not allowed',
      { domain }
    );
  }

  // Check 32-byte constraint
  const byteLength = Buffer.byteLength(domain, 'utf8');
  if (byteLength > MAX_HOME_DOMAIN_BYTES) {
    throw new InvalidHomeDomainError(
      `home_domain exceeds maximum length of ${MAX_HOME_DOMAIN_BYTES} bytes (got ${byteLength} bytes)`,
      { domain, byteLength }
    );
  }

  // Reject schemes
  if (domain.includes('://') || /^(https?|ftp|file):/i.test(domain)) {
    throw new InvalidHomeDomainError(
      'home_domain must not include a URL scheme (e.g. "https://")',
      { domain }
    );
  }

  // Reject paths
  if (domain.includes('/') || domain.includes('\\')) {
    throw new InvalidHomeDomainError(
      'home_domain must not include a path (e.g. "/path")',
      { domain }
    );
  }

  // Reject ports
  if (domain.includes(':')) {
    throw new InvalidHomeDomainError(
      'home_domain must not include a port number (e.g. ":8080")',
      { domain }
    );
  }

  // Reject whitespace or control characters
  if (/\s/.test(domain) || /[\x00-\x1F\x7F]/.test(domain)) {
    throw new InvalidHomeDomainError(
      'home_domain must not contain whitespace or control characters',
      { domain }
    );
  }

  // Reject leading/trailing dots or consecutive dots
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    throw new InvalidHomeDomainError(
      'home_domain must not contain leading, trailing, or consecutive dots',
      { domain }
    );
  }

  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      throw new InvalidHomeDomainError(
        `Domain label "${label}" length must be between 1 and 63 characters`,
        { domain, label }
      );
    }
    if (!LABEL_REGEX.test(label)) {
      throw new InvalidHomeDomainError(
        `Domain label "${label}" is invalid: must be alphanumeric and cannot start or end with a hyphen`,
        { domain, label }
      );
    }
  }

  return domain;
}

/**
 * Checks whether an input value is a valid Stellar home_domain without throwing.
 *
 * @param {*} domain - Value to inspect
 * @returns {boolean} True if domain is valid, false otherwise
 */
export function isValidHomeDomain(domain) {
  try {
    validateHomeDomain(domain);
    return true;
  } catch (err) {
    if (err instanceof InvalidHomeDomainError) {
      return false;
    }
    throw err;
  }
}
