/**
 * @file sponsorshipFeeEstimate.js
 * @description Computes required base reserve XLM amount for sponsored Stellar ledger entries.
 * Standard base reserve is 0.5 XLM (5,000,000 stroops) per entry; sponsored accounts require 2 base reserves.
 */

export const BASE_RESERVE_STROOPS = 5_000_000n;
export const STROOPS_PER_XLM = 10_000_000n;
export const BASE_RESERVE_XLM = '0.5';

/**
 * Custom error thrown when sponsorship fee estimation input is invalid.
 */
export class SponsorshipFeeEstimateError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {*} [context]
   */
  constructor(message, code = 'INVALID_SPONSORSHIP_INPUT', context) {
    super(message);
    this.name = 'SponsorshipFeeEstimateError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Validates a non-negative integer count.
 */
function validateCount(val, name) {
  if (val === null || val === undefined) return 0;

  let num = val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new SponsorshipFeeEstimateError(
        `${name} must be a non-negative integer string, got "${val}"`,
        'INVALID_COUNT_FORMAT',
        { name, val }
      );
    }
    num = Number(trimmed);
  }

  if (typeof num !== 'number' || Number.isNaN(num) || !Number.isFinite(num)) {
    throw new SponsorshipFeeEstimateError(
      `${name} must be a valid number, got ${typeof val}`,
      'INVALID_COUNT_TYPE',
      { name, val }
    );
  }

  if (!Number.isInteger(num)) {
    throw new SponsorshipFeeEstimateError(
      `${name} must be an integer, got ${num}`,
      'NON_INTEGER_COUNT',
      { name, num }
    );
  }

  if (num < 0) {
    throw new SponsorshipFeeEstimateError(
      `${name} cannot be negative, got ${num}`,
      'NEGATIVE_COUNT',
      { name, num }
    );
  }

  return num;
}

/**
 * Converts stroops BigInt into fixed-point XLM string.
 *
 * @param {bigint} stroops
 * @returns {string} E.g. "0.5", "1.0", "2.5"
 */
function stroopsToXlmString(stroops) {
  const intPart = (stroops / STROOPS_PER_XLM).toString();
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, '0');
  const trimmedFrac = frac.replace(/0+$/, '');
  return trimmedFrac.length === 0 ? `${intPart}.0` : `${intPart}.${trimmedFrac}`;
}

/**
 * Resolves total entry count from numeric or breakdown object.
 */
function resolveTotalEntries(input) {
  if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
    const {
      entries,
      count,
      trustlines = 0,
      signers = 0,
      dataEntries = 0,
      offers = 0,
      accounts = 0,
    } = input;

    if (entries !== undefined) return { total: validateCount(entries, 'entries'), breakdown: input };
    if (count !== undefined) return { total: validateCount(count, 'count'), breakdown: input };

    const t = validateCount(trustlines, 'trustlines');
    const s = validateCount(signers, 'signers');
    const d = validateCount(dataEntries, 'dataEntries');
    const o = validateCount(offers, 'offers');
    const a = validateCount(accounts, 'accounts');

    // Each new account consumes 2 base reserves
    const total = t + s + d + o + (a * 2);
    return { total, breakdown: { trustlines: t, signers: s, dataEntries: d, offers: o, accounts: a } };
  }

  const total = validateCount(input, 'entries');
  return { total, breakdown: { entries: total } };
}

/**
 * Inspects sponsorship reserve parameters and returns computed reserve without throwing.
 *
 * @param {*} input - Entry count or breakdown object
 * @param {Object} [options={}] - Options
 * @param {string|number} [options.baseReserveXlm] - Optional custom base reserve in XLM (default: 0.5)
 * @returns {{ ok: true, totalEntries: number, reserveXlm: string, reserveStroops: string, breakdown: * } | { ok: false, error: string, code: string, details?: * }}
 */
export function checkSponsorshipReserve(input, options = {}) {
  let totalEntries;
  let breakdown;

  try {
    const resolved = resolveTotalEntries(input);
    totalEntries = resolved.total;
    breakdown = resolved.breakdown;
  } catch (err) {
    if (err instanceof SponsorshipFeeEstimateError) {
      return {
        ok: false,
        code: err.code,
        error: err.message,
        details: err.context,
      };
    }
    return {
      ok: false,
      code: 'UNKNOWN_INPUT_ERROR',
      error: err.message,
    };
  }

  let reserveStroopsPerEntry = BASE_RESERVE_STROOPS;

  if (options.baseReserveXlm !== undefined) {
    try {
      const parsedXlm = Number(options.baseReserveXlm);
      if (Number.isNaN(parsedXlm) || parsedXlm <= 0 || !Number.isFinite(parsedXlm)) {
        return {
          ok: false,
          code: 'INVALID_BASE_RESERVE',
          error: `baseReserveXlm must be a positive number, got ${options.baseReserveXlm}`,
          details: { baseReserveXlm: options.baseReserveXlm },
        };
      }
      reserveStroopsPerEntry = BigInt(Math.round(parsedXlm * Number(STROOPS_PER_XLM)));
    } catch (err) {
      return {
        ok: false,
        code: 'INVALID_BASE_RESERVE',
        error: err.message,
      };
    }
  }

  const totalStroops = BigInt(totalEntries) * reserveStroopsPerEntry;
  const reserveXlm = stroopsToXlmString(totalStroops);

  return {
    ok: true,
    totalEntries,
    reserveXlm,
    reserveStroops: totalStroops.toString(),
    breakdown,
  };
}

/**
 * Computes required sponsorship base reserve in XLM string, throwing on error.
 *
 * @param {*} input
 * @param {Object} [options={}]
 * @returns {string} E.g. "0.5", "1.0", "5.0"
 * @throws {SponsorshipFeeEstimateError}
 */
export function estimateSponsorshipReserve(input, options = {}) {
  const result = checkSponsorshipReserve(input, options);
  if (!result.ok) {
    throw new SponsorshipFeeEstimateError(result.error, result.code, result.details);
  }
  return result.reserveXlm;
}

/**
 * Checks whether the input can produce a valid sponsorship estimation without throwing.
 *
 * @param {*} input
 * @param {Object} [options={}]
 * @returns {boolean}
 */
export function isValidSponsorshipReserveInput(input, options = {}) {
  return checkSponsorshipReserve(input, options).ok;
}
