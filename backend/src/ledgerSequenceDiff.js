/**
 * Ledger sequence difference calculator.
 *
 * Computes the non-negative ledger count difference between two ledger sequence numbers,
 * rejecting non-integer or negative inputs and clarifying which argument is newer.
 */

import {
  LEDGER_SEQUENCE_ARGUMENT,
  LEDGER_SEQUENCE_ERROR,
  LEDGER_SEQUENCE_SIGN,
} from "./ledgerSequenceDiffConstants.js";

/**
 * Coerce an input sequence number into a non-negative BigInt.
 *
 * @param {unknown} value
 * @param {string} label
 * @returns {bigint}
 * @throws {TypeError} When value is not an integer, is empty, or has an invalid format
 * @throws {RangeError} When value is negative
 */
export function parseLedgerSequence(value, label = "ledger sequence") {
  if (value === undefined || value === null) {
    throw new TypeError(`${label} ${LEDGER_SEQUENCE_ERROR.REQUIRED}`);
  }

  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new RangeError(`${label} ${LEDGER_SEQUENCE_ERROR.NEGATIVE}`);
    }
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new TypeError(`${label} ${LEDGER_SEQUENCE_ERROR.VALID_NUMBER}`);
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`${label} ${LEDGER_SEQUENCE_ERROR.INTEGER}`);
    }
    if (value < 0) {
      throw new RangeError(`${label} ${LEDGER_SEQUENCE_ERROR.NEGATIVE}`);
    }
    return BigInt(value);
  }

  const text = String(value).trim();
  if (!text) {
    throw new TypeError(`${label} ${LEDGER_SEQUENCE_ERROR.EMPTY}`);
  }

  if (text.startsWith("-")) {
    throw new RangeError(`${label} ${LEDGER_SEQUENCE_ERROR.NEGATIVE}`);
  }

  if (!/^\d+$/.test(text)) {
    throw new TypeError(`Invalid ${label} integer format: "${text}"`);
  }

  return BigInt(text);
}

/**
 * Calculate the non-negative ledger count difference between two ledger sequence numbers.
 *
 * Supports both positional parameters:
 *   `calculateLedgerDiff(first, second)`
 * and options object:
 *   `calculateLedgerDiff({ first, second })`
 *
 * @param {number|bigint|string|object} firstInput
 * @param {number|bigint|string} [secondInput]
 * @returns {{
 *   difference: number,
 *   differenceBigInt: bigint,
 *   newer: "first" | "second" | null,
 *   older: "first" | "second" | null,
 *   sign: 1 | -1 | 0,
 *   isEqual: boolean
 * }}
 * @throws {TypeError} When inputs are missing, non-integer, or invalid
 * @throws {RangeError} When inputs are negative
 */
export function calculateLedgerDiff(firstInput, secondInput) {
  let firstRaw;
  let secondRaw;

  if (
    typeof firstInput === "object" &&
    firstInput !== null &&
    typeof firstInput !== "bigint"
  ) {
    firstRaw = firstInput.first ?? firstInput.seqA ?? firstInput.current ?? firstInput.a;
    secondRaw = firstInput.second ?? firstInput.seqB ?? firstInput.previous ?? firstInput.b;
  } else {
    firstRaw = firstInput;
    secondRaw = secondInput;
  }

  const firstSeq = parseLedgerSequence(firstRaw, "first sequence");
  const secondSeq = parseLedgerSequence(secondRaw, "second sequence");

  let diffBig;
  let newer;
  let older;
  let sign;

  if (firstSeq > secondSeq) {
    diffBig = firstSeq - secondSeq;
    newer = LEDGER_SEQUENCE_ARGUMENT.FIRST;
    older = LEDGER_SEQUENCE_ARGUMENT.SECOND;
    sign = LEDGER_SEQUENCE_SIGN.FIRST_NEWER;
  } else if (secondSeq > firstSeq) {
    diffBig = secondSeq - firstSeq;
    newer = LEDGER_SEQUENCE_ARGUMENT.SECOND;
    older = LEDGER_SEQUENCE_ARGUMENT.FIRST;
    sign = LEDGER_SEQUENCE_SIGN.SECOND_NEWER;
  } else {
    diffBig = 0n;
    newer = LEDGER_SEQUENCE_ARGUMENT.NEITHER;
    older = LEDGER_SEQUENCE_ARGUMENT.NEITHER;
    sign = LEDGER_SEQUENCE_SIGN.EQUAL;
  }

  const diffNumber =
    diffBig <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(diffBig)
      : Number.MAX_SAFE_INTEGER;

  return {
    difference: diffNumber,
    differenceBigInt: diffBig,
    newer,
    older,
    sign,
    isEqual: sign === 0,
  };
}

/**
 * Alias matching the module name.
 */
export const ledgerSequenceDiff = calculateLedgerDiff;

export {
  LEDGER_SEQUENCE_ARGUMENT,
  LEDGER_SEQUENCE_ERROR,
  LEDGER_SEQUENCE_SIGN,
};

export default calculateLedgerDiff;
