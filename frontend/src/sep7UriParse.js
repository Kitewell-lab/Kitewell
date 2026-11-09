import {
  MAX_SEP7_URI_LENGTH,
  SEP7_OPERATIONS,
  SEP7_SCHEME,
  SEP7_URI_ERROR,
} from "./sep7UriParseConstants.js";

const FORBIDDEN_PARAM_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Decode a percent-encoded URI component or throw a descriptive SEP-7 query error.
 *
 * @param {string} raw
 * @returns {string}
 */
function decodeComponentStrict(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new Error(SEP7_URI_ERROR.MALFORMED_QUERY);
  }
}

/**
 * Parse the raw query string of a SEP-7 URI into a plain key-value object.
 *
 * @param {string} rawQuery
 * @returns {Record<string, string>}
 */
function parseQueryParams(rawQuery) {
  /** @type {Record<string, string>} */
  const params = {};
  if (rawQuery === "") {
    return params;
  }

  const pairs = rawQuery.split("&");
  for (const pair of pairs) {
    if (pair === "") {
      throw new Error(SEP7_URI_ERROR.MALFORMED_QUERY);
    }

    const eqIndex = pair.indexOf("=");
    if (eqIndex <= 0) {
      throw new Error(SEP7_URI_ERROR.MALFORMED_QUERY);
    }

    const rawKey = pair.slice(0, eqIndex);
    const rawValue = pair.slice(eqIndex + 1);
    const key = decodeComponentStrict(rawKey).trim();
    const value = decodeComponentStrict(rawValue);

    if (key === "" || FORBIDDEN_PARAM_KEYS.has(key)) {
      throw new Error(SEP7_URI_ERROR.MALFORMED_QUERY);
    }

    if (Object.hasOwn(params, key)) {
      throw new Error(SEP7_URI_ERROR.DUPLICATE_PARAM);
    }

    params[key] = value;
  }

  return params;
}

/**
 * Parse a Stellar SEP-7 request URI (`web+stellar:pay?...` or `web+stellar:tx?...`)
 * into its operation type (`"pay"` or `"tx"`) and query parameters as a plain object.
 *
 * Pure parser: performs no signing, transaction building, or network requests.
 *
 * @param {string} uri SEP-7 URI string.
 * @returns {{ operation: "pay" | "tx", params: Record<string, string> }}
 * @throws {TypeError} When `uri` is not a string.
 * @throws {RangeError} When `uri` exceeds `MAX_SEP7_URI_LENGTH` (8192 characters).
 * @throws {Error} When the scheme, operation, or query parameters are invalid.
 *
 * @example
 * parseSep7Uri("web+stellar:pay?destination=GABC&amount=10");
 * // => { operation: "pay", params: { destination: "GABC", amount: "10" } }
 */
export function parseSep7Uri(uri) {
  if (typeof uri !== "string") {
    throw new TypeError(SEP7_URI_ERROR.TYPE);
  }

  const trimmed = uri.trim();
  if (trimmed.length === 0) {
    throw new Error(SEP7_URI_ERROR.EMPTY);
  }

  if (trimmed.length > MAX_SEP7_URI_LENGTH) {
    throw new RangeError(SEP7_URI_ERROR.TOO_LONG);
  }

  const prefix = trimmed.slice(0, SEP7_SCHEME.length).toLowerCase();
  if (prefix !== SEP7_SCHEME) {
    throw new Error(SEP7_URI_ERROR.INVALID_SCHEME);
  }

  const body = trimmed.slice(SEP7_SCHEME.length);
  if (body.startsWith("//")) {
    throw new Error(SEP7_URI_ERROR.MISSING_OPERATION);
  }

  const questionIdx = body.indexOf("?");
  const rawOperation =
    questionIdx === -1 ? body : body.slice(0, questionIdx);
  const rawQuery =
    questionIdx === -1 ? "" : body.slice(questionIdx + 1);

  if (rawOperation === "") {
    throw new Error(SEP7_URI_ERROR.MISSING_OPERATION);
  }

  const operation = rawOperation.toLowerCase();
  if (!SEP7_OPERATIONS.includes(operation)) {
    throw new Error(SEP7_URI_ERROR.UNSUPPORTED_OPERATION);
  }

  const params = parseQueryParams(rawQuery);
  return { operation, params };
}

/**
 * Non-throwing companion to {@link parseSep7Uri}.
 *
 * @param {unknown} uri Candidate SEP-7 URI string.
 * @returns {{ ok: true, operation: "pay" | "tx", params: Record<string, string> } | { ok: false, error: string }}
 */
export function tryParseSep7Uri(uri) {
  try {
    const { operation, params } = parseSep7Uri(uri);
    return { ok: true, operation, params };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Return `true` when `uri` is a syntactically valid SEP-7 URI.
 * Never throws.
 *
 * @param {unknown} uri Candidate SEP-7 URI string.
 * @returns {boolean}
 */
export function isValidSep7Uri(uri) {
  return tryParseSep7Uri(uri).ok === true;
}
