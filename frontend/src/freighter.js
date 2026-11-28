import {
  isConnected,
  setAllowed,
  getAddress,
  getNetworkDetails,
  getNetwork,
  signTransaction,
  signAuthEntry,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { findNetworkByPassphrase, getActiveNetwork } from "./network";
import {
  decodeBuilderName,
  describeBuilderLookup,
  normalizeBuilderAddress,
} from "./builderLookup";
import {
  buildAsset,
  parsePathAssets,
  buildSetOptionsBody,
  MAX_ASSET_CODE_LENGTH,
  validateDataName,
  validateDataValue,
  validateAccountMerge,
  getAccountMergeBlockers,
  getLatestBaseReserve,
  resolveFederationAddress,
  getAccountAssetBalance,
} from "./stellar";
import { getTransactionFailure, parseHorizonError } from "./horizonErrorParse";
import { formatTrustlineLimit } from "./trustlineLimitFormat";
import { parseSimulationFees } from "./simulationFees";
import { pageBuilderAddresses } from "./builderDirectory";
import { getFeePerOperation } from "./feeSetting";
import { createKitewellClient } from "./kitewellClient";
import {
  formatStroops,
  minimumBalanceInStroops,
  remainsAboveMinimum,
} from "./accountReserve";
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

/** Selected fee per operation; falls back to the SDK default (100 stroops). */
function selectedFeePerOperation() {
  return getFeePerOperation() ?? StellarSdk.BASE_FEE;
}

const MAX_MEMO_TEXT_BYTES = 28;
const MAX_U64 = 18446744073709551615n;
export const TRANSACTION_FEE_STROOPS = StellarSdk.BASE_FEE;

/** Public Stellar RPC endpoint for Soroban reads + invokes (Testnet). */
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
let activeRpcUrl;
let activeRpcServer;

function getActiveRpcServer() {
  const rpcUrl = getActiveNetwork().rpcUrl || SOROBAN_RPC_URL;
  if (!activeRpcServer || activeRpcUrl !== rpcUrl) {
    activeRpcUrl = rpcUrl;
    activeRpcServer = new StellarSdk.rpc.Server(rpcUrl);
  }
  return activeRpcServer;
}

// Keep existing call sites small while resolving the selected network's RPC
// at method access time. Switching networks invalidates the cached server.
const sorobanRpc = new Proxy({}, {
  get(_target, property) {
    const server = getActiveRpcServer();
    const value = server[property];
    return typeof value === "function" ? value.bind(server) : value;
  },
});

/** One event replay read returns at most this many events. */
export const MAX_KITEWELL_EVENTS = 200;

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

/** Build a spec-driven client for the active network's contract calls. */
function kitewellClient(contractId) {
  return createKitewellClient({
    contractId,
    networkPassphrase: currentPassphrase(),
  });
}

/** Send prepared XDR to Freighter and return the signed transaction. */
function freighterSigner(publicKey) {
  return (unsignedXdr) => signWithFreighter(unsignedXdr, publicKey);
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
 * Read-only lookups against the Kitewell registry via Soroban RPC.
 * Calls lab_name(), builder_count(), and get_builder(viewer).
 *
 * @returns {{ labName: string, builderCount: number, builder: string|null, archived: boolean }}
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
 * Refuse to sign a contract invoke when Freighter is pointed at a different
 * network than the contract the backend reports. Previously this surfaced as
 * an opaque signing or submission failure after the wallet had already been
 * prompted.
 */
async function assertFreighterNetwork(expectedPassphrase) {
  const details = await getNetworkDetails();
  if (details.error) {
    throw new Error(
      details.error.message || "Could not read the network from Freighter."
    );
  }
  if (details.networkPassphrase !== expectedPassphrase) {
    throw new Error(
      `Freighter is on ${details.network}, but this contract is on a different network. ` +
        "Switch Freighter to the Lab network and try again."
    );
  }
}

/**
 * Read-only lookups against the Kitewell registry through the generated
 * client: lab_name(), builder_count(), get_builder(viewer), paused(), and
 * get_admin().
 *
 * When the contract instance is archived on-chain, the simulated read fails
 * with a host error. Rather than surface that as a hard failure, the wrapper
 * catches the archived case and returns a state shape with `archived: true`.
 *
 * @returns {{ labName: string|null, builderCount: number, builder: string|null,
 *   paused: boolean, admin: string|null, archived: boolean }}
 */
export async function readKitewellState(contractId, viewerAddress) {
  try {
    return { ...(await kitewellClient(contractId).readState(viewerAddress)), archived: false };
  } catch (error) {
    const message = error?.message || String(error ?? "");
    if (/archived/i.test(message) && /restore/i.test(message)) {
      return { labName: null, builderCount: 0, builder: null, paused: false, admin: null, archived: true };
    }
    throw error;
  }
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

/** Install and initialize the registry in one Freighter-signed flow. */
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

/**
 * Read admin addresses from the Kitewell contract.
 * Calls get_admin() and get_pending_admin() via Soroban RPC.
 *
 * @param {string} contractId - The contract's C… address
 * @returns {Promise<{ admin: string|null, pendingAdmin: string|null }>}
 */
export async function readAdminState(contractId) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const source = new StellarSdk.Account(ZERO_ADDRESS, "0");

  const simulate = async (method) => {
    const tx = buildContractTx(contract, method, [], source, 30);
    const sim = await sorobanRpc.simulateTransaction(tx);
    if (sim.error) {
      throw new Error(`${method}() simulation failed: ${sim.error}`);
    }
    return sim.result?.retval ?? null;
  };

  // Always read admin
  const admin = await simulate("get_admin").then(scOptionToNative);
  
  // Try to read pending admin, but it may not exist on older contracts
  let pendingAdmin = null;
  try {
    pendingAdmin = await simulate("get_pending_admin").then(scOptionToNative);
  } catch {
    // get_pending_admin doesn't exist on this contract version, that's ok
    // (it's new in PR #553 and may not be deployed yet)
  }

  return { admin, pendingAdmin };
}

/** Default page size for the Lab's registered-builder list. */
export const BUILDER_PAGE_SIZE = 10;

/**
 * Page through the addresses stored in the contract's builder index and read
 * each address's nickname.
 *
 * The list function is a read-only simulation, so nothing is signed or
 * submitted. One extra address detects the final page without an empty request.
 *
 * @param {string} contractId Kitewell contract (C…)
 * @param {{ start?: number, limit?: number }} [options]
 * @returns {Promise<{ start: number, limit: number, rows: { address: string, name: string|null }[], nextStart: number|null }>}
 */
export async function listKitewellBuilders(
  contractId,
  { start = 0, limit = BUILDER_PAGE_SIZE } = {}
) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const pageStart = Number(start);
  const pageLimit = Number(limit);
  if (!Number.isSafeInteger(pageStart) || pageStart < 0) {
    throw new Error("Builder page start must be zero or a positive index.");
  }
  if (!Number.isSafeInteger(pageLimit) || pageLimit <= 0 || pageLimit >= 50) {
    throw new Error("Builder page size must be between 1 and 49.");
  }

  const contract = new StellarSdk.Contract(contractId);
  const source = new StellarSdk.Account(ZERO_ADDRESS, "0");

  const simulate = async (method, ...args) => {
    const tx = buildContractTx(contract, method, args, source, 30);
    const sim = await sorobanRpc.simulateTransaction(tx);
    if (sim.error) {
      throw new Error(`${method}() simulation failed: ${sim.error}`);
    }
    return sim.result?.retval ?? null;
  };

  const retval = await simulate(
    "list_builders",
    StellarSdk.nativeToScVal(pageStart, { type: "u32" }),
    StellarSdk.nativeToScVal(pageLimit + 1, { type: "u32" })
  );
  const addresses = retval ? StellarSdk.scValToNative(retval) : [];
  const page = pageBuilderAddresses(addresses || [], pageStart, pageLimit);

  // The index only stores addresses; the nickname still comes from
  // get_builder so the list and the single-builder lookup never disagree.
  const rows = await Promise.all(
    page.rows.map(async (address) => {
      const name = await simulate(
        "get_builder",
        StellarSdk.nativeToScVal(address, { type: "address" })
      ).then(scOptionToNative);
      return { address, name };
    })
  );

  return {
    start: pageStart,
    limit: pageLimit,
    rows,
    nextStart: page.nextStart,
  };
}

/**
 * Look up one registered builder by address via Soroban RPC.
 *
 * The lookup is a read-only simulation, so the connected wallet does not have
 * to be the builder: any valid G… address can be queried.
 *
 * @param {string} contractId Kitewell contract (C…)
 * @param {string} address Stellar account address (G…)
 * @returns {Promise<{ address: string, name: string|null, registered: boolean, label: string }>}
 */
export async function readKitewellBuilder(contractId, address) {
  const normalized = normalizeBuilderAddress(address);
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contract = new StellarSdk.Contract(contractId);
  const source = new StellarSdk.Account(ZERO_ADDRESS, "0");
  const transaction = buildContractTx(
    contract,
    "get_builder",
    [StellarSdk.nativeToScVal(normalized, { type: "address" })],
    source,
    30
  );
  const simulation = await sorobanRpc.simulateTransaction(transaction);
  if (simulation.error) {
    throw new Error(`get_builder() simulation failed: ${simulation.error}`);
  }

  return describeBuilderLookup(
    normalized,
    decodeBuilderName(simulation.result?.retval ?? null)
  );
}

/**
 * Propose a successor admin for the Kitewell contract.
 * Only the current admin can call this. The proposal does not move admin
 * rights by itself — the successor must call accept_admin.
 *
 * @param {string} publicKey - Current admin's public key
 * @param {string} contractId - The contract's C… address
 * @param {string} newAdminAddress - The proposed successor's address
 * @returns {Promise<{ hash: string, confirmed: boolean }>}
 */
export async function proposeAdminWithFreighter(
  publicKey,
  contractId,
  newAdminAddress
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Current admin address is invalid.");
  }
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(newAdminAddress)) {
    throw new Error("New admin address must be a valid Stellar public key (G…).");
  }

  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const transaction = buildContractTx(
    contract,
    "propose_admin",
    [
      StellarSdk.nativeToScVal(publicKey, { type: "address" }),
      StellarSdk.nativeToScVal(newAdminAddress, { type: "address" }),
    ],
    sourceAccount
  );

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Propose admin rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return { hash: sendResult.hash, confirmed: true };
    }
    if (status.status === "FAILED") {
      throw new Error(
        `Propose admin failed on-chain. Tx hash: ${sendResult.hash}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  return { hash: sendResult.hash, confirmed: false };
}

/**
 * Simulate the builder registration without signing or submitting it, so the
 * panel can show the return value and fee breakdown before the user signs.
 *
 * @returns {Promise<{
 *   error: string|null,
 *   inclusionFee: string|null,
 *   resourceFee: string|null,
 *   totalFee: string|null,
 *   returnValue: unknown,
 * }>} Fees in stroops.
 */
export async function simulateRegisterBuilder(publicKey, contractId, name) {
  const trimmed = (name || "").trim();
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
  const fees = parseSimulationFees(simulation, transaction.fee);
  const hasReturnValue =
    simulation?.result &&
    Object.prototype.hasOwnProperty.call(simulation.result, "retval");
  return {
    ...fees,
    error:
      fees.error || (hasReturnValue ? null : "Simulation returned no result."),
    returnValue:
      fees.error || !hasReturnValue
        ? null
        : StellarSdk.scValToNative(simulation.result.retval),
  };
}

/**
 * Accept a pending admin transfer for the Kitewell contract.
 * Only the pending admin can call this. On success, the caller becomes the
 * live admin and the pending slot clears.
 *
 * @param {string} publicKey - Pending admin's public key (must match pending)
 * @param {string} contractId - The contract's C… address
 * @returns {Promise<{ hash: string, confirmed: boolean }>}
 */
export async function acceptAdminWithFreighter(publicKey, contractId) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Pending admin address is invalid.");
  }

  await assertFreighterNetwork(expectedPassphrase);

  return kitewellClient(contractId).register(
    publicKey,
    trimmed,
    freighterSigner(publicKey)
  );
}

/** Rename the connected builder's own check-in. */
export async function renameBuilderWithFreighter(
  publicKey,
  contractId,
  newName
) {
  const trimmed = (newName || "").trim();
  if (!trimmed) {
    throw new Error("Enter a builder name to rename.");
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
    "accept_admin",
    [StellarSdk.nativeToScVal(publicKey, { type: "address" })],
    sourceAccount
  );

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Accept admin rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  // Poll for confirmation
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return { hash: sendResult.hash, confirmed: true };
    }
    if (status.status === "FAILED") {
      throw new Error(
        `Accept admin failed on-chain. Tx hash: ${sendResult.hash}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  return { hash: sendResult.hash, confirmed: false };
}

/** Restore an archived contract instance from the Soroban ledger. */
export async function restoreContractWithFreighter(publicKey, contractId) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const contractAddress = new StellarSdk.Address(contractId);
  const instanceKey = StellarSdk.xdr.LedgerKey.contractData(
    new StellarSdk.xdr.LedgerKeyContractData({
      contract: contractAddress.toScAddress(),
      key: StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: StellarSdk.xdr.ContractDataDurability.persistent(),
    })
  );

  const sourceAccount = await sorobanRpc.getAccount(publicKey);
  const restoreOp = StellarSdk.Operation.restoreFootprint({
    source: publicKey,
  });

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(restoreOp)
    .setSorobanData(
      new StellarSdk.SorobanDataBuilder()
        .setReadWrite([instanceKey])
        .build()
    )
    .setTimeout(180)
    .build();

  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const sendResult = await sorobanRpc.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Restore operation rejected by the network. Tx hash: ${sendResult.hash}`
    );
  }

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const status = await sorobanRpc.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") {
      return {
        hash: sendResult.hash,
        confirmed: true,
      };
    }
    if (status.status === "FAILED") {
      throw new Error(
        `Restore operation failed on-chain. Tx hash: ${sendResult.hash}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  return { hash: sendResult.hash, confirmed: false };
}

