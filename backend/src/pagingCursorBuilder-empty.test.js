import test from "node:test";
import assert from "node:assert/strict";

import { buildPagingParams, DEFAULT_PAGE_LIMIT } from "./pagingCursorBuilder.js";

test("returns empty defaults when records array is empty", () => {
  const result = buildPagingParams([]);
  assert.deepEqual(result, {
    cursor: null,
    order: "asc",
    limit: DEFAULT_PAGE_LIMIT,
    hasMore: false,
  });
});

test("returns fallbackCursor when records array is empty and fallbackCursor is supplied", () => {
  const result = buildPagingParams([], {
    fallbackCursor: "now",
    limit: 25,
    order: "desc",
  });
  assert.deepEqual(result, {
    cursor: "now",
    order: "desc",
    limit: 25,
    hasMore: false,
  });
});
