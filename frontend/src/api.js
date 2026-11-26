import { API_BASE } from "./config";

export async function fetchNetworkInfo() {
  const res = await fetch(`${API_BASE}/api/network`);
  if (!res.ok) throw new Error("Backend network endpoint failed");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

/** Read the latest ledger sequence directly from the selected Horizon. */
export async function fetchLatestHorizonLedger(horizonUrl) {
  const base = String(horizonUrl || "").replace(/\/$/, "");
  const res = await fetch(`${base}/ledgers?order=desc&limit=1`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Latest Horizon ledger fetch failed");
  const sequence = data?._embedded?.records?.[0]?.sequence;
  return sequence == null ? null : Number(sequence);
}

/**
 * Build the `network` query the backend uses to pick its Horizon.
 * Omitted when no network is passed, so the backend's Testnet default applies.
 */
function networkParam(params, network) {
  if (network) params.set("network", network);
  return params;
}

/**
 * Fetch account details from the backend for `network` (TESTNET/FUTURENET).
 * Omitting `network` leaves the request on the backend's Testnet default.
 */
export async function fetchAccountViaApi(publicKey, network) {
  const query = networkParam(new URLSearchParams(), network).toString();
  const res = await fetch(`${API_BASE}/api/account/${publicKey}${query ? `?${query}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Account fetch failed");
  return data;
}

export async function fetchPaymentsViaApi(publicKey, limit = 15, cursor, network, options = {}) {
  const params = networkParam(new URLSearchParams({ limit: String(limit) }), network);
  if (cursor) params.set("cursor", cursor);

  const url = `${API_BASE}/api/payments/${publicKey}?${params.toString()}`;
  const res = options.signal
    ? await fetch(url, { signal: options.signal })
    : await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Payments fetch failed");
  return { records: data.records || [], nextCursor: data.nextCursor ?? null };
}

/** How long the custom network form waits for a Horizon root before refusing. */
export const HORIZON_ROOT_TIMEOUT_MS = 5000;

/**
 * Whether a JSON body looks like a Horizon root (`GET /`).
 *
 * Horizon's root names its own version, the network passphrase it serves and
 * the links to its resources. A body without all three is something else, for
 * example a Soroban RPC endpoint, a web page or another API.
 */
export function looksLikeHorizonRoot(body) {
  return Boolean(
    body &&
      typeof body === "object" &&
      typeof body.horizon_version === "string" &&
      body.horizon_version.trim() &&
      typeof body.network_passphrase === "string" &&
      body.network_passphrase.trim() &&
      body._links &&
      typeof body._links === "object"
  );
}

/**
 * Request a Horizon root and confirm it is one, before a custom network is saved.
 *
 * Only an HTTPS URL is requested. A redirect that lands on plain HTTP, an
 * error status, a body that is not a Horizon root, and no answer within
 * `timeoutMs` are each refused with their own message. Nothing is stored here.
 *
 * @param {string} horizonUrl The HTTPS Horizon URL the form will save.
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<object>} The Horizon root body.
 * @throws {Error} Why the URL was refused.
 */
export async function fetchHorizonRoot(horizonUrl, { timeoutMs = HORIZON_ROOT_TIMEOUT_MS } = {}) {
  let url;
  try {
    url = new URL(String(horizonUrl || "").trim());
  } catch {
    throw new Error("Horizon URL must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:") throw new Error("Horizon URL must use HTTPS.");

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error(
        `Horizon did not answer within ${timeoutMs / 1000} seconds. Nothing was saved.`,
        { cause: error }
      );
    }
    throw new Error(`Could not reach Horizon at ${url.origin}. Nothing was saved.`, {
      cause: error,
    });
  }

  // fetch follows redirects; the final URL says where the answer came from.
  if (res.url && new URL(res.url).protocol !== "https:") {
    throw new Error("Horizon redirected to a non-HTTPS URL. Nothing was saved.");
  }
  if (!res.ok) {
    throw new Error(`Horizon root answered ${res.status}. Nothing was saved.`);
  }

  const body = await res.json().catch(() => null);
  if (!looksLikeHorizonRoot(body)) {
    throw new Error("That URL did not answer like a Horizon server. Nothing was saved.");
  }
  return body;
}
