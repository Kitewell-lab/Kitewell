import {
  DEFAULT_FEE_STATS_BUCKET,
  FEE_STATS_BUCKETS,
  FEE_STATS_FIELDS,
  FEE_STATS_FORMAT_ERROR,
} from "./feeStatsFormatConstants.js";

/**
 * Check whether a value is a non-null, non-array object.
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parse a stroop count from a non-negative safe integer or decimal digit string.
 *
 * @param {unknown} raw
 * @param {string} label
 * @returns {number}
 */
function parseStroops(raw, label) {
  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw) || raw < 0) {
      throw new Error(`${FEE_STATS_FORMAT_ERROR.INVALID_STROOPS}: "${label}".`);
    }
    return Object.is(raw, -0) ? 0 : raw;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`${FEE_STATS_FORMAT_ERROR.INVALID_STROOPS}: "${label}".`);
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) {
      throw new RangeError(
        `${FEE_STATS_FORMAT_ERROR.INVALID_STROOPS}: "${label}".`
      );
    }
    return parsed;
  }

  throw new Error(`${FEE_STATS_FORMAT_ERROR.INVALID_STROOPS}: "${label}".`);
}

/**
 * Resolve the target fee distribution object from either a top-level Horizon
 * `/fee_stats` response (`{ fee_charged, max_fee }`) or a direct distribution
 * object (`{ min, mode, p10, ..., p99, max }`).
 *
 * @param {Record<string, unknown>} input
 * @param {"fee_charged" | "max_fee"} bucket
 * @returns {Record<string, unknown>}
 */
function resolveDistribution(input, bucket) {
  if (
    Object.hasOwn(input, "fee_charged") ||
    Object.hasOwn(input, "max_fee")
  ) {
    const candidate = input[bucket];
    if (!isPlainObject(candidate)) {
      throw new Error(
        `${FEE_STATS_FORMAT_ERROR.MISSING_BUCKET}: "${bucket}".`
      );
    }
    return candidate;
  }

  return input;
}

/**
 * Format a Horizon `/fee_stats` response object's percentile and summary fields
 * (`min`, `mode`, `p10..p99`, `max`) into an ordered array of `{ label, stroops }`
 * rows for a fee-chart UI.
 *
 * Accepts either:
 * - a full Horizon `/fee_stats` JSON object containing `fee_charged` / `max_fee`, or
 * - a direct fee distribution object containing `min`, `mode`, `p10..p99`, and `max`.
 *
 * @param {Record<string, unknown>} feeStats Raw Horizon `/fee_stats` object or distribution object.
 * @param {object} [options]
 * @param {"fee_charged" | "max_fee"} [options.bucket="fee_charged"] Which bucket to read when a top-level `/fee_stats` response is supplied.
 * @returns {Array<{ label: string, stroops: number }>} Ordered rows for the 14 fee fields.
 * @throws {TypeError} When `feeStats` or `options` is not a plain object.
 * @throws {Error} When a required field is missing or not a valid non-negative stroop integer.
 *
 * @example
 * formatFeeStats({
 *   min: "100", mode: "100",
 *   p10: "100", p20: "100", p30: "100", p40: "100", p50: "100",
 *   p60: "120", p70: "150", p80: "200", p90: "250", p95: "500", p99: "1000",
 *   max: "2000",
 * });
 * // => [{ label: "min", stroops: 100 }, ..., { label: "max", stroops: 2000 }]
 */
export function formatFeeStats(feeStats, options = undefined) {
  if (!isPlainObject(feeStats)) {
    throw new TypeError(FEE_STATS_FORMAT_ERROR.TYPE);
  }

  let bucket = DEFAULT_FEE_STATS_BUCKET;
  if (options !== undefined) {
    if (!isPlainObject(options)) {
      throw new TypeError(FEE_STATS_FORMAT_ERROR.OPTIONS_TYPE);
    }
    if (options.bucket !== undefined) {
      if (
        typeof options.bucket !== "string" ||
        !FEE_STATS_BUCKETS.includes(options.bucket)
      ) {
        throw new Error(FEE_STATS_FORMAT_ERROR.INVALID_BUCKET);
      }
      bucket = options.bucket;
    }
  }

  const distribution = resolveDistribution(feeStats, bucket);

  /** @type {Array<{ label: string, stroops: number }>} */
  const rows = [];
  for (const field of FEE_STATS_FIELDS) {
    if (!Object.hasOwn(distribution, field) || distribution[field] == null) {
      throw new Error(`${FEE_STATS_FORMAT_ERROR.MISSING_FIELD}: "${field}".`);
    }

    rows.push({
      label: field,
      stroops: parseStroops(distribution[field], field),
    });
  }

  return rows;
}

/**
 * Non-throwing companion to {@link formatFeeStats}.
 *
 * @param {unknown} feeStats Raw Horizon `/fee_stats` response or distribution.
 * @param {unknown} [options] Optional `{ bucket }` configuration.
 * @returns {{ ok: true, rows: Array<{ label: string, stroops: number }> } | { ok: false, error: string }}
 */
export function tryFormatFeeStats(feeStats, options = undefined) {
  try {
    const rows = formatFeeStats(feeStats, options);
    return { ok: true, rows };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
