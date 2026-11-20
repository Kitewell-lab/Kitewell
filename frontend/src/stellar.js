import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";
import {
  getActiveNetwork,
  getActiveNetworkId,
  isFriendbotAvailable,
  NETWORKS,
} from "./network";

function getServer() {
  return new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
}

export async function getLatestLedger(networkId = getActiveNetworkId()) {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }

  const response = await new StellarSdk.Horizon.Server(network.horizonUrl)
    .ledgers()
    .order("desc")
    .limit(1)
    .call();
  const ledger = response.records?.[0];
  if (!ledger) {
    throw new Error("Horizon returned no latest ledger.");
  }

  const sequence = Number(ledger.sequence);
  const closedAt = Date.parse(ledger.closed_at);
  const baseFee = String(ledger.base_fee_in_stroops ?? "");
  const baseReserve = String(ledger.base_reserve_in_stroops ?? "");
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Latest ledger has an invalid sequence.");
  }
  if (!Number.isFinite(closedAt)) {
    throw new Error("Latest ledger has an invalid close time.");
  }
  if (!/^\d+$/.test(baseFee)) {
    throw new Error("Latest ledger has an invalid base fee.");
  }
  if (!/^[1-9]\d*$/.test(baseReserve)) {
    throw new Error("Latest ledger has an invalid base reserve.");
  }

  return {
    sequence,
    closedAt: new Date(closedAt).toISOString(),
    baseFeeInStroops: baseFee,
    baseReserveInStroops: baseReserve,
  };
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

function mapHorizonBalances(account) {
  return account.balances.map((b) => {
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
      limit: b.limit,
      isNative: false,
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
  return mapHorizonBalances(account);
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
  return {
    id: account.id,
    sequence: account.sequenceNumber(),
    subentryCount: account.subentry_count,
    thresholds: account.thresholds,
    balances: mapHorizonBalances(account),
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
