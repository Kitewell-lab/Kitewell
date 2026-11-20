import {
  isConnected,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { getActiveNetwork } from "./network";
import {
  buildAsset,
  parsePathAssets,
  buildSetOptionsBody,
  MAX_ASSET_CODE_LENGTH,
} from "./stellar";

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

/** Ask Freighter to sign raw XDR and return the parsed signed transaction. */
async function signWithFreighter(unsignedXdr, publicKey) {
  const passphrase = currentPassphrase();
  const signResult = await signTransaction(unsignedXdr, {
    networkPassphrase: passphrase,
    address: publicKey,
  });

  if (signResult.error || !signResult.signedTxXdr) {
    throw new Error(
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
  return getServer().submitTransaction(signedTx);
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
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }

  const transactionMemo = createMemo(memoType, memo);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  }).addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: resolvePaymentAsset(asset),
      amount: amount.toString(),
    })
  );

  if (transactionMemo) {
    txBuilder.addMemo(transactionMemo);
  }

  const transaction = txBuilder.setTimeout(180).build();
  return signAndSubmit(transaction, publicKey);
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

  // Deliberately do not pre-check the holder's balance: if a revoke is invalid
  // (e.g. the trustline still holds a balance), Horizon's error is surfaced.
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
 * `options.currentDeadline` lets callers reuse the TTL they already read; when
 * omitted the helper reads it itself so the local guard always holds.
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

  const currentDeadline =
    options.currentDeadline ??
    (await readContractInstanceTtl(contractId)).liveUntilLedgerSeq ??
    0;
  if (target <= currentDeadline) {
    throw new Error(
      `New deadline must be later than the current one (${currentDeadline}).`
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
    .addOperation(StellarSdk.Operation.extendFootprintTtl({ extendTo: target }))
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

/**
 * Turn raw Soroban RPC contract events into the two Lab-facing shapes:
 * `register` (caller / name / isNew) and `paused` (new flag). Events from any
 * other contract are dropped, as are event types we do not display.
 */
export function mapKitewellEvents(rawEvents = [], contractId) {
  return (rawEvents || [])
    .filter((event) => !contractId || eventContractId(event) === contractId)
    .map((event) => {
      const topic = event.topic || [];
      const kind = topic[0] ? nativeOrValue(topic[0]) : null;
      const value = event.value ? nativeOrValue(event.value) : null;
      const common = {
        id: event.id ?? `${event.ledger ?? event.ledgerSeq ?? 0}-${kind}`,
        ledger: event.ledger ?? event.ledgerSeq ?? null,
      };

      if (kind === "register") {
        const [name, isNew] = Array.isArray(value) ? value : [null, null];
        return {
          ...common,
          type: "register",
          caller: topic[1] ? nativeOrValue(topic[1]) : null,
          name: name ?? null,
          isNew: Boolean(isNew),
        };
      }
      if (kind === "paused") {
        return { ...common, type: "paused", paused: Boolean(value) };
      }
      return null;
    })
    .filter(Boolean);
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
