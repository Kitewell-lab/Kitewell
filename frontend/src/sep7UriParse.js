/**
 * @file sep7UriParse.js
 * @description Parses Stellar SEP-0007 web+stellar: request URI strings into structured operation types and query parameters without signing or network calls.
 */

/**
 * Standard SEP-7 scheme prefix.
 */
export const SEP7_SCHEME = 'web+stellar:';

/**
 * Standard SEP-7 supported operations.
 */
export const SUPPORTED_OPERATIONS = Object.freeze(['pay', 'tx']);

/**
 * Custom error thrown when SEP-7 URI input is invalid or unsupported.
 */
export class InvalidSep7UriError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidSep7UriError';
    this.context = context;
  }
}

/**
 * Parses a web+stellar: SEP-0007 URI string into operation type and query parameters.
 *
 * @param {string} uri - Raw SEP-7 URI string
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.allowedOperations=SUPPORTED_OPERATIONS] - Allowed operation types
 * @param {boolean} [options.trim=true] - Whether to trim leading/trailing whitespace
 * @returns {{ operation: string, params: Record<string, string>, rawUri: string }}
 * @throws {InvalidSep7UriError}
 */
export function parseSep7Uri(uri, options = {}) {
  if (typeof uri !== 'string') {
    throw new InvalidSep7UriError(
      `SEP-7 URI must be a string, got ${uri === null ? 'null' : typeof uri}`,
      { uri }
    );
  }

  const {
    allowedOperations = SUPPORTED_OPERATIONS,
    trim = true
  } = options;

  const processed = trim ? uri.trim() : uri;

  if (processed.length === 0) {
    throw new InvalidSep7UriError('SEP-7 URI cannot be empty', { uri });
  }

  const lower = processed.toLowerCase();
  if (!lower.startsWith(SEP7_SCHEME)) {
    throw new InvalidSep7UriError(
      `SEP-7 URI must start with "${SEP7_SCHEME}", got "${processed.slice(0, 20)}"`,
      { uri: processed }
    );
  }

  // Strip scheme prefix (case-insensitive)
  let rest = processed.slice(SEP7_SCHEME.length);

  // If formatted as web+stellar://operation?..., strip leading slashes
  if (rest.startsWith('//')) {
    rest = rest.slice(2);
  }

  const questionIndex = rest.indexOf('?');
  let rawOperation;
  let queryString = '';

  if (questionIndex === -1) {
    rawOperation = rest;
  } else {
    rawOperation = rest.slice(0, questionIndex);
    queryString = rest.slice(questionIndex + 1);
  }

  const operation = rawOperation.trim().toLowerCase();

  if (!operation) {
    throw new InvalidSep7UriError('SEP-7 URI is missing operation type', { uri: processed });
  }

  if (Array.isArray(allowedOperations) && !allowedOperations.map((op) => op.toLowerCase()).includes(operation)) {
    throw new InvalidSep7UriError(
      `Unsupported SEP-7 operation "${operation}". Allowed: ${allowedOperations.join(', ')}`,
      { operation, allowedOperations }
    );
  }

  const params = {};
  if (queryString.length > 0) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  return {
    operation,
    params,
    rawUri: processed
  };
}

/**
 * Checks whether an input represents a valid SEP-7 URI.
 *
 * @param {*} uri - URI string to check
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if valid
 */
export function isValidSep7Uri(uri, options = {}) {
  try {
    parseSep7Uri(uri, options);
    return true;
  } catch (err) {
    if (err instanceof InvalidSep7UriError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely parses a SEP-7 URI, returning fallback value on error instead of throwing.
 *
 * @param {*} uri - URI string
 * @param {Object} [options={}] - Options
 * @param {*} [fallback=null] - Fallback value
 * @returns {{ operation: string, params: Record<string, string>, rawUri: string }|*}
 */
export function tryParseSep7Uri(uri, options = {}, fallback = null) {
  try {
    return parseSep7Uri(uri, options);
  } catch (err) {
    if (err instanceof InvalidSep7UriError) {
      return fallback;
    }
    throw err;
  }
}
