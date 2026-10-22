/**
 * @file ledgerCloseTimeFormat.js
 * @description Formats a Stellar ledger's ISO-8601 closed_at timestamp into a concise relative time string.
 */

/**
 * Custom error thrown when a ledger closed_at timestamp cannot be parsed into a valid date.
 */
export class InvalidLedgerTimeError extends Error {
  /**
   * @param {string} message
   * @param {*} [value]
   */
  constructor(message, value) {
    super(message);
    this.name = 'InvalidLedgerTimeError';
    this.value = value;
  }
}

/**
 * Parses an input value (ISO-8601 string, Date object, or numeric timestamp) into unix milliseconds.
 *
 * @param {*} value - The timestamp to parse
 * @param {string} [paramName='closed_at'] - Parameter name for error messages
 * @returns {number} Unix timestamp in milliseconds
 * @throws {InvalidLedgerTimeError} If value cannot be parsed to a valid date
 */
export function parseLedgerCloseTime(value, paramName = 'closed_at') {
  if (value === null || value === undefined || value === '') {
    throw new InvalidLedgerTimeError(
      `${paramName} is required and cannot be null, undefined, or empty`,
      value
    );
  }

  let ms;
  if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === 'number') {
    ms = value;
  } else if (typeof value === 'string') {
    ms = Date.parse(value);
  } else {
    throw new InvalidLedgerTimeError(
      `${paramName} must be a string, Date, or number, got ${typeof value}`,
      value
    );
  }

  if (typeof ms !== 'number' || !Number.isFinite(ms) || Number.isNaN(ms)) {
    throw new InvalidLedgerTimeError(
      `${paramName} is not a valid date or timestamp: "${String(value)}"`,
      value
    );
  }

  return ms;
}

/**
 * Checks whether an input value can be parsed into a valid ledger close timestamp.
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidLedgerCloseTime(value) {
  try {
    parseLedgerCloseTime(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a ledger closed_at timestamp into a relative string like "5s ago", "3m ago", "2h ago", "1d ago".
 *
 * @param {string|Date|number} closedAt - The ledger close timestamp (typically ISO-8601 string)
 * @param {Object|string|Date|number} [optionsOrNow] - Injected "now" time or options object
 * @returns {string} Short relative time string
 * @throws {InvalidLedgerTimeError} If closedAt or now is invalid
 */
export function formatLedgerCloseTime(closedAt, optionsOrNow) {
  const closedMs = parseLedgerCloseTime(closedAt, 'closed_at');

  let rawNow;
  let futureFallback = 'just now';

  if (optionsOrNow !== undefined && optionsOrNow !== null && typeof optionsOrNow === 'object' && !(optionsOrNow instanceof Date)) {
    rawNow = optionsOrNow.now;
    if (optionsOrNow.futureFallback !== undefined) {
      futureFallback = String(optionsOrNow.futureFallback);
    }
  } else {
    rawNow = optionsOrNow;
  }

  const nowMs = rawNow !== undefined ? parseLedgerCloseTime(rawNow, 'now') : Date.now();
  const diffMs = nowMs - closedMs;

  if (diffMs < 0) {
    return futureFallback;
  }

  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Safely format a ledger closed_at timestamp without throwing on invalid input.
 *
 * @param {*} closedAt - Timestamp to format
 * @param {*} [optionsOrNow] - Injected now or options
 * @param {*} [fallback=null] - Value returned when formatting fails
 * @returns {string|*} Formatted relative string or fallback value
 */
export function tryFormatLedgerCloseTime(closedAt, optionsOrNow, fallback = null) {
  try {
    return formatLedgerCloseTime(closedAt, optionsOrNow);
  } catch (err) {
    if (err instanceof InvalidLedgerTimeError) {
      return fallback;
    }
    throw err;
  }
}
