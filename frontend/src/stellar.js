import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";
import {
  getActiveNetwork,
  getActiveNetworkId,
  isFriendbotAvailable,
} from "./network";

/** Shown in the lab panel when Horizon asks the client to slow down. */
export const HORIZON_SLOWDOWN_MESSAGE =
  "The network asked the lab to slow down.";

const HORIZON_429_BASE_WAIT_SEC = 2;
const HORIZON_429_MAX_WAIT_SEC = 30;

/**
 * Shared per-network 429 backoff clock. Balance and history reads (and any
 * other lab Horizon reads) advance the same streak for the active network.
 * @type {Map<string, { streak: number }>}
 */
const horizon429BackoffByNetwork = new Map();

function getServer() {
  return new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
}

/** @param {unknown} error */
export function isHorizon429(error) {
  const status = error?.response?.status ?? error?.status;
  if (status === 429) return true;
  const message = String(error?.message ?? "");
  return /too many requests/i.test(message);
}

/** @param {unknown} error */
export function isHorizonSlowdownError(error) {
  return error instanceof Error && error.message === HORIZON_SLOWDOWN_MESSAGE;
}

/** @param {unknown} error */
function readRetryAfterSeconds(error) {
  const headers = error?.response?.headers;
  if (!headers) return null;

  const raw =
    typeof headers.get === "function"
      ? headers.get("retry-after") ?? headers.get("Retry-After")
      : headers["retry-after"] ?? headers["Retry-After"];

  if (raw == null || raw === "") return null;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;

  const asDate = Date.parse(String(raw));
  if (!Number.isNaN(asDate)) {
    return Math.max(0, (asDate - Date.now()) / 1000);
  }

  return null;
}

/** @param {number} streak 1-based count of consecutive 429s on this network */
export function computeHorizon429WaitSeconds(streak) {
  const safeStreak = Math.max(1, streak);
  return Math.min(
    HORIZON_429_BASE_WAIT_SEC * 2 ** (safeStreak - 1),
    HORIZON_429_MAX_WAIT_SEC
  );
}

function resetHorizon429Backoff(networkId = getActiveNetworkId()) {
  horizon429BackoffByNetwork.delete(networkId);
}

/**
 * Record a 429 for the active network and return how long to wait (seconds).
 * Prefers Horizon's Retry-After when present; otherwise 2 → 4 → 8 … capped at 30.
 * @param {unknown} error
 * @returns {number}
 */
export function recordHorizon429(error) {
  const networkId = getActiveNetworkId();
  const prior = horizon429BackoffByNetwork.get(networkId) || { streak: 0 };
  const streak = prior.streak + 1;
  horizon429BackoffByNetwork.set(networkId, { streak });

  const retryAfter = readRetryAfterSeconds(error);
  if (retryAfter != null) return retryAfter;
  return computeHorizon429WaitSeconds(streak);
}

/** Test helper: clear the shared backoff clocks. */
export function resetHorizon429BackoffForTests() {
  horizon429BackoffByNetwork.clear();
}

function abortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function defaultSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Run a Horizon lab read with shared per-network 429 backoff.
 *
 * On 429: waits Retry-After (or 2/4/8…≤30s), then rejects with
 * {@link HORIZON_SLOWDOWN_MESSAGE}. A later success resets the clock.
 * A 500 (or any non-429) is rethrown unchanged. The wait is cancelled when
 * `signal` aborts (unmount / network change).
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(ms: number, signal?: AbortSignal) => Promise<void>} [options.sleep]
 * @returns {Promise<T>}
 */
export async function withHorizon429Backoff(fn, options = {}) {
  const { signal, sleep = defaultSleep } = options;

  if (signal?.aborted) throw abortError();

  try {
    const result = await fn();
    resetHorizon429Backoff();
    return result;
  } catch (error) {
    if (!isHorizon429(error)) throw error;

    const waitSeconds = recordHorizon429(error);
    await sleep(waitSeconds * 1000, signal);
    throw new Error(HORIZON_SLOWDOWN_MESSAGE);
  }
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
export async function getAccountBalances(publicKey, options = {}) {
  if (backendIsUsable()) {
    try {
      const data = await fetchAccountViaApi(publicKey);
      return data.balances;
    } catch {
      /* fall back to direct Horizon */
    }
  }

  return withHorizon429Backoff(async () => {
    const account = await getServer().loadAccount(publicKey);
    return mapHorizonBalances(account);
  }, options);
}

export async function getAccountDetails(publicKey, options = {}) {
  if (backendIsUsable()) {
    try {
      return await fetchAccountViaApi(publicKey);
    } catch {
      /* fall back to direct Horizon */
    }
  }

  return withHorizon429Backoff(async () => {
    const account = await getServer().loadAccount(publicKey);
    return {
      id: account.id,
      sequence: account.sequenceNumber(),
      subentryCount: account.subentry_count,
      thresholds: account.thresholds,
      balances: mapHorizonBalances(account),
      explorerUrl: explorerAccountUrl(publicKey),
    };
  }, options);
}

export async function getBalance(publicKey, options = {}) {
  const balances = await getAccountBalances(publicKey, options);
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
export async function getTransactions(publicKey, limit = 15, cursor, options = {}) {
  if (backendIsUsable()) {
    try {
      return await fetchPaymentsViaApi(publicKey, limit, cursor);
    } catch {
      /* fall back to direct Horizon */
    }
  }

  return withHorizon429Backoff(async () => {
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
  }, options);
}
