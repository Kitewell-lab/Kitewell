/**
 * Claimable balance predicate describer.
 *
 * Converts a Stellar claimable balance claimant predicate object
 * (unconditional, relBefore, absBefore, and, or, not) into a short
 * human-readable description string for display, without evaluating
 * or mutating the predicate.
 *
 * Supports Horizon API and Stellar SDK predicate tree representations.
 *
 * @module claimPredicateDescribe
 */

/**
 * Custom error thrown when predicate parsing fails or input is malformed.
 */
export class ClaimPredicateDescribeError extends Error {
  /**
   * @param {string} message - Error explanation message.
   */
  constructor(message) {
    super(message);
    this.name = "ClaimPredicateDescribeError";
  }
}

/**
 * Returns the recognized predicate type for a given predicate node.
 *
 * @param {any} predicate - The predicate object to test.
 * @returns {"unconditional"|"relBefore"|"absBefore"|"and"|"or"|"not"|"unknown"} The type tag.
 */
export function getPredicateType(predicate) {
  if (!predicate || typeof predicate !== "object" || Array.isArray(predicate)) {
    return "unknown";
  }

  if (Object.prototype.hasOwnProperty.call(predicate, "unconditional")) {
    return "unconditional";
  }
  if (
    Object.prototype.hasOwnProperty.call(predicate, "relBefore") ||
    Object.prototype.hasOwnProperty.call(predicate, "rel_before")
  ) {
    return "relBefore";
  }
  if (
    Object.prototype.hasOwnProperty.call(predicate, "absBefore") ||
    Object.prototype.hasOwnProperty.call(predicate, "abs_before") ||
    Object.prototype.hasOwnProperty.call(predicate, "absBeforeEpoch") ||
    Object.prototype.hasOwnProperty.call(predicate, "abs_before_epoch")
  ) {
    return "absBefore";
  }
  if (Object.prototype.hasOwnProperty.call(predicate, "and")) {
    return "and";
  }
  if (Object.prototype.hasOwnProperty.call(predicate, "or")) {
    return "or";
  }
  if (Object.prototype.hasOwnProperty.call(predicate, "not")) {
    return "not";
  }

  return "unknown";
}

/**
 * Checks whether a value is a recognizable predicate object structure.
 *
 * @param {any} predicate - Value to check.
 * @returns {boolean} True if candidate is a supported predicate object.
 */
export function isPredicate(predicate) {
  return getPredicateType(predicate) !== "unknown";
}

/**
 * Formats relative duration in seconds into a human-readable string.
 *
 * @param {number|string|bigint} seconds - Non-negative seconds.
 * @returns {string} Human-readable duration string.
 * @throws {ClaimPredicateDescribeError} If seconds is invalid or negative.
 */
export function formatRelBefore(seconds) {
  if (seconds === null || seconds === undefined || seconds === "") {
    throw new ClaimPredicateDescribeError("relBefore value cannot be empty.");
  }

  const num = typeof seconds === "bigint" ? Number(seconds) : Number(seconds);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    throw new ClaimPredicateDescribeError(
      `relBefore must be a non-negative integer, got: ${String(seconds)}`
    );
  }

  return `Within ${num} seconds of creation`;
}

/**
 * Formats an absolute timestamp or ISO date string into a human-readable string.
 *
 * @param {string|number|Date} target - Target date/timestamp.
 * @returns {string} Human-readable absolute bound.
 * @throws {ClaimPredicateDescribeError} If date target is invalid.
 */
export function formatAbsBefore(target) {
  if (target === null || target === undefined || target === "") {
    throw new ClaimPredicateDescribeError("absBefore value cannot be empty.");
  }

  if (target instanceof Date) {
    if (Number.isNaN(target.getTime())) {
      throw new ClaimPredicateDescribeError("absBefore Date instance is invalid.");
    }
    return `Before ${target.toISOString()}`;
  }

  // If numeric or string representation of unix epoch seconds
  if (typeof target === "number" || (typeof target === "string" && /^\d+$/.test(target.trim()))) {
    const rawNum = Number(target);
    if (!Number.isFinite(rawNum) || rawNum < 0) {
      throw new ClaimPredicateDescribeError(`absBefore timestamp must be non-negative, got: ${target}`);
    }
    // Stellar Horizon epoch seconds are typically 10 digits
    const ms = rawNum > 1e11 ? rawNum : rawNum * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      throw new ClaimPredicateDescribeError(`Invalid absBefore epoch timestamp: ${target}`);
    }
    return `Before ${date.toISOString()}`;
  }

  if (typeof target === "string") {
    const trimmed = target.trim();
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      throw new ClaimPredicateDescribeError(`Invalid absBefore date string: ${target}`);
    }
    return `Before ${new Date(parsed).toISOString()}`;
  }

  throw new ClaimPredicateDescribeError(`Unsupported absBefore target type: ${typeof target}`);
}

