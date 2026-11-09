/**
 * Constants and error messages for Stellar SEP-2 federation address parsing.
 */

/** Separator character between the local name and domain in SEP-2 addresses. */
export const FEDERATION_SEPARATOR = "*";

/** Maximum allowed length of the local `name` part of a federation address. */
export const MAX_FEDERATION_NAME_LENGTH = 256;

/** Maximum allowed length of a DNS domain (RFC 1035 / SEP-2). */
export const MAX_FEDERATION_DOMAIN_LENGTH = 253;

/** Maximum allowed length of a single DNS domain label. */
export const MAX_DOMAIN_LABEL_LENGTH = 63;

/** Characters explicitly disallowed in a SEP-2 federation name. */
export const FORBIDDEN_NAME_CHARS = Object.freeze(["<", ">", ",", "*"]);

/** Stable error messages thrown or returned by `federationAddressParse`. */
export const FEDERATION_ADDRESS_ERROR = Object.freeze({
  TYPE: "Federation address must be a string.",
  EMPTY: "Federation address is required.",
  MISSING_SEPARATOR: 'Federation address must contain a "*" separator.',
  MULTIPLE_SEPARATORS:
    'Federation address must contain exactly one "*" separator.',
  EMPTY_NAME: "Federation address name before \"*\" cannot be empty.",
  EMPTY_DOMAIN: "Federation address domain after \"*\" cannot be empty.",
  NAME_TOO_LONG: "Federation address name cannot exceed 256 characters.",
  INVALID_NAME:
    "Federation address name contains invalid characters or whitespace.",
  DOMAIN_TOO_LONG: "Federation address domain cannot exceed 253 characters.",
  INVALID_DOMAIN: "Federation address domain must be a valid domain name.",
});