/**
 * Pause or unpause registration. Only the contract admin's signature is
 * accepted; anyone else gets the contract's NotAdmin error in plain language
 * and the flag is left untouched.
 */
export async function setPausedWithFreighter(
  publicKey,
  contractId,
  paused,
  expectedPassphrase = currentPassphrase()
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  await assertFreighterNetwork(expectedPassphrase);

  return kitewellClient(contractId).setPaused(
    publicKey,
    Boolean(paused),
    freighterSigner(publicKey)
  );
}

/** Remove the connected builder's own check-in with their signature. */
export async function unregisterBuilderWithFreighter(
  publicKey,
  contractId,
  expectedPassphrase = currentPassphrase()
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  await assertFreighterNetwork(expectedPassphrase);

  return kitewellClient(contractId).unregister(
    publicKey,
    freighterSigner(publicKey)
  );
}

function createMemo(memoType, value) {
  if (memoType === "hash" && !String(value ?? "").replace(/\s/g, "")) {
    throw new Error("Hash memo is required.");
  }
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
    return StellarSdk.Memo.hash(normalizeHashMemo(value));
  }

  throw new Error(`Unsupported memo type: ${memoType}`);
}

export function normalizeHashMemo(value) {
  const normalized = String(value ?? "").replace(/\s/g, "");
  if (!normalized) throw new Error("Hash memo is required.");
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Hash memos must be exactly 64 hexadecimal characters.");
  }
  return normalized;
}

