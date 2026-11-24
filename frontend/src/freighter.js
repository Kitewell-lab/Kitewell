import {
  isConnected,
  setAllowed,
  getAddress,
  getNetwork,
  signTransaction,
  signAuthEntry,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { findNetworkByPassphrase, getActiveNetwork } from "./network";
import {
  buildAsset,
  parsePathAssets,
  buildSetOptionsBody,
  MAX_ASSET_CODE_LENGTH,
} from "./stellar";
import { parseHorizonError } from "./horizonErrorParse";
import { parseSimulationFees } from "./simulationFees";
import {
  HORIZON_FAILURE_CODE,
  freighterCancelledError,
  horizonFailureError,
} from "./submitFailure";

export {
  FREIGHTER_CANCELLED_CODE,
  HORIZON_FAILURE_CODE,
  CANCELLED_RESULT,
  submitFailureResult,
} from "./submitFailure";

function getServer() {
  return new StellarSdk.Horizon.Server(getActiveNetwork().horizonUrl);
}

function currentPassphrase() {
  return getActiveNetwork().passphrase;
}

const MAX_MEMO_TEXT_BYTES = 28;
const MAX_U64 = 18446744073709551615n;

/** Public Stellar RPC endpoint for Soroban reads + invokes (Testnet). */
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const sorobanRpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

/** Read-only invokes need a funded-looking source; the zero address works. */
const ZERO_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scOptionToNative(scVal) {
  if (!scVal) return null;
  const native = StellarSdk.scValToNative(scVal);
  // Option<T> arrives as an empty vec (None) or a one-element vec (Some).
  return Array.isArray(native) ? (native.length > 0 ? native[0] : null) : native;
}

function buildContractTx(contract, method, args, sourceAccount, timeout = 60) {
  return new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(timeout)
    .build();
}

/**
 * Read-only lookups against the Kitewell registry via Soroban RPC.
 * Calls lab_name(), builder_count(), and get_builder(viewer).
 *
 * @returns {{ labName: string, builderCount: number, builder: string|null }}
 */
export async function readKitewellState(contractId, viewerAddress) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const viewer = viewerAddress || ZERO_ADDRESS;
  const source = new StellarSdk.Account(ZERO_ADDRESS, "0");

  const simulate = async (method, ...args) => {
    const tx = buildContractTx(contract, method, args, source, 30);
    const sim = await sorobanRpc.simulateTransaction(tx);
    if (sim.error) {
      throw new Error(`${method}() simulation failed: ${sim.error}`);
    }
    return sim.result?.retval ?? null;
  };

  const [labName, builderCount, builder] = await Promise.all([
    simulate("lab_name").then((v) => (v ? StellarSdk.scValToNative(v) : null)),
    simulate("builder_count").then((v) =>
      v ? StellarSdk.scValToNative(v) : 0
    ),
    simulate("get_builder", StellarSdk.nativeToScVal(viewer, { type: "address" })).then(
      scOptionToNative
    ),
  ]);

  return { labName, builderCount, builder };
}

/**
 * Simulate the builder registration without signing or submitting it, so the
 * panel can show the inclusion fee and the resource fee separately.
 *
 * @returns {Promise<{
 *   error: string|null,
 *   inclusionFee: string|null,
 *   resourceFee: string|null,
 *   totalFee: string|null,
 * }>} Fees in stroops.
 */
export async function simulateRegisterBuilder(publicKey, contractId, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Enter a builder name to register.");
  }
  if ([...trimmed].length > 64) {
    throw new Error("Builder name must be 64 characters or fewer.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = buildContractTx(
    contract,
    "register",
    [
      StellarSdk.nativeToScVal(publicKey, { type: "address" }),
      StellarSdk.nativeToScVal(trimmed, { type: "string" }),
    ],
    sourceAccount
  );

  // Simulation only: the user still has to press Sign to submit.
  const simulation = await sorobanRpc.simulateTransaction(transaction);
  return parseSimulationFees(simulation, transaction.fee);
}

