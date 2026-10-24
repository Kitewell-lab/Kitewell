/**
 * Constants and error messages for canonical asset pair key builder.
 */

/** Canonical identifier string for the Stellar native asset. */
export const CANONICAL_NATIVE_ASSET = "native";

/** Standard separator character between base and counter assets in a canonical key. */
export const ASSET_PAIR_SEPARATOR = "/";

/** Credit asset code and issuer delimiters. */
export const ASSET_DELIMITER_COLON = ":";
export const ASSET_DELIMITER_DASH = "-";

/** Stable error message fragments for asset pair key building and validation. */
export const ASSET_PAIR_KEY_ERROR = Object.freeze({
  REQUIRED: "is required",
  EMPTY: "cannot be empty",
  INVALID_FORMAT: "Expected \"native\" or \"CODE:ISSUER\"",
  INVALID_CODE: "Must be 1-12 alphanumeric characters",
  INVALID_ISSUER: "Must be a 56-character Stellar public key",
  INVALID_OBJECT: "must specify type \"native\" or both code and issuer",
  INVALID_KEY_SEPARATOR: "must be a string containing a '/' separator",
});