export function isTxBadSeqFailure(error) {
  if (!error) return false;
  const resultCodes =
    error.result?.result_codes ||
    error.response?.data?.extras?.result_codes ||
    error.response?.data?.result_codes ||
    {};
  return (
    resultCodes.transaction === "tx_bad_seq" ||
    error.result?.tx_bad_seq === true ||
    error.tx_bad_seq === true ||
    String(error.message || error).toLowerCase().includes("tx_bad_seq")
  );
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
  return submitSignedTransaction(signedTx);
}

async function submitSignedTransaction(signedTx) {
  try {
    return await getServer().submitTransaction(signedTx);
  } catch (error) {
    const transactionFailure = getTransactionFailure(error);
    if (!transactionFailure) throw error;

    const failureError = horizonFailureError(
      "Transaction failed on the network."
    );
    failureError.transactionFailure = transactionFailure;
    throw failureError;
  }
}

export function buildClaimPredicate(mode, ledgerTime) {
  if (mode === "unconditional") {
    return StellarSdk.Claimant.predicateUnconditional();
  }

  const normalized = String(ledgerTime ?? "").trim();
  if (!/^\d+$/.test(normalized) || BigInt(normalized) < 0n) {
    throw new Error("Ledger time must be a non-negative Unix timestamp.");
  }

  const before = StellarSdk.Claimant.predicateBeforeAbsoluteTime(normalized);
  if (mode === "notBefore") {
    return StellarSdk.Claimant.predicateNot(before);
  }
  if (mode === "notAfter") {
    return before;
  }
  throw new Error("Unsupported claim predicate.");
}

export async function createClaimableBalanceWithFreighter({
  publicKey,
  claimant,
  amount,
  asset,
  predicateMode = "unconditional",
  ledgerTime = "",
} = {}) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(claimant)) {
    throw new Error("Claimant must be a valid Stellar public key (G…).");
  }
  if (!asset) {
    throw new Error("Choose an asset you hold.");
  }

  const normalizedAmount = normalizeAmount(amount, "Claimable balance amount");
  if (parseFloat(normalizedAmount) <= 0) {
    throw new Error("Claimable balance amount must be greater than zero.");
  }

  const sdkAsset = asset.isNative
    ? StellarSdk.Asset.native()
    : new StellarSdk.Asset(asset.code, asset.issuer);
  const predicate = buildClaimPredicate(predicateMode, ledgerTime);
  const claimants = [new StellarSdk.Claimant(claimant, predicate)];

  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.createClaimableBalance({
        asset: sdkAsset,
        amount: normalizedAmount,
        claimants,
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

export async function claimClaimableBalanceWithFreighter(publicKey, balanceId) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!/^([0-9a-fA-F]{72}|B[1-9A-HJ-NP-Za-km-z]{55})$/.test(balanceId || "")) {
    throw new Error("A valid claimable balance ID is required.");
  }

  const normalizedId =
    typeof balanceId === "string" && balanceId.startsWith("B")
      ? StellarSdk.StrKey.decodeClaimableBalance(balanceId).toString("hex")
      : balanceId;

  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.claimClaimableBalance({
        balanceId: normalizedId,
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

export const createClaimableBalance = createClaimableBalanceWithFreighter;
export const claimClaimableBalance = claimClaimableBalanceWithFreighter;

function normalizeClaimableBalanceId(balanceId) {
  if (!/^([0-9a-fA-F]{72}|B[1-9A-HJ-NP-Za-km-z]{55})$/.test(balanceId || "")) {
    throw new Error("A valid claimable balance ID is required.");
  }
  return typeof balanceId === "string" && balanceId.startsWith("B")
    ? StellarSdk.StrKey.decodeClaimableBalance(balanceId).toString("hex")
    : balanceId;
}

/** Claw back a claimable balance this account created. The issuer signs. */
export async function clawbackClaimableBalanceWithFreighter(publicKey, balanceId) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  const normalizedId = normalizeClaimableBalanceId(balanceId);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.clawbackClaimableBalance({
        balanceId: normalizedId,
      })
    )
    .setTimeout(180)
    .build();
  return signAndSubmit(transaction, publicKey);
}

/** Hard cap on the number of operations in one composed transaction. */
export const MAX_COMPOSED_OPERATIONS = 100;
const MAX_MANAGE_DATA_NAME_BYTES = 64;
const MAX_MANAGE_DATA_VALUE_BYTES = 64;

function assertComposedEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Add at least one operation before signing.");
  }
  if (entries.length > MAX_COMPOSED_OPERATIONS) {
    throw new Error(
      `A transaction can contain at most ${MAX_COMPOSED_OPERATIONS} operations.`
    );
  }
}

