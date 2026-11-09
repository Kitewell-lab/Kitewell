/**
 * Constants and error strings for Stellar SEP-7 URI parsing (`web+stellar:`).
 */

/** Canonical URI scheme prefix defined by SEP-7. */
export const SEP7_SCHEME = "web+stellar:";

/** Supported SEP-7 operation types. */
export const SEP7_OPERATIONS = Object.freeze(["pay", "tx"]);

/** Maximum accepted character length for a SEP-7 request URI. */
export const MAX_SEP7_URI_LENGTH = 8192;

/** Stable error messages thrown or returned by `sep7UriParse`. */
export const SEP7_URI_ERROR = Object.freeze({
  TYPE: "SEP-7 URI must be a string.",
  EMPTY: "SEP-7 URI is required.",
  TOO_LONG: "SEP-7 URI cannot exceed 8192 characters.",
  INVALID_SCHEME: 'SEP-7 URI must start with "web+stellar:".',
  MISSING_OPERATION: "SEP-7 URI operation is required.",
  UNSUPPORTED_OPERATION:
    'Unsupported SEP-7 operation. Expected "pay" or "tx".',
  MALFORMED_QUERY: "SEP-7 URI contains a malformed query parameter.",
  DUPLICATE_PARAM:
    "SEP-7 URI cannot contain duplicate query parameter keys.",
});
