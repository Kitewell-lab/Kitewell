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

export async function fetchAccountViaApi(publicKey) {
  const res = await fetch(`${API_BASE}/api/account/${publicKey}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Account fetch failed");
  return data;
}

export async function fetchPaymentsViaApi(publicKey, limit = 15, cursor) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/api/payments/${publicKey}?${params.toString()}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Payments fetch failed");
  return { records: data.records || [], nextCursor: data.nextCursor ?? null };
}
