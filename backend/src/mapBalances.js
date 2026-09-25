/**
 * Maps Horizon account balance entries to a consistent, normalized shape.
 *
 * @param {Object} b Raw balance object from Horizon server.loadAccount
 * @returns {{key: string, code: string, issuer: string|null, balance: string, limit: string|null, isNative: boolean}|null}
 */
export function mapBalance(b) {
  if (!b || typeof b !== "object") return null;

  if (b.asset_type === "native") {
    return {
      key: "native",
      code: "XLM",
      issuer: null,
      balance: b.balance,
      limit: null,
      isNative: true,
    };
  }

  return {
    key: `${b.asset_code}:${b.asset_issuer}`,
    code: b.asset_code,
    issuer: b.asset_issuer,
    balance: b.balance,
    limit: b.limit ?? null,
    isNative: false,
  };
}

/**
 * Deduplicates Horizon balance mapping behind a pure helper.
 *
 * @param {Array<Object>} [balances=[]] List of raw balances from Horizon
 * @returns {Array<{key: string, code: string, issuer: string|null, balance: string, limit: string|null, isNative: boolean}>}
 */
export function mapBalances(balances) {
  if (!Array.isArray(balances)) {
    return [];
  }
  return balances.map(mapBalance).filter(Boolean);
}

export default mapBalances;
