/**
 * @file stellarTomlFieldsParse.js
 * @description Parses raw stellar.toml text content and extracts known top-level fields without external network requests.
 */

/**
 * Standard known top-level fields specified in SEP-0001 stellar.toml.
 */
export const KNOWN_STELLAR_TOML_FIELDS = Object.freeze([
  'NETWORK_PASSPHRASE',
  'FEDERATION_SERVER',
  'AUTH_SERVER',
  'SIGNING_KEY',
  'HORIZON_URL'
]);

/**
 * Custom error thrown when stellar.toml input is invalid or cannot be parsed.
 */
export class InvalidStellarTomlError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidStellarTomlError';
    this.context = context;
  }
}

/**
 * Unquotes and decodes a TOML string value.
 *
 * @param {string} raw - Raw string value from TOML
 * @returns {string} Clean decoded string
 */
function unquoteTomlString(raw) {
  const trimmed = raw.trim();

  // Multi-line quotes """ or '''
  if ((trimmed.startsWith('"""') && trimmed.endsWith('"""')) || (trimmed.startsWith("'''") && trimmed.endsWith("'''"))) {
    return trimmed.slice(3, -3);
  }

  // Double quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  // Single quotes
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Parses stellar.toml text and extracts known top-level key-value fields into a plain object.
 *
 * @param {*} tomlText - Raw stellar.toml text content
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.fields=KNOWN_STELLAR_TOML_FIELDS] - Fields to extract
 * @param {boolean} [options.onlyTopLevel=true] - Only parse before any section header [section]
 * @returns {Record<string, string>} Plain object with extracted fields
 * @throws {InvalidStellarTomlError} If tomlText is not a string
 */
export function parseStellarTomlFields(tomlText, options = {}) {
  if (typeof tomlText !== 'string') {
    throw new InvalidStellarTomlError(
      `stellar.toml content must be a string, got ${tomlText === null ? 'null' : typeof tomlText}`,
      { tomlText }
    );
  }

  const {
    fields = KNOWN_STELLAR_TOML_FIELDS,
    onlyTopLevel = true
  } = options;

  const targetSet = new Set(fields.map((f) => f.toUpperCase()));
  const lines = tomlText.split(/\r?\n/);
  const result = {};

  let inSubSection = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    // Skip empty lines and comment lines
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    // Check if line introduces a table or array of tables [section] or [[section]]
    if (line.startsWith('[') && line.endsWith(']')) {
      if (onlyTopLevel) {
        inSubSection = true;
      }
      continue;
    }

    if (inSubSection) {
      continue;
    }

    // Strip inline comments if they appear after quotes
    let cleanLine = line;
    const hashIndex = line.indexOf('#');
    if (hashIndex !== -1) {
      // Simple heuristic: if hash is not inside quotes
      const beforeHash = line.slice(0, hashIndex);
      const quoteCount = (beforeHash.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        cleanLine = beforeHash.trim();
      }
    }

    const eqIndex = cleanLine.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const rawKey = cleanLine.slice(0, eqIndex).trim().toUpperCase();
    const rawVal = cleanLine.slice(eqIndex + 1).trim();

    if (targetSet.has(rawKey)) {
      result[rawKey] = unquoteTomlString(rawVal);
    }
  }

  return result;
}

/**
 * Checks whether an input can be parsed as stellar.toml text.
 *
 * @param {*} tomlText - Content to check
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if string
 */
export function isValidStellarToml(tomlText, options = {}) {
  try {
    parseStellarTomlFields(tomlText, options);
    return true;
  } catch (err) {
    if (err instanceof InvalidStellarTomlError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely parses stellar.toml text, returning fallback on error without throwing.
 *
 * @param {*} tomlText - Content to parse
 * @param {Object} [options={}] - Options
 * @param {*} [fallback={}] - Fallback value
 * @returns {Record<string, string>|*}
 */
export function tryParseStellarTomlFields(tomlText, options = {}, fallback = {}) {
  try {
    return parseStellarTomlFields(tomlText, options);
  } catch (err) {
    if (err instanceof InvalidStellarTomlError) {
      return fallback;
    }
    throw err;
  }
}