/** Build one operation from a composer entry, validating it first. */
export function buildComposedOperation(entry = {}) {
  if (entry.type === "payment") {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(entry.destination)) {
      throw new Error("Destination must be a valid Stellar public key (G…).");
    }

    return StellarSdk.Operation.payment({
      destination: entry.destination,
      asset: resolvePaymentAsset(entry.asset),
      amount: normalizeAmount(entry.amount),
    });
  }

  if (entry.type === "changeTrust") {
    const code = String(entry.code ?? "").trim().toUpperCase();
    if (!code || code.length > 12) {
      throw new Error("Asset code must be 1–12 characters.");
    }
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(entry.issuer)) {
      throw new Error("Issuer must be a valid Stellar public key (G…).");
    }

    return StellarSdk.Operation.changeTrust({
      asset: new StellarSdk.Asset(code, entry.issuer),
      limit: formatTrustlineLimit(entry.limit).formatted,
    });
  }

  if (entry.type === "manageData") {
    const name = String(entry.name ?? "").trim();
    if (!name) {
      throw new Error("Data entry name is required.");
    }
    if (new TextEncoder().encode(name).length > MAX_MANAGE_DATA_NAME_BYTES) {
      throw new Error("Data entry name must be 64 UTF-8 bytes or fewer.");
    }

    const value = String(entry.value ?? "");
    if (new TextEncoder().encode(value).length > MAX_MANAGE_DATA_VALUE_BYTES) {
      throw new Error("Data entry value must be 64 UTF-8 bytes or fewer.");
    }

    return StellarSdk.Operation.manageData({ name, value });
  }

  throw new Error(`Unsupported operation type: ${entry.type}`);
}

/** Build a multi-operation transaction from composer entries. */
export function buildComposedTransaction(sourceAccount, entries) {
  assertComposedEntries(entries);

  const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  });

  for (const entry of entries) {
    builder.addOperation(buildComposedOperation(entry));
  }

  return builder.setTimeout(180).build();
}

/**
 * Extract the Horizon operation index from a transaction-failed error so the
 * compose panel can point the user at the failing step.
 */
export function getFailedOperationIndex(error) {
  const codes =
    error?.response?.data?.extras?.result_codes?.operations ?? error?.response?.data?.extras?.result_codes?.operations;
  if (Array.isArray(codes)) {
    const failed = codes.findIndex(
      (code) => code && code !== "op_success"
    );
    if (failed !== -1) return failed;
  }
  return undefined;
}

/**
 * Build, sign with Freighter, and submit a multi-operation transaction.
 *
 * A failure response names the operation index Horizon rejected, so the panel
 * can point the user at the failing step rather than the whole transaction.
 */
export async function submitComposedOperations(publicKey, entries) {
  const transaction = buildComposedTransaction(
    new StellarSdk.Account(publicKey, "0"),
    entries
  );

  const sourceAccount = await getServer().loadAccount(publicKey);
  const built = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  });

  for (const entry of entries) {
    built.addOperation(buildComposedOperation(entry));
  }
  const tx = built.setTimeout(180).build();

  const signedTx = await signWithFreighter(tx.toXDR(), publicKey);

  try {
    const result = await getServer().submitTransaction(signedTx);
    return result;
  } catch (error) {
    const idx = getFailedOperationIndex(error);
    if (idx != null) {
      error.operationIndex = idx;
      error.message = `Operation index ${idx} failed: ${error.message}`;
    }
    throw error;
  }
}

function amountToStroops(value) {
  const [whole, fraction = ""] = String(value).trim().split(".");
  return (
    BigInt(whole || "0") * 10000000n +
    BigInt((fraction + "0000000").slice(0, 7))
  );
}

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

function horizonCreateAccountError(error) {
  const body = error?.response?.data;
  if (body?.extras?.result_codes?.operations?.includes("op_already_exist")) {
    return "Destination account already exists.";
  }
  if (body?.extras?.result_codes?.operations?.length) {
    return body.extras.result_codes.operations.join(", ");
  }
  return error?.message || "Create account failed.";
}

/**
 * Create and fund a new Stellar account from the connected wallet.
 */
