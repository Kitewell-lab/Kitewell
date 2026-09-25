import * as StellarSdk from "@stellar/stellar-sdk";

/**
 * Single source of truth for the selectable Stellar networks.
 *
 * Every Horizon URL, network passphrase, explorer base and Friendbot URL lives
 * here so switching networks never requires touching transaction code.
 */
export const NETWORKS = {
  TESTNET: {
    id: "TESTNET",
    label: "Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: StellarSdk.Networks.TESTNET,
    explorerBase: "https://stellar.expert/explorer/testnet",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  FUTURENET: {
    id: "FUTURENET",
    label: "Futurenet",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    passphrase: StellarSdk.Networks.FUTURENET,
    explorerBase: "https://stellar.expert/explorer/futurenet",
    friendbotUrl: null,
  },
};

export const DEFAULT_NETWORK_ID = "TESTNET";
export const NETWORK_STORAGE_KEY = "kitewell.network";

function readStoredNetworkId() {
  try {
    const stored = globalThis.localStorage?.getItem(NETWORK_STORAGE_KEY);
    return stored && NETWORKS[stored] ? stored : DEFAULT_NETWORK_ID;
  } catch {
    return DEFAULT_NETWORK_ID;
  }
}

let activeNetworkId = readStoredNetworkId();

export function getActiveNetworkId() {
  return activeNetworkId;
}

export function getActiveNetwork() {
  return NETWORKS[activeNetworkId];
}

export function isSupportedNetwork(id) {
  return Boolean(NETWORKS[id]);
}

/** Switch the active network and persist the preference (best-effort). */
export function setActiveNetwork(id) {
  if (!isSupportedNetwork(id)) {
    throw new Error(`Unsupported network: ${id}`);
  }

  activeNetworkId = id;
  try {
    globalThis.localStorage?.setItem(NETWORK_STORAGE_KEY, id);
  } catch {
    /* persistence is optional; the in-memory switch still applies */
  }

  return NETWORKS[id];
}

export function isFriendbotAvailable() {
  return Boolean(getActiveNetwork().friendbotUrl);
}
