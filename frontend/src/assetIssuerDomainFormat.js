/**
 * @file assetIssuerDomainFormat.js
 * @description Formats an asset's code, issuer address, and (optional) home domain into a single compact display string.
 * Example outputs: "USDC (centre.io)", "USDC (GA5Z…4KZVN)", or "XLM".
 */

export const DEFAULT_PREFIX_LENGTH = 4;
export const DEFAULT_SUFFIX_LENGTH = 4;
export const DEFAULT_ELLIPSIS = '…';

const ASSET_CODE_REGEX = /^[A-Za-z0-9]{1,12}$/;
const ED25519_PUBLIC_KEY_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Custom error thrown when asset display formatting parameters are invalid.
 */
export class AssetIssuerDomainFormatError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [details]
   */
  constructor(message, code = 'INVALID_ASSET_INPUT', details) {
    super(message);
    this.name = 'AssetIssuerDomainFormatError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Shortens a public key address for compact display.
 *
 * @param {string} address
 * @param {number} prefixLength
 * @param {number} suffixLength
 * @param {string} ellipsis
 * @returns {string}
 */
function shortenAddress(address, prefixLength, suffixLength, ellipsis) {
  const trimmed = address.trim();
  if (trimmed.length <= prefixLength + suffixLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, prefixLength)}${ellipsis}${trimmed.slice(-suffixLength)}`;
}

/**
 * Resolves arguments from either object or positional signature.
 */
function resolveArgs(inputOrCode, maybeIssuer, maybeDomain, maybeOptions) {
  if (inputOrCode !== null && typeof inputOrCode === 'object' && !Array.isArray(inputOrCode)) {
    const {
      code,
      issuer,
      domain,
      homeDomain,
      home_domain,
      type,
    } = inputOrCode;

    const resolvedDomain = domain ?? homeDomain ?? home_domain ?? null;
    const options = (maybeIssuer && typeof maybeIssuer === 'object') ? maybeIssuer : {};
    return { code, issuer, domain: resolvedDomain, type, options };
  }

  const code = inputOrCode;
  const issuer = maybeIssuer;
  const domain = maybeDomain;
  const options = (maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {};
  return { code, issuer, domain, type: undefined, options };
}

/**
 * Formats asset code, issuer, and home domain into a compact display string without throwing.
 *
 * @param {*} inputOrCode
 * @param {*} [maybeIssuer]
 * @param {*} [maybeDomain]
 * @param {Object} [maybeOptions]
 * @returns {{ ok: true, display: string, isNative: boolean, hasDomain: boolean } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkAssetIssuerDomain(inputOrCode, maybeIssuer, maybeDomain, maybeOptions) {
  const { code, issuer, domain, type, options } = resolveArgs(
    inputOrCode,
    maybeIssuer,
    maybeDomain,
    maybeOptions
  );

  const {
    prefixLength = DEFAULT_PREFIX_LENGTH,
    suffixLength = DEFAULT_SUFFIX_LENGTH,
    ellipsis = DEFAULT_ELLIPSIS,
    nativeLabel = 'XLM',
  } = options;

  // 1. Native asset check
  const isExplicitNative = type === 'native';
  const isNativeCode = typeof code === 'string' && (code.trim().toUpperCase() === 'XLM' || code.trim().toLowerCase() === 'native');
  const hasNoIssuer = !issuer || (typeof issuer === 'string' && issuer.trim() === '');

  if (isExplicitNative || (isNativeCode && hasNoIssuer)) {
    return {
      ok: true,
      display: nativeLabel,
      isNative: true,
      hasDomain: false,
    };
  }

  // 2. Validate asset code
  if (typeof code !== 'string') {
    return {
      ok: false,
      code: 'INVALID_ASSET_CODE_TYPE',
      error: `Asset code must be a string, got ${code === null ? 'null' : typeof code}`,
      details: { code },
    };
  }

  const trimmedCode = code.trim().toUpperCase();
  if (!ASSET_CODE_REGEX.test(trimmedCode)) {
    return {
      ok: false,
      code: 'INVALID_ASSET_CODE',
      error: `Asset code "${code}" is invalid (must be 1-12 alphanumeric characters)`,
      details: { code },
    };
  }

  // 3. Domain formatting (preferred when present)
  if (domain !== null && domain !== undefined) {
    if (typeof domain !== 'string') {
      return {
        ok: false,
        code: 'INVALID_DOMAIN_TYPE',
        error: `Home domain must be a string, got ${typeof domain}`,
        details: { domain },
      };
    }

    const trimmedDomain = domain.trim();
    if (trimmedDomain.length > 0) {
      return {
        ok: true,
        display: `${trimmedCode} (${trimmedDomain})`,
        isNative: false,
        hasDomain: true,
      };
    }
  }

  // 4. Shortened-issuer fallback when no domain is available
  if (typeof issuer !== 'string' || issuer.trim().length === 0) {
    return {
      ok: false,
      code: 'MISSING_ISSUER_AND_DOMAIN',
      error: `Asset "${trimmedCode}" must specify either a home domain or an issuer address`,
      details: { code: trimmedCode, issuer, domain },
    };
  }

  const trimmedIssuer = issuer.trim();
  const shortened = shortenAddress(trimmedIssuer, prefixLength, suffixLength, ellipsis);

  return {
    ok: true,
    display: `${trimmedCode} (${shortened})`,
    isNative: false,
    hasDomain: false,
  };
}

/**
 * Formats asset code, issuer, and home domain into a compact display string, throwing on error.
 *
 * @param {*} inputOrCode
 * @param {*} [maybeIssuer]
 * @param {*} [maybeDomain]
 * @param {Object} [maybeOptions]
 * @returns {string} E.g. "USDC (centre.io)" or "USDC (GA5Z…4KZVN)"
 * @throws {AssetIssuerDomainFormatError}
 */
export function formatAssetIssuerDomain(inputOrCode, maybeIssuer, maybeDomain, maybeOptions) {
  const result = checkAssetIssuerDomain(inputOrCode, maybeIssuer, maybeDomain, maybeOptions);
  if (!result.ok) {
    throw new AssetIssuerDomainFormatError(result.error, result.code, result.details);
  }
  return result.display;
}

/**
 * Checks whether an asset input is valid for formatting without throwing.
 *
 * @param {*} inputOrCode
 * @param {*} [maybeIssuer]
 * @param {*} [maybeDomain]
 * @param {Object} [maybeOptions]
 * @returns {boolean}
 */
export function isFormattableAsset(inputOrCode, maybeIssuer, maybeDomain, maybeOptions) {
  return checkAssetIssuerDomain(inputOrCode, maybeIssuer, maybeDomain, maybeOptions).ok;
}
