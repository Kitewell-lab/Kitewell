/**
 * @file manageDataEntryValidate.js
 * @description Validates Stellar manageData operation entries (name and value) against protocol byte limits.
 */

export const MAX_MANAGE_DATA_KEY_BYTES = 64;
export const MAX_MANAGE_DATA_VALUE_BYTES = 64;

const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Custom error thrown when a manageData entry violates Stellar protocol constraints.
 */
export class InvalidManageDataEntryError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_MANAGE_DATA_ENTRY', context) {
    super(message);
    this.name = 'InvalidManageDataEntryError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Inspects a manageData entry and returns a typed ok/error result without throwing.
 *
 * @param {Object} entry - The data entry to inspect { name, value }
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.encoding='auto'] - Expected value string encoding ('auto' | 'base64' | 'utf8')
 * @returns {{ ok: true, name: string, nameByteLength: number, hasValue: boolean, isDelete: boolean, valueByteLength: number } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkManageDataEntry(entry, options = {}) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return {
      ok: false,
      code: 'INVALID_ENTRY_OBJECT',
      error: `Entry must be a non-null object, got ${entry === null ? 'null' : typeof entry}`,
    };
  }

  const { name, value } = entry;

  // Validate name
  if (typeof name !== 'string') {
    return {
      ok: false,
      code: 'INVALID_NAME_TYPE',
      error: `manageData name must be a string, got ${name === null ? 'null' : typeof name}`,
      details: { name },
    };
  }

  if (name.length === 0) {
    return {
      ok: false,
      code: 'EMPTY_NAME',
      error: 'manageData name cannot be an empty string',
      details: { name },
    };
  }

  const nameByteLength = Buffer.byteLength(name, 'utf8');
  if (nameByteLength > MAX_MANAGE_DATA_KEY_BYTES) {
    return {
      ok: false,
      code: 'NAME_TOO_LONG',
      error: `manageData name exceeds maximum limit of ${MAX_MANAGE_DATA_KEY_BYTES} bytes (got ${nameByteLength} bytes)`,
      details: { name, nameByteLength, max: MAX_MANAGE_DATA_KEY_BYTES },
    };
  }

  // Validate value (null or undefined denotes deletion in Stellar protocol)
  const isDelete = value === null || value === undefined;
  let valueByteLength = 0;

  if (!isDelete) {
    const { encoding = 'auto' } = options;

    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      valueByteLength = value.length;
    } else if (typeof value === 'string') {
      if (encoding === 'base64') {
        const trimmed = value.trim();
        if (!BASE64_REGEX.test(trimmed)) {
          return {
            ok: false,
            code: 'INVALID_BASE64_VALUE',
            error: 'manageData value is not a valid base64-encoded string',
            details: { value },
          };
        }
        valueByteLength = Buffer.from(trimmed, 'base64').length;
      } else if (encoding === 'utf8') {
        valueByteLength = Buffer.byteLength(value, 'utf8');
      } else {
        // 'auto': if valid base64 and multiple of 4, decode as base64; otherwise calculate utf8 length
        const trimmed = value.trim();
        if (trimmed.length > 0 && trimmed.length % 4 === 0 && BASE64_REGEX.test(trimmed)) {
          valueByteLength = Buffer.from(trimmed, 'base64').length;
        } else {
          valueByteLength = Buffer.byteLength(value, 'utf8');
        }
      }
    } else {
      return {
        ok: false,
        code: 'INVALID_VALUE_TYPE',
        error: `manageData value must be null, undefined, string, or Buffer, got ${typeof value}`,
        details: { value },
      };
    }

    if (valueByteLength > MAX_MANAGE_DATA_VALUE_BYTES) {
      return {
        ok: false,
        code: 'VALUE_TOO_LONG',
        error: `manageData value exceeds maximum limit of ${MAX_MANAGE_DATA_VALUE_BYTES} bytes (got ${valueByteLength} bytes)`,
        details: { valueByteLength, max: MAX_MANAGE_DATA_VALUE_BYTES },
      };
    }
  }

  return {
    ok: true,
    name,
    nameByteLength,
    hasValue: !isDelete,
    isDelete,
    valueByteLength,
  };
}

/**
 * Validates a manageData entry, throwing an InvalidManageDataEntryError if validation fails.
 *
 * @param {Object} entry - Entry { name, value }
 * @param {Object} [options={}] - Options
 * @returns {{ ok: true, name: string, nameByteLength: number, hasValue: boolean, isDelete: boolean, valueByteLength: number }}
 * @throws {InvalidManageDataEntryError}
 */
export function validateManageDataEntry(entry, options = {}) {
  const result = checkManageDataEntry(entry, options);
  if (!result.ok) {
    throw new InvalidManageDataEntryError(result.error, result.code, result.details);
  }
  return result;
}

export const assertManageDataEntry = validateManageDataEntry;

/**
 * Checks whether an entry is valid without throwing.
 *
 * @param {Object} entry - Entry to inspect
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidManageDataEntry(entry, options = {}) {
  return checkManageDataEntry(entry, options).ok;
}