export async function createAccountWithFreighter(
  publicKey,
  destination,
  startingBalance
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }
  if (destination === publicKey) {
    throw new Error("The destination cannot be the connected account.");
  }

  const amount = normalizeAmount(startingBalance, "Starting balance");
  const [whole, fraction = ""] = amount.split(".");
  const belowMinimum =
    BigInt(whole) < 1n ||
    (BigInt(whole) === 0n && !/[1-9]/.test(fraction));
  if (belowMinimum) {
    throw new Error("Starting balance must be at least 1 XLM.");
  }
  const formattedAmount = `${whole}.${fraction.padEnd(7, "0")}`;

  try {
    await getServer().loadAccount(destination);
    throw new Error("Destination account already exists.");
  } catch (error) {
    if (error?.message === "Destination account already exists.") throw error;
    if (error?.response?.status !== 404) throw error;
  }

  const sourceAccount = await getServer().loadAccount(publicKey);

  // Check that the source retains enough lumens after the transfer and the
  // new subentry the createAccount operation adds.
  const baseReserveStroops = await getLatestBaseReserve();
  const baseReserve =
    typeof baseReserveStroops === "bigint"
      ? Number(baseReserveStroops) / 1e7
      : Number(baseReserveStroops) / 1e7;
  const reservePerSubentry = baseReserve;
  const currentSubentryCount = Number(sourceAccount.subentry_count ?? 0);
  // createAccount adds one new account subentry.
  const futureSubentryCount = currentSubentryCount + 1;
  const minimumBalance =
    baseReserve + futureSubentryCount * reservePerSubentry;
  const nativeBalance =
    sourceAccount.balances?.find((b) => b.asset_type === "native")?.balance;
  if (nativeBalance == null) {
    throw new Error(
      "Could not verify the account balance and subentries; account creation is disabled."
    );
  }
  const sourceBalance = Number(nativeBalance);
  const transferAmount = Number(formattedAmount);
  const balanceAfterTransfer = sourceBalance - transferAmount;
  if (balanceAfterTransfer <= minimumBalance) {
    throw new Error(
      `source must retain ${minimumBalance.toFixed(7)} XLM to create an account.`
    );
  }

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.createAccount({
        destination,
        startingBalance: formattedAmount,
      })
    )
    .setTimeout(180)
    .build();

  try {
    return await signAndSubmit(transaction, publicKey);
  } catch (error) {
    throw new Error(`Create account failed: ${horizonCreateAccountError(error)}`, {
      cause: error,
    });
  }
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
    fee: selectedFeePerOperation(),
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
  return submitSignedTransaction(signedTx);
}

/**
 * Build a payment op, sign it with Freighter, and submit it to Horizon.
 * `asset` accepts a UI descriptor (`{ isNative: true }` or
 * `{ isNative: false, code, issuer }`); omit it to send native XLM.
 * Optional `minTime` and `maxTime` are Unix timestamps (seconds) for transaction time bounds.
 * When both are provided, they replace the default timeout.
 */
export async function sendPaymentWithFreighter(
  publicKey,
  destination,
  amount,
  asset = null,
  memoType = "text",
  memo = "",
  minTime = null,
  maxTime = null
) {
  const isAccountAddress =
    StellarSdk.StrKey.isValidEd25519PublicKey(destination) ||
    StellarSdk.StrKey.isValidMed25519PublicKey(destination);
  if (!isAccountAddress) {
    if (typeof destination === "string" && destination.startsWith("M")) {
      throw new Error(
        "Destination must be a valid Stellar public key or a muxed address (G… or M…)."
      );
    }
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }

  const resolvedDestination = await resolveFederationAddress(destination);
  const isResolvedAccountAddress =
    StellarSdk.StrKey.isValidEd25519PublicKey(resolvedDestination) ||
    StellarSdk.StrKey.isValidMed25519PublicKey(resolvedDestination);
  if (!isResolvedAccountAddress) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }

  // Validate time bounds if provided
  if (minTime !== null || maxTime !== null) {
    const min = minTime !== null ? Number(minTime) : 0;
    const max = maxTime !== null ? Number(maxTime) : 0;
    const now = Math.floor(Date.now() / 1000);

    if (minTime !== null && maxTime !== null && max <= min) {
      throw new Error("Maximum time must be after minimum time.");
    }
    if (maxTime !== null && max <= now) {
      throw new Error("Maximum time must be in the future.");
    }
  }

  const transactionMemo = createMemo(memoType, memo);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: selectedFeePerOperation(),
    networkPassphrase: currentPassphrase(),
  }).addOperation(
    StellarSdk.Operation.payment({
      destination: resolvedDestination,
      asset: resolvePaymentAsset(asset),
      amount: amount.toString(),
    })
  );

  if (transactionMemo) {
    txBuilder.addMemo(transactionMemo);
  }

  let transaction;
  if (minTime !== null || maxTime !== null) {
    const min = minTime !== null ? Number(minTime) : 0;
    const max = maxTime !== null ? Number(maxTime) : 0;
    transaction = txBuilder.setTimebounds(min, max).build();
  } else {
    transaction = txBuilder.setTimeout(180).build();
  }

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

  const resolvedDestination = await resolveFederationAddress(destination);

  const operation = isStrictReceive
    ? StellarSdk.Operation.pathPaymentStrictReceive({
        sendAsset: sourceAsset,
        sendMax: boundValue,
        destination: resolvedDestination,
        destAsset: destinationAsset,
        destAmount: amountValue,
        path: intermediatePath,
      })
    : StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: sourceAsset,
        sendAmount: amountValue,
        destination: resolvedDestination,
        destAsset: destinationAsset,
        destMin: boundValue,
        path: intermediatePath,
      });

  // Load the account immediately before building so a stale sequence is refused.
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: selectedFeePerOperation(),
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

export function buildSacTransferTransaction(publicKey, destination, amount, asset, sequence = "0") {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Destination must be a valid Stellar public key (G…).");
  }
  if (destination === publicKey) {
    throw new Error("Destination must be different from the source account.");
  }
  const amountValue = normalizeAmount(amount, "Amount");
  if (!asset || asset.isNative) {
    throw new Error("Choose a credit asset for a SAC transfer.");
  }

  const stellarAsset = resolvePaymentAsset(asset);
  const contractId = stellarAsset.contractId(currentPassphrase());
  const contract = new StellarSdk.Contract(contractId);
  const amountMinor = BigInt(amountValue.split(".")[0] || "0") * 10000000n;
  const fraction = (amountValue.split(".")[1] || "").padEnd(7, "0");
  const amountInt = amountMinor + (fraction ? BigInt(fraction) : 0n);
  const source = new StellarSdk.Account(publicKey, sequence);
  return new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(contract.call(
      "transfer",
      StellarSdk.nativeToScVal(publicKey, { type: "address" }),
      StellarSdk.nativeToScVal(destination, { type: "address" }),
      StellarSdk.nativeToScVal(amountInt, { type: "i128" })
    ))
    .setTimeout(180)
    .build();
}

