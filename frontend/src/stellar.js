import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";
import {
  getActiveNetwork,
  getActiveNetworkId,
  isFriendbotAvailable,
} from "./network";

function getServer() {
  return new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
}

/** The Kitewell backend is configured for Testnet, so skip it elsewhere. */
function backendIsUsable() {
  return getActiveNetworkId() === "TESTNET";
}

export function explorerAccountUrl(publicKey) {
  return `${getActiveNetwork().explorerBase}/account/${publicKey}`;
}

export function explorerTxUrl(hash) {
  return `${getActiveNetwork().explorerBase}/tx/${hash}`;
}

export const MAX_ASSET_CODE_LENGTH = 12;

/**
 * Convert a simple UI asset descriptor into an SDK Asset.
 * Native XLM is `{ isNative: true }`; a credit asset is
 * `{ isNative: false, code, issuer }`. Throws a user-facing error when the
 * descriptor is incomplete so callers can surface it in a toast.
 */
export function buildAsset({ isNative, code, issuer } = {}) {
  if (isNative) return StellarSdk.Asset.native();

  const normalizedCode = (code || "").trim();
  if (!normalizedCode) {
    throw new Error("Asset code is required for a credit asset.");
  }
  if (normalizedCode.length > MAX_ASSET_CODE_LENGTH) {
    throw new Error(
      `Asset code must be ${MAX_ASSET_CODE_LENGTH} characters or fewer.`
    );
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error("Asset issuer must be a valid Stellar public key (G…).");
  }

  return new StellarSdk.Asset(normalizedCode.toUpperCase(), issuer);
}

/**
 * Parse a comma-separated intermediate path (e.g. `USDC:G…, XLM`) into SDK
 * Assets. An empty string yields an empty path, which lets Horizon route
 * through the direct order book.
 */
export function parsePathAssets(input) {
  if (!input) return [];

  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (/^(xlm|native)$/i.test(entry)) return StellarSdk.Asset.native();

      const [code, issuer] = entry.split(":").map((part) => part.trim());
      if (!issuer) {
        throw new Error(
          `Path asset "${entry}" needs an issuer as CODE:ISSUER, or use XLM.`
        );
      }
      return buildAsset({ isNative: false, code, issuer });
    });
}

export async function fundWithFriendbot(publicKey) {
  if (!isFriendbotAvailable()) {
    throw new Error(
      `Friendbot is only available on Testnet, not ${getActiveNetwork().label}.`
    );
  }

  const response = await fetch(
    `${getActiveNetwork().friendbotUrl}?addr=${encodeURIComponent(publicKey)}`
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text.includes("already") || response.status === 400
        ? "Account may already be funded. Refresh balances instead."
        : "Friendbot funding failed. Try again in a moment."
    );
  }
  return response.json();
}

/**
 * Calculate available balance for an asset, accounting for reserves and liabilities.
 * 
 * @param {object} balance - Balance object with balance, selling_liabilities, buying_liabilities
 * @param {boolean} isNative - Whether this is the native XLM asset
 * @param {number} subentryCount - Number of subentries (for XLM reserve calculation)
 * @param {number} baseReserve - Base reserve from latest ledger (default 0.5 XLM)
 * @returns {string} Available balance as string
 */
export function calculateAvailableBalance(
  balance,
  isNative,
  subentryCount = 0,
  baseReserve = 0.5
) {
  const total = parseFloat(balance.balance || "0");
  const sellingLiabilities = parseFloat(balance.selling_liabilities || "0");
  const buyingLiabilities = parseFloat(balance.buying_liabilities || "0");

  if (isNative) {
    // For XLM: available = total - (base reserve * (2 + subentries)) - selling liabilities
    const minBalance = baseReserve * (2 + subentryCount);
    const available = total - minBalance - sellingLiabilities;
    return Math.max(0, available).toFixed(7);
  } else {
    // For credit assets: available = total - selling liabilities
    const available = total - sellingLiabilities;
    return Math.max(0, available).toFixed(7);
  }
}

