import * as StellarSdk from "@stellar/stellar-sdk";
import { getActiveNetwork } from "./network";

/**
 * Read how much life the Kitewell contract instance has left.
 *
 * Extend-TTL used to be offered without saying how many ledgers remain, so the
 * user could not tell an urgent extension from an idle one. These helpers only
 * read: nothing here extends anything, and the contract code TTL is a separate
 * entry that is not touched.
 */

export const ARCHIVED_INSTANCE_MESSAGE =
  "This instance is archived, so there is no TTL to show.";

/** The ledger key of a contract's instance entry (persistent contract data). */
export function contractInstanceLedgerKey(contractId) {
  return StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: StellarSdk.Address.fromString(contractId).toScAddress(),
      key: StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    })
  );
}

function toLedgerNumber(value) {
  // Number(null) is 0, which would turn a missing deadline into ledger 0.
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Turn the two ledger numbers into what the panel shows. An instance that is
 * not in the ledger has no deadline to report, so it says so instead of
 * pretending the TTL is zero.
 *
 * @returns {{ latestLedger: number|null, liveUntilLedgerSeq: number|null,
 *   ledgersRemaining: number|null, archived: boolean, message: string|null }}
 */
export function describeInstanceTtl({ latestLedger, liveUntilLedgerSeq } = {}) {
  const latest = toLedgerNumber(latestLedger);
  const deadline = toLedgerNumber(liveUntilLedgerSeq);

  if (latest === null || deadline === null) {
    return {
      latestLedger: latest,
      liveUntilLedgerSeq: null,
      ledgersRemaining: null,
      archived: true,
      message: ARCHIVED_INSTANCE_MESSAGE,
    };
  }

  return {
    latestLedger: latest,
    liveUntilLedgerSeq: deadline,
    ledgersRemaining: Math.max(0, deadline - latest),
    archived: false,
    message: null,
  };
}

/**
 * Read the instance TTL from the ledger. Only a read: no simulation, no
 * signing and no submission.
 *
 * @param {string} contractId Contract address (C…)
 * @param {{ server?: object }} [options] Injectable Soroban RPC server for tests
 */
export async function readContractInstanceTtl(contractId, { server } = {}) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const rpc = server ?? new StellarSdk.rpc.Server(getActiveNetwork().rpcUrl);
  const latest = await rpc.getLatestLedger();
  const response = await rpc.getLedgerEntries(
    contractInstanceLedgerKey(contractId)
  );

  const entry = (response?.entries || [])[0];
  return describeInstanceTtl({
    latestLedger: latest?.sequence ?? null,
    liveUntilLedgerSeq: entry?.liveUntilLedgerSeq ?? null,
  });
}
