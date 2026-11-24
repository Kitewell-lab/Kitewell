import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";
import { normaliseTxHash } from "./txStatusWatch";
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
    throw new Error(HORIZON_SLOWDOWN_MESSAGE, { cause: error });
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

/** Stellar account flag bits (from Stellar's `AccountFlags`). */
export const ACCOUNT_FLAG_BITS = {
  authRequired: 1,
  authRevocable: 2,
  authImmutable: 4,
};

/** Auth immutable is irreversible, so the UI demands an explicit confirmation. */
export const IMMUTABLE_CONFIRMATION = "IMMUTABLE";
export const MAX_HOME_DOMAIN_BYTES = 32;

/**
 * Normalize the account flag fields Horizon exposes (snake_case) into the
 * camelCase shape the UI works with.
 */
export function mapAccountAuthConfig(account = {}) {
  const flags = account.flags || {};
  return {
    authRequired: Boolean(flags.auth_required ?? flags.authRequired),
    authRevocable: Boolean(flags.auth_revocable ?? flags.authRevocable),
    authImmutable: Boolean(flags.auth_immutable ?? flags.authImmutable),
    homeDomain: account.home_domain ?? account.homeDomain ?? "",
  };
}

/**
 * Read the current issuer flags + home domain straight from Horizon. The
 * backend account cache does not carry flags, so this path always goes direct.
 */
export async function getAccountAuthConfig(publicKey) {
  const account = await getServer().loadAccount(publicKey);
  return mapAccountAuthConfig(account);
}

/**
 * Pure validator/build step for a `setOptions` operation body.
 *
 * Flags are expressed as changes relative to `current`, so toggle controls can
 * send only the bits that actually change. Turning immutable on needs the
 * literal confirmation word, and turning it off is refused outright once it is
 * reported as set — it cannot be undone on-chain.
 */
export function buildSetOptionsBody({
  current = {},
  homeDomain,
  authRequired,
  authRevocable,
  authImmutable,
  immutableConfirmation = "",
} = {}) {
  const currentRequired = Boolean(current.authRequired);
  const currentRevocable = Boolean(current.authRevocable);
  const currentImmutable = Boolean(current.authImmutable);

  const wantRequired =
    authRequired === undefined ? currentRequired : Boolean(authRequired);
  const wantRevocable =
    authRevocable === undefined ? currentRevocable : Boolean(authRevocable);
  const wantImmutable =
    authImmutable === undefined ? currentImmutable : Boolean(authImmutable);

  if (currentImmutable && !wantImmutable) {
    throw new Error("Auth immutable cannot be turned off once it is set.");
  }

  let setFlags = 0;
  let clearFlags = 0;

  if (wantRequired !== currentRequired) {
    const bit = ACCOUNT_FLAG_BITS.authRequired;
    if (wantRequired) setFlags |= bit;
    else clearFlags |= bit;
  }
  if (wantRevocable !== currentRevocable) {
    const bit = ACCOUNT_FLAG_BITS.authRevocable;
    if (wantRevocable) setFlags |= bit;
    else clearFlags |= bit;
  }
  if (wantImmutable && !currentImmutable) {
    if (immutableConfirmation !== IMMUTABLE_CONFIRMATION) {
      throw new Error("Type IMMUTABLE to confirm turning on auth immutable.");
    }
    setFlags |= ACCOUNT_FLAG_BITS.authImmutable;
  }

  let normalizedHomeDomain;
  if (homeDomain !== undefined && homeDomain !== null) {
    normalizedHomeDomain = String(homeDomain).trim();
    if (
      new TextEncoder().encode(normalizedHomeDomain).length >
      MAX_HOME_DOMAIN_BYTES
    ) {
      throw new Error(
        `Home domain must be ${MAX_HOME_DOMAIN_BYTES} bytes or fewer.`
      );
    }
  }

  return {
    ...(normalizedHomeDomain !== undefined
      ? { homeDomain: normalizedHomeDomain }
      : {}),
    ...(setFlags ? { setFlags } : {}),
    ...(clearFlags ? { clearFlags } : {}),
  };
}

/**
 * List the accounts that hold assets issued by `publicKey`.
 *
 * Holder rows must come from Horizon's accounts-for-asset endpoint
 * (`/accounts?asset=CODE:ISSUER`); the `/assets?asset_issuer=…` response only
 * carries asset stats and has no holder account to authorize or revoke. When
 * `assetCode` is omitted the issuer's asset codes are discovered from that
 * stats endpoint, then each code is resolved through accounts-for-asset.
 */
