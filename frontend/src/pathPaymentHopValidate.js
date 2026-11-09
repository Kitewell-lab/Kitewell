import {
  MAX_PATH_PAYMENT_HOPS,
  PATH_HOP_VALIDATE_ERROR,
} from "./pathPaymentHopValidateConstants.js";

const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Parse and normalize a single intermediate hop asset descriptor.
 *
 * Accepts UI descriptors (`{ isNative: true }`, `{ code, issuer }`), Horizon
 * descriptors (`{ asset_type: "native" }`, `{ asset_type, asset_code, asset_issuer }`),
 * or SDK `Asset`-like objects (`isNative()`, `getCode()`, `getIssuer()`).
 *
 * @param {unknown} hop
 * @returns {{ key: string, descriptor: { isNative: true } | { isNative: false, code: string, issuer: string } } | null}
 */
function normalizeHopAsset(hop) {
  if (hop === null || typeof hop !== "object" || Array.isArray(hop)) {
    return null;
  }

  let nativeFlag;
  if (typeof hop.isNative === "function") {
    nativeFlag = hop.isNative();
  } else if (typeof hop.isNative === "boolean") {
    nativeFlag = hop.isNative;
  } else if (typeof hop.asset_type === "string") {
    if (hop.asset_type === "native") {
      nativeFlag = true;
    } else if (
      hop.asset_type === "credit_alphanum4" ||
      hop.asset_type === "credit_alphanum12"
    ) {
      nativeFlag = false;
    } else {
      return null;
    }
  } else if (hop.code !== undefined || hop.asset_code !== undefined) {
    nativeFlag = false;
  }

  if (nativeFlag === true) {
    return {
      key: "native",
      descriptor: { isNative: true },
    };
  }

  if (nativeFlag !== false) {
    return null;
  }

  const rawCode =
    typeof hop.getCode === "function"
      ? hop.getCode()
      : (hop.code ?? hop.asset_code);
  const rawIssuer =
    typeof hop.getIssuer === "function"
      ? hop.getIssuer()
      : (hop.issuer ?? hop.asset_issuer);

  if (typeof rawCode !== "string" || typeof rawIssuer !== "string") {
    return null;
  }

  const code = rawCode.trim();
  const issuer = rawIssuer.trim();

  if (
    !ASSET_CODE_PATTERN.test(code) ||
    !STELLAR_PUBLIC_KEY_PATTERN.test(issuer)
  ) {
    return null;
  }

  return {
    key: `${code}:${issuer}`,
    descriptor: { isNative: false, code, issuer },
  };
}

/**
 * Validate an array of intermediate path assets for a Stellar path payment.
 *
 * Rules:
 * 1. `hops` must be an array (`0` to `5` elements inclusive).
 * 2. Every hop must be a well-formed native or credit asset descriptor.
 * 3. No two adjacent hops (`hops[i - 1]` and `hops[i]`) may refer to the same
 *    asset.
 *
 * Never mutates the input array and never throws.
 *
 * @param {unknown} hops Candidate array of intermediate hop descriptors.
 * @returns {{
 *   ok: true,
 *   hops: Array<{ isNative: true } | { isNative: false, code: string, issuer: string }>
 * } | {
 *   ok: false,
 *   error: string,
 *   index?: number
 * }}
 */
export function validatePathPaymentHops(hops) {
  if (!Array.isArray(hops)) {
    return { ok: false, error: PATH_HOP_VALIDATE_ERROR.NOT_ARRAY };
  }

  if (hops.length > MAX_PATH_PAYMENT_HOPS) {
    return { ok: false, error: PATH_HOP_VALIDATE_ERROR.TOO_MANY_HOPS };
  }

  /** @type {Array<{ isNative: true } | { isNative: false, code: string, issuer: string }>} */
  const normalized = [];
  let previousKey = null;

  for (let i = 0; i < hops.length; i += 1) {
    const parsed = normalizeHopAsset(hops[i]);
    if (!parsed) {
      return {
        ok: false,
        error: PATH_HOP_VALIDATE_ERROR.INVALID_HOP,
        index: i,
      };
    }

    if (previousKey !== null && parsed.key === previousKey) {
      return {
        ok: false,
        error: PATH_HOP_VALIDATE_ERROR.DUPLICATE_CONSECUTIVE_HOP,
        index: i,
      };
    }

    previousKey = parsed.key;
    normalized.push(parsed.descriptor);
  }

  return { ok: true, hops: normalized };
}

/**
 * Boolean predicate form of {@link validatePathPaymentHops}.
 * Never throws.
 *
 * @param {unknown} hops Candidate array of intermediate hop descriptors.
 * @returns {boolean}
 */
export function isValidPathPaymentHops(hops) {
  return validatePathPaymentHops(hops).ok === true;
}

/**
 * Validate intermediate path payment hops or throw an error.
 *
 * @param {unknown} hops Candidate array of intermediate hop descriptors.
 * @returns {Array<{ isNative: true } | { isNative: false, code: string, issuer: string }>}
 * @throws {TypeError} When `hops` is not an array.
 * @throws {Error} When `hops` exceeds 5 items, contains a malformed descriptor,
 *   or contains duplicate consecutive hops.
 */
export function assertPathPaymentHops(hops) {
  if (!Array.isArray(hops)) {
    throw new TypeError(PATH_HOP_VALIDATE_ERROR.NOT_ARRAY);
  }

  const result = validatePathPaymentHops(hops);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.hops;
}
