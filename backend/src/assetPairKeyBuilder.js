/**
 * Asset pair canonical key builder.
 *
 * Builds a canonical, order-independent string key for a trading asset pair
 * (e.g. `native/CODE:ISSUER`) suitable for use as a Map/Set key for order-book
 * or ticker caching.
 */

import {
  CANONICAL_NATIVE_ASSET,
  ASSET_PAIR_SEPARATOR,
  ASSET_PAIR_KEY_ERROR,
} from "./assetPairKeyBuilderConstants.js";

/**
 * Validate and canonicalize a single Stellar asset representation.
 *
 * Accepts:
 *   - "native" or "XLM"
 *   - "CODE:ISSUER" or "CODE-ISSUER"
 *   - Object with { asset_type: "native" } or { type: "native" }
 *   - Object with { asset_code, issuer } or { code, issuer }
 *
 * @param {unknown} asset
 * @param {string} [label="asset"]
 * @returns {string} Canonical string: "native" or "CODE:ISSUER"
 * @throws {TypeError} When asset is missing or has an invalid structure
 */
export function canonicalizeAsset(asset, label = "asset") {
  if (asset === undefined || asset === null) {
    throw new TypeError(`${label} ${ASSET_PAIR_KEY_ERROR.REQUIRED}`);
  }

  // String format handling
  if (typeof asset === "string") {
    const trimmed = asset.trim();
    if (!trimmed) {
      throw new TypeError(`${label} ${ASSET_PAIR_KEY_ERROR.EMPTY}`);
    }

    const lower = trimmed.toLowerCase();
    if (lower === "native" || lower === "xlm") {
      return CANONICAL_NATIVE_ASSET;
    }

    const parts = trimmed.includes(":") ? trimmed.split(":") : trimmed.split("-");
    if (parts.length === 2) {
      const [code, issuer] = parts;
      return formatCreditAsset(code, issuer, label);
    }

    throw new TypeError(`Invalid ${label} format: "${trimmed}". ${ASSET_PAIR_KEY_ERROR.INVALID_FORMAT}.`);
  }

  // Object format handling
  if (typeof asset === "object") {
    const type = asset.asset_type ?? asset.type;
    if (type === "native" || (typeof type === "string" && type.toLowerCase() === "native")) {
      return CANONICAL_NATIVE_ASSET;
    }

    const code = asset.asset_code ?? asset.code;
    const issuer = asset.issuer;

    if (!code && (asset.code === "XLM" || asset.asset_code === "XLM") && !issuer) {
      return CANONICAL_NATIVE_ASSET;
    }

    if (code && issuer) {
      return formatCreditAsset(code, issuer, label);
    }

    throw new TypeError(`Invalid ${label} object: ${ASSET_PAIR_KEY_ERROR.INVALID_OBJECT}`);
  }

  throw new TypeError(`${label} must be a string or asset object`);
}

/**
 * Helper to validate and format credit asset code and issuer.
 *
 * @param {string} code
 * @param {string} issuer
 * @param {string} label
 * @returns {string}
 */
function formatCreditAsset(code, issuer, label) {
  const cleanCode = String(code).trim().toUpperCase();
  const cleanIssuer = String(issuer).trim();

  if (!/^[A-Z0-9]{1,12}$/.test(cleanCode)) {
    throw new TypeError(`Invalid ${label} code: "${code}". ${ASSET_PAIR_KEY_ERROR.INVALID_CODE}.`);
  }

  if (!cleanIssuer.startsWith("G") || cleanIssuer.length !== 56) {
    throw new TypeError(`Invalid ${label} issuer: "${issuer}". ${ASSET_PAIR_KEY_ERROR.INVALID_ISSUER}.`);
  }

  return `${cleanCode}:${cleanIssuer}`;
}

/**
 * Build a canonical, order-independent string key for an asset trading pair.
 *
 * Supports both positional parameters:
 *   `buildAssetPairKey(assetA, assetB)`
 * and options object:
 *   `buildAssetPairKey({ assetA, assetB })` or `buildAssetPairKey({ base, counter })`
 *
 * @param {unknown} assetAInput
 * @param {unknown} [assetBInput]
 * @returns {string} Canonical pair key (e.g. "native/USDC:GA..." or "BTC:GA.../USDC:GA...")
 * @throws {TypeError} When either asset is invalid or missing
 */
export function buildAssetPairKey(assetAInput, assetBInput) {
  let firstAsset;
  let secondAsset;

  if (
    typeof assetAInput === "object" &&
    assetAInput !== null &&
    ("assetA" in assetAInput || "base" in assetAInput || "selling" in assetAInput)
  ) {
    firstAsset = assetAInput.assetA ?? assetAInput.base ?? assetAInput.selling;
    secondAsset = assetAInput.assetB ?? assetAInput.counter ?? assetAInput.buying;
  } else {
    firstAsset = assetAInput;
    secondAsset = assetBInput;
  }

  const canonA = canonicalizeAsset(firstAsset, "assetA");
  const canonB = canonicalizeAsset(secondAsset, "assetB");

  // Order-independent: sort canonically by string comparison
  return canonA.localeCompare(canonB) <= 0
    ? `${canonA}${ASSET_PAIR_SEPARATOR}${canonB}`
    : `${canonB}${ASSET_PAIR_SEPARATOR}${canonA}`;
}

/**
 * Parse a canonical pair key into its two component asset strings.
 *
 * @param {string} canonicalKey
 * @returns {[string, string]}
 * @throws {TypeError} When key format is invalid
 */
export function parseAssetPairKey(canonicalKey) {
  if (typeof canonicalKey !== "string" || !canonicalKey.includes(ASSET_PAIR_SEPARATOR)) {
    throw new TypeError(`canonicalKey ${ASSET_PAIR_KEY_ERROR.INVALID_KEY_SEPARATOR}`);
  }

  const [assetA, assetB] = canonicalKey.split(ASSET_PAIR_SEPARATOR);
  return [canonicalizeAsset(assetA, "keyPart1"), canonicalizeAsset(assetB, "keyPart2")];
}

/**
 * Alias matching the module name.
 */
export const assetPairKeyBuilder = buildAssetPairKey;

export {
  CANONICAL_NATIVE_ASSET,
  ASSET_PAIR_SEPARATOR,
  ASSET_PAIR_KEY_ERROR,
};

export default buildAssetPairKey;
