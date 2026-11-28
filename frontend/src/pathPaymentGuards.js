import * as StellarSdk from "@stellar/stellar-sdk";
import { getActiveNetwork } from "./network";
import { toStroops } from "./amountFormat";

/**
 * Pre-signing checks for the path payment form. They live in their own module so
 * they can be tested without the wallet or the rest of the lab.
 */

function defaultLoadAccount(publicKey) {
  return new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl).loadAccount(publicKey);
}

/**
 * Does `account` (a Horizon account record) hold a trustline for `asset`?
 * Native XLM never needs one. The destination asset is checked, not the one sent.
 *
 * @param {{balances?: object[]}} account
 * @param {{isNative?: boolean, code?: string, issuer?: string}} asset
 * @returns {"native"|"ok"|"no_trustline"}
 */
export function destinationTrustlineStatus(account, asset) {
  if (!asset || asset.isNative || asset.type === "native") return "native";
  const code = asset.code ?? asset.getCode?.();
  const issuer = asset.issuer ?? asset.getIssuer?.();
  const balances = Array.isArray(account?.balances) ? account.balances : [];
  const held = balances.some(
    (balance) =>
      balance.asset_code === code &&
      balance.asset_issuer === issuer &&
      balance.asset_type !== "native"
  );
  return held ? "ok" : "no_trustline";
}

/**
 * Before signing a path payment, load the destination and confirm it can hold the
 * destination asset. A destination Horizon does not know blocks signing too.
 *
 * @returns {Promise<{ok: boolean, status: string, message?: string}>}
 */
export async function checkPathPaymentDestination(
  destination,
  destAsset,
  loadAccount = defaultLoadAccount
) {
  if (!destAsset || destAsset.isNative) return { ok: true, status: "native" };

  let account;
  try {
    account = await loadAccount(destination);
  } catch (error) {
    const notFound = error?.response?.status === 404 || error?.name === "NotFoundError";
    if (notFound) {
      return {
        ok: false,
        status: "unknown",
        message: "The destination account is unknown to Horizon, so it cannot receive this asset.",
      };
    }
    throw error;
  }

  const status = destinationTrustlineStatus(account, destAsset);
  if (status === "no_trustline") {
    return {
      ok: false,
      status,
      message: `The destination has no trustline for ${destAsset.code}. The payment would fail after signing.`,
    };
  }
  return { ok: true, status };
}

/**
 * Strict receive asks for a maximum the user will send. A maximum below the
 * quote on screen cannot succeed, so it is refused before Freighter opens.
 * There is nothing to compare when no quote is on screen, and strict send is
 * never compared against this maximum.
 *
 * @param {{mode: string, sendMax: string, quotes?: {sourceAmount: string}[]}} input
 * @returns {{ok: boolean, message?: string}}
 */
export function validateStrictReceiveCap({ mode, sendMax, quotes } = {}) {
  if (mode !== "strictReceive") return { ok: true };
  const amounts = (quotes ?? [])
    .map((quote) => quote?.sourceAmount)
    .filter((amount) => typeof amount === "string" && amount !== "");
  if (!amounts.length) return { ok: true };

  const quoted = amounts.map((amount) => toStroops(amount)).reduce((a, b) => (a < b ? a : b));
  let cap;
  try {
    cap = toStroops(String(sendMax ?? ""));
  } catch {
    return { ok: true };
  }
  if (cap < quoted) {
    return {
      ok: false,
      message: `The maximum to send (${sendMax}) is below the quote on screen (${amounts.find((a) => toStroops(a) === quoted)}), so this payment cannot succeed.`,
    };
  }
  return { ok: true };
}
