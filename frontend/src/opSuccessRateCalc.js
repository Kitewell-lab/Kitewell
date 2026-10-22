/**
 * Operation success-rate calculator.
 *
 * Computes the success/failure percentage from an array of operation records'
 * boolean `transaction_successful` / `successful` field, returning a
 * `{ successRate, total }` object.
 */

/**
 * Check whether an operation record represents a successful operation.
 *
 * @param {object} op
 * @returns {boolean}
 */
export function isOperationSuccessful(op) {
  if (typeof op.transaction_successful === "boolean") {
    return op.transaction_successful;
  }
  if (typeof op.successful === "boolean") {
    return op.successful;
  }
  return false;
}

/**
 * Calculate operation success and failure rates.
 *
 * @param {unknown} operations Array of operation records
 * @param {{ precision?: number }} [options={}] Optional formatting options
 * @returns {{
 *   successRate: number,
 *   total: number,
 *   successful: number,
 *   failed: number,
 *   formattedRate: string
 * }}
 * @throws {TypeError} When operations is not an array or an entry is not an object
 */
export function calculateOpSuccessRate(operations, options = {}) {
  if (!Array.isArray(operations)) {
    throw new TypeError("operations must be an array");
  }

  const precision = options?.precision ?? 1;

  if (operations.length === 0) {
    return {
      successRate: 0,
      total: 0,
      successful: 0,
      failed: 0,
      formattedRate: "0%",
    };
  }

  let successful = 0;

  for (const op of operations) {
    if (!op || typeof op !== "object") {
      throw new TypeError("each operation must be an object");
    }

    if (isOperationSuccessful(op)) {
      successful += 1;
    }
  }

  const total = operations.length;
  const failed = total - successful;
  const rawRate = (successful / total) * 100;
  const factor = 10 ** precision;
  const successRate = Math.round(rawRate * factor) / factor;
  const formattedRate = `${successRate.toFixed(precision)}%`;

  return {
    successRate,
    total,
    successful,
    failed,
    formattedRate,
  };
}

/**
 * Alias matching the module name.
 */
export const opSuccessRateCalc = calculateOpSuccessRate;

export default calculateOpSuccessRate;
