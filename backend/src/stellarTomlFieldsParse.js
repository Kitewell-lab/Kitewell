/**
 * @file stellarTomlFieldsParse.js
 * @description Parses stellar.toml raw string content and extracts known top-level fields (SEP-0001).
 * Extracts: NETWORK_PASSPHRASE, FEDERATION_SERVER, AUTH_SERVER, SIGNING_KEY, HORIZON_URL.
 */

export const KNOWN_TOP_LEVEL_FIELDS = Object.freeze([
  'NETWORK_PASSPHRASE',
  'FEDERATION_SERVER',
  'AUTH_SERVER',
  'SIGNING_KEY',
  'HORIZON_URL',
]);

/**
 * Custom error thrown when stellar.toml parsing fails due to invalid arguments.
 */
export class StellarTomlParseError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_TOML_CONTENT', context) {
    super(message);
    this.name = 'StellarTomlParseError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Strips comments and quotes from a TOML value token.
 *
 * @param {string} rawValue
 * @returns {string}
 */
function cleanTomlValue(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return '';

  // Quoted string (double quotes or single quotes)
  const quoteChar = trimmed[0];
  if (quoteChar === '"' || quoteChar === "'") {
    let result = '';
    let escaped = false;
    let closed = false;

    for (let i = 1; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (escaped) {
        if (char === 'n') result += '\n';
        else if (char === 't') result += '\t';
        else if (char === 'r') result += '\r';
        else result += char;
        escaped = false;
      } else if (char === '\\' && quoteChar === '"') {
        escaped = true;
      } else if (char === quoteChar) {
        closed = true;
        break;
      } else {
        result += char;
      }
    }

    if (closed) {
      return result;
    }
  }

  // Unquoted: take up to comment marker '#'
  const commentIndex = trimmed.indexOf('#');
  const token = commentIndex === -1 ? trimmed : trimmed.slice(0, commentIndex).trim();
  return token;
}

/**
 * Inspects raw stellar.toml text content and returns extracted fields without throwing.
 *
 * @param {*} rawContent - The raw TOML string
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.allowedFields=KNOWN_TOP_LEVEL_FIELDS] - Array of allowed field keys to extract
 * @returns {{ ok: true, fields: Record<string, string>, fieldCount: number } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkStellarTomlFields(rawContent, options = {}) {
  if (typeof rawContent !== 'string') {
    return {
      ok: false,
      code: 'INVALID_CONTENT_TYPE',
      error: `stellar.toml content must be a string, got ${rawContent === null ? 'null' : typeof rawContent}`,
      details: { rawContent },
    };
  }

  const { allowedFields = KNOWN_TOP_LEVEL_FIELDS } = options;
  const allowedSet = new Set(allowedFields.map((f) => f.toUpperCase()));

  const lines = rawContent.split(/\r?\n/);
  const result = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    // Stop at the first table section [table_name] or [[array_table]]
    if (/^\[{1,2}.*\]{1,2}$/.test(trimmed)) {
      break;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const rawKey = trimmed.slice(0, eqIndex).trim();
    const rawVal = trimmed.slice(eqIndex + 1);

    const upperKey = rawKey.toUpperCase();
    if (allowedSet.has(upperKey)) {
      const cleaned = cleanTomlValue(rawVal);
      result[upperKey] = cleaned;
    }
  }

  return {
    ok: true,
    fields: result,
    fieldCount: Object.keys(result).length,
  };
}

/**
 * Parses raw stellar.toml string content and extracts known top-level fields into a plain object.
 *
 * @param {*} rawContent
 * @param {Object} [options={}]
 * @returns {Record<string, string>}
 * @throws {StellarTomlParseError}
 */
export function parseStellarTomlFields(rawContent, options = {}) {
  const check = checkStellarTomlFields(rawContent, options);
  if (!check.ok) {
    throw new StellarTomlParseError(check.error, check.code, check.details);
  }
  return check.fields;
}

/**
 * Checks whether the input can be parsed without throwing.
 *
 * @param {*} rawContent
 * @param {Object} [options={}]
 * @returns {boolean}
 */
export function isStellarTomlFieldsParseable(rawContent, options = {}) {
  return checkStellarTomlFields(rawContent, options).ok;
}