export async function getIssuedAssetTrustlines(publicKey, assetCode) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  let codes;
  if (assetCode !== undefined && assetCode !== null) {
    const normalized = String(assetCode).trim().toUpperCase();
    if (!normalized || normalized.length > MAX_ASSET_CODE_LENGTH) {
      throw new Error(
        `Asset code must be 1–${MAX_ASSET_CODE_LENGTH} characters.`
      );
    }
    codes = [normalized];
  } else {
    const response = await getServer()
      .assets()
      .forIssuer(publicKey)
      .limit(200)
      .call();
    codes = [
      ...new Set((response.records || []).map((record) => record.asset_code)),
    ];
  }

  const rows = [];
  for (const code of codes) {
    const asset = new StellarSdk.Asset(code, publicKey);
    const response = await getServer()
      .accounts()
      .forAsset(asset)
      .limit(200)
      .call();

    for (const account of response.records || []) {
      const holder = account.account_id ?? account.id;
      const balance = (account.balances || []).find(
        (entry) =>
          entry.asset_code === code && entry.asset_issuer === publicKey
      );

      rows.push({
        key: `${code}:${holder}`,
        assetCode: code,
        assetIssuer: publicKey,
        holder,
        balance: balance?.balance ?? "0",
        limit: balance?.limit ?? null,
        isAuthorized:
          typeof balance?.is_authorized === "boolean"
            ? balance.is_authorized
            : null,
      });
    }
  }

  return rows;
}

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

/** Read the public Horizon order book for a validated pair of SDK assets. */
export async function getOrderBook(selling, buying) {
  if (!selling || !buying || selling.equals(buying)) {
    throw new Error("Choose two different valid assets for the order book.");
  }
  return withHorizon429Backoff(() =>
    getServer().orderbook(selling, buying).call()
  );
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
 * Spendable balance after reserves and selling liabilities.
 * Native XLM keeps the base reserve for the account plus each subentry.
 * Credit assets only subtract selling liabilities. Buying liabilities are reported, not subtracted.
 */
export function calculateAvailableBalance(
  balance,
  isNative,
  subentryCount = 0,
  baseReserve = 0.5
) {
  const total = parseFloat(balance.balance || "0");
  const sellingLiabilities = parseFloat(balance.selling_liabilities || "0");

  if (isNative) {
    const minBalance = baseReserve * (2 + subentryCount);
    return Math.max(0, total - minBalance - sellingLiabilities).toFixed(7);
  }

  return Math.max(0, total - sellingLiabilities).toFixed(7);
}

function liabilityFields(balance, isNative, subentryCount, baseReserve) {
  const sellingLiabilities = parseFloat(balance.selling_liabilities || "0");
  const buyingLiabilities = parseFloat(balance.buying_liabilities || "0");
  return {
    sellingLiabilities: sellingLiabilities.toFixed(7),
    buyingLiabilities: buyingLiabilities.toFixed(7),
    available: calculateAvailableBalance(balance, isNative, subentryCount, baseReserve),
  };
}

async function readBaseReserve() {
  let baseReserve = 0.5;
  try {
    if (getServer().ledgers) {
      const ledgerInfo = await getServer().ledgers().order("desc").limit(1).call();
      if (ledgerInfo.records[0]?.base_reserve_in_stroops) {
        baseReserve = parseFloat(ledgerInfo.records[0].base_reserve_in_stroops) / 10000000;
      }
    }
  } catch {
    // Keep the protocol default when the ledgers endpoint is unavailable.
  }
  return baseReserve;
}

function mapHorizonBalances(account, baseReserve = 0.5) {
  const subentryCount = account.subentry_count || 0;
  return account.balances.map((b) => {
    if (b.asset_type === "liquidity_pool_shares") {
      return {
        key: `pool:${b.liquidity_pool_id}`,
        code: "POOL",
        issuer: null,
        balance: b.balance,
        limit: null,
        isNative: false,
        isPoolShare: true,
        poolId: b.liquidity_pool_id,
      };
    }
    if (b.asset_type === "native") {
      return {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: b.balance,
        limit: null,
        ...(b.sponsor ? { sponsor: b.sponsor } : {}),
        isNative: true,
        ...liabilityFields(b, true, subentryCount, baseReserve),
      };
    }
    return {
      key: `${b.asset_code}:${b.asset_issuer}`,
      code: b.asset_code,
      issuer: b.asset_issuer,
      balance: b.balance,
      limit: b.limit,
      ...(b.sponsor ? { sponsor: b.sponsor } : {}),
      isNative: false,
      isAuthorized:
        typeof b.is_authorized === "boolean" ? b.is_authorized : null,
      isAuthorizedToMaintainLiabilities:
        typeof b.is_authorized_to_maintain_liabilities === "boolean"
          ? b.is_authorized_to_maintain_liabilities
          : null,
      clawbackEnabled:
        typeof b.clawback_enabled === "boolean" ? b.clawback_enabled : null,
      ...liabilityFields(b, false, subentryCount, baseReserve),
    };
  });
}

function mapClaimableBalance(record, publicKey) {
  const [code, issuer] = (record.asset || "").split(":");
  return {
    id: record.id,
    amount: record.amount,
    code: code || "XLM",
    issuer: issuer || null,
    createdByAccount: record.sponsor === publicKey,
    clawbackEnabled: Boolean(record.asset && issuer && record.flags?.auth_clawback_enabled),
    claimants: record.claimants || [],
    createdAt: record.last_modified_time || null,
  };
}

/**
 * Load claimable balances sponsored by the connected account. Horizon's
 * sponsor filter is the creator for balances created by this account; keep
 * the filter server-side so another account's balance is never offered for
 * clawback.
 */
export async function getClaimableBalances(publicKey) {
  const records = await getServer()
    .claimableBalances()
    .forSponsor(publicKey)
    .limit(200)
    .call();

  const balances = await Promise.all(
    (records.records || []).map(async (record) => {
      const mapped = mapClaimableBalance(record, publicKey);
      if (!mapped.issuer) return mapped;

      try {
        const assets = await getServer()
          .assets()
          .forCode(mapped.code)
          .forIssuer(mapped.issuer)
          .call();
        return {
          ...mapped,
          clawbackEnabled: Boolean(assets.records?.[0]?.flags?.auth_clawback_enabled),
        };
      } catch {
        return { ...mapped, clawbackEnabled: false };
      }
    })
  );

  return balances.filter((balance) => balance.createdByAccount);
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
    return mapHorizonBalances(account, await readBaseReserve());
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
    const baseReserve = await readBaseReserve();
    return {
      id: account.id,
      sequence: account.sequenceNumber(),
      subentryCount: account.subentry_count,
      thresholds: account.thresholds,
      balances: mapHorizonBalances(account, baseReserve),
      explorerUrl: explorerAccountUrl(publicKey),
    };
  }, options);
}

