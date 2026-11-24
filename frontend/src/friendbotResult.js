import { getActiveNetwork } from "./network";

function explorerTxUrl(hash) {
  const network = getActiveNetwork();
  return network.explorerBase
    ? `${network.explorerBase}/tx/${hash}`
    : `${network.horizonUrl}/transactions/${hash}`;
}

const TX_HASH = /^[0-9a-fA-F]{64}$/;

/**
 * Describe a successful Friendbot response for the UI.
 *
 * Friendbot answers with the funding transaction. The hash is shown (and linked
 * to the explorer of the selected network) when it was returned; otherwise the
 * message says the account may be funded but no hash came back. The hash is only
 * displayed: it is not one of the lab's own submissions.
 *
 * @param {object} [result] Parsed Friendbot JSON.
 * @returns {{ hash: string|null, explorerUrl: string|null, message: string }}
 */
export function describeFriendbotResult(result) {
  const candidates = [result?.hash, result?.successful_transaction_hash, result?.id];
  const hash = candidates.find((value) => typeof value === "string" && TX_HASH.test(value)) ?? null;
  if (!hash) {
    return {
      hash: null,
      explorerUrl: null,
      message:
        "Friendbot responded, so the account may be funded, but it did not return a transaction hash.",
    };
  }
  return {
    hash,
    explorerUrl: explorerTxUrl(hash),
    message: "Funded with Testnet XLM via Friendbot.",
  };
}
