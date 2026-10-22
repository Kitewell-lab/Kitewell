/**
 * Ledger sequence difference calculator.
 *
 * Computes the non-negative ledger count difference between two ledger sequence numbers,
 * rejecting non-integer or negative inputs and clarifying which argument is newer.
 */

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
    throw new TypeError(`${label} is required`);
  }

  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new RangeError(`${label} cannot be negative`);
    }
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new TypeError(`${label} must be a valid number`);
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`${label} must be an integer`);
    }
    if (value < 0) {
      throw new RangeError(`${label} cannot be negative`);
    }
    return BigInt(value);
  }

  const text = String(value).trim();
  if (!text) {
    throw new TypeError(`${label} cannot be empty`);
  }

  if (text.startsWith("-")) {
    throw new RangeError(`${label} cannot be negative`);
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
    newer = "first";
    older = "second";
    sign = 1;
  } else if (secondSeq > firstSeq) {
    diffBig = secondSeq - firstSeq;
    newer = "second";
    older = "first";
    sign = -1;
  } else {
    diffBig = 0n;
    newer = null;
    older = null;
    sign = 0;
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

export default calculateLedgerDiff;
