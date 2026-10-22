# manageDataEntryValidate

`manageDataEntryValidate` is a backend validation module for Stellar `manageData` operations, ensuring that data entry names and values strictly conform to Stellar protocol specifications.

## Protocol Constraints

- **Data Entry Name**:
  - Must be a non-empty UTF-8 string.
  - Byte length must not exceed 64 bytes (`Buffer.byteLength(name, 'utf8') <= 64`).
- **Data Entry Value**:
  - Can be `null` or `undefined` (represents deleting/clearing the entry in Stellar).
  - Can be a binary `Buffer` or base64 string (or raw UTF-8 string fallback).
  - Binary byte length must not exceed 64 bytes (`valueBuffer.length <= 64`).

## Public API

### `validateManageDataEntry(name, value, options)`

Validates a manageData operation entry without throwing.

- **Parameters**:
  - `name` (`string`): Entry key name (1-64 UTF-8 bytes).
  - `value` (`Buffer|string|null|undefined`, optional): Entry binary value (0-64 bytes) or `null` to delete.
  - `options` (`Object`, optional):
    - `allowRawString` (`boolean`, default: `true`): Allow raw UTF-8 string values as fallback when not valid base64.
- **Returns**: Typed result object:
  - If valid: `{ ok: true, isDelete: boolean, nameLength: number, valueLength: number, normalizedValue: Buffer|null }`
  - If invalid: `{ ok: false, error: string, code: string }`

### `isValidManageDataEntry(name, value, options)`

Returns `true` if entry is valid according to Stellar limits, `false` otherwise.

### `assertValidManageDataEntry(name, value, options)`

Throws `ManageDataValidationError` if entry is invalid; returns success result otherwise.

### `MAX_NAME_BYTES` & `MAX_VALUE_BYTES`

Constants set to `64`.

### `MANAGE_DATA_ERROR_CODES`

Frozen map of error codes (`NAME_REQUIRED`, `NAME_NOT_STRING`, `NAME_EMPTY`, `NAME_TOO_LONG`, `VALUE_INVALID_TYPE`, `VALUE_INVALID_BASE64`, `VALUE_TOO_LONG`).

### `ManageDataValidationError`

Custom Error class thrown by `assertValidManageDataEntry`.
