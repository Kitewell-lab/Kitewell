/**
 * @file feeStatsFormat.js
 * @description Formats Horizon /fee_stats responses into an ordered array of { label, stroops } rows for fee charts.
 */

/**
 * Standard ordered percentile and extreme value fields for Horizon fee statistics.
 */
export const FEE_STATS_FIELD_SPECS = Object.freeze([
  { key: 'min', label: 'Min' },
  { key: 'p10', label: 'p10' },
  { key: 'p20', label: 'p20' },
  { key: 'p30', label: 'p30' },
  { key: 'p40', label: 'p40' },
  { key: 'p50', label: 'p50' },
  { key: 'p60', label: 'p60' },
  { key: 'p70', label: 'p70' },
  { key: 'p80', label: 'p80' },
  { key: 'p90', label: 'p90' },
  { key: 'p95', label: 'p95' },
  { key: 'p99', label: 'p99' },
  { key: 'max', label: 'Max' },
  { key: 'mode', label: 'Mode' },
]);

/**
 * Custom error thrown when a fee stats input is null, malformed, or contains invalid numbers.
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
 * Parses and validates an individual stroop value into a non-negative number.
 *
 * @param {*} value - The stroops value to parse
 * @param {string} key - Field key for error reporting
 * @returns {number} Non-negative integer stroop value
 * @throws {InvalidFeeStatsError} If value is invalid, negative, or not an integer
 */
function parseStroops(value, key) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidFeeStatsError(
      `Fee stats field "${key}" cannot be ${value === null ? 'null' : typeof value}`,
      { key, value }
    );
  }

  let n;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidFeeStatsError(
        `Fee stats field "${key}" must be an integer, got ${value}`,
        { key, value }
      );
    }
    n = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidFeeStatsError(
        `Fee stats field "${key}" string must contain only digits, got "${value}"`,
        { key, value }
      );
    }
    n = Number(trimmed);
  } else if (typeof value === 'bigint') {
    n = Number(value);
  } else {
    throw new InvalidFeeStatsError(
      `Fee stats field "${key}" must be a number, string, or bigint, got ${typeof value}`,
      { key, value }
    );
  }

  if (n < 0) {
    throw new InvalidFeeStatsError(
      `Fee stats field "${key}" cannot be negative, got ${n}`,
      { key, value }
    );
  }

  return n;
}

/**
 * Extracts the relevant target stats group from a Horizon /fee_stats response.
 *
 * @param {*} rawStats - Full Horizon /fee_stats response or percentile group object
 * @param {string} [group='fee_charged'] - Target group ('fee_charged' or 'max_fee')
 * @returns {Object} Target percentile group object
 */
function extractStatsGroup(rawStats, group = 'fee_charged') {
  if (rawStats === null || typeof rawStats !== 'object' || Array.isArray(rawStats)) {
    throw new InvalidFeeStatsError(
      `Fee stats must be an object, got ${rawStats === null ? 'null' : typeof rawStats}`,
      { rawStats }
    );
  }

  if (group in rawStats && typeof rawStats[group] === 'object' && rawStats[group] !== null) {
    return rawStats[group];
  }

  // If the object itself directly contains known percentile fields, use it directly
  const hasKnownFields = FEE_STATS_FIELD_SPECS.some((spec) => spec.key in rawStats);
  if (hasKnownFields) {
    return rawStats;
  }

  throw new InvalidFeeStatsError(
    `Fee stats object does not contain group "${group}" or direct percentile fields`,
    { rawStats, group }
  );
}

/**
 * Checks whether an input represents a valid fee stats object without throwing.
 *
 * @param {*} rawStats - Input to inspect
 * @param {Object} [options={}] - Options (e.g. group)
 * @returns {boolean} True if input contains valid fee statistics
 */
export function isValidFeeStats(rawStats, options = {}) {
  try {
    formatFeeStats(rawStats, options);
    return true;
  } catch (err) {
    if (err instanceof InvalidFeeStatsError) {
      return false;
    }
    throw err;
  }
}

/**
 * Formats a Horizon /fee_stats response object into an ordered array of { label, stroops } rows.
 *
 * @param {Object} rawStats - Raw JSON /fee_stats response or direct group object
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.group='fee_charged'] - Sub-object to read from ('fee_charged' | 'max_fee')
 * @param {boolean} [options.asString=false] - Whether stroops should be returned as strings
 * @returns {Array<{ label: string, stroops: number|string }>} Ordered array of fee chart rows
 * @throws {InvalidFeeStatsError} If input is invalid or contains malformed numbers
 */
export function formatFeeStats(rawStats, options = {}) {
  const { group = 'fee_charged', asString = false } = options;
  const targetGroup = extractStatsGroup(rawStats, group);

  const rows = [];
  for (const spec of FEE_STATS_FIELD_SPECS) {
    if (spec.key in targetGroup && targetGroup[spec.key] !== undefined && targetGroup[spec.key] !== null) {
      const stroopNum = parseStroops(targetGroup[spec.key], spec.key);
      rows.push({
        label: spec.label,
        stroops: asString ? String(stroopNum) : stroopNum,
      });
    }
  }

  if (rows.length === 0) {
    throw new InvalidFeeStatsError('Fee stats target group contains no valid percentile fields', { targetGroup });
  }

  return rows;
}

/**
 * Safely format fee stats rows without throwing on invalid input.
 *
 * @param {*} rawStats - Raw fee stats input
 * @param {Object} [options={}] - Formatting options
 * @param {*} [fallback=[]] - Fallback value returned on error
 * @returns {Array|*} Formatted rows or fallback
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
