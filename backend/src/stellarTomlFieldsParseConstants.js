/**
 * Constants and error strings for parsing top-level SEP-1 `stellar.toml` fields.
 */

/** Known top-level `stellar.toml` fields extracted by `parseStellarTomlFields`. */
export const KNOWN_STELLAR_TOML_FIELDS = Object.freeze([
  "NETWORK_PASSPHRASE",
  "FEDERATION_SERVER",
  "AUTH_SERVER",
  "SIGNING_KEY",
  "HORIZON_URL",
]);

/**
 * Maximum allowed UTF-8 byte size for a `stellar.toml` document (100 KB,
 * matching the SEP-1 specification limit).
 */
export const MAX_STELLAR_TOML_BYTES = 102_400;

/** Stable error messages thrown or returned by `stellarTomlFieldsParse`. */
export const STELLAR_TOML_PARSE_ERROR = Object.freeze({
  TYPE: "stellar.toml content must be a string",
  TOO_LARGE: "stellar.toml content exceeds maximum size of 102400 bytes",
  SYNTAX: "Malformed stellar.toml line or section header",
  DUPLICATE_KEY: "Duplicate top-level key in stellar.toml",
  INVALID_VALUE:
    "Known stellar.toml field value must be a quoted string",
});
