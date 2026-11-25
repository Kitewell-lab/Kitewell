/**
 * Claw back a claimable balance the connected account created as the asset
 * issuer.
 *
 * Horizon returns every claimable balance on the network, so the panel only
 * offers a balance the connected account created (`source_account`). Clawback
 * is offered only when that account is the asset issuer and the issuer has
 * `auth_clawback_enabled`. The transaction is a single
 * `clawbackClaimableBalance` operation for the balance id.
 */
import * as StellarSdk from "@stellar/stellar-sdk";

/** ClaimableBalanceId type 0 (CLAIMABLE_BALANCE_ID_TYPE_V0) as hex. */
const BALANCE_ID_TYPE_PREFIX = "00000000";
const BALANCE_ID_HASH_LENGTH = 64;
const BALANCE_ID_LENGTH = BALANCE_ID_TYPE_PREFIX.length + BALANCE_ID_HASH_LENGTH;

/**
 * Normalize a claimable balance id to the 72-character hex form the SDK's
 * `clawbackClaimableBalance` operation expects. Horizon includes the
 * `00000000` type prefix; a bare 64-hex hash is accepted too.
 *
 * @param {string} value
 * @returns {string} the prefixed, lowercase hex id
 */
export function normalizeClaimableBalanceId(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/^0x/i, "")
    .toLowerCase();

  if (!text) {
    throw new Error("Claimable balance id is required.");
  }
  if (!/^[0-9a-f]+$/.test(text)) {
    throw new Error("Claimable balance id must be hexadecimal.");
  }
  if (text.length === BALANCE_ID_HASH_LENGTH) {
    return `${BALANCE_ID_TYPE_PREFIX}${text}`;
  }
  if (text.length !== BALANCE_ID_LENGTH) {
    throw new Error(
      "Claimable balance id must be 64 hex characters, or 72 with the 00000000 type prefix."
    );
  }
  if (!text.startsWith(BALANCE_ID_TYPE_PREFIX)) {
    throw new Error("Only type-0 (00000000) claimable balance ids are supported.");
  }

  return text;
}

/** True when the record's asset is a credit asset issued by `account`. */
export function createdByIssuer(balance, account) {
  if (!balance || typeof balance !== "object") {
    throw new TypeError("balance must be an object");
  }
  if (typeof account !== "string" || !account.trim()) {
    throw new TypeError("account must be a public key");
  }

  const asset = balance.asset;
  if (typeof asset !== "string" || !asset.includes(":")) return false;

  const issuer = asset.slice(asset.indexOf(":") + 1);
  return issuer === account;
}

/**
 * Whether the connected account may claw back one claimable balance.
 *
 * @param {object} params
 * @param {object} params.balance a Horizon claimable balance record
 * @param {string} params.account the connected account
 * @param {{ authClawbackEnabled?: boolean, auth_clawback_enabled?: boolean }} [params.assetFlags]
 *   the issuer's account flags
 * @returns {boolean}
 */
export function canClawbackClaimableBalance({ balance, account, assetFlags } = {}) {
  if (!balance || typeof balance !== "object") {
    throw new TypeError("balance must be an object");
  }
  if (balance.claimed === true || balance.spent === true) return false;
  if (!createdByIssuer(balance, account)) return false;

  const clawbackEnabled =
    assetFlags?.authClawbackEnabled ?? assetFlags?.auth_clawback_enabled;

  return clawbackEnabled === true;
}

/**
 * Keep only the balances the connected account created; a balance someone
 * else created is never listed for clawback.
 *
 * @param {object[]} records
 * @param {string} account
 * @returns {object[]}
 */
export function listCreatedClaimableBalances(records, account) {
  if (!Array.isArray(records)) {
    throw new TypeError("records must be an array");
  }
  if (typeof account !== "string" || !account.trim()) {
    throw new TypeError("account must be a public key");
  }

  return records.filter((record) => {
    if (!record || typeof record !== "object") return false;
    return (record.source_account ?? record.creator) === account;
  });
}

/**
 * The rows the panel offers for clawback: created by the account, on an asset
 * it issues, with clawback enabled, and not already claimed.
 *
 * @param {object} params
 * @param {object[]} params.records claimable balance records
 * @param {string} params.account the connected account
 * @param {Record<string, object>} [params.assetFlagsByAsset] flags per
 *   `CODE:ISSUER` asset key
 * @returns {object[]}
 */
export function clawbackCandidates({ records, account, assetFlagsByAsset } = {}) {
  if (records == null) return [];

  return listCreatedClaimableBalances(records, account).filter((balance) =>
    canClawbackClaimableBalance({
      balance,
      account,
      assetFlags: assetFlagsByAsset?.[balance.asset],
    })
  );
}

/**
 * Build the `clawbackClaimableBalance` operation for one balance id.
 *
 * @param {string} balanceId Horizon id, with or without the type prefix
 * @returns {object} the SDK operation
 */
export function clawbackClaimableBalanceOperation(balanceId) {
  return StellarSdk.Operation.clawbackClaimableBalance({
    balanceId: normalizeClaimableBalanceId(balanceId),
  });
}

/**
 * Drop a balance from the unclaimed list after a clawback, so a refresh never
 * shows a balance that was already claimed.
 *
 * @param {object[]} records
 * @param {string} balanceId
 * @returns {object[]}
 */
export function withoutClaimedBalance(records, balanceId) {
  if (!Array.isArray(records)) {
    throw new TypeError("records must be an array");
  }

  const id = normalizeClaimableBalanceId(balanceId);

  return records.filter((record) => {
    try {
      return normalizeClaimableBalanceId(record?.id) !== id;
    } catch {
      // A record with no usable id cannot be the one just clawed back.
      return true;
    }
  });
}
