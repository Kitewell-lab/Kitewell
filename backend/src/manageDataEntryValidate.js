/**
 * @file manageDataEntryValidate.js
 * @description Validates Stellar manageData operation entry names and values against protocol constraints (max 64 bytes).
 */

/** Maximum allowed byte length for a Stellar data entry name (UTF-8). */
export const MAX_NAME_BYTES = 64;

/** Maximum allowed byte length for a Stellar data entry value (Buffer/binary). */
export const MAX_VALUE_BYTES = 64;

/** Error code constants for manageData validation failures. */
export const MANAGE_DATA_ERROR_CODES = Object.freeze({
  NAME_REQUIRED: 'NAME_REQUIRED',
  NAME_NOT_STRING: 'NAME_NOT_STRING',
  NAME_EMPTY: 'NAME_EMPTY',
  NAME_TOO_LONG: 'NAME_TOO_LONG',
  VALUE_INVALID_TYPE: 'VALUE_INVALID_TYPE',
  VALUE_INVALID_BASE64: 'VALUE_INVALID_BASE64',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG'
});

/**
 * Custom error thrown by assertValidManageDataEntry.
 */
export class ManageDataValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {*} [context]
   */
  constructor(message, code, context) {
    super(message);
    this.name = 'ManageDataValidationError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Strict base64 format regex.
 */
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Validates a manageData operation's name and value against Stellar protocol limits.
 *
 * @param {*} name - Data entry key name (max 64 bytes UTF-8)
 * @param {*} [value=null] - Data entry value (max 64 bytes, Buffer, base64 string, or null/undefined to delete)
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.allowRawString=true] - Whether to allow raw UTF-8 string values as fallback if not valid base64
 * @returns {{ ok: boolean, error?: string, code?: string, isDelete?: boolean, nameLength?: number, valueLength?: number, normalizedValue?: Buffer|null }}
 */
export function validateManageDataEntry(name, value = null, options = {}) {
  // Validate name
  if (name === null || name === undefined) {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.NAME_REQUIRED,
      error: 'Data entry name is required'
    };
  }

  if (typeof name !== 'string') {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.NAME_NOT_STRING,
      error: `Data entry name must be a string, got ${typeof name}`
    };
  }

  if (name.length === 0) {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.NAME_EMPTY,
      error: 'Data entry name cannot be empty'
    };
  }

  const nameLength = Buffer.byteLength(name, 'utf8');
  if (nameLength > MAX_NAME_BYTES) {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.NAME_TOO_LONG,
      error: `Data entry name exceeds ${MAX_NAME_BYTES} bytes limit (${nameLength} bytes)`
    };
  }

  // Validate value (null or undefined represents deleting the data entry in Stellar)
  if (value === null || value === undefined) {
    return {
      ok: true,
      isDelete: true,
      nameLength,
      valueLength: 0,
      normalizedValue: null
    };
  }

  let valueBuffer;
  if (Buffer.isBuffer(value)) {
    valueBuffer = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      valueBuffer = Buffer.alloc(0);
    } else if (BASE64_REGEX.test(trimmed) && trimmed.length % 4 === 0) {
      valueBuffer = Buffer.from(trimmed, 'base64');
    } else if (options.allowRawString !== false) {
      valueBuffer = Buffer.from(value, 'utf8');
    } else {
      return {
        ok: false,
        code: MANAGE_DATA_ERROR_CODES.VALUE_INVALID_BASE64,
        error: 'Data entry string value must be a valid base64 string'
      };
    }
  } else {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.VALUE_INVALID_TYPE,
      error: `Data entry value must be a Buffer, string, or null/undefined, got ${typeof value}`
    };
  }

  const valueLength = valueBuffer.length;
  if (valueLength > MAX_VALUE_BYTES) {
    return {
      ok: false,
      code: MANAGE_DATA_ERROR_CODES.VALUE_TOO_LONG,
      error: `Data entry value exceeds ${MAX_VALUE_BYTES} bytes limit (${valueLength} bytes)`
    };
  }

  return {
    ok: true,
    isDelete: false,
    nameLength,
    valueLength,
    normalizedValue: valueBuffer
  };
}

/**
 * Returns true if the manageData entry name and value are valid according to Stellar protocol limits.
 *
 * @param {*} name - Data entry name
 * @param {*} [value=null] - Data entry value
 * @param {Object} [options={}] - Options
 * @returns {boolean} True if valid
 */
export function isValidManageDataEntry(name, value = null, options = {}) {
  const result = validateManageDataEntry(name, value, options);
  return result.ok === true;
}

/**
 * Asserts that a manageData entry is valid, throwing ManageDataValidationError if not.
 *
 * @param {*} name - Data entry name
 * @param {*} [value=null] - Data entry value
 * @param {Object} [options={}] - Options
 * @returns {{ ok: true, isDelete: boolean, nameLength: number, valueLength: number, normalizedValue: Buffer|null }}
 * @throws {ManageDataValidationError}
 */
export function assertValidManageDataEntry(name, value = null, options = {}) {
  const result = validateManageDataEntry(name, value, options);
  if (!result.ok) {
    throw new ManageDataValidationError(result.error, result.code, { name, value });
  }
  return result;
}
