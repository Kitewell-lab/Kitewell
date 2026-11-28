import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { getActiveNetwork } from "./network";

/**
 * Sponsoring a brand new account is three operations that must land together:
 * begin sponsoring, create the account, end sponsoring. Building them
 * separately leaves a sponsorship open, so they always go in one transaction.
 *
 * The sponsored account must be the source of `endSponsoringFutureReserves`
 * (the protocol requires the sponsored account to sign it), so the new key
 * co-signs the envelope before the sponsor signs it in Freighter.
 */

/** The sponsor pays the base reserve, so the starting balance may be zero. */
export const MINIMUM_SPONSORED_STARTING_BALANCE = "0";

const STROOPS_PER_XLM = 10000000n;

function toStroops(text) {
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(fraction.padEnd(7, "0"));
}

/**
 * Validate the starting balance in stroops so "0.0000001" survives untouched.
 * Malformed and negative amounts are refused, and so is anything below the
 * configured minimum.
 *
 * @returns {string} the amount normalized to 7 decimal places
 */
export function normalizeSponsoredStartingBalance(
  value,
  { minimum = MINIMUM_SPONSORED_STARTING_BALANCE } = {}
) {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,7})?$/.test(text)) {
    throw new Error(
      "Starting balance must be a non-negative number with up to 7 decimals."
    );
  }

  const stroops = toStroops(text);
  const minimumStroops = toStroops(minimum);
  if (stroops < minimumStroops) {
    throw new Error(`Starting balance must be at least ${minimum} XLM.`);
  }

  const [whole, fraction = ""] = text.split(".");
  return `${whole}.${fraction.padEnd(7, "0")}`;
}

export function assertSponsoredAccountAddresses(sponsor, newAccount) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(sponsor)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(newAccount)) {
    throw new Error("New account must be a valid Stellar public key (G…).");
  }
  if (sponsor === newAccount) {
    throw new Error("Sponsoring the connected account itself is not allowed.");
  }
}

/**
 * The three operations the confirmation lists before Freighter opens, in the
 * order they are added to the transaction.
 */
export function describeSponsoredCreateAccountOperations({
  sponsor,
  newAccount,
  startingBalance = MINIMUM_SPONSORED_STARTING_BALANCE,
} = {}) {
  const amount = normalizeSponsoredStartingBalance(startingBalance);

  return [
    {
      step: 1,
      operation: "beginSponsoringFutureReserves",
      source: sponsor,
      detail: `Begin sponsoring ${newAccount}`,
    },
    {
      step: 2,
      operation: "createAccount",
      source: sponsor,
      detail: `Create ${newAccount} with ${amount} XLM`,
    },
    {
      step: 3,
      operation: "endSponsoringFutureReserves",
      source: newAccount,
      detail: "End sponsoring (signed by the new account)",
    },
  ];
}

/**
 * Build the one transaction with the three operations in order. Building never
 * signs and never submits.
 */
export function buildSponsoredCreateAccountTransaction({
  sponsor,
  newAccount,
  startingBalance = MINIMUM_SPONSORED_STARTING_BALANCE,
  sequence = "0",
  passphrase = getActiveNetwork().passphrase,
  timeout = 180,
} = {}) {
  assertSponsoredAccountAddresses(sponsor, newAccount);
  const amount = normalizeSponsoredStartingBalance(startingBalance);

  return new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(sponsor, sequence),
    { fee: StellarSdk.BASE_FEE, networkPassphrase: passphrase }
  )
    .addOperation(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: newAccount,
      })
    )
    .addOperation(
      StellarSdk.Operation.createAccount({
        destination: newAccount,
        startingBalance: amount,
      })
    )
    .addOperation(
      StellarSdk.Operation.endSponsoringFutureReserves({ source: newAccount })
    )
    .setTimeout(timeout)
    .build();
}

/**
 * The new account must not exist yet. Horizon answers 404 for an address that
 * was never funded; anything else means the account is already on the network
 * (or could not be checked, which is also a refusal).
 */
