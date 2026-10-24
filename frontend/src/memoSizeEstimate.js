/**
 * Memo byte-size estimator.
 *
 * Given a memo type and value, estimates its encoded byte size against
 * Stellar's per-type limits (text: up to 28 bytes UTF-8, hash/return: 32 bytes,
 * id: 8 bytes, none: 0 bytes) without building the memo itself.
 */

import {
  MEMO_LIMITS,
  MAX_MEMO_ID,
  MEMO_TYPES,
} from "./memoSizeEstimateConstants.js";

const TEXT_ENCODER = new TextEncoder();

/**
 * Calculate the UTF-8 byte length of a string.
 *
 * @param {string} str
 * @returns {number}
 */
export function getUtf8ByteLength(str) {
  if (typeof str !== "string") {
    str = String(str ?? "");
  }
  return TEXT_ENCODER.encode(str).length;
}

/**
 * Estimate encoded byte size for a Stellar memo.
 *
 * Supports both positional parameters:
 *   `estimateMemoSize(type, value)`
 * and options object:
 *   `estimateMemoSize({ type, value })`
 *
 * @param {string|{ type: string, value?: unknown }} typeOrOptions
 * @param {unknown} [valueInput]
 * @returns {{ type: string, byteLength: number, maxBytes: number, valid: boolean, remainingBytes: number }}
 * @throws {TypeError} When type is missing or unknown
 */
export function estimateMemoSize(typeOrOptions, valueInput) {
  let rawType;
  let rawValue = valueInput;

  if (
    typeof typeOrOptions === "object" &&
    typeOrOptions !== null &&
    !Array.isArray(typeOrOptions)
  ) {
    rawType = typeOrOptions.type;
    rawValue = typeOrOptions.value;
  } else {
    rawType = typeOrOptions;
  }

  if (typeof rawType !== "string") {
    throw new TypeError("memo type must be a string");
  }

  const normalizedType = rawType.trim().toLowerCase();
  const maxBytes = MEMO_LIMITS[normalizedType];

  if (maxBytes === undefined) {
    throw new TypeError(`Unknown memo type: "${rawType}". Expected "text", "id", "hash", "return", or "none".`);
  }

  let byteLength = 0;
  let valid = true;

  switch (normalizedType) {
    case "none": {
      byteLength = 0;
      valid = true;
      break;
    }

    case "text": {
      const text = rawValue == null ? "" : String(rawValue);
      byteLength = getUtf8ByteLength(text);
      valid = byteLength <= MEMO_LIMITS.text;
      break;
    }

    case "id": {
      if (rawValue == null || rawValue === "") {
        byteLength = 0;
        valid = false;
        break;
      }
      try {
        let numBig;
        if (typeof rawValue === "bigint") {
          numBig = rawValue;
        } else if (typeof rawValue === "number") {
          if (!Number.isInteger(rawValue) || rawValue < 0) {
            valid = false;
            break;
          }
          numBig = BigInt(rawValue);
        } else {
          const s = String(rawValue).trim();
          if (!/^\d+$/.test(s)) {
            valid = false;
            break;
          }
          numBig = BigInt(s);
        }

        if (numBig < 0n || numBig > MAX_MEMO_ID) {
          byteLength = 8;
          valid = false;
        } else {
          byteLength = 8;
          valid = true;
        }
      } catch {
        valid = false;
        byteLength = 0;
      }
      break;
    }

    case "hash":
    case "return": {
      if (rawValue == null || rawValue === "") {
        byteLength = 0;
        valid = false;
        break;
      }

      if (rawValue instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer?.(rawValue))) {
        byteLength = rawValue.length;
        valid = byteLength === MEMO_LIMITS.hash;
      } else if (typeof rawValue === "string") {
        const hex = rawValue.trim();
        const isHex = /^[0-9a-fA-F]*$/.test(hex);
        byteLength = Math.floor(hex.length / 2);
        valid = isHex && hex.length === 64 && byteLength === 32;
      } else {
        byteLength = 0;
        valid = false;
      }
      break;
    }
  }

  const remainingBytes = Math.max(0, maxBytes - byteLength);

  return {
    type: normalizedType,
    byteLength,
    maxBytes,
    valid,
    remainingBytes,
  };
}

/**
 * Alias matching the module name.
 */
export const memoSizeEstimate = estimateMemoSize;

export {
  MEMO_LIMITS,
  MAX_MEMO_ID,
  MEMO_TYPES,
};

export default estimateMemoSize;
