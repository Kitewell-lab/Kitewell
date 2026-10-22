/**
 * @file pathPaymentHopValidate.js
 * @description Validates intermediate path hops for Stellar path payment operations.
 * Enforces maximum hops limit (5), well-formed asset descriptors, and rejects duplicate consecutive hops.
 */

export const MAX_PATH_HOPS = 5;

const ED25519_PUBLIC_KEY_REGEX = /^G[A-Z0-9]{55}$/;
const ASSET_CODE_REGEX = /^[A-Za-z0-9]{1,12}$/;

/**
 * Custom error thrown when path payment hops validation fails.
 */
export class PathPaymentHopValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [details]
   */
  constructor(message, code = 'INVALID_PATH_HOPS', details) {
    super(message);
    this.name = 'PathPaymentHopValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalizes an individual hop asset descriptor into a canonical key (e.g. "native" or "USDC:G...").
 *
 * @param {*} asset - Asset descriptor (string "native"|"XLM"|"CODE:ISSUER" or object { code, issuer } | { type: 'native' })
 * @returns {{ type: 'native' } | { type: 'credit', code: string, issuer: string, canonical: string }}
 * @throws {PathPaymentHopValidationError}
 */
export function normalizeHopAsset(asset, index = 0) {
  if (!asset) {
    throw new PathPaymentHopValidationError(
      `Hop at index ${index} must be a non-null asset descriptor`,
      'EMPTY_HOP_ASSET',
      { index, asset }
    );
  }

  // 1. String descriptor
  if (typeof asset === 'string') {
    const trimmed = asset.trim();
    if (!trimmed) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} cannot be an empty string`,
        'EMPTY_HOP_ASSET',
        { index, asset }
      );
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'native' || lower === 'xlm') {
      return { type: 'native', canonical: 'native' };
    }

    const parts = trimmed.split(':');
    if (parts.length !== 2) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} string must be "native", "XLM", or "CODE:ISSUER" format, got "${trimmed}"`,
        'MALFORMED_ASSET_STRING',
        { index, asset: trimmed }
      );
    }

    const [code, issuer] = parts;
    if (!ASSET_CODE_REGEX.test(code)) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} has invalid asset code "${code}" (must be 1-12 alphanumeric characters)`,
        'INVALID_ASSET_CODE',
        { index, code, asset: trimmed }
      );
    }

    if (!ED25519_PUBLIC_KEY_REGEX.test(issuer)) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} has invalid issuer address "${issuer}"`,
        'INVALID_ASSET_ISSUER',
        { index, issuer, asset: trimmed }
      );
    }

    const normalizedCode = code.toUpperCase();
    return {
      type: 'credit',
      code: normalizedCode,
      issuer,
      canonical: `${normalizedCode}:${issuer}`,
    };
  }

  // 2. Object descriptor
  if (typeof asset === 'object' && !Array.isArray(asset)) {
    if (asset.type === 'native' || (!asset.issuer && asset.code && asset.code.toUpperCase() === 'XLM')) {
      return { type: 'native', canonical: 'native' };
    }

    const { code, issuer } = asset;
    if (typeof code !== 'string' || !ASSET_CODE_REGEX.test(code.trim())) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} object must have a valid string asset "code" (1-12 alphanumeric)`,
        'INVALID_ASSET_CODE',
        { index, asset }
      );
    }

    if (typeof issuer !== 'string' || !ED25519_PUBLIC_KEY_REGEX.test(issuer.trim())) {
      throw new PathPaymentHopValidationError(
        `Hop at index ${index} object must have a valid string asset "issuer" (G... public key)`,
        'INVALID_ASSET_ISSUER',
        { index, asset }
      );
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedIssuer = issuer.trim();
    return {
      type: 'credit',
      code: normalizedCode,
      issuer: normalizedIssuer,
      canonical: `${normalizedCode}:${normalizedIssuer}`,
    };
  }

  throw new PathPaymentHopValidationError(
    `Hop at index ${index} must be an asset string or object, got ${typeof asset}`,
    'INVALID_HOP_TYPE',
    { index, asset }
  );
}

/**
 * Inspects a path hops array and returns a typed validation result without throwing.
 *
 * @param {Array} hops - Array of intermediate hop assets
 * @returns {{ ok: true, hopCount: number, hops: Array<{ canonical: string, type: string }> } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkPathHops(hops) {
  if (!Array.isArray(hops)) {
    return {
      ok: false,
      code: 'INVALID_HOPS_ARRAY',
      error: `Path hops must be an array, got ${hops === null ? 'null' : typeof hops}`,
      details: { hops },
    };
  }

  if (hops.length > MAX_PATH_HOPS) {
    return {
      ok: false,
      code: 'MAX_HOPS_EXCEEDED',
      error: `Path cannot exceed ${MAX_PATH_HOPS} hops (got ${hops.length})`,
      details: { length: hops.length, max: MAX_PATH_HOPS },
    };
  }

  const normalizedList = [];
  let previousCanonical = null;

  for (let i = 0; i < hops.length; i++) {
    let normalized;
    try {
      normalized = normalizeHopAsset(hops[i], i);
    } catch (err) {
      if (err instanceof PathPaymentHopValidationError) {
        return {
          ok: false,
          code: err.code,
          error: err.message,
          details: err.details,
        };
      }
      return {
        ok: false,
        code: 'UNKNOWN_HOP_ERROR',
        error: err.message,
      };
    }

    if (previousCanonical !== null && previousCanonical === normalized.canonical) {
      return {
        ok: false,
        code: 'DUPLICATE_CONSECUTIVE_HOPS',
        error: `Consecutive duplicate hop detected at index ${i} ("${normalized.canonical}")`,
        details: { index: i, asset: normalized.canonical },
      };
    }

    previousCanonical = normalized.canonical;
    normalizedList.push(normalized);
  }

  return {
    ok: true,
    hopCount: normalizedList.length,
    hops: normalizedList,
  };
}

/**
 * Validates path hops, returning the normalized hops or throwing PathPaymentHopValidationError.
 *
 * @param {Array} hops
 * @returns {Array<{ canonical: string, type: string }>}
 * @throws {PathPaymentHopValidationError}
 */
export function validatePathHops(hops) {
  const result = checkPathHops(hops);
  if (!result.ok) {
    throw new PathPaymentHopValidationError(result.error, result.code, result.details);
  }
  return result.hops;
}

/**
 * Checks whether an array of hops is valid without throwing.
 *
 * @param {Array} hops
 * @returns {boolean}
 */
export function isValidPathHops(hops) {
  return checkPathHops(hops).ok;
}
