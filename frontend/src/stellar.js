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

export async function getTransactions(publicKey, limit = 15) {
  if (backendIsUsable()) {
    try {
      return await fetchPaymentsViaApi(publicKey, limit);
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

  return payments.records
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
    }));
}
