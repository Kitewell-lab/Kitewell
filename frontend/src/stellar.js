import * as StellarSdk from "@stellar/stellar-sdk";
import { fetchAccountViaApi, fetchPaymentsViaApi } from "./api";
import { normaliseTxHash } from "./txStatusWatch";
import { rowsToCsv } from "./csvExport";
import {
  getActiveNetwork,
  getActiveNetworkId,
  isFriendbotAvailable,
  NETWORKS,
} from "./network";
import { calculateMinimumBalance } from "./accountReserve";
import { mapTransactionFee } from "./historyFee";
import { Buffer } from "buffer";

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
  const network = getActiveNetwork();
  return network.explorerBase
    ? `${network.explorerBase}/account/${publicKey}`
    : `${network.horizonUrl}/accounts/${publicKey}`;
}

/**
 * Explorer link for a transaction hash. Defaults to the active network; pass a
 * network to build the link for a specific one.
 */
export function explorerTxUrl(hash, network = getActiveNetwork()) {
  return network.explorerBase
    ? `${network.explorerBase}/tx/${hash}`
    : `${network.horizonUrl}/transactions/${hash}`;
}

/**
 * Read Horizon's `/fee_stats` and expose the last ledger's charged-fee mode and
 * the p10/p99 percentiles used by the fee selector.
 *
 * @returns {Promise<{mode: string, p10: string, p99: string, lastLedger: string|null}>}
 */
export async function getFeeStats() {
  const stats = await getServer().feeStats();
  const charged = stats?.fee_charged ?? {};
  const fallback = String(
    stats?.last_ledger_base_fee ?? StellarSdk.BASE_FEE
  );

  return {
    mode: String(charged.mode ?? fallback),
    p10: String(charged.p10 ?? fallback),
    p99: String(charged.p99 ?? fallback),
    lastLedger: stats?.last_ledger ? String(stats.last_ledger) : null,
  };
}

export const MAX_ASSET_CODE_LENGTH = 12;
export const MAX_DATA_NAME_BYTES = 64;
export const MAX_DATA_VALUE_BYTES = 64;

export function utf8ByteLength(value) {
  return new TextEncoder().encode(value == null ? "" : String(value)).length;
}

export function validateDataName(name) {
  const normalized = String(name ?? "");
  if (!normalized) throw new Error("Data name is required.");
  if (utf8ByteLength(normalized) > MAX_DATA_NAME_BYTES) {
    throw new Error("Data name must be 64 UTF-8 bytes or fewer.");
  }
  return normalized;
}

export function validateDataValue(value) {
  const normalized = value == null ? "" : String(value);
  if (utf8ByteLength(normalized) > MAX_DATA_VALUE_BYTES) {
    throw new Error("Data value must be 64 UTF-8 bytes or fewer.");
  }
  return normalized;
}

export function formatDataValue(value) {
  if (value == null) return "";

  let bytes;
  if (typeof value === "string") {
    try {
      const binary = atob(value);
      bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
      bytes = new TextEncoder().encode(value);
    }
  } else if (value instanceof Uint8Array) {
    bytes = value;
  } else {
    bytes = new TextEncoder().encode(String(value));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}

export function mapAccountDataEntries(account) {
  if (Array.isArray(account?.dataEntries)) {
    return account.dataEntries
      .filter((entry) => entry && typeof entry.name === "string")
      .map((entry) => ({ name: entry.name, value: entry.value }));
  }

  let data = account?.data_attr;
  if ((!data || typeof data !== "object") && typeof account?.data === "function") {
    data = account.data();
  } else if ((!data || typeof data !== "object") && account?.data && typeof account.data === "object") {
    data = account.data;
  }
  if (!data || typeof data !== "object") return [];
  return Object.entries(data)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ({ name, value }));
}

export const getAccountDataEntries = mapAccountDataEntries;
export const formatAccountDataValue = formatDataValue;
export const validateManageDataName = validateDataName;
export const validateManageDataValue = validateDataValue;

export function validateAccountMerge(source, destination, retypeDestination) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(source)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }
  if (destination === source) {
    throw new Error("The destination account cannot be the connected account.");
  }
  if (retypeDestination !== destination) {
    throw new Error("Retype the destination public key exactly as it appears.");
  }
  return destination;
}

export function mergeBlockersFromAccount(account) {
  const blockers = [];

  const trustlines = (account?.balances || []).filter(
    (balance) =>
      balance &&
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12" ||
        (balance.isNative === false && Boolean(balance.code || balance.asset_code)))
  );
  if (trustlines.length) {
    blockers.push(
      `Trustlines: ${trustlines
        .map((balance) => balance.asset_code || balance.code || "unknown")
        .join(", ")}`
    );
  }

  if (Array.isArray(account?.signers) && account.signers.length > 1) {
    blockers.push(
      `Signers: ${account.signers
        .map((signer) => signer.key)
        .filter(Boolean)
        .join(", ")}`
    );
  }

  const offers = Array.isArray(account?.offers)
    ? account.offers
    : Array.isArray(account?.openOffers)
      ? account.openOffers
      : [];
  if (offers.length) {
    blockers.push(
      `Offers: ${offers
        .map((offer) => offer.id)
        .filter(Boolean)
        .join(", ") || `${offers.length} open offer(s)`}`
    );
  }

  return blockers;
}

