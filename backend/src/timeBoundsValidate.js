/**
 * @file timeBoundsValidate.js
 * @description Validates Stellar transaction time bounds (unix seconds) pairs: { minTime, maxTime }.
 */

/**
 * Custom error thrown when time bounds are malformed or invalid.
 */
export class InvalidTimeBoundsError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidTimeBoundsError';
    this.context = context;
  }
}

/**
 * Parses and validates an individual timestamp value into a non-negative BigInt.
 *
 * @param {*} value - The timestamp value to parse
 * @param {string} paramName - Name of the field for error reporting
 * @returns {bigint} Non-negative BigInt representation of the unix timestamp
 * @throws {InvalidTimeBoundsError} If the value is not a valid non-negative integer
 */
function parseTimestamp(value, paramName) {
  if (value === null || value === undefined || value === '') {
    throw new InvalidTimeBoundsError(
      `${paramName} is required and cannot be null, undefined, or empty`,
      { paramName, value }
    );
  }

  let bi;
  if (typeof value === 'bigint') {
    bi = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidTimeBoundsError(
        `${paramName} must be a finite integer, got ${value}`,
        { paramName, value }
      );
    }
    bi = BigInt(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidTimeBoundsError(
        `${paramName} string must contain only digits, got "${value}"`,
        { paramName, value }
      );
    }
    try {
      bi = BigInt(trimmed);
    } catch {
      throw new InvalidTimeBoundsError(
        `${paramName} could not be parsed as a BigInt`,
        { paramName, value }
      );
    }
  } else {
    throw new InvalidTimeBoundsError(
      `${paramName} must be a number, string, or bigint, got ${typeof value}`,
      { paramName, value }
    );
  }

  if (bi < 0n) {
    throw new InvalidTimeBoundsError(
      `${paramName} cannot be negative, got ${bi.toString()}`,
      { paramName, value }
    );
  }

  return bi;
}

/**
 * Validates a `{ minTime, maxTime }` time-bounds pair.
 *
 * Rules:
 * - Both minTime and maxTime must be valid non-negative unix second integers.
 * - `maxTime = 0` means "no upper bound" (unbounded in the future).
 * - When `maxTime > 0`, `minTime` cannot exceed `maxTime` (`minTime <= maxTime`).
 *
 * @param {Object|Array} bounds - The bounds object { minTime, maxTime } or arguments
 * @param {*} [maybeMaxTime] - Optional maxTime if called as (minTime, maxTime)
 * @returns {{ minTime: bigint, maxTime: bigint, hasUpperBound: boolean }} Normalized bounds object
 * @throws {InvalidTimeBoundsError} If bounds are invalid
 */
export function validateTimeBounds(bounds, maybeMaxTime) {
  if (bounds === null || typeof bounds !== 'object' && maybeMaxTime === undefined) {
    throw new InvalidTimeBoundsError(
      `Time bounds must be an object with { minTime, maxTime } or positional arguments, got ${typeof bounds}`,
      { bounds }
    );
  }

  let rawMinTime;
  let rawMaxTime;

  if (typeof bounds === 'object' && bounds !== null && !Array.isArray(bounds) && maybeMaxTime === undefined) {
    if (!('minTime' in bounds) || !('maxTime' in bounds)) {
      throw new InvalidTimeBoundsError(
        'Time bounds object must contain both "minTime" and "maxTime" properties',
        { bounds }
      );
    }
    rawMinTime = bounds.minTime;
    rawMaxTime = bounds.maxTime;
  } else {
    rawMinTime = bounds;
    rawMaxTime = maybeMaxTime;
  }

  const minTime = parseTimestamp(rawMinTime, 'minTime');
  const maxTime = parseTimestamp(rawMaxTime, 'maxTime');

  const hasUpperBound = maxTime > 0n;

  if (hasUpperBound && minTime > maxTime) {
    throw new InvalidTimeBoundsError(
      `minTime (${minTime.toString()}) cannot be greater than maxTime (${maxTime.toString()})`,
      { minTime: minTime.toString(), maxTime: maxTime.toString() }
    );
  }

  return {
    minTime,
    maxTime,
    hasUpperBound
  };
}

/**
 * Checks whether a given time-bounds pair is valid without throwing.
 *
 * @param {*} bounds - The bounds to inspect
 * @param {*} [maybeMaxTime] - Optional maxTime if called as (minTime, maxTime)
 * @returns {boolean} True if bounds are valid, false otherwise
 */
export function isValidTimeBounds(bounds, maybeMaxTime) {
  try {
    validateTimeBounds(bounds, maybeMaxTime);
    return true;
  } catch (err) {
    if (err instanceof InvalidTimeBoundsError) {
      return false;
    }
    throw err;
  }
}

/**
 * Checks if a given unix timestamp falls within the specified time bounds.
 *
 * @param {*} timestamp - The unix timestamp (in seconds) to test
 * @param {Object} bounds - Valid time bounds { minTime, maxTime }
 * @returns {boolean} True if timestamp >= minTime and (maxTime === 0 or timestamp <= maxTime)
 * @throws {InvalidTimeBoundsError} If timestamp or bounds are invalid
 */
export function isTimeWithinBounds(timestamp, bounds) {
  const ts = parseTimestamp(timestamp, 'timestamp');
  const validated = validateTimeBounds(bounds);

  if (ts < validated.minTime) {
    return false;
  }

  if (validated.hasUpperBound && ts > validated.maxTime) {
    return false;
  }

  return true;
}
