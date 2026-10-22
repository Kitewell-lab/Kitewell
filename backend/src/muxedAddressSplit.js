/**
 * Stellar Muxed account address splitter and combiner.
 *
 * Implements SEP-0023 / CAP-0027 MED25519 muxed account address parsing
 * and creation using public, non-secret fields.
 *
 * An M-address wraps a standard 32-byte Ed25519 G-address together with an
 * 8-byte (64-bit unsigned big-endian integer) muxed account ID into a
 * single 69-character StrKey string.
 *
 * @module muxedAddressSplit
 */

import { StrKey } from "@stellar/stellar-sdk";

/**
 * Maximum 64-bit unsigned integer value (2^64 - 1).
 */
export const MAX_UINT64 = 18446744073709551615n;

/**
 * Custom error class for muxed address split and combine failures.
 */
export class MuxedAddressSplitError extends Error {
  /**
   * @param {string} message - Human-readable explanation.
   */
  constructor(message) {
    super(message);
    this.name = "MuxedAddressSplitError";
  }
}

/**
 * Tests whether a given address string is a valid Stellar MED25519 muxed address (M...).
 *
 * @param {string} address - Address string to test.
 * @returns {boolean} True if address is a valid M-address.
 */
export function isMuxedAddress(address) {
  if (typeof address !== "string") return false;
  try {
    return StrKey.isValidMed25519PublicKey(address.trim());
  } catch {
    return false;
  }
}

/**
 * Tests whether a given address string is a valid Stellar Ed25519 base address (G...).
 *
 * @param {string} address - Address string to test.
 * @returns {boolean} True if address is a valid G-address.
 */
export function isBaseAddress(address) {
  if (typeof address !== "string") return false;
  try {
    return StrKey.isValidEd25519PublicKey(address.trim());
  } catch {
    return false;
  }
}

/**
 * Splits a Stellar muxed account address (M...) into its base Ed25519 public key
 * (G...) and its 64-bit unsigned integer ID string.
 *
 * @param {string} address - The M-address (or optionally G-address) to split.
 * @param {Object} [options={}] - Optional split settings.
 * @param {boolean} [options.allowBaseAddress=false] - If true, permits raw G-addresses, returning id: null.
 * @returns {{ baseAddress: string, id: string|null, isMuxed: boolean }}
 *
 * @throws {TypeError} If address is not a string.
 * @throws {MuxedAddressSplitError} If address is malformed or invalid checksum.
 */
export function splitMuxedAddress(address, options = {}) {
  if (typeof address !== "string") {
    throw new TypeError("Address must be a string.");
  }

  const trimmed = address.trim();
  if (!trimmed) {
    throw new MuxedAddressSplitError("Address cannot be empty.");
  }

  const { allowBaseAddress = false } = options;

  if (isMuxedAddress(trimmed)) {
    try {
      const decoded = StrKey.decodeMed25519PublicKey(trimmed);
      if (decoded.length !== 40) {
        throw new MuxedAddressSplitError(
          `Decoded muxed payload must be 40 bytes, got ${decoded.length}`
        );
      }
      const pubkeyBuf = decoded.subarray(0, 32);
      const idBuf = decoded.subarray(32, 40);

      const baseAddress = StrKey.encodeEd25519PublicKey(pubkeyBuf);
      const idBigInt = idBuf.readBigUInt64BE(0);
      const id = idBigInt.toString(10);

      return {
        baseAddress,
        id,
        isMuxed: true,
      };
    } catch (err) {
      if (err instanceof MuxedAddressSplitError) throw err;
      throw new MuxedAddressSplitError(
        `Failed to decode muxed address: ${err.message}`
      );
    }
  }

  if (allowBaseAddress && isBaseAddress(trimmed)) {
    return {
      baseAddress: trimmed,
      id: null,
      isMuxed: false,
    };
  }

  if (isBaseAddress(trimmed)) {
    throw new MuxedAddressSplitError(
      "Expected an M-address, but received an un-muxed G-address. Set allowBaseAddress: true to permit this."
    );
  }

  throw new MuxedAddressSplitError(
    `Invalid Stellar muxed address: ${trimmed}`
  );
}

/**
 * Combines a base Stellar account address (G...) and a 64-bit numeric ID into
 * an MED25519 muxed address (M...).
 *
 * @param {string} baseAddress - The Ed25519 public key (G...).
 * @param {number|string|bigint} id - The 64-bit unsigned ID.
 * @returns {string} The encoded M-address.
 *
 * @throws {TypeError} If baseAddress is not a string.
 * @throws {MuxedAddressSplitError} If baseAddress or id is invalid or out of range.
 */
export function combineMuxedAddress(baseAddress, id) {
  if (typeof baseAddress !== "string") {
    throw new TypeError("Base address must be a string.");
  }

  const trimmed = baseAddress.trim();
  if (!isBaseAddress(trimmed)) {
    throw new MuxedAddressSplitError(
      `Invalid Stellar Ed25519 base address: ${trimmed}`
    );
  }

  if (id === null || id === undefined || id === "") {
    throw new MuxedAddressSplitError("Muxed account ID is required.");
  }

  let bigIntId;
  try {
    if (typeof id === "bigint") {
      bigIntId = id;
    } else if (typeof id === "number") {
      if (!Number.isInteger(id) || !Number.isFinite(id)) {
        throw new MuxedAddressSplitError(
          `Muxed account ID must be an integer, got: ${id}`
        );
      }
      bigIntId = BigInt(id);
    } else if (typeof id === "string") {
      const trimmedId = id.trim();
      if (!/^\d+$/.test(trimmedId)) {
        throw new MuxedAddressSplitError(
          `Muxed account ID string must contain only digits, got: ${id}`
        );
      }
      bigIntId = BigInt(trimmedId);
    } else {
      throw new MuxedAddressSplitError(
        `Unsupported muxed account ID type: ${typeof id}`
      );
    }
  } catch (err) {
    if (err instanceof MuxedAddressSplitError) throw err;
    throw new MuxedAddressSplitError(
      `Failed to parse muxed account ID: ${err.message}`
    );
  }

  if (bigIntId < 0n || bigIntId > MAX_UINT64) {
    throw new MuxedAddressSplitError(
      `Muxed account ID must be between 0 and ${MAX_UINT64.toString()}, got: ${bigIntId.toString()}`
    );
  }

  try {
    const pubkeyBuf = StrKey.decodeEd25519PublicKey(trimmed);
    const idBuf = Buffer.alloc(8);
    idBuf.writeBigUInt64BE(bigIntId);

    const combined = Buffer.concat([pubkeyBuf, idBuf]);
    return StrKey.encodeMed25519PublicKey(combined);
  } catch (err) {
    throw new MuxedAddressSplitError(
      `Failed to encode muxed address: ${err.message}`
    );
  }
}