export async function getAccountMergeBlockers(publicKey) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  let account;
  if (backendIsUsable()) {
    try {
      account = await fetchAccountViaApi(publicKey);
    } catch {
      account = await getServer().loadAccount(publicKey);
    }
  } else {
    account = await getServer().loadAccount(publicKey);
  }

  try {
    const page = await getServer()
      .offers()
      .forSeller(publicKey)
      .limit(200)
      .order("asc")
      .call();
    account = { ...account, offers: page.records || page };
  } catch {
    account = { ...account, offers: account.offers || [] };
  }

  return mergeBlockersFromAccount(account);
}

export const accountMergeBlockers = mergeBlockersFromAccount;
export const validateAccountMergeDestination = validateAccountMerge;

export function accountLedgerStatus(lastModifiedLedger, latestLedger) {
  const accountLedger = Number(lastModifiedLedger);
  const horizonLedger = Number(latestLedger);
  if (
    lastModifiedLedger == null ||
    latestLedger == null ||
    !Number.isFinite(accountLedger) ||
    !Number.isFinite(horizonLedger)
  ) {
    return {
      lastModifiedLedger: Number.isFinite(accountLedger) && lastModifiedLedger != null
        ? accountLedger
        : null,
      latestLedger: Number.isFinite(horizonLedger) && latestLedger != null
        ? horizonLedger
        : null,
      state: "unknown",
      message: "Ledger age unknown.",
    };
  }

  const behindBy = Math.max(0, horizonLedger - accountLedger);
  return {
    lastModifiedLedger: accountLedger,
    latestLedger: horizonLedger,
    behindBy,
    state: behindBy > 0 ? "behind" : "current",
    message:
      behindBy > 0
        ? `Account figures are ${behindBy} ledger${behindBy === 1 ? "" : "s"} behind.`
        : "Account figures match Horizon's latest ledger.",
  };
}

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

function mapOrderBookRows(rows = []) {
  return rows.slice(0, 10).map((row) => ({
    amount: row.amount,
    price: row.price,
    priceR: row.price_r,
  }));
}

/** Read the public Horizon order book for a validated pair of SDK assets. */
export async function getOrderBook(selling, buying) {
  if (!selling || !buying) {
    throw new Error("Choose two different valid assets for the order book.");
  }
  if (selling.equals(buying)) {
    throw new Error("Selling and buying assets must be different.");
  }

  const book = await withHorizon429Backoff(() =>
    getServer().orderbook(selling, buying).limit(10).call()
  );
  return {
    bids: mapOrderBookRows(book.bids),
    asks: mapOrderBookRows(book.asks),
  };
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

/**
 * Hide only idle, zero-balance credit trustlines. Native XLM, pool shares and
 * trustlines with either buying or selling liabilities always remain visible.
 */
export function filterVisibleBalances(balances, hideZeroCreditAssets = false) {
  if (!Array.isArray(balances)) return [];
  if (!hideZeroCreditAssets) return balances;

  return balances.filter((balance) => {
    if (balance?.isNative || balance?.isPoolShare) return true;
    if (Number(balance?.balance || 0) !== 0) return true;
    return (
      Number(balance?.buyingLiabilities || 0) !== 0 ||
      Number(balance?.sellingLiabilities || 0) !== 0
    );
  });
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
    const sellingLiabilities = b.selling_liabilities ?? "0";
    const buyingLiabilities = b.buying_liabilities ?? "0";
    if (b.asset_type === "native") {
      return {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: b.balance,
        limit: null,
        isNative: true,
        sellingLiabilities,
        buyingLiabilities,
      };
    }
    return {
      key: `${b.asset_code}:${b.asset_issuer}`,
      code: b.asset_code,
      issuer: b.asset_issuer,
      balance: b.balance,
      limit: b.limit,
      isNative: false,
      sellingLiabilities,
      buyingLiabilities,
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
export async function getSponsoredClaimableBalances(publicKey) {
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
    lastModifiedLedger: account.last_modified_ledger ?? null,
    thresholds: account.thresholds,
    balances: mapHorizonBalances(account),
    dataEntries: mapAccountDataEntries(account),
    signers: account.signers || [],
    explorerUrl: explorerAccountUrl(publicKey),
  };
}

function offerAssetDescriptor(asset) {
  if (asset === "native" || asset?.asset_type === "native") {
    return { isNative: true };
  }
  if (typeof asset === "string") {
    const separator = asset.indexOf(":");
    if (separator <= 0 || separator === asset.length - 1) {
      throw new Error(`Horizon returned an invalid offer asset: ${asset}`);
    }
    return {
      isNative: false,
      code: asset.slice(0, separator),
      issuer: asset.slice(separator + 1),
    };
  }
  if (asset && asset.asset_code && asset.asset_issuer) {
    return {
      isNative: false,
      code: asset.asset_code,
      issuer: asset.asset_issuer,
    };
  }
  throw new Error("Horizon returned an invalid offer asset.");
}

/**
 * Load and normalize the active offers for a Stellar account.
 */
export async function getAccountOffers(publicKey, options = {}) {
  return withHorizon429Backoff(async () => {
    const page = await getServer()
      .offers()
      .forAccount(publicKey)
      .order("desc")
      .call({ signal: options.signal });

    return page.records.map((offer) => {
      const offerId = offer.id ?? offer.offer_id ?? offer.offerId;
      const price = offer.price_r ?? offer.price;
      if (
        offerId === undefined ||
        !price ||
        price.n === undefined ||
        price.d === undefined
      ) {
        throw new Error("Horizon returned an incomplete offer record.");
      }

      return {
        offerId: String(offerId),
        selling: offerAssetDescriptor(offer.selling),
        buying: offerAssetDescriptor(offer.buying),
        // A missing amount stays null: the row shows it as unknown and
        // cannot cancel it, instead of the whole list failing to load.
        amount:
          offer.amount === undefined || offer.amount === null
            ? null
            : String(offer.amount),
        priceNumerator: String(price.n),
        priceDenominator: String(price.d),
      };
    });
  }, options);
}

function positivePricePart(value, label) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    throw new Error(`${label} must be a positive integer.`);
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number > 2147483647) {
    throw new Error(`${label} exceeds the Stellar price limit.`);
  }
  if (number < 1) throw new Error(`${label} must be a positive integer.`);
  return number;
}