export async function sendSacTransferWithFreighter({
  publicKey,
  destination,
  amount,
  asset,
  availableBalance,
} = {}) {
  if (availableBalance !== undefined && availableBalance !== null) {
    const normalized = normalizeAmount(amount, "Amount");
    if (Number(normalized) > Number(availableBalance)) {
      throw new Error(`Insufficient SAC balance. Available: ${availableBalance}.`);
    }
  }
  const account = await sorobanRpc.getAccount(publicKey);
  const transaction = buildSacTransferTransaction(
    publicKey,
    destination,
    amount,
    asset,
    account.sequence
  );
  const prepared = await sorobanRpc.prepareTransaction(transaction);
  const signedTx = await signWithFreighter(prepared.toXDR(), publicKey);
  const result = await sorobanRpc.sendTransaction(signedTx);
  if (result.status === "ERROR") {
    throw new Error(`SAC transfer rejected by the network. Tx hash: ${result.hash}`);
  }
  return { hash: result.hash, confirmed: false };
}

export const sendSacAssetTransferWithFreighter = sendSacTransferWithFreighter;

export function inspectInnerEnvelope(innerXdr) {
  if (!innerXdr || !String(innerXdr).trim()) {
    throw new Error("Paste an inner transaction envelope.");
  }
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    String(innerXdr).trim(),
    currentPassphrase()
  );
  if (transaction instanceof StellarSdk.FeeBumpTransaction) {
    throw new Error("The pasted envelope is already a fee-bump transaction.");
  }
  return {
    transaction,
    source: transaction.source,
    fee: transaction.fee,
    operationCount: transaction.operations.length,
  };
}

export async function feeBumpInnerEnvelopeWithFreighter(publicKey, innerXdr, feePerOperation) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!/^\d+$/.test(String(feePerOperation ?? "").trim()) || BigInt(feePerOperation) <= 0n) {
    throw new Error("Fee per operation must be greater than zero.");
  }
  const { transaction: inner } = inspectInnerEnvelope(innerXdr);
  const feeBump = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    publicKey,
    String(feePerOperation).trim(),
    inner,
    currentPassphrase()
  );
  const signed = await signWithFreighter(feeBump.toXDR(), publicKey);
  return getServer().submitTransaction(signed);
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
  if (limit !== "0") {
    const baseReserve = await getLatestBaseReserve();
    const subentryCount = Number(sourceAccount.subentry_count);
    const nativeBalance = sourceAccount.balances?.find(
      (balance) => balance.asset_type === "native"
    )?.balance;
    if (!Number.isInteger(subentryCount) || nativeBalance == null) {
      throw new Error(
        "Could not verify the account balance and subentries; trustline signing is disabled."
      );
    }

    const hasTrustline = sourceAccount.balances.some(
      (balance) =>
        balance.asset_issuer === assetIssuer &&
        balance.asset_code === assetCode.toUpperCase()
    );
    const minimum = minimumBalanceInStroops(
      baseReserve,
      subentryCount + (hasTrustline ? 0 : 1)
    );
    if (
      !remainsAboveMinimum(
        nativeBalance,
        "0",
        StellarSdk.BASE_FEE,
        minimum
      )
    ) {
      const required = formatStroops(minimum + BigInt(StellarSdk.BASE_FEE));
      throw new Error(
        `Insufficient XLM for this trustline: the account needs ${required} XLM for its reserve and fee.`
      );
    }
  }

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: selectedFeePerOperation(),
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
  assetIssuer,
  trustlineAccount = publicKey
) {
  if (!assetCode || assetCode.length > 12) {
    throw new Error("Asset code must be 1–12 characters.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
    throw new Error("Issuer must be a valid Stellar public key (G…).");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(trustlineAccount)) {
    throw new Error("Trustline account must be a valid Stellar public key (G…).");
  }

  const asset = new StellarSdk.Asset(assetCode.toUpperCase(), assetIssuer);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.revokeTrustlineSponsorship({
        account: trustlineAccount,
        asset,
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, publicKey);
}

/**
 * Set or clear one account data entry.
 */
export async function manageDataWithFreighter(publicKey, name, value = null) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  const normalizedName = validateDataName(name);
  const normalizedValue =
    value === null || value === undefined
      ? null
      : value instanceof Uint8Array
        ? Buffer.from(validateDataValue(value))
        : Buffer.from(validateDataValue(value), "utf8");
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.manageData({
        name: normalizedName,
        value: normalizedValue,
      })
    )
    .setTimeout(180)
    .build();
  return signAndSubmit(transaction, publicKey);
}

export async function setAccountDataWithFreighter(publicKey, name, value) {
  return manageDataWithFreighter(publicKey, name, value);
}

export async function clearAccountDataWithFreighter(publicKey, name) {
  return manageDataWithFreighter(publicKey, name, null);
}

export const manageDataEntryWithFreighter = manageDataWithFreighter;

/**
 * Merge the connected account into a destination account.
 */
export async function mergeAccountWithFreighter(
  publicKey,
  destination,
  retypeDestination
) {
  validateAccountMerge(publicKey, destination, retypeDestination);
  const blockers = await getAccountMergeBlockers(publicKey);
  if (blockers.length) {
    throw new Error(
      `Account cannot be merged. Remove these blockers first: ${blockers.join("; ")}`
    );
  }
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(StellarSdk.Operation.accountMerge({ destination }))
    .setTimeout(180)
    .build();
  return signAndSubmit(transaction, publicKey);
}

export const mergeAccount = mergeAccountWithFreighter;
export const accountMergeWithFreighter = mergeAccountWithFreighter;

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

/** Claw back part of a holder's balance for an asset the issuer controls. */
export async function clawbackWithFreighter(
  issuer,
  holder,
  assetCode,
  assetIssuer,
  amount
) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(holder)) {
    throw new Error("Holder must be a valid Stellar public key (G…).");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
    throw new Error("Asset issuer must be a valid Stellar public key (G…).");
  }
  if (assetIssuer !== issuer) {
    throw new Error("Only the asset issuer can claw back a balance.");
  }

  const clawbackAmount = normalizeAmount(amount, "Clawback amount");
  const asset = resolvePaymentAsset({
    isNative: false,
    code: assetCode,
    issuer: assetIssuer,
  });

  const holderBalance = await getAccountAssetBalance(
    holder,
    asset.getCode(),
    assetIssuer
  );
  if (amountToStroops(clawbackAmount) > amountToStroops(holderBalance)) {
    throw new Error(
      `Clawback amount exceeds the holder's ${asset.getCode()} balance of ${holderBalance}.`
    );
  }

  const sourceAccount = await getServer().loadAccount(issuer);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.clawback({
        asset,
        amount: clawbackAmount,
        from: holder,
      })
    )
    .setTimeout(180)
    .build();

  return signAndSubmit(transaction, issuer);
}

