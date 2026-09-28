/**
 * Pure helpers that map Horizon account balance records into the compact
 * shape the Kitewell API returns to the frontend.
 */

/**
 * Map a single Horizon balance record.
 *
 * @param {object} balance Horizon balance record (`asset_type`, `balance`, …).
 * @returns {object|null} Mapped balance, or `null` for malformed input.
 */
export function mapBalance(balance) {
  if (!balance || typeof balance !== "object") return null;

  if (balance.asset_type === "native") {
    return {
      key: "native",
      code: "XLM",
      issuer: null,
      balance: balance.balance,
      limit: null,
      isNative: true,
    };
  }

  return {
    key: `${balance.asset_code}:${balance.asset_issuer}`,
    code: balance.asset_code,
    issuer: balance.asset_issuer,
    balance: balance.balance,
    limit: balance.limit,
    isNative: false,
  };
}

/**
 * Map a list of Horizon balance records, preserving order and dropping
 * malformed entries.
 *
 * @param {object[]} balances Horizon balance records.
 * @returns {object[]} Mapped balances.
 */
export function mapBalances(balances) {
  if (!Array.isArray(balances)) return [];
  return balances.map(mapBalance).filter((mapped) => mapped !== null);
}