/**
 * Build a manageSellOffer operation, including the zero-amount form used to
 * cancel an existing offer by its offer ID.
 */
export function buildManageSellOffer({
  selling,
  buying,
  amount,
  priceNumerator,
  priceDenominator,
  offerId = "0",
} = {}) {
  const sellingAsset = buildAsset(selling);
  const buyingAsset = buildAsset(buying);
  if (sellingAsset.toString() === buyingAsset.toString()) {
    throw new Error("Selling and buying assets must be different.");
  }

  return StellarSdk.Operation.manageSellOffer({
    selling: sellingAsset,
    buying: buyingAsset,
    amount: String(amount ?? ""),
    price: {
      n: positivePricePart(priceNumerator, "Price numerator"),
      d: positivePricePart(priceDenominator, "Price denominator"),
    },
    offerId: String(offerId),
  });
}

export async function getBalance(publicKey, options = {}) {
  const balances = await getAccountBalances(publicKey, options);
  const xlm = balances.find((b) => b.isNative);
  return xlm ? xlm.balance : "0";
}

export async function getClaimableBalances(publicKey) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  const page = await getServer()
    .claimableBalances()
    .claimant(publicKey)
    .limit(200)
    .order("desc")
    .call();

  return (page.records || []).map((balance) => ({
    id: balance.id,
    asset:
      balance.asset === "native"
        ? "XLM"
        : `${balance.asset_code || balance.asset}`,
    assetCode: balance.asset_code,
    assetIssuer: balance.asset_issuer,
    amount: balance.amount,
    claimants: balance.claimants || [],
    sponsor: balance.sponsor || null,
  }));
}

export const listClaimableBalances = getClaimableBalances;

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

function validateLiquidityPoolId(poolId) {
  if (typeof poolId !== "string" || !/^[0-9a-f]{64}$/i.test(poolId)) {
    throw new Error("Pool ID must be 64 hexadecimal characters.");
  }
  return poolId.toLowerCase();
}

/**
 * Build a constant-product liquidity pool deposit operation.
 *
 * @param {string} poolId Horizon liquidity-pool id (`hex`).
 * @param {string} maxAmountA Maximum amount of reserve A to deposit.
 * @param {string} maxAmountB Maximum amount of reserve B to deposit.
 * @param {string} minPrice Minimum accepted reserve A/B price.
 * @param {string} maxPrice Maximum accepted reserve A/B price.
 * @returns {StellarSdk.xdr.Operation} The liquidity pool deposit operation.
 */
export function liquidityPoolDeposit(
  poolId,
  maxAmountA,
  maxAmountB,
  minPrice,
  maxPrice
) {
  return StellarSdk.Operation.liquidityPoolDeposit({
    liquidityPoolId: validateLiquidityPoolId(poolId),
    maxAmountA,
    maxAmountB,
    minPrice,
    maxPrice,
  });
}