/** Sponsor a trustline: the sponsor and the sponsored account both sign. */
export async function sponsorTrustlineWithFreighter({
  publicKey,
  sponsoredAccount,
  assetCode,
  assetIssuer,
  limit = "1000000",
} = {}) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(sponsoredAccount)) {
    throw new Error("Sponsored account must be a valid Stellar public key (G…).");
  }
  if (sponsoredAccount === publicKey) {
    throw new Error("You cannot sponsor a trustline for the connected account.");
  }

  const code = (assetCode || "").trim().toUpperCase();
  if (!code || code.length > 12) {
    throw new Error("Asset code must be 1–12 characters.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
    throw new Error("Issuer must be a valid Stellar public key (G…).");
  }

  const asset = new StellarSdk.Asset(code, assetIssuer);
  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: sponsoredAccount,
      })
    )
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset,
        limit: limit.toString(),
        source: sponsoredAccount,
      })
    )
    .addOperation(
      StellarSdk.Operation.endSponsoringFutureReserves({ source: publicKey })
    )
    .setTimeout(180)
    .build();

  const sponsorSigned = await signWithFreighter(
    transaction.toXDR(),
    publicKey
  );
  if (!hasSignatureFrom(sponsorSigned, publicKey)) {
    throw new Error("Freighter did not return the sponsor signature.");
  }

  const fullySigned = await signWithFreighter(
    sponsorSigned.toXDR(),
    sponsoredAccount
  );
  if (!hasSignatureFrom(fullySigned, sponsoredAccount)) {
    throw new Error(
      "Both the sponsor and the sponsored account must sign the envelope."
    );
  }

  return getServer().submitTransaction(fullySigned);
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

  return signAndSubmit(transaction, publicKey);
}

/**
 * Update an issuer's home domain and/or auth flags with `setOptions`, signed by
 * the connected account. Validation (including the immutable confirmation
 * gate) lives in `buildSetOptionsBody`, so an unsafe combination never reaches
 * Freighter.
 */
async function dryRunPaymentTransaction(transaction) {
  if (typeof fetch !== "function") return;

  const network = getActiveNetwork();
  if (!network?.horizonUrl) return;

  try {
    const endpoint = new URL("transactions", `${network.horizonUrl}/`);
    endpoint.searchParams.set("dry_run", "true");

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ tx: transaction.toXDR() }).toString(),
    });

    if ([404, 405, 501].includes(response.status)) return;

    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (response.ok) return;

    const resultCodes = result?.extras?.result_codes;
    const transactionCode =
      resultCodes?.transaction || result?.transaction_result_code;
    const horizonRejected = !response.ok && ([400, 422].includes(response.status) || Boolean(
      resultCodes || result?.transaction_result_code
    ));
    const operationCodes = Array.isArray(resultCodes?.operations)
      ? resultCodes.operations.filter(Boolean).join(", ")
      : null;
    const unsuccessfulDryRun = Boolean(
      transactionCode &&
      transactionCode !== "tx_success" &&
      transactionCode !== "success"
    );

    if (!horizonRejected && !unsuccessfulDryRun) return;

    throw new Error(
      `Horizon rejected this payment${transactionCode ? ` (${transactionCode}${operationCodes ? `: ${operationCodes}` : ""})` : ""}.`
    );
  } catch (error) {
    if (error?.message?.startsWith("Horizon rejected this payment")) {
      throw error;
    }
    // The endpoint or parameter is not exposed; fee calculation + review still work.
  }
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
        functionName: kind ?? null,
      };

      if (kind === "register") {
        const [name, isNew] = Array.isArray(value) ? value : [null, null];
        // Only treat as a register event when topic[1] is an address ScVal
        const topic1Raw = topic[1];
        const isAddressTopic =
          topic1Raw &&
          typeof topic1Raw.switch === "function" &&
          topic1Raw.switch().value === 18; // scvAddress
        const caller = isAddressTopic ? nativeOrValue(topic1Raw) : null;
        if (isAddressTopic && caller && StellarSdk.StrKey.isValidEd25519PublicKey(caller)) {
          return {
            ...common,
            type: "register",
            functionName: "register",
            caller,
            name: name ?? null,
            isNew: Boolean(isNew),
          };
        }
        // Non-address register topic: treat as unknown
        return {
          ...common,
          type: "unknown",
          functionName: null,
          topics: topic.map((t) => nativeOrValue(t) ?? null),
        };
      }
      if (kind === "paused") {
        return { ...common, type: "paused", functionName: "set_paused", paused: Boolean(value) };
      }
      // Unknown event type: keep with raw topics
      return {
        ...common,
        type: "unknown",
        functionName: null,
        topics: topic.map((t) => nativeOrValue(t) ?? null),
      };
    });
}

/**
 * Fetch a page of events for the configured contract. With no cursor the tail
 * starts at `startLedger` (the ledger open at tab-open time), so the full
 * history is never downloaded.
 *
 * A replay read passes its own `startLedger` and is validated against the
 * latest ledger: a start ledger in the future is refused rather than silently
 * returning nothing. One read returns at most `MAX_KITEWELL_EVENTS` events.
 */
export async function readKitewellEvents(contractId, options = {}) {
  if (!StellarSdk.StrKey.isValidContract(contractId)) {
    throw new Error(
      "Contract ID must be a valid Soroban contract strkey (C…)."
    );
  }

  const { cursor, startLedger, limit = 100 } = options;
  const pageLimit = Number(limit);
  if (
    !Number.isSafeInteger(pageLimit) ||
    pageLimit < 1 ||
    pageLimit > MAX_KITEWELL_EVENTS
  ) {
    throw new Error(
      `Event limit must be between 1 and ${MAX_KITEWELL_EVENTS}.`
    );
  }

  const request = {
    limit: pageLimit,
    filters: [{ type: "contract", contractIds: [contractId] }],
  };
  if (cursor) request.cursor = cursor;
  else {
    // The latest ledger is needed both to reject a future start and to begin
    // the live tail at the ledger that is open when the tab opens.
    const latest = await sorobanRpc.getLatestLedger();
    const latestSequence = latest?.sequence ?? 0;

    if (startLedger !== undefined && startLedger !== null) {
      const requestedLedger = Number(startLedger);
      if (!Number.isSafeInteger(requestedLedger) || requestedLedger <= 0) {
        throw new Error("Start ledger must be a positive ledger number.");
      }
      if (requestedLedger > latestSequence) {
        throw new Error(
          `Start ledger ${requestedLedger} is ahead of the latest ledger (${latestSequence}).`
        );
      }
      request.startLedger = requestedLedger;
    } else {
      request.startLedger = latestSequence;
    }
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

      // Extract wasm hash from the contract instance
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

              // Now get the code TTL using the wasm hash
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
 * Read the live-until ledger for a contract instance and compare it with the
 * latest ledger so the UI can show how many ledgers remain.
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

/** Extend a contract instance's TTL with a Freighter-signed Soroban tx. */
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
  const latestLedger =
    options.latestLedger ??
    (await sorobanRpc.getLatestLedger()).sequence ??
    0;
  const sorobanData = new StellarSdk.SorobanDataBuilder()
    .setFootprint([contract.getFootprint()], [])
    .setResourceFee("100")
    .build();

  // extendTo is relative to the latest ledger, not an absolute sequence.
  const extendBy = target - latestLedger;
  if (extendBy <= 0) {
    throw new Error(
      `New deadline (${target}) must be later than the latest ledger (${latestLedger}).`
    );
  }

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
    sorobanData,
  })
    .addOperation(StellarSdk.Operation.extendFootprintTtl({ extendTo: extendBy }))
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

