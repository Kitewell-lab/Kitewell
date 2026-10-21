/**
 * Pure helpers that build and validate Stellar memos (text / id / hash).
 *
 * Every function returns a typed result instead of throwing:
 *   - `{ ok: true, value }` when the memo is valid, or
 *   - `{ ok: false, error: { code, message } }` when it is not.
 */

const TEXT_MAX_BYTES = 28;
const HASH_HEX_LENGTH = 64;
const MAX_UINT64 = 18446744073709551615n;

/**
 * Validate a text memo (UTF-8 byte length of at most 28 bytes).
 *
 * @param {unknown} text Candidate text memo.
 * @returns {{ok: true, value: {type: string, value: string}}|{ok: false, error: {code: string, message: string}}}
 */
export function buildTextMemo(text) {
  if (typeof text !== "string") {
    return { ok: false, error: { code: "INVALID_TYPE", message: "Text memo must be a string." } };
  }
  if (text.length === 0) {
    return { ok: false, error: { code: "EMPTY_MEMO", message: "Text memo must not be empty." } };
  }
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > TEXT_MAX_BYTES) {
    return {
      ok: false,
      error: { code: "TOO_LONG", message: "Text memo exceeds " + TEXT_MAX_BYTES + " bytes (got " + bytes + ")." },
    };
  }
  return { ok: true, value: { type: "text", value: text } };
}

/**
 * Validate an id memo (unsigned 64-bit integer).
 *
 * Accepts a non-negative safe integer, a decimal digit string, or a bigint.
 *
 * @param {unknown} id Candidate id memo.
 * @returns {{ok: true, value: {type: string, value: string}}|{ok: false, error: {code: string, message: string}}}
 */
export function buildIdMemo(id) {
  let n;
  if (typeof id === "number") {
    if (!Number.isSafeInteger(id) || id < 0) {
      return { ok: false, error: { code: "INVALID_ID", message: "Id memo must be a non-negative safe integer or a decimal digit string." } };
    }
    n = BigInt(id);
  } else if (typeof id === "bigint") {
    n = id;
  } else if (typeof id === "string") {
    const trimmed = id.trim();
    if (!/^\d+$/.test(trimmed)) {
      return { ok: false, error: { code: "INVALID_ID", message: "Id memo must be a decimal digit string or a non-negative safe integer." } };
    }
    n = BigInt(trimmed);
  } else {
    return { ok: false, error: { code: "INVALID_TYPE", message: "Id memo must be a number, digit string, or bigint." } };
  }
  if (n < 0n || n > MAX_UINT64) {
    return { ok: false, error: { code: "OUT_OF_RANGE", message: "Id memo must be between 0 and 2^64-1." } };
  }
  return { ok: true, value: { type: "id", value: n.toString() } };
}

/**
 * Validate a hash memo (exactly 32 bytes given as 64 hex characters).
 *
 * Uppercase hex is accepted and normalized to lowercase.
 *
 * @param {unknown} hex Candidate hash memo.
 * @returns {{ok: true, value: {type: string, value: string}}|{ok: false, error: {code: string, message: string}}}
 */
export function buildHashMemo(hex) {
  if (typeof hex !== "string") {
    return { ok: false, error: { code: "INVALID_TYPE", message: "Hash memo must be a hex string." } };
  }
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    return {
      ok: false,
      error: { code: "INVALID_HASH", message: "Hash memo must be exactly 32 bytes of hex (" + HASH_HEX_LENGTH + " hex chars)." },
    };
  }
  return { ok: true, value: { type: "hash", value: normalized } };
}
