/**
 * @file feeStatsFormat.js
 * @description Formats Horizon /fee_stats percentile fields (p10..p99, min, max, mode) into ordered arrays of { label, stroops } rows for fee-chart UI display.
 */

/**
 * Standard fee stats keys in display order.
 */
export const DEFAULT_FEE_STAT_KEYS = Object.freeze([
  'min',
  'p10',
  'p20',
  'p30',
  'p40',
  'p50',
  'p60',
  'p70',
  'p80',
  'p90',
  'p95',
  'p99',
  'max',
  'mode'
]);

/**
 * Custom error thrown when Horizon fee stats input is invalid or missing required metrics.
 */
export class InvalidFeeStatsError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidFeeStatsError';
    this.context = context;
  }
}

/**
 * Parses and validates an individual stroop fee value.
 *
 * @param {*} value - Raw stroop value (string, number, bigint)
 * @param {string} key - Field key (e.g. 'p10', 'min')
 * @param {boolean} [asNumber=true] - Whether to return number or raw string
 * @returns {number|string}
 * @throws {InvalidFeeStatsError}
 */
function parseStroopValue(value, key, asNumber = true) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidFeeStatsError(
      `Fee stat field "${key}" is required and cannot be empty`,
      { key, value }
    );
  }

  let str;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidFeeStatsError(
        `Fee stat field "${key}" must be an integer, got ${value}`,
        { key, value }
      );
    }
    if (value < 0) {
      throw new InvalidFeeStatsError(
        `Fee stat field "${key}" cannot be negative, got ${value}`,
        { key, value }
      );
    }
    str = String(value);
  } else if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new InvalidFeeStatsError(
        `Fee stat field "${key}" cannot be negative, got ${value.toString()}`,
        { key, value }
      );
    }
    str = value.toString();
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidFeeStatsError(
        `Fee stat field "${key}" must be a non-negative integer string, got "${value}"`,
        { key, value }
      );
    }
    str = trimmed;
  } else {
    throw new InvalidFeeStatsError(
      `Fee stat field "${key}" must be a number, string, or bigint, got ${typeof value}`,
      { key, value }
    );
  }

  if (asNumber) {
    const num = Number(str);
    if (!Number.isSafeInteger(num)) {
      // If outside safe integer range, preserve as number if possible or handle gracefully
      return num;
    }
    return num;
  }

  return str;
}

/**
 * Resolves the fee stats container object from either a full /fee_stats payload or a direct stats map.
 *
 * @param {*} payload - Raw payload
 * @param {string} [category='fee_charged'] - Sub-object category ('fee_charged' or 'max_fee')
 * @returns {Object} Target stats object containing percentile fields
 * @throws {InvalidFeeStatsError}
 */
function resolveStatsObject(payload, category = 'fee_charged') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new InvalidFeeStatsError(
      `Fee stats payload must be a non-null object, got ${payload === null ? 'null' : typeof payload}`,
      { payload }
    );
  }

  // If payload contains the specified category object, use that
  if (category && payload[category] && typeof payload[category] === 'object' && !Array.isArray(payload[category])) {
    return payload[category];
  }

  // If payload contains fee_charged or max_fee as fallback
  if (payload.fee_charged && typeof payload.fee_charged === 'object' && !Array.isArray(payload.fee_charged)) {
    return payload.fee_charged;
  }

  // If payload directly looks like a stats map (e.g. contains 'min', 'max', or 'p50')
  const hasDirectMetric = ['min', 'max', 'mode', 'p10', 'p50'].some((k) => k in payload);
  if (hasDirectMetric) {
    return payload;
  }

  throw new InvalidFeeStatsError(
    `Payload does not contain valid fee stats or category "${category}"`,
    { payload, category }
  );
}

/**
 * Formats a Horizon /fee_stats response object into an ordered array of { label, stroops } rows for fee chart UI.
 *
 * @param {Object} rawStats - Raw /fee_stats Horizon JSON response or stats map
 * @param {Object} [options={}] - Formatting options
 * @param {string} [options.category='fee_charged'] - Category to format ('fee_charged' | 'max_fee')
 * @param {boolean} [options.asNumber=true] - Whether stroops values are returned as numbers (true) or strings (false)
 * @param {boolean} [options.includeMode=true] - Whether to include the 'mode' metric
 * @param {boolean} [options.includeMinMax=true] - Whether to include 'min' and 'max' metrics
 * @param {string[]} [options.keys] - Optional explicit keys order to extract
 * @returns {Array<{ label: string, stroops: number|string }>} Ordered array of { label, stroops }
 * @throws {InvalidFeeStatsError} If input or required fields are invalid
 */
export function formatFeeStats(rawStats, options = {}) {
  const {
    category = 'fee_charged',
    asNumber = true,
    includeMode = true,
    includeMinMax = true,
    keys = null
  } = options;

  const statsObj = resolveStatsObject(rawStats, category);

  let targetKeys = Array.isArray(keys) && keys.length > 0 ? keys : DEFAULT_FEE_STAT_KEYS;

  if (!Array.isArray(keys)) {
    targetKeys = targetKeys.filter((k) => {
      if (!includeMode && k === 'mode') return false;
      if (!includeMinMax && (k === 'min' || k === 'max')) return false;
      return true;
    });
  }

  const rows = [];
  let foundAny = false;

  for (const key of targetKeys) {
    if (key in statsObj && statsObj[key] !== undefined && statsObj[key] !== null) {
      const stroops = parseStroopValue(statsObj[key], key, asNumber);
      rows.push({ label: key, stroops });
      foundAny = true;
    } else {
      // If using explicit keys array, missing fields throw
      if (Array.isArray(keys)) {
        throw new InvalidFeeStatsError(`Specified key "${key}" not found in fee stats`, { key, statsObj });
      }
    }
  }

  if (!foundAny) {
    throw new InvalidFeeStatsError('No valid fee stat metrics found in target object', { statsObj });
  }

  return rows;
}

/**
 * Checks whether an input object represents valid fee stats.
 *
 * @param {*} rawStats - Input to validate
 * @param {Object} [options={}] - Validation options
 * @returns {boolean} True if formatting would succeed
 */
export function isValidFeeStats(rawStats, options = {}) {
  try {
    const result = formatFeeStats(rawStats, options);
    return Array.isArray(result) && result.length > 0;
  } catch (err) {
    if (err instanceof InvalidFeeStatsError) {
      return false;
    }
    throw err;
  }
}

/**
 * Safely formats fee stats without throwing on invalid input, returning fallback.
 *
 * @param {*} rawStats - Input to format
 * @param {Object} [options={}] - Options
 * @param {*} [fallback=[]] - Fallback value on invalid input
 * @returns {Array<{ label: string, stroops: number|string }>|*}
 */
export function tryFormatFeeStats(rawStats, options = {}, fallback = []) {
  try {
    return formatFeeStats(rawStats, options);
  } catch (err) {
    if (err instanceof InvalidFeeStatsError) {
      return fallback;
    }
    throw err;
  }
}