export async function preparePaymentWithFreighter(
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
  const paymentAsset = resolvePaymentAsset(asset);
  const server = getServer();
  const sourceAccount = await server.loadAccount(publicKey);
  const fee = await getPaymentFee(server);
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: currentPassphrase(),
  }).addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: paymentAsset,
      amount: amount.toString(),
    })
  );

  if (transactionMemo) txBuilder.addMemo(transactionMemo);
  const transaction = txBuilder.setTimeout(180).build();

  await dryRunPaymentTransaction(transaction);

  return {
    transaction,
    summary: {
      destination,
      amount: amount.toString(),
      asset: paymentAsset.isNative()
        ? "XLM (native)"
        : `${paymentAsset.getCode()} · ${paymentAsset.getIssuer()}`,
      memo:
        memoType === "text" && memo
          ? `Text: ${memo}`
          : memoType === "id" && memo
            ? `ID: ${memo}`
            : memoType === "hash" && memo
              ? `Hash: ${memo}`
              : "None",
      fee: fee.toString(),
    },
  };
}

/**
 * Build the one transaction that creates a sponsored account:
 * `beginSponsoringFutureReserves(newAccount)`, `createAccount(newAccount, 0)`,
 * then `endSponsoringFutureReserves()`.
 *
 * The starting balance is deliberately `0`: the sponsor pays the base reserve,
 * so the new key does not need any XLM of its own. Building only prepares the
 * envelope — it never signs and never submits.
 *
 * @param {{ sponsor: string, newAccount: string, sequence?: string, timeout?: number }} args
 * @returns {StellarSdk.Transaction}
 */
export function buildSponsoredAccountCreationEnvelope({
  sponsor,
  newAccount,
  sequence = "0",
  timeout = 180,
} = {}) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(sponsor)) {
    throw new Error("Connect a valid Freighter address first.");
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(newAccount)) {
    throw new Error("New account must be a valid Stellar public key (G…).");
  }
  if (sponsor === newAccount) {
    throw new Error("Sponsoring the connected account itself is not allowed.");
  }

  const sourceAccount = new StellarSdk.Account(sponsor, sequence);

  return new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: currentPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: newAccount,
      })
    )
    .addOperation(
      StellarSdk.Operation.createAccount({
        destination: newAccount,
        startingBalance: "0",
      })
    )
    .addOperation(StellarSdk.Operation.endSponsoringFutureReserves())
    .setTimeout(timeout)
    .build();
}

/** True when `publicKey` already signed `transaction`. */
function hasSignatureFrom(transaction, publicKey) {
  const hint = StellarSdk.Keypair.fromPublicKey(publicKey)
    .signatureHint()
    .toString("hex");
  return (transaction.signatures || []).some((signature) =>
    signature.hint().toString("hex") === hint
  );
}

/**
 * Build the unsigned sponsorship envelope for the new account's owner to
 * co-sign. Nothing is signed or submitted here.
 *
 * @returns {Promise<{ xdr: string, hash: string, newAccount: string }>}
 */
export async function createSponsoredAccountDraft(publicKey, newAccount) {
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Connect a valid Freighter address first.");
  }

  const sourceAccount = await getServer().loadAccount(publicKey);
  const transaction = buildSponsoredAccountCreationEnvelope({
    sponsor: publicKey,
    newAccount,
    sequence: sourceAccount.sequenceNumber(),
  });

  return {
    xdr: transaction.toXDR(),
    hash: transaction.hash().toString("hex"),
    newAccount,
  };
}

/**
 * Sponsor the reserve for a brand new account and submit once both signatures
 * are present: the sponsor's (from Freighter) and the new account's (collected
 * as a co-signed envelope XDR).
 *
 * A missing second signature is refused before anything is signed or sent, and
 * the co-signed envelope must match this exact sponsorship transaction.
 *
 * @returns {Promise<{ hash: string, newAccount: string, sponsor: string, confirmed: boolean }>}
 */
export async function sponsorAccountCreationWithFreighter(
  publicKey,
  newAccount,
  coSignedXdr
) {
  // Validation only: passing a placeholder sequence keeps this call offline.
  buildSponsoredAccountCreationEnvelope({
    sponsor: publicKey,
    newAccount,
    sequence: "0",
  });

  if (!coSignedXdr) {
    throw new Error(
      "The new account must co-sign this transaction before it is submitted."
    );
  }

  const sourceAccount = await getServer().loadAccount(publicKey);
  const expected = buildSponsoredAccountCreationEnvelope({
    sponsor: publicKey,
    newAccount,
    sequence: sourceAccount.sequenceNumber(),
  });

  const coSigned = StellarSdk.TransactionBuilder.fromXDR(
    coSignedXdr,
    currentPassphrase()
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

  const signed = await signWithFreighter(coSignedXdr, publicKey);
  const result = await getServer().submitTransaction(signed);

  return {
    hash: result.hash,
    newAccount,
    sponsor: publicKey,
    confirmed: result.successful !== false,
  };
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

export {
  inspectMultisigEnvelope,
  mergeEnvelopeSignatures,
  addSignatureToEnvelopeWithFreighter,
  submitMultisigEnvelope,
} from "./multisigEnvelope";
