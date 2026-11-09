import {
  MULTISIG_THRESHOLD_ERROR,
  SIGNER_WEIGHT_MAX,
  SIGNER_WEIGHT_MIN,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from "./multisigThresholdCheckConstants.js";

/**
 * Extract and validate a single signer weight from a number or `{ weight }` object.
 *
 * @param {unknown} entry
 * @returns {{ ok: true, weight: number } | { ok: false, error: string }}
 */
function parseOneWeight(entry) {
  const candidate =
    entry !== null &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    Object.hasOwn(entry, "weight")
      ? entry.weight
      : entry;

  if (typeof candidate !== "number") {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.WEIGHT_TYPE };
  }

  if (!Number.isInteger(candidate)) {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.WEIGHT_INTEGER };
  }

  if (candidate < SIGNER_WEIGHT_MIN || candidate > SIGNER_WEIGHT_MAX) {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.WEIGHT_RANGE };
  }

  return { ok: true, weight: candidate };
}

/**
 * Determine whether a subset of Stellar signer weights sums to at least the
 * required operation threshold (`0`–`255`).
 *
 * Validation rules (checked in order):
 * 1. `weights` must be an array.
 * 2. Each element in `weights` must be an integer `number` in `[0, 255]` (or a
 *    plain signer object `{ weight: number }` whose `weight` is an integer in
 *    `[0, 255]`).
 * 3. `threshold` must be an integer `number` in `[0, 255]`.
 *
 * Invalid input returns `{ ok: false, error }` and never throws.
 *
 * @param {unknown} weights Array of signer weights (`number` or `{ weight: number }`).
 * @param {unknown} threshold Required threshold (`0`–`255`).
 * @returns {{
 *   ok: true,
 *   satisfied: boolean,
 *   totalWeight: number,
 *   threshold: number,
 *   shortfall: number
 * } | {
 *   ok: false,
 *   error: string
 * }}
 *
 * @example
 * checkMultisigThreshold([1, 2], 2);
 * // => { ok: true, satisfied: true, totalWeight: 3, threshold: 2, shortfall: 0 }
 *
 * checkMultisigThreshold([1], 3);
 * // => { ok: true, satisfied: false, totalWeight: 1, threshold: 3, shortfall: 2 }
 */
export function checkMultisigThreshold(weights, threshold) {
  if (!Array.isArray(weights)) {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.WEIGHTS_NOT_ARRAY };
  }

  let totalWeight = 0;
  for (const entry of weights) {
    const parsed = parseOneWeight(entry);
    if (!parsed.ok) {
      return parsed;
    }
    totalWeight += parsed.weight;
  }

  if (typeof threshold !== "number") {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_TYPE };
  }

  if (!Number.isInteger(threshold)) {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_INTEGER };
  }

  if (threshold < THRESHOLD_MIN || threshold > THRESHOLD_MAX) {
    return { ok: false, error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_RANGE };
  }

  const satisfied = totalWeight >= threshold;
  const shortfall = satisfied ? 0 : threshold - totalWeight;

  return {
    ok: true,
    satisfied,
    totalWeight,
    threshold,
    shortfall,
  };
}

/**
 * Boolean predicate form of {@link checkMultisigThreshold}.
 *
 * Returns `true` only when the inputs are valid and `totalWeight >= threshold`.
 * Never throws.
 *
 * @param {unknown} weights Array of signer weights.
 * @param {unknown} threshold Required threshold (`0`–`255`).
 * @returns {boolean}
 */
export function isThresholdSatisfied(weights, threshold) {
  const result = checkMultisigThreshold(weights, threshold);
  return result.ok === true && result.satisfied === true;
}

/**
 * Check multisig threshold satisfaction or throw an `Error` if the inputs are
 * invalid.
 *
 * @param {unknown} weights Array of signer weights.
 * @param {unknown} threshold Required threshold (`0`–`255`).
 * @returns {{
 *   satisfied: boolean,
 *   totalWeight: number,
 *   threshold: number,
 *   shortfall: number
 * }}
 * @throws {Error} When `weights` or `threshold` is invalid.
 */
export function assertMultisigThreshold(weights, threshold) {
  const result = checkMultisigThreshold(weights, threshold);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return {
    satisfied: result.satisfied,
    totalWeight: result.totalWeight,
    threshold: result.threshold,
    shortfall: result.shortfall,
  };
}
