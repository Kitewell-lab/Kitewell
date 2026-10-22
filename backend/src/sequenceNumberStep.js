/**
 * @file sequenceNumberStep.js
 * @description Provides safe BigInt increment and decrement helpers for Stellar account sequence numbers passed as decimal strings.
 */

const SEQUENCE_REGEX = /^\d+$/;

/**
 * Custom error thrown when a sequence number or step amount is invalid or would produce a negative sequence.
 */
export class InvalidSequenceNumberError extends Error {
  /**
   * @param {string} message
   * @param {*} [context]
   */
  constructor(message, context) {
    super(message);
    this.name = 'InvalidSequenceNumberError';
    this.context = context;
  }
}

/**
 * Validates whether an input is a valid non-negative decimal sequence number.
 *
 * @param {*} value - The value to inspect
 * @returns {boolean} True if input is a non-empty string of digits (or non-negative safe integer/BigInt)
 */
export function isValidSequenceNumber(value) {
  if (typeof value === 'string') {
    return SEQUENCE_REGEX.test(value);
  }
  if (typeof value === 'bigint') {
    return value >= 0n;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  }
  return false;
}

/**
 * Parses and validates an input value into a non-negative BigInt.
 *
 * @param {*} value - The sequence number to parse
 * @param {string} [paramName='sequence'] - Field name for error reporting
 * @returns {bigint} Non-negative sequence as BigInt
 * @throws {InvalidSequenceNumberError} If value is malformed, negative, or not numeric
 */
export function parseSequenceNumber(value, paramName = 'sequence') {
  if (value === null || value === undefined || value === '') {
    throw new InvalidSequenceNumberError(
      `${paramName} must be a non-empty string of decimal digits, got ${typeof value === 'string' ? 'empty string' : typeof value}`,
      { paramName, value }
    );
  }

  let bi;
  if (typeof value === 'string') {
    if (!SEQUENCE_REGEX.test(value)) {
      throw new InvalidSequenceNumberError(
        `${paramName} must contain only digits, got "${value}"`,
        { paramName, value }
      );
    }
    bi = BigInt(value);
  } else if (typeof value === 'bigint') {
    bi = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new InvalidSequenceNumberError(
        `${paramName} must be a finite integer, got ${value}`,
        { paramName, value }
      );
    }
    bi = BigInt(value);
  } else {
    throw new InvalidSequenceNumberError(
      `${paramName} must be a string, number, or bigint, got ${typeof value}`,
      { paramName, value }
    );
  }

  if (bi < 0n) {
    throw new InvalidSequenceNumberError(
      `${paramName} cannot be negative, got ${bi.toString()}`,
      { paramName, value }
    );
  }

  return bi;
}

/**
 * Parses a delta/step value, rejecting negative deltas when used with increment/decrement.
 *
 * @param {*} delta - The delta amount
 * @param {string} paramName - Parameter name
 * @returns {bigint} Non-negative BigInt delta
 */
function parseDelta(delta, paramName) {
  return parseSequenceNumber(delta, paramName);
}

/**
 * Safely increments a sequence number by delta (default 1).
 *
 * @param {string|number|bigint} sequence - Base sequence number
 * @param {string|number|bigint} [delta=1n] - Amount to increment
 * @returns {string} Incremented sequence number as a decimal string
 * @throws {InvalidSequenceNumberError} If sequence or delta is invalid
 */
export function incrementSequence(sequence, delta = 1n) {
  const current = parseSequenceNumber(sequence, 'sequence');
  const d = parseDelta(delta, 'delta');
  return (current + d).toString();
}

/**
 * Safely decrements a sequence number by delta (default 1), preventing negative results.
 *
 * @param {string|number|bigint} sequence - Base sequence number
 * @param {string|number|bigint} [delta=1n] - Amount to decrement
 * @returns {string} Decremented sequence number as a decimal string
 * @throws {InvalidSequenceNumberError} If sequence or delta is invalid, or if result < 0
 */
export function decrementSequence(sequence, delta = 1n) {
  const current = parseSequenceNumber(sequence, 'sequence');
  const d = parseDelta(delta, 'delta');

  if (current < d) {
    throw new InvalidSequenceNumberError(
      `Sequence number cannot be negative: ${current.toString()} - ${d.toString()} < 0`,
      { sequence: current.toString(), delta: d.toString() }
    );
  }

  return (current - d).toString();
}

/**
 * Steps a sequence number by an arbitrary signed integer step.
 *
 * @param {string|number|bigint} sequence - Base sequence number
 * @param {string|number|bigint} [step=1n] - Signed step amount (can be negative or positive)
 * @returns {string} Stepped sequence number as a decimal string
 * @throws {InvalidSequenceNumberError} If sequence or step is invalid, or if result < 0
 */
export function stepSequenceNumber(sequence, step = 1n) {
  const current = parseSequenceNumber(sequence, 'sequence');

  let s;
  if (typeof step === 'bigint') {
    s = step;
  } else if (typeof step === 'number') {
    if (!Number.isFinite(step) || !Number.isInteger(step)) {
      throw new InvalidSequenceNumberError(`step must be a finite integer, got ${step}`, { step });
    }
    s = BigInt(step);
  } else if (typeof step === 'string') {
    const trimmed = step.trim();
    if (!/^[+-]?\d+$/.test(trimmed)) {
      throw new InvalidSequenceNumberError(`step string must be an integer, got "${step}"`, { step });
    }
    s = BigInt(trimmed);
  } else {
    throw new InvalidSequenceNumberError(`step must be a string, number, or bigint, got ${typeof step}`, { step });
  }

  const result = current + s;
  if (result < 0n) {
    throw new InvalidSequenceNumberError(
      `Sequence number cannot be negative: ${current.toString()} + (${s.toString()}) < 0`,
      { sequence: current.toString(), step: s.toString() }
    );
  }

  return result.toString();
}
