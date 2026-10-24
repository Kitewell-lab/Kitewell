/**
 * Reserve ratio display formatter.
 *
 * Formats an account's native balance and its base reserve requirement into
 * a `{ usedReserves, availableBalance }` display pair using BigInt-safe stroop
 * arithmetic, given the base reserve and subentry count as input.
 *
 * Stellar reserve rules:
 *   1. Minimum balance (used reserves) = (2 + subentryCount) * baseReserve
 *      - 2 base reserves for the account itself
 *      - 1 base reserve per subentry (trustline, offer, data entry, signer, etc.)
 *   2. Available balance = max(0, nativeBalance - usedReserves)
 *   3. All arithmetic is calculated in integer stroops (1 XLM = 10^7 stroops).
 */

import {
  STROOPS_PER_XLM,
  DEFAULT_BASE_RESERVE_STROOPS,
  ACCOUNT_BASE_RESERVE_MULTIPLIER,
  RESERVE_FORMAT_ERROR,
} from "./inflationPoolShareFormatConstants.js";

/**
 * Parse an amount string, number, or bigint into integer stroops.
 *
 * @param {string|number|bigint} value
 * @param {string} [label="amount"]
 * @returns {bigint}
 * @throws {TypeError} When value cannot be parsed
 * @throws {RangeError} When value is negative
 */
export function amountToStroops(value, label = "amount") {
  if (typeof value === "bigint") {
    if (value < 0n) throw new RangeError(`${label} ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new TypeError(`Invalid ${label} format: "${value}"`);
    }
    if (value < 0) {
      throw new RangeError(`${label} ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
    }
  }

  if (value == null) {
    throw new TypeError(`${label} is required`);
  }

  const text = String(value).trim();
  if (!text) {
    throw new TypeError(`${label} cannot be empty`);
  }

  if (text.startsWith("-")) {
    throw new RangeError(`${label} ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
  }

  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new TypeError(`Invalid ${label} format: "${text}"`);
  }

  const [intPart = "0", fracPartRaw = ""] = text.split(".");
  const fracPart = fracPartRaw.slice(0, 7).padEnd(7, "0");
  const stroops = BigInt(intPart) * STROOPS_PER_XLM + BigInt(fracPart);
  if (stroops < 0n) {
    throw new RangeError(`${label} ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
  }
  return stroops;
}

/**
 * Format integer stroops to a 7-decimal Stellar amount string.
 *
 * @param {bigint} stroops
 * @returns {string}
 */
export function stroopsToAmount(stroops) {
  if (typeof stroops !== "bigint") {
    throw new TypeError("stroops must be a bigint");
  }
  if (stroops < 0n) {
    throw new RangeError("stroops cannot be negative");
  }
  const intPart = stroops / STROOPS_PER_XLM;
  const fracPart = stroops % STROOPS_PER_XLM;
  return `${intPart}.${fracPart.toString().padStart(7, "0")}`;
}

/**
 * Format account reserve ratio and available balance.
 *
 * Supports both positional parameters:
 *   `formatReserveRatio(nativeBalance, baseReserve, subentryCount)`
 * and options object:
 *   `formatReserveRatio({ nativeBalance, baseReserve, subentryCount })`
 *
 * @param {string|number|bigint|object} nativeBalanceOrOptions
 * @param {string|number|bigint} [baseReserveInput] Base reserve (e.g. "0.5" or 5000000n)
 * @param {number|bigint} [subentryCountInput=0] Number of account subentries
 * @returns {{ usedReserves: string, availableBalance: string, usedReservesStroops: bigint, availableBalanceStroops: bigint }}
 * @throws {TypeError} When arguments are missing or invalid
 * @throws {RangeError} When any value or count is negative
 */
export function formatReserveRatio(
  nativeBalanceOrOptions,
  baseReserveInput = DEFAULT_BASE_RESERVE_STROOPS,
  subentryCountInput = 0,
) {
  let nativeRaw;
  let baseReserveRaw = baseReserveInput;
  let subentriesRaw = subentryCountInput;

  if (
    typeof nativeBalanceOrOptions === "object" &&
    nativeBalanceOrOptions !== null &&
    typeof nativeBalanceOrOptions !== "bigint"
  ) {
    nativeRaw = nativeBalanceOrOptions.nativeBalance ?? nativeBalanceOrOptions.balance;
    baseReserveRaw = nativeBalanceOrOptions.baseReserve ?? DEFAULT_BASE_RESERVE_STROOPS;
    subentriesRaw =
      nativeBalanceOrOptions.subentryCount ??
      nativeBalanceOrOptions.subentry_count ??
      0;
  } else {
    nativeRaw = nativeBalanceOrOptions;
  }

  if (nativeRaw === undefined || nativeRaw === null) {
    throw new TypeError(RESERVE_FORMAT_ERROR.BALANCE_REQUIRED);
  }

  const nativeStroops = amountToStroops(nativeRaw, "nativeBalance");
  const baseReserveStroops = amountToStroops(baseReserveRaw, "baseReserve");

  let subentriesBig;
  if (typeof subentriesRaw === "number") {
    if (!Number.isInteger(subentriesRaw)) {
      throw new TypeError(RESERVE_FORMAT_ERROR.INVALID_SUBENTRY);
    }
    if (subentriesRaw < 0) {
      throw new RangeError(`subentryCount ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
    }
    subentriesBig = BigInt(subentriesRaw);
  } else if (typeof subentriesRaw === "bigint") {
    if (subentriesRaw < 0n) {
      throw new RangeError(`subentryCount ${RESERVE_FORMAT_ERROR.NEGATIVE}`);
    }
    subentriesBig = subentriesRaw;
  } else {
    throw new TypeError("subentryCount must be an integer or bigint");
  }

  // Minimum required balance = (2 + subentries) * baseReserve
  const usedReservesStroops =
    (ACCOUNT_BASE_RESERVE_MULTIPLIER + subentriesBig) * baseReserveStroops;

  // Available balance cannot be negative
  const availableBalanceStroops =
    nativeStroops > usedReservesStroops
      ? nativeStroops - usedReservesStroops
      : 0n;

  return {
    usedReserves: stroopsToAmount(usedReservesStroops),
    availableBalance: stroopsToAmount(availableBalanceStroops),
    usedReservesStroops,
    availableBalanceStroops,
  };
}

/**
 * Alias matching module name.
 */
export const inflationPoolShareFormat = formatReserveRatio;

export {
  STROOPS_PER_XLM,
  DEFAULT_BASE_RESERVE_STROOPS,
  ACCOUNT_BASE_RESERVE_MULTIPLIER,
  RESERVE_FORMAT_ERROR,
};

export default formatReserveRatio;
