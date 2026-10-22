/**
 * Fee bump minimum fee calculator.
 *
 * Implements CAP-0015 fee-bump transaction minimum fee calculation using pure
 * BigInt arithmetic without XDR parsing or signing dependencies.
 *
 * Under CAP-0015, the operation count of a fee-bump transaction is:
 *   effectiveOps = innerOpCount + 1
 * And the total minimum inclusion fee is:
 *   totalFee = (innerOpCount + 1) * perOpFee + resourceFee
 *
 * @module feeBumpFeeCalc
 */

/**
 * Standard Stellar network minimum base fee per operation (100 stroops = 0.00001 XLM).
 */
export const DEFAULT_BASE_FEE_STROOPS = 100n;

/**
 * Number of stroops in 1 XLM (10^7).
 */
export const STROOPS_PER_XLM = 10_000_000n;

/**
 * Custom error class for fee bump fee calculation failures.
 */
export class FeeBumpFeeCalcError extends Error {
  /**
   * @param {string} message - Human-readable explanation.
   */
  constructor(message) {
    super(message);
    this.name = "FeeBumpFeeCalcError";
  }
}

/**
 * Parses and validates an integer input into a BigInt.
 *
 * @private
 * @param {unknown} value - Value to validate.
 * @param {string} paramName - Parameter name for error messages.
 * @param {boolean} [allowZero=false] - Whether zero is permissible.
 * @returns {bigint} Parsed non-negative BigInt.
 */
function toValidBigInt(value, paramName, allowZero = false) {
  if (value === null || value === undefined) {
    throw new TypeError(`${paramName} is required.`);
  }

  let bi;
  if (typeof value === "bigint") {
    bi = value;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new TypeError(`${paramName} must be a finite integer.`);
    }
    bi = BigInt(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new TypeError(`${paramName} must be an integer string.`);
    }
    bi = BigInt(trimmed);
  } else {
    throw new TypeError(`Unsupported ${paramName} type: ${typeof value}`);
  }

  if (allowZero) {
    if (bi < 0n) {
      throw new RangeError(`${paramName} must be non-negative (>= 0).`);
    }
  } else {
    if (bi <= 0n) {
      throw new RangeError(`${paramName} must be positive (> 0).`);
    }
  }

  return bi;
}

/**
 * Calculates the minimum fee in stroops required for a CAP-15 fee-bump transaction.
 *
 * @param {number|string|bigint} innerOpCount - Number of operations in the inner transaction.
 * @param {number|string|bigint} [perOpFee=DEFAULT_BASE_FEE_STROOPS] - Desired fee rate per operation in stroops.
 * @param {Object} [options={}] - Additional calculation options.
 * @param {number|string|bigint} [options.resourceFee=0n] - Soroban resource fee in stroops.
 * @param {number|string|bigint} [options.innerTxFee] - Existing inner transaction fee to enforce as lower bound.
 * @returns {bigint} Total minimum fee in stroops.
 *
 * @throws {TypeError} If any argument is non-numeric or non-integer.
 * @throws {RangeError} If innerOpCount is non-positive or fees are negative.
 *
 * @example
 * calculateFeeBumpFee(1, 100);
 * // => 200n ((1 + 1) * 100)
 *
 * @example
 * calculateFeeBumpFee(2, 200, { resourceFee: 50 });
 * // => 650n ((2 + 1) * 200 + 50)
 */
export function calculateFeeBumpFee(
  innerOpCount,
  perOpFee = DEFAULT_BASE_FEE_STROOPS,
  options = {}
) {
  const ops = toValidBigInt(innerOpCount, "innerOpCount", false);
  const rate = toValidBigInt(perOpFee, "perOpFee", true);

  const resourceFee =
    options.resourceFee !== undefined
      ? toValidBigInt(options.resourceFee, "resourceFee", true)
      : 0n;

  // CAP-15: Effective operations = inner operations + 1
  const effectiveOps = ops + 1n;
  let totalFee = effectiveOps * rate + resourceFee;

  if (options.innerTxFee !== undefined) {
    const innerFee = toValidBigInt(options.innerTxFee, "innerTxFee", true);
    if (totalFee < innerFee) {
      totalFee = innerFee;
    }
  }

  return totalFee;
}

/**
 * Formats a BigInt stroop amount into an XLM decimal string.
 *
 * @param {bigint} stroops - Amount in stroops.
 * @returns {string} XLM string representation.
 */
export function formatStroopsToXlm(stroops) {
  if (typeof stroops !== "bigint") {
    throw new TypeError("stroops must be a BigInt.");
  }
  const whole = stroops / STROOPS_PER_XLM;
  const rem = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0");
  const trimmed = rem.replace(/0+$/, "");
  return trimmed ? `${whole.toString()}.${trimmed}` : whole.toString();
}

/**
 * Computes detailed fee-bump metrics including XLM formatting and operational breakdown.
 *
 * @param {number|string|bigint} innerOpCount - Number of operations in inner transaction.
 * @param {number|string|bigint} [perOpFee=DEFAULT_BASE_FEE_STROOPS] - Desired fee rate per operation.
 * @param {Object} [options={}] - Additional calculation options.
 * @returns {{
 *   feeStroops: bigint,
 *   feeXlm: string,
 *   innerOpCount: bigint,
 *   effectiveOpCount: bigint,
 *   perOpFeeStroops: bigint,
 *   resourceFeeStroops: bigint
 * }}
 */
export function calculateFeeBumpFeeDetails(
  innerOpCount,
  perOpFee = DEFAULT_BASE_FEE_STROOPS,
  options = {}
) {
  const feeStroops = calculateFeeBumpFee(innerOpCount, perOpFee, options);
  const ops = toValidBigInt(innerOpCount, "innerOpCount", false);
  const rate = toValidBigInt(perOpFee, "perOpFee", true);
  const resourceFee =
    options.resourceFee !== undefined
      ? toValidBigInt(options.resourceFee, "resourceFee", true)
      : 0n;

  return {
    feeStroops,
    feeXlm: formatStroopsToXlm(feeStroops),
    innerOpCount: ops,
    effectiveOpCount: ops + 1n,
    perOpFeeStroops: rate,
    resourceFeeStroops: resourceFee,
  };
}

export const feeBumpFeeCalc = calculateFeeBumpFee;
export default calculateFeeBumpFee;
