/**
 * Pure helpers that build a stable string key for a Horizon/Stellar asset.
 *
 * The key is used as a Map/Set key and for de-duplicating balances, in the
 * same shape the backend uses: `native` for XLM, `CODE:ISSUER` otherwise.
 */

const NATIVE_KEY = "native";
const ISSUED_ASSET_TYPES = new Set(["credit_alphanum4", "credit_alphanum12"]);

/**
 * Build a stable asset key from a Horizon asset record.
 *
 * @param {object|null} asset Horizon asset (`asset_type`, `asset_code`, `asset_issuer`).
 * @returns {string|null} `"native"` for XLM, `"CODE:ISSUER"` for issued assets,
 * or `null` for malformed input.
 */
export function buildAssetKey(asset) {
  if (!asset || typeof asset !== "object") return null;
  if (asset.asset_type === NATIVE_KEY) return NATIVE_KEY;
  if (!ISSUED_ASSET_TYPES.has(asset.asset_type)) return null;

  const code = asset.asset_code;
  const issuer = asset.asset_issuer;
  if (typeof code !== "string" || code.length === 0) return null;
  if (typeof issuer !== "string" || issuer.length === 0) return null;
  return `${code}:${issuer}`;
}

/**
 * Check whether an asset key represents the native asset.
 *
 * @param {unknown} key Asset key candidate.
 * @returns {boolean} True when the key is exactly `"native"`.
 */
export function isNativeAssetKey(key) {
  return key === NATIVE_KEY;
}

/**
 * Split an asset key back into its parts.
 *
 * @param {unknown} key Asset key produced by `buildAssetKey`.
 * @returns {{type: "native"}|{type: "issued", code: string, issuer: string}|null}
 * The asset parts, or `null` when the key is malformed.
 */
export function splitAssetKey(key) {
  if (typeof key !== "string") return null;
  if (key === NATIVE_KEY) return { type: "native" };

  const sep = key.indexOf(":");
  if (sep <= 0 || sep === key.length - 1) return null;
  const code = key.slice(0, sep);
  const issuer = key.slice(sep + 1);
  if (issuer.includes(":")) return null;
  return { type: "issued", code, issuer };
}