/**
 * Build a constant-product liquidity pool withdrawal operation.
 *
 * @param {string} poolId Horizon liquidity-pool id (`hex`).
 * @param {string} amount Pool shares to burn.
 * @param {string} minAmountA Minimum reserve A to receive.
 * @param {string} minAmountB Minimum reserve B to receive.
 * @returns {StellarSdk.xdr.Operation} The liquidity pool withdrawal operation.
 */
export function liquidityPoolWithdraw(poolId, amount, minAmountA, minAmountB) {
  return StellarSdk.Operation.liquidityPoolWithdraw({
    liquidityPoolId: validateLiquidityPoolId(poolId),
    amount,
    minAmountA,
    minAmountB,
  });
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
      return options.signal
        ? await fetchPaymentsViaApi(publicKey, limit, cursor, options)
        : await fetchPaymentsViaApi(publicKey, limit, cursor);
    } catch {
      /* fall back to direct Horizon */
    }
  }

  return withHorizon429Backoff(async () => {
    let request = getServer()
      .payments()
      .forAccount(publicKey)
      .limit(limit)
      .order("desc");
    if (cursor) request = request.cursor(cursor);
    const payments = await request.call();
    const lastRaw = payments.records[payments.records.length - 1];

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
          ...mapTransactionFee(p.transaction),
        })),
      nextCursor:
        payments.records.length < limit ? null : (lastRaw?.paging_token ?? null),
    };
  }, options);
}

/**
 * Group payment records under the UTC day of their ledger close time.
 *
 * Days are ordered newest first; records keep their input order inside a day.
 * A record without a usable `created_at` goes to a trailing `day: null` group.
 * Re-run it on the full merged list after each page so new rows land in the
 * correct existing day.
 *
 * @param {object[]} records Payment records carrying a `created_at` ISO time.
 * @returns {{ day: string|null, records: object[] }[]} `day` is `YYYY-MM-DD`
 *   (UTC), or null for the Unknown group.
 */