export async function assertSponsoredAccountIsNew(newAccount, { server } = {}) {
  const horizon = server ?? new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);

  try {
    await horizon.loadAccount(newAccount);
  } catch (error) {
    if (error?.response?.status === 404) return true;
    throw error;
  }

  throw new Error("That account already exists on this network.");
}

/** True when `publicKey` already signed `transaction`. */
function hasSignatureFrom(transaction, publicKey) {
  const hint = StellarSdk.Keypair.fromPublicKey(publicKey)
    .signatureHint()
    .toString("hex");
  return (transaction.signatures || []).some(
    (signature) => signature.hint().toString("hex") === hint
  );
}

/**
 * Build the unsigned sponsorship envelope for the new account to co-sign.
 * Nothing is signed or submitted here.
 *
 * @returns {Promise<{ xdr: string, hash: string, newAccount: string,
 *   startingBalance: string, operations: object[] }>}
 */
export async function createSponsoredAccountDraft(
  publicKey,
  { newAccount, startingBalance = MINIMUM_SPONSORED_STARTING_BALANCE } = {},
  { server } = {}
) {
  assertSponsoredAccountAddresses(publicKey, newAccount);
  const amount = normalizeSponsoredStartingBalance(startingBalance);

  const horizon =
    server ?? new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
  await assertSponsoredAccountIsNew(newAccount, { server: horizon });

  const sourceAccount = await horizon.loadAccount(publicKey);
  const transaction = buildSponsoredCreateAccountTransaction({
    sponsor: publicKey,
    newAccount,
    startingBalance: amount,
    sequence: sourceAccount.sequenceNumber(),
  });

  return {
    xdr: transaction.toXDR(),
    hash: transaction.hash().toString("hex"),
    newAccount,
    startingBalance: amount,
    operations: describeSponsoredCreateAccountOperations({
      sponsor: publicKey,
      newAccount,
      startingBalance: amount,
    }),
  };
}

/**
 * Submit the sponsorship once both signatures are present: the new account's
 * (collected as a co-signed envelope XDR) and the sponsor's (Freighter).
 *
 * A missing second signature is refused before anything is signed or sent, and
 * the co-signed envelope must match this exact sponsorship transaction.
 */
export async function sponsorAccountCreationWithFreighter(
  publicKey,
  { newAccount, startingBalance = MINIMUM_SPONSORED_STARTING_BALANCE, coSignedXdr } = {},
  { server, sign = signTransaction, passphrase = getActiveNetwork().passphrase } = {}
) {
  assertSponsoredAccountAddresses(publicKey, newAccount);
  const amount = normalizeSponsoredStartingBalance(startingBalance);

  if (!coSignedXdr) {
    throw new Error(
      "The new account must co-sign this transaction before it is submitted."
    );
  }

  const horizon =
    server ?? new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
  const sourceAccount = await horizon.loadAccount(publicKey);
  const expected = buildSponsoredCreateAccountTransaction({
    sponsor: publicKey,
    newAccount,
    startingBalance: amount,
    sequence: sourceAccount.sequenceNumber(),
    passphrase,
  });

  const coSigned = StellarSdk.TransactionBuilder.fromXDR(
    coSignedXdr,
    passphrase
  );

  if (coSigned.hash().toString("hex") !== expected.hash().toString("hex")) {
    throw new Error(
      "The co-signed envelope does not match this sponsorship transaction."
    );
  }
  if (!hasSignatureFrom(coSigned, newAccount)) {
    throw new Error(
      "The co-signed envelope is missing the new account's signature."
    );
  }

  const signResult = await sign(coSignedXdr, {
    networkPassphrase: passphrase,
    address: publicKey,
  });
  if (signResult?.error || !signResult?.signedTxXdr) {
    throw new Error(
      signResult?.error?.message || "Signing was rejected in Freighter."
    );
  }

  const signed = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    passphrase
  );
  const result = await horizon.submitTransaction(signed);

  return {
    hash: result.hash,
    newAccount,
    sponsor: publicKey,
    startingBalance: amount,
    confirmed: result.successful !== false,
  };
}
