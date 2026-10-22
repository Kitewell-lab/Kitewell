/**
 * Block explorer link builder.
 *
 * Builds a stellar.expert (or configurable base URL) deep link for an account,
 * transaction, or operation id given its type and id string, validating the id
 * shape per entity type before building the URL.
 */

export const DEFAULT_EXPLORER_BASE = "https://stellar.expert/explorer";
export const SUPPORTED_NETWORKS = new Set(["public", "testnet", "futurenet"]);
export const SUPPORTED_TYPES = new Set([
  "account",
  "tx",
  "op",
  "transaction",
  "operation",
]);

const ACCOUNT_ID_REGEX = /^G[A-Z2-7]{55}$/;
const TX_HASH_REGEX = /^[0-9a-fA-F]{64}$/;
const OP_ID_REGEX = /^\d+$/;

/**
 * Validate that an entity ID conforms to the required shape for its type.
 *
 * @param {string} type "account" | "tx" | "transaction" | "op" | "operation"
 * @param {unknown} id
 * @returns {string} The trimmed valid entity id
 * @throws {TypeError} When type or id has invalid type
 * @throws {RangeError} When type is unsupported or id fails shape validation
 */
export function validateEntityId(type, id) {
  if (typeof type !== "string") {
    throw new TypeError("Entity type must be a string");
  }
  const normType = type.trim().toLowerCase();
  if (!SUPPORTED_TYPES.has(normType)) {
    throw new RangeError(
      `Unsupported entity type "${type}". Allowed: account, tx, op, transaction, operation`,
    );
  }

  if (typeof id !== "string" && typeof id !== "number" && typeof id !== "bigint") {
    throw new TypeError("Entity ID must be a string, number, or bigint");
  }
  const idStr = String(id).trim();
  if (!idStr) {
    throw new RangeError("Entity ID must not be empty");
  }

  switch (normType) {
    case "account":
      if (!ACCOUNT_ID_REGEX.test(idStr)) {
        throw new RangeError(
          `Invalid Stellar account public key format: "${idStr}"`,
        );
      }
      break;
    case "tx":
    case "transaction":
      if (!TX_HASH_REGEX.test(idStr)) {
        throw new RangeError(
          `Invalid transaction hash format (must be 64-character hex): "${idStr}"`,
        );
      }
      break;
    case "op":
    case "operation":
      if (!OP_ID_REGEX.test(idStr)) {
        throw new RangeError(
          `Invalid operation ID format (must be numeric digits): "${idStr}"`,
        );
      }
      break;
  }

  return idStr;
}

/**
 * Build a block explorer deep link.
 *
 * @param {string} type "account" | "tx" | "op" | "transaction" | "operation"
 * @param {string|number|bigint} id The entity identifier
 * @param {{
 *   network?: "public" | "testnet" | "futurenet" | string,
 *   baseUrl?: string
 * }} [options={}]
 * @returns {string} The full deep link URL
 */
export function buildExplorerLink(type, id, options = {}) {
  const normType = type?.trim()?.toLowerCase();
  const validId = validateEntityId(type, id);

  // Normalize path segment ("transaction" -> "tx", "operation" -> "op")
  const pathType =
    normType === "transaction" ? "tx" : normType === "operation" ? "op" : normType;

  const rawNetwork = options.network ?? "testnet";
  const normNetwork = String(rawNetwork).trim().toLowerCase();
  if (!SUPPORTED_NETWORKS.has(normNetwork)) {
    throw new RangeError(
      `Unsupported explorer network "${rawNetwork}". Allowed: public, testnet, futurenet`,
    );
  }

  const rawBase = options.baseUrl ?? DEFAULT_EXPLORER_BASE;
  const baseUrl = String(rawBase).trim().replace(/\/+$/, "");

  return `${baseUrl}/${normNetwork}/${pathType}/${validId}`;
}

export const explorerLinkBuilder = buildExplorerLink;
export default buildExplorerLink;
