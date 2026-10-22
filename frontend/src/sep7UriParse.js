/**
 * @file sep7UriParse.js
 * @description Parses a SEP-7 web+stellar: request URI into operation type and query parameters.
 * Reference: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 */

export const SEP7_SCHEME = 'web+stellar';
export const SUPPORTED_OPERATIONS = Object.freeze(['pay', 'tx']);

/**
 * Custom error thrown when a SEP-7 URI string is malformed or invalid.
 */
export class Sep7ParseError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [details]
   */
  constructor(message, code = 'INVALID_SEP7_URI', details) {
    super(message);
    this.name = 'Sep7ParseError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses a SEP-7 request URI string into its operation and query parameters.
 *
 * @param {string} uri - The SEP-7 URI string (e.g. "web+stellar:pay?destination=G...")
 * @returns {{ operation: 'pay' | 'tx', params: Record<string, string>, raw: string }}
 * @throws {Sep7ParseError}
 */
export function parseSep7Uri(uri) {
  if (typeof uri !== 'string') {
    throw new Sep7ParseError(
      `SEP-7 URI must be a string, got ${uri === null ? 'null' : typeof uri}`,
      'INVALID_URI_TYPE',
      { uri }
    );
  }

  const trimmed = uri.trim();
  if (!trimmed) {
    throw new Sep7ParseError('SEP-7 URI cannot be empty', 'EMPTY_URI', { uri });
  }

  // Scheme prefix validation (web+stellar:)
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    throw new Sep7ParseError(
      'Invalid SEP-7 URI: missing scheme delimiter ":"',
      'INVALID_SCHEME',
      { uri }
    );
  }

  const scheme = trimmed.slice(0, colonIndex).toLowerCase();
  if (scheme !== SEP7_SCHEME) {
    throw new Sep7ParseError(
      `Invalid SEP-7 scheme: expected "${SEP7_SCHEME}", got "${scheme}"`,
      'INVALID_SCHEME',
      { scheme, uri }
    );
  }

  const afterScheme = trimmed.slice(colonIndex + 1);
  if (!afterScheme) {
    throw new Sep7ParseError(
      'Invalid SEP-7 URI: missing operation',
      'MISSING_OPERATION',
      { uri }
    );
  }

  // Split operation and query
  const questionIndex = afterScheme.indexOf('?');
  const operation = (questionIndex === -1 ? afterScheme : afterScheme.slice(0, questionIndex)).toLowerCase();
  const queryString = questionIndex === -1 ? '' : afterScheme.slice(questionIndex + 1);

  if (!operation) {
    throw new Sep7ParseError(
      'Invalid SEP-7 URI: missing operation name',
      'MISSING_OPERATION',
      { uri }
    );
  }

  if (!SUPPORTED_OPERATIONS.includes(operation)) {
    throw new Sep7ParseError(
      `Unsupported SEP-7 operation "${operation}". Supported operations: ${SUPPORTED_OPERATIONS.join(', ')}`,
      'UNSUPPORTED_OPERATION',
      { operation, supported: SUPPORTED_OPERATIONS, uri }
    );
  }

  const params = {};
  if (queryString) {
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      if (!pair) continue;
      const eqIndex = pair.indexOf('=');
      let rawKey;
      let rawValue;
      if (eqIndex === -1) {
        rawKey = pair;
        rawValue = '';
      } else {
        rawKey = pair.slice(0, eqIndex);
        rawValue = pair.slice(eqIndex + 1);
      }

      let key;
      let value;
      try {
        key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      } catch (err) {
        throw new Sep7ParseError(
          `Malformed URI encoding in parameter key: "${rawKey}"`,
          'MALFORMED_URI_ENCODING',
          { rawKey, error: err.message, uri }
        );
      }

      try {
        value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      } catch (err) {
        throw new Sep7ParseError(
          `Malformed URI encoding in parameter value: "${rawValue}"`,
          'MALFORMED_URI_ENCODING',
          { rawValue, error: err.message, uri }
        );
      }

      if (key) {
        params[key] = value;
      }
    }
  }

  return {
    operation,
    params,
    raw: trimmed,
  };
}

/**
 * Attempts to parse a SEP-7 URI, returning a typed result object instead of throwing.
 *
 * @param {string} uri - The SEP-7 URI string
 * @returns {{ ok: true, data: { operation: 'pay' | 'tx', params: Record<string, string>, raw: string } } | { ok: false, error: string, code: string, details?: * }}
 */
export function tryParseSep7Uri(uri) {
  try {
    const data = parseSep7Uri(uri);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Sep7ParseError) {
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
 * Checks whether a given string is a valid SEP-7 URI.
 *
 * @param {string} uri
 * @returns {boolean}
 */
export function isSep7Uri(uri) {
  return tryParseSep7Uri(uri).ok;
}
