/**
 * Remember only the two send fields worth reusing: destination and asset.
 * Amount and memo are deliberately never stored. Storage failures are ignored
 * so a browser that blocks localStorage still gets a working send form.
 */

export const SEND_FORM_MEMORY_STORAGE_KEY = "kitewell.lastSend";

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readMemory() {
  try {
    const raw = storage()?.getItem(SEND_FORM_MEMORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeMemory({ destination, assetKey }) {
  try {
    const stored = { destination };
    if (assetKey) stored.assetKey = assetKey;
    storage()?.setItem(SEND_FORM_MEMORY_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Nothing to do: the form still works without persistence.
  }
}

function isHeld(assetKey, balances) {
  if (assetKey === "native") return true;
  return Array.isArray(balances) && balances.some((balance) => balance.key === assetKey);
}

/**
 * Restore the last destination and asset. When balances are supplied, an asset
 * the account no longer holds is left blank and its stored value is dropped;
 * the remembered destination is kept.
 */
export function readStoredSendForm(balances = null) {
  const stored = readMemory();
  if (!stored) return { destination: "", assetKey: "native" };

  const destination = typeof stored.destination === "string" ? stored.destination : "";
  const assetKey =
    typeof stored.assetKey === "string" && stored.assetKey
      ? stored.assetKey
      : "native";

  if (!isHeld(assetKey, balances)) {
    writeMemory({ destination });
    return { destination, assetKey: "" };
  }
  return { destination, assetKey };
}

/** Store the two reusable fields after a successful payment. */
export function saveSendFormMemory({ destination, assetKey }, balances = null) {
  const normalizedDestination = typeof destination === "string" ? destination : "";
  const normalizedAsset = typeof assetKey === "string" && assetKey ? assetKey : "native";
  writeMemory({
    destination: normalizedDestination,
    assetKey: isHeld(normalizedAsset, balances) ? normalizedAsset : "",
  });
}

export function clearSendFormMemory() {
  try {
    storage()?.removeItem(SEND_FORM_MEMORY_STORAGE_KEY);
  } catch {
    // The visible form is cleared by the caller even if storage is blocked.
  }
}
