/**
 * Horizon paging cursor builder.
 *
 * Builds the `{ cursor, order, limit }` query parameters for the next page of a
 * Horizon collection request from the last record's `paging_token`, with sane
 * defaults when the input array is empty.
 */

/**
 * Default pagination limit.
 */
export const DEFAULT_PAGE_LIMIT = 10;

/**
 * Maximum page limit permitted by Horizon API.
 */
export const MAX_PAGE_LIMIT = 200;

/**
 * Minimum page limit permitted by Horizon API.
 */
export const MIN_PAGE_LIMIT = 1;

/**
 * Allowed sort orders.
 */
export const VALID_ORDERS = new Set(["asc", "desc"]);

/**
 * Extract paging token from a record.
 *
 * @param {object} record
 * @returns {string|null}
 */
export function extractPagingToken(record) {
  if (!record || typeof record !== "object") {
    throw new TypeError("each record must be an object");
  }
  const token = record.paging_token ?? record.pagingToken ?? record.cursor;
  return token == null ? null : String(token).trim();
}

/**
 * Build Horizon query parameters for collection paging.
 *
 * @param {unknown} records Horizon collection records array
 * @param {{
 *   limit?: number,
 *   order?: "asc" | "desc",
 *   fallbackCursor?: string | null
 * }} [options={}]
 * @returns {{
 *   cursor: string | null,
 *   order: "asc" | "desc",
 *   limit: number,
 *   hasMore: boolean
 * }}
 * @throws {TypeError} When records is not an array or options are invalid
 * @throws {RangeError} When limit is out of [1, 200]
 */
export function buildPagingParams(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("records must be an array");
  }

  // Validate limit
  let limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
  if (typeof limit !== "number" || !Number.isInteger(limit)) {
    throw new TypeError("limit must be an integer");
  }
  if (limit < MIN_PAGE_LIMIT || limit > MAX_PAGE_LIMIT) {
    throw new RangeError(`limit must be between ${MIN_PAGE_LIMIT} and ${MAX_PAGE_LIMIT}`);
  }

  // Validate order
  let order = (options?.order ?? "asc").toLowerCase();
  if (!VALID_ORDERS.has(order)) {
    throw new TypeError('order must be "asc" or "desc"');
  }

  if (records.length === 0) {
    const fallbackCursor = options?.fallbackCursor ?? null;
    return {
      cursor: fallbackCursor == null ? null : String(fallbackCursor),
      order,
      limit,
      hasMore: false,
    };
  }

  // Read last record
  const lastRecord = records[records.length - 1];
  const cursor = extractPagingToken(lastRecord);

  return {
    cursor,
    order,
    limit,
    hasMore: records.length >= limit,
  };
}

/**
 * Alias matching the module name.
 */
export const pagingCursorBuilder = buildPagingParams;

export default buildPagingParams;
