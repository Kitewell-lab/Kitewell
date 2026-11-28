import { getActiveNetworkId } from "./network";
import { API_BASE } from "./config";

/**
 * Build the network query parameter for backend calls.
 * `networkOrOptions` accepts either a network id string or an options object
 * whose `network` property carries the network id.
 */
export function networkParam(networkOrOptions) {
  if (networkOrOptions == null) return null;
  if (typeof networkOrOptions === "object" && !Array.isArray(networkOrOptions)) {
    if ("network" in networkOrOptions && networkOrOptions.network != null) {
      return networkOrOptions.network;
    }
    if ("signal" in networkOrOptions) {
      return getActiveNetworkId();
    }
    return null;
  }
  if (typeof networkOrOptions === "string") return networkOrOptions;
  return null;
}

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

export async function fetchAccountViaApi(publicKey, network, options = {}) {
  const params = new URLSearchParams();
  if (network != null) params.set("network", network);

  const url = `${API_BASE}/api/account/${publicKey}` +
    (params.toString() ? `?${params.toString()}` : "");
  const res = options.signal
    ? await fetch(url, { signal: options.signal })
    : await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Account fetch failed");
  return data;
}

export async function fetchPaymentsViaApi(publicKey, limit = 15, cursor, networkOrOptions = {}, options = {}) {
  const network = networkParam(networkOrOptions);

  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (network != null) params.set("network", network);

  const url = `${API_BASE}/api/payments/${publicKey}?${params.toString()}`;
  const res = options.signal
    ? await fetch(url, { signal: options.signal })
    : await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Payments fetch failed");
  return { records: data.records || [], nextCursor: data.nextCursor ?? null };
}
