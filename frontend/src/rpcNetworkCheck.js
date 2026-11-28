import * as StellarSdk from "@stellar/stellar-sdk";
import { getActiveNetwork } from "./network";

/**
 * The lab and the Soroban RPC can disagree about the network. A simulation then
 * fails at best, and signs for the wrong network at worst.
 *
 * These helpers compare the passphrase the RPC reports with the passphrase the
 * lab builds transactions for, and decide whether contract calls may run. They
 * only gate Soroban contract calls: classic Horizon payments are unaffected.
 */

export const RPC_PASSPHRASE_UNCHECKED =
  "The RPC did not report a network passphrase, so contract calls were disabled until the network can be checked.";

export const RPC_PASSPHRASE_MISMATCH =
  "The networks disagree, so contract calls were disabled.";

export const RPC_PASSPHRASE_MATCH =
  "The RPC and the lab agree on the network passphrase.";

/** Read the passphrase the Soroban RPC reports. `null` means it did not say. */
export async function readRpcPassphrase(
  rpcUrl = getActiveNetwork().rpcUrl,
  { server } = {}
) {
  const rpc = server ?? new StellarSdk.rpc.Server(rpcUrl);
  const network = await rpc.getNetwork();
  const passphrase = network?.passphrase;
  return typeof passphrase === "string" && passphrase.trim()
    ? passphrase.trim()
    : null;
}

/**
 * Compare the two passphrases without touching the network so the rule is
 * testable on its own.
 *
 * A missing RPC passphrase disables contract calls: the network could not be
 * checked, so a contract call would be a guess.
 *
 * @returns {{ status: "match"|"mismatch"|"unchecked", contractCallsAllowed: boolean, message: string }}
 */
export function compareNetworkPassphrases({
  labPassphrase,
  rpcPassphrase,
} = {}) {
  const reported =
    typeof rpcPassphrase === "string" ? rpcPassphrase.trim() : rpcPassphrase;

  if (!reported) {
    return {
      status: "unchecked",
      contractCallsAllowed: false,
      message: RPC_PASSPHRASE_UNCHECKED,
    };
  }

  if (!labPassphrase) {
    return {
      status: "unchecked",
      contractCallsAllowed: false,
      message:
        "The lab has no network passphrase configured, so contract calls were disabled.",
    };
  }

  if (reported !== labPassphrase) {
    return {
      status: "mismatch",
      contractCallsAllowed: false,
      message: `The RPC reports "${reported}" but the lab is set to "${labPassphrase}". ${RPC_PASSPHRASE_MISMATCH}`,
    };
  }

  return {
    status: "match",
    contractCallsAllowed: true,
    message: RPC_PASSPHRASE_MATCH,
  };
}

/**
 * Read the RPC passphrase and compare it with the lab's. An unreachable RPC is
 * reported as unchecked rather than as a mismatch, and disables contract calls.
 */
export async function checkRpcNetworkAgreement({
  rpcUrl = getActiveNetwork().rpcUrl,
  labPassphrase = getActiveNetwork().passphrase,
  server,
} = {}) {
  try {
    const rpcPassphrase = await readRpcPassphrase(rpcUrl, { server });
    return {
      ...compareNetworkPassphrases({ labPassphrase, rpcPassphrase }),
      labPassphrase: labPassphrase ?? null,
      rpcPassphrase,
      error: null,
    };
  } catch (error) {
    return {
      ...compareNetworkPassphrases({ labPassphrase, rpcPassphrase: null }),
      labPassphrase: labPassphrase ?? null,
      rpcPassphrase: null,
      error: error?.message || "The Soroban RPC could not be reached.",
    };
  }
}
