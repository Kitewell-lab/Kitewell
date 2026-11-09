/**
 * Constants and error messages for Stellar claimable balance ID validation and
 * display formatting.
 *
 * A Horizon claimable balance ID is a 72-character hexadecimal string:
 * - 8 hex characters (`"00000000"`) encoding the 4-byte XDR discriminant
 *   `CLAIMABLE_BALANCE_ID_TYPE_V0` (`0`), followed by
 * - 64 hex characters encoding the 32-byte SHA-256 balance hash.
 */

/** Total length in hex characters of a Stellar claimable balance ID. */
export const CLAIMABLE_BALANCE_ID_LENGTH = 72;

/** 4-byte XDR discriminant prefix (`CLAIMABLE_BALANCE_ID_TYPE_V0 = 0`). */
export const CLAIMABLE_BALANCE_TYPE_PREFIX = "00000000";

/** Ellipsis character inserted between prefix and suffix when shortening. */
export const ELLIPSIS = "…";

/** Default number of characters kept from the start of the ID. */
export const DEFAULT_PREFIX_LENGTH = 6;

/** Default number of characters kept from the end of the ID. */
export const DEFAULT_SUFFIX_LENGTH = 6;

/** Stable error messages used by `claimableBalanceIdFormat`. */
export const CLAIMABLE_BALANCE_ID_ERROR = Object.freeze({
  TYPE: "Claimable balance ID must be a string.",
  EMPTY: "Claimable balance ID is required.",
  LENGTH: "Claimable balance ID must be exactly 72 hexadecimal characters.",
  HEX: "Claimable balance ID must contain only hexadecimal characters (0-9, a-f).",
  PREFIX:
    'Claimable balance ID must start with the V0 type prefix "00000000".',
  OPTIONS_TYPE: "Formatting options must be an object.",
  PREFIX_LENGTH: "prefixLength must be a non-negative integer.",
  SUFFIX_LENGTH: "suffixLength must be a non-negative integer.",
  BOTH_ZERO: "prefixLength and suffixLength cannot both be 0.",
});
