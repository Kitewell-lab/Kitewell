import {
  isConnected,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { getActiveNetwork } from "./network";
import { buildAsset, parsePathAssets } from "./stellar";

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

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d]; // \0asm

/** Accept a File.arrayBuffer(), Uint8Array, or byte array, with a magic check. */
function normalizeWasmBytes(wasmBytes) {
  let bytes;
  if (wasmBytes instanceof Uint8Array) {
    bytes = wasmBytes;
  } else if (wasmBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(wasmBytes);
  } else if (Array.isArray(wasmBytes)) {
    bytes = Uint8Array.from(wasmBytes);
  } else {
    throw new Error("Choose the built kitewell.wasm file to deploy.");
  }

  if (bytes.length < 8 || !WASM_MAGIC.every((byte, i) => bytes[i] === byte)) {
    throw new Error("Not a Wasm binary — choose the built kitewell.wasm file.");
  }
  return bytes;
}

function newSalt() {
  const salt = new Uint8Array(32);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

function assertPublicKey(publicKey) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
}

/**
 * A create-contract tx has one host-function op; its result carries the new
 * contract ID as a 32-byte hash.
 */
function contractIdFromResult(resultXdr) {
  try {
    const result =
      typeof resultXdr === "string"
        ? StellarSdk.xdr.TransactionResult.fromXDR(resultXdr, "base64")
        : resultXdr;
    const createResult = result
      ?.result?.()
      ?.results?.()[0]
      ?.tr?.()
      ?.invokeHostFunctionResult?.();
    if (!createResult || createResult.switch().value !== 0) return null;
    return StellarSdk.Address.contract(createResult.success()).toString();
  } catch {
    return null;
  }
}

/** Prepare, sign with Freighter, submit, and poll until the tx is applied. */
async function prepareSignSubmit(transaction, publicKey, label) {
  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `${label} rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  // RPC submission is asynchronous: poll getTransaction until applied.
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return { hash: sendResult.hash, returnValue: status.returnValue ?? null, status };
    }
    if (status.status === "FAILED") {
      throw new Error(`${label} failed on-chain. Tx hash: ${sendResult.hash}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // Still pending after the polling window; the tx may land shortly.
  return { hash: sendResult.hash, returnValue: null, status: null };
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
  const submitted = await prepareSignSubmit(
    transaction,
    publicKey,
    "Contract invoke"
  );

  return {
    hash: submitted.hash,
    returnValue: submitted.returnValue
      ? StellarSdk.scValToNative(submitted.returnValue)
      : null,
    confirmed: Boolean(submitted.status),
  };
}

/** Upload the Wasm bytes in their own Soroban tx (one host op per tx). */
async function uploadKitewellWasm(publicKey, wasm) {
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  const submitted = await prepareSignSubmit(transaction, publicKey, "Wasm upload");
  if (!submitted.status) {
    throw new Error(
      `Wasm upload submitted (${submitted.hash}) but not confirmed; install stopped.`
    );
  }
  return { wasmHash: StellarSdk.hash(wasm), hash: submitted.hash };
}

/** Create the contract instance from an uploaded Wasm hash. */
async function createKitewellContract(publicKey, wasmHash, salt) {
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.createCustomContract({
        address: new StellarSdk.Address(publicKey),
        wasmHash,
        salt,
      })
    )
    .setTimeout(60)
    .build();

  const submitted = await prepareSignSubmit(
    transaction,
    publicKey,
    "Contract create"
  );
  if (!submitted.status) {
    throw new Error(
      `Contract create submitted (${submitted.hash}) but not confirmed; no contract id yet.`
    );
  }

  const contractId = contractIdFromResult(submitted.status.resultXdr);
  if (!contractId) {
    throw new Error(
      `Contract create confirmed (${submitted.hash}) but returned no contract id.`
    );
  }
  return { contractId, hash: submitted.hash };
}

/**
 * Install the Kitewell Wasm: upload bytes, then create a contract instance from
 * the uploaded hash. Each phase is a Freighter-signed Soroban tx; the new
 * contract ID comes from the create tx result. No `init` is called here.
 *
 * @returns {{ contractId: string, hash: string, uploadHash: string, confirmed: true }}
 */
export async function installKitewellContract(publicKey, wasmBytes, options = {}) {
  assertPublicKey(publicKey);
  const wasm = normalizeWasmBytes(wasmBytes);
  const salt = options.salt ?? newSalt();

  const upload = await uploadKitewellWasm(publicKey, wasm);
  const created = await createKitewellContract(publicKey, upload.wasmHash, salt);

  return {
    contractId: created.contractId,
    hash: created.hash,
    uploadHash: upload.hash,
    confirmed: true,
  };
}

/**
 * One-time `init(admin)` invoke for a freshly installed registry. The connected
 * account is the admin; the contract itself rejects a second init.
 */
export async function initializeKitewellContract(publicKey, contractId) {
  assertPublicKey(publicKey);
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = buildContractTx(
    contract,
    "init",
    [StellarSdk.nativeToScVal(publicKey, { type: "address" })],
    sourceAccount
  );

  const submitted = await prepareSignSubmit(transaction, publicKey, "Contract init");
  return { hash: submitted.hash, confirmed: Boolean(submitted.status) };
}

/**
 * Install + initialize the existing Kitewell contract from the Lab tab.
 *
 * `install` and `init` are injectable so a caller (or a test) can stub the two
 * phases without touching the network. Install always runs first, and init is
 * called exactly once with the new id; a failed install never yields an id.
 */
export async function deployKitewellContract(publicKey, wasmBytes, options = {}) {
  const {
    install = installKitewellContract,
    init = initializeKitewellContract,
  } = options;

  // Validate before submitting anything so a bad file/key cannot half-deploy.
  assertPublicKey(publicKey);
  normalizeWasmBytes(wasmBytes);

  const installed = await install(publicKey, wasmBytes, {
    salt: options.salt,
  });
  if (!StellarSdk.StrKey.isValidContract(installed?.contractId)) {
    throw new Error("Install did not return a valid contract id; init was not called.");
  }

  let initialized;
  try {
    initialized = await init(publicKey, installed.contractId);
  } catch (error) {
    // The install already succeeded, so surface its id for diagnostics without
    // treating it as a usable deployment.
    if (error instanceof Error) error.contractId = installed.contractId;
    throw error;
  }

  return {
    contractId: installed.contractId,
    installHash: installed.hash,
    initHash: initialized?.hash ?? null,
    confirmed: Boolean(installed.confirmed && initialized?.confirmed),
  };
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