function mapHorizonBalances(account, baseReserve = 0.5) {
  return account.balances.map((b) => {
    const sellingLiabilities = parseFloat(b.selling_liabilities || "0");
    const buyingLiabilities = parseFloat(b.buying_liabilities || "0");
    
    if (b.asset_type === "native") {
      const available = calculateAvailableBalance(
        b,
        true,
        account.subentry_count || 0,
        baseReserve
      );
      
      return {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: b.balance,
        limit: null,
        isNative: true,
        sellingLiabilities: sellingLiabilities.toFixed(7),
        buyingLiabilities: buyingLiabilities.toFixed(7),
        available,
      };
    }
    
    const available = calculateAvailableBalance(b, false);
    
    return {
      key: `${b.asset_code}:${b.asset_issuer}`,
      code: b.asset_code,
      issuer: b.asset_issuer,
      balance: b.balance,
      limit: b.limit,
      isNative: false,
      sellingLiabilities: sellingLiabilities.toFixed(7),
      buyingLiabilities: buyingLiabilities.toFixed(7),
      available,
    };
  });
}

/** Prefer the Kitewell backend on Testnet; otherwise read Horizon directly. */
export async function getAccountBalances(publicKey) {
  if (backendIsUsable()) {
    try {
      const data = await fetchAccountViaApi(publicKey);
      return data.balances;
    } catch {
      /* fall back to direct Horizon */
    }
  }

  const account = await getServer().loadAccount(publicKey);
  
  let baseReserve = 0.5; // Default base reserve
  try {
    if (getServer().ledgers) {
      const ledgerInfo = await getServer().ledgers().order("desc").limit(1).call();
      if (ledgerInfo.records[0]?.base_reserve_in_stroops) {
        baseReserve = parseFloat(ledgerInfo.records[0].base_reserve_in_stroops) / 10000000;
      }
    }
  } catch {
    // Use default base reserve if ledgers API is unavailable
  }
  
  return mapHorizonBalances(account, baseReserve);
}

export async function getAccountDetails(publicKey) {
  if (backendIsUsable()) {
    try {
      return await fetchAccountViaApi(publicKey);
    } catch {
      /* fall back to direct Horizon */
    }
  }

  const account = await getServer().loadAccount(publicKey);
  
  let baseReserve = 0.5; // Default base reserve
  try {
    if (getServer().ledgers) {
      const ledgerInfo = await getServer().ledgers().order("desc").limit(1).call();
      if (ledgerInfo.records[0]?.base_reserve_in_stroops) {
        baseReserve = parseFloat(ledgerInfo.records[0].base_reserve_in_stroops) / 10000000;
      }
    }
  } catch {
    // Use default base reserve if ledgers API is unavailable
  }
  
  return {
    id: account.id,
    sequence: account.sequenceNumber(),
    subentryCount: account.subentry_count,
    thresholds: account.thresholds,
    balances: mapHorizonBalances(account, baseReserve),
    explorerUrl: explorerAccountUrl(publicKey),
  };
}

export async function getBalance(publicKey) {
  const balances = await getAccountBalances(publicKey);
  const xlm = balances.find((b) => b.isNative);
  return xlm ? xlm.balance : "0";
}

/**
 * Load one page of payment history.
 *
 * @param {string} publicKey Account to page through.
 * @param {number} [limit] Page size; Horizon caps it at 50 server-side.
 * @param {string} [cursor] `nextCursor` from the previous page; omit for the
 *   first page.
 * @returns {Promise<{ records: object[], nextCursor: string|null }>} The
 *   mapped records plus the cursor for the next page (null on the last page).
 */
export async function getTransactions(publicKey, limit = 15, cursor) {
  if (backendIsUsable()) {
    try {
      return await fetchPaymentsViaApi(publicKey, limit, cursor);
    } catch {
      /* fall back to direct Horizon */
    }
  }

  const payments = await getServer()
    .payments()
    .forAccount(publicKey)
    .limit(limit)
    .order("desc")
    .call();

  return {
    records: payments.records
      .filter((p) => p.type === "payment")
      .map((p) => ({
        id: p.id,
        from: p.from,
        to: p.to,
        amount: p.amount,
        asset_type: p.asset_type,
        asset_code: p.asset_code || "XLM",
        transaction_hash: p.transaction_hash,
        created_at: p.created_at,
      })),
    // Paging straight off Horizon is out of scope, so this path is the last page.
    nextCursor: null,
  };
}
