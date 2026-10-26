import {
  DEFAULT_OPTIONS,
  SUCCESS_FIELD_PRIMARY,
  SUCCESS_FIELD_SECONDARY,
} from "./opSuccessRateCalcConstants.js";

/**
 * Determines whether an operation record represents a successful transaction.
 *
 * Checks `transaction_successful` first, then falls back to `successful`.
 *
 * @param {object} record An operation item from Horizon or indexer API.
 * @param {boolean} strict When true, throws if no boolean success field is present.
 * @returns {boolean} True if successful, false otherwise.
 * @throws {TypeError} When record is not a valid object or lacks valid success flags.
 */
function isOpSuccessful(record, strict = true) {
  if (!record || typeof record !== "object") {
    throw new TypeError("Operation record must be a non-null object.");
  }

  if (typeof record[SUCCESS_FIELD_PRIMARY] === "boolean") {
    return record[SUCCESS_FIELD_PRIMARY];
  }

  if (typeof record[SUCCESS_FIELD_SECONDARY] === "boolean") {
    return record[SUCCESS_FIELD_SECONDARY];
  }

  if (strict) {
    throw new TypeError(
      `Operation record must contain a boolean '${SUCCESS_FIELD_PRIMARY}' or '${SUCCESS_FIELD_SECONDARY}' field.`
    );
  }

  return false;
}

/**
 * Calculates operation success-rate statistics from an array of operation records.
 *
 * Computes the ratio of successful operations over the total number of operations,
 * supporting Horizon records (`transaction_successful`) and generic records (`successful`).
 *
 * @param {Array<object>} operations Array of operation records.
 * @param {object} [options={}] Optional configuration.
 * @param {boolean} [options.asPercentage=false] Return rate as 0..100 instead of 0..1.
 * @param {number|null} [options.precision=null] Decimal places to round the rate to.
 * @param {boolean} [options.strict=true] Enforce strict boolean presence on each record.
 * @returns {{ successRate: number, successful: number, failed: number, total: number }}
 * @throws {TypeError} When operations is not an array or records are invalid.
 */
export function calculateOpSuccessRate(operations, options = {}) {
  if (!Array.isArray(operations)) {
    throw new TypeError("Operations must be an array.");
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const total = operations.length;

  if (total === 0) {
    return {
      successRate: 0,
      successful: 0,
      failed: 0,
      total: 0,
    };
  }

  let successful = 0;
  for (let i = 0; i < total; i++) {
    if (isOpSuccessful(operations[i], opts.strict)) {
      successful++;
    }
  }

  const failed = total - successful;
  let rawRate = successful / total;

  if (opts.asPercentage) {
    rawRate *= 100;
  }

  let finalRate = rawRate;
  if (typeof opts.precision === "number" && opts.precision >= 0) {
    const factor = Math.pow(10, Math.floor(opts.precision));
    finalRate = Math.round(rawRate * factor) / factor;
  }

  return {
    successRate: finalRate,
    successful,
    failed,
    total,
  };
}

/**
 * Formats a success rate number as a display percentage string.
 *
 * @param {number} rate Rate value (0..1 if raw, or 0..100 if already percentage).
 * @param {object} [options={}] Formatting options.
 * @param {boolean} [options.isPercentage=false] Set true if input rate is already 0..100.
 * @param {number} [options.decimals=2] Number of decimal places in string output.
 * @returns {string} Formatted percentage string, e.g. "95.50%".
 */
export function formatSuccessRate(rate, options = {}) {
  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new TypeError("Rate must be a valid number.");
  }

  const { isPercentage = false, decimals = 2 } = options;
  const pct = isPercentage ? rate : rate * 100;
  return `${pct.toFixed(decimals)}%`;
}

export default calculateOpSuccessRate;