/**
 * Internal recursive describer.
 *
 * @private
 * @param {any} predicate
 * @param {number} depth
 * @param {number} maxDepth
 * @returns {string}
 */
function describeNode(predicate, depth, maxDepth) {
  if (depth > maxDepth) {
    throw new ClaimPredicateDescribeError(
      `Predicate exceeds maximum recursion depth of ${maxDepth}.`
    );
  }

  if (!predicate || typeof predicate !== "object" || Array.isArray(predicate)) {
    throw new ClaimPredicateDescribeError("Predicate node must be a non-null object.");
  }

  const type = getPredicateType(predicate);

  switch (type) {
    case "unconditional": {
      const val = predicate.unconditional;
      if (val === false) {
        return "Never claimable";
      }
      return "Unconditional";
    }

    case "relBefore": {
      const raw =
        predicate.relBefore !== undefined ? predicate.relBefore : predicate.rel_before;
      return formatRelBefore(raw);
    }

    case "absBefore": {
      const raw =
        predicate.absBefore !== undefined
          ? predicate.absBefore
          : predicate.abs_before !== undefined
          ? predicate.abs_before
          : predicate.absBeforeEpoch !== undefined
          ? predicate.absBeforeEpoch
          : predicate.abs_before_epoch;
      return formatAbsBefore(raw);
    }

    case "and": {
      const list = predicate.and;
      if (!Array.isArray(list)) {
        throw new ClaimPredicateDescribeError("'and' predicate requires an array of sub-predicates.");
      }
      if (list.length === 0) {
        return "Always false";
      }
      if (list.length === 1) {
        return describeNode(list[0], depth + 1, maxDepth);
      }
      const parts = list.map((sub) => describeNode(sub, depth + 1, maxDepth));
      return `(${parts.join(" and ")})`;
    }

    case "or": {
      const list = predicate.or;
      if (!Array.isArray(list)) {
        throw new ClaimPredicateDescribeError("'or' predicate requires an array of sub-predicates.");
      }
      if (list.length === 0) {
        return "Always false";
      }
      if (list.length === 1) {
        return describeNode(list[0], depth + 1, maxDepth);
      }
      const parts = list.map((sub) => describeNode(sub, depth + 1, maxDepth));
      return `(${parts.join(" or ")})`;
    }

    case "not": {
      const target = predicate.not;
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        throw new ClaimPredicateDescribeError("'not' predicate requires a sub-predicate object.");
      }
      const inner = describeNode(target, depth + 1, maxDepth);
      return `Not (${inner})`;
    }

    default:
      throw new ClaimPredicateDescribeError(
        `Unrecognized predicate shape: ${JSON.stringify(predicate)}`
      );
  }
}

/**
 * Converts a claimable balance claimant predicate object into a short human-readable
 * description string for display, without evaluating or mutating the predicate.
 *
 * @param {Object} predicate - A Stellar claimant predicate tree.
 * @param {Object} [options={}] - Formatting options.
 * @param {boolean} [options.throwOnError=true] - Whether to throw on invalid input or return fallback.
 * @param {string} [options.fallback="Invalid predicate"] - Fallback string if throwOnError is false.
 * @param {number} [options.maxDepth=20] - Maximum recursion depth for nested predicates.
 * @returns {string} Human-readable predicate summary string.
 *
 * @throws {TypeError} If predicate is not a non-null object (when throwOnError is true).
 * @throws {ClaimPredicateDescribeError} If predicate shape or values are invalid (when throwOnError is true).
 *
 * @example
 * claimPredicateDescribe({ unconditional: true });
 * // => "Unconditional"
 *
 * @example
 * claimPredicateDescribe({ relBefore: 3600 });
 * // => "Within 3600 seconds of creation"
 *
 * @example
 * claimPredicateDescribe({
 *   and: [
 *     { relBefore: 3600 },
 *     { absBefore: "2026-12-31T23:59:59Z" }
 *   ]
 * });
 * // => "(Within 3600 seconds of creation and Before 2026-12-31T23:59:59.000Z)"
 */
export function claimPredicateDescribe(predicate, options = {}) {
  const {
    throwOnError = true,
    fallback = "Invalid predicate",
    maxDepth = 20,
  } = options;

  if (!predicate || typeof predicate !== "object" || Array.isArray(predicate)) {
    if (throwOnError) {
      throw new TypeError("Predicate must be a non-null object.");
    }
    return fallback;
  }

  try {
    return describeNode(predicate, 1, maxDepth);
  } catch (err) {
    if (throwOnError) {
      throw err;
    }
    return fallback;
  }
}
