/**
 * Operation-count fee estimator.
 *
 * Computes the total transaction fee in stroops as baseFeeStroops * operationCount
 * using BigInt-safe arithmetic, rejecting non-positive or non-integer operation counts.
 */

/**
 * Standard Stellar network minimum base fee per operation (100 stroops = 0.00001 XLM).
 */
export const DEFAULT_BASE_FEE_STROOPS = 100n;

/**
 * Number of stroops per 1 XLM.
 */
export const STROOPS_PER_XLM = 10_000_000n;

/**
 * Validates and converts an operation count to BigInt.
 *
 * @param {unknown} count
 * @returns {bigint}
 * @throws {TypeError} If count is not an integer or valid number/string/bigint
 * @throws {RangeError} If count is non-positive (<= 0)
 */
export function validateOperationCount(count) {
  if (typeof count === "bigint") {
    if (count <= 0n) {
      throw new RangeError("operationCount must be positive (greater than 0)");
    }
    return count;
  }

  if (count == null || (typeof count !== "number" && typeof count !== "string")) {
    throw new TypeError("operationCount must be an integer number, string, or bigint");
  }

  if (typeof count === "string") {
    const text = count.trim();
    if (!text) {
      throw new TypeError("operationCount must not be empty");
    }
    const num = Number(text);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      throw new TypeError("operationCount must be a finite integer");
    }
    if (num <= 0) {
      throw new RangeError("operationCount must be positive (greater than 0)");
    }
    return BigInt(num);
  }

  const num = count;
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new TypeError("operationCount must be a finite integer");
  }

  if (num <= 0) {
    throw new RangeError("operationCount must be positive (greater than 0)");
  }

  return BigInt(num);
}

/**
 * Validates and converts base fee to BigInt stroops.
 *
 * @param {unknown} fee
 * @returns {bigint}
 * @throws {TypeError} If fee is not a valid number/string/bigint
 * @throws {RangeError} If fee is negative (< 0)
 */
export function validateBaseFee(fee) {
  if (typeof fee === "bigint") {
    if (fee < 0n) {
      throw new RangeError("baseFeeStroops must be non-negative");
    }
    return fee;
  }

  if (fee == null || (typeof fee !== "number" && typeof fee !== "string")) {
    throw new TypeError("baseFeeStroops must be a number, string, or bigint");
  }

  const num = typeof fee === "string" ? Number(fee.trim()) : fee;
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new TypeError("baseFeeStroops must be an integer");
  }

  if (num < 0) {
    throw new RangeError("baseFeeStroops must be non-negative");
  }

  return BigInt(num);
}

/**
 * Compute the total transaction fee in stroops.
 *
 * @param {number|string|bigint} operationCount Number of operations in transaction
 * @param {number|string|bigint} [baseFeeStroops=DEFAULT_BASE_FEE_STROOPS] Base fee per operation in stroops
 * @returns {bigint} Total fee in stroops
 */
export function estimateOpCountFee(
  operationCount,
  baseFeeStroops = DEFAULT_BASE_FEE_STROOPS,
) {
  const ops = validateOperationCount(operationCount);
  const base = validateBaseFee(baseFeeStroops);
  return ops * base;
}

/**
 * Detailed fee estimation returning both stroops and XLM formatting.
 *
 * @param {number|string|bigint} operationCount
 * @param {number|string|bigint} [baseFeeStroops=DEFAULT_BASE_FEE_STROOPS]
 * @returns {{
 *   feeStroops: bigint,
 *   feeXlm: string,
 *   operationCount: bigint,
 *   baseFeeStroops: bigint
 * }}
 */
export function estimateFeeDetails(
  operationCount,
  baseFeeStroops = DEFAULT_BASE_FEE_STROOPS,
) {
  const feeStroops = estimateOpCountFee(operationCount, baseFeeStroops);
  const ops = validateOperationCount(operationCount);
  const base = validateBaseFee(baseFeeStroops);

  const wholeXlm = feeStroops / STROOPS_PER_XLM;
  const remStroops = (feeStroops % STROOPS_PER_XLM).toString().padStart(7, "0");
  const trimmedFrac = remStroops.replace(/0+$/, "");
  const feeXlm = trimmedFrac ? `${wholeXlm}.${trimmedFrac}` : `${wholeXlm}`;

  return {
    feeStroops,
    feeXlm,
    operationCount: ops,
    baseFeeStroops: base,
  };
}

export const opCountFeeEstimate = estimateOpCountFee;
export default estimateOpCountFee;