export async function getBalance(publicKey, options = {}) {
  const balances = await getAccountBalances(publicKey, options);
  const xlm = balances.find((b) => b.isNative);
  return xlm ? xlm.balance : "0";
}

/** Load all open offers owned by the connected account from Horizon. */
export async function getOpenOffers(publicKey, options = {}) {
  return withHorizon429Backoff(async () => {
    let page = await getServer().offers().forAccount(publicKey).limit(200).call();
    const offers = [];
    while (page.records.length > 0) {
      offers.push(...page.records);
      if (page.records.length < 200) break;
      page = await page.next();
    }
    return offers;
  }, options);
}

/**
 * Load one liquidity pool (both reserves and total shares) from Horizon.
 *
 * @param {string} poolId Horizon liquidity-pool id (`hex`).
 * @returns {Promise<object>} The Horizon liquidity-pool record.
 */
export async function getLiquidityPool(poolId) {
  if (typeof poolId !== "string" || !poolId) {
    throw new Error("A liquidity pool id is required.");
  }

  return getServer().liquidityPools().liquidityPoolId(poolId).call();
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

/** Read one transaction and all its operations directly from the active Horizon. */
export async function getTransactionByHash(input, options = {}) {
  const hash = normaliseTxHash(input);
  const base = getActiveNetwork().horizonUrl;

  const read = async (url) => {
    const response = await fetch(url, { signal: options.signal });
    if (response.status === 404) {
      throw new Error("Transaction not found on this network.");
    }
    if (!response.ok) {
      const error = new Error(`Could not load transaction (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };

  return withHorizon429Backoff(async () => {
    const transaction = await read(`${base}/transactions/${hash}`);
    const operationPage = await read(`${base}/transactions/${hash}/operations?limit=200`);
    return { transaction, operations: operationPage?._embedded?.records || [] };
  }, options);
}

/** Deep-link into the hash status watch panel for a transaction. */
export function statusWatchHref(hash) {
  return `#status-watch/${encodeURIComponent(hash)}`;
}

/**
 * Map a Horizon pending-queue record into the fields the panel renders.
 * Accepts both short lab names and classic Horizon transaction field names.
 */
export function mapPendingTransaction(record) {
  const status = String(
    record.status ?? record.tx_status ?? "pending"
  ).toLowerCase();

  return {
    hash: record.hash,
    fee: String(record.fee ?? record.fee_charged ?? record.max_fee ?? ""),
    sequence: String(
      record.sequence ?? record.source_account_sequence ?? ""
    ),
    status,
  };
}

/**
 * Keep only transactions Horizon has not applied yet.
 * Applied rows from the pending endpoint are ignored.
 */
export function selectPendingTransactions(records) {
  return (records || [])
    .map(mapPendingTransaction)
    .filter((tx) => tx.hash && tx.status !== "applied");
}

/**
 * List transactions for an account that are still pending on Horizon.
 *
 * Hits `GET {horizon}/accounts/{id}/pending_transactions`. A 404 means an
 * empty queue (not an error). Applied records in the payload are dropped.
 *
 * @param {string} publicKey Connected account.
 * @returns {Promise<object[]>} Pending rows with hash, fee, and sequence.
 */
export async function getPendingTransactions(publicKey, options = {}) {
  return withHorizon429Backoff(async () => {
    const url = `${getActiveNetwork().horizonUrl}/accounts/${encodeURIComponent(
      publicKey
    )}/pending_transactions`;

    const response = options.signal
      ? await fetch(url, { signal: options.signal })
      : await fetch(url);
    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      const error = new Error(
        `Could not load pending transactions (HTTP ${response.status}).`
      );
      error.status = response.status;
      throw error;
    }

    const body = await response.json();
    const records = Array.isArray(body)
      ? body
      : body?._embedded?.records || body?.records || [];

    return selectPendingTransactions(records);
  }, options);
}
