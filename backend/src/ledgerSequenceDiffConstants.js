/**
 * Constants and error messages for ledger sequence difference calculations.
 */

/** Argument positional labels indicating which argument is newer/older. */
export const LEDGER_SEQUENCE_ARGUMENT = Object.freeze({
  FIRST: "first",
  SECOND: "second",
  NEITHER: null,
});

/** Numeric sign indicator for relative sequence ordering. */
export const LEDGER_SEQUENCE_SIGN = Object.freeze({
  FIRST_NEWER: 1,
  SECOND_NEWER: -1,
  EQUAL: 0,
});

/** Stable error message fragments for input validations. */
export const LEDGER_SEQUENCE_ERROR = Object.freeze({
  REQUIRED: "is required",
  EMPTY: "cannot be empty",
  NEGATIVE: "cannot be negative",
  VALID_NUMBER: "must be a valid number",
  INTEGER: "must be an integer",
  INVALID_FORMAT: "Invalid integer format",
});