/**
 * Check in a builder: builds + simulates a Soroban `register(caller, name)`
 * invoke, lets Freighter sign it, then submits via Soroban RPC and waits for
 * on-chain confirmation.
 *
 * @returns {{ hash: string, returnValue: unknown, confirmed: boolean }}
 */
export async function registerBuilderWithFreighter(
  publicKey,
  contractId,
  name
) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Enter a builder name to register.");
  }
  if ([...trimmed].length > 64) {
    throw new Error("Builder name must be 64 characters or fewer.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = buildContractTx(
    contract,
    "register",
    [
      StellarSdk.nativeToScVal(publicKey, { type: "address" }),
      StellarSdk.nativeToScVal(trimmed, { type: "string" }),
    ],
    sourceAccount
  );

  // Simulation fills in auth entries + resource fees for the invoke.
  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Contract invoke rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  // RPC submission is asynchronous: poll getTransaction until applied.
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return {
        hash: sendResult.hash,
        returnValue: status.returnValue
          ? StellarSdk.scValToNative(status.returnValue)
          : null,
        confirmed: true,
      };
    }
    if (status.status === "FAILED") {
      throw new Error(
        `Contract invoke failed on-chain. Tx hash: ${sendResult.hash}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // Still pending after the polling window; the tx may land shortly.
  return { hash: sendResult.hash, returnValue: null, confirmed: false };
}

function createMemo(memoType, value) {
  if (!value) return null;

  if (memoType === "text") {
    if (new TextEncoder().encode(value).length > MAX_MEMO_TEXT_BYTES) {
      throw new Error("Text memos must be 28 UTF-8 bytes or fewer.");
    }
    return StellarSdk.Memo.text(value);
  }

  if (memoType === "id") {
    if (!/^\d{1,20}$/.test(value) || BigInt(value) > MAX_U64) {
      throw new Error("ID memos must be unsigned 64-bit integers.");
    }
    return StellarSdk.Memo.id(value);
  }

  if (memoType === "hash") {
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
      throw new Error("Hash memos must be exactly 64 hexadecimal characters.");
    }
    return StellarSdk.Memo.hash(value);
  }

  throw new Error(`Unsupported memo type: ${memoType}`);
}

export async function checkFreighterInstalled() {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectFreighterWallet() {
  const installed = await isConnected();
  if (!installed.isConnected) {
    throw new Error(
      "Freighter is not installed. Get it from freighter.app, set Testnet, then refresh."
    );
  }

  const permission = await setAllowed();
  if (!permission.isAllowed) {
    throw new Error("Connection denied. Allow Kitewell in Freighter to continue.");
  }

  const addressResult = await getAddress();
  if (addressResult.error || !addressResult.address) {
    throw new Error(
      addressResult.error?.message || "Could not read the address from Freighter."
    );
  }

  return addressResult.address;
}

/**
 * Block signing when Freighter's network does not match the lab selection.
 * Checked on every sign attempt so switching either side clears the block
 * without a reload.
 */
export async function assertFreighterNetworkMatches() {
  const lab = getActiveNetwork();
  const freighter = await getNetwork();

  if (freighter?.error) {
    throw new Error(
      freighter.error.message || "Could not read the network from Freighter."
    );
  }

  const freighterPassphrase = freighter?.networkPassphrase;
  if (!freighterPassphrase || freighterPassphrase === lab.passphrase) {
    return;
  }

  const freighterLabel =
    findNetworkByPassphrase(freighterPassphrase)?.label ||
    freighter.network ||
    "unknown";

  throw new Error(
    `Freighter is on ${freighterLabel} but the lab is on ${lab.label}. Switch either side to match before signing.`
  );
}

/**
 * Sign a SEP-10 web-auth challenge in Freighter and return the signed XDR.
 *
 * This is the `sign(unsignedXdr)` callback `sep10WebAuth.js` asks for, so the
 * module never touches the extension and the key never leaves it either. The
 * challenge is an auth entry rather than a transaction to submit, which is why
 * it goes through `signAuthEntry` instead of {@link signWithFreighter}. It
 * clears the same network guard first, so a challenge is never signed on a
 * network the anchor did not issue it on.
 */
export async function signChallengeWithFreighter(unsignedXdr, publicKey) {
  await assertFreighterNetworkMatches();

  const signResult = await signAuthEntry(unsignedXdr, {
    networkPassphrase: currentPassphrase(),
    address: publicKey,
  });

  if (signResult.error || !signResult.signedAuthEntry) {
    throw new Error(
      signResult.error?.message || "Challenge signing was rejected in Freighter."
    );
  }

  return signResult.signedAuthEntry;
}

/** Ask Freighter to sign raw XDR and return the parsed signed transaction. */
async function signWithFreighter(unsignedXdr, publicKey) {
  await assertFreighterNetworkMatches();

  const passphrase = currentPassphrase();
  const signResult = await signTransaction(unsignedXdr, {
    networkPassphrase: passphrase,
    address: publicKey,
  });

  if (signResult.error || !signResult.signedTxXdr) {
    // Tag as cancelled so the failed-submit list does not treat this as Horizon.
    throw freighterCancelledError(
      signResult.error?.message || "Transaction signing was rejected in Freighter."
    );
  }

  return StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    passphrase
  );
}

async function signAndSubmit(transaction, publicKey) {
  const signedTx = await signWithFreighter(transaction.toXDR(), publicKey);
  try {
    return await getServer().submitTransaction(signedTx);
  } catch (error) {
    const body = error?.response?.data;
    if (body && typeof body === "object") {
      try {
        const { reason } = parseHorizonError(body);
        throw horizonFailureError(reason, error);
      } catch (maybeWrapped) {
        if (maybeWrapped?.code === HORIZON_FAILURE_CODE) throw maybeWrapped;
      }
    }
    throw error;
  }
}

/**
 * Validate a Stellar amount string (positive, max 7 decimal places) without
 * going through floating point, so values like 0.0000001 stay intact.
 */
export function normalizeAmount(value, label = "Amount") {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,7})?$/.test(text)) {
    throw new Error(`${label} must be a positive number with up to 7 decimals.`);
  }

  const [whole, fraction = ""] = text.split(".");
  if (!/[1-9]/.test(whole) && !/[1-9]/.test(fraction)) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return text;
}

/**
 * Resolve a UI payment asset descriptor into an SDK Asset.
 * `null` / `{ isNative: true }` is native XLM; a credit asset is
 * `{ isNative: false, code, issuer }`.
 */
export function resolvePaymentAsset(asset) {
  if (!asset || asset.isNative) return StellarSdk.Asset.native();

  const code = (asset.code || "").trim().toUpperCase();
  if (!code || code.length > 12) {
    throw new Error("Asset code must be 1–12 characters.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(asset.issuer)) {
    throw new Error("Asset issuer must be a valid Stellar public key (G…).");
  }

  return new StellarSdk.Asset(code, asset.issuer);
}

/**
 * Build an unsigned transaction envelope from an operation list.
 *
 * Nothing is signed or submitted: the returned base64 XDR can be shown to the
 * user, copied, or handed to another signer/decoder. Building with an empty
 * operation list is rejected, so there is never an empty envelope to copy.
 *
 * @param {string} publicKey source account (must be a valid Stellar key)
 * @param {StellarSdk.xdr.Operation[]} operations one or more operations
 * @param {{ memo?: StellarSdk.Memo|null, timeout?: number }} [options]
 * @returns {Promise<string>} base64-encoded transaction envelope XDR
 */
export async function buildUnsignedEnvelope(
  publicKey,
  operations,
  { memo = null, timeout = 180 } = {}
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("Add at least one operation before building an envelope.");
  }

  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  });

  operations.forEach((operation) => txBuilder.addOperation(operation));
  if (memo) txBuilder.addMemo(memo);

  return txBuilder.setTimeout(timeout).build().toXDR();
}

/**
 * Build the unsigned payment envelope without signing or submitting it.
 * `asset` accepts a UI descriptor (`{ isNative: true }` or
 * `{ isNative: false, code, issuer }`); omit it to send native XLM.
 *
 * @returns {Promise<string>} base64-encoded transaction envelope XDR
 */
export async function buildPaymentEnvelope(
  publicKey,
  destination,
  amount,
  asset = null,
  memoType = "text",
  memo = ""
) {
  const isAccountAddress =
    StellarSdk.StrKey.isValidEd25519PublicKey(destination) ||
    StellarSdk.StrKey.isValidMed25519PublicKey(destination);
  if (!isAccountAddress) {
    throw new Error(
      "Destination must be a valid Stellar public key (G…). A muxed address (M…) is also accepted."
    );
  }

  return buildUnsignedEnvelope(
    publicKey,
    [
      StellarSdk.Operation.payment({
        destination,
        asset: resolvePaymentAsset(asset),
        amount: amount.toString(),
      }),
    ],
    { memo: createMemo(memoType, memo) }
  );
}

/**
 * Sign an already-built unsigned envelope with Freighter and submit it.
 * Taking the XDR string keeps the signed payload identical to the one the user
 * previewed/copied.
 */
export async function submitEnvelopeWithFreighter(unsignedXdr, publicKey) {
  if (!unsignedXdr) {
    throw new Error("No unsigned envelope to sign.");
  }

  const signedTx = await signWithFreighter(unsignedXdr, publicKey);
  return getServer().submitTransaction(signedTx);
}

/**
 * Build a payment op, sign it with Freighter, and submit it to Horizon.
 * `asset` accepts a UI descriptor (`{ isNative: true }` or
 * `{ isNative: false, code, issuer }`); omit it to send native XLM.
 */
export async function sendPaymentWithFreighter(
  publicKey,
  destination,
  amount,
  asset = null,
  memoType = "text",
  memo = ""
) {
  const unsignedXdr = await buildPaymentEnvelope(
    publicKey,
    destination,
    amount,
    asset,
    memoType,
    memo
  );
  return submitEnvelopeWithFreighter(unsignedXdr, publicKey);
}

/**
 * Build a path payment (strict send or strict receive), sign it with Freighter,
 * and submit it to Horizon Testnet.
 *
 * `sendAsset` / `destAsset` are UI descriptors ({ isNative } or
 * { isNative: false, code, issuer }). `path` is the optional comma-separated
 * intermediate hop list (e.g. "USDC:G…, XLM").
 *
 * Strict send fixes the amount sent (`amount`) and the minimum received
 * (`destMin`). Strict receive fixes the amount received (`amount`) and the
 * maximum sent (`sendMax`).
 */
export async function pathPaymentWithFreighter({
  publicKey,
  destination,
  mode = "strictSend",
  sendAsset,
  destAsset,
  amount,
  destMin,
  sendMax,
  path = "",
} = {}) {
  if (mode !== "strictSend" && mode !== "strictReceive") {
    throw new Error(`Unsupported path payment mode: ${mode}`);
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }

  const isStrictReceive = mode === "strictReceive";
  const sourceAsset = buildAsset(sendAsset);
  const destinationAsset = buildAsset(destAsset);
  const intermediatePath = parsePathAssets(path);

  const amountValue = normalizeAmount(
    amount,
    isStrictReceive ? "Amount to receive" : "Amount to send"
  );
  const boundValue = normalizeAmount(
    isStrictReceive ? sendMax : destMin,
    isStrictReceive ? "Maximum to send" : "Minimum received"
  );

  const operation = isStrictReceive
    ? StellarSdk.Operation.pathPaymentStrictReceive({
        sendAsset: sourceAsset,
        sendMax: boundValue,
        destination,
        destAsset: destinationAsset,
        destAmount: amountValue,
        path: intermediatePath,
      })
    : StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: sourceAsset,
        sendAmount: amountValue,
        destination,
        destAsset: destinationAsset,
        destMin: boundValue,
        path: intermediatePath,
      });

  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/** Reprice one open offer, keeping its offer id and remaining selling amount. */
export async function changeOfferPriceWithFreighter(publicKey, offer, newPrice) {
  if (!offer || !/^[1-9]\d*$/.test(String(offer.id))) {
    throw new Error("Select an open offer to reprice.");
  }
  const price = String(newPrice ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(price) || !/[1-9]/.test(price)) {
    throw new Error("New price must be greater than zero.");
  }

  // A partial fill may have changed the remaining amount since the list loaded.
  const currentOffer = await getServer().offers().offer(String(offer.id)).call();
  if (currentOffer.seller !== publicKey) {
    throw new Error("This offer is no longer open for the connected account.");
  }

  const selling = buildAsset({
    isNative: currentOffer.selling.asset_type === "native",
    code: currentOffer.selling.asset_code,
    issuer: currentOffer.selling.asset_issuer,
  });
  const buying = buildAsset({
    isNative: currentOffer.buying.asset_type === "native",
    code: currentOffer.buying.asset_code,
    issuer: currentOffer.buying.asset_issuer,
  });
  const amount = normalizeAmount(currentOffer.amount, "Remaining offer amount");
  const operation = StellarSdk.Operation.manageSellOffer({
    selling,
    buying,
    amount,
    price,
    offerId: String(offer.id),
  });

  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  const result = await signAndSubmit(transaction, publicKey);
  return { ...result, oldPrice: currentOffer.price };
}

/**
 * Establish or raise a trustline for a credit asset on Testnet.
 * limit "0" removes the trustline (when balance is zero).
 */
export async function changeTrustWithFreighter(
  publicKey,
  assetCode,
  assetIssuer,
  limit = "1000000"
) {
  if (!assetCode || assetCode.length > 12) {
    throw new Error("Asset code must be 1–12 characters.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
    throw new Error("Issuer must be a valid Stellar public key (G…).");
  }

  const asset = new StellarSdk.Asset(assetCode.toUpperCase(), assetIssuer);
  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset,
        limit: limit.toString(),
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/** Revoke this account's sponsorship of one of its sponsored trustlines. */
export async function revokeTrustlineSponsorshipWithFreighter(
  publicKey,
  assetCode,
  assetIssuer
) {
  if (!assetCode || assetCode.length > 12) {
    throw new Error("Asset code must be 1–12 characters.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
    throw new Error("Issuer must be a valid Stellar public key (G…).");
  }

  const asset = new StellarSdk.Asset(assetCode.toUpperCase(), assetIssuer);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.revokeTrustlineSponsorship({
        account: publicKey,
        asset,
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/**
 * Update an issuer's home domain and/or auth flags with `setOptions`, signed by
 * the connected account. Validation (including the immutable confirmation
 * gate) lives in `buildSetOptionsBody`, so an unsafe combination never reaches
 * Freighter.
 */
export async function setAccountOptionsWithFreighter(publicKey, options = {}) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  const body = buildSetOptionsBody(options);
  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(StellarSdk.Operation.setOptions(body))
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/**
 * Authorize or revoke one holder's trustline with `allowTrust`.
 *
 * The asset issuer is the source account of an allowTrust op, so the connected
 * account must match `assetIssuer`; otherwise we would be trying to control an
 * asset somebody else issued.
 */
export async function allowTrustWithFreighter(
  publicKey,
  { holder, assetCode, assetIssuer, authorize } = {}
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (assetIssuer !== publicKey) {
    throw new Error("Only the issuer can authorize or revoke this asset.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(holder)) {
    throw new Error("Holder must be a valid Stellar public key (G…).");
  }

  const code = (assetCode || "").trim().toUpperCase();
  if (!code || code.length > MAX_ASSET_CODE_LENGTH) {
    throw new Error(`Asset code must be 1–${MAX_ASSET_CODE_LENGTH} characters.`);
  }

  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.allowTrust({
        trustor: holder,
        assetCode: code,
        authorize: Boolean(authorize),
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/**
 * Read the configured contract instance's TTL from Soroban RPC.
 *
 * @returns {{ latestLedger: number, liveUntilLedgerSeq: number|null,
 *   ledgersRemaining: number }}
 */
export async function readContractInstanceTtl(contractId) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error("Contract ID must be a valid Soroban contract strkey (C…).");
  }

  const contract = new StellarSdk.Contract(contractId);
  const response = await sorobanRpc.getLedgerEntries(contract.getFootprint());
  const latestLedger = response.latestLedger ?? 0;
  const liveUntilLedgerSeq = response.entries?.[0]?.liveUntilLedgerSeq ?? null;

  return {
    latestLedger,
    liveUntilLedgerSeq,
    ledgersRemaining: liveUntilLedgerSeq
      ? Math.max(0, liveUntilLedgerSeq - latestLedger)
      : 0,
  };
}

/**
 * Submit an `extendFootprintTtl` operation for the contract instance. This
 * never invokes register / pause / unregister — it only lengthens the
 * instance's ledger lifetime.
 *
 * `extendFootprintTtl` takes a ledger *count* from the current ledger, not an
 * absolute sequence number, so the absolute target is converted with the
 * latest ledger before building the op.
 *
 * `options.currentDeadline` / `options.latestLedger` let callers reuse the TTL
 * they already read; anything missing is read from Soroban RPC so the local
 * guards always hold.
 */
export async function extendContractTtlWithFreighter(
  publicKey,
  contractId,
  extendTo,
  options = {}
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error("Contract ID must be a valid Soroban contract strkey (C…).");
  }

  const target = Number(extendTo);
  if (!Number.isSafeInteger(target) || target <= 0) {
    throw new Error("Extend to a valid positive ledger number.");
  }

  let ttlInfo = null;
  const currentDeadline =
    options.currentDeadline ??
    (ttlInfo = await readContractInstanceTtl(contractId)).liveUntilLedgerSeq ??
    0;
  if (target <= currentDeadline) {
    throw new Error(
      `New deadline must be later than the current one (${currentDeadline}).`
    );
  }

  let latestLedger = options.latestLedger;
  if (latestLedger === undefined || latestLedger === null) {
    if (!ttlInfo) ttlInfo = await readContractInstanceTtl(contractId);
    latestLedger = ttlInfo.latestLedger;
  }

  const extendBy = target - latestLedger;
  if (!Number.isSafeInteger(extendBy) || extendBy <= 0) {
    throw new Error(
      `New deadline must be later than the latest ledger (${latestLedger}).`
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const sorobanData = new StellarSdk.SorobanDataBuilder()
    .setFootprint([contract.getFootprint()], [])
    .setResourceFee("100")
    .build();

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
    sorobanData,
  })
    .addOperation(
      StellarSdk.Operation.extendFootprintTtl({ extendTo: extendBy })
    )
    .setTimeout(180)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `TTL extension rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return {
        hash: sendResult.hash,
        liveUntilLedgerSeq: target,
        confirmed: true,
      };
    }
    if (status.status === "FAILED") {
      throw new Error(
        `TTL extension failed on-chain. Tx hash: ${sendResult.hash}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  return {
    hash: sendResult.hash,
    liveUntilLedgerSeq: target,
    confirmed: false,
  };
}

/** Accept either a real RPC ScVal or an already-native fixture value. */
function nativeOrValue(value) {
  if (value && typeof value === "object" && typeof value.switch === "function") {
    try {
      return StellarSdk.scValToNative(value);
    } catch {
      return value;
    }
  }
  return value;
}

function eventContractId(event) {
  const id = event?.contractId;
  if (!id) return null;
  if (typeof id === "string") return id;
  if (typeof id.contractId === "function") return id.contractId();
  if (typeof id.toString === "function") return id.toString();
  return String(id);
}

function rawTopic(value) {
  const native = nativeOrValue(value);
  if (native === null || ["string", "number", "boolean", "bigint"].includes(typeof native)) {
    return String(native);
  }
  return typeof value?.toXDR === "function" ? value.toXDR("base64") : String(native);
}

/**
 * Decode the Kitewell event topics and data for the Lab. Unrecognized or
 * malformed events retain their topics so they can still be inspected.
 */
export function mapKitewellEvents(rawEvents = [], contractId) {
  return (rawEvents || [])
    .filter((event) => !contractId || eventContractId(event) === contractId)
    .map((event) => {
      const topic = event.topic || [];
      const kind = topic[0] ? nativeOrValue(topic[0]) : null;
      const value = event.value != null ? nativeOrValue(event.value) : null;
      const common = {
        id: event.id ?? `${event.ledger ?? event.ledgerSeq ?? 0}-${kind}`,
        ledger: event.ledger ?? event.ledgerSeq ?? null,
      };

      const caller = topic[1] ? nativeOrValue(topic[1]) : null;
      const addressTopic = typeof topic[1]?.switch !== "function" ||
        topic[1].switch() === StellarSdk.xdr.ScValType.scvAddress();
      const validCaller = typeof caller === "string" && (
        StellarSdk.StrKey.isValidEd25519PublicKey(caller) ||
        StellarSdk.StrKey.isValidContract(caller)
      );
      if (kind === "register" && addressTopic && validCaller && Array.isArray(value) &&
          typeof value[0] === "string" && typeof value[1] === "boolean") {
        const [name, isNew] = value;
        return {
          ...common,
          type: "register",
          functionName: "register",
          caller,
          name: name ?? null,
          isNew: Boolean(isNew),
        };
      }
      if (kind === "paused" && typeof value === "boolean") {
        return { ...common, type: "paused", functionName: "set_paused", paused: value };
      }
      return { ...common, type: "unknown", functionName: null, topics: topic.map(rawTopic) };
    });
}

/**
 * Fetch a page of events for the configured contract. With no cursor the tail
 * starts at `startLedger` (the ledger open at tab-open time), so the full
 * history is never downloaded.
 */
export async function readKitewellEvents(contractId, options = {}) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error("Contract ID must be a valid Soroban contract strkey (C…).");
  }

  const { cursor, startLedger, limit = 100 } = options;
  const request = {
    limit,
    filters: [{ type: "contract", contractIds: [contractId] }],
  };
  if (cursor) request.cursor = cursor;
  else if (startLedger) request.startLedger = startLedger;
  else {
    // First open: begin at the latest ledger rather than replaying history.
    const latest = await sorobanRpc.getLatestLedger();
    request.startLedger = latest.sequence;
  }

  const response = await sorobanRpc.getEvents(request);

  return {
    events: mapKitewellEvents(response.events || [], contractId),
    cursor: response.cursor ?? null,
    latestLedger: response.latestLedger ?? null,
  };
}


function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Read the TTL for a contract instance and its Wasm code from the ledger.
 *
 * @param {string} contractId Contract address (C…)
 * @returns {Promise<{ instanceTTL: number|null, codeTTL: number|null, wasmHash: string|null, currentLedger: number }>}
 */
export async function readContractTTL(contractId) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error("Contract ID must be a valid Soroban contract strkey (C…).");
  }

  const contractKey = StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: StellarSdk.Address.fromString(contractId).toScAddress(),
      key: StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    })
  );

  const ledgerResponse = await sorobanRpc.getLatestLedger();
  const currentLedger = ledgerResponse.sequence;

  let instanceTTL = null;
  let codeTTL = null;
  let wasmHash = null;

  try {
    const entryResponse = await sorobanRpc.getLedgerEntries(contractKey);
    if (entryResponse.entries && entryResponse.entries.length > 0) {
      const entry = entryResponse.entries[0];
      instanceTTL = entry.liveUntilLedgerSeq || null;

      if (entry.val) {
        const ledgerEntryData = StellarSdk.xdr.LedgerEntryData.fromXDR(entry.val, "base64");
        if (ledgerEntryData.switch() === StellarSdk.xdr.LedgerEntryType.contractData()) {
          const contractData = ledgerEntryData.contractData();
          const val = contractData.val();
          if (val.switch() === StellarSdk.xdr.ScValType.scvContractInstance()) {
            const instance = val.instance();
            const executable = instance.executable();
            if (executable.switch() === StellarSdk.xdr.ContractExecutableType.contractExecutableWasm()) {
              wasmHash = executable.wasmHash().toString("hex");

              const codeKey = StellarSdk.xdr.LedgerKey.contractCode(
                new StellarSdk.xdr.LedgerKeyContractCode({
                  hash: executable.wasmHash(),
                })
              );

              const codeResponse = await sorobanRpc.getLedgerEntries(codeKey);
              if (codeResponse.entries && codeResponse.entries.length > 0) {
                codeTTL = codeResponse.entries[0].liveUntilLedgerSeq || null;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading TTL:", err);
  }

  return { instanceTTL, codeTTL, wasmHash, currentLedger };
}

/**
 * Extend the instance TTL of a Soroban contract.
 *
 * @param {string} publicKey Source account
 * @param {string} contractId Contract address (C…)
 * @param {number} extendTo New TTL ledger deadline
 * @returns {Promise<{ hash: string, deadline: number }>}
 */
export async function extendInstanceTTL(publicKey, contractId, extendTo) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error("Contract ID must be a valid Soroban contract strkey (C…).");
  }

  const { currentLedger } = await readContractTTL(contractId);
  if (extendTo <= currentLedger) {
    throw new Error("TTL deadline must be in the future.");
  }

  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const contractKey = StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: StellarSdk.Address.fromString(contractId).toScAddress(),
      key: StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    })
  );

  const sorobanData = new StellarSdk.SorobanDataBuilder().setReadOnly([contractKey]).build();

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .setSorobanData(sorobanData)
    .addOperation(
      StellarSdk.Operation.extendFootprintTtl({
        extendTo: extendTo - currentLedger,
      })
    )
    .setTimeout(180)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const result = await sorobanRpc.sendTransaction(signedTx);

  if (result.status === "ERROR") {
    throw new Error("Instance TTL extension rejected by the network.");
  }

  return { hash: result.hash, deadline: extendTo };
}

/**
 * Extend the code TTL of a Soroban contract's Wasm, separate from the instance.
 *
 * @param {string} publicKey Source account
 * @param {string} wasmHash Hex-encoded Wasm hash
 * @param {number} extendTo New TTL ledger deadline
 * @param {number} currentLedger Latest ledger sequence
 * @returns {Promise<{ hash: string, deadline: number }>}
 */
export async function extendCodeTTL(publicKey, wasmHash, extendTo, currentLedger) {
  if (!wasmHash || !/^[0-9a-fA-F]{64}$/.test(wasmHash)) {
    throw new Error("Wasm hash must be exactly 64 hexadecimal characters.");
  }

  if (extendTo <= currentLedger) {
    throw new Error("TTL deadline must be in the future.");
  }

  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const codeKey = StellarSdk.xdr.LedgerKey.contractCode(
    new StellarSdk.xdr.LedgerKeyContractCode({
      hash: hexToBytes(wasmHash),
    })
  );

  const sorobanData = new StellarSdk.SorobanDataBuilder().setReadOnly([codeKey]).build();

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .setSorobanData(sorobanData)
    .addOperation(
      StellarSdk.Operation.extendFootprintTtl({
        extendTo: extendTo - currentLedger,
      })
    )
    .setTimeout(180)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const result = await sorobanRpc.sendTransaction(signedTx);

  if (result.status === "ERROR") {
    throw new Error("Code TTL extension rejected by the network.");
  }

  return { hash: result.hash, deadline: extendTo };
}
