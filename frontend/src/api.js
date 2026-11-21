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
  const params = networkParam(new URLSearchParams(), network);
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(`${API_BASE}/api/account/${publicKey}${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Account fetch failed");
  return data;
}

export async function fetchPaymentsViaApi(publicKey, limit = 15, cursor, network) {
  const params = networkParam(
    new URLSearchParams({ limit: String(limit) }),
    network
  );
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/api/payments/${publicKey}?${params.toString()}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Payments fetch failed");
  return { records: data.records || [], nextCursor: data.nextCursor ?? null };
}