export function groupPaymentsByDay(records) {
  const byDay = new Map();
  for (const record of records) {
    const time = Date.parse(record?.created_at);
    const day = Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(record);
  }

  const dated = [...byDay.keys()].filter((day) => day !== null).sort().reverse();
  const days = byDay.has(null) ? [...dated, null] : dated;
  return days.map((day) => ({ day, records: byDay.get(day) }));
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

const MEMO_LOOKUP_CONCURRENCY = 5;

/**
 * Read the memo of each distinct transaction hash straight from Horizon.
 * Payment records carry no memo, so the CSV export looks them up here.
 *
 * @param {string[]} hashes Transaction hashes, duplicates allowed.
 * @param {object} [options] Forwarded to the Horizon read (`signal`, `sleep`).
 * @returns {Promise<Map<string, string>>} Memo by hash; "" when a transaction has none.
 */
export async function getTransactionMemos(hashes, options = {}) {
  const unique = [...new Set(hashes)];
  const base = getActiveNetwork().horizonUrl;
  const memos = new Map();

  const lookup = async (hash) => {
    const transaction = await withHorizon429Backoff(async () => {
      const response = await fetch(`${base}/transactions/${hash}`, { signal: options.signal });
      if (!response.ok) {
        const error = new Error(`Could not load transaction (HTTP ${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    }, options);
    memos.set(hash, transaction?.memo ?? "");
  };

  for (let i = 0; i < unique.length; i += MEMO_LOOKUP_CONCURRENCY) {
    await Promise.all(unique.slice(i, i + MEMO_LOOKUP_CONCURRENCY).map(lookup));
  }
  return memos;
}

export const PAYMENTS_CSV_COLUMNS = [
  "time",
  "direction",
  "asset",
  "amount",
  "other_account",
  "memo",
  "hash",
];

export const PAYMENTS_CSV_FILENAME = "kitewell-payments.csv";

/**
 * Build the CSV for the payments currently loaded in the history list.
 * An empty list yields the header row only.
 *
 * @param {object[]} payments Loaded payment records.
 * @param {string} publicKey Connected account; decides direction and other account.
 * @param {Map<string, string>} [memosByHash] Memo per transaction hash.
 * @returns {string} CRLF-terminated CSV text.
 */
export function buildPaymentsCsv(payments, publicKey, memosByHash = new Map()) {
  const rows = payments.map((payment) => {
    const isOutgoing = payment.from === publicKey;
    return {
      time: payment.created_at ?? "",
      direction: isOutgoing ? "sent" : "received",
      asset: payment.asset_code || "XLM",
      amount: payment.amount,
      other_account: isOutgoing ? payment.to : payment.from,
      memo: memosByHash.get(payment.transaction_hash) ?? "",
      hash: payment.transaction_hash,
    };
  });
  return rowsToCsv(rows, PAYMENTS_CSV_COLUMNS);
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

/** How often an offer watch re-reads the order book by default. */
export const OFFER_POLL_INTERVAL_MS = 5000;

function horizonAssetLabel(asset = {}) {
  if (!asset) return null;
  if (asset.asset_type === "native") return "XLM";
  return asset.asset_code ?? null;
}

/**
 * Map a Horizon offer record into the fields the watch panel renders. The
 * remaining `amount` shrinks as the offer fills; `price` is the offered price.
 */
export function mapOfferRecord(record) {
  return {
    id: String(record.id),
    seller: record.seller ?? null,
    amount: record.amount ?? "0",
    price: record.price ?? null,
    selling: horizonAssetLabel(record.selling),
    buying: horizonAssetLabel(record.buying),
  };
}

function isOfferGoneError(error) {
  const status = error?.response?.status ?? error?.status;
  return status === 404 || error?.name === "NotFoundError";
}

async function accountStillListsOffer(fetchAccountOffers, publicKey, offerId) {
  const page = await fetchAccountOffers(publicKey);
  const records = page?.records ?? page ?? [];
  return records.some((record) => String(record.id) === String(offerId));
}

/**
 * Watch one placed offer until it leaves the order book or the watch stops.
 *
 * Each poll reports the current remaining amount and price through `onUpdate`.
 * A 404 ends the watch with `status: "gone"`; when an account is supplied the
 * watch then says whether that account still lists the offer id, without
 * guessing whether the disappearance was a fill or a cancel. Stopping the
 * watch (abort signal) only stops the polling — it never touches the offer.
 *
 * @param {string|number} offerId Horizon offer id
 * @param {object} [options]
 * @param {string} [options.publicKey] Account used for the gone check
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.intervalMs]
 * @param {number} [options.maxPolls]
 * @param {(offer: object) => void} [options.onUpdate]
 * @returns {Promise<{ status: "gone"|"still-open", stillListed: boolean|null }>}
 */
export async function watchOfferUntilGone(offerId, options = {}) {
  const {
    publicKey,
    signal,
    intervalMs = OFFER_POLL_INTERVAL_MS,
    maxPolls = 120,
    onUpdate = () => {},
    fetchOffer = (id) => getServer().offers().offer(id).call(),
    fetchAccountOffers = (account) =>
      getServer().offers().forAccount(account).limit(200).call(),
    sleep = defaultSleep,
  } = options;

  if (!/^\d+$/.test(String(offerId ?? "")) || Number(offerId) <= 0) {
    throw new Error("Offer id must be a positive number.");
  }

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    if (signal?.aborted) throw abortError();

    try {
      const record = await fetchOffer(offerId);
      onUpdate(mapOfferRecord(record));
    } catch (error) {
      if (!isOfferGoneError(error)) throw error;

      let stillListed = null;
      if (publicKey) {
        try {
          stillListed = await accountStillListsOffer(
            fetchAccountOffers,
            publicKey,
            offerId
          );
        } catch {
          // The gone answer stands even if the account check fails.
          stillListed = null;
        }
      }

      onUpdate(null);
      return { status: "gone", stillListed };
    }

    if (attempt < maxPolls - 1) await sleep(intervalMs, signal);
  }

  return { status: "still-open", stillListed: null };
}

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
      throw new Error(
        `Could not load pending transactions (HTTP ${response.status}).`
      );
    }

    const body = await response.json();
    const records = Array.isArray(body)
      ? body
      : body?._embedded?.records || body?.records || [];

    return selectPendingTransactions(records);
  }, options);
}

/**
 * Load one page of trades for an account.
 *
 * @param {string} publicKey Account to page through.
 * @param {number} [limit] Page size; Horizon caps it at 200 server-side.
 * @param {string} [cursor] Paging cursor from the previous page; omit for the
 *   first page.
 * @returns {Promise<{ records: object[], nextCursor: string|null }>} The
 *   mapped trade records plus the cursor for the next page (null on the last
 *   page).
 */
export async function getTrades(publicKey, limit = 15, cursor, options = {}) {
  if (!publicKey || typeof publicKey !== "string") {
    throw new Error("Public key is required.");
  }

  let builder = getServer()
    .trades()
    .forAccount(publicKey)
    .limit(limit)
    .order("desc");

  if (cursor) {
    builder = builder.cursor(cursor);
  }

  const response = await builder.call();
  const hashes = await lookupTradeTransactionHashes(response.records, options);

  return {
    records: response.records.map((trade, index) => ({
      id: trade.id,
      ledger: tradeLedger(trade),
      transaction_hash: hashes[index],
      ledger_close_time: trade.ledger_close_time,
      offer_id: trade.offer_id,
      base_account: trade.base_account,
      base_amount: trade.base_amount,
      base_asset_type: trade.base_asset_type,
      base_asset_code: trade.base_asset_code,
      base_asset_issuer: trade.base_asset_issuer,
      counter_account: trade.counter_account,
      counter_amount: trade.counter_amount,
      counter_asset_type: trade.counter_asset_type,
      counter_asset_code: trade.counter_asset_code,
      counter_asset_issuer: trade.counter_asset_issuer,
      price: trade.price,
      base_is_seller: trade.base_is_seller,
    })),
    nextCursor: response.records.length > 0 
      ? response.records[response.records.length - 1].paging_token 
      : null,
  };
}


/**
 * The operation that produced a trade. Horizon trade ids are
 * `<operation id>-<index>`, where the operation id is a TOID.
 */
export function tradeOperationId(trade) {
  const raw = String(trade?.id ?? trade?.paging_token ?? "");
  const operationId = raw.split("-")[0];
  return /^\d+$/.test(operationId) && operationId !== "0" ? operationId : null;
}

/**
 * The ledger a trade closed in, read from the trade's own id: a TOID keeps the
 * ledger sequence in its upper 32 bits. Null when the id is not a TOID.
 */
export function tradeLedger(trade) {
  const operationId = tradeOperationId(trade);
  if (!operationId) return null;
  const ledger = Number(BigInt(operationId) >> 32n);
  return ledger > 0 ? ledger : null;
}

function isTransactionHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Explorer link for the transaction that settled a trade, on the given network
 * (the active network by default). Null when the trade has no known hash.
 * The link only opens the explorer; it never submits anything.
 */
export function tradeExplorerLink(trade, network = getActiveNetwork()) {
  const hash = trade?.transaction_hash;
  if (!isTransactionHash(hash) || !network) return null;
  return explorerTxUrl(hash.toLowerCase(), network);
}

const TRADE_HASH_LOOKUP_CONCURRENCY = 5;

/**
 * Horizon trade records do not carry the transaction hash, so read it from
 * each trade's operation. A lookup that fails leaves that trade's hash null
 * ("unknown") instead of failing the whole page.
 */
async function lookupTradeTransactionHashes(trades, options = {}) {
  const {
    fetchOperation = (id) => getServer().operations().operation(id).call(),
  } = options;
  const hashes = new Array(trades.length).fill(null);
  const byOperation = new Map();
  trades.forEach((trade, index) => {
    const operationId = tradeOperationId(trade);
    if (!operationId) return;
    if (!byOperation.has(operationId)) byOperation.set(operationId, []);
    byOperation.get(operationId).push(index);
  });

  const queue = [...byOperation.keys()];
  const worker = async () => {
    while (queue.length) {
      const operationId = queue.shift();
      let hash;
      try {
        const operation = await fetchOperation(operationId);
        hash = isTransactionHash(operation?.transaction_hash)
          ? operation.transaction_hash
          : null;
      } catch {
        hash = null;
      }
      for (const index of byOperation.get(operationId)) hashes[index] = hash;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(TRADE_HASH_LOOKUP_CONCURRENCY, queue.length) }, worker)
  );
  return hashes;
}

const STROOPS_PER_UNIT = 10_000_000n;

/** Parse a Horizon amount ("12.3400000") into stroops; null when invalid. */
function amountToStroops(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d+)(?:\.(\d{1,7}))?$/);
  if (!match) return null;
  return BigInt(match[1]) * STROOPS_PER_UNIT + BigInt((match[2] || "").padEnd(7, "0"));
}

function stroopsToAmount(stroops) {
  const whole = stroops / STROOPS_PER_UNIT;
  const fraction = String(stroops % STROOPS_PER_UNIT).padStart(7, "0");
  return `${whole}.${fraction}`;
}

function sameOfferAsset(descriptor, type, code, issuer) {
  if (!descriptor) return false;
  if (descriptor.isNative) return type === "native";
  return type !== "native" && code === descriptor.code && issuer === descriptor.issuer;
}

/**
 * How much of its selling asset an offer gave up in one of its own trades.
 * Null when the trade's assets do not include the offer's selling asset.
 */
function offerSoldInTrade(offer, trade) {
  if (
    sameOfferAsset(
      offer.selling,
      trade.base_asset_type,
      trade.base_asset_code,
      trade.base_asset_issuer
    )
  ) {
    return amountToStroops(trade.base_amount);
  }
  if (
    sameOfferAsset(
      offer.selling,
      trade.counter_asset_type,
      trade.counter_asset_code,
      trade.counter_asset_issuer
    )
  ) {
    return amountToStroops(trade.counter_amount);
  }
  return null;
}

const OFFER_TRADES_PAGE_LIMIT = 200;
const OFFER_TRADES_MAX_PAGES = 10;

/**
 * Read the original amount of one of the account's offers from the offer
 * itself: what is still open plus everything its own trades have filled
 * (`/offers/{id}/trades`). Nothing is estimated from the order book.
 * Returns null when the amount or any trade cannot be read.
 */
export async function getOfferOriginalAmount(offer, options = {}) {
  const remaining = amountToStroops(offer?.amount);
  if (remaining === null || !offer?.offerId) return null;

  const {
    fetchOfferTrades = (offerId, cursor) => {
      let builder = getServer()
        .trades()
        .forOffer(offerId)
        .limit(OFFER_TRADES_PAGE_LIMIT)
        .order("asc");
      if (cursor) builder = builder.cursor(cursor);
      return builder.call();
    },
  } = options;

  let filled = 0n;
  let cursor;
  for (let page = 0; page < OFFER_TRADES_MAX_PAGES; page += 1) {
    const response = await fetchOfferTrades(offer.offerId, cursor);
    const records = response?.records || [];
    for (const trade of records) {
      const sold = offerSoldInTrade(offer, trade);
      if (sold === null) return null;
      filled += sold;
    }
    if (records.length < OFFER_TRADES_PAGE_LIMIT) {
      return stroopsToAmount(remaining + filled);
    }
    cursor = records[records.length - 1].paging_token;
  }
  // Too many fills to read in one go; do not guess.
  return null;
}

/**
 * Attach `originalAmount` to each of the account's offers. An offer whose
 * history cannot be read keeps `originalAmount: null`.
 */
export async function withOfferOriginalAmounts(offers, options = {}) {
  return Promise.all(
    (offers || []).map(async (offer) => {
      let originalAmount;
      try {
        originalAmount = await getOfferOriginalAmount(offer, options);
      } catch {
        originalAmount = null;
      }
      return { ...offer, originalAmount };
    })
  );
}

/**
 * Describe how much of an open offer is still open, from the offer's own
 * figures. `cancellable` is false when the open amount is unknown.
 *
 * @returns {{ state: "unknown"|"open"|"partial"|"original-unknown",
 *   remaining: string|null, original: string|null, filled: string|null,
 *   cancellable: boolean }}
 */
export function describeOfferFill(offer) {
  const remaining = amountToStroops(offer?.amount);
  if (remaining === null) {
    return { state: "unknown", remaining: null, original: null, filled: null, cancellable: false };
  }
  const original = amountToStroops(offer?.originalAmount);
  if (original === null || original < remaining) {
    return {
      state: "original-unknown",
      remaining: stroopsToAmount(remaining),
      original: null,
      filled: null,
      cancellable: true,
    };
  }
  return {
    state: original === remaining ? "open" : "partial",
    remaining: stroopsToAmount(remaining),
    original: stroopsToAmount(original),
    filled: stroopsToAmount(original - remaining),
    cancellable: true,
  };
}

// Restored: these exports were dropped while merging earlier pull requests.

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

export async function getLatestBaseReserve() {
  const response = await getServer()
    .ledgers()
    .order("desc")
    .limit(1)
    .call();
  const baseReserve = response.records?.[0]?.base_reserve_in_stroops;
  if (!/^\d+$/.test(String(baseReserve ?? "")) || Number(baseReserve) <= 0) {
    throw new Error("Latest ledger did not include a valid base reserve.");
  }
  return String(baseReserve);
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
 * Fetch a complete account snapshot from Horizon.
 *
 * @param {string} publicKey The account to snapshot.
 * @returns {Promise<object>} A comprehensive account snapshot including id,
 *   sequence, balances, signers, thresholds, data entries, offers, and
 *   subentry count. Secrets and signed XDR are never included.
 */
export async function getAccountSnapshot(publicKey) {
  if (!publicKey || typeof publicKey !== "string") {
    throw new Error("Public key is required.");
  }

  const account = await getServer().loadAccount(publicKey);

  // Fetch offers for this account
  let offers = [];
  try {
    const offersResponse = await getServer()
      .offers()
      .forAccount(publicKey)
      .limit(200)
      .call();
    offers = offersResponse.records.map((offer) => ({
      id: offer.id,
      selling: offer.selling,
      buying: offer.buying,
      amount: offer.amount,
      price: offer.price,
      price_r: offer.price_r,
    }));
  } catch {
    // Offers are optional; if fetch fails, continue with empty array
    offers = [];
  }

  // Process data entries, converting non-UTF-8 values to hex
  const dataEntries = {};
  if (account.data_attr) {
    Object.entries(account.data_attr).forEach(([key, value]) => {
      try {
        // Try to decode as UTF-8
        const decoded = Buffer.from(value, "base64").toString("utf8");
        // Check if it round-trips correctly (is valid UTF-8)
        if (Buffer.from(decoded, "utf8").toString("base64") === value) {
          dataEntries[key] = decoded;
        } else {
          // Not valid UTF-8, store as hex
          dataEntries[key] = Buffer.from(value, "base64").toString("hex");
        }
      } catch {
        // If decoding fails, store as hex
        dataEntries[key] = Buffer.from(value, "base64").toString("hex");
      }
    });
  }

  return {
    id: account.id,
    sequence: account.sequenceNumber(),
    subentryCount: account.subentry_count,
    thresholds: {
      low: account.thresholds.low_threshold,
      medium: account.thresholds.med_threshold,
      high: account.thresholds.high_threshold,
    },
    signers: account.signers.map((signer) => ({
      key: signer.key,
      weight: signer.weight,
      type: signer.type,
    })),
    balances: mapHorizonBalances(account),
    data: dataEntries,
    offers,
    network: getActiveNetworkId(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Download an account snapshot as a JSON file.
 *
 * @param {string} publicKey The account to snapshot.
 */
export async function downloadAccountSnapshot(publicKey) {
  const snapshot = await getAccountSnapshot(publicKey);

  const filename = `kitewell-account-${snapshot.id.slice(0, 8)}-${Date.now()}.json`;
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

const transactionDetailRequests = new Map();

/**
 * Read one transaction with its operations and effects from the active Horizon.
 * Read-only. Failed transactions are included (`include_failed`). Concurrent
 * calls for the same network and hash share one in-flight request.
 *
 * @param {string} input Transaction hash.
 * @returns {Promise<{ transaction: object, operations: object[], effects: object[] }>}
 */
export function getTransactionDetails(input, options = {}) {
  const hash = normaliseTxHash(input);
  const base = getActiveNetwork().horizonUrl;
  const key = `${base}|${hash}`;

  const pending = transactionDetailRequests.get(key);
  if (pending) return pending;

  const read = async (path) => {
    const response = await fetch(`${base}/transactions/${hash}${path}`);
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

  const request = withHorizon429Backoff(async () => {
    const [transaction, operationPage, effectPage] = await Promise.all([
      read(""),
      read("/operations?limit=200&include_failed=true"),
      read("/effects?limit=200"),
    ]);
    return {
      transaction,
      operations: operationPage?._embedded?.records || [],
      effects: effectPage?._embedded?.records || [],
    };
  }, options).finally(() => transactionDetailRequests.delete(key));

  transactionDetailRequests.set(key, request);
  return request;
}

/**
 * Fetch and parse stellar.toml for a domain or issuer account.
 *
 * @param {string} domainOrIssuer Either a domain (e.g., "example.com") or a
 *   Stellar public key (G...). When an issuer is provided, the SDK resolves
 *   the home_domain from the account's on-chain data.
 * @returns {Promise<object>} Parsed stellar.toml with keys like
 *   TRANSFER_SERVER, WEB_AUTH_ENDPOINT, KYC_SERVER, CURRENCIES, etc.
 */
export async function fetchStellarToml(domainOrIssuer) {
  if (!domainOrIssuer || typeof domainOrIssuer !== "string") {
    throw new Error("Domain or issuer address is required.");
  }

  const trimmed = domainOrIssuer.trim();
  if (!trimmed) {
    throw new Error("Domain or issuer address is required.");
  }

  return StellarSdk.StellarTomlResolver.resolve(trimmed, {
    allowHttp: false,
  });
}

/**
 * Fetch the SEP-24 info endpoint from a transfer server URL.
 *
 * @param {string} transferServerUrl The TRANSFER_SERVER URL from stellar.toml.
 * @returns {Promise<object>} The parsed JSON response from the /info endpoint,
 *   including deposit and withdraw asset details.
 */
export async function fetchTransferServerInfo(transferServerUrl) {
  if (!transferServerUrl || typeof transferServerUrl !== "string") {
    throw new Error("Transfer server URL is required.");
  }

  const trimmed = transferServerUrl.trim();
  if (!trimmed) {
    throw new Error("Transfer server URL is required.");
  }

  // Only allow HTTPS URLs for security
  if (!trimmed.startsWith("https://")) {
    throw new Error("Transfer server URL must use HTTPS.");
  }

  // Build info endpoint URL, ensuring no double slashes
  const baseUrl = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  const infoUrl = `${baseUrl}/info`;

  const response = await fetch(infoUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch transfer server info: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch stellar.toml and optionally the transfer server info for a domain or issuer.
 *
 * @param {string} domainOrIssuer Either a domain (e.g., "example.com") or a
 *   Stellar public key (G...).
 * @returns {Promise<object>} An object with:
 *   - toml: The parsed stellar.toml
 *   - transferServerInfo: The parsed /info response (null if TRANSFER_SERVER
 *     is absent or the fetch fails)
 */
export async function fetchAnchorInfo(domainOrIssuer) {
  const toml = await fetchStellarToml(domainOrIssuer);

  let transferServerInfo = null;
  if (toml.TRANSFER_SERVER) {
    try {
      transferServerInfo = await fetchTransferServerInfo(toml.TRANSFER_SERVER);
    } catch {
      // If the info endpoint fails, we still return the toml data
      transferServerInfo = null;
    }
  }

  return {
    toml,
    transferServerInfo,
  };
}

export { summarizeEnvelopeSignatures } from "./multisigEnvelope";
